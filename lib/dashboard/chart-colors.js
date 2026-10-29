/** Dashboard bar chart fills — semantic CSS tokens (light/dark via globals.css). */

const CATEGORY_PALETTE = [
  "var(--primary)",
  "var(--secondary)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "var(--accent-foreground)",
];

const TASK_STATUS_FILL = {
  "To Do": "var(--primary)",
  "In Progress": "var(--secondary)",
  Completed: "var(--success)",
  Cancelled: "var(--muted-foreground)",
};

const TASK_PRIORITY_FILL = {
  Low: "var(--chart-text)",
  Medium: "var(--primary)",
  High: "var(--warning)",
  Urgent: "var(--destructive)",
};

export function fillForTaskStatus(name) {
  return TASK_STATUS_FILL[name] || CATEGORY_PALETTE[0];
}

export function fillForTaskPriority(name) {
  return TASK_PRIORITY_FILL[name] || CATEGORY_PALETTE[1];
}

export function fillForTaskCategory(name) {
  let hash = 0;
  const label = String(name || "");
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}
