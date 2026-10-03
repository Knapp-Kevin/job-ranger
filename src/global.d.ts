/// <reference types="vite/client" />

import type { DesktopApi } from "./shared/contracts";
import type { ApplicationLifecycleDesktopApi } from "./shared/application-lifecycle";
import type { EvidenceExtensionDesktopApi } from "./shared/evidence-extensions";
import type { ResumeDesktopApi } from "./shared/resume-api";
import type { SourceDiscoveryDesktopApi } from "./shared/source-discovery";

declare global {
  interface Window {
    electronAPI: DesktopApi &
      ResumeDesktopApi &
      EvidenceExtensionDesktopApi &
      SourceDiscoveryDesktopApi &
      ApplicationLifecycleDesktopApi;
  }
}

export {};
