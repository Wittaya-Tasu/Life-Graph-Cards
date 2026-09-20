const { defineConfig } = require('playwright/test');
module.exports = defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs',
  timeout: 45000, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:9535', trace: 'retain-on-failure', screenshot: 'only-on-failure', reducedMotion: 'reduce',
    launchOptions: process.env.PROMYAN_CHROMIUM_PATH ? { executablePath: process.env.PROMYAN_CHROMIUM_PATH, args: ['--disable-dev-shm-usage'] } : {}
  },
  webServer: { command: 'node tests/server.cjs', url: 'http://127.0.0.1:9535', reuseExistingServer: false },
  projects: [
    { name: 'chromium-notebook', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } }
  ]
});
