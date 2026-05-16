import { blobEnabled, pullExcelFromBlob, pushExcelToBlob } from './blobSync.js';
import { pullExcelFromRedis, pushExcelToRedis, redisEnabled } from './redisSync.js';

export type CloudStorageMode =
  | 'excel-local'
  | 'excel-blob'
  | 'excel-redis'
  | 'excel-vercel-no-storage';

export function cloudStorageEnabled(): boolean {
  return blobEnabled() || redisEnabled();
}

export function storageMode(): CloudStorageMode {
  if (!process.env.VERCEL) {
    if (blobEnabled()) return 'excel-blob';
    if (redisEnabled()) return 'excel-redis';
    return 'excel-local';
  }
  if (blobEnabled()) return 'excel-blob';
  if (redisEnabled()) return 'excel-redis';
  return 'excel-vercel-no-storage';
}

export async function pullExcelFromCloud(): Promise<void> {
  await pullExcelFromBlob();
  if (!blobEnabled()) await pullExcelFromRedis();
}

export async function pushExcelToCloud(): Promise<void> {
  if (blobEnabled()) {
    await pushExcelToBlob();
    return;
  }
  if (redisEnabled()) {
    await pushExcelToRedis();
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(vercelStorageSetupMessage());
  }
}

export function vercelStorageSetupMessage(): string {
  return [
    'Cloud storage is not configured on Vercel. Choose ONE option:',
    '',
    'Option A — Vercel Blob (recommended):',
    '1. Vercel Dashboard → your project → Storage',
    '2. Create → Blob → name it (e.g. registrations)',
    '3. Connect to THIS project — check Production + Preview',
    '4. Deployments → Redeploy (required after linking)',
    '5. Settings → Environment Variables — confirm BLOB_READ_WRITE_TOKEN exists',
    '',
    'Option B — Upstash Redis (free):',
    '1. console.upstash.com → Create Redis database',
    '2. Copy REST URL + REST TOKEN',
    '3. Vercel → Settings → Environment Variables:',
    '   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN',
    '4. Redeploy',
  ].join('\n');
}

export function storageHealthInfo(): {
  blobConfigured: boolean;
  redisConfigured: boolean;
  setupHint?: string;
} {
  const blobConfigured = blobEnabled();
  const redisConfigured = redisEnabled();
  return {
    blobConfigured,
    redisConfigured,
    setupHint:
      process.env.VERCEL && !blobConfigured && !redisConfigured
        ? 'Link Vercel Blob (Storage tab) or add Upstash Redis env vars, then redeploy.'
        : undefined,
  };
}
