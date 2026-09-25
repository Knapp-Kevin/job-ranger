const path = require('node:path');
const fs = require('node:fs');

async function main() {
  const [asarPathArg, fixtureArg] = process.argv.slice(2);
  if (!asarPathArg || !fixtureArg) {
    throw new Error('Usage: verify-packaged-anydoc.cjs <app.asar> <fixture>');
  }

  const asarPath = path.resolve(asarPathArg);
  const fixturePath = path.resolve(fixtureArg);
  if (!fs.existsSync(asarPath)) {
    throw new Error(`Packaged app archive not found: ${asarPath}`);
  }
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`);
  }

  const anydoc = require(path.join(asarPath, 'node_modules', '@firecrawl', 'anydoc'));
  if (typeof anydoc.toMarkdown !== 'function') {
    throw new Error('Packaged @firecrawl/anydoc does not expose toMarkdown');
  }

  const started = process.hrtime.bigint();
  const markdown = await anydoc.toMarkdown(fixturePath, { ocr: 'reject' });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  const required = ['Jordan Ellis', 'Operations Coordinator', 'Northstar Distribution'];
  const missing = required.filter((phrase) => !markdown.includes(phrase));
  if (missing.length > 0) {
    throw new Error(`Packaged parser output missing: ${missing.join(', ')}`);
  }

  console.log(JSON.stringify({
    pass: true,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    outputBytes: Buffer.byteLength(markdown),
    asarPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
