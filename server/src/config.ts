import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isVercel = Boolean(process.env.VERCEL);

/** Fix Kk@118118@cluster... → encode password so host is not parsed as "118118". */
export function normalizeMongoUri(uri: string): string {
  if (!uri) return uri;
  const prefixes = ['mongodb+srv://', 'mongodb://'] as const;
  const prefix = prefixes.find((p) => uri.startsWith(p));
  if (!prefix) return uri;

  const rest = uri.slice(prefix.length);
  const hostStart = rest.lastIndexOf('@');
  if (hostStart <= 0) return uri;

  const credentials = rest.slice(0, hostStart);
  const hostPart = rest.slice(hostStart + 1);
  const colon = credentials.indexOf(':');
  if (colon < 0) return uri;

  const user = credentials.slice(0, colon);
  const password = credentials.slice(colon + 1);
  const encoded = encodeURIComponent(decodeURIComponent(password));
  return `${prefix}${user}:${encoded}@${hostPart}`;
}

export function validateMongoUri(uri: string): string | null {
  if (!uri) return null;
  if (!uri.startsWith('mongodb')) {
    return 'MONGODB_URI must start with mongodb:// or mongodb+srv://';
  }
  if (uri.includes('REPLACE_CLUSTER') || uri.includes('YOUR_ID')) {
    return 'Replace cluster host with your real Atlas host (from Connect → Drivers).';
  }
  return null;
}

const rawMongoUri = process.env.MONGODB_URI?.trim() || '';
const normalizedMongoUri = normalizeMongoUri(rawMongoUri);
const mongoUriError = validateMongoUri(normalizedMongoUri);

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongodbUri: mongoUriError ? '' : normalizedMongoUri,
  mongodbUriError: mongoUriError,
  mongodbDb: process.env.MONGODB_DB_NAME?.trim() || 'family_registration',
  excelPath:
    process.env.EXCEL_PATH ||
    (isVercel
      ? '/tmp/registrations.xlsx'
      : path.join(__dirname, '..', 'data', 'registrations.xlsx')),
  sheetName: process.env.SHEET_NAME || 'Registrations',
};
