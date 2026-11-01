"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { PIN_LOCK_SCREEN_ID } from "@/lib/admin/pin-screen-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";

export default function PinLockOverlay({ onSubmitPin, error, submitting, onMounted }) {
  const [pin, setPin] = useState("");
  const formRef = useRef(null);

  useLayoutEffect(() => {
    const el = document.getElementById(PIN_LOCK_SCREEN_ID);
    onMounted?.(el);
    return () => {
      onMounted?.(null);
    };
  }, [onMounted]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (pin.length !== 4) {
      return;
    }
    await onSubmitPin(pin);
    setPin("");
  };

  return (
    <div
      id={PIN_LOCK_SCREEN_ID}
      data-pin-lock-root="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-background p-4"
      role="dialog"
      aria-modal="true"
      aria-label="PIN required"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="surface-card w-full max-w-sm p-4 text-card-foreground"
      >
        <h1 className="page-title">Enter PIN</h1>
        <p className="page-lead mt-0.5">
          The app is locked after inactivity. Enter your 4-digit PIN to continue.
        </p>

        {error ? (
          <div className="mt-3">
            <Alert variant="error">{error}</Alert>
          </div>
        ) : null}

        <label className="mt-4 block space-y-1 text-xs font-medium">
          <span>PIN</span>
          <Input
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            }}
            className="text-center text-lg tracking-[0.4em]"
            aria-label="4 digit PIN"
          />
        </label>

        <Button
          type="submit"
          className="mt-4 w-full"
          disabled={submitting || pin.length !== 4}
        >
          {submitting ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
