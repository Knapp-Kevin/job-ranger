import { ipcMain } from "electron";
import { EvidenceExtensionBackend } from "./evidence-extension-backend.cjs";
import { initializeApplicationLifecycleIpc } from "./application-lifecycle-ipc.cjs";
import { initializeCareerStoryIpc } from "./career-story-ipc.cjs";
import { initializeJsonResumeIpc } from "./json-resume-ipc.cjs";
import {
  validateEvidenceReferences,
  validateEvidenceSupersedeInput,
} from "./evidence-extension-validators.cjs";
import { validateCareerEntityId } from "./career-validators.cjs";

export async function initializeEvidenceExtensionIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): Promise<void> {
  const backend = new EvidenceExtensionBackend(options);
  await initializeApplicationLifecycleIpc(options);
  await initializeCareerStoryIpc(options);
  initializeJsonResumeIpc(options);

  ipcMain.handle("career-evidence:list-metadata", () => backend.listMetadata());
  ipcMain.handle(
    "career-evidence:set-references",
    (_event, evidenceId: string, references: unknown) =>
      backend.setReferences(
        validateCareerEntityId(evidenceId, "Evidence id"),
        validateEvidenceReferences(references),
      ),
  );
  ipcMain.handle(
    "career-evidence:supersede",
    (_event, evidenceId: string, input: unknown) =>
      backend.supersedeEvidence(
        validateCareerEntityId(evidenceId, "Evidence id"),
        validateEvidenceSupersedeInput(input),
      ),
  );
}
