<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project documentation

Human-maintained docs live in the repo root: [README.md](./README.md) (setup, **task detail UX**, **categories/Unassigned**, **calendar task date**, **amount spent**, **task processor**, **query caching**, **API error toasts**), [PUSH_CHECKLIST.md](./PUSH_CHECKLIST.md) (**pre-push validate, commit author, push workflow for Cursor**), [ARCHITECTURE.md](./ARCHITECTURE.md) (dashboard aggregation routes, toast bus, task processor, planning validation, graceful degradation), [HYDRATION.md](./HYDRATION.md), [SECURITY.md](./SECURITY.md), and [TASK_CONTENT_BLOCKS.md](./TASK_CONTENT_BLOCKS.md) (**checkbox slugs**, **Create items**, interactive PATCH/409 behavior).
