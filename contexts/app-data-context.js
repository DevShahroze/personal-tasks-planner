"use client";

import { createContext, useContext, useMemo } from "react";
import { useCategoriesSlice } from "@/contexts/slices/categories-slice";
import { useAvailabilityTemplatesSlice } from "@/contexts/slices/availability-templates-slice";

const AppDataContext = createContext(null);

/**
 * Client-side app catalog: loaded once per session, updated in place.
 * Add new slices under `contexts/slices/` and wire them into `value` below.
 */
export function AppDataProvider({ children }) {
  const categories = useCategoriesSlice();
  const availabilityTemplates = useAvailabilityTemplatesSlice();

  const value = useMemo(
    () => ({
      categories,
      availabilityTemplates,
    }),
    [categories, availabilityTemplates],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}

export function useAppCategories() {
  return useAppData().categories;
}

export function useAppAvailabilityTemplates() {
  return useAppData().availabilityTemplates;
}
