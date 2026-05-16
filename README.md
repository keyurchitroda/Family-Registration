# Samaj Dinner Registration (Excel)

Simple, fast family dinner registration for Samaj events. Data is stored in a **local Excel file** — no cloud database.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn-style UI, React Hook Form, Zod, TanStack Query
- **Backend:** Node.js, Express, **ExcelJS**
- **Storage:** `server/data/registrations.xlsx` (created automatically)

## Quick start

```bash
npm run install:all
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:4000  

Works on **local WiFi** or a single laptop. Share the Excel file from `server/data/` for backups.

## Features

- **Dashboard** — families, members, present today, registrations today (live refresh)
- **Register** — smart search, dynamic members, duplicate mobile warning, success sound, sticky mobile save
- **Admin** — list, search, date filter, edit, delete, download Excel
- **No digital tokens** — volunteers give physical tokens at the counter

## Excel columns

| Full Name | Mobile | Address | Total Family | Present Today | Members | Notes | Time |

Members column stores JSON, e.g. `[{"name":"Rajesh","age":45,"relation":"Father","gender":"Male"}]`

## Scripts

| Command | Description |
|--------|-------------|
| `npm run install:all` | Install client + server dependencies |
| `npm run dev` | Run API and Vite together |
| `npm run build` | Production build |

## Configuration

Copy `server/.env.example` → `server/.env` to change port or Excel path.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for local/LAN production and [docs/VERCEL.md](docs/VERCEL.md) to deploy **live on Vercel**.
