# Deploy on Vercel (live)

Data **must** be stored in the cloud on Vercel (serverless has no permanent disk). Use **Vercel Blob** or **Upstash Redis** (free).

## Fix: "Vercel Blob is not configured"

### Option A — Vercel Blob (recommended)

1. Open [vercel.com](https://vercel.com) → your **Family Registration** project  
2. Top menu → **Storage**  
3. **Create Database** → **Blob**  
4. Name: `registrations` → **Create**  
5. **Connect to Project** → select this project  
6. Enable **Production**, **Preview**, **Development** → **Connect**  
7. **Deployments** → latest deployment → **⋯** → **Redeploy** (required)  
8. After deploy, open:  
   `https://YOUR-PROJECT.vercel.app/api/health`  

You should see:

```json
{
  "ok": true,
  "storage": "excel-blob",
  "blobConfigured": true,
  "redisConfigured": false
}
```

If `blobConfigured` is still `false`:

- **Settings** → **Environment Variables** → check `BLOB_READ_WRITE_TOKEN` exists  
- If missing: Storage → your Blob store → **Connect Project** again → **Redeploy**

### Option B — Upstash Redis (free, no Vercel Blob)

1. [console.upstash.com](https://console.upstash.com) → **Create database** → Redis  
2. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**  
3. Vercel → project → **Settings** → **Environment Variables** → add both (Production + Preview)  
4. **Redeploy**  
5. `/api/health` should show `"storage": "excel-redis", "redisConfigured": true`

---

## First-time deploy

1. Push code to GitHub  
2. [vercel.com/new](https://vercel.com/new) → import repo  
3. Add **Blob** or **Upstash** (above)  
4. Set **EXCEL_PATH** = `/tmp/registrations.xlsx` (optional; default on Vercel)  
5. Leave **VITE_API_BASE** empty  
6. Redeploy  

## Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `BLOB_READ_WRITE_TOKEN` | Blob option | Auto-added when Blob is linked |
| `UPSTASH_REDIS_REST_URL` | Redis option | From Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | Redis option | From Upstash console |
| `EXCEL_PATH` | Optional | `/tmp/registrations.xlsx` on Vercel |

## Upload existing Excel (optional)

**Blob:** Storage → Blob store → Upload `registrations.xlsx`  
**Redis:** Not needed — file is created on first save  

## Local vs Vercel

| | Local | Vercel |
|--|-------|--------|
| Storage | `server/data/registrations.xlsx` | Blob or Redis |
| API | `:4000` | `/api/*` |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blob error on save | Link Blob or add Upstash → **Redeploy** |
| `blobConfigured: false` | Storage → Connect project → Redeploy |
| `/api/health` 404 | Push latest code (`api/[[...slug]].ts`) |
| Saves work once then reset | Storage not connected — use Blob or Redis |
