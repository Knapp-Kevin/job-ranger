/**
 * Web runtime adapter replacing electron/src/resume-renderer.cts.
 * Renders the prepared, Truth-Gate-approved projection with the deterministic
 * pdf-lib writer and stores it at the same managed temporary path; the shared
 * ResumeService then runs the Parseability Gate on those exact bytes.
 */
import * as pdfLib from "pdf-lib";
import type { PreparedResumeRender } from "../../../electron/src/resume-service.cjs";
import { promises as fs } from "./node-fs";
import { renderResumePdfBytes } from "../runtime/resume-pdf";

export const RESUME_RENDERER_ID = "web-pdf-lib-ats-text";

export async function renderResumePdf(prepared: PreparedResumeRender): Promise<void> {
  const bytes = await renderResumePdfBytes(pdfLib, prepared.projection, prepared.statements);
  await fs.writeFile(prepared.temporaryPath, bytes);
}
