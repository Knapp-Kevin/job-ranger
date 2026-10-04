import fs from "node:fs";

const file = "scripts/apply-source-trust-tranche.mjs";
let source = fs.readFileSync(file, "utf8");
const bad = 'function stableSnapshotId(jobId: string, contentHash: string): string {\\n  return \\`snapshot-\\${createHash("sha256").update(\\`${jobId}\\\\n\\${contentHash}\\`).digest("hex").slice(0, 24)}\\`;\\n}';
const good = 'function stableSnapshotId(jobId: string, contentHash: string): string {\\n  return "snapshot-" + createHash("sha256").update(jobId + "\\\\n" + contentHash).digest("hex").slice(0, 24);\\n}';
if (!source.includes(good)) {
  if (!source.includes(bad)) throw new Error("Expected generator fragment not found");
  source = source.replace(bad, good);
  fs.writeFileSync(file, source);
}
console.log("Source-trust generator escaping repaired.");
