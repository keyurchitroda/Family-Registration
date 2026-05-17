import type { Request, Response } from 'express';
import { isSameDay, parseISO } from '../utils/date.js';
import type { FamilyMember } from '../types.js';
import {
  appendRegistration,
  buildExcelExportBuffer,
  deleteRow,
  fetchAllRows,
  findByMobileNorm,
  repairAllCorruptRows,
  repairRow,
  updateRegistration,
} from '../services/registrationStore.js';

function normalizeMobile(m: string): string {
  return m.replace(/\D/g, '');
}

export async function getStats(_req: Request, res: Response): Promise<void> {
  const rows = await fetchAllRows();
  const today = new Date();
  let registrationsToday = 0;
  for (const r of rows) {
    if (!r.time) continue;
    try {
      if (isSameDay(parseISO(r.time), today)) registrationsToday++;
    } catch {
      /* ignore */
    }
  }
  res.json({
    totalRegisteredFamilies: rows.length,
    totalMembers: rows.reduce((s, r) => s + (r.totalFamily || 0), 0),
    totalPresentToday: rows.reduce((s, r) => s + (r.presentToday || 0), 0),
    registrationsToday,
  });
}

function rowSearchText(r: {
  fullName: string;
  mobile: string;
  address: string;
  members: FamilyMember[];
}): string {
  const memberPart = r.members
    .map((m) => [m.name, m.relation, m.gender].filter(Boolean).join(' '))
    .join(' ');
  return [r.fullName, r.mobile, r.address, memberPart].join(' ').toLowerCase();
}

export async function search(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q || '')
    .trim()
    .toLowerCase();
  const rows = await fetchAllRows();
  if (!q) {
    res.json([]);
    return;
  }
  const qDigits = q.replace(/\D/g, '');
  const filtered = rows.filter((r) => {
    if (rowSearchText(r).includes(q)) return true;
    if (qDigits.length >= 3 && normalizeMobile(r.mobile).includes(qDigits)) return true;
    return false;
  });
  res.json(filtered.slice(0, 50));
}

/** Find family by mobile (any day) — for "already registered" fast load */
export async function findByMobile(req: Request, res: Response): Promise<void> {
  const mobile = String(req.query.mobile || '').trim();
  if (!mobile) {
    res.json({ found: false, registration: null });
    return;
  }
  const norm = normalizeMobile(mobile);
  const latest = await findByMobileNorm(norm);
  res.json({ found: Boolean(latest), registration: latest ?? null });
}

export async function checkDuplicate(req: Request, res: Response): Promise<void> {
  const mobile = String(req.query.mobile || '').trim();
  const excludeRow = req.query.excludeRow ? Number(req.query.excludeRow) : undefined;
  if (!mobile) {
    res.json({ duplicate: false });
    return;
  }
  const norm = normalizeMobile(mobile);
  const rows = await fetchAllRows();
  const today = new Date();
  const dup = rows.find((r) => {
    if (excludeRow && r.rowIndex === excludeRow) return false;
    if (normalizeMobile(r.mobile) !== norm) return false;
    if (!r.time) return true;
    try {
      return isSameDay(parseISO(r.time), today);
    } catch {
      return true;
    }
  });
  res.json({ duplicate: Boolean(dup), existing: dup || null });
}

export async function listAll(req: Request, res: Response): Promise<void> {
  const rows = await fetchAllRows();
  const dateFilter = String(req.query.date || '').trim();
  let list = rows;
  if (dateFilter) {
    list = list.filter((r) => {
      if (!r.time) return false;
      try {
        return parseISO(r.time).toISOString().slice(0, 10) === dateFilter;
      } catch {
        return false;
      }
    });
  }
  const q = String(req.query.q || '')
    .trim()
    .toLowerCase();
  if (q) {
    list = list.filter((r) => rowSearchText(r).includes(q));
  }
  res.json(list);
}

type BodyPayload = {
  fullName: string;
  mobile: string;
  address: string;
  totalFamily: number;
  presentToday: number;
  tokenGiven?: boolean;
  members: FamilyMember[];
  notes?: string;
};

function validateBody(body: BodyPayload, res: Response): boolean {
  if (!body?.fullName?.trim() || !body?.mobile?.trim()) {
    res.status(400).json({ error: 'Full name and mobile are required' });
    return false;
  }
  const totalFamily = Math.floor(Number(body.totalFamily));
  const presentToday = Math.floor(Number(body.presentToday));
  if (!Number.isFinite(totalFamily) || totalFamily < 1) {
    res.status(400).json({ error: 'Total family must be at least 1 (no minus)' });
    return false;
  }
  if (!Number.isFinite(presentToday) || presentToday < 0) {
    res.status(400).json({ error: 'Present today cannot be negative' });
    return false;
  }
  body.totalFamily = totalFamily;
  body.presentToday = presentToday;
  if (!Array.isArray(body.members)) {
    res.status(400).json({ error: 'Members must be an array' });
    return false;
  }
  return true;
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as BodyPayload;
  if (!validateBody(body, res)) return;
  const result = await appendRegistration({
    fullName: body.fullName.trim(),
    mobile: body.mobile.trim(),
    address: body.address?.trim() || '',
    totalFamily: body.totalFamily,
    presentToday: body.presentToday,
    tokenGiven: Boolean(body.tokenGiven),
    members: body.members,
    notes: body.notes?.trim() || '',
  });
  res.status(201).json({ ok: true, rowIndex: result.rowIndex, registration: result.registration });
}

export async function update(req: Request, res: Response): Promise<void> {
  const rowNumber = Number(req.params.rowIndex);
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    res.status(400).json({ error: 'Invalid row' });
    return;
  }
  const body = req.body as BodyPayload & { time?: string };
  if (!validateBody(body, res)) return;
  const registration = await updateRegistration(rowNumber, {
    fullName: body.fullName.trim(),
    mobile: body.mobile.trim(),
    address: body.address?.trim() || '',
    totalFamily: body.totalFamily,
    presentToday: body.presentToday,
    tokenGiven: Boolean(body.tokenGiven),
    members: body.members,
    notes: body.notes?.trim() || '',
    time: body.time,
  });
  res.json({ ok: true, registration });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const rowNumber = Number(req.params.rowIndex);
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    res.status(400).json({ error: 'Invalid row' });
    return;
  }
  await deleteRow(rowNumber);
  res.json({ ok: true });
}

export async function repairOne(req: Request, res: Response): Promise<void> {
  const rowNumber = Number(req.params.rowIndex);
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    res.status(400).json({ error: 'Invalid row' });
    return;
  }
  const fixed = await repairRow(rowNumber);
  res.json(fixed);
}

export async function repairAll(_req: Request, res: Response): Promise<void> {
  const result = await repairAllCorruptRows();
  res.json(result);
}

export async function exportExcel(_req: Request, res: Response): Promise<void> {
  const buf = await buildExcelExportBuffer();
  res.setHeader('Content-Disposition', 'attachment; filename="registrations.xlsx"');
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.send(buf);
}
