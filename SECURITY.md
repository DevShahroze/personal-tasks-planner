# Security Report

Last updated: 2026-10-29

## Audit summary

### Confirmed issues found (before hardening)

| Severity | Issue                                                                   | Status                                   |
| -------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| Medium   | Open redirect after login via unchecked `from` query param              | Fixed (`safeAppPath`)                    |
| Medium   | Task list filters accepted non-whitelisted `status` / `priority` values | Fixed (allowlists)                       |
| Medium   | Plan list accepted arbitrary `status` filter values                     | Fixed (allowlist)                        |
| Low      | Login failure could reveal auth misconfiguration message                | Fixed (generic errors)                   |
| Low      | Mutation requests lacked origin validation for cookie auth              | Fixed (middleware origin/referer checks) |
| Low      | No rate limiting on login or API endpoints                              | Fixed (in-memory middleware limiter)     |
| Low      | Missing standard HTTP security headers                                  | Fixed (middleware headers)               |
| Low      | JSON bodies accepted Mongo-style operator keys (`$...`)                 | Fixed (`assertPlainJsonObject`)          |
| Low      | No request payload size guard                                           | Fixed (`Content-Length` limit, 256 KB)   |

### Controls implemented

- JWT session in `HttpOnly` cookie, `Secure` in production, `SameSite=Lax`, 7-day expiry.
- New session token on each successful login (session fixation mitigation).
- Server-side `requireAuth()` on protected route handlers (defense in depth with middleware).
- In-memory rate limits by IP:
  - Login/auth: 10 / 15 min
  - Mutations: 120 / min
  - Reads: 300 / min
  - Dashboard aggregations: 60 / min
- HTTP `429` + `Retry-After` for exceeded limits.
- CSRF mitigation via `SameSite` cookies + origin/referer validation on state-changing API requests.
- Security headers: CSP (app-compatible), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS in production.
- Input validation hardening: operator rejection, search sanitization, enum allowlists, string length limits, ObjectId validation.
- Dependency audit gate for high/critical production vulnerabilities (`npm run audit:security`).

## Rate limiting limitations

The limiter is **in-memory per running Node process**. It protects a single local/single-instance deployment but does **not** synchronize across:

- Multiple server instances
- Serverless/edge isolates
- Process restarts ( counters reset )

For multi-instance/serverless production, use a shared store (for example Redis) if globally enforced limits are required.

## Manual configuration recommended

- Use a dedicated MongoDB user with least privilege (read/write on this app database only).
- Ensure TLS to MongoDB when your provider supports it (`mongodb+srv` / TLS URI options).
- Rotate `AUTH_SECRET`, password hash, and Mongo credentials if they were ever exposed in Git history.
- Keep `.env` out of version control (placeholders only in `.env.example`).

## Validation workflow

`npm run validate` runs:

1. ESLint
2. Prettier check
3. Security tests (`node --test tests/security`)
4. Scheduling tests (`npm run test:scheduling`)
5. Recurrence / calendar logic tests (`npm run test:recurrence`)
6. Format, subtasks, finance, and planning unit tests
7. Production dependency audit (`scripts/security-audit.mjs`)
8. Production build
9. Hydration tests (`npm run test:hydration`) when MongoDB is available

Git pre-push hook runs the same validate command.

Emergency hook bypass: `git push --no-verify`

## Remaining risks

- In-memory rate limiting is not global across instances.
- CSP allows `'unsafe-inline'` for scripts/styles required by Next.js inline bootstrapping and theme boot script.
- Automated tests cover core guard logic but do not replace manual penetration testing.
- Client-side activity logger remains diagnostic only and is not a security audit trail.
- React error boundaries show generic messages in the UI; they are not a substitute for fixing client bugs or logging on the server.
- API error toasts display server `error` message text to the signed-in user only; they must not include stack traces or secrets (same contract as JSON API errors).
