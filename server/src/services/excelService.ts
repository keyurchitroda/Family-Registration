import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import {
  cloudStorageEnabled,
  pullExcelFromCloud,
  pushExcelToCloud,
} from '../storage/cloudSync.js';
import type { FamilyMember, Registration } from '../types.js';
import { COL, HEADER } from '../types.js';

/** Save to disk only (reads / migrations — must not require Vercel Blob). */
async function persistWorkbookLocal(wb: ExcelJS.Workbook): Promise<void> {
  await wb.xlsx.writeFile(config.excelPath);
}

/** Save after user action — sync to cloud when configured. */
async function persistWorkbook(wb: ExcelJS.Workbook): Promise<void> {
  await persistWorkbookLocal(wb);
  if (cloudStorageEnabled() || !process.env.VERCEL) {
    await pushExcelToCloud();
  }
}

let writeLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeLock.then(fn);
  writeLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(path.dirname(config.excelPath), { recursive: true });
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object' && 'text' in v && typeof (v as { text: string }).text === 'string') {
    return (v as { text: string }).text;
  }
  if (typeof v === 'object' && 'result' in v) {
    return String((v as { result: unknown }).result ?? '');
  }
  return String(v);
}

function parseYesNo(cell: ExcelJS.Cell): boolean {
  const t = cellText(cell).trim().toLowerCase();
  return t === 'yes' || t === 'y' || t === 'true' || t === '1';
}

function yesNoString(v: boolean): string {
  return v ? 'Yes' : 'No';
}

function parseMembers(raw: unknown): FamilyMember[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => ({
      name: String((m as FamilyMember).name || ''),
      age:
        typeof (m as FamilyMember).age === 'number'
          ? (m as FamilyMember).age
          : Number((m as FamilyMember).age) || undefined,
      relation: (m as FamilyMember).relation ? String((m as FamilyMember).relation) : undefined,
      gender: (m as FamilyMember).gender ? String((m as FamilyMember).gender) : undefined,
      tokenGiven: Boolean((m as FamilyMember).tokenGiven),
    }));
  } catch {
    return [];
  }
}

type RowData = {
  fullName: string;
  mobile: string;
  address: string;
  totalFamily: number;
  presentToday: number;
  tokenGiven: boolean;
  members: FamilyMember[];
  notes: string;
};

function writeDataRow(row: ExcelJS.Row, data: RowData, time: string): void {
  row.getCell(COL.fullName).value = data.fullName;
  row.getCell(COL.mobile).value = data.mobile;
  row.getCell(COL.address).value = data.address;
  row.getCell(COL.totalFamily).value = data.totalFamily;
  row.getCell(COL.presentToday).value = data.presentToday;
  row.getCell(COL.tokenGiven).value = yesNoString(data.tokenGiven);
  row.getCell(COL.members).value = JSON.stringify(data.members);
  row.getCell(COL.notes).value = data.notes;
  row.getCell(COL.time).value = time;
}

function rowHasData(row: ExcelJS.Row): boolean {
  for (let c = 1; c <= COL.time; c++) {
    if (cellText(row.getCell(c)).trim()) return true;
  }
  return false;
}

function looksLikeIsoTime(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(s.trim());
}

function isLegacySheet(ws: ExcelJS.Worksheet): boolean {
  return cellText(ws.getRow(1).getCell(COL.members)).trim() === 'Members';
}

/** Old 8-column sheet: Members was column 6 */
function migrateSheetToTokenColumn(ws: ExcelJS.Worksheet): void {
  for (let i = ws.rowCount; i >= 2; i--) {
    const row = ws.getRow(i);
    const time = cellText(row.getCell(8));
    const notes = cellText(row.getCell(7));
    const members = cellText(row.getCell(6));
    row.getCell(COL.time).value = time;
    row.getCell(COL.notes).value = notes;
    row.getCell(COL.members).value = members;
    row.getCell(COL.tokenGiven).value = 'No';
  }
  const h = ws.getRow(1);
  h.getCell(COL.fullName).value = HEADER[0];
  h.getCell(COL.mobile).value = HEADER[1];
  h.getCell(COL.address).value = HEADER[2];
  h.getCell(COL.totalFamily).value = HEADER[3];
  h.getCell(COL.presentToday).value = HEADER[4];
  h.getCell(COL.tokenGiven).value = HEADER[5];
  h.getCell(COL.members).value = HEADER[6];
  h.getCell(COL.notes).value = HEADER[7];
  h.getCell(COL.time).value = HEADER[8];
  h.font = { bold: true };
}

function rowToRegistration(row: ExcelJS.Row, rowIndex: number): Registration | null {
  const fullName = cellText(row.getCell(COL.fullName)).trim();
  if (!fullName) return null;
  return {
    rowIndex,
    fullName,
    mobile: cellText(row.getCell(COL.mobile)),
    address: cellText(row.getCell(COL.address)),
    totalFamily: Number(row.getCell(COL.totalFamily).value) || 0,
    presentToday: Number(row.getCell(COL.presentToday).value) || 0,
    tokenGiven: parseYesNo(row.getCell(COL.tokenGiven)),
    members: parseMembers(cellText(row.getCell(COL.members))),
    notes: cellText(row.getCell(COL.notes)),
    time: cellText(row.getCell(COL.time)),
  };
}

/** Old bug: columns shifted — repair path only */
function parseShiftedRow(row: ExcelJS.Row, rowIndex: number): Registration | null {
  const fullName = cellText(row.getCell(2)).trim();
  if (!fullName || /^\d+$/.test(fullName.replace(/\s/g, ''))) return null;

  const membersRaw = cellText(row.getCell(7));
  const members = membersRaw.trim().startsWith('[')
    ? parseMembers(membersRaw)
    : parseMembers(cellText(row.getCell(6)));

  let notes = cellText(row.getCell(8));
  let time = cellText(row.getCell(9));
  if (!time && looksLikeIsoTime(notes)) {
    time = notes;
    notes = '';
  }

  return {
    rowIndex,
    fullName,
    mobile: cellText(row.getCell(3)),
    address: cellText(row.getCell(4)),
    totalFamily: Number(row.getCell(5).value) || 0,
    presentToday: Number(row.getCell(6).value) || 0,
    tokenGiven: false,
    members,
    notes: looksLikeIsoTime(notes) ? '' : notes,
    time: looksLikeIsoTime(time) ? time : '',
    isCorrupt: true,
  };
}

function parseAnyRow(row: ExcelJS.Row, rowIndex: number): Registration | null {
  const normal = rowToRegistration(row, rowIndex);
  if (normal) return normal;
  if (!rowHasData(row)) return null;
  const shifted = parseShiftedRow(row, rowIndex);
  if (shifted) return shifted;
  return {
    rowIndex,
    fullName: `[Damaged row ${rowIndex}]`,
    mobile: cellText(row.getCell(2)) || cellText(row.getCell(3)),
    address: cellText(row.getCell(4)),
    totalFamily: 0,
    presentToday: 0,
    tokenGiven: false,
    members: [],
    notes: 'Delete this row from Admin',
    time: '',
    isCorrupt: true,
  };
}

async function loadWorkbook(): Promise<ExcelJS.Workbook> {
  await ensureDir();
  await pullExcelFromCloud();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(config.excelPath);
  } catch {
    const ws = wb.addWorksheet(config.sheetName);
    ws.addRow([...HEADER]);
    ws.getRow(1).font = { bold: true };
    await persistWorkbookLocal(wb);
  }
  const ws = wb.getWorksheet(config.sheetName);
  if (!ws) {
    const created = wb.addWorksheet(config.sheetName);
    created.addRow([...HEADER]);
    created.getRow(1).font = { bold: true };
    await persistWorkbookLocal(wb);
  } else {
    if (ws.rowCount === 0 || cellText(ws.getRow(1).getCell(1)) !== HEADER[0]) {
      ws.spliceRows(1, 0, [...HEADER]);
      ws.getRow(1).font = { bold: true };
      await persistWorkbookLocal(wb);
    } else if (isLegacySheet(ws)) {
      migrateSheetToTokenColumn(ws);
      await persistWorkbookLocal(wb);
    }
  }
  return wb;
}

function getSheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  const ws = wb.getWorksheet(config.sheetName);
  if (!ws) throw new Error('Worksheet missing');
  return ws;
}

export async function fetchAllRows(): Promise<Registration[]> {
  return withLock(async () => {
    const wb = await loadWorkbook();
    const ws = getSheet(wb);
    const out: Registration[] = [];
    for (let i = 2; i <= ws.rowCount; i++) {
      const reg = parseAnyRow(ws.getRow(i), i);
      if (reg) out.push(reg);
    }
    return out;
  });
}

export async function appendRegistration(data: RowData): Promise<{ rowIndex: number }> {
  return withLock(async () => {
    const wb = await loadWorkbook();
    const ws = getSheet(wb);
    const time = new Date().toISOString();
    const row = ws.addRow([]);
    writeDataRow(row, data, time);
    await persistWorkbook(wb);
    return { rowIndex: row.number };
  });
}

export async function updateRegistration(
  rowIndex: number,
  data: RowData & { time?: string },
): Promise<void> {
  return withLock(async () => {
    const wb = await loadWorkbook();
    const ws = getSheet(wb);
    if (rowIndex < 2 || rowIndex > ws.rowCount) throw new Error('Row not found');
    const time = data.time ?? new Date().toISOString();
    writeDataRow(ws.getRow(rowIndex), data, time);
    await persistWorkbook(wb);
  });
}

export async function deleteRow(rowIndex: number): Promise<void> {
  return withLock(async () => {
    const wb = await loadWorkbook();
    const ws = getSheet(wb);
    if (rowIndex < 2 || rowIndex > ws.rowCount) throw new Error('Row not found');
    ws.spliceRows(rowIndex, 1);
    await persistWorkbook(wb);
  });
}

export async function repairRow(rowIndex: number): Promise<Registration> {
  return withLock(async () => {
    const wb = await loadWorkbook();
    const ws = getSheet(wb);
    if (rowIndex < 2 || rowIndex > ws.rowCount) throw new Error('Row not found');
    const row = ws.getRow(rowIndex);
    const parsed = parseShiftedRow(row, rowIndex) ?? parseAnyRow(row, rowIndex);
    if (!parsed) throw new Error('Nothing to repair on this row');
    const time = parsed.time && looksLikeIsoTime(parsed.time) ? parsed.time : new Date().toISOString();
    writeDataRow(
      row,
      {
        fullName: parsed.fullName.replace(/^\[Damaged row \d+\]$/, '').trim() || parsed.fullName,
        mobile: parsed.mobile,
        address: parsed.address,
        totalFamily: parsed.totalFamily || 1,
        presentToday: parsed.presentToday,
        tokenGiven: parsed.tokenGiven,
        members: parsed.members,
        notes: parsed.notes,
      },
      time,
    );
    await persistWorkbook(wb);
    const fixed = rowToRegistration(ws.getRow(rowIndex), rowIndex);
    if (!fixed) throw new Error('Repair failed');
    return fixed;
  });
}

export async function repairAllCorruptRows(): Promise<{ repaired: number; deleted: number }> {
  return withLock(async () => {
    const wb = await loadWorkbook();
    const ws = getSheet(wb);
    let repaired = 0;
    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      if (rowToRegistration(row, i)) continue;
      if (!rowHasData(row)) continue;
      const shifted = parseShiftedRow(row, i);
      if (shifted) {
        const time =
          shifted.time && looksLikeIsoTime(shifted.time) ? shifted.time : new Date().toISOString();
        writeDataRow(row, { ...shifted, tokenGiven: shifted.tokenGiven }, time);
        repaired++;
      }
    }
    await persistWorkbook(wb);
    return { repaired, deleted: 0 };
  });
}

export async function getExcelFilePath(): Promise<string> {
  await loadWorkbook();
  return config.excelPath;
}
