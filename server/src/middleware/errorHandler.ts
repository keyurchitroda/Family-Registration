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
  } else if (message.toLowerCase().includes('topology is closed')) {
    message =
      'Database connection expired — refresh the page. If it continues, redeploy after checking MongoDB Atlas Network Access (allow 0.0.0.0/0).';
  }
  res.status(500).json({ error: message });
}
