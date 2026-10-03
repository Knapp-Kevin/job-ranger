import type { SourceDiscoveryRequest } from "../../src/shared/source-discovery.js";

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Source discovery request must be an object");
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string, max = 200): string {
  if (typeof value !== "string") throw new Error(`${field} must be text`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  if (normalized.length > max) throw new Error(`${field} is too long`);
  return normalized;
}

function stringArray(value: unknown, field: string, maxItems: number): string[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be a list`);
  const normalized = Array.from(
    new Set(
      value.map((item) => requireString(item, field, 160)).filter(Boolean),
    ),
  );
  if (normalized.length > maxItems) throw new Error(`${field} has too many values`);
  return normalized;
}

export function validateSourceDiscoveryRequest(value: unknown): SourceDiscoveryRequest {
  const input = requireRecord(value);
  const roleTitles = stringArray(input.roleTitles, "Role titles", 12);
  if (roleTitles.length === 0) throw new Error("At least one target role is required for discovery");

  const locations = stringArray(input.locations ?? [], "Locations", 12);
  const rawLimit = input.limit;
  if (typeof rawLimit !== "number" || !Number.isInteger(rawLimit)) {
    throw new Error("Discovery result limit must be an integer");
  }
  const limit = Math.min(40, Math.max(1, rawLimit));

  return {
    targetTrackId: requireString(input.targetTrackId, "Target track id", 160),
    roleTitles,
    locations,
    limit,
  };
}
