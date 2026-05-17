import { config } from '../config.js';
import { blobEnabled, pullExcelFromBlob, pushExcelToBlob } from './blobSync.js';
import { kvEnabled, pullExcelFromKv, pushExcelToKv } from './kvSync.js';
import { pullExcelFromRedis, pushExcelToRedis, redisEnabled } from './redisSync.js';

export type CloudStorageMode =
  | 'mongodb'
  | 'excel-local'
  | 'excel-blob'
  | 'excel-kv'
  | 'excel-redis'
  | 'excel-vercel-no-storage';

export function mongoEnabled(): boolean {
  return Boolean(config.mongodbUri);
}

export function cloudStorageEnabled(): boolean {
  return mongoEnabled() || blobEnabled() || kvEnabled() || redisEnabled();
}

export function storageMode(): CloudStorageMode {
  if (mongoEnabled()) return 'mongodb';
  if (!process.env.VERCEL) {
    if (blobEnabled()) return 'excel-blob';
    if (kvEnabled()) return 'excel-kv';
    if (redisEnabled()) return 'excel-redis';
    return 'excel-local';
  }
  if (blobEnabled()) return 'excel-blob';
  if (kvEnabled()) return 'excel-kv';
  if (redisEnabled()) return 'excel-redis';
  return 'excel-vercel-no-storage';
}

export async function pullExcelFromCloud(): Promise<void> {
  if (blobEnabled()) {
    await pullExcelFromBlob();
    return;
  }
  if (kvEnabled()) {
    await pullExcelFromKv();
    return;
  }
  if (redisEnabled()) {
    await pullExcelFromRedis();
  }
}

export async function pushExcelToCloud(): Promise<void> {
  if (blobEnabled()) {
    await pushExcelToBlob();
    return;
  }
  if (kvEnabled()) {
    await pushExcelToKv();
    return;
  }
  if (redisEnabled()) {
    await pushExcelToRedis();
    return;
  }
  if (process.env.VERCEL) {
    const err = new Error(vercelStorageSetupMessage());
    err.name = 'StorageNotConfigured';
    throw err;
  }
}

/** Short message for API errors (toast-friendly first line). */
export function vercelStorageSetupMessage(): string {
  return [
    'FREE setup (2 min): Vercel → your project → Storage → Create → Blob → Connect this project → Redeploy.',
    'Blob is included FREE on the Hobby plan — no extra paid service required.',
    'Details: see docs/VERCEL-FREE.md in the GitHub repo.',
  ].join('\n');
}

export function storageHealthInfo(): {
  mongoConfigured: boolean;
  blobConfigured: boolean;
  kvConfigured: boolean;
  redisConfigured: boolean;
  setupHint?: string;
} {
  const mongoConfigured = mongoEnabled();
  const blobConfigured = blobEnabled();
  const kvConfigured = kvEnabled();
  const redisConfigured = redisEnabled();
  const ok = mongoConfigured || blobConfigured || kvConfigured || redisConfigured;

  return {
    mongoConfigured,
    blobConfigured,
    kvConfigured,
    redisConfigured,
    setupHint:
      process.env.VERCEL && !ok
        ? 'Set MONGODB_URI in Vercel env, or connect Blob — then Redeploy'
        : undefined,
  };
}
