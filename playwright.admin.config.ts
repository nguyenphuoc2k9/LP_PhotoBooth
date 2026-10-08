import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
process.env.STILLROOM_TEST_SETUP_TOKEN ||= randomBytes(24).toString('hex');
process.env.STILLROOM_TEST_DATA ||= '.data-test-admin-'+Date.now();
export default defineConfig({
  testDir:'./tests',testMatch:'admin.spec.ts',timeout:120000,workers:1,
  outputDir:'test-results-admin',
  use:{baseURL:'http://127.0.0.1:3001',channel:'msedge',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run start -- --port 3001',url:'http://127.0.0.1:3001/api/admin/session/',reuseExistingServer:false,timeout:60000,
    env:{PHOTOBOOTH_DATA_DIR:process.env.STILLROOM_TEST_DATA,ADMIN_SETUP_TOKEN:process.env.STILLROOM_TEST_SETUP_TOKEN,APP_ORIGIN:''}}
});

