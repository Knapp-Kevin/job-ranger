/**
 * Web runtime adapter for the `electron` module on the page side. It lets the
 * shared preload bridge (electron/src/preload.cts) build the exact same
 * renderer API object; calls travel to the runtime worker instead of
 * Electron's main process.
 */
import { requireWebRuntimeClient } from "../runtime/client";

export const ipcRenderer = {
  invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    return requireWebRuntimeClient().invoke(channel, ...args);
  },
};

export const contextBridge = {
  exposeInMainWorld(key: string, api: unknown): void {
    Object.defineProperty(window, key, {
      value: Object.freeze(api),
      writable: false,
      configurable: false,
      enumerable: false,
    });
  },
};

export default { ipcRenderer, contextBridge };
