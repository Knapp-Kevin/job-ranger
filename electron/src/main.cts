import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import { JobScoutBackend } from "./backend.cjs";
import { CareerBackend } from "./career-backend.cjs";
import { RequirementBackend } from "./requirement-backend.cjs";
import { ResumeBackend } from "./resume-backend.cjs";
import {
  validateExternalUrl,
  validateId,
  validateFiniteNumber,
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
} from "./career-validators.cjs";
import {
  validateCreateResumeProjectionInput,
  validateReviseResumeProjectionInput,
} from "./resume-validators.cjs";
import { loadPageHtmlInHiddenWindow } from "./browser-loader.cjs";
import { createTray, shouldMinimizeToTray } from "./tray-notifications.cjs";

const moduleDirectory = __dirname;

let mainWindow: BrowserWindow | null = null;
let helpWindow: BrowserWindow | null = null;
let backend: JobScoutBackend | null = null;
let careerBackend: CareerBackend | null = null;
let requirementBackend: RequirementBackend | null = null;
let resumeBackend: ResumeBackend | null = null;
let isQuitting = false;

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

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      void shell.openExternal(validateExternalUrl(url));
    } catch {
      return { action: "deny" };
    }
    return { action: "deny" };
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https:;",
          "X-Frame-Options": "DENY",
        },
      });
    },
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("close", async (event) => {
    const settings = await backend?.getSettings();
    if (shouldMinimizeToTray(settings ?? null, isQuitting)) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function openHelpWindow(): void {
  if (helpWindow && !helpWindow.isDestroyed()) {
    helpWindow.focus();
    return;
  }

  helpWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: "#f5f3ef",
    title: "Job Ranger Help",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: appAssetPath("ICON.png"),
  });

  if (process.env.NODE_ENV === "development") {
    void helpWindow.loadURL("http://localhost:5173/help.html");
  } else {
    void helpWindow.loadFile(builtPagePath("help.html"));
  }

  helpWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      void shell.openExternal(validateExternalUrl(url));
    } catch {
      return { action: "deny" };
    }
    return { action: "deny" };
  });

  helpWindow.on("closed", () => {
    helpWindow = null;
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "Quit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", accelerator: "CmdOrCtrl+R" },
        { role: "forceReload", accelerator: "CmdOrCtrl+Shift+R" },
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
  if (!backend) throw new Error("Job Ranger backend is not initialized");
  return backend;
}

function requireCareerBackend(): CareerBackend {
  if (!careerBackend) throw new Error("Job Ranger career backend is not initialized");
  return careerBackend;
}

function requireRequirementBackend(): RequirementBackend {
  if (!requirementBackend) throw new Error("Job Ranger requirement backend is not initialized");
  return requirementBackend;
}

function requireResumeBackend(): ResumeBackend {
  if (!resumeBackend) throw new Error("Job Ranger resume backend is not initialized");
  return resumeBackend;
}

function registerIpcHandlers(): void {
  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("app:get-platform", () => process.platform);
  ipcMain.handle("app:open-external", async (_event, url: string) => {
    await shell.openExternal(validateExternalUrl(url));
  });
  ipcMain.handle("app:show-item-in-folder", async (_event, targetPath: string) => {
    shell.showItemInFolder(targetPath);
  });

  ipcMain.handle("system:get-status", () => requireBackend().getSystemStatus(process.platform));

  ipcMain.handle("companies:list", () => requireBackend().listCompanies());
  ipcMain.handle("companies:create", (_event, draft) =>
    requireBackend().createCompany(validateCompanyDraft(draft)),
  );
  ipcMain.handle("companies:update", (_event, id: string, update) =>
    requireBackend().updateCompany(validateId(id, "Company id"), validateCompanyUpdate(update)),
  );
  ipcMain.handle("companies:delete", (_event, id: string) =>
    requireBackend().deleteCompany(validateId(id, "Company id")),
  );
  ipcMain.handle("companies:run-scrape", (_event, id: string) =>
    requireBackend().runCompanyScrape(validateId(id, "Company id")),
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
    requireBackend().updateFilter(validateId(id, "Filter id"), validateFilterUpdate(update)),
  );
  ipcMain.handle("filters:delete", (_event, id: string) =>
    requireBackend().deleteFilter(validateId(id, "Filter id")),
  );

  ipcMain.handle("settings:get", () => requireBackend().getSettings());
  ipcMain.handle("settings:update", (_event, update) =>
    requireBackend().updateSettings(validateSettingsUpdate(update)),
  );

  ipcMain.handle("scrape-runs:list-recent", (_event, limit?: number) =>
    requireBackend().listRecentScrapeRuns(
      limit === undefined ? undefined : validateFiniteNumber(limit, "Scrape run limit"),
    ),
  );

  ipcMain.handle("career:get-profile", () => requireCareerBackend().getProfile());
  ipcMain.handle("career:save-profile", (_event, profile) =>
    requireCareerBackend().saveProfile(validateCareerProfile(profile)),
  );
  ipcMain.handle("career:migrate-legacy", (_event, payload) =>
    requireCareerBackend().migrateLegacy(validateLegacyCareerMigration(payload)),
  );
  ipcMain.handle("career:select-resume-import", async () => {
    const selection = await dialog.showOpenDialog({
      title: "Import resume or career history",
      properties: ["openFile"],
      filters: [
        { name: "Resume documents", extensions: ["docx", "pdf", "txt"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (selection.canceled || selection.filePaths.length === 0) return null;
    return requireCareerBackend().importResumeFile(selection.filePaths[0]);
  });
  ipcMain.handle("career:import-pasted-text", (_event, input) =>
    requireCareerBackend().importPastedText(validatePastedResumeInput(input)),
  );
  ipcMain.handle("career:list-source-artifacts", () =>
    requireCareerBackend().listSourceArtifacts(),
  );
  ipcMain.handle("career:list-evidence", () => requireCareerBackend().listEvidence());
  ipcMain.handle("career:review-evidence", (_event, id: string, update) =>
    requireCareerBackend().reviewEvidence(
      validateCareerEntityId(id, "Evidence id"),
      validateEvidenceReviewUpdate(update),
    ),
  );
  ipcMain.handle("career:merge-evidence", (_event, sourceId: string, targetId: string) =>
    requireCareerBackend().mergeEvidence(
      validateCareerEntityId(sourceId, "Source evidence id"),
      validateCareerEntityId(targetId, "Target evidence id"),
    ),
  );

  ipcMain.handle("resume:create-projection", (_event, input) =>
    requireResumeBackend().createProjection(validateCreateResumeProjectionInput(input)),
  );
  ipcMain.handle("resume:revise-projection", (_event, input) =>
    requireResumeBackend().reviseProjection(validateReviseResumeProjectionInput(input)),
  );
  ipcMain.handle("resume:get-projection", (_event, id: string) =>
    requireResumeBackend().getProjection(validateCareerEntityId(id, "Resume projection id")),
  );
  ipcMain.handle("resume:get-latest-projection", (_event, jobId: string) =>
    requireResumeBackend().getLatestProjection(validateId(jobId, "Job id")),
  );
  ipcMain.handle("resume:list-projections", (_event, jobId: string) =>
    requireResumeBackend().listProjections(validateId(jobId, "Job id")),
  );
  ipcMain.handle("resume:mark-reviewed", (_event, id: string) =>
    requireResumeBackend().markReviewed(validateCareerEntityId(id, "Resume projection id")),
  );

  ipcMain.handle("applications:list", () => requireCareerBackend().listApplications());
  ipcMain.handle("applications:track", (_event, jobId: string) =>
    requireCareerBackend().trackApplication(validateId(jobId, "Job id")),
  );
  ipcMain.handle("applications:update", (_event, id: string, update) =>
    requireCareerBackend().updateApplication(
      validateCareerEntityId(id, "Application id"),
      validateApplicationUpdate(update),
    ),
  );
  ipcMain.handle("applications:delete", (_event, id: string) =>
    requireCareerBackend().deleteApplication(validateCareerEntityId(id, "Application id")),
  );
}

app.whenReady().then(async () => {
  try {
    const dataDirectory = path.join(app.getPath("userData"), "data");
    backend = new JobScoutBackend({
      dataDirectory,
      browserPageLoader: loadPageHtmlInHiddenWindow,
    });
    await backend.initialize();

    const systemStatus = await backend.getSystemStatus(process.platform);
    const sharedBackendOptions = {
      databasePath: systemStatus.databasePath,
      sqliteBinaryPath: systemStatus.sqliteBinaryPath,
    };
    careerBackend = new CareerBackend({ dataDirectory, ...sharedBackendOptions });
    await careerBackend.initialize();
    requirementBackend = new RequirementBackend(sharedBackendOptions);
    resumeBackend = new ResumeBackend(sharedBackendOptions);

    registerIpcHandlers();
    createWindow();
    createMenu();
    createTray(appAssetPath("ICON.png"), mainWindow, () => app.quit());

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Job Ranger startup error";
    dialog.showErrorBox("Job Ranger failed to start", message);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  void backend?.dispose();
});
