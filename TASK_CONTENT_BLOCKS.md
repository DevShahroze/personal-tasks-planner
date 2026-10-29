# Task interactive content blocks

Tasks support an ordered list of **content blocks** stored on the task document in MongoDB (`contentBlocks`). Blocks are edited on the task detail page under **Interactive content**.

## Block types

| Type         | Fields                                              | Behavior                                           |
| ------------ | --------------------------------------------------- | -------------------------------------------------- |
| `checkbox`   | `id`, `label`, `checked`                            | Editable label; check/uncheck persists immediately |
| `radioGroup` | `id`, `groupLabel`, `options[]`, `selectedOptionId` | One selection per group; multiple groups per task  |
| `table`      | `id`, `columns[]`, `rows[]`                         | Add/remove rows and columns; edit cell values      |

Each block has a stable string `id` (UUID). Table cells reference columns by `columnId`.

## API

- **Read:** `GET /api/tasks/:id` includes full `contentBlocks`.
- **Write:** `PATCH /api/tasks/:id` with `{ contentBlocks, expectedUpdatedAt }`.
- Server validation: `lib/content-blocks.js` (`validateContentBlocks`).
- **Conflict:** If `expectedUpdatedAt` does not match the current task, the API returns **409** so the client can refresh and retry.

List endpoints omit `contentBlocks` for efficiency.

## Frontend

- Component: `components/tasks/task-content-blocks.js`
- Checkbox and radio changes save immediately.
- Text labels and table cells debounce (~600ms) before PATCH.
- Save status: pending, saving, saved, or error with **Retry** (failed saves also trigger the global API error toast).
- Mutations invalidate the task detail, task lists, and dashboard queries only (see `hooks/use-tasks.js`).

## Backward compatibility

Tasks created before this feature have `contentBlocks: []` (default). Description and all other task fields are unchanged.

## Example document shape

```json
{
  "contentBlocks": [
    {
      "id": "a1b2c3d4-...",
      "type": "checkbox",
      "label": "Pack charger",
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

## Related task features

Scheduling, recurrence, and calendar UI live on the same task document but separate fields (`schedule`, `recurrence`). See [ARCHITECTURE.md](./ARCHITECTURE.md) and [HYDRATION.md](./HYDRATION.md).
