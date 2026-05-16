import fs from 'fs/promises';
import path from 'path';
import { kv } from '@vercel/kv';
import { config } from '../config.js';

const KV_KEY = process.env.KV_EXCEL_KEY || 'family-registrations-xlsx';

export function kvEnabled(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim(),
  );
}

export async function pullExcelFromKv(): Promise<void> {
  if (!kvEnabled()) return;

  try {
    const b64 = await kv.get<string>(KV_KEY);
    if (!b64 || typeof b64 !== 'string') return;
    const buf = Buffer.from(b64, 'base64');
    await fs.mkdir(path.dirname(config.excelPath), { recursive: true });
    await fs.writeFile(config.excelPath, buf);
  } catch (err) {
    console.error('KV download failed:', err);
  }
}

export async function pushExcelToKv(): Promise<void> {
  if (!kvEnabled()) return;

  try {
    const data = await fs.readFile(config.excelPath);
    await kv.set(KV_KEY, data.toString('base64'));
  } catch (err) {
    console.error('KV upload failed:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to save to Vercel KV');
  }
}
