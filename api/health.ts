import type { VercelRequest, VercelResponse } from '@vercel/node';

function blobConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.includes('BLOB_READ_WRITE_TOKEN') && value?.trim()) return true;
  }
  return false;
}

/** Lightweight health check — does not load ExcelJS (avoids 502 on cold start). */
export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const blob = blobConfigured();
  res.status(200).json({
    ok: true,
    storage: blob ? 'excel-blob' : process.env.VERCEL ? 'excel-vercel-no-storage' : 'excel-local',
    blobConfigured: blob,
    setupHint: blob
      ? undefined
      : 'Connect Blob store to project and redeploy',
  });
}
