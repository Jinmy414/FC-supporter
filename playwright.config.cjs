const {defineConfig, devices} = require('@playwright/test');
module.exports = defineConfig({
  testDir: './browser-tests',
  outputDir: 'artifacts/browser',
  timeout: 30000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', {outputFolder: 'artifacts/browser-report', open: 'never'}]],
  use: {baseURL:'http://127.0.0.1:4173', reducedMotion:'reduce', trace:'retain-on-failure', screenshot:'only-on-failure'},
  projects: [
    {name:'desktop', use:{viewport:{width:1440,height:1000}}},
    {name:'narrow', use:{viewport:{width:320,height:900}}},
    {name:'mobile', use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}
  ],
  webServer: {command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory site',url:'http://127.0.0.1:4173',reuseExistingServer:false}
});
