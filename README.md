# Personal Tasks & Plans Tracker

Private single-user app for tasks, thoughts, plans, categories, relationships, **scheduling**, **recurring procedures**, **financial records**, **planning** (installments, Kameti, subscriptions, university applications, tours), and a dashboard (including a **task calendar**) backed by MongoDB.

Architecture overview: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Set **MongoDB** and **auth** variables (see [ARCHITECTURE.md § Environment configuration](./ARCHITECTURE.md#5-environment-configuration)):

**MongoDB (Atlas):**

- `MONGODB_USERNAME` / `MONGODB_PASSWORD` — database user  
- `MONGODB_URI` — `mongodb+srv://…@cluster….mongodb.net` (database name optional)  
- `MONGODB_DB_NAME` — dedicated app database (default: `personal_tasks_planner`)  

**Auth:**

- `AUTH_SECRET` — long random string (JWT signing)  
- `APP_USERNAME` — login username  
- `APP_PASSWORD_HASH_B64` — bcrypt hash of your password, **base64-encoded** (required on Vercel/local; raw `$2b$...` in `.env` gets corrupted)

3. Generate a bcrypt hash for your password:

```bash
node scripts/hash-password.mjs "your-password"
```

4. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint
- `npm run format` — Prettier check
- `npm run format:fix` — Prettier write
- `npm run test:security` — security unit tests
- `npm run test:scheduling` — scheduling validation tests
- `npm run test:recurrence` — recurrence and calendar entry tests
- `npm run test:subtasks` — subtask filters and parent completion helpers
- `npm run test:finance` — financial balances, notes validation, calendar entries
- `npm run test:planning` — installments, Kameti, subscriptions, tours schedule helpers
- `npm run validate` — lint, format, tests (security, scheduling, recurrence, client-today, format, subtasks, finance, planning), audit, build, hydration (runs before `git push` via Husky)

To bypass the pre-push hook in an emergency: `git push --no-verify`

## Theme

Light and dark themes use centralized CSS tokens in `app/globals.css`. Toggle from the sidebar (or login header). Preference is stored in `localStorage` under `ptp-theme`.

## API errors (toasts)

Failed TanStack Query reads and mutations show a **toast** in the bottom-right (`ToastHost` in `components/providers.js`). Messages come from API JSON `error` fields when available. Toasts are client-only and do not affect SSR/hydration.

## Activity logger

Enable **Enable Logs** in the navigation bar after you sign in to record page visits and API calls for the current browser session. Logs clear on full page refresh; the enable preference persists. Use **Export Logs** to download a `.txt` file (always visible; disabled when no events exist).

Next.js (App Router, JavaScript), MongoDB/Mongoose, TanStack Query, Tailwind CSS, Recharts (dashboard only).

## Task content blocks

See [TASK_CONTENT_BLOCKS.md](./TASK_CONTENT_BLOCKS.md) for interactive checkboxes, radio groups, and tables inside tasks.

## Scheduling, recurrence, and calendar

- Task **schedule** (fixed / flexible / unscheduled), availability templates, and conflict checks — see [ARCHITECTURE.md](./ARCHITECTURE.md).
- **Recurring** tasks keep one document; `nextDueDate` is calculated on the server. Optional `SCHEDULE_PUBLIC_HOLIDAYS` in `.env` for holiday exclusion.
- Dashboard and task forms use a shared month calendar (`uniqueDayMarkers` in `lib/calendar/task-entries.js` for priority + financial markers); client “today” uses a cached `useSyncExternalStore` snapshot (see [HYDRATION.md](./HYDRATION.md)).
- Render errors in the shell or calendar widgets are caught by **error boundaries** (`components/error-boundary.js`).
