import { BrowserWindow } from "electron";
import { promises as fs } from "node:fs";
import type { ResumePageFormat } from "../../src/shared/contracts.js";

export async function renderResumePdf(
  html: string,
  pageFormat: ResumePageFormat,
  targetPath: string,
): Promise<void> {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      javascript: false,
      partition: `job-ranger-resume-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  try {
    const encoded = Buffer.from(html, "utf8").toString("base64");
    await window.loadURL(`data:text/html;base64,${encoded}`);
    const pdf = await window.webContents.printToPDF({
      printBackground: true,
      pageSize: pageFormat === "a4" ? "A4" : "Letter",
      preferCSSPageSize: false,
    });
    await fs.writeFile(targetPath, pdf);
  } finally {
    window.webContents.removeAllListeners();
    if (!window.isDestroyed()) window.destroy();
  }
}
