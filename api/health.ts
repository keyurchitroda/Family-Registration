import type { VercelRequest, VercelResponse } from '@vercel/node';

function mongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

async function mongoReachable(): Promise<boolean> {
  if (!mongoConfigured()) return false;
  try {
    const { pingMongo } = await import('../server/dist/services/mongoService.js');
    return await pingMongo();
  } catch {
    return false;
  }
}

function blobConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.includes('BLOB_READ_WRITE_TOKEN') && value?.trim()) return true;
  }
  return false;
}

/** Health check — verifies MongoDB can connect when MONGODB_URI is set. */
export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const mongo = mongoConfigured();
  const mongoOk = mongo ? await mongoReachable() : false;
  const blob = blobConfigured();
  const storage = mongo
    ? 'mongodb'
    : blob
      ? 'excel-blob'
      : process.env.VERCEL
        ? 'excel-vercel-no-storage'
        : 'excel-local';
  res.status(mongo && !mongoOk ? 503 : 200).json({
    ok: mongo ? mongoOk : true,
    storage,
    mongoConfigured: mongo,
    mongoConnected: mongoOk,
    blobConfigured: blob,
    setupHint: mongo && !mongoOk
      ? 'MongoDB unreachable — check Atlas Network Access (0.0.0.0/0) and MONGODB_URI'
      : mongo
        ? undefined
        : blob
          ? undefined
          : 'Set MONGODB_URI in Vercel env (recommended) or connect Blob',
  });
}
