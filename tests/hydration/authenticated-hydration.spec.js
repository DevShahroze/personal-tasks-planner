import { expect, test } from "@playwright/test";

const HYDRATION_CONSOLE_PATTERN =
  /hydration|did not match|Text content does not match|Prop `.*` did not match/i;

const PROTECTED_ROUTES = [
  "/dashboard",
  "/tasks",
  "/tasks/new",
  "/thoughts",
  "/thoughts/new",
  "/plans",
  "/plans/new",
  "/categories",
];

const SAMPLE_OBJECT_ID = "507f1f77bcf86cd799439011";

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

test.describe("hydration — authenticated app", () => {
  for (const path of PROTECTED_ROUTES) {
    test(`direct load ${path}`, async ({ page }) => {
      const issues = attachHydrationWatchers(page);
      await visit(page, path);
      await assertNoHydrationIssues(issues, `load ${path}`);
    });
  }

  test("refresh protected routes", async ({ page }) => {
    const issues = attachHydrationWatchers(page);
    for (const path of PROTECTED_ROUTES) {
      await visit(page, path);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    await assertNoHydrationIssues(issues, "protected route refreshes");
  });

  test("client navigation across modules", async ({ page }) => {
    const issues = attachHydrationWatchers(page);
    await visit(page, "/dashboard");
    for (const label of ["Tasks", "Thoughts", "Plans", "Categories", "Dashboard"]) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    await assertNoHydrationIssues(issues, "client navigation");
  });

  test("theme toggle in app shell", async ({ page }) => {
    const issues = attachHydrationWatchers(page);
    await visit(page, "/dashboard");
    const toggle = page
      .getByRole("button", { name: /switch to (light|dark) mode/i })
      .first();
    await toggle.click();
    await toggle.click();
    await assertNoHydrationIssues(issues, "app theme toggles");
  });

  test("detail routes with sample ids", async ({ page }) => {
    const issues = attachHydrationWatchers(page);
    for (const path of [
      `/tasks/${SAMPLE_OBJECT_ID}`,
      `/thoughts/${SAMPLE_OBJECT_ID}`,
      `/plans/${SAMPLE_OBJECT_ID}`,
    ]) {
      await visit(page, path);
    }
    await assertNoHydrationIssues(issues, "detail routes");
  });

  test("logout returns to login without hydration errors", async ({ page }) => {
    const issues = attachHydrationWatchers(page);
    await visit(page, "/dashboard");
    await page
      .getByRole("button", { name: /^logout$/i })
      .first()
      .click();
    await page.waitForURL(/\/login/);
    await assertNoHydrationIssues(issues, "logout flow");
  });
});
