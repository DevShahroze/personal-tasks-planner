"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button";
import CalculatorModal from "@/components/tools/calculator-modal";
import TaskCalendarModal from "@/components/tools/task-calendar-modal";
import WeatherModal from "@/components/tools/weather-modal";
import { SHELL_FLOATING_RIGHT_CLASS } from "@/lib/layout/shell-nav";

export default function FloatingToolsWidget() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
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

  const openCalendar = () => {
    setMenuOpen(false);
    setCalendarOpen(true);
  };

  const openWeather = () => {
    setMenuOpen(false);
    setWeatherOpen(true);
  };

  return (
    <>
      <div
        ref={rootRef}
        className={`fixed bottom-20 right-3 z-40 flex flex-col-reverse items-end gap-2 md:bottom-4 ${SHELL_FLOATING_RIGHT_CLASS}`}
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
          <div className="flex flex-col items-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="shadow-md"
              onClick={openWeather}
            >
              Weather
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="shadow-md"
              onClick={openCalendar}
            >
              Calendar
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="shadow-md"
              onClick={openCalculator}
            >
              Calculator
            </Button>
          </div>
        ) : null}
      </div>

      <CalculatorModal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
      <TaskCalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <WeatherModal open={weatherOpen} onClose={() => setWeatherOpen(false)} />
    </>
  );
}
