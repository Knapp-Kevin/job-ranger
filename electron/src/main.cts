import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import { JobScoutBackend } from "./backend.cjs";
import { CareerBackend } from "./career-backend.cjs";
import { RequirementBackend } from "./requirement-backend.cjs";
import { initializeResumeIpc } from "./resume-ipc.cjs";
import { initializeEvidenceExtensionIpc } from "./evidence-extension-ipc.cjs";
import { initializeBackupIpc } from "./backup-ipc.cjs";
import { applyPendingRestore } from "./backup-service.cjs";
import { publicJobFeedDiscoveryProvider } from "./source-discovery-provider.cjs";
import { validateSourceDiscoveryRequest } from "./source-discovery-validator.cjs";
import { assertManagedArtifactPath } from "./managed-path-policy.cjs";
import {
  validateExternalUrl,
  validateId,
  validateIntegerInRange,
  validateCompanyDraft,
  validateCompanyUpdate,
  validateFilterDraft,
  validateFilterUpdate,
  validateSettingsUpdate,
} from "./validators.cjs";
import {
  validateApplicationUpdate,
  validateCareerEntityId,
  validateCareerProfile,
  validateEvidenceReviewUpdate,
  validateLegacyCareerMigration,
  validatePastedResumeInput,
  validateUserAuthoredEvidenceInput,
} from "./career-validators.cjs";
import { validateCareerTargetTrackInput } from "./target-track-validator.cjs";
import { loadPageHtmlInHiddenWindow } from "./browser-loader.cjs";
import { createTray, shouldMinimizeToTray } from "./tray-notifications.cjs";
import { createPinnedFetch } from "./pinned-fetch.cjs";

const moduleDirectory = __dirname;
const processStartupFetch = globalThis.fetch;
const pinnedDiscoveryFetch = createPinnedFetch();

let mainWindow: BrowserWindow | null = null;
let helpWindow: BrowserWindow | null = null;
let backend: JobScoutBackend | null = null;
let careerBackend: CareerBackend | null = null;
let requirementBackend: RequirementBackend | null = null;
let isQuitting = false;

function discoveryFetchImpl(): typeof fetch {
  // Production uses the DNS-pinned transport. Electron E2E replaces the main
  // process global fetch after launch with deterministic fixture responses;
  // preserving that explicit test seam avoids sending tests to public feeds.
  return globalThis.fetch === processStartupFetch
    ? pinnedDiscoveryFetch
    : globalThis.fetch;
}

function appAssetPath(fileName: string): string {
  const root = app.getAppPath();
  return process.env.NODE_ENV === "development"
    ? path.join(root, "public", fileName)
    : path.join(root, "dist", fileName);
}

function builtPagePath(fileName: string): string {
  return path.join(app.getAppPath(), "dist", fileName);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f5f3ef",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(moduleDirectory, "preload.cjs"),
      webSecurity: true,
    },
    icon: appAssetPath("ICON.png"),
  });

  if (process.env.NODE_ENV === "development") {
    void mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(builtPagePath("index.html"));
  }

  mainWindow.on("close", (event) => {
    if (!isQuitting && shouldMinimizeToTray(currentSettings?.minimizeToTray ?? false)) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createHelpWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#f5f3ef",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(moduleDirectory, "preload.cjs"),
      webSecurity: true,
    },
    icon: appAssetPath("ICON.png"),
  });

  if (process.env.NODE_ENV === "development") {
    void window.loadURL("http://localhost:5173/help.html");
  } else {
    void window.loadFile(builtPagePath("help.html"));
  }

  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    if (helpWindow === window) helpWindow = null;
  });
  return window;
}

function openHelpWindow(): void {
  if (helpWindow && !helpWindow.isDestroyed()) {
    helpWindow.show();
    helpWindow.focus();
    return;
  }
  helpWindow = createHelpWindow();
}

let currentSettings: Awaited<ReturnType<JobScoutBackend["getSettings"]>> | null = null;

async function refreshCachedSettings(): Promise<void> {
  if (!backend) return;
  currentSettings = await backend.getSettings();
}

function configureApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Data Folder",
          click: () => {
            void shell.openPath(app.getPath("userData"));
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools", accelerator: "CmdOrCtrl+Shift+I" },
        { type: "separator" },
        { role: "resetZoom", accelerator: "CmdOrCtrl+0" },
        { role: "zoomIn", accelerator: "CmdOrCtrl+Plus" },
        { role: "zoomOut", accelerator: "CmdOrCtrl+-" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open Help",
          accelerator: "F1",
          click: () => openHelpWindow(),
        },
        { type: "separator" },
        {
          label: "Open Job Ranger Data Folder",
          click: () => {
            void shell.openPath(app.getPath("userData"));
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function requireBackend(): JobScoutBackend {
  if (!backend) {
    throw new Error("Job Ranger backend is not initialized");
  }
  return backend;
}

function requireCareerBackend(): CareerBackend {
  if (!careerBackend) {
    throw new Error("Job Ranger career backend is not initialized");
  }
  return careerBackend;
}

function requireRequirementBackend(): RequirementBackend {
  if (!requirementBackend) {
    throw new Error("Job Ranger requirement backend is not initialized");
  }
  return requirementBackend;
}

function registerIpcHandlers(): void {
  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("app:get-platform", () => process.platform);
  ipcMain.handle("app:open-external", async (_event, url: string) => {
    await shell.openExternal(validateExternalUrl(url));
  });
  ipcMain.handle("app:show-item-in-folder", async (_event, targetPath: unknown) => {
    const safePath = assertManagedArtifactPath(
      targetPath,
      requireCareerBackend().getArtifactDirectory(),
    );
    shell.showItemInFolder(safePath);
  });

  ipcMain.handle("system:get-status", () =>
    requireBackend().getSystemStatus(process.platform),
  );

  ipcMain.handle("companies:list", () => requireBackend().listCompanies());
  ipcMain.handle("companies:create", (_event, draft) =>
    requireBackend().createCompany(validateCompanyDraft(draft)),
  );
  ipcMain.handle("companies:update", (_event, id: string, update) =>
    requireBackend().updateCompany(
      validateId(id, "Company id"),
      validateCompanyUpdate(update),
    ),
  );
  ipcMain.handle("companies:delete", (_event, id: string) =>
    requireBackend().deleteCompany(validateId(id, "Company id")),
  );
  ipcMain.handle("companies:run-scrape", (_event, id: string) =>
    requireBackend().runCompanyScrape(validateId(id, "Company id")),
  );

  ipcMain.handle("discovery:discover", async (_event, request) =>
    publicJobFeedDiscoveryProvider.discover(validateSourceDiscoveryRequest(request), {
      fetchImpl: discoveryFetchImpl(),
      existingCompanies: await requireBackend().listCompanies(),
    }),
  );

  ipcMain.handle("jobs:list", () => requireBackend().listJobs());
  ipcMain.handle("jobs:mark-seen", (_event, id: string) =>
    requireBackend().markJobSeen(validateId(id, "Job id")),
  );
  ipcMain.handle("jobs:get-evidence-coverage", (_event, id: string) =>
    requireRequirementBackend().getJobEvidenceCoverage(validateId(id, "Job id")),
  );

  ipcMain.handle("filters:list", () => requireBackend().listFilters());
  ipcMain.handle("filters:create", (_event, draft) =>
    requireBackend().createFilter(validateFilterDraft(draft)),
  );
  ipcMain.handle("filters:update", (_event, id: string, update) =>
    requireBackend().updateFilter(
      validateId(id, "Filter id"),
      validateFilterUpdate(update),
    ),
  );
  ipcMain.handle("filters:delete", (_event, id: string) =>
    requireBackend().deleteFilter(validateId(id, "Filter id")),
  );

  ipcMain.handle("settings:get", () => requireBackend().getSettings());
  ipcMain.handle("settings:update", async (_event, update) => {
    const settings = await requireBackend().updateSettings(validateSettingsUpdate(update));
    currentSettings = settings;
    return settings;
  });

  ipcMain.handle("scrape-runs:list-recent", (_event, limit?: number) =>
    requireBackend().listRecentScrapeRuns(
      limit === undefined
        ? undefined
        : validateIntegerInRange(limit, "Scrape run limit", 1, 100),
    ),
  );

  ipcMain.handle("career:get-profile", () => requireCareerBackend().getProfile());
  ipcMain.handle("career:save-profile", (_event, profile) =>
    requireCareerBackend().saveProfile(validateCareerProfile(profile)),
  );
  ipcMain.handle("career:list-target-tracks", () =>
    requireCareerBackend().listTargetTracks(),
  );
  ipcMain.handle("career:create-target-track", (_event, input) =>
    requireCareerBackend().createTargetTrack(validateCareerTargetTrackInput(input)),
  );
  ipcMain.handle("career:update-target-track", (_event, id: string, input) =>
    requireCareerBackend().updateTargetTrack(
      validateCareerEntityId(id, "Target track id"),
      validateCareerTargetTrackInput(input),
    ),
  );
  ipcMain.handle("career:delete-target-track", (_event, id: string) =>
    requireCareerBackend().deleteTargetTrack(
      validateCareerEntityId(id, "Target track id"),
    ),
  );
  ipcMain.handle("career:migrate-legacy", (_event, payload) =>
    requireCareerBackend().migrateLegacy(validateLegacyCareerMigration(payload)),
  );
  ipcMain.handle("career:save-application", (_event, application) =>
    requireCareerBackend().saveApplication(validateApplicationUpdate(application)),
  );
  ipcMain.handle("career:list-applications", () => requireCareerBackend().listApplications());
  ipcMain.handle("career:list-evidence", () => requireCareerBackend().listEvidence());
  ipcMain.handle("career:list-evidence-review-items", () =>
    requireCareerBackend().listEvidenceReviewItems(),
  );
  ipcMain.handle("career:update-evidence-review", (_event, id: string, update) =>
    requireCareerBackend().updateEvidenceReviewItem(
      validateCareerEntityId(id, "Evidence review id"),
      validateEvidenceReviewUpdate(update),
    ),
  );
  ipcMain.handle("career:add-user-evidence", (_event, input) =>
    requireCareerBackend().addUserEvidence(validateUserAuthoredEvidenceInput(input)),
  );
  ipcMain.handle("career:import-resume-text", (_event, input) =>
    requireCareerBackend().importResumeText(validatePastedResumeInput(input)),
  );
}

async function initializeBackends(): Promise<void> {
  const dataDirectory = app.getPath("userData");
  backend = new JobScoutBackend({
    dataDirectory,
    browserPageLoader: loadPageHtmlInHiddenWindow,
  });
  await backend.initialize();

  careerBackend = new CareerBackend({
    databasePath: backend.getDatabasePath(),
    sqliteBinaryPath: backend.getSqliteBinaryPath(),
    artifactDirectory: path.join(dataDirectory, "artifacts"),
  });
  await careerBackend.initialize();

  requirementBackend = new RequirementBackend({
    databasePath: backend.getDatabasePath(),
    sqliteBinaryPath: backend.getSqliteBinaryPath(),
  });
}

app.whenReady().then(async () => {
  await applyPendingRestore(app.getPath("userData"));
  await initializeBackends();
  await refreshCachedSettings();
  initializeResumeIpc(ipcMain, requireCareerBackend());
  initializeEvidenceExtensionIpc(ipcMain, requireCareerBackend());
  initializeBackupIpc(ipcMain, requireBackend(), requireCareerBackend());
  registerIpcHandlers();
  configureApplicationMenu();
  createWindow();
  createTray({
    app,
    getMainWindow: () => mainWindow,
    createMainWindow: createWindow,
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
