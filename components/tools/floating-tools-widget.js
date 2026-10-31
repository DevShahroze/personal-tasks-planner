"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button";
import CalculatorModal from "@/components/tools/calculator-modal";

export default function FloatingToolsWidget() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) {
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const openCalculator = () => {
    setMenuOpen(false);
    setCalculatorOpen(true);
  };

  return (
    <>
      <div
        ref={rootRef}
        className="fixed bottom-20 right-3 z-40 flex flex-col-reverse items-end gap-2 md:bottom-4 md:right-4"
      >
        <button
          type="button"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-0 bg-primary text-lg leading-none text-primary-foreground shadow-lg transition hover:bg-primary-hover"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close tools menu" : "Open tools menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "×" : "☰"}
        </button>
        {menuOpen ? (
          <Button
            type="button"
            variant="secondary"
            className="shadow-md"
            onClick={openCalculator}
          >
            Calculator
          </Button>
        ) : null}
      </div>

      <CalculatorModal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </>
  );
}
