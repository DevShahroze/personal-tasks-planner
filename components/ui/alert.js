export default function Alert({ variant = "error", children }) {
  const styles = {
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    success: "border-success/30 bg-success/10 text-success",
    info: "border-border bg-muted text-foreground",
  };
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}
