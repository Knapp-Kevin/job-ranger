import path from "node:path";
import { createRequire } from "node:module";

const appArchive = process.argv[2];
if (!appArchive) {
  throw new Error("Usage: verify-packaged-anydoc.mjs <path-to-app.asar>");
}

const packageJsonPath = path.join(path.resolve(appArchive), "package.json");
const packagedRequire = createRequire(packageJsonPath);
const anydoc = packagedRequire("@firecrawl/anydoc");

if (typeof anydoc.toMarkdownBytes !== "function") {
  throw new Error("Packaged @firecrawl/anydoc does not expose toMarkdownBytes");
}

const rtf = Buffer.from(
  String.raw`{\rtf1\ansi\deff0 {\fonttbl {\f0 Arial;}}\f0\fs24 Job Ranger packaged parser proof\par Career evidence remains user-confirmed.}`,
  "utf8",
);

const startedAt = performance.now();
const markdown = await anydoc.toMarkdownBytes(rtf, "rtf");
const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;

if (!markdown.includes("Job Ranger packaged parser proof")) {
  throw new Error(`Packaged parser returned unexpected output: ${markdown}`);
}

if (!markdown.includes("Career evidence remains user-confirmed")) {
  throw new Error(`Packaged parser lost expected evidence text: ${markdown}`);
}

process.stdout.write(
  `${JSON.stringify({ pass: true, elapsedMs, outputBytes: Buffer.byteLength(markdown), appArchive: path.resolve(appArchive) })}\n`,
);
