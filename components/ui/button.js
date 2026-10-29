export default function Button({
  children,
  className = "",
  variant = "primary",
  type = "button",
  ...props
}) {
  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50",
    secondary:
      "border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50",
    danger:
      "bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50",
    ghost: "text-foreground hover:bg-muted disabled:opacity-50",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-[background,color,opacity] duration-150 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
