"use client";

import { useEffect, useState } from "react";
import { subscribeToasts } from "@/lib/toast-bus";

const AUTO_DISMISS_MS = 6000;

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((current) => [...current, toast]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  if (!toasts.length) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-lg ${
            toast.variant === "success"
              ? "border-success/30 bg-card text-foreground"
              : "border-destructive/40 bg-card text-foreground"
          }`}
        >
          <p className="font-medium">{toast.message}</p>
          {toast.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
