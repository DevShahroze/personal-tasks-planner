export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
