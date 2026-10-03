/// <reference types="vite/client" />

import type { DesktopApi } from "./shared/contracts";
import type { ApplicationLifecycleDesktopApi } from "./shared/application-lifecycle";
import type { ApplicationMaterialsDesktopApi } from "./shared/application-materials";
import type { BackupDesktopApi } from "./shared/backup";
import type { CareerStoriesDesktopApi } from "./shared/career-stories";
import type { EvidenceExtensionDesktopApi } from "./shared/evidence-extensions";
import type { InterviewPrepDesktopApi } from "./shared/interview-prep";
import type { ResumeDesktopApi } from "./shared/resume-api";
import type { SourceDiscoveryDesktopApi } from "./shared/source-discovery";

declare global {
  interface Window {
    electronAPI: DesktopApi &
      ResumeDesktopApi &
      EvidenceExtensionDesktopApi &
      SourceDiscoveryDesktopApi &
      ApplicationLifecycleDesktopApi &
      InterviewPrepDesktopApi &
      CareerStoriesDesktopApi &
      ApplicationMaterialsDesktopApi &
      BackupDesktopApi;
  }
}

export {};
