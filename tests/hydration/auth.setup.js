import { expect, test as setup } from "@playwright/test";

const authFile = "tests/hydration/.auth/user.json";

const hydrationUsername = "hydration-user";
const hydrationPassword = "hydration-test-pass";

setup("authenticate for hydration suite", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(hydrationUsername);
  await page.getByLabel("Password").fill(hydrationPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
