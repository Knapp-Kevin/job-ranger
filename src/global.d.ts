/// <reference types="vite/client" />

import type { DesktopApi } from "./shared/contracts";
import type { EvidenceExtensionDesktopApi } from "./shared/evidence-extensions";
import type { ResumeDesktopApi } from "./shared/resume-api";

declare global {
  interface Window {
    electronAPI: DesktopApi & ResumeDesktopApi & EvidenceExtensionDesktopApi;
  }
}

export {};
