# TRACE System

Document requirements tracking for birth certificate (COLB) applications. Tracks child identification info, general documents, and age-specific requirements per Philippine civil registry guidelines.

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS, react-hot-toast
- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Desktop:** Electron 28 (optional), electron-builder
- **Security:** Helmet, CORS, express-validator (server-side validation/sanitization)

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

1. Copy `.env.example` to `.env` and adjust if needed (e.g. `VITE_API_URL`, `PORT`).
2. Install dependencies:

   ```bash
   cd trace-app
   npm install
   ```

3. Start the API server (required for data):

   ```bash
   npm run dev:server
   ```

4. In another terminal, start the React app:

   ```bash
   npm run dev:vite
   ```

   Open http://localhost:5173.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run server and Vite dev in parallel |
| `npm run dev:server` | Run API only (port 3000) |
| `npm run dev:vite` | Run Vite dev server only (port 5173) |
| `npm run build` | Build React app for production |
| `npm run electron:dev` | Run Vite, then Electron (dev) |
| `npm run electron:build` | Build React app and package with Electron |

## Electron (desktop)

- **Development:** Run `npm run dev:server` in one terminal, then `npm run electron:dev` in another. Electron loads http://localhost:5173.
- **Production build:** Run `npm run electron:build`. Output is in `dist-electron/`. The packaged app still needs the API server running (or run the server from the app) for data.
- **Versions:** Node 18+, Electron 28. See `package.json` for exact versions.

## Data

SQLite database is created at `trace-app/data/trace.db`. Tables: `children`, `documents`, `checklist_items`.

## Requirements covered

- Child identification: name, DOB, age, place of birth, contact
- General documents (all ages): National I.D, PSA Negative, affidavits, Brgy. certification, 2x2 photo, etc.
- Age-specific: 1 month 1 day–6 yrs, 7–17, 18–59, 60+ with the required documents per group
- UI: responsive layout, sidebar nav, toasts, step/wizard for document checklist
- Security: validation/sanitization on server, escape utilities for UI, no secrets in frontend

## Icons (Electron build)

Add `public/icon.png` (Linux), `public/icon.ico` (Windows), and/or `public/icon.icns` (macOS) for packaged app icons. Omit if not needed.
