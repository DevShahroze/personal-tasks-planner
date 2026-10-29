"use client";

import { useTheme } from "@/components/theme/theme-provider";
import Button from "@/components/ui/button";

function SunIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle({ compact = false, fullWidth = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const nextLabel = isDark ? "Light mode" : "Dark mode";

  return (
    <Button
      type="button"
      variant="secondary"
      className={`${fullWidth ? "w-full" : "shrink-0"} ${compact ? "gap-1.5" : "px-2 py-1.5"}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextLabel.toLowerCase()}`}
      title={nextLabel}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {compact ? <span className="text-xs">{nextLabel}</span> : null}
    </Button>
  );
}
