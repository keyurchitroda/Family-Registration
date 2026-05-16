import fs from 'fs/promises';
import path from 'path';
import { head, put } from '@vercel/blob';
import { config } from '../config.js';

const BLOB_PATHNAME = process.env.BLOB_EXCEL_PATHNAME || 'registrations.xlsx';

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Download Excel from Vercel Blob into local path (Vercel serverless). */
export async function pullExcelFromBlob(): Promise<void> {
  if (!blobEnabled()) return;

  try {
    const meta = await head(BLOB_PATHNAME, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const res = await fetch(meta.url);
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(config.excelPath), { recursive: true });
    await fs.writeFile(config.excelPath, buf);
  } catch {
    // No blob yet (first deploy) — local file will be created on first write
  }
}

/** Upload Excel to Vercel Blob after each save. */
export async function pushExcelToBlob(): Promise<void> {
  if (!blobEnabled()) return;

  try {
    const data = await fs.readFile(config.excelPath);
    await put(BLOB_PATHNAME, data, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (err) {
    console.error('Failed to upload Excel to Vercel Blob:', err);
    throw err;
  }
}

export function storageMode(): 'excel-local' | 'excel-blob' {
  return blobEnabled() ? 'excel-blob' : 'excel-local';
}
