"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button";

function looksLikeFrameBlocked(iframe) {
  try {
    const doc = iframe.contentDocument;
    if (!doc) {
      return false;
    }
    const text = doc.body?.innerText?.toLowerCase() ?? "";
    if (
      text.includes("refused to connect") ||
      text.includes("x-frame-options") ||
      text.includes("frame ancestors") ||
      text.includes("cannot be displayed in a frame")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function WorkspaceIframePanelInner({ app, active, framePageActive }) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!framePageActive || !active) {
      return undefined;
    }
    const onViolation = (event) => {
      const directive = event.effectiveDirective || event.violatedDirective || "";
      if (directive.includes("frame-ancestors")) {
        setBlocked(true);
        setLoading(false);
      }
    };
    window.addEventListener("securitypolicyviolation", onViolation);
    return () => {
      window.removeEventListener("securitypolicyviolation", onViolation);
    };
  }, [framePageActive, active, app.url]);

  useEffect(() => {
    if (!framePageActive || !active || loadedRef.current) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, 12000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [framePageActive, active, app.url]);

  const onLoad = () => {
    loadedRef.current = true;
    setLoading(false);
    const iframe = iframeRef.current;
    if (iframe && looksLikeFrameBlocked(iframe)) {
      setBlocked(true);
      return;
    }
    window.setTimeout(() => {
      const el = iframeRef.current;
      if (!el) {
        return;
      }
      try {
        const doc = el.contentDocument;
        if (doc && looksLikeFrameBlocked(el)) {
          setBlocked(true);
        }
      } catch {
        // cross-origin embed succeeded, or frame-ancestors blocked (blank frame)
      }
    }, 400);
  };

  return (
    <div
      className={
        active
          ? "absolute inset-0 flex min-h-0 flex-col"
          : "pointer-events-none absolute inset-0 flex min-h-0 flex-col opacity-0"
      }
      aria-hidden={!active}
    >
      {blocked ? (
        <div className="mb-2 rounded-md border border-border bg-muted/50 p-3 text-sm">
          <p className="font-medium">This app cannot be embedded</p>
          <p className="mt-1 text-muted-foreground">
            That site sent{" "}
            <span className="font-medium text-foreground">
              Content-Security-Policy: frame-ancestors &apos;none&apos;
            </span>{" "}
            (or X-Frame-Options), so the browser blocks it inside Workspace. Allow this
            planner&apos;s origin in that app&apos;s{" "}
            <span className="font-medium text-foreground">frame-ancestors</span> header,
            or open the app in a new tab.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() => window.open(app.url, "_blank", "noopener,noreferrer")}
          >
            Open in new tab
          </Button>
        </div>
      ) : null}
      <div className="relative min-h-[480px] flex-1 overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <p className="absolute inset-0 z-[1] flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : null}
        <iframe
          ref={iframeRef}
          title={app.name}
          src={app.url}
          className="absolute inset-0 h-full w-full bg-background"
          onLoad={onLoad}
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}

export default function WorkspaceIframePanel({ app, active, framePageActive }) {
  return (
    <WorkspaceIframePanelInner
      key={app.url}
      app={app}
      active={active}
      framePageActive={framePageActive}
    />
  );
}
