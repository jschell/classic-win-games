import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:'**/*.spec.js',fullyParallel:true,
  retries:process.env.CI?1:0,workers:process.env.CI?2:undefined,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4173',hasTouch:true,screenshot:'only-on-failure',trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
  webServer:{command:'node tools/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI}
});
