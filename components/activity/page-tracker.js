"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordPageVisit } from "@/lib/activity-logger";

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    recordPageVisit(pathname);
  }, [pathname]);

  return null;
}
