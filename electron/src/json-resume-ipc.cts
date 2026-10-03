import { dialog, ipcMain } from "electron";
import path from "node:path";
import { JsonResumeAdapter } from "./json-resume-adapter.cjs";

export function initializeJsonResumeIpc(options: {
  databasePath: string;
  sqliteBinaryPath: string;
}): void {
  const adapter = new JsonResumeAdapter({
    dataDirectory: path.dirname(options.databasePath),
    databasePath: options.databasePath,
    sqliteBinaryPath: options.sqliteBinaryPath,
  });

  ipcMain.handle("json-resume:import", async () => {
    const selection = await dialog.showOpenDialog({
      title: "Import JSON Resume",
      properties: ["openFile"],
      filters: [
        { name: "JSON Resume", extensions: ["json"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (selection.canceled || selection.filePaths.length === 0) return null;
    return adapter.importFile(selection.filePaths[0]);
  });

  ipcMain.handle("json-resume:export", async () => {
    const selection = await dialog.showSaveDialog({
      title: "Export JSON Resume",
      defaultPath: "resume.json",
      filters: [{ name: "JSON Resume", extensions: ["json"] }],
    });
    if (selection.canceled || !selection.filePath) return null;
    return adapter.exportFile(selection.filePath);
  });
}
