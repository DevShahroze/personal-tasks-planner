"use client";

import { useSyncExternalStore } from "react";
import {
  isCoarsePointerDevice,
  subscribeCoarsePointerDevice,
} from "@/lib/device/coarse-pointer";

export function useCoarsePointerDevice() {
  return useSyncExternalStore(
    subscribeCoarsePointerDevice,
    isCoarsePointerDevice,
    () => false,
  );
}
