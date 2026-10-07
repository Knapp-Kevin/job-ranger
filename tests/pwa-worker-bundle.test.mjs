// Built-artifact invariant for the web runtime worker: the IPC handler
// registry in src/pwa/adapters/electron-worker.ts must be bundled exactly once.
// Two copies split registration from dispatch, and every call fails with
// "No handler registered" (seen on Windows when module ids diverged).
// Run after `npm run build:pwa`.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "dist-pwa", "assets");
const REGISTRY_MARKER = "Attempted to register a second handler";

assert.ok(existsSync(assets), `${assets} not found; run npm run build:pwa first`);
const workers = readdirSync(assets).filter((name) => /^worker-main-.*\.js$/.test(name));
assert.equal(workers.length, 1, `expected one worker-main bundle, found: ${workers.join(", ") || "none"}`);

const bundle = readFileSync(path.join(assets, workers[0]), "utf8");
const copies = bundle.split(REGISTRY_MARKER).length - 1;
assert.equal(copies, 1, `electron-worker adapter is bundled ${copies} times in ${workers[0]}; expected exactly 1`);

console.log(`pwa worker bundle test passed (${workers[0]})`);
