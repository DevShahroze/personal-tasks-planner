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
  forceLogoutAfterPinTamper,
  setPinLockScreenActive,
  touchPinActivity,
} from "@/lib/admin/pin-screen-client";
import PinLockOverlay from "@/components/admin/pin-lock-overlay";

const PinLockContext = createContext(null);

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "mousedown", "touchstart"];
const TAMPER_MISS_THRESHOLD = 3;

export function PinLockProvider({ children }) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: queryKeys.admin.pinScreen,
    queryFn: () => adminApi.pinScreen.get(),
    ...catalogQueryOptions(),
  });

  const lastActivityRef = useRef(0);
  const overlayRootRef = useRef(null);
  const isLockedRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const config = settingsQuery.data;
  const active =
    settingsQuery.isFetched && Boolean(config?.enabled) && Boolean(config?.configured);

  const idleMs = (config?.idleMinutes ?? 5) * 60 * 1000;
  const locked = active && isLocked;

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    setPinLockScreenActive(locked);
    return () => {
      setPinLockScreenActive(false);
    };
  }, [locked]);

  useEffect(() => {
    if (!active) {
      isLockedRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- disable PIN when settings turn off
      setIsLocked(false);
      return undefined;
    }
    touchPinActivity(lastActivityRef);
    return undefined;
  }, [active]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const onActivity = () => {
      if (isLockedRef.current) {
        return;
      }
      touchPinActivity(lastActivityRef);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true, capture: true });
    }

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity, { capture: true });
      }
    };
  }, [active]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (isLockedRef.current) {
        return;
      }
      const shouldLock = Date.now() - lastActivityRef.current >= idleMs;
      if (shouldLock) {
        isLockedRef.current = true;
        setIsLocked(true);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [active, idleMs]);

  const markOverlayRoot = useCallback((el) => {
    overlayRootRef.current = el;
  }, []);

  useEffect(() => {
    if (!locked) {
      overlayRootRef.current = null;
      return undefined;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let missCount = 0;
    let tamperLoggingOut = false;

    const checkTamper = () => {
      if (tamperLoggingOut) {
        return;
      }
      const el = overlayRootRef.current;
      if (el && el.isConnected) {
        missCount = 0;
        return;
      }
      missCount += 1;
      if (missCount >= TAMPER_MISS_THRESHOLD) {
        tamperLoggingOut = true;
        void forceLogoutAfterPinTamper();
      }
    };

    const interval = window.setInterval(checkTamper, 400);

    return () => {
      document.body.style.overflow = previous;
      window.clearInterval(interval);
      overlayRootRef.current = null;
    };
  }, [locked]);

  const unlock = useCallback(async (pin) => {
    setUnlocking(true);
    setUnlockError("");
    try {
      await adminApi.pinScreen.unlock({ pin });
      touchPinActivity(lastActivityRef);
      isLockedRef.current = false;
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
          onMounted={markOverlayRoot}
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
