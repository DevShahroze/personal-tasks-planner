import { expect, test as setup } from "@playwright/test";

const authFile = "tests/hydration/.auth/user.json";

const DEFAULT_TEST_USER = "hydration-user";
const DEFAULT_TEST_PASSWORD = "hydration-test-pass";

setup("authenticate for hydration suite", async ({ page }) => {
  const username = process.env.APP_USERNAME || DEFAULT_TEST_USER;
  const password = process.env.HYDRATION_TEST_PASSWORD || DEFAULT_TEST_PASSWORD;

  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
