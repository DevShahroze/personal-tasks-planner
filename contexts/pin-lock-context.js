"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { catalogQueryOptions } from "@/lib/query-cache";
import {
  PIN_LOCK_SCREEN_ID,
  forceLogoutAfterPinTamper,
  touchPinActivity,
} from "@/lib/admin/pin-screen-client";
import PinLockOverlay from "@/components/admin/pin-lock-overlay";

const PinLockContext = createContext(null);

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "mousedown", "touchstart", "scroll"];

export function PinLockProvider({ children }) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: queryKeys.admin.pinScreen,
    queryFn: () => adminApi.pinScreen.get(),
    ...catalogQueryOptions(),
  });

  const lastActivityRef = useRef(0);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const config = settingsQuery.data;
  const active =
    Boolean(config?.enabled) && Boolean(config?.configured) && !settingsQuery.isLoading;

  const idleMs = (config?.idleMinutes ?? 5) * 60 * 1000;
  const locked = active && isLocked;

  const bumpActivity = useCallback(() => {
    if (!active || isLocked) {
      return;
    }
    touchPinActivity(lastActivityRef);
    setIsLocked(false);
  }, [active, isLocked]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    touchPinActivity(lastActivityRef);

    const onActivity = () => bumpActivity();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true, capture: true });
    }

    const timer = window.setInterval(() => {
      setIsLocked(Date.now() - lastActivityRef.current >= idleMs);
    }, 1000);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity, { capture: true });
      }
      window.clearInterval(timer);
    };
  }, [active, idleMs, bumpActivity]);

  useEffect(() => {
    if (!locked) {
      return undefined;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const checkTamper = () => {
      const el = document.getElementById(PIN_LOCK_SCREEN_ID);
      if (!el || !document.body.contains(el)) {
        forceLogoutAfterPinTamper();
      }
    };

    checkTamper();
    const interval = window.setInterval(checkTamper, 400);
    const observer = new MutationObserver(checkTamper);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      document.body.style.overflow = previous;
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, [locked]);

  const unlock = useCallback(async (pin) => {
    setUnlocking(true);
    setUnlockError("");
    try {
      await adminApi.pinScreen.unlock({ pin });
      touchPinActivity(lastActivityRef);
      setIsLocked(false);
    } catch (err) {
      setUnlockError(err.message || "Incorrect PIN");
    } finally {
      setUnlocking(false);
    }
  }, []);

  const invalidateSettings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.pinScreen });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      locked,
      unlock,
      unlockError,
      unlocking,
      invalidateSettings,
      settings: config,
    }),
    [locked, unlock, unlockError, unlocking, invalidateSettings, config],
  );

  return (
    <PinLockContext.Provider value={value}>
      <div
        className={locked ? "pointer-events-none select-none" : undefined}
        aria-hidden={locked ? true : undefined}
      >
        {children}
      </div>
      {locked ? (
        <PinLockOverlay
          onSubmitPin={unlock}
          error={unlockError}
          submitting={unlocking}
        />
      ) : null}
    </PinLockContext.Provider>
  );
}

export function usePinLock() {
  const ctx = useContext(PinLockContext);
  if (!ctx) {
    throw new Error("usePinLock must be used within PinLockProvider");
  }
  return ctx;
}
