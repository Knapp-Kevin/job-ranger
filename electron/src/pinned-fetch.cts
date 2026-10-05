import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import { checkServerIdentity } from "node:tls";
import {
  resolveApprovedAcquisitionTarget,
  resolveHostnamePublicAddresses,
  type AcquisitionHostResolver,
} from "./acquisition-network-policy.cjs";

export type PinnedAddressRequestExecutor = (
  request: Request,
  address: string,
  originalHostname: string,
  body: Buffer | undefined,
) => Promise<Response>;

export interface PinnedFetchDependencies {
  resolveHost?: AcquisitionHostResolver;
  executeAddressRequest?: PinnedAddressRequestExecutor;
}

function responseHeaders(message: http.IncomingMessage): Headers {
  const headers = new Headers();
  for (let index = 0; index < message.rawHeaders.length; index += 2) {
    const name = message.rawHeaders[index];
    const value = message.rawHeaders[index + 1];
    if (name && value !== undefined) headers.append(name, value);
  }
  return headers;
}

function requestHeaders(request: Request, target: URL): Record<string, string> {
  const headers = new Headers(request.headers);
  if (!headers.has("host")) headers.set("host", target.host);
  if (!headers.has("accept-encoding")) headers.set("accept-encoding", "identity");
  return Object.fromEntries(headers.entries());
}

function portFor(target: URL): number | undefined {
  if (!target.port) return undefined;
  const port = Number.parseInt(target.port, 10);
  return Number.isFinite(port) ? port : undefined;
}

export const executePinnedAddressRequest: PinnedAddressRequestExecutor = async (
  request,
  address,
  originalHostname,
  body,
) => {
  const target = new URL(request.url);
  const commonOptions: http.RequestOptions = {
    hostname: address,
    port: portFor(target),
    path: `${target.pathname}${target.search}`,
    method: request.method,
    headers: requestHeaders(request, target),
    signal: request.signal,
  };

  return new Promise<Response>((resolve, reject) => {
    const onResponse = (message: http.IncomingMessage): void => {
      const status = message.statusCode ?? 502;
      const hasNoBody = request.method === "HEAD" || status === 204 || status === 205 || status === 304;
      const bodyStream = hasNoBody
        ? null
        : (Readable.toWeb(message) as ReadableStream<Uint8Array>);
      resolve(
        new Response(bodyStream, {
          status,
          statusText: message.statusMessage,
          headers: responseHeaders(message),
        }),
      );
    };

    const nodeRequest = target.protocol === "https:"
      ? https.request(
          {
            ...commonOptions,
            servername: isIP(originalHostname) ? undefined : originalHostname,
            checkServerIdentity: (_hostname, certificate) =>
              checkServerIdentity(originalHostname, certificate),
          },
          onResponse,
        )
      : http.request(commonOptions, onResponse);

    nodeRequest.once("error", reject);
    if (body && body.length > 0) nodeRequest.write(body);
    nodeRequest.end();
  });
};

async function materializeRequestBody(request: Request): Promise<Buffer | undefined> {
  if (request.method === "GET" || request.method === "HEAD" || request.body === null) {
    return undefined;
  }
  return Buffer.from(await request.arrayBuffer());
}

export function createPinnedFetch(
  dependencies: PinnedFetchDependencies = {},
): typeof fetch {
  const resolver = dependencies.resolveHost ?? resolveHostnamePublicAddresses;
  const execute = dependencies.executeAddressRequest ?? executePinnedAddressRequest;

  const pinnedFetch = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const request = new Request(input, init);
    if (request.redirect !== "manual") {
      throw new Error("Pinned acquisition transport requires redirect: 'manual' so every redirect is revalidated.");
    }

    const approved = await resolveApprovedAcquisitionTarget(request.url, resolver);
    const body = await materializeRequestBody(request);
    let lastError: Error | null = null;

    for (const address of approved.addresses) {
      try {
        return await execute(request, address, approved.hostname, body);
      } catch (error) {
        if (request.signal.aborted) throw error;
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error("No approved address could be reached for this source.");
  };

  return pinnedFetch as typeof fetch;
}
