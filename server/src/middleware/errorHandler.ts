import type { Request, Response, NextFunction } from 'express';
import { vercelStorageSetupMessage } from '../storage/cloudSync.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  let message = err instanceof Error ? err.message : 'Server error';
  if (
    message === 'BLOB_TOKEN_MISSING' ||
    message.includes('FREE setup') ||
    message.includes('Cloud storage is not configured')
  ) {
    message = vercelStorageSetupMessage();
  }
  res.status(500).json({ error: message });
}
