# Personal Tasks & Plans Tracker

Private single-user app for tasks, thoughts, plans, **important information** (IDs and reference numbers), categories, relationships, **scheduling**, **recurring procedures**, a **daily task processor** (timezone-aware rollover after midnight), **financial records**, **planning** (installments with prepaid/variable amounts, Kameti, subscriptions, university applications, tours), and a dashboard (including a **task calendar**) backed by MongoDB.

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
- `npm run test:activity` — activity logger ordering and export format
- `npm run test:scheduling` — scheduling validation and task-date alignment tests
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

**Enable Logs** defaults to **off**; turn it on in the navigation bar after you sign in to record page visits and API calls for the current browser session. Logs clear on full page refresh; the enable preference persists in `localStorage`. Use **Export Logs** to download a `.txt` file (always visible; disabled when no events exist). Exports are sorted by monotonic **`#seq`**; each completed API call is one **`API`** line (method, path, status, duration). Session events live in memory first with a bounded `localStorage` backup when space allows.

Next.js (App Router, JavaScript), MongoDB/Mongoose, TanStack Query (central stale times in `lib/query-cache.js`), Tailwind CSS, Recharts (dashboard only).

## Daily task processor

After **midnight** in the processor timezone (default: task schedule timezone; override with optional `TASK_PROCESSOR_TIMEZONE`), incomplete **To Do** / **In Progress** tasks on **dates before today** move to **today** (or the next schedule-allowed day). **Tasks dated today are never rolled forward** by automatic or manual runs. **Automatic** rollover runs at most **once per processor calendar day** after a successful completion (`TaskProcessorDailySession`). **Manual Run rollover** can be triggered whenever the processor is not already running (no daily cap); it uses the same eligibility rules and only reschedules matching tasks. Failed automatic runs can be retried the same day. Missed days are caught up on sign-in (up to 31 business dates per run). Progress is stored in MongoDB (`TaskProcessorRun` plus daily session metadata). The protected layout runs a client driver (`TaskProcessorProvider`) that checks status when the browser calendar day changes or the tab becomes visible again, uses a cross-tab driver lock, refetches **`GET /api/tasks/calendar`** when a run finishes, pauses **`GET /api/task-processor/status`** polling while the tab is hidden, shows a banner and toasts when runs start/finish/fail, and blocks the main shell while a run is **running**. See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Client data caching

List/detail/dashboard reads use shared TanStack Query keys and stale times (`lib/query-client.js`, `lib/query-cache.js`). Catalog data (categories, availability templates) loads through `AppDataProvider` with longer cache and `refetchOnMount: false`. Task mutations batch **one** active refetch for `GET /api/tasks/calendar` per tick (`scheduleTaskCalendarRefetch` in `hooks/use-tasks.js`). Task processor **status** polls every **5 minutes** when idle (`refetchOnReconnect: false`); rollover uses a stable TanStack **`refetch`** (not the whole query object) so navigation does not spam `/api/task-processor/status`. `cancelRefetch: false` avoids empty failed DevTools rows. Auto-drive reads cached status without an extra GET on mount. On **page refresh or unload**, `components/providers.js` aborts in-flight **`apiFetch`** requests (`abortOngoingClientApiRequests` in `lib/api-client.js`) and cancels TanStack Query fetches so DevTools may show `(unknown)` for requests cut off mid-flight.

## App shell (signed-in layout)

`components/layout/app-shell.js` — sidebars, mobile nav, theme toggle, logout. The top header includes an **online/offline** indicator (`components/nav/connectivity-indicator.js`, `hooks/use-network-online.js`) from the browser `online` / `offline` events.

## Planning money fields

Create flows support **prepaid periods** (count or comma-separated amounts) for installments, Kameti, and subscriptions. Amount parsing and validation live in `lib/planning/money-fields.js` and `lib/planning/validate.js` (safe for client bundles — no Mongoose import). Server routes enforce the same rules. **Kameti create:** if the client POST omits `prepaidPaymentsCount` but includes `contributionPayments`, the server infers prepaid rounds from that array; **New Kameti** remounts the form empty after a successful create (same pattern as subscriptions).

## Subscriptions (planning)

- **Planning → Subscriptions → New**: labeled fields with info popovers, desktop two-row layout on detail, live recurring-charge summary.
- **Planning → Insurance**: policy number, insurer, premium schedule, **term years**, total payments, due dates on the calendar, edit/delete, premium payment log.
- **Manual billing**: optional mode when you choose when to pay (not a fixed auto-charge schedule). Optional **started tracking** and **next pay date** (calendar reminder only).
- **Detail**: edit fields, delete subscription, **log payment** (amount + optional date), **remove** individual payment history rows (`DELETE /api/subscriptions/:id/payments/:paymentId`).
- After a successful create, the new form remounts empty; opening **New subscription** again also starts fresh (including back/forward cache).

## Installments (planning)

- **Planning → Installments → New**: commitment fields, optional **down payment** (logged as its own payment on create), prepaid periods (count or variable amounts), shared form in `components/planning/installment-form-fields.js`.
- **Detail**: edit name, amounts, schedule, and status; **log payment** with type **Installment**, **Down payment**, or **Balloon payment**; payment history sorted by **paid date** (oldest first). Summary shows **installments paid** as **n of totalInstallments** when set, plus **total paid** (all payments) and **total commitment** on closed-ended plans. Down payment, balloon, and **lump-sum already-paid** notes do not increase **installments paid** (only recurring installment payments).
- **Payment notes** (installment-type rows): when **`totalInstallments`** is set, text is **`Installment paid (n/totalInstallments)`** — rewritten on **`syncInstallmentCommitment`** (`normalizeInstallmentPaymentNotes` in `lib/planning/installment-payments.js`), including on **`GET /api/installment-commitments/[id]`** (persisted `payments` + balances). New logs and prepaid create (`noteDenominator: totalInstallments` in `lib/planning/validate.js`) use the same denominator. Client-safe payment sort helpers: `lib/payments/sort.js` (re-exported from `lib/payments/mongoose.js` on the server).
- **Open-ended** commitments (`openEnded: true`): **next due date** is derived from **start date + billing frequency**, advanced once per logged installment payment. **Closed-ended** with **`startDate`**: same schedule advance (not manual **`manualNextDueDate`**). `syncInstallmentCommitment` runs on payment POST, calendar GET (in-memory), and installment GET (persisted). Payment POST clears **`manualNextDueDate`**.
- **Closed-ended** installments with a schedule can **stack** missed periods on the dashboard calendar through today; otherwise the **next** synced **`nextDueDate`** appears on its scheduled day in future months (see scheduling section below).
- **Sticky footer** on detail: **Cancel** (back to list), **Delete**, **Save changes**. Destructive actions use the app **confirm dialog** (`useConfirm` in `contexts/confirm-context.js`), not browser `window.confirm`.
- Nested routes show **Go back** in the shell (`components/layout/page-go-back.js`) to the parent URL.

## Financial records

- **Financial → record detail**: read-only summary (`FinancialRecordDetailView`). Fixed footer **Edit**; edit mode **Cancel**, **Delete**, and **Update record** (same hierarchy as tasks). **Record payment** stays on the view page, not in edit mode.
- **New record**: shared `FinancialRecordForm` with **Create record** (`components/finance/financial-record-form.js`).

## Important information

- Sidebar **Important info** (`/important-info`): save reference data you may need later — national ID, passport, bank account, policy numbers, etc.
- Each record has **title**, **category** (Identity, Finance, Health, Contact, Other), optional **person / subject**, **value** (the number or detail), and **notes**.
- The **list** shows title, category, and person only (not the value). Open a row for the full value, **Edit**, or **Delete**.
- API: `GET/POST /api/important-info`, `GET/PATCH/DELETE /api/important-info/[id]` (`models/ImportantInfo.js`).

## Privacy and security (Admin)

- **Admin → Privacy & security → PIN screen**: after idle time, a full-screen **PIN** overlay locks the UI until you enter the 4-digit PIN. Removing the overlay from the DOM logs you out (tamper protection). Wrong PIN returns **403**, not **401**.
- **Admin → Privacy & security → Session timeout**: optional **idle sign-out** (mouse/keyboard/scroll inactivity) and **maximum session length** (JWT/cookie lifetime from last sign-in). While the PIN screen is shown, idle session sign-out and token-expiry timers are **paused** (`PinLockProvider` wraps `SessionIdleLogoutProvider` in the protected layout).
- Settings live on the **`AppSettings`** singleton (`sessionIdleLogout*`, `sessionTokenMaxAgeMinutes`, `pinScreen*`).

## Task content blocks

See [TASK_CONTENT_BLOCKS.md](./TASK_CONTENT_BLOCKS.md) for interactive checkboxes, radio groups, and tables inside tasks (including **Create items** from comma-separated description text).

## Tasks (detail page)

- Opening a task shows a **read-only summary** (`TaskDetailView`) of fields (basics, dates, spending, recurrence, visit availability, optional **Track order or purchase** dates).
- Click **Edit** in the fixed footer to change details; **Update task** saves and returns to read-only view. **Cancel** ends the edit session without leaving the page.
- **Delete** appears in the footer **only while editing** (danger button next to **Update task**). Subtasks, visits, notes, content blocks, and links stay editable below the summary without entering edit mode.
- **Visits & follow-ups**: **Visit date** and **Next visit date** use a read-only field; click to open a **popover** month picker (`components/ui/ymd-date-popover-input.js`, `simple-ymd-calendar.js`) — not the dashboard task calendar and not an always-visible grid. **Schedule next visit** updates **task date** (and **schedule** when fixed). For **Track order or purchase** tasks it also moves **expected receive** so the dashboard calendar follows the next visit (`lib/task-visits/follow-up.js`).
- Task **edit** uses the native **Task date** field only (no embedded month calendar on the form).

## Categories

Search on the categories page; delete uses a confirmation modal. Deleting a category moves linked tasks to **Unassigned** (`lib/categories/unassigned.js`, `UNASSIGNED_CATEGORY_NAME` in `lib/constants.js`). The Unassigned category cannot be deleted.

## Confirm dialogs

Destructive or irreversible actions (delete task, remove payment, cancel task, etc.) use **`ConfirmProvider`** / **`useConfirm()`** (`contexts/confirm-context.js`) with the shared **`Modal`** component — not native browser confirm/alert dialogs.

## Scheduling, recurrence, and calendar

- Task **date** plus optional **start** / **end** time on the edit form (native date/time inputs; no task mini-calendar on the form).
- Optional **Visit availability** (checkbox): weekdays, allowed hours, templates, and **Suggest time slots** for open-ended visit-style work. When availability rules reject the chosen day (for example Saturday with weekdays-only visits), the app **aligns** the task date to the next allowed day on save, in the task form, and when loading the calendar (`lib/scheduling/align-task-date.js`, `lib/calendar/schedule-date-check.js`). Calendar alignment avoids a circular import with `scheduleHasRestrictedDays` by inlining the weekday restriction check in `resolveTaskDateYmdForCalendar`.
- Task **schedule** (fixed/flexible/unscheduled), availability templates, and conflict checks — see [ARCHITECTURE.md](./ARCHITECTURE.md).
- **Recurring** tasks keep one document; `nextDueDate` is calculated on the server. Optional `SCHEDULE_PUBLIC_HOLIDAYS` in `.env` for holiday exclusion.
- **Track order or purchase** on a task uses **order placed**, **expected receive**, and **received** dates on the calendar instead of the plain task date when those fields are set (`lib/task-commerce/*`, `lib/calendar/task-entries.js`). If **task date** is later than **expected receive** (for example after a scheduled visit follow-up), the calendar pins the **expected receive** row to the later date. **Cancelled** tasks do not appear on the calendar.
- Dashboard **task calendar** (`components/dashboard/dashboard-task-calendar.js` → `components/calendar/task-calendar-panel.js`): month grid plus **Items on {date}** heading (prominent `h2`) listing that day’s entries. **Subtasks** (no date of their own) appear **indented under the parent task** when the parent is on that day (`attachSubtasksToCalendarDays`, `lib/calendar/day-list-rows.js`). Data and month selection live in **`TaskCalendarProvider`** (protected layout). For **closed-ended** installments and **Kameti** plans, unpaid periods **through today** can **stack** on the **current** calendar day (each with its month label and stable `periodYmd` list keys). When you are current through today, the **next** installment or Kameti contribution shows on **its scheduled due day** in that month (`buildInstallmentCalendarEntries` / `buildKametiCalendarEntries` in `lib/calendar/planning-entries.js`, **`planningBillingDueCalendarYmd`** for future billing). **Open-ended** installments keep a single next-due row from synced `nextDueDate`.
- **Floating tools** (bottom-right, `components/tools/floating-tools-widget.js`): **Calendar** opens the same panel in a modal (`components/tools/task-calendar-modal.js`) with a **scrollable body** inside the viewport (`scrollBody` on `components/ui/modal.js`); **Calculator** opens the existing calculator modal. Calendar reuses cached month data from context (no duplicate API call while the month is already loaded).
- Shared month widget: `components/calendar/task-month-calendar.js`. Entry kinds include **task date**, scheduled, deadline, recurring due, order/receive markers, plus planning/financial markers via `uniqueDayMarkers` (subtask rows do not add extra priority dots). Day lists normalize parent/subtask ids via `lib/calendar/calendar-task-id.js`.
- Render errors in the shell or calendar widgets are caught by **error boundaries** (`components/error-boundary.js`).
- Client “today” uses a cached `useSyncExternalStore` snapshot (see [HYDRATION.md](./HYDRATION.md)).
