"use client";

/** Chart colors track semantic CSS variables (light/dark) without reading the DOM during render. */
export function useChartTheme() {
  return {
    grid: "var(--chart-grid)",
    text: "var(--chart-text)",
    primary: "var(--primary)",
    success: "var(--success)",
  };
}
