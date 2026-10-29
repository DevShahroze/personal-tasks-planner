export default function StickyPageFooter({ children, className = "" }) {
  return (
    <div
      className={`sticky bottom-0 z-20 -mx-3 mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 px-3 py-3 backdrop-blur md:-mx-4 md:px-4 supports-[backdrop-filter]:bg-background/80 ${className}`}
    >
      {children}
    </div>
  );
}
