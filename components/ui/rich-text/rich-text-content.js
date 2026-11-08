"use client";

import { useEffect, useRef } from "react";
import { prepareRichTextForStorage } from "@/lib/rich-text/normalize";
import {
  RICH_TEXT_ISLAND_CSS,
  RICH_TEXT_ISLAND_DARK_VARS,
  RICH_TEXT_ISLAND_LIGHT_VARS,
} from "@/components/ui/rich-text/island-styles";

function isLikelyHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ""));
}

function applyHtmlToShadowBody(body, html) {
  const raw = String(html || "");
  if (!raw.trim()) {
    body.innerHTML = "";
    return;
  }
  if (!isLikelyHtml(raw)) {
    body.style.whiteSpace = "pre-wrap";
    body.textContent = raw;
    return;
  }
  body.style.whiteSpace = "";
  body.innerHTML = prepareRichTextForStorage(raw);
}

function useShadowRichText(hostRef, html, className) {
  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    let root = host.shadowRoot;
    if (!root) {
      root = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = [RICH_TEXT_ISLAND_LIGHT_VARS, RICH_TEXT_ISLAND_CSS].join(
        "\n",
      );
      const body = document.createElement("div");
      body.className = "rte-body";
      root.appendChild(style);
      root.appendChild(body);
      host.__rteBody = body;
      host.__rteStyle = style;
    }

    const dark = document.documentElement.classList.contains("dark");
    host.__rteStyle.textContent = [
      dark ? RICH_TEXT_ISLAND_DARK_VARS : RICH_TEXT_ISLAND_LIGHT_VARS,
      RICH_TEXT_ISLAND_CSS,
    ].join("\n");

    applyHtmlToShadowBody(host.__rteBody, html);
    return undefined;
  }, [html, hostRef]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host?.__rteStyle) {
      return undefined;
    }
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains("dark");
      host.__rteStyle.textContent = [
        dark ? RICH_TEXT_ISLAND_DARK_VARS : RICH_TEXT_ISLAND_LIGHT_VARS,
        RICH_TEXT_ISLAND_CSS,
      ].join("\n");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [hostRef]);
}

export default function RichTextContent({ html, className = "" }) {
  const hostRef = useRef(null);
  useShadowRichText(hostRef, html, className);

  return (
    <div
      ref={hostRef}
      className={`text-sm ${className}`.trim()}
      data-rich-text-content=""
    />
  );
}
