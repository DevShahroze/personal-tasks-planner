"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  applyShellNavCssVars,
  getShellNavLeftExpanded,
  getShellNavRightExpanded,
  setShellNavLeftExpanded,
  setShellNavRightExpanded,
  subscribeShellNav,
} from "@/lib/layout/shell-nav";

function useShellNavLeftExpanded() {
  return useSyncExternalStore(subscribeShellNav, getShellNavLeftExpanded, () => true);
}

function useShellNavRightExpanded() {
  return useSyncExternalStore(subscribeShellNav, getShellNavRightExpanded, () => true);
}

export function useShellNav() {
  const leftExpanded = useShellNavLeftExpanded();
  const rightExpanded = useShellNavRightExpanded();

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => applyShellNavCssVars(leftExpanded, rightExpanded);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [leftExpanded, rightExpanded]);

  return {
    leftExpanded,
    rightExpanded,
    leftOpen: leftExpanded,
    rightOpen: rightExpanded,
    toggleLeft: () => setShellNavLeftExpanded(!getShellNavLeftExpanded()),
    toggleRight: () => setShellNavRightExpanded(!getShellNavRightExpanded()),
    setLeftExpanded: setShellNavLeftExpanded,
    setRightExpanded: setShellNavRightExpanded,
  };
}
