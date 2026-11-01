"use client";

import { useRef, useState } from "react";
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

function WorkspaceIframePanelInner({ app, active }) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const onLoad = () => {
    setLoading(false);
    const iframe = iframeRef.current;
    if (iframe && looksLikeFrameBlocked(iframe)) {
      setBlocked(true);
    }
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
            The site blocked iframe embedding (X-Frame-Options or
            Content-Security-Policy frame-ancestors). Open it in a new browser tab
            instead.
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
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <p className="absolute inset-0 z-[1] flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : null}
        <iframe
          ref={iframeRef}
          title={app.name}
          src={app.url}
          className="h-full min-h-[480px] w-full bg-background"
          onLoad={onLoad}
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}

export default function WorkspaceIframePanel({ app, active }) {
  return <WorkspaceIframePanelInner key={app.url} app={app} active={active} />;
}
