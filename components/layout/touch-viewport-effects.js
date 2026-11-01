"use client";

import { useEffect } from "react";
import { useCoarsePointerDevice } from "@/hooks/use-coarse-pointer";

/** Marks the document for touch-specific CSS and prevents iOS input focus zoom side effects. */
export default function TouchViewportEffects() {
  const isTouch = useCoarsePointerDevice();

  useEffect(() => {
    document.documentElement.dataset.pointer = isTouch ? "coarse" : "fine";
    return () => {
      delete document.documentElement.dataset.pointer;
    };
  }, [isTouch]);

  return null;
}
