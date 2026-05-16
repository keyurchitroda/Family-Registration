# Deployment (local / LAN)

## Run on one laptop

1. `npm run install:all`
2. `npm run dev` or production build:
   - `npm run build`
   - `node server/dist/index.js` (from project root, with `PORT` set)
   - Serve `client/dist` with any static server, or open via Vite preview

3. Registrations save to **`server/data/registrations.xlsx`**. Back up this file regularly.

## Run on local WiFi

1. Start the server on the host machine (`npm run dev --prefix server` or production `node`).
2. Note the host PC’s LAN IP (e.g. `192.168.1.10`).
3. On volunteer phones, open `http://192.168.1.10:5173` (dev) or serve the built client and set `VITE_API_BASE=http://192.168.1.10:4000` when building.

Allow Windows Firewall inbound rules for ports **4000** (API) and **5173** (dev UI) if needed.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | API port |
| `EXCEL_PATH` | `server/data/registrations.xlsx` | Excel file location |
| `SHEET_NAME` | `Registrations` | Worksheet name |

## Health check

`GET /api/health` → `{ "ok": true, "storage": "excel" }`
