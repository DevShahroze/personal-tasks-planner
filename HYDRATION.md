# Hydration

## Root causes addressed

| Area               | Issue                                                                          | Fix                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Activity logger UI | `localStorage` read during initial render (`typeof window` in state/`useMemo`) | Deterministic `false` initial state; sync after mount in `useEffect`                                                                         |
| Chart theme        | `getComputedStyle` during render                                               | CSS `var(--*)` tokens in Recharts (no DOM reads)                                                                                             |
| Dates              | `toLocaleString(undefined)` (server/client locale drift)                       | Fixed **`MM/DD/YYYY`** and **`MM/DD/YYYY h:mm A`** via `lib/format.js` (`formatToParts`, `en-US`; UTC default; task timezone for scheduling) |
| Theme context      | React state could diverge from pre-hydration `dark` class                      | After mount, reconcile state with DOM + storage in one effect                                                                                |
| Task calendars     | `useSyncExternalStore` returned a new object every snapshot → infinite loop    | Cached snapshot in `use-client-today.js`; server snapshot `null` + skeleton until client                                                     |
| Calendar markers   | Missing import of `uniqueDayMarkers` in mini calendar                          | Import from `lib/calendar/task-entries.js` in `task-month-calendar.js`                                                                       |

## Client “today” for calendars

`hooks/use-client-today.js` exposes `useClientTodayYmd()` for dashboard and task-form mini calendars.

- **Server:** `getServerSnapshot()` always returns `null` — SSR and the first client pass render the same placeholder skeleton.
- **Client:** `getClientSnapshot()` returns a **cached object** for the current local calendar day (same reference until the date changes). Never allocate a fresh object on every read.
- **Updates:** a midnight timer invalidates the cache and notifies subscribers.

Do not return inline object literals from `useSyncExternalStore` getSnapshot without caching.

## Error boundaries

`components/error-boundary.js` (class component) catches render errors in:

- Protected app shell (`app/(protected)/layout.js`)
- Dashboard task calendar (`app/(protected)/dashboard/page.js`)
- Task form mini calendar (`components/tasks/task-form.js`)

Production UI shows a short message and **Try again** / **Reload page**; stack traces are logged to the console in development only.

## Intentional `suppressHydrationWarning`

- **`app/layout.js` `<html>`** — The inline theme boot script toggles `document.documentElement.classList` before React hydrates. React does not own that class toggle; suppressing warnings on `<html>` avoids false positives without hiding mismatches in app markup.
- **`app/layout.js` `<body>`** — Some browser extensions inject attributes on `<body>` before hydration (e.g. `cz-shortcut-listen="true"`). That is outside application code; suppressing on `<body>` avoids false positives. Verify in a clean profile or incognito if you need to audit real app mismatches.
- **`components/theme/theme-script.js`** — Inline boot script node; content is identical on server and client but React treats it as an exception node.

## Theme boot script and CSP

The script in `theme-script.js` runs synchronously before paint, reads `localStorage` key `ptp-theme`, and sets the `dark` class. It matches the middleware CSP (`script-src 'self' 'unsafe-inline'`).

## Rate limiting / auth (hydration-related)

Protected pages rely on middleware redirects; client routes render loading states until TanStack Query resolves. No protected data is rendered from client-only auth guesses.

## Automated verification

```bash
npm run build
npm run test:client-today
npm run test:hydration
```

Playwright starts **`next start`** (production server), watches the browser console for hydration errors, and covers:

- Login load/refresh, theme toggle in login header
- Authenticated direct loads and refreshes for all main routes
- Client-side navigation, detail pages (sample ObjectId), logout

Default test credentials (override with env):

- `APP_USERNAME=hydration-user`
- `HYDRATION_TEST_PASSWORD=hydration-test-pass`
- Matching default `APP_PASSWORD_HASH` in `playwright.config.mjs`

MongoDB must accept connections for login/API during tests (`MONGODB_URI`, default `mongodb://127.0.0.1:27017/ptp-hydration-test`).

## Limitations

- Playwright uses Chromium only; other browsers are not exercised.
- Hydration tests require a reachable MongoDB instance (empty DB is fine).
- In-memory rate limits and single-process behavior are unchanged from security docs.
- Dashboard charts follow theme via CSS variables; no separate chart palette sync step.
- API failure toasts mount only on the client after hydration (`ToastHost`); they do not change server HTML.
