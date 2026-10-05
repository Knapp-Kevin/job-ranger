/**
 * Build for the Job Ranger web/PWA runtime (output: dist-pwa/).
 *
 * The web runtime runs the *same* shared application core as Electron
 * (electron/src/*.cts: repositories, migrations, domain services, IPC channel
 * table, validators). Runtime-specific infrastructure is substituted at build
 * time by the adapter map below; nothing else is forked.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "./src/pwa/security/policy.ts";
import { NODE_BUILTIN_ADAPTERS, SHARED_CORE_ADAPTERS } from "./src/pwa/adapter-map.ts";

const root = path.dirname(fileURLToPath(import.meta.url));
const electronSource = path.join(root, "electron", "src");
const adapters = path.join(root, "src", "pwa", "adapters");
const outDir = path.join(root, "dist-pwa");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { version: string };

function gitCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const commit = gitCommit();
const buildId = process.env.JOB_RANGER_BUILD_ID?.trim() || `${packageJson.version}+${commit.slice(0, 12)}`;

function runtimeAdapterPlugin(target: "page" | "worker"): Plugin {
  return {
    name: `job-ranger-runtime-adapters:${target}`,
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (source === "electron") {
        return path.join(adapters, target === "worker" ? "electron-worker.ts" : "electron-page.ts");
      }
      const builtin = source.startsWith("node:") ? source.slice(5) : source;
      if (NODE_BUILTIN_ADAPTERS[builtin] && (source.startsWith("node:") || importer?.includes(`${path.sep}electron${path.sep}src${path.sep}`))) {
        return path.join(adapters, NODE_BUILTIN_ADAPTERS[builtin]);
      }
      if (source.startsWith("node:")) {
        this.error(`${source} has no web runtime adapter (imported by ${importer ?? "unknown"})`);
      }
      if (!importer || !source.startsWith(".") || !source.endsWith(".cjs")) return null;
      const candidate = path.resolve(path.dirname(importer), source.replace(/\.cjs$/, ".cts"));
      if (!existsSync(candidate)) return null;
      if (path.dirname(candidate) === electronSource && SHARED_CORE_ADAPTERS[path.basename(candidate)]) {
        return path.join(adapters, SHARED_CORE_ADAPTERS[path.basename(candidate)]);
      }
      void options;
      return candidate;
    },
  };
}

function listFiles(directory: string, base = directory): string[] {
  return readdirSync(directory).flatMap((name) => {
    const full = path.join(directory, name);
    return statSync(full).isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join("/")];
  });
}

function headersFile(): string {
  const headers = buildSecurityHeaders();
  const lines = ["/*", ...Object.entries(headers).map(([key, value]) => `  ${key}: ${value}`)];
  lines.push("", "/sw.js", "  Cache-Control: no-cache", "", "/index.html", "  Cache-Control: no-cache", "");
  lines.push("/assets/*", "  Cache-Control: public, max-age=31536000, immutable", "");
  return `${lines.join("\n")}\n`;
}

function shellManifestPlugin(): Plugin {
  return {
    name: "job-ranger-shell-manifest",
    apply: "build",
    transformIndexHtml(html) {
      return html
        .replace("%JOB_RANGER_CSP%", buildContentSecurityPolicy().replace(/; frame-ancestors 'none'/, ""))
        .replace("%JOB_RANGER_BUILD_ID%", buildId);
    },
    closeBundle() {
      const files = listFiles(outDir).filter(
        (file) => !file.endsWith(".map") && !["sw.js", "_headers", "build-info.json"].includes(file),
      );
      const assets = files.sort().map((file) => ({
        path: file,
        sha256: createHash("sha256").update(readFileSync(path.join(outDir, file))).digest("hex"),
      }));
      const template = readFileSync(path.join(root, "src", "pwa", "service-worker.template.js"), "utf8");
      writeFileSync(
        path.join(outDir, "sw.js"),
        template
          .replace("__JOB_RANGER_BUILD_ID__", buildId)
          .replace("__JOB_RANGER_PRECACHE__", JSON.stringify(assets, null, 2)),
      );
      writeFileSync(path.join(outDir, "_headers"), headersFile());
      writeFileSync(
        path.join(outDir, "build-info.json"),
        `${JSON.stringify(
          {
            schemaVersion: 1,
            product: "job-ranger-web",
            version: packageJson.version,
            buildId,
            commit,
            sourceRepository: process.env.GITHUB_REPOSITORY ?? "Knapp-Kevin/job-ranger",
            workflowRun: process.env.GITHUB_RUN_ID ?? null,
            contentSecurityPolicy: buildContentSecurityPolicy(),
            assets,
          },
          null,
          2,
        )}\n`,
      );
    },
  };
}

export default defineConfig({
  root: path.join(root, "web"),
  publicDir: path.join(root, "public"),
  base: "./",
  plugins: [runtimeAdapterPlugin("page"), react(), tailwindcss(), shellManifestPlugin()],
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
  define: {
    __JOB_RANGER_VERSION__: JSON.stringify(packageJson.version),
    __JOB_RANGER_BUILD_ID__: JSON.stringify(buildId),
  },
  worker: {
    format: "es",
    plugins: () => [runtimeAdapterPlugin("worker")],
  },
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  build: {
    outDir,
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 4096,
  },
  server: {
    fs: { allow: [root] },
    port: 5174,
    strictPort: true,
    headers: {
      ...buildSecurityHeaders(),
      // Vite's dev client needs inline/eval support; the production CSP is
      // enforced by the built index.html meta tag and the _headers file.
      "Content-Security-Policy": "",
    },
  },
  preview: {
    port: 4174,
    strictPort: true,
    headers: buildSecurityHeaders(),
  },
});
