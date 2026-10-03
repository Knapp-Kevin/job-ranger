import type { DesktopApi } from "../shared/contracts";
import type { ApplicationLifecycleDesktopApi } from "../shared/application-lifecycle";
import type { EvidenceExtensionDesktopApi } from "../shared/evidence-extensions";
import type { ResumeDesktopApi } from "../shared/resume-api";
import type { SourceDiscoveryDesktopApi } from "../shared/source-discovery";

export type JobRangerDesktopApi = DesktopApi &
  ResumeDesktopApi &
  EvidenceExtensionDesktopApi &
  SourceDiscoveryDesktopApi &
  ApplicationLifecycleDesktopApi;

export class DesktopApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DesktopApiError";
  }
}

export function hasDesktopApi(): boolean {
  return typeof window !== "undefined" && typeof window.electronAPI !== "undefined";
}

export function getDesktopApi(): JobRangerDesktopApi {
  if (!hasDesktopApi()) {
    throw new DesktopApiError(
      "Job Ranger requires the Electron desktop shell. Use `npm run electron:dev` for local development.",
    );
  }

  return window.electronAPI;
}
