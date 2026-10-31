"use client";

import { useEffect, useRef } from "react";

export default function Input({ className = "", type, onWheel, ...props }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (type !== "number") {
      return undefined;
    }
    const node = inputRef.current;
    if (!node) {
      return undefined;
    }
    const blockWheel = (event) => {
      if (document.activeElement === node) {
        event.preventDefault();
      }
    };
    node.addEventListener("wheel", blockWheel, { passive: false });
    return () => node.removeEventListener("wheel", blockWheel);
  }, [type]);

  return (
    <input
      ref={inputRef}
      type={type}
      className={`relative z-0 w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-sm text-foreground transition-[border-color,box-shadow,z-index] duration-150 placeholder:text-muted-foreground focus:z-50 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
      onWheel={onWheel}
    />
  );
}
