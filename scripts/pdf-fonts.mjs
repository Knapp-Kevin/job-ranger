/**
 * Builds the font set used by the web runtime's resume PDF writer for text
 * outside Windows-1252 (Latin extended, Greek, Cyrillic, Vietnamese, Thai,
 * Chinese, Japanese, Korean).
 *
 * Source: pinned @fontsource Noto Sans packages (SIL Open Font License 1.1),
 * already split into unicode-range slices. pdf-lib's font subsetter cannot
 * subset WOFF/WOFF2 input, so each slice is decompressed to TrueType here
 * (wawoff2, build time only). Files are content-addressed; the manifest lists
 * every file with its SHA-256 and code-point ranges so the runtime loads and
 * verifies only the slices a resume actually needs.
 *
 * Usage: node scripts/pdf-fonts.mjs [outDir]   (default: build/pdf-fonts)
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_VERSION = 1;

/**
 * Families in fallback order. `subsets`: fontsource subset keys to include;
 * `numberedSlices` includes the CJK "[n]" slices. CJK ships regular weight
 * only: bold doubles a multi-megabyte download for headings that render
 * legibly in the regular weight.
 */
export const PDF_FONT_FAMILIES = [
  {
    family: "noto-sans",
    package: "@fontsource/noto-sans",
    subsets: ["latin", "latin-ext", "vietnamese", "greek", "greek-ext", "cyrillic", "cyrillic-ext"],
    weights: [400, 700],
  },
  { family: "noto-sans-thai", package: "@fontsource/noto-sans-thai", subsets: ["thai"], weights: [400, 700] },
  { family: "noto-sans-sc", package: "@fontsource/noto-sans-sc", numberedSlices: true, weights: [400] },
  { family: "noto-sans-tc", package: "@fontsource/noto-sans-tc", numberedSlices: true, weights: [400] },
  { family: "noto-sans-jp", package: "@fontsource/noto-sans-jp", numberedSlices: true, weights: [400] },
  { family: "noto-sans-kr", package: "@fontsource/noto-sans-kr", numberedSlices: true, weights: [400] },
];

function packageDirectory(name) {
  return path.join(root, "node_modules", ...name.split("/"));
}

function packageVersion(name) {
  return JSON.parse(readFileSync(path.join(packageDirectory(name), "package.json"), "utf8")).version;
}

function parseRanges(value) {
  return value
    .split(",")
    .map((part) => part.trim().replace(/^U\+/i, ""))
    .filter(Boolean)
    .map((part) => {
      const [start, end] = part.split("-").map((hex) => Number.parseInt(hex, 16));
      if (!Number.isInteger(start) || (end !== undefined && !Number.isInteger(end))) {
        throw new Error(`Invalid unicode-range entry: ${part}`);
      }
      return [start, end ?? start];
    })
    .sort((a, b) => a[0] - b[0]);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function cacheKey() {
  const hash = createHash("sha256");
  hash.update(JSON.stringify({ SCRIPT_VERSION, PDF_FONT_FAMILIES }));
  hash.update(packageVersion("wawoff2"));
  for (const family of PDF_FONT_FAMILIES) hash.update(`${family.package}@${packageVersion(family.package)}`);
  return hash.digest("hex").slice(0, 16);
}

/**
 * Builds (or reuses) the TrueType slices and manifest.
 * @returns {Promise<{ directory: string, manifest: object }>} `directory`
 *   holds `manifest.json`, the `.ttf` files, and the OFL license texts.
 */
export async function buildPdfFonts(outDir = path.join(root, "build", "pdf-fonts")) {
  const key = cacheKey();
  const manifestPath = path.join(outDir, "manifest.json");
  if (existsSync(manifestPath)) {
    const existing = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (existing.cacheKey === key) return { directory: outDir, manifest: existing };
  }

  const { default: wawoff2 } = await import("wawoff2");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const fonts = [];
  const licenses = [];
  for (const config of PDF_FONT_FAMILIES) {
    const directory = packageDirectory(config.package);
    const unicode = JSON.parse(readFileSync(path.join(directory, "unicode.json"), "utf8"));
    const subsets = Object.keys(unicode).filter((key) =>
      config.numberedSlices ? /^\[\d+\]$/.test(key) : config.subsets.includes(key),
    );
    if (!config.numberedSlices) {
      const missing = config.subsets.filter((subset) => !subsets.includes(subset));
      if (missing.length > 0) throw new Error(`${config.package} has no subsets ${missing.join(", ")}`);
    }
    subsets.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    for (const subset of subsets) {
      const slice = subset.replace(/^\[(\d+)\]$/, "$1");
      for (const weight of config.weights) {
        const source = path.join(directory, "files", `${config.family}-${slice}-${weight}-normal.woff2`);
        const bytes = Buffer.from(await wawoff2.decompress(readFileSync(source)));
        const digest = sha256(bytes);
        const file = `${config.family}-${slice}-${weight}.${digest.slice(0, 12)}.ttf`;
        writeFileSync(path.join(outDir, file), bytes);
        fonts.push({
          file,
          family: config.family,
          subset: slice,
          weight,
          sha256: digest,
          bytes: bytes.length,
          ranges: parseRanges(unicode[subset]),
        });
      }
    }
    const licenseFile = `LICENSE-${config.family}.txt`;
    writeFileSync(path.join(outDir, licenseFile), readFileSync(path.join(directory, "LICENSE")));
    licenses.push({ family: config.family, file: licenseFile, license: "OFL-1.1", source: `${config.package}@${packageVersion(config.package)}` });
  }

  const manifest = {
    schemaVersion: 1,
    cacheKey: key,
    families: PDF_FONT_FAMILIES.map((config) => config.family),
    licenses,
    fonts,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
  return { directory: outDir, manifest };
}

/** Files under `directory` that belong to the built font set. */
export function pdfFontFiles(directory) {
  return readdirSync(directory).filter((name) => name.endsWith(".ttf") || name.endsWith(".txt") || name === "manifest.json");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const started = Date.now();
  const { directory, manifest } = await buildPdfFonts(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  const total = manifest.fonts.reduce((sum, font) => sum + font.bytes, 0);
  console.log(`${manifest.fonts.length} PDF font slices (${(total / 1e6).toFixed(1)} MB) in ${directory} [${Date.now() - started} ms]`);
}
