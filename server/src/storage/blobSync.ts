import fs from 'fs/promises';
import path from 'path';
import { head, list, put } from '@vercel/blob';
import { config } from '../config.js';

const BLOB_PATHNAME = process.env.BLOB_EXCEL_PATHNAME || 'registrations.xlsx';

/** Vercel may inject BLOB_READ_WRITE_TOKEN or a store-prefixed variant */
export function getBlobToken(): string | undefined {
  const direct = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (direct) return direct;

  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('_BLOB_READ_WRITE_TOKEN') || key === 'BLOB_READ_WRITE_TOKEN') {
      const v = value?.trim();
      if (v) return v;
    }
  }
  return undefined;
}

export function blobEnabled(): boolean {
  return Boolean(getBlobToken());
}

async function findBlobUrl(): Promise<string | null> {
  const token = getBlobToken();
  if (!token) return null;

  const opts = { token };

  try {
    const meta = await head(BLOB_PATHNAME, opts);
    return meta.url;
  } catch {
    // fall through to list
  }

  try {
    const { blobs } = await list({ prefix: 'registrations', ...opts });
    const exact = blobs.find((b) => b.pathname === BLOB_PATHNAME);
    if (exact) return exact.url;
    const xlsx = blobs.filter((b) => b.pathname.endsWith('.xlsx'));
    if (xlsx.length === 0) return null;
    xlsx.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return xlsx[0]!.url;
  } catch {
    return null;
  }
}

/** Download Excel from Vercel Blob into local path (Vercel serverless). */
export async function pullExcelFromBlob(): Promise<void> {
  if (!blobEnabled()) return;

  const url = await findBlobUrl();
  if (!url) return;

  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(config.excelPath), { recursive: true });
    await fs.writeFile(config.excelPath, buf);
  } catch (err) {
    console.error('Blob download failed:', err);
  }
}

/** Upload Excel to Vercel Blob after each save. */
export async function pushExcelToBlob(): Promise<void> {
  const token = getBlobToken();
  if (!token) {
    throw new Error('BLOB_TOKEN_MISSING');
  }

  try {
    const data = await fs.readFile(config.excelPath);
    await put(BLOB_PATHNAME, data, {
      access: 'public',
      token,
      addRandomSuffix: false,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (err) {
    console.error('Failed to upload Excel to Vercel Blob:', err);
    throw new Error(
      err instanceof Error ? err.message : 'Failed to save registrations to Vercel Blob',
    );
  }
}
