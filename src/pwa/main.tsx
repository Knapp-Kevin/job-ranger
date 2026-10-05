/**
 * Entry point of the Job Ranger web/PWA runtime.
 *
 * Boot order:
 * 1. start the runtime worker (local persistence + shared application core);
 * 2. install the renderer API through the *shared* Electron preload module,
 *    whose `electron` import is bound to the web IPC client;
 * 3. render the same React application the Electron runtime renders.
 */
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { WebRuntimeClient, setActiveWebRuntimeClient, type RuntimeBootState } from "./runtime/client";
import { registerJobRangerServiceWorker } from "./service-worker-registration";
import { PwaBootGate, PwaRuntimeBanners } from "./PwaShell";
import { trustedScriptUrl } from "./security/trusted-types";
import runtimeWorkerUrl from "./runtime/worker-main.ts?worker&url";

const worker = new Worker(trustedScriptUrl(runtimeWorkerUrl), {
  type: "module",
  name: "job-ranger-runtime",
});
const client = new WebRuntimeClient(worker);
setActiveWebRuntimeClient(client);

// The shared preload bridge exposes window.electronAPI exactly as in Electron.
await import("../../electron/src/preload.cjs");
const { App } = await import("../App");

void registerJobRangerServiceWorker();

function PwaRoot() {
  const [state, setState] = useState<RuntimeBootState>(client.bootState);
  useEffect(() => client.onStateChange(setState), []);
  return (
    <>
      <PwaBootGate state={state}>
        <App />
      </PwaBootGate>
      <PwaRuntimeBanners />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PwaRoot />
  </StrictMode>,
);
