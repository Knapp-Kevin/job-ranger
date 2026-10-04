import type { SettingsUpdate } from "../../../src/shared/contracts.js";
import {
  isRecord,
  validateIntegerInRange,
  validateOptionalBoolean,
  validateOptionalString,
} from "./common.cjs";

const MAX_TIMER_MS = 2_147_483_647;

export function validateSettingsUpdate(rawValue: unknown): SettingsUpdate {
  if (!isRecord(rawValue)) {
    throw new Error("Settings payload must be an object.");
  }

  const update: SettingsUpdate = {};
  const userAgent = validateOptionalString(rawValue.userAgent, "User agent");
  if (userAgent !== undefined) {
    if (!userAgent) {
      throw new Error("User agent cannot be empty.");
    }
    update.userAgent = userAgent;
  }
  if (rawValue.maxConcurrentScrapes !== undefined) {
    update.maxConcurrentScrapes = validateIntegerInRange(
      rawValue.maxConcurrentScrapes,
      "Max concurrent scrapes",
      1,
      10,
    );
  }
  if (rawValue.scrapeTimeoutMs !== undefined) {
    update.scrapeTimeoutMs = validateIntegerInRange(
      rawValue.scrapeTimeoutMs,
      "Scrape timeout",
      1_000,
      MAX_TIMER_MS,
    );
  }
  if (rawValue.retryCount !== undefined) {
    update.retryCount = validateIntegerInRange(rawValue.retryCount, "Retry count", 0, 5);
  }
  if (rawValue.notificationsEnabled !== undefined) {
    update.notificationsEnabled = validateOptionalBoolean(
      rawValue.notificationsEnabled,
      "Notifications enabled",
    );
  }
  if (rawValue.notifyOnNewJobs !== undefined) {
    update.notifyOnNewJobs = validateOptionalBoolean(
      rawValue.notifyOnNewJobs,
      "Notify on new jobs",
    );
  }
  if (rawValue.notifyOnMatchedJobs !== undefined) {
    update.notifyOnMatchedJobs = validateOptionalBoolean(
      rawValue.notifyOnMatchedJobs,
      "Notify on matched jobs",
    );
  }
  if (rawValue.minimizeToTray !== undefined) {
    update.minimizeToTray = validateOptionalBoolean(
      rawValue.minimizeToTray,
      "Minimize to tray",
    );
  }
  return update;
}
