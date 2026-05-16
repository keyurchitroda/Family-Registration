import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isVercel = Boolean(process.env.VERCEL);

export const config = {
  port: Number(process.env.PORT) || 4000,
  excelPath:
    process.env.EXCEL_PATH ||
    (isVercel
      ? '/tmp/registrations.xlsx'
      : path.join(__dirname, '..', 'data', 'registrations.xlsx')),
  sheetName: process.env.SHEET_NAME || 'Registrations',
};
