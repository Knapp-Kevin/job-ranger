/**
 * The complete list of runtime adapters the web runtime substitutes for
 * runtime-specific shared-core modules and Node built-ins. Used by
 * vite.pwa.config.ts and verified by tests/runtime-adapter-contract.test.mjs.
 */
export const SHARED_CORE_ADAPTERS: Record<string, string> = {
  "sqlite.cts": "sqlite.ts",
  "resume-parser.cts": "resume-parser.ts",
  "resume-renderer.cts": "resume-renderer.ts",
  "pinned-fetch.cts": "pinned-fetch.ts",
};

export const NODE_BUILTIN_ADAPTERS: Record<string, string> = {
  fs: "node-fs.ts",
  path: "node-path.ts",
  crypto: "node-crypto.ts",
  net: "node-net.ts",
  "dns/promises": "node-dns-promises.ts",
};
