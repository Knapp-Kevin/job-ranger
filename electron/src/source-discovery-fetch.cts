import { validateAcquisitionUrlSyntax } from "./acquisition-network-policy.cjs";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

export async function fetchDiscoveryJson<T>(
  url: string,
  fetchImpl: typeof fetch,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    let currentUrl = validateAcquisitionUrlSyntax(url).toString();
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const response = await fetchImpl(currentUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Job Ranger Desktop/1.0 source discovery",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      if (!REDIRECT_STATUSES.has(response.status)) {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as T;
      }

      const location = response.headers.get("location");
      if (!location) throw new Error(`HTTP ${response.status} redirect without a location`);
      if (redirectCount === MAX_REDIRECTS) {
        throw new Error("Too many redirects while loading a discovery feed");
      }
      currentUrl = validateAcquisitionUrlSyntax(
        new URL(location, currentUrl).toString(),
      ).toString();
    }
  } finally {
    clearTimeout(timeout);
  }

  throw new Error("Too many redirects while loading a discovery feed");
}


const WWR_RSS_MAX_BYTES = 1_048_576;
const WWR_ALLOWED_HOSTS = new Set(["weworkremotely.com", "www.weworkremotely.com"]);

/** First-party, capped RSS acquisition. Redirects must remain on the WWR host. */
export async function fetchDiscoveryXml(url: string, fetchImpl: typeof fetch): Promise<string> {
  let current = validateAcquisitionUrlSyntax(url);
  const approved = (target: URL): void => {
    if (target.protocol !== "https:" || target.port || !WWR_ALLOWED_HOSTS.has(target.hostname) ||
        !target.pathname.endsWith(".rss")) {
      throw new Error("WWR redirect host or resource is not approved by the publisher policy");
    }
  };
  approved(current);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await fetchImpl(current.toString(), {
        headers: { Accept: "application/rss+xml, application/xml;q=0.9", "User-Agent": "Job Ranger Desktop/1.0 source discovery" },
        redirect: "manual",
        signal: controller.signal,
      });
      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirects === MAX_REDIRECTS) throw new Error("WWR RSS redirect limit exceeded");
        current = validateAcquisitionUrlSyntax(new URL(location, current).toString());
        approved(current);
        continue;
      }
      if (!response.ok) throw new Error("HTTP " + response.status);
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !/^(application\/rss\+xml|application\/xml|text\/xml)(?:;|$)/i.test(contentType)) {
        throw new Error("WWR RSS unexpected content type");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const xml = await response.text();
        if (Buffer.byteLength(xml, "utf8") > WWR_RSS_MAX_BYTES) throw new Error("WWR RSS feed too large");
        return xml;
      }
      let total = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          total += next.value.byteLength;
          if (total > WWR_RSS_MAX_BYTES) throw new Error("WWR RSS feed too large");
          chunks.push(next.value);
        }
      } finally {
        reader.releaseLock();
      }
      return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    }
    throw new Error("WWR RSS redirect limit exceeded");
  } finally {
    clearTimeout(timeout);
  }
}
