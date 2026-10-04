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
