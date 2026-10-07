// Web runtime adapter plugin: target selection must be host-path-agnostic
// (driven here with path.win32 and path.posix on any CI host), and every
// adapter target must reach the bundler through its own resolver so one file
// never gets two module ids (the Windows "No handler registered" defect).
import assert from "node:assert/strict";
import path from "node:path";
import { NODE_BUILTIN_ADAPTERS, SHARED_CORE_ADAPTERS } from "../src/pwa/adapter-map.ts";
import { createRuntimeAdapterPlugin, selectRuntimeAdapterTarget } from "../src/pwa/build/runtime-adapter-plugin.ts";

function environment(pathApi, root, exists = () => true) {
  return { root, pathApi, exists, nodeBuiltinAdapters: NODE_BUILTIN_ADAPTERS, sharedCoreAdapters: SHARED_CORE_ADAPTERS };
}

function checkSelection(pathApi, root, importerRoot) {
  const env = environment(pathApi, root);
  const adapter = (name) => pathApi.join(root, "src", "pwa", "adapters", name);
  const sharedImporter = `${importerRoot}/electron/src/backend.cts`;

  assert.equal(selectRuntimeAdapterTarget("electron", `${importerRoot}/src/pwa/runtime/worker-main.ts`, "worker", env), adapter("electron-worker.ts"));
  assert.equal(selectRuntimeAdapterTarget("electron", `${importerRoot}/src/pwa/main.tsx`, "page", env), adapter("electron-page.ts"));
  assert.equal(selectRuntimeAdapterTarget("fs", sharedImporter, "worker", env), adapter("node-fs.ts"));
  assert.equal(selectRuntimeAdapterTarget("fs", `${importerRoot}/src/App.tsx`, "page", env), null);
  assert.equal(selectRuntimeAdapterTarget("node:crypto", `${importerRoot}/src/App.tsx`, "page", env), adapter("node-crypto.ts"));

  const unmapped = selectRuntimeAdapterTarget("node:os", sharedImporter, "worker", env);
  assert.ok(unmapped && typeof unmapped === "object" && unmapped.error.includes(sharedImporter), "unmapped node: builtin names its importer");

  assert.equal(selectRuntimeAdapterTarget("./sqlite.cjs", sharedImporter, "worker", env), adapter("sqlite.ts"));
  assert.equal(
    selectRuntimeAdapterTarget("./backend-util.cjs", sharedImporter, "worker", env),
    pathApi.join(root, "electron", "src", "backend-util.cts"),
  );
  assert.equal(selectRuntimeAdapterTarget("./sqlite.cjs", sharedImporter, "worker", environment(pathApi, root, () => false)), null);
  assert.equal(selectRuntimeAdapterTarget("react", sharedImporter, "worker", env), null);
}

// Vite hands importers over with forward slashes on every host.
checkSelection(path.win32, "C:\\repo", "C:/repo");
checkSelection(path.posix, "/repo", "/repo");

function fakeContext(resolved) {
  const calls = { resolve: [], error: [] };
  const context = {
    async resolve(...args) {
      calls.resolve.push(args);
      return resolved;
    },
    error(message) {
      calls.error.push(message);
      throw new Error(message);
    },
  };
  return { calls, context };
}

const pluginEnv = environment(path.win32, "C:\\repo");
const workerImporter = "C:/repo/src/pwa/runtime/worker-main.ts";
const plugin = createRuntimeAdapterPlugin("worker", pluginEnv);
assert.equal(plugin.enforce, "pre");

{
  const { calls, context } = fakeContext({ id: "RESOLVED" });
  const result = await plugin.resolveId.call(context, "electron", workerImporter, {});
  assert.deepEqual(result, { id: "RESOLVED" }, "returns the bundler's id, not a hand-built path");
  assert.deepEqual(calls.resolve, [["C:\\repo\\src\\pwa\\adapters\\electron-worker.ts", workerImporter, { skipSelf: true }]]);
}

{
  const { calls, context } = fakeContext(null);
  await assert.rejects(() => plugin.resolveId.call(context, "electron", workerImporter, {}), /electron-worker\.ts/);
  assert.equal(calls.error.length, 1, "an adapter the bundler cannot resolve fails the build");
}

{
  const { calls, context } = fakeContext({ id: "unused" });
  await assert.rejects(() => plugin.resolveId.call(context, "node:os", workerImporter, {}), /node:os/);
  assert.equal(calls.resolve.length, 0);
}

{
  const { calls, context } = fakeContext({ id: "unused" });
  assert.equal(await plugin.resolveId.call(context, "react", workerImporter, {}), null);
  assert.equal(calls.resolve.length, 0);
}

console.log("pwa runtime adapter plugin tests passed");
