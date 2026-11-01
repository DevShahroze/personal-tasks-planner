"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, authApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { catalogQueryOptions } from "@/lib/query-cache";
import { isPinLockScreenActive } from "@/lib/admin/pin-screen-client";
import {
  performSessionIdleLogout,
  touchSessionActivity,
} from "@/lib/admin/session-idle-logout-client";
import { usePinLock } from "@/contexts/pin-lock-context";

const SessionIdleLogoutContext = createContext(null);

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "mousedown", "touchstart", "scroll"];

export function SessionIdleLogoutProvider({ children }) {
  const { locked: pinLocked } = usePinLock();
  const queryClient = useQueryClient();
  const prevPinLockedRef = useRef(false);
  const settingsQuery = useQuery({
    queryKey: queryKeys.admin.sessionIdleLogout,
    queryFn: () => adminApi.sessionIdleLogout.get(),
    ...catalogQueryOptions(),
  });

  const lastActivityRef = useRef(0);
  const config = settingsQuery.data;
  const active =
    Boolean(config?.enabled) &&
    !settingsQuery.isLoading &&
    Boolean(config?.idleMinutes);
  const idleMs = (config?.idleMinutes ?? 30) * 60 * 1000;

  const invalidateSettings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.sessionIdleLogout });
  }, [queryClient]);

  useEffect(() => {
    if (prevPinLockedRef.current && !pinLocked) {
      touchSessionActivity(lastActivityRef);
    }
    prevPinLockedRef.current = pinLocked;
  }, [pinLocked]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    touchSessionActivity(lastActivityRef);

    const onActivity = () => {
      if (pinLocked || isPinLockScreenActive()) {
        return;
      }
      touchSessionActivity(lastActivityRef);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true, capture: true });
    }

    const timer = window.setInterval(() => {
      if (pinLocked || isPinLockScreenActive()) {
        return;
      }
      if (Date.now() - lastActivityRef.current >= idleMs) {
        void performSessionIdleLogout();
      }
    }, 1000);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity, { capture: true });
      }
      window.clearInterval(timer);
    };
  }, [active, idleMs, pinLocked]);

  useEffect(() => {
    let expiryTimer;
    let syncInterval;

    const armExpiryTimer = async () => {
      if (expiryTimer) {
        window.clearTimeout(expiryTimer);
        expiryTimer = undefined;
      }
      if (pinLocked || isPinLockScreenActive()) {
        return;
      }
      try {
        const data = await authApi.session();
        if (!data?.expiresAt) {
          return;
        }
        const ms = new Date(data.expiresAt).getTime() - Date.now();
        if (ms <= 0) {
          void performSessionIdleLogout();
          return;
        }
        expiryTimer = window.setTimeout(() => {
          if (isPinLockScreenActive()) {
            return;
          }
          void performSessionIdleLogout();
        }, ms);
      } catch {
        // Session already invalid
      }
    };

    void armExpiryTimer();
    syncInterval = window.setInterval(() => {
      void armExpiryTimer();
    }, 60_000);

    return () => {
      if (expiryTimer) {
        window.clearTimeout(expiryTimer);
      }
      window.clearInterval(syncInterval);
    };
  }, [pinLocked]);

  return (
    <SessionIdleLogoutContext.Provider value={{ invalidateSettings }}>
      {children}
    </SessionIdleLogoutContext.Provider>
  );
}

export function useSessionIdleLogoutSettings() {
  const ctx = useContext(SessionIdleLogoutContext);
  if (!ctx) {
    throw new Error(
      "useSessionIdleLogoutSettings must be used within SessionIdleLogoutProvider",
    );
  }
  return ctx;
}
