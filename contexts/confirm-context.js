"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    const normalized =
      typeof options === "string"
        ? { description: options, title: "Confirm" }
        : options;
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        title: "Confirm",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        variant: "danger",
        ...normalized,
      });
    });
  }, []);

  const close = (result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        title={state?.title || "Confirm"}
        onClose={() => close(false)}
      >
        {state ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {state.description}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                {state.cancelLabel}
              </Button>
              <Button type="button" variant={state.variant} onClick={() => close(true)}>
                {state.confirmLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return confirm;
}
