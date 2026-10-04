import type { SettingsUpdate } from "../../../src/shared/contracts.js";
import {
  isRecord,
  validateFiniteNumber,
  validateOptionalBoolean,
  validateOptionalString,
} from "./common.cjs";

function boundedInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum?: number,
): number {
  const parsed = validateFiniteNumber(value, label);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be an integer.`);
  }
  if (parsed < minimum || (maximum !== undefined && parsed > maximum)) {
    const range = maximum === undefined ? `at least ${minimum}` : `between ${minimum} and ${maximum}`;
    throw new Error(`${label} must be ${range}.`);
  }
  return parsed;
}

function boundedNumber(value: unknown, label: string, minimum: number): number {
  const parsed = validateFiniteNumber(value, label);
  if (parsed < minimum) {
    throw new Error(`${label} must be at least ${minimum}.`);
  }
  return parsed;
}

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
    update.maxConcurrentScrapes = boundedInteger(
      rawValue.maxConcurrentScrapes,
      "Max concurrent scrapes",
      1,
      10,
    );
  }
  if (rawValue.scrapeTimeoutMs !== undefined) {
    update.scrapeTimeoutMs = boundedNumber(
      rawValue.scrapeTimeoutMs,
      "Scrape timeout",
      1000,
    );
  }
  if (rawValue.retryCount !== undefined) {
    update.retryCount = boundedInteger(rawValue.retryCount, "Retry count", 0, 5);
  }
  if (rawValue.scrapeCooldownMinutes !== undefined) {
    update.scrapeCooldownMinutes = boundedInteger(
      rawValue.scrapeCooldownMinutes,
      "Scrape cooldown minutes",
      0,
    );
  }
  if (rawValue.circuitBreakerThreshold !== undefined) {
    update.circuitBreakerThreshold = boundedInteger(
      rawValue.circuitBreakerThreshold,
      "Circuit breaker threshold",
      1,
    );
  }
  if (rawValue.circuitBreakerCooldownMinutes !== undefined) {
    update.circuitBreakerCooldownMinutes = boundedInteger(
      rawValue.circuitBreakerCooldownMinutes,
      "Circuit breaker cooldown minutes",
      0,
    );
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
