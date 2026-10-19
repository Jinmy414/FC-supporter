const {defineConfig, devices} = require('@playwright/test');
module.exports = defineConfig({
  testDir: './browser-tests',
  outputDir: 'artifacts/browser',
  timeout: 30000,
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  reporter: [['list'], ['html', {outputFolder: 'artifacts/browser-report', open: 'never'}]],
  use: {baseURL:'http://127.0.0.1:4173', reducedMotion:'reduce', trace:'retain-on-failure', screenshot:'only-on-failure'},
  projects: [
    {name:'desktop', testMatch:'release.spec.cjs', use:{viewport:{width:1440,height:1000}}},
    {name:'narrow', testMatch:'release.spec.cjs', use:{viewport:{width:320,height:900}}},
    {name:'mobile', testMatch:'release.spec.cjs', use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
    {name:'firefox', testMatch:'release.spec.cjs', use:{browserName:'firefox',viewport:{width:1440,height:1000}}},
    {name:'webkit', testMatch:'release.spec.cjs', use:{browserName:'webkit',viewport:{width:1440,height:1000}}},
    {name:'webkit-mobile', testMatch:'release.spec.cjs', use:{...devices['iPhone 13'],browserName:'webkit'}},
    {name:'extension', testMatch:'extension.spec.cjs'}
  ],
  webServer: {command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory site',url:'http://127.0.0.1:4173',reuseExistingServer:false}
});
