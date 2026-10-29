# Push checklist (for humans and Cursor)

Use this file when you want to **run pre-checks**, **commit**, and **push** this repo. Point the agent here: e.g. “follow `PUSH_CHECKLIST.md` and push.”

---

## Git author (required on commits)

Do **not** change global or local `git config`. Set the author **per commit** only:

| Field      | Value                                                |
| ---------- | ---------------------------------------------------- |
| Name       | `DevShahroze`                                        |
| Email      | `DevShahroze@users.noreply.github.com`               |
| `--author` | `DevShahroze <DevShahroze@users.noreply.github.com>` |

Example:

```bash
git commit --author="DevShahroze <DevShahroze@users.noreply.github.com>" -m "$(cat <<'EOF'
Your commit message here.

EOF
)"
```

---

## Pre-checks before push

### What runs

The same pipeline as **`npm run validate`** (also enforced by Husky on **`git push`**):

1. ESLint (`npm run lint`)
2. Prettier check (`npm run format`)
3. Unit tests: security, scheduling, recurrence, client-today, format, subtasks, finance, planning
4. Production dependency audit (`npm run audit:security`)
5. Production build (`npm run build`)
6. Playwright hydration tests (`npm run test:hydration`)

### Command to run locally (recommended)

Matches [`.husky/pre-push`](./.husky/pre-push) so local results match the hook:

```bash
CI=1 PLAYWRIGHT_PORT=3001 npm run validate
```

If Prettier fails, fix formatting then re-run validate:

```bash
npm run format:fix
CI=1 PLAYWRIGHT_PORT=3001 npm run validate
```

### Hydration / Playwright notes

- Hydration needs **MongoDB** reachable (see [HYDRATION.md](./HYDRATION.md)).
- With **`CI=1`** and **`PLAYWRIGHT_PORT=3001`**, tests start their own production server with test credentials instead of reusing `npm run dev` on port **3000** (which causes login failures during validate).
- If validate fails only on hydration while dev is on `:3000`, stop dev or use the command above.

### Emergency bypass (avoid unless necessary)

```bash
git push --no-verify
```

---

## Commit and push workflow (agent)

1. Inspect changes: `git status`, `git diff` (and `git log -3` for message style if needed).
2. Run pre-checks (command above). Fix failures before committing.
3. Stage intended files only (no `.env` or secrets). On zsh, quote paths with parentheses, e.g. `"app/(protected)/tasks/[id]/page.js"`, or use `git add -A` when the whole change set should ship.
4. Commit with **`--author="DevShahroze <DevShahroze@users.noreply.github.com>"`** and a clear message (what/why).
5. Push: `git push` (Husky runs validate again with `CI=1` and `PLAYWRIGHT_PORT=3001`).

Do **not** commit or push unless the user asked for it.

---

## Quick reference

| Step          | Command                                                         |
| ------------- | --------------------------------------------------------------- |
| Pre-check     | `CI=1 PLAYWRIGHT_PORT=3001 npm run validate`                    |
| Format fix    | `npm run format:fix`                                            |
| Commit author | `--author="DevShahroze <DevShahroze@users.noreply.github.com>"` |
| Push          | `git push` (runs validate via Husky)                            |

Related: [README.md](./README.md) (scripts), [ARCHITECTURE.md](./ARCHITECTURE.md) (features), [SECURITY.md](./SECURITY.md) (validate list), [HYDRATION.md](./HYDRATION.md) (Playwright env), [TASK_CONTENT_BLOCKS.md](./TASK_CONTENT_BLOCKS.md) (interactive blocks).
