#!/usr/bin/env node
import { execSync } from "node:child_process";

let auditJson;
try {
  auditJson = execSync("npm audit --omit=dev --json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  auditJson = error.stdout;
  if (!auditJson) {
    throw error;
  }
}

let report;
try {
  report = JSON.parse(auditJson);
} catch {
  console.error("Unable to parse npm audit output.");
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const blocking = Object.values(vulnerabilities).filter((item) =>
  ["high", "critical"].includes(item.severity),
);

if (blocking.length) {
  console.error(
    `Blocking production vulnerabilities found: ${blocking.length} (high/critical).`,
  );
  for (const item of blocking.slice(0, 10)) {
    console.error(
      `- ${item.name} (${item.severity}) via ${item.via?.[0]?.name || "dependency"}`,
    );
  }
  process.exit(1);
}

console.log(
  "No high/critical production dependency vulnerabilities reported by npm audit.",
);
