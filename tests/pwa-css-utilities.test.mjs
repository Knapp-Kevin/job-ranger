// Built-artifact check for the web runtime stylesheet: Tailwind must generate
// the layout utilities the app shell uses. The web build's Vite root is web/
// while components live in src/; without an explicit source the stylesheet
// shipped with colors and fonts but no layout. Run after `npm run build:pwa`.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "dist-pwa", "assets");
// Used by src/components/Sidebar.tsx and src/pages/Dashboard.tsx.
const SHELL_UTILITIES = ["flex", "items-center", "gap-3", "rounded-2xl", "grid"];

assert.ok(existsSync(assets), `${assets} not found; run npm run build:pwa first`);
const sheets = readdirSync(assets).filter((name) => /^index-.*\.css$/.test(name));
assert.equal(sheets.length, 1, `expected one index stylesheet, found: ${sheets.join(", ") || "none"}`);

const css = readFileSync(path.join(assets, sheets[0]), "utf8");
const missing = SHELL_UTILITIES.filter((name) => !css.includes(`.${name}{`));
assert.deepEqual(missing, [], `web stylesheet ${sheets[0]} has no rule for: ${missing.join(", ")}`);

console.log(`pwa css utilities test passed (${sheets[0]})`);
