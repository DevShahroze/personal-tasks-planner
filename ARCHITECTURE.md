# Application Architecture

Generic reference for this personal productivity app: a **single-user**, **cookie-authenticated** web application with a **React frontend**, **Next.js route-handler backend**, and **MongoDB** persistence. The same patterns apply to similar CRUD + dashboard products deployed on **Vercel** or comparable serverless hosts.

---

## 1. High-level topology

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (client)                          │
│  React Client Components · TanStack Query · localStorage (UI)   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (same origin)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Edge / Node (Next.js App Router)                    │
│  Middleware: auth gate · rate limits · security headers · CSRF   │
│  Server: Route Handlers (REST JSON) · JWT in HttpOnly cookie     │
└────────────────────────────┬────────────────────────────────────┘
                             │ TLS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MongoDB (Atlas or self-hosted)               │
│  Mongoose models · validated queries · connection reuse        │
└─────────────────────────────────────────────────────────────────┘
```

| Layer               | Responsibility                                                               |
| ------------------- | ---------------------------------------------------------------------------- |
| **Presentation**    | Pages, forms, dashboard charts, theme, optional client-side activity logging |
| **Application API** | Auth, CRUD, relationships, search, dashboard aggregations                    |
| **Cross-cutting**   | Validation, authorization, rate limiting, error shape, security headers      |
| **Data**            | Document models, indexes, server-only database access                        |

---

## 2. Frontend architecture

### 2.1 Routing and rendering

- **App Router** with route groups: public **login**, **protected** app shell (dashboard, tasks, thoughts, plans, categories).
- **Server Components** by default; **`use client`** only where browser state, hooks, or event handlers are required.
- **Partial prerendering / static shells** where Next.js can prerender layout chrome; dynamic data loads after hydration via TanStack Query.
- **Suspense** around navigation hooks (`usePathname`, `useSearchParams`) to avoid prerender blocking without disabling SSR.

### 2.2 Client data layer

- **TanStack Query** for fetching, caching, mutations, and invalidation.
- **Single browser `QueryClient`** (singleton) to avoid duplicate caches and redundant in-flight requests.
- **No server prefetch/dehydrate** in the current design: initial HTML shows deterministic loading states; data arrives in one client pass (consistent SSR/hydration).
- Query defaults: modest `staleTime`, limited retries, no refetch-on-focus (reduces API churn on Vercel).

### 2.3 UI composition

- **Compact density** — shared tokens in `app/globals.css` (`page-stack`, `page-title`, `page-lead`, `surface-card`), 14px base type, tighter controls (see §2.6).
- **App shell**: full-width **top navbar** + **left sidebar** (desktop); slide-out menu on mobile; main column scrolls independently.
- **Toast host** (`components/ui/toast-host.js`): non-blocking API error feedback via TanStack Query global handlers.
- **Entity modules**: list + detail + create flows per domain (tasks, thoughts, plans, categories).
- **Rich task content**: structured **content blocks** (checkboxes, radio groups, editable tables) stored as JSON on the task document, edited client-side, persisted via PATCH with optimistic concurrency (`expectedUpdatedAt`).
- **Relationships**: link tasks, thoughts, and plans through dedicated API routes and UI panels.
- **Dashboard**: summary cards, Recharts visualizations, recent listings (server aggregations), **monthly task calendar** (priority markers, selected-day task list).
- **Task scheduling**: modes (unscheduled / flexible / fixed), availability templates, conflict detection, flexible slot suggestions (`lib/scheduling/*`).
- **Recurring tasks**: single-task recurrence and procedure fields; server-calculated `nextDueDate` (`lib/recurrence/*`); optional `recordRecurrenceCompletion` on PATCH.

### 2.4 Client-only persistence (by design)

| Feature          | Storage                                     | Bounded?                    | Server impact |
| ---------------- | ------------------------------------------- | --------------------------- | ------------- |
| Theme preference | `localStorage` (`ptp-theme`)                | Single key                  | None          |
| Activity logger  | `localStorage` (session logs + enable flag) | Max **500** events, trimmed | None          |

These features **never** write to server memory or disk and **do not** run during SSR, avoiding hydration mismatches and serverless storage costs.

### 2.5 Hydration and UX precautions

- Deterministic initial state; **no `localStorage` in render**.
- Pre-hydration **inline theme script** (CSP-compatible) sets `dark` class before paint; React state syncs after mount.
- Fixed **display formats** for lists and metadata: **`MM/DD/YYYY`** (`formatDate`) and **`MM/DD/YYYY h:mm A`** (`formatDateTime`) in `lib/format.js`; scheduling uses the task IANA timezone for datetimes.
- **`useClientTodayYmd`** (`hooks/use-client-today.js`) uses **`useSyncExternalStore`** with a **cached snapshot** (stable object reference per calendar day) so client “today” does not trigger infinite re-renders; server snapshot is always `null` and calendars show a fixed skeleton until hydrated.
- Chart colors use **CSS variables**, not `getComputedStyle` during render.
- Documented narrow **`suppressHydrationWarning`** only on `<html>`, `<body>`, and the theme boot script node.
- **React error boundaries** (`components/error-boundary.js`) wrap the protected app shell and isolate the dashboard task calendar and task-form mini calendar so a client render failure does not blank the entire page.

See [HYDRATION.md](./HYDRATION.md) for verification tests.

### 2.6 Compact layout system

The UI is intentionally **dense** for a single-user productivity app: more rows and controls visible without scrolling, while keeping touch targets usable.

| Area           | Convention                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Typography** | Base `0.875rem` on `body`; page titles via `.page-title` (~18px); secondary copy via `.page-lead` (12px)                                              |
| **Spacing**    | Vertical page rhythm via `.page-stack` (1rem gap); main content `p-3` / `md:p-4`; lists/tables use `px-3 py-2` cells                                  |
| **Shell**      | Full viewport (`h-dvh`, `w-full`); **top bar** (brand, theme, logout) + **left nav** on `md+`; mobile **drawer** from Menu; no `max-w-*` page gutters |
| **Controls**   | Buttons/inputs `py-1.5`, `text-xs` buttons; cards via `.surface-card` (`p-3`, `rounded-md`)                                                           |
| **Dashboard**  | Summary metrics `text-xl`; chart height `h-52`; grid gaps `gap-2` / `gap-3`                                                                           |
| **Theme**      | Sun/moon **icons** in the nav; sidebar keeps icon + short text when `compact`                                                                         |

Implementation lives in **`app/globals.css`**, **`components/ui/*`**, **`components/layout/app-shell.js`**, and page-level Tailwind classes. No external component library.

---

## 3. Backend architecture

### 3.1 Entry points

- **`proxy.js`**: runs before page and API requests (except static assets).
- **Route Handlers** under `app/api/**`: JSON REST-style endpoints per resource.

### 3.2 Authentication and sessions

- **Single configured user** (username + bcrypt hash in environment variables).
- **Login** verifies password server-side; issues **JWT** stored in **`HttpOnly` cookie** (`SameSite=Lax`, `Secure` in production).
- **New token on each login** (mitigates session fixation); **logout** clears cookie.
- **Proxy** redirects unauthenticated users away from protected pages; **API** returns `401` JSON.
- **Handlers** call **`requireAuth()`** again (defense in depth; never trust client-only gating).

### 3.3 Authorization model

- One logical owner; no multi-tenant IDs from the client.
- All mutations authenticated; no public registration.

### 3.4 Input validation and injection safety

- Central validation helpers for bodies, query params, and ObjectIds.
- **Allowlists** for filters and sort fields; no passing raw client objects into Mongoose queries.
- Rejection of **`$`-prefixed operator keys** in JSON bodies.
- **Payload size** limits via `Content-Length` checks.
- **Sanitized text search** for `$text` usage.

### 3.5 Rate limiting

- **In-process sliding windows** keyed by client IP + profile (auth, read, mutation, dashboard).
- **Expired buckets pruned** on each check to avoid unbounded `Map` growth in long-lived local processes.
- Returns **`429`** with **`Retry-After`** and consistent JSON errors.

**Vercel note:** limits are **per serverless instance**, not global. Acceptable for a single-user app; for strict global limits you would add a shared store (e.g. Redis) — intentionally not included here.

### 3.6 Error handling

- Stable JSON error responses; no stack traces or secrets in client payloads.
- Appropriate HTTP status codes (`400`, `401`, `403`, `404`, `409`, `413`, `422`, `429`, `500`).
- **Client error boundaries** catch render errors in the protected shell and high-risk widgets (dashboard calendar, task-form mini calendar); users get retry/reload actions without exposing stack traces in production UI.
- **Toast notifications** (`lib/toast-bus.js`, `components/ui/toast-host.js`): TanStack Query `QueryCache` / `MutationCache` `onError` handlers surface failed API reads and mutations as dismissible toasts (client-only; no SSR). The dashboard degrades gracefully when individual aggregation endpoints fail (summary may still render).

### 3.7 Security headers and CSRF

- **CSP**, **nosniff**, **Referrer-Policy**, **X-Frame-Options**, **Permissions-Policy**, **HSTS** (production).
- **Origin / Referer** checks on cookie-authenticated mutating API requests.
- No permissive CORS (same-origin app).

See [SECURITY.md](./SECURITY.md) for audit detail.

---

## 4. Data architecture

### 4.1 Database access

- **Mongoose** models for Task, Thought, Plan, Category, TaskNote, FinancialRecord, InstallmentCommitment, KametiPlan, Subscription, UniversityApplication, Tour.
- **`connectDB()`** uses the **global connection cache** pattern recommended for serverless Node (reuse one connection promise per instance).
- **`resolveMongoUri()`** in `lib/env.js` targets a **dedicated database name** on the cluster (default `personal_tasks_planner`). MongoDB creates the database on first write; collections are created by Mongoose.
- Database credentials exist **only** in server environment configuration — never `NEXT_PUBLIC_*`.

### 4.2 Domain concepts

- **Tasks**: status, priority, dates, category, **schedule**, **recurrence**, **content blocks**, optional **purchase/sale estimates**, **subtasks** (`parentTaskId`), links to thoughts/plans.
- **Task notes**: separate `TaskNote` collection (not the task description).
- **Financial records**: lent/borrowed/payable/receivable with payment history.
- **Planning** (dedicated models): installment commitments, Kameti plans, subscriptions, university applications, tours/expenses — calendar and dashboard integrate due dates without spawning per-payment tasks.
- **Thoughts / Plans**: metadata + relationship edges to other entities.
- **Categories**: labels for task organization.
- **Dashboard**: read-only aggregation endpoints (`summary`, `charts`, `listings`); each handler must import Mongoose models explicitly.

---

## 5. Environment configuration

All runtime secrets and connection strings are loaded through **`lib/env.js`** (single source of truth).

| Variable                   | Required | Used by               | Notes                                                                                        |
| -------------------------- | -------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `MONGODB_URI`              | Yes\*    | `connectDB`, all APIs | Atlas SRV URI (host only or full); database name appended via `MONGODB_DB_NAME` when omitted |
| `MONGODB_USERNAME`         | Yes\*    | `resolveMongoUri`     | Alternative to embedding user in `MONGODB_URI`                                               |
| `MONGODB_PASSWORD`         | Yes\*    | `resolveMongoUri`     | Pair with username when building the URI                                                     |
| `MONGODB_DB_NAME`          | No       | `resolveMongoUri`     | Default **`personal_tasks_planner`** — separate logical DB on the cluster                    |
| `MONGODB_HOST`             | No       | `resolveMongoUri`     | Only when building URI from username/password (default Atlas host omitted)                   |
| `AUTH_SECRET`              | Yes      | JWT sign/verify       | Long random string; rotate if compromised                                                    |
| `APP_USERNAME`             | Yes      | Login                 | Single allowed username                                                                      |
| `APP_PASSWORD_HASH_B64`    | Yes      | Login                 | Base64 bcrypt hash (`node scripts/hash-password.mjs` prints this)                            |
| `APP_PASSWORD_HASH`        | No       | Login                 | Raw `$2b$…` only if env loader preserves `$` (Next.js does not)                              |
| `SCHEDULE_PUBLIC_HOLIDAYS` | No       | Scheduling            | Comma-separated `YYYY-MM-DD` dates when holiday exclusion is enabled                         |
| `NODE_ENV`                 | Built-in | Runtime flags         | Set by platform (`production` on Vercel)                                                     |

\*Provide **`MONGODB_URI`**, or **`MONGODB_USERNAME`** + **`MONGODB_PASSWORD`** (optional **`MONGODB_HOST`**).

**Local:** copy [`.env.example`](./.env.example) to `.env` and fill values.

**Vercel:** Project Settings → Environment Variables — MongoDB variables plus auth secrets for Production (and Preview if needed). Use the same `MONGODB_DB_NAME` so preview/production stay isolated from other apps on the cluster. No secrets in the repository.

**API surface:**

- `getServerConfig()` — validated secrets + DB URI (route handlers, auth, MongoDB). Cached per process.
- `getRuntimeConfig()` — `NODE_ENV` / `isProduction` only (middleware security headers).

Client bundles **must not** import `lib/env.js`. There are **no** `NEXT_PUBLIC_` secrets.

Optional variables (`PLAYWRIGHT_*`, `HYDRATION_TEST_PASSWORD`) are for **local/CI tests only** and are not read by the app at runtime.

---

## 6. Cross-cutting features (generic catalog)

| Feature                     | Description                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| **Private auth**            | Cookie session, middleware + handler checks                                      |
| **CRUD modules**            | Tasks, thoughts, plans, categories                                               |
| **Structured task content** | Checkbox / radio / table blocks with server validation                           |
| **Entity relationships**    | Many-to-many style links between domain objects                                  |
| **Dashboard**               | Aggregations + charts + recent activity lists + task calendar                    |
| **Task scheduling**         | Fixed/flexible slots, conflicts, availability templates                          |
| **Recurring / procedures**  | In-place next due date, completion recording, optional appointments              |
| **Theming**                 | Light/dark semantic CSS tokens                                                   |
| **Error boundaries**        | Client render failures contained per shell / calendar / form calendar            |
| **Activity logger**         | Optional client-only diagnostic log export                                       |
| **Quality gate**            | `npm run validate` — lint, format, security tests, audit, build, hydration tests |
| **Pre-push hook**           | Husky runs full validate                                                         |

---

## 7. Precautions summary

### Security

- Bcrypt passwords; JWT in HttpOnly cookies; generic login errors.
- Rate limits on auth and APIs; CSRF-oriented origin checks on mutations.
- NoSQL injection defenses; field allowlists; operator key rejection.
- HTTP hardening headers; safe redirect paths after login.

### Reliability / hydration

- SSR/client parity for theme, logger, and loading states.
- Automated Playwright hydration suite against **production build** (`next start`).

### Vercel / serverless resource discipline

| Concern                          | Mitigation                                                               |
| -------------------------------- | ------------------------------------------------------------------------ |
| **MongoDB connection storms**    | Cached `mongoose` connection per instance                                |
| **Memory growth (rate limiter)** | Expired rate-limit buckets deleted on each request                       |
| **Server-side session store**    | Stateless JWT in cookie — no in-memory session table                     |
| **Client log storage**           | Capped list in `localStorage`; no server logging of user content         |
| **Activity / theme**             | Browser-only; zero server CPU for preferences                            |
| **Query client**                 | One browser singleton; no duplicate polling loops added                  |
| **Debounced task block saves**   | Reduces mutation volume vs per-keystroke API calls                       |
| **No filesystem writes**         | Exports/downloads use browser Blob APIs only                             |
| **Env access**                   | Central module; fail fast when required vars missing at first server use |

**Not claimed:** global rate limits across all Vercel instances, DDoS protection beyond platform defaults, or penetration-test certification.

---

## 8. Deployment on Vercel (checklist)

1. Connect repository; framework preset **Next.js**.
2. Set **`MONGODB_URI`**, **`AUTH_SECRET`**, **`APP_USERNAME`**, **`APP_PASSWORD_HASH_B64`** for Production.
3. Use **MongoDB Atlas** (or compatible) with network access allowed for Vercel (IP allowlist or `0.0.0.0/0` with strong DB user password).
4. Create a **least-privilege database user** (read/write on app database only).
5. Deploy; smoke-test login, one CRUD flow, dashboard load.
6. Run locally before push: `npm run validate` (includes production build and hydration tests when MongoDB is available).

---

## 9. Related documentation

- [README.md](./README.md) — setup and scripts
- [SECURITY.md](./SECURITY.md) — security audit and controls
- [HYDRATION.md](./HYDRATION.md) — hydration strategy and tests
- [TASK_CONTENT_BLOCKS.md](./TASK_CONTENT_BLOCKS.md) — interactive task blocks

**Task APIs (additional):**

- `GET /api/tasks/calendar?year=&month=&timeZone=` — month-scoped calendar entries (scheduled, deadline, recurring due).
- `POST /api/tasks/[id]/schedule/slots` — flexible scheduling suggestions.
- `GET/POST /api/availability-templates`, `PATCH/DELETE /api/availability-templates/[id]`.
- Task `PATCH` may include `recordRecurrenceCompletion: { completedDate, procedureDate? }`.

---

## 10. Document maintenance

When adding a new **required** environment variable, update **`lib/env.js`**, **`.env.example`**, this file (§5), and Vercel project settings together so configuration stays single-sourced.
