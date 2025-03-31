// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Create multiple projects for parallel execution
 * @param {number} count Number of projects to create
 * @returns {Array} Array of project configs
 */
function createParallelProjects(count = 1) {
  const projects = [];
  for (let i = 0; i < count; i++) {
    projects.push({
      name: `chromium-${i + 1}`,
      use: { ...devices['Desktop Chrome'] },
    });
  }
  return projects;
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/nba.test.js',
  timeout: 120 * 1000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Allow multiple workers to run in parallel
  workers: parseInt(process.env.PROJECTS || '1', 10),
  reporter: process.env.CI ? 
    [['html', { outputFolder: 'playwright-report' }], ['json', { outputFile: 'playwright-report/results.json' }]] : 
    'dot',
  use: {
    actionTimeout: 30000,
    navigationTimeout: 30000,
    baseURL: 'https://www.nba.com',
    trace: 'on-first-retry',
    // Run tests in headless mode in CI environment or if HEADLESS=true
    headless: !!process.env.CI || process.env.HEADLESS === 'true',
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
}); 