# Push checklist (for humans and Cursor)

Use this file when you want to **run pre-checks**, **commit**, and **push**. Example: “follow `PUSH_CHECKLIST.md` and push.”

---

## Git author (required on commits)

Do **not** change global or local `git config`. Set the author **per commit** only:

| Field      | Value                                                |
| ---------- | ---------------------------------------------------- |
| Name       | `DevShahroze`                                        |
| Email      | `DevShahroze@users.noreply.github.com`               |
| `--author` | `DevShahroze <DevShahroze@users.noreply.github.com>` |

---

## One local pre-check command

Formats the repo, then runs the same gate as Husky (`CI=1`):

```bash
npm run prepush:local
```

Underlying scripts: `format:fix` → `validate:ci` (see [package.json](./package.json)). [`.husky/pre-push`](./.husky/pre-push) runs **`npm run validate:ci`** only (no auto-format on push).

### What `validate:ci` runs

ESLint, Prettier check, unit tests (security, **activity**, scheduling, recurrence, client-today, format, subtasks, finance, planning), dependency audit, production build.

### Already on remote

If `git status` is clean and `git log origin/main..HEAD` is empty after `git fetch origin`, **`main` is already pushed** — report that to the user; only commit and push when there are new local commits.

### Emergency bypass

```bash
git push --no-verify
```

Use only when the user explicitly accepts skipping Husky (not for routine agent pushes).

---

## Agent: one shell, one go (do not fragment)

When the user asks to **push** (or follow this checklist and push):

1. **Inspect once** (may run `git status`, `git diff`, and `git log -3` in parallel in the same turn).
2. **Run a single long Shell command** that chains everything below. Do **not** stop after validate, ask the user to run another command, or split into separate validate → format → validate → commit → push turns unless **`prepush:local` failed** and you are fixing code before retrying **one** new chain.
3. Do **not** ask the user to run commands manually.

Replace the commit message with an accurate summary. Stage only intended files (`git add -A` when the whole change set should ship; never `.env` or secrets). On zsh, quote paths with parentheses.

If there is **nothing to commit** but the user asked to push, run **`git fetch origin && git push`** only (after confirming they want remote updated).

```bash
cd /path/to/personal-tasks-planner && \
npm run prepush:local && \
git add -A && \
git diff --cached --quiet || git commit --author="DevShahroze <DevShahroze@users.noreply.github.com>" -m "$(cat <<'EOF'
Your commit message here.

EOF
)" && \
git push
```

Use a long `block_until_ms` (e.g. 600000) on that Shell call — validate + build can take several minutes. Husky runs `validate:ci` again on push; that is expected.

If **`prepush:local` fails**: fix the reported issue, then run **one** new chained command (same shape). Do not commit until `prepush:local` succeeds.

Do **not** commit or push unless the user asked for it.

---

## Quick reference

| Step                    | Command                                                         |
| ----------------------- | --------------------------------------------------------------- |
| Pre-check (once)        | `npm run prepush:local`                                         |
| Hook / CI validate only | `npm run validate:ci`                                           |
| Commit author           | `--author="DevShahroze <DevShahroze@users.noreply.github.com>"` |
| Push                    | `git push` (Husky → `validate:ci`)                              |

Related: [README.md](./README.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md), [HYDRATION.md](./HYDRATION.md).
