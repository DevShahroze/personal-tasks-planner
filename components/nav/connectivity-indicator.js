"use client";

import { useNetworkOnline } from "@/hooks/use-network-online";

export default function ConnectivityIndicator() {
  const online = useNetworkOnline();

  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-live="polite"
      aria-label={online ? "Connected to the internet" : "No internet connection"}
      title={
        online ? "Connected" : "Offline — changes may not save until you reconnect"
      }
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          online ? "bg-emerald-500" : "bg-destructive"
        }`}
        aria-hidden
      />
      <span
        className={`hidden text-[0.6875rem] font-medium sm:inline ${
          online ? "text-muted-foreground" : "text-destructive"
        }`}
      >
        {online ? "Online" : "Offline"}
      </span>
    </span>
  );
}
