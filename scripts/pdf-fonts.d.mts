import type { PdfFontEntry } from "../src/pwa/runtime/resume-pdf";

export interface PdfFontLicense {
  family: string;
  file: string;
  license: string;
  source: string;
}

export interface BuiltPdfFontManifest {
  schemaVersion: 1;
  cacheKey: string;
  families: string[];
  licenses: PdfFontLicense[];
  fonts: PdfFontEntry[];
}

export declare const PDF_FONT_FAMILIES: ReadonlyArray<Record<string, unknown>>;
export declare function buildPdfFonts(outDir?: string): Promise<{ directory: string; manifest: BuiltPdfFontManifest }>;
export declare function pdfFontFiles(directory: string): string[];
