# Deploy on Vercel (live)

This project deploys as **one Vercel app**: React UI + Express API + Excel stored in **Vercel Blob** (required for persistent data on serverless).

## 1. Push to GitHub

Create a repo and push this project (if you have not already).

## 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Framework preset:** Vite (or Other — `vercel.json` controls the build)
4. Leave **Root Directory** as `.` (project root)
5. Deploy once (it may work for the UI; add Blob before relying on registrations)

## 3. Add Vercel Blob (required for data)

1. In the Vercel project → **Storage** → **Create Database** → **Blob**
2. Connect it to this project — Vercel sets `BLOB_READ_WRITE_TOKEN` automatically

Without Blob, registrations on Vercel **do not persist** between requests.

## 4. Environment variables

| Variable | Value | Notes |
|----------|--------|--------|
| `BLOB_READ_WRITE_TOKEN` | (auto from Blob) | Set by Vercel when Blob is linked |
| `EXCEL_PATH` | `/tmp/registrations.xlsx` | Writable path on serverless |
| `VITE_API_BASE` | *(leave empty)* | Same origin — `/api` is proxied by Vercel |

Redeploy after adding Blob.

## 5. Your live URL

After deploy: `https://your-project.vercel.app`

- App: `/` (Register, Dashboard, Admin)
- API health: `/api/health` → `{ "ok": true, "storage": "excel-blob" }`

## 6. Upload existing Excel (optional)

If you already have `server/data/registrations.xlsx` locally:

1. Open **Vercel** → **Storage** → your Blob store
2. Upload `registrations.xlsx` with pathname **`registrations.xlsx`** (same as `BLOB_EXCEL_PATHNAME` default)

Or start fresh on production — the file is created on first registration.

## Local vs Vercel

| | Local `npm run dev` | Vercel |
|--|---------------------|--------|
| Excel file | `server/data/registrations.xlsx` | Blob + `/tmp` cache |
| API | `localhost:4000` | `/api/*` serverless |

## CLI deploy (optional)

```bash
npm i -g vercel
vercel login
vercel --prod
```

Link Blob in the dashboard before using registration in production.

## Troubleshooting

- **500 on save** — Check Blob is connected and `BLOB_READ_WRITE_TOKEN` exists; redeploy.
- **Empty admin list after deploy** — Upload existing xlsx to Blob or register again.
- **CORS errors** — Leave `VITE_API_BASE` empty in production so the client calls the same host.
