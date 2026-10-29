import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const authFile = "tests/hydration/.auth/user.json";

const hydrationUsername = "hydration-user";
const hydrationPasswordHash =
  "$2b$12$nbYsZnCEkMLR/9K2MZwYaeLOAq9Aq/UzAkHZejVUmOMGVRh2Ximb2";
const hydrationPassword = "hydration-test-pass";

const serverEnv = {
  ...process.env,
  NODE_ENV: "production",
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ptp-hydration-test",
  AUTH_SECRET: process.env.AUTH_SECRET || "hydration-test-auth-secret-32chars-min",
  APP_USERNAME: hydrationUsername,
  APP_PASSWORD_HASH: hydrationPasswordHash,
  HYDRATION_TEST_PASSWORD: hydrationPassword,
};

export default defineConfig({
  testDir: "tests/hydration",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "off",
  },
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: serverEnv,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.js/,
    },
    {
      name: "public",
      testMatch: /public-hydration\.spec\.js/,
    },
    {
      name: "authenticated",
      testMatch: /authenticated-hydration\.spec\.js/,
      dependencies: ["setup"],
      use: {
        storageState: authFile,
      },
    },
  ],
});
