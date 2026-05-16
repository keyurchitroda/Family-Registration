import fs from 'fs/promises';
import path from 'path';
import { getDownloadUrl, list, put } from '@vercel/blob';
import { config } from '../config.js';

const BLOB_PATHNAME = process.env.BLOB_EXCEL_PATHNAME || 'registrations.xlsx';

function blobAccess(): 'public' | 'private' {
  const v = process.env.BLOB_ACCESS?.trim().toLowerCase();
  if (v === 'public') return 'public';
  return 'private';
}

/** Vercel may inject BLOB_READ_WRITE_TOKEN or a store-prefixed variant */
export function getBlobToken(): string | undefined {
  const direct = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (direct) return direct;

  for (const [key, value] of Object.entries(process.env)) {
    if (key.includes('BLOB_READ_WRITE_TOKEN') && value?.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function blobEnabled(): boolean {
  return Boolean(getBlobToken());
}

async function findBlobDownloadUrl(): Promise<string | null> {
  const token = getBlobToken();
  if (!token) return null;

  try {
    const { blobs } = await list({ prefix: '', token });
    const exact = blobs.find((b) => b.pathname === BLOB_PATHNAME);
    if (exact?.downloadUrl) return exact.downloadUrl;
    if (exact?.url) return getDownloadUrl(exact.url);
    const xlsx = blobs.filter((b) => b.pathname.endsWith('.xlsx'));
    if (xlsx.length === 0) return null;
    xlsx.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const best = xlsx[0]!;
    return best.downloadUrl || getDownloadUrl(best.url);
  } catch (err) {
    console.error('Blob list failed:', err);
    return null;
  }
}

/** Download Excel from Vercel Blob into local path (Vercel serverless). */
export async function pullExcelFromBlob(): Promise<void> {
  if (!blobEnabled()) return;

  const downloadUrl = await findBlobDownloadUrl();
  if (!downloadUrl) return;

  try {
    const token = getBlobToken();
    const res = await fetch(downloadUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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
  if (!token && !process.env.VERCEL) return;

  try {
    const data = await fs.readFile(config.excelPath);
    await put(BLOB_PATHNAME, data, {
      access: blobAccess() as 'public',
      addRandomSuffix: false,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      token,
    });
  } catch (err) {
    console.error('Failed to upload Excel to Vercel Blob:', err);
    if (!token) throw new Error('BLOB_TOKEN_MISSING');
    throw new Error(
      err instanceof Error ? err.message : 'Failed to save registrations to Vercel Blob',
    );
  }
}
