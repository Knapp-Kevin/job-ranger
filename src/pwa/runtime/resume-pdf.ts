/**
 * Deterministic, text-based ATS resume PDF writer for the Job Ranger web
 * runtime (pdf-lib, standard Helvetica, no embedded scripts or images).
 *
 * Input is the same prepared, Truth-Gate-approved projection the Electron
 * runtime renders through Chromium: identical contact snapshot, section order,
 * statement order, and statement text. Only typography differs. The shared
 * Parseability Gate re-parses the produced bytes before an artifact is
 * accepted, exactly as in Electron.
 *
 * Only erasable TypeScript syntax is used so Node tests can load this file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ResumePdfProjection {
  id: string;
  pageFormat: "letter" | "a4";
  templateId: "ats-standard-v1" | "ats-compact-v1";
  sections: string[];
  updatedAt: string;
  contact: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    links: string[];
  };
}

export interface ResumePdfStatement {
  section: string;
  order: number;
  text: string;
}

export class ResumePdfEncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumePdfEncodingError";
  }
}

const POINTS_PER_INCH = 72;

function templateMetrics(templateId: ResumePdfProjection["templateId"]) {
  const compact = templateId === "ats-compact-v1";
  return {
    margin: (compact ? 0.42 : 0.55) * POINTS_PER_INCH,
    body: compact ? 9.5 : 10.5,
    lineHeight: compact ? 1.28 : 1.38,
    name: compact ? 19 : 22,
    heading: compact ? 10.5 : 11.5,
    contact: 9,
    sectionGap: compact ? 9 : 13,
    itemGap: compact ? 2 : 4,
    bulletIndent: 13,
  };
}

function cleanText(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function assertEncodable(font: any, text: string, label: string): void {
  const supported: number[] = font.getCharacterSet();
  const set = new Set(supported);
  const unsupported = Array.from(new Set(Array.from(text).filter((char) => !set.has(char.codePointAt(0) ?? -1))));
  if (unsupported.length > 0) {
    throw new ResumePdfEncodingError(
      `The web resume renderer supports Latin-script text (Windows-1252). ${label} contains characters it cannot encode (${unsupported.slice(0, 8).join(" ")}). Edit the text, or export this resume from the Windows app.`,
    );
  }
}

function wrap(font: any, text: string, size: number, width: number): string[] {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const fits = (value: string) => font.widthOfTextAtSize(value, size) <= width;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (fits(word)) {
      current = word;
      continue;
    }
    let fragment = "";
    for (const char of word) {
      if (fits(fragment + char)) fragment += char;
      else {
        lines.push(fragment);
        fragment = char;
      }
    }
    current = fragment;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/**
 * @param pdfLib the `pdf-lib` module namespace.
 */
export async function renderResumePdfBytes(
  pdfLib: any,
  projection: ResumePdfProjection,
  statements: readonly ResumePdfStatement[],
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, PageSizes } = pdfLib;
  const metrics = templateMetrics(projection.templateId);
  const document = await PDFDocument.create({ updateMetadata: false });
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const [pageWidth, pageHeight] = projection.pageFormat === "a4" ? PageSizes.A4 : PageSizes.Letter;
  const contentWidth = pageWidth - metrics.margin * 2;
  const black = rgb(0.067, 0.067, 0.067);

  const fullName = cleanText(projection.contact.fullName);
  const contactItems = [
    projection.contact.email,
    projection.contact.phone,
    projection.contact.location,
    ...projection.contact.links,
  ]
    .map(cleanText)
    .filter(Boolean);
  assertEncodable(bold, fullName, "The name");
  for (const item of contactItems) assertEncodable(regular, item, "The contact line");

  const ordered = projection.sections
    .map((section) => ({
      section,
      items: statements
        .filter((statement) => statement.section === section)
        .sort((a, b) => a.order - b.order)
        .map((statement) => cleanText(statement.text))
        .filter(Boolean),
    }))
    .filter((group) => group.items.length > 0);
  for (const group of ordered) {
    assertEncodable(bold, group.section.toUpperCase(), `Section "${group.section}"`);
    for (const item of group.items) assertEncodable(regular, item, `The statement "${item.slice(0, 60)}"`);
  }

  let page = document.addPage([pageWidth, pageHeight]);
  let cursor = pageHeight - metrics.margin;
  const ensureSpace = (height: number) => {
    if (cursor - height < metrics.margin) {
      page = document.addPage([pageWidth, pageHeight]);
      cursor = pageHeight - metrics.margin;
    }
  };
  const drawLine = (text: string, x: number, size: number, font: any) => {
    const lineHeight = size * metrics.lineHeight;
    ensureSpace(lineHeight);
    cursor -= size;
    page.drawText(text, { x, y: cursor, size, font, color: black });
    cursor -= lineHeight - size;
  };
  const drawRule = (thickness: number) => {
    page.drawLine({
      start: { x: metrics.margin, y: cursor },
      end: { x: pageWidth - metrics.margin, y: cursor },
      thickness,
      color: rgb(0.35, 0.35, 0.35),
    });
  };

  for (const line of wrap(bold, fullName, metrics.name, contentWidth)) {
    drawLine(line, metrics.margin, metrics.name, bold);
  }
  if (contactItems.length > 0) {
    for (const line of wrap(regular, contactItems.join("  |  "), metrics.contact, contentWidth)) {
      drawLine(line, metrics.margin, metrics.contact, regular);
    }
  }
  cursor -= 4;
  drawRule(1.5);
  cursor -= metrics.sectionGap;

  for (const group of ordered) {
    ensureSpace(metrics.heading * 3);
    drawLine(group.section.toUpperCase(), metrics.margin, metrics.heading, bold);
    cursor += 2;
    drawRule(0.75);
    cursor -= 5;
    for (const item of group.items) {
      const lines = wrap(regular, item, metrics.body, contentWidth - metrics.bulletIndent);
      lines.forEach((line, index) => {
        if (index === 0) {
          const lineHeight = metrics.body * metrics.lineHeight;
          ensureSpace(lineHeight);
          page.drawText("•", {
            x: metrics.margin + 3,
            y: cursor - metrics.body,
            size: metrics.body,
            font: regular,
            color: black,
          });
        }
        drawLine(line, metrics.margin + metrics.bulletIndent, metrics.body, regular);
      });
      cursor -= metrics.itemGap;
    }
    cursor -= metrics.sectionGap;
  }

  const stamp = new Date(projection.updatedAt);
  const fixedDate = Number.isNaN(stamp.getTime()) ? new Date(0) : stamp;
  document.setTitle(`${fullName} - Resume`, { showInWindowTitleBar: false });
  document.setAuthor(fullName);
  document.setSubject("Resume");
  document.setCreator("Job Ranger");
  document.setProducer("Job Ranger web runtime (pdf-lib)");
  document.setCreationDate(fixedDate);
  document.setModificationDate(fixedDate);
  return document.save({ useObjectStreams: false });
}
