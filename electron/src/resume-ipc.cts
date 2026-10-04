import { ipcMain, shell } from "electron";
import path from "node:path";
import type { ResumeExportRequest } from "../../src/shared/resume-contracts.js";
import { ResumeRepository } from "./resume-repository.cjs";
import { ResumeService } from "./resume-service.cjs";
import { ResumeTailoringService } from "./resume-tailoring-service.cjs";
import { renderResumePdf } from "./resume-renderer.cjs";
import { SqliteClient } from "./sqlite.cjs";
import {
  validateResumeCreateInput,
  validateResumeExportRequest,
  validateResumeStatementUpdate,
  validateResumeTailoringApplyRequest,
  validateResumeTailoringPreviewRequest,
} from "./resume-validators.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

interface ResumeIpcOptions {
  dataDirectory: string;
  databasePath: string;
  sqliteBinaryPath: string;
}

function assertInsideDirectory(root: string, target: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    if (relative === "") {
      throw new Error("Resume artifact path points to the artifact directory itself");
    }
    throw new Error("Resume artifact path is outside the managed resume directory");
  }
  return resolvedTarget;
}

export async function initializeResumeIpc(
  options: ResumeIpcOptions,
): Promise<ResumeService> {
  const service = new ResumeService(options);
  const tailoringService = new ResumeTailoringService(options);
  const repository = new ResumeRepository(
    new SqliteClient(options.databasePath, options.sqliteBinaryPath),
  );
  const resumeDirectory = path.join(options.dataDirectory, "artifacts", "resumes");
  await service.initialize();

  ipcMain.handle("resume:list", () => service.listProjections());
  ipcMain.handle("resume:create", (_event, input) =>
    service.createProjection(validateResumeCreateInput(input)),
  );
  ipcMain.handle("resume:get", (_event, id: string) =>
    service.getProjectionDetail(validateCareerEntityId(id, "Resume projection id")),
  );
  ipcMain.handle("resume:update-statement", (_event, id: string, update) =>
    service.updateStatement(
      validateCareerEntityId(id, "Resume statement id"),
      validateResumeStatementUpdate(update),
    ),
  );
  ipcMain.handle("resume:preview-tailoring", (_event, request) =>
    tailoringService.preview(validateResumeTailoringPreviewRequest(request)),
  );
  ipcMain.handle("resume:apply-tailoring", async (_event, request) => {
    const projection = await tailoringService.apply(
      validateResumeTailoringApplyRequest(request),
    );
    return service.getProjectionDetail(projection.id);
  });
  ipcMain.handle("resume:export-pdf", async (_event, rawRequest) => {
    const request: ResumeExportRequest = validateResumeExportRequest(rawRequest);
    const prepared = await service.prepareRender(request.projectionId);
    await renderResumePdf(
      prepared.html,
      prepared.projection.pageFormat,
      prepared.temporaryPath,
    );
    return service.finalizeRenderedPdf(prepared, request);
  });
  ipcMain.handle("resume:reveal-artifact", async (_event, rawArtifactId: string) => {
    const artifactId = validateCareerEntityId(rawArtifactId, "Resume artifact id");
    const artifact = await repository.getArtifact(artifactId);
    if (!artifact) {
      throw new Error(`Resume artifact ${artifactId} not found`);
    }
    const managedPath = assertInsideDirectory(resumeDirectory, artifact.managedPath);
    shell.showItemInFolder(managedPath);
  });
  ipcMain.handle(
    "resume:compare-versions",
    (_event, fromArtifactId: string, toArtifactId: string) =>
      service.compareArtifacts(
        validateCareerEntityId(fromArtifactId, "From resume artifact id"),
        validateCareerEntityId(toArtifactId, "To resume artifact id"),
      ),
  );

  return service;
}
