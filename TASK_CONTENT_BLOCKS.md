# Task interactive content blocks

Tasks support an ordered list of **content blocks** stored on the task document in MongoDB (`contentBlocks`). Blocks are edited on the task detail page under **Interactive content**. The main task fields (title, description, dates, etc.) save only via **Update task** in the fixed footer; interactive blocks save on their own (see **Frontend** below).

## Block types

| Type         | Fields                                              | Behavior                                           |
| ------------ | --------------------------------------------------- | -------------------------------------------------- |
| `checkbox`   | `id`, `label`, optional `slug`, `checked`           | Editable label; check/uncheck persists immediately |
| `radioGroup` | `id`, `groupLabel`, `options[]`, `selectedOptionId` | One selection per group; multiple groups per task  |
| `table`      | `id`, `columns[]`, `rows[]`                         | Add/remove rows and columns; edit cell values      |

Each block has a stable string `id` (UUID). Checkbox **`slug`** is optional, lowercase, used to dedupe items when bulk-creating from description text (`lib/content-blocks.js`: `parseCommaSeparatedLabels`, `createCheckboxBlocksFromLabels`, `collectCheckboxSlugs`). Table cells reference columns by `columnId`.

## Create items (from description)

On the task edit form, **Create items** reads the **Description** field, splits on commas, title-cases each label, and PATCHes new **checkbox** blocks whose slugs are not already present on the task. This is separate from **Update task** (which saves the rest of the form).

## API

- **Read:** `GET /api/tasks/:id` includes full `contentBlocks`.
- **Write:** `PATCH /api/tasks/:id` with `{ contentBlocks, expectedUpdatedAt }` (or other task fields on the same route).
- Server validation: `lib/content-blocks.js` (`validateContentBlocks`).
- **Conflict:** If `expectedUpdatedAt` does not match the current task, or a concurrent save loses the Mongoose version race, the API returns **409** so the client can refresh and retry. Saves for content blocks are serialized in the client to reduce overlapping PATCHes.

List endpoints omit `contentBlocks` for efficiency.

## Frontend

- Main form: `components/tasks/task-form.js` (fixed footer **Update** / **Delete**).
- Interactive blocks: `components/tasks/task-content-blocks.js`
- Checkbox and radio changes save immediately.
- Text labels and table cells debounce (~600ms) before PATCH.
- Save status: pending, saving, saved, or error with **Retry** (failed saves also trigger the global API error toast).
- Mutations invalidate the task detail, task lists, dashboard, and calendar queries where applicable (see `hooks/use-tasks.js` and `lib/query-client.js`).

## Backward compatibility

Tasks created before this feature have `contentBlocks: []` (default). Description and all other task fields are unchanged.

## Example document shape

```json
{
  "contentBlocks": [
    {
      "id": "a1b2c3d4-...",
      "type": "checkbox",
      "label": "Pack Charger",
      "slug": "pack-charger",
      "checked": true
    },
    {
      "id": "e5f6...",
      "type": "radioGroup",
      "groupLabel": "Priority approach",
      "options": [
        { "id": "opt1", "label": "Deep work first" },
        { "id": "opt2", "label": "Admin first" }
      ],
      "selectedOptionId": "opt1"
    },
    {
      "id": "tbl1...",
      "type": "table",
      "columns": [
        { "id": "c1", "label": "Item" },
        { "id": "c2", "label": "Done" }
      ],
      "rows": [
        {
          "id": "r1",
          "cells": [
            { "columnId": "c1", "value": "Review notes" },
            { "columnId": "c2", "value": "Yes" }
          ]
        }
      ]
    }
  ]
}
```

## Manual verification

1. Open a task detail page and add checkbox, radio, and table blocks.
2. Refresh the page and confirm all state persists.
3. Log out and back in; confirm again.
4. Edit one block and confirm others are not cleared.
5. In DevTools Network, confirm text edits are debounced and checkbox/radio saves are prompt.
6. Use **Create items** with a comma-separated description; confirm new checkboxes appear and duplicates (by slug) are skipped.

## Related task features

Scheduling, recurrence, optional **amount spent**, and calendar UI live on the same task document but separate fields (`taskDate`, `schedule`, `recurrence`, `amountSpent`). Calendar month API includes **task date** entries via `lib/calendar/task-entries.js`. See [ARCHITECTURE.md](./ARCHITECTURE.md), [README.md](./README.md), and [HYDRATION.md](./HYDRATION.md).
