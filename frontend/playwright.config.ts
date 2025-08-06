import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Look for test files in the "tests/e2e" directory, relative to this configuration file.
  testDir: './src/tests/e2e',

  // Only run files with the .pw.ts extension.
  testMatch: '**/*.pw.ts',

  // General configuration for all projects.
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: 'http://frontend-dev:3000',

    // Collect trace when retrying the failed test.
    trace: 'on-first-retry',
  },

  // Configure projects for major browsers.
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: process.env.CI ? 'dot' : 'list',

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: './traces',
});
