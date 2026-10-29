export default function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-sm text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
