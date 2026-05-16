import fs from 'fs/promises';
import path from 'path';
import { Redis } from '@upstash/redis';
import { config } from '../config.js';

const REDIS_KEY = process.env.REDIS_EXCEL_KEY || 'family-registrations-xlsx';

export function redisEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function redis(): Redis {
  return Redis.fromEnv();
}

export async function pullExcelFromRedis(): Promise<void> {
  if (!redisEnabled()) return;

  try {
    const data = await redis().get<string>(REDIS_KEY);
    if (!data) return;
    const buf = Buffer.from(data, 'base64');
    await fs.mkdir(path.dirname(config.excelPath), { recursive: true });
    await fs.writeFile(config.excelPath, buf);
  } catch (err) {
    console.error('Redis download failed:', err);
  }
}

export async function pushExcelToRedis(): Promise<void> {
  if (!redisEnabled()) return;

  try {
    const data = await fs.readFile(config.excelPath);
    await redis().set(REDIS_KEY, data.toString('base64'));
  } catch (err) {
    console.error('Failed to upload Excel to Redis:', err);
    throw new Error(
      err instanceof Error ? err.message : 'Failed to save registrations to Upstash Redis',
    );
  }
}
