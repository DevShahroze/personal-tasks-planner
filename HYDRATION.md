# Hydration

## Root causes addressed

| Area               | Issue                                                                                                                                            | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activity logger UI | `localStorage` read during initial render (`typeof window` in state/`useMemo`)                                                                   | Deterministic `false` initial state; sync after mount in `useEffect`                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Chart theme        | `getComputedStyle` during render                                                                                                                 | CSS `var(--*)` tokens in Recharts (no DOM reads)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Dates              | `toLocaleString(undefined)` (server/client locale drift)                                                                                         | Fixed **`MM/DD/YYYY`** and **`MM/DD/YYYY h:mm A`** via `lib/format.js` (`formatToParts`, `en-US`; UTC default; task timezone for scheduling)                                                                                                                                                                                                                                                                                                                                                                              |
| Theme context      | React state could diverge from pre-hydration `dark` class                                                                                        | After mount, reconcile state with DOM + storage in one effect                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Task calendars     | `useSyncExternalStore` returned a new object every snapshot → infinite loop                                                                      | Cached snapshot in `use-client-today.js`; server snapshot `null` + skeleton until client                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Calendar markers   | Missing import of `uniqueDayMarkers` in month grid widget                                                                                        | Import from `lib/calendar/task-entries.js` in `task-month-calendar.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Task processor     | Status polling could spam `/api/task-processor/status` on every mount or in background tabs; overlapping polls showed empty failed DevTools rows | TanStack Query cache + `STALE_MS.taskProcessor`; poll **5 min** idle / **2.5 s** while locked or driving; **`refetchOnReconnect: false`**, **`refetchIntervalInBackground: false`**, **`cancelRefetch: false`**, query **disabled when `document.hidden`**; **`refreshStatus`** depends on stable **`refetch`**, not the whole `useQuery` return; auto-drive uses cached status; calendar **`refetchQueries`** after rollover; one auto-drive flag per calendar day per load; **`AbortError`** does not open error toasts |
| Calendar refetch   | One task save could trigger duplicate `GET /api/tasks/calendar`                                                                                  | `scheduleTaskCalendarRefetch` in `hooks/use-tasks.js` — invalidate calendar queries with `refetchType: 'none'`, then one batched active refetch per microtask                                                                                                                                                                                                                                                                                                                                                             |
| Planning calendar  | Stacked Kameti/installment rows reused the same React key on one day; Kameti future round missing after paying current month                     | `periodYmd` on stacked rows; `calendarDayEntryKey` in `task-calendar-panel.js`; `buildKametiCalendarEntries` fallback for next contribution when `dueYmd > todayYmd` (`lib/calendar/planning-entries.js`)                                                                                                                                                                                                                                                                                                                 |
| Installment detail | `useMemo` after loading guard broke Rules of Hooks; payment list order changed without user ask                                                  | Payment list uses API order (`sortPaymentsByPaidAtAsc` on GET); notes from sync only — no client reorder or display rewrite                                                                                                                                                                                                                                                                                                                                                                                               |
| Page unload        | In-flight fetches could complete after refresh                                                                                                   | `pagehide` → `abortOngoingClientApiRequests()` + `queryClient.cancelQueries()` in `components/providers.js`; shared abort signal on all `apiFetch` calls                                                                                                                                                                                                                                                                                                                                                                  |
| Activity logger    | Export order could race with concurrent API logging                                                                                              | Monotonic `#seq` on append; export sorts by `#seq`; session memory log with bounded storage sync (`lib/activity-logger.js`)                                                                                                                                                                                                                                                                                                                                                                                               |

## Client “today” for calendars

`hooks/use-client-today.js` exposes `useClientTodayYmd()` for the **dashboard** task calendar, visit date popovers, and other client date pickers.

- **Server:** `getServerSnapshot()` always returns `null` — SSR and the first client pass render the same placeholder skeleton.
- **Client:** `getClientSnapshot()` returns a **cached object** for the current local calendar day (same reference until the date changes). Never allocate a fresh object on every read.
- **Updates:** a midnight timer invalidates the cache and notifies subscribers.

Do not return inline object literals from `useSyncExternalStore` getSnapshot without caching.

## Error boundaries

`components/error-boundary.js` (class component) catches render errors in:

- Protected app shell (`app/(protected)/layout.js`) — includes `TaskProcessorProvider` (banner/shell gate; deterministic until status query resolves)
- Dashboard task calendar (`app/(protected)/dashboard/page.js`)

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
npm run prepush:local
```

Or validate only (same as Husky hook):

```bash
npm run validate:ci
```

The quality gate runs lint, format, unit tests (including **`npm run test:client-today`** for the cached calendar “today” snapshot), dependency audit, and **`next build`**. There is no browser E2E suite; catch hydration regressions in the app and with client unit tests.

## Limitations

- In-memory rate limits and single-process behavior are unchanged from security docs.
- Dashboard charts follow theme via CSS variables; no separate chart palette sync step.
- API failure toasts mount only on the client after hydration (`ToastHost`); they do not change server HTML.
