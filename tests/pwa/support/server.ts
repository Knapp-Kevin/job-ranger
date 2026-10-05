import { createServer, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { buildSecurityHeaders } from "../../../src/pwa/security/policy";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".map": "application/json",
};

export interface PwaServer {
  url: string;
  setRoot(root: string): void;
  close(): Promise<void>;
}

/** Static server that mirrors the production hosting contract (dist-pwa/_headers). */
export async function startPwaServer(initialRoot: string): Promise<PwaServer> {
  let root = initialRoot;
  const headers = buildSecurityHeaders();
  const server: Server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      let relative = decodeURIComponent(url.pathname);
      if (relative.endsWith("/")) relative += "index.html";
      const filePath = path.join(root, path.normalize(relative).replace(/^(\.\.[/\\])+/, ""));
      if (!filePath.startsWith(root)) throw new Error("outside root");
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error("not a file");
      const body = await readFile(filePath);
      response.writeHead(200, {
        ...headers,
        "Content-Type": types[path.extname(filePath)] ?? "application/octet-stream",
        "Cache-Control": relative.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
      });
      response.end(body);
    } catch {
      response.writeHead(404, headers);
      response.end("not found");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server failed to bind");
  return {
    url: `http://127.0.0.1:${address.port}/`,
    setRoot(next) {
      root = next;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
