/**
 * Browser runtime adapter for `node:dns/promises`.
 *
 * Browsers expose no DNS API, so connection-level DNS pinning (the Electron
 * acquisition boundary) is impossible here. The web runtime relies instead on
 * the browser network boundary: an explicit CSP `connect-src` allowlist of
 * provider API origins (enforced on every redirect hop), credential-less CORS
 * requests, mixed-content blocking, and Private Network Access protections.
 * See docs/design/PWA_RUNTIME.md.
 */
export async function lookup(): Promise<never> {
  throw new Error(
    "DNS resolution is not available in the web runtime; acquisition uses the browser network policy instead.",
  );
}

export default { lookup };
