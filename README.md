# Personal Tasks & Plans Tracker

Private single-user app for tasks, thoughts, plans, categories, relationships, **scheduling**, **recurring procedures**, a **daily task processor** (timezone-aware rollover after 11 PM), **financial records**, **planning** (installments with prepaid/variable amounts, Kameti, subscriptions, university applications, tours), and a dashboard (including a **task calendar**) backed by MongoDB.

Architecture overview: [ARCHITECTURE.md](./ARCHITECTURE.md) · Before push: [PUSH_CHECKLIST.md](./PUSH_CHECKLIST.md)

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
- `npm run test:planning` — installments (including prepaid payments), Kameti, subscriptions, tours schedule helpers
- `npm run test:client-today` — cached client “today” snapshot (calendar hydration safety)
- `npm run test:hydration` — Playwright against production build (`next start`); needs MongoDB
- `npm run validate` — full quality gate (see [PUSH_CHECKLIST.md](./PUSH_CHECKLIST.md); use **`npm run prepush:local`** before commit)

**Before you push:** follow [PUSH_CHECKLIST.md](./PUSH_CHECKLIST.md) — one local gate: `npm run prepush:local`, then commit with `--author="DevShahroze <DevShahroze@users.noreply.github.com>"` and `git push` (Husky runs `npm run validate:ci`).

To bypass the pre-push hook in an emergency: `git push --no-verify`

## Theme

Light and dark themes use centralized CSS tokens in `app/globals.css`. Toggle from the sidebar (or login header). Preference is stored in `localStorage` under `ptp-theme`.

## API errors (toasts)

Failed TanStack Query reads and mutations show a **toast** in the bottom-right (`ToastHost` in `components/providers.js`). Messages come from API JSON `error` fields when available. Toasts are client-only and do not affect SSR/hydration.

## Activity logger

Enable **Enable Logs** in the navigation bar after you sign in to record page visits and API calls for the current browser session. Logs clear on full page refresh; the enable preference persists. Use **Export Logs** to download a `.txt` file (always visible; disabled when no events exist).

Next.js (App Router, JavaScript), MongoDB/Mongoose, TanStack Query (central stale times in `lib/query-cache.js`), Tailwind CSS, Recharts (dashboard only).

## Daily task processor

After **11 PM** in the processor timezone (default: task schedule timezone; override with optional `TASK_PROCESSOR_TIMEZONE`), open **To Do** / **In Progress** tasks scheduled for that calendar day roll to the next day. Missed days are caught up (up to 31 days). Progress is stored in MongoDB (`TaskProcessorRun`); the protected layout runs a client driver (`TaskProcessorProvider`) that polls status, shows a banner while work runs, and blocks the main shell until idle. The navbar shows when the last run completed. Task create/update/delete APIs return **423** while a run is active. See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Client data caching

List/detail/dashboard reads use shared TanStack Query keys and stale times (`lib/query-client.js`, `lib/query-cache.js`). Catalog data (categories) loads through `AppDataProvider` / `contexts/slices/categories-slice.js` with longer cache and `refetchOnMount: false` to avoid API churn.

## Planning money fields

Create flows support **prepaid periods** (count or comma-separated amounts) for installments, Kameti, and subscriptions. Amount parsing and validation live in `lib/planning/money-fields.js` and `lib/planning/validate.js` (safe for client bundles — no Mongoose import). Server routes enforce the same rules.

## Subscriptions (planning)

- **Planning → Subscriptions → New**: labeled fields with info popovers, desktop two-row layout on detail, live recurring-charge summary.
- **Planning → Insurance**: policy number, insurer, premium schedule, **term years**, total payments, due dates on the calendar, edit/delete, premium payment log.
- **Manual billing**: optional mode when you choose when to pay (not a fixed auto-charge schedule). Optional **started tracking** and **next pay date** (calendar reminder only).
- **Detail**: edit fields, delete subscription, **log payment** (amount + optional date), **remove** individual payment history rows (`DELETE /api/subscriptions/:id/payments/:paymentId`).
- After a successful create, the new form remounts empty; opening **New subscription** again also starts fresh (including back/forward cache).

## Task content blocks

See [TASK_CONTENT_BLOCKS.md](./TASK_CONTENT_BLOCKS.md) for interactive checkboxes, radio groups, and tables inside tasks (including **Create items** from comma-separated description text).

## Tasks (detail page)

- Opening a task shows the **edit form** immediately (no separate “Edit details” mode).
- **Update task** / **Delete** sit in a **fixed bottom bar** (viewport footer, aligned with the main column).
- Optional **Amount spent** + currency on the form; optional **Create items** builds deduplicated checkbox blocks from the description (title-case labels, lowercase **slug** keys).
- **Interactive content** below the form still saves on its own schedule (debounced PATCH); the main form saves only when you click **Update task**.

## Categories

Search on the categories page; delete uses a confirmation modal. Deleting a category moves linked tasks to **Unassigned** (`lib/categories/unassigned.js`, `UNASSIGNED_CATEGORY_NAME` in `lib/constants.js`). The Unassigned category cannot be deleted.

## Scheduling, recurrence, and calendar

- Task **schedule** (fixed / flexible / unscheduled), availability templates, and conflict checks — see [ARCHITECTURE.md](./ARCHITECTURE.md).
- **Recurring** tasks keep one document; `nextDueDate` is calculated on the server. Optional `SCHEDULE_PUBLIC_HOLIDAYS` in `.env` for holiday exclusion.
- Dashboard and task forms use a shared month calendar (`lib/calendar/task-entries.js`: **task date**, scheduled, deadline, recurring due, plus planning/financial markers via `uniqueDayMarkers`).
- Render errors in the shell or calendar widgets are caught by **error boundaries** (`components/error-boundary.js`).
- Client “today” uses a cached `useSyncExternalStore` snapshot (see [HYDRATION.md](./HYDRATION.md)).
