"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  downloadActivityLogs,
  getActivityLogs,
  isLoggingEnabled,
  setLoggingEnabled,
} from "@/lib/activity-logger";
import Button from "@/components/ui/button";

export default function ActivityLoggerControls({ compact = false }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [hasLogs, setHasLogs] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync persisted preference after hydration
    setEnabled(isLoggingEnabled());
    setHasLogs(getActivityLogs().length > 0);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh export availability after navigation
    setHasLogs(getActivityLogs().length > 0);
  }, [pathname, enabled]);

  const onToggle = (event) => {
    const next = event.target.checked;
    setLoggingEnabled(next);
    setEnabled(next);
    setExportMessage("");
  };

  const onExport = () => {
    setExportMessage("");
    const result = downloadActivityLogs();
    if (!result.ok) {
      setExportMessage(result.message);
    }
  };

  return (
    <div
      className={`space-y-1.5 ${compact ? "" : "rounded-md border border-border bg-muted/40 p-2"}`}
    >
      <label className="flex items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          checked={enabled}
          onChange={onToggle}
        />
        Enable Logs
      </label>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={onExport}
        disabled={!hasLogs}
        title={hasLogs ? "Export current session logs" : "No logs in this session"}
      >
        Export Logs
      </Button>
      {exportMessage ? (
        <p className="text-xs text-muted-foreground">{exportMessage}</p>
      ) : null}
    </div>
  );
}
