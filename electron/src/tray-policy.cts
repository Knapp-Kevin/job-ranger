import type { Settings } from "../../src/shared/contracts.js";

export function shouldMinimizeToTray(settings: Settings | null, isQuitting: boolean): boolean {
  return Boolean(settings?.minimizeToTray && !isQuitting);
}
