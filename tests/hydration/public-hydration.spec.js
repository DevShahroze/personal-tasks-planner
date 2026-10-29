import { expect, test } from "@playwright/test";

const HYDRATION_CONSOLE_PATTERN =
  /hydration|did not match|Text content does not match|Prop `.*` did not match/i;

function attachHydrationWatchers(page) {
  const issues = [];

  page.on("console", (message) => {
    const type = message.type();
    const text = message.text();
    if (
      (type === "error" || type === "warning") &&
      HYDRATION_CONSOLE_PATTERN.test(text)
    ) {
      issues.push(`[console:${type}] ${text}`);
    }
  });

  page.on("pageerror", (error) => {
    if (HYDRATION_CONSOLE_PATTERN.test(error.message)) {
      issues.push(`[pageerror] ${error.message}`);
    }
  });

  return issues;
}

async function assertNoHydrationIssues(issues, context) {
  expect(issues, context).toEqual([]);
}

async function visit(page, path) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `navigation to ${path}`).not.toBeNull();
  await page.waitForLoadState("networkidle").catch(() => {});
}

test.describe("hydration — public routes", () => {
  test("login direct load and refresh", async ({ page }) => {
    const issues = attachHydrationWatchers(page);
    await visit(page, "/login");
    await assertNoHydrationIssues(issues, "login initial load");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertNoHydrationIssues(issues, "login refresh");
  });

  test("theme toggle on login", async ({ page }) => {
    const issues = attachHydrationWatchers(page);
    await visit(page, "/login");
    const toggle = page.getByRole("button", { name: /switch to (light|dark) mode/i });
    await toggle.click();
    await assertNoHydrationIssues(issues, "login theme toggle");
    await toggle.click();
    await assertNoHydrationIssues(issues, "login theme toggle back");
  });
});
