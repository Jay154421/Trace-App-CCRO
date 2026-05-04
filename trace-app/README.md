# B-TRACE System

## Introduction
The B-TRACE System is a comprehensive digital solution developed for the City Civil Registry Office (CCRO) to manage, track, and secure birth certificate (Certificate of Live Birth - COLB) records. It is designed to modernize public service by moving away from traditional, paper-based tracking to an efficient, digital-first workflow. The system ensures that every applicant's document requirements are organized, verifiable, and easily accessible.

## Purpose
The primary purpose of the B-TRACE System is to streamline the evaluation of birth certificate applications by focusing on document completeness. It helps manage applicant records, dynamically adapt checklists based on age-group requirements, and handle document attachments and workflows. By doing so, it enhances the operational efficiency of the local civil registry office and ensures accuracy in civil registrations.

## Features

- Applicant management: create, view, update, and delete child/applicant records.
- Dynamic requirements: requirement checklist adapts by age group and applicant conditions.
- Document checklist tracking: required/optional flags, checked state, and notes per item.
- Attachment support: upload and store checklist attachments per applicant.
- Certificate and field workflows: dedicated pages for certificate-of-live-birth details and field position handling.
- Dashboard and navigation: quick access to records and workflow pages.
- Backup and restore: export SQLite database and attachments to zip, then import with safe merge behavior.
- Optional desktop app: Electron packaging for a desktop deployment target.

## Tech Stack

- Frontend: React 18, Vite, React Router, Tailwind CSS, react-hot-toast
- Backend: Node.js, Express, Helmet, CORS, express-validator
- Data: SQLite (local file-based storage)
- Utilities: JSZip, multer, html2canvas, jsPDF
- Desktop: Electron + electron-builder

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer (recommended)

## Installation

1. Open a terminal in the project root:

   ```bash
   cd trace-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment file:

   ```bash
   copy .env.example .env
   ```

4. Optional: adjust `.env` values before running.

## Environment Variables

Default values are already suitable for local development.

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Frontend API base URL | `http://localhost:3001/api` |
| `PORT` | Express server port | `3001` |
| `DATA_DIR` | Location of SQLite data and attachments | `trace-app/data` |

For Electron builds, `.env.electron` sets:

- `VITE_API_URL=/api` (same-origin API route for packaged desktop flow)

## Usage

### Run in Web Development Mode

Start frontend and backend together:

```bash
npm run dev
```

Then open `http://localhost:5173`.

Alternative split-terminal mode:

```bash
npm run dev:server
```

```bash
npm run dev:vite
```

### Typical Workflow

1. Create a new applicant from the child form.
2. Open the applicant details and proceed to document checklist.
3. Mark requirements, add notes, and upload attachments.
4. Complete Certificate of Live Birth / Field Position pages as needed.
5. Return to dashboard or list pages to monitor status.
6. Export database backup regularly from database tools/endpoints.

### API Health Check

Verify backend status:

- `GET /api/health`

## Data Storage and Backups

- Database file: `trace-app/data/trace.db`
- Attachments directory: `trace-app/data/attachments`

Backup endpoints:

- `GET /api/database/info` - show active database and attachment paths
- `GET /api/database/export` - download backup zip (`trace.db` + attachments)
- `POST /api/database/import` - import backup zip via `file` form field

Import behavior is non-destructive and merges records/checklist attachments when possible.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run backend and Vite dev server in parallel |
| `npm run dev:server` | Run Express API server |
| `npm run dev:vite` | Run Vite frontend dev server |
| `npm run build` | Build frontend assets |
| `npm run preview` | Preview built frontend |
| `npm run start` | Alias for `npm run dev` |
| `npm run electron:dev` | Start desktop development workflow |
| `npm run electron:build` | Build frontend in electron mode and package installer |
| `npm run electron:start` | Launch Electron entry directly |
| `npm run seed:applicants` | Seed sample applicant data |

## Electron Notes

- `npm run electron:dev` runs server, Vite, and Electron concurrently.
- `npm run electron:build` creates distributables in the configured `release` directory.
- App metadata and packaging options are defined in `package.json` under `build`.

## Security and Validation

- HTTP hardening via Helmet
- Controlled CORS origins for local development hosts
- Server-side request validation using express-validator
- Attachment filename sanitization before writing to disk

## Project Structure (High Level)

- `src/` - React app, pages, routing, UI logic
- `server/` - Express API, controllers, routes, DB logic
- `data/` - SQLite database file and attachment storage
- `electron/` - Electron main/preload integration

## Icons for Desktop Builds (Optional)

Place build icons in `public/` if needed:

- `icon.ico` for Windows
- `icon.icns` for macOS
- `icon.png` for Linux
