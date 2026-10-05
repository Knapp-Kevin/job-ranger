/**
 * Browser runtime adapter for `node:path`. The web runtime uses a POSIX-style
 * virtual namespace rooted at the origin-private file system, so the POSIX
 * semantics are the complete contract.
 */
const sep = "/";
const delimiter = ":";

function normalizeSegments(segments: string[], absolute: boolean): string[] {
  const output: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (output.length > 0 && output[output.length - 1] !== "..") output.pop();
      else if (!absolute) output.push("..");
      continue;
    }
    output.push(segment);
  }
  return output;
}

function normalize(value: string): string {
  if (!value) return ".";
  const absolute = value.startsWith("/");
  const trailing = value.endsWith("/");
  const joined = normalizeSegments(value.split("/"), absolute).join("/");
  const result = (absolute ? "/" : "") + joined;
  if (!result) return absolute ? "/" : ".";
  return trailing && joined ? `${result}/` : result;
}

function isAbsolute(value: string): boolean {
  return value.startsWith("/");
}

function join(...parts: string[]): string {
  const filtered = parts.filter((part) => part.length > 0);
  if (filtered.length === 0) return ".";
  return normalize(filtered.join("/"));
}

function resolve(...parts: string[]): string {
  let resolved = "";
  for (let index = parts.length - 1; index >= 0 && !resolved.startsWith("/"); index -= 1) {
    const part = parts[index];
    if (!part) continue;
    resolved = resolved ? `${part}/${resolved}` : part;
  }
  if (!resolved.startsWith("/")) resolved = `/${resolved}`;
  const normalized = normalize(resolved);
  return normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function dirname(value: string): string {
  if (!value) return ".";
  const trimmed = value.length > 1 ? value.replace(/\/+$/, "") : value;
  const index = trimmed.lastIndexOf("/");
  if (index < 0) return ".";
  if (index === 0) return "/";
  return trimmed.slice(0, index);
}

function basename(value: string, extension?: string): string {
  const trimmed = value.length > 1 ? value.replace(/\/+$/, "") : value;
  const base = trimmed.slice(trimmed.lastIndexOf("/") + 1);
  return extension && base.endsWith(extension) && base !== extension
    ? base.slice(0, -extension.length)
    : base;
}

function extname(value: string): string {
  const base = basename(value);
  const index = base.lastIndexOf(".");
  return index <= 0 ? "" : base.slice(index);
}

function relative(from: string, to: string): string {
  const fromParts = resolve(from).split("/").filter(Boolean);
  const toParts = resolve(to).split("/").filter(Boolean);
  let common = 0;
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
    common += 1;
  }
  return [...Array(fromParts.length - common).fill(".."), ...toParts.slice(common)].join("/");
}

const posix = {
  sep,
  delimiter,
  normalize,
  isAbsolute,
  join,
  resolve,
  dirname,
  basename,
  extname,
  relative,
};

const path = { ...posix, posix };

export { sep, delimiter, normalize, isAbsolute, join, resolve, dirname, basename, extname, relative, posix };
export default path;
