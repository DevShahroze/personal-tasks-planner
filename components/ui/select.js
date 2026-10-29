export default function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`relative z-0 w-full appearance-auto rounded-md border border-border bg-input px-2.5 py-1.5 text-sm text-foreground transition-[border-color,box-shadow,z-index] duration-150 focus:z-50 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
