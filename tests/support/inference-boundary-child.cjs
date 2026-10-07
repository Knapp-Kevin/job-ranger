// Child process for the runtime import-boundary check. It loads every
// Node-loadable deterministic module and reports any inference module that
// ended up in require.cache. main.cjs and preload.cjs need Electron, and
// package-smoke-cli.cjs is a CLI that runs on load; the static
// scan in inference-baseline.test.cjs covers them.
const fs = require("node:fs");
const path = require("node:path");

const runtimeRoot = path.resolve(__dirname, "..", "..", "electron-runtime");
const SKIP = new Set(["main.cjs", "preload.cjs", "package-smoke-cli.cjs"]);
const loaded = [];
const failures = [];

function deterministicModules() {
  const electronDir = path.join(runtimeRoot, "electron", "src");
  const sharedDir = path.join(runtimeRoot, "src", "shared");
  const electron = fs.readdirSync(electronDir).filter((name) => name.endsWith(".cjs") && !SKIP.has(name)).map((name) => path.join(electronDir, name));
  const shared = fs.readdirSync(sharedDir).filter((name) => name.endsWith(".js")).map((name) => path.join(sharedDir, name));
  return [...electron, ...shared];
}

for (const file of deterministicModules()) {
  try {
    require(file);
    loaded.push(path.basename(file));
  } catch (error) {
    failures.push(`${path.basename(file)}: ${error.message.split("\n")[0]}`);
  }
}

const inferenceLoaded = Object.keys(require.cache).filter((key) => key.split(path.sep).includes("inference"));
process.stdout.write(JSON.stringify({ loaded, failures, inferenceLoaded }));
