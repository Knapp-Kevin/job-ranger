import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "../../src/shared/contracts.js";
import type { ApplicationLifecycleDesktopApi } from "../../src/shared/application-lifecycle.js";
import type { ApplicationMaterialsDesktopApi } from "../../src/shared/application-materials.js";
import type { EvidenceExtensionDesktopApi } from "../../src/shared/evidence-extensions.js";
import type { InterviewPrepDesktopApi } from "../../src/shared/interview-prep.js";
import type { ResumeDesktopApi } from "../../src/shared/resume-api.js";
import type { SourceDiscoveryDesktopApi } from "../../src/shared/source-discovery.js";

const desktopApi: DesktopApi & ResumeDesktopApi & EvidenceExtensionDesktopApi & SourceDiscoveryDesktopApi & ApplicationLifecycleDesktopApi & InterviewPrepDesktopApi & ApplicationMaterialsDesktopApi = {
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getPlatform: () => ipcRenderer.invoke("app:get-platform"),
  openExternal: (url: string) => ipcRenderer.invoke("app:open-external", url),
  showItemInFolder: (targetPath: string) =>
    ipcRenderer.invoke("app:show-item-in-folder", targetPath),
  system: {
    getStatus: () => ipcRenderer.invoke("system:get-status"),
  },
  companies: {
    list: () => ipcRenderer.invoke("companies:list"),
    create: (draft) => ipcRenderer.invoke("companies:create", draft),
    update: (id, update) => ipcRenderer.invoke("companies:update", id, update),
    delete: (id) => ipcRenderer.invoke("companies:delete", id),
    runScrape: (id) => ipcRenderer.invoke("companies:run-scrape", id),
  },
  discovery: {
    discover: (request) => ipcRenderer.invoke("discovery:discover", request),
  },
  jobs: {
    list: () => ipcRenderer.invoke("jobs:list"),
    markSeen: (id) => ipcRenderer.invoke("jobs:mark-seen", id),
    getEvidenceCoverage: (id) =>
      ipcRenderer.invoke("jobs:get-evidence-coverage", id),
  },
  filters: {
    list: () => ipcRenderer.invoke("filters:list"),
    create: (draft) => ipcRenderer.invoke("filters:create", draft),
    update: (id, update) => ipcRenderer.invoke("filters:update", id, update),
    delete: (id) => ipcRenderer.invoke("filters:delete", id),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (update) => ipcRenderer.invoke("settings:update", update),
  },
  scrapeRuns: {
    listRecent: (limit) => ipcRenderer.invoke("scrape-runs:list-recent", limit),
  },
  career: {
    getProfile: () => ipcRenderer.invoke("career:get-profile"),
    saveProfile: (profile) => ipcRenderer.invoke("career:save-profile", profile),
    listTargetTracks: () => ipcRenderer.invoke("career:list-target-tracks"),
    createTargetTrack: (input) =>
      ipcRenderer.invoke("career:create-target-track", input),
    updateTargetTrack: (id, input) =>
      ipcRenderer.invoke("career:update-target-track", id, input),
    deleteTargetTrack: (id) =>
      ipcRenderer.invoke("career:delete-target-track", id),
    migrateLegacy: (payload) => ipcRenderer.invoke("career:migrate-legacy", payload),
    selectResumeImport: () => ipcRenderer.invoke("career:select-resume-import"),
    importPastedText: (input) =>
      ipcRenderer.invoke("career:import-pasted-text", input),
    createUserEvidence: (input) =>
      ipcRenderer.invoke("career:create-user-evidence", input),
    listSourceArtifacts: () =>
      ipcRenderer.invoke("career:list-source-artifacts"),
    listEvidence: () => ipcRenderer.invoke("career:list-evidence"),
    reviewEvidence: (id, update) =>
      ipcRenderer.invoke("career:review-evidence", id, update),
    mergeEvidence: (sourceId, targetId) =>
      ipcRenderer.invoke("career:merge-evidence", sourceId, targetId),
  },
  careerEvidence: {
    listMetadata: () => ipcRenderer.invoke("career-evidence:list-metadata"),
    setReferences: (evidenceId, references) =>
      ipcRenderer.invoke("career-evidence:set-references", evidenceId, references),
    supersedeEvidence: (evidenceId, input) =>
      ipcRenderer.invoke("career-evidence:supersede", evidenceId, input),
  },
  applications: {
    list: () => ipcRenderer.invoke("applications:list"),
    track: (jobId) => ipcRenderer.invoke("applications:track", jobId),
    update: (id, update) => ipcRenderer.invoke("applications:update", id, update),
    delete: (id) => ipcRenderer.invoke("applications:delete", id),
  },
  applicationLifecycle: {
    get: (applicationId) => ipcRenderer.invoke("application-lifecycle:get", applicationId),
    createContact: (applicationId, input) =>
      ipcRenderer.invoke("application-lifecycle:create-contact", applicationId, input),
    updateContact: (contactId, input) =>
      ipcRenderer.invoke("application-lifecycle:update-contact", contactId, input),
    deleteContact: (contactId) =>
      ipcRenderer.invoke("application-lifecycle:delete-contact", contactId),
    createEvent: (applicationId, input) =>
      ipcRenderer.invoke("application-lifecycle:create-event", applicationId, input),
    updateEvent: (eventId, update) =>
      ipcRenderer.invoke("application-lifecycle:update-event", eventId, update),
    deleteEvent: (eventId) =>
      ipcRenderer.invoke("application-lifecycle:delete-event", eventId),
  },
  applicationMaterials: {
    list: (applicationId) =>
      ipcRenderer.invoke("application-materials:list", applicationId),
    createCoverLetter: (applicationId) =>
      ipcRenderer.invoke("application-materials:create-cover-letter", applicationId),
    delete: (projectionId) =>
      ipcRenderer.invoke("application-materials:delete", projectionId),
  },
  interviewPrep: {
    get: (applicationId) => ipcRenderer.invoke("interview-prep:get", applicationId),
  },
  resume: {
    list: () => ipcRenderer.invoke("resume:list"),
    create: (input) => ipcRenderer.invoke("resume:create", input),
    get: (id) => ipcRenderer.invoke("resume:get", id),
    updateStatement: (id, update) =>
      ipcRenderer.invoke("resume:update-statement", id, update),
    previewTailoring: (request) =>
      ipcRenderer.invoke("resume:preview-tailoring", request),
    applyTailoring: (request) =>
      ipcRenderer.invoke("resume:apply-tailoring", request),
    exportPdf: (request) => ipcRenderer.invoke("resume:export-pdf", request),
    compareVersions: (fromArtifactId, toArtifactId) =>
      ipcRenderer.invoke("resume:compare-versions", fromArtifactId, toArtifactId),
  },
};

contextBridge.exposeInMainWorld("electronAPI", desktopApi);
