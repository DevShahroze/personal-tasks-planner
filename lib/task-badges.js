const STATUS_STYLES = {
  "To Do": "bg-muted text-muted-foreground ring-1 ring-border",
  "In Progress": "bg-accent text-accent-foreground ring-1 ring-primary/30",
  Completed: "bg-success/15 text-success ring-1 ring-success/30",
  Cancelled: "bg-destructive/10 text-destructive ring-1 ring-destructive/25",
};

const PRIORITY_STYLES = {
  Low: "bg-muted text-muted-foreground ring-1 ring-border",
  Medium: "bg-primary/10 text-primary ring-1 ring-primary/25",
  High: "bg-warning/15 text-warning ring-1 ring-warning/30",
  Urgent: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
};

export function statusBadgeClass(status) {
  return STATUS_STYLES[status] || "bg-muted text-muted-foreground ring-1 ring-border";
}

export function priorityBadgeClass(priority) {
  return (
    PRIORITY_STYLES[priority] || "bg-muted text-muted-foreground ring-1 ring-border"
  );
}
