# FREE Vercel setup (no paid cloud)

Your app is already on Vercel. You only need **one free Storage** step (included in the **Hobby / free** plan — no credit card for Blob on most accounts).

## Fix the storage error in 2 minutes

1. Open **[vercel.com/dashboard](https://vercel.com/dashboard)** → click your **Family Registration** project  
2. Click **Storage** (top menu)  
3. Click **Create Database** → choose **Blob**  
4. Name: `registrations` → **Create**  
5. Click **Connect to Project** → select this project → tick **Production** and **Preview** → **Connect**  
6. Go to **Deployments** → latest → **⋯** → **Redeploy**  

### Test

Open: `https://YOUR-PROJECT.vercel.app/api/health`

You should see:

```json
{
  "ok": true,
  "storage": "excel-blob",
  "blobConfigured": true
}
```

Then **Register** and **Save** — it should work.

---

## Is Blob paid?

**No** for normal Samaj event use. Vercel Blob has a **free allowance** on the Hobby plan. You stay on the same Vercel account — this is not AWS or a separate paid service.

---

## Alternative (also free): Vercel KV

If Blob is not available in your region/account:

1. **Storage** → **Create** → **KV**  
2. **Connect** to this project  
3. **Redeploy**  
4. Health should show `"storage": "excel-kv", "kvConfigured": true`

---

## Local laptop (no Vercel storage)

For the event day on one PC with WiFi:

```bash
npm run dev
```

Data saves to `server/data/registrations.xlsx` — no Blob needed.

---

## Still not working?

- **Settings** → **Environment Variables** → confirm `BLOB_READ_WRITE_TOKEN` exists after connecting Blob  
- You must **Redeploy** after connecting Storage (env vars are not applied to old deployments)  
- Do not set `VITE_API_BASE` in production (leave empty)
