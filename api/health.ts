import type { VercelRequest, VercelResponse } from '@vercel/node';

function mongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

function blobConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.includes('BLOB_READ_WRITE_TOKEN') && value?.trim()) return true;
  }
  return false;
}

/** Lightweight health check — does not load ExcelJS (avoids 502 on cold start). */
export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const mongo = mongoConfigured();
  const blob = blobConfigured();
  const storage = mongo
    ? 'mongodb'
    : blob
      ? 'excel-blob'
      : process.env.VERCEL
        ? 'excel-vercel-no-storage'
        : 'excel-local';
  res.status(200).json({
    ok: true,
    storage,
    mongoConfigured: mongo,
    blobConfigured: blob,
    setupHint: mongo
      ? undefined
      : blob
        ? undefined
        : 'Set MONGODB_URI in Vercel env (recommended) or connect Blob',
  });
}
