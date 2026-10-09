/**
 * Browser-local XLSX cell reader for LinkedIn's native analytics workbook.
 * Reads only required XLSX XML records; does not execute macros, formulas,
 * external relationships, embedded links or remote requests.
 */
import { unzipSync } from "fflate";
import type { WorkbookRows } from "../shared/linkedin-analytics";

const MAX_FILE = 4 * 1024 * 1024;
const MAX_XML = 8 * 1024 * 1024;
const MAX_TOTAL = 18 * 1024 * 1024;
const decoder = new TextDecoder("utf-8", { fatal: true });
function xml(bytes: Uint8Array, name: string): Document {
  const source = decoder.decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("Unsupported XML declaration in " + name + ".");
  const doc = new DOMParser().parseFromString(source, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Malformed XLSX XML in " + name + ".");
  return doc;
}
const descendants = (el: Document | Element, name: string): Element[] =>
  Array.from(el.getElementsByTagNameNS("*", name));
function requiredFile(entries: Record<string, Uint8Array>, path: string): Uint8Array {
  const entry = entries[path];
  if (!entry) throw new Error("LinkedIn XLSX is missing " + path + ".");
  return entry;
}
function column(ref: string): number {
  const match = /^([A-Z]{1,2})[1-9]\d*$/.exec(ref);
  if (!match) throw new Error("Unsupported XLSX cell reference.");
  const index = match[1].split("").reduce((value, ch) => value * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  if (index >= 64) throw new Error("XLSX exceeds column limit.");
  return index;
}
function readStrings(entries: Record<string, Uint8Array>): string[] {
  if (!entries["xl/sharedStrings.xml"]) return [];
  const sst = xml(entries["xl/sharedStrings.xml"], "sharedStrings.xml");
  const items = descendants(sst, "si");
  if (items.length > 100_000) throw new Error("Too many XLSX shared strings.");
  return items.map(el => descendants(el, "t").map(t => t.textContent ?? "").join(""));
}
function readSheet(bytes: Uint8Array, shared: string[], name: string): unknown[][] {
  const sheet = xml(bytes, name);
  const result: unknown[][] = [];
  const rows = descendants(sheet, "sheetData").flatMap(el => descendants(el, "row"));
  if (rows.length > 1000) throw new Error("LinkedIn XLSX exceeds row limit.");
  let nextRow = 0;
  for (const row of rows) {
    const rawIndex = row.getAttribute("r");
    const index = rawIndex ? Number(rawIndex) - 1 : nextRow;
    if (!Number.isSafeInteger(index) || index < nextRow || index >= 1000) {
      throw new Error("Invalid or duplicate XLSX row number.");
    }
    const cells: unknown[] = [];
    for (const entry of descendants(row, "c")) {
      if (descendants(entry, "f").length) throw new Error("Formula cells are not supported in LinkedIn analytics imports.");
      const ref = entry.getAttribute("r");
      if (!ref) throw new Error("XLSX cell address is missing.");
      const col = column(ref);
      if (cells[col] !== undefined) throw new Error("Duplicate XLSX cell address.");
      const type = entry.getAttribute("t") ?? "n";
      const raw = descendants(entry, "v")[0]?.textContent ?? "";
      let value: unknown = null;
      if (type === "s") {
        if (!/^\d+$/.test(raw) || Number(raw) >= shared.length) throw new Error("Invalid XLSX shared string index.");
        value = shared[Number(raw)];
      } else if (type === "inlineStr") {
        value = descendants(entry, "t").map(t => t.textContent ?? "").join("");
      } else if (type === "n" || !type) {
        if (raw) {
          const number = Number(raw);
          if (!Number.isFinite(number)) throw new Error("Invalid numeric XLSX cell.");
          value = number;
        }
      } else if (type === "str") {
        value = raw;
      } else if (type === "b") {
        value = raw === "1";
      } else if (type === "e") {
        throw new Error("Excel error cells are not accepted.");
      } else {
        throw new Error("Unsupported XLSX cell encoding: " + type + ".");
      }
      cells[col] = value;
    }
    result[index] = cells;
    nextRow = index + 1;
  }
  return Array.from({ length: result.length }, (_, i) => result[i] ?? []);
}
function targetPath(target: string): string {
  const path = target.startsWith("/") ? target.slice(1) :
    target.startsWith("xl/") ? target : "xl/" + target;
  if (!/^xl\/worksheets\/[a-zA-Z0-9_.-]+\.xml$/.test(path) || path.includes("..")) {
    throw new Error("External or unsupported XLSX worksheet relationship.");
  }
  return path;
}

/** Workbook bytes never leave the device. Strictly bounded and no external I/O. */
export function readLinkedInXlsx(buffer: ArrayBuffer): WorkbookRows {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 100 || buffer.byteLength > MAX_FILE) {
    throw new Error("Select a valid LinkedIn .xlsx export under 4 MB.");
  }
  let count = 0, expanded = 0;
  const entries = unzipSync(new Uint8Array(buffer), {
    filter: file => {
      count++;
      if (count > 150) throw new Error("XLSX contains too many ZIP entries.");
      const size = file.originalSize;
      if (!Number.isSafeInteger(size) || size > MAX_XML || size < 0) throw new Error("XLSX XML entry exceeds size limits.");
      const allow = /^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[a-zA-Z0-9_.-]+\.xml)$/.test(file.name);
      if (allow) {
        expanded += size;
        if (expanded > MAX_TOTAL) throw new Error("XLSX content exceeds extraction limit.");
      }
      return allow;
    },
  });
  const workbook = xml(requiredFile(entries, "xl/workbook.xml"), "workbook.xml");
  const relationships = xml(requiredFile(entries, "xl/_rels/workbook.xml.rels"), "workbook.xml.rels");
  const targets = new Map(descendants(relationships, "Relationship")
    .filter(rel => rel.getAttribute("TargetMode") !== "External")
    .map(rel => [rel.getAttribute("Id"), rel.getAttribute("Target")]));
  const names = descendants(workbook, "sheet");
  if (!names.length || names.length > 20) throw new Error("LinkedIn XLSX contains an unexpected sheet count.");
  const shared = readStrings(entries);
  const result: WorkbookRows = {};
  for (const item of names) {
    const name = item.getAttribute("name");
    const id = item.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ??
      item.getAttribute("r:id");
    if (!name || !id || name.length > 80 || Object.hasOwn(result, name)) throw new Error("Invalid XLSX worksheet identity.");
    const target = targets.get(id);
    if (!target) throw new Error("XLSX worksheet relationship is missing.");
    result[name] = readSheet(requiredFile(entries, targetPath(target)), shared, name);
  }
  return result;
}
