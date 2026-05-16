import fs from 'fs/promises';
import path from 'path';
import { head, list, put } from '@vercel/blob';
import { config } from '../config.js';

const BLOB_PATHNAME = process.env.BLOB_EXCEL_PATHNAME || 'registrations.xlsx';

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}

export function blobEnabled(): boolean {
  return Boolean(blobToken());
}

async function findBlobUrl(): Promise<string | null> {
  const token = blobToken();
  if (!token) return null;

  try {
    const meta = await head(BLOB_PATHNAME, { token });
    return meta.url;
  } catch {
    // fall through to list
  }

  try {
    const { blobs } = await list({ prefix: 'registrations', token });
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
  const token = blobToken();
  if (!token) {
    if (process.env.VERCEL) {
      throw new Error(
        'Vercel Blob is not configured. Link a Blob store in the Vercel project (Storage → Blob) and redeploy.',
      );
    }
    return;
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
      err instanceof Error ? err.message : 'Failed to save registrations to cloud storage',
    );
  }
}

export function storageMode(): 'excel-local' | 'excel-blob' | 'excel-vercel-no-blob' {
  if (!process.env.VERCEL) return blobEnabled() ? 'excel-blob' : 'excel-local';
  return blobEnabled() ? 'excel-blob' : 'excel-vercel-no-blob';
}
