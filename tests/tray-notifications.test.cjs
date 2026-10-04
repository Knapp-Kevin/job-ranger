const assert = require("node:assert/strict");
const {
  shouldMinimizeToTray,
} = require("../electron-runtime/electron/src/tray-policy.cjs");

const baseSettings = {
  userAgent: "Test/1.0",
  maxConcurrentScrapes: 2,
  scrapeTimeoutMs: 20000,
  retryCount: 1,
  scrapeCooldownMinutes: 30,
  circuitBreakerThreshold: 3,
  circuitBreakerCooldownMinutes: 60,
  notificationsEnabled: true,
  notifyOnNewJobs: true,
  notifyOnMatchedJobs: true,
  minimizeToTray: true,
};

assert.equal(shouldMinimizeToTray(baseSettings, false), true);
assert.equal(shouldMinimizeToTray(baseSettings, true), false);
assert.equal(shouldMinimizeToTray({ ...baseSettings, minimizeToTray: false }, false), false);
assert.equal(shouldMinimizeToTray(null, false), false);
assert.equal(shouldMinimizeToTray(undefined, false), false);

console.log("Tray policy tests passed!");
