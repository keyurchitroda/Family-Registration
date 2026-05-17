import type { Registration } from '../types.js';
import { config } from '../config.js';
import * as excel from './excelService.js';
import * as mongo from './mongoService.js';

export type RowData = mongo.RowData;

export function useMongoStorage(): boolean {
  return Boolean(config.mongodbUri);
}

export const fetchAllRows = (): Promise<Registration[]> =>
  useMongoStorage() ? mongo.fetchAllRows() : excel.fetchAllRows();

export const findByMobileNorm = (mobileNorm: string): Promise<Registration | null> =>
  useMongoStorage() ? mongo.findByMobileNorm(mobileNorm) : excelFindByMobile(mobileNorm);

async function excelFindByMobile(mobileNorm: string): Promise<Registration | null> {
  const rows = await excel.fetchAllRows();
  const matches = rows.filter((r) => r.mobile.replace(/\D/g, '') === mobileNorm);
  return matches.sort((a, b) => b.rowIndex - a.rowIndex)[0] ?? null;
}

export const appendRegistration = (
  data: RowData,
): Promise<{ rowIndex: number; registration: Registration }> =>
  useMongoStorage() ? mongo.appendRegistration(data) : excel.appendRegistration(data);

export const updateRegistration = (
  rowIndex: number,
  data: RowData & { time?: string },
): Promise<Registration> =>
  useMongoStorage() ? mongo.updateRegistration(rowIndex, data) : excel.updateRegistration(rowIndex, data);

export const deleteRow = (rowIndex: number): Promise<void> =>
  useMongoStorage() ? mongo.deleteRow(rowIndex) : excel.deleteRow(rowIndex);

export const repairRow = (rowIndex: number): Promise<Registration> =>
  useMongoStorage() ? mongo.repairRow(rowIndex) : excel.repairRow(rowIndex);

export const repairAllCorruptRows = (): Promise<{ repaired: number; deleted: number }> =>
  useMongoStorage() ? mongo.repairAllCorruptRows() : excel.repairAllCorruptRows();

export async function buildExcelExportBuffer(): Promise<Buffer> {
  if (useMongoStorage()) {
    const rows = await mongo.fetchAllRows();
    return excel.buildExcelBufferFromRows(rows);
  }
  return excel.buildExcelFileBuffer();
}
