import { useState } from "react";
import { Archive, FileJson2, FolderOpen, RotateCcw, ShieldCheck } from "lucide-react";
import type { BackupCreateResult, BackupRestoreSelection } from "../shared/backup";
import type { JsonResumeExportResult, JsonResumeImportResult } from "../shared/json-resume";
import { getDesktopApi } from "../services/api";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

export function BackupRestorePanel() {
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [created, setCreated] = useState<BackupCreateResult | null>(null);
  const [selection, setSelection] = useState<BackupRestoreSelection | null>(null);
  const [jsonBusy, setJsonBusy] = useState(false);
  const [jsonImport, setJsonImport] = useState<JsonResumeImportResult | null>(null);
  const [jsonExport, setJsonExport] = useState<JsonResumeExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createBackup = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await getDesktopApi().backups.create();
      if (result) {
        setCreated(result);
        setSelection(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Backup creation failed.");
    } finally {
      setCreating(false);
    }
  };

  const selectRestore = async () => {
    setError(null);
    setCreated(null);
    try {
      const result = await getDesktopApi().backups.selectRestore();
      setSelection(result);
    } catch (cause) {
      setSelection(null);
      setError(cause instanceof Error ? cause.message : "Backup validation failed.");
    }
  };

  const restore = async () => {
    if (!selection) return;
    setRestoring(true);
    setError(null);
    try {
      await getDesktopApi().backups.stageRestore(selection.bundlePath);
    } catch (cause) {
      setRestoring(false);
      setError(cause instanceof Error ? cause.message : "Restore could not be staged.");
    }
  };

  const importJsonResume = async () => {
    setJsonBusy(true);
    setError(null);
    try {
      setJsonImport(await getDesktopApi().jsonResume.importFile());
      setJsonExport(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "JSON Resume import failed.");
    } finally {
      setJsonBusy(false);
    }
  };

  const exportJsonResume = async () => {
    setJsonBusy(true);
    setError(null);
    try {
      setJsonExport(await getDesktopApi().jsonResume.exportFile());
      setJsonImport(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "JSON Resume export failed.");
    } finally {
      setJsonBusy(false);
    }
  };

  return (
    <section className="grid grid-cols-1 gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <div>
        <div className="flex items-center gap-3">
          <Archive className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="text-2xl font-semibold">Portability and interoperability</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          Back up Job Ranger&apos;s complete local state, or exchange a conservative standard JSON Resume projection without making that external format your source of career truth.
        </p>
      </div>

      <div className="space-y-5">
        <div className="panel panel-strong p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">Complete Job Ranger backup</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Includes the canonical local database and managed artifacts. Restores are verified before replacement and require a restart.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void createBackup()} disabled={creating || restoring} className="primary-button disabled:opacity-60">
              <ShieldCheck className="h-4 w-4" /> {creating ? "Creating backup..." : "Create backup"}
            </button>
            <button type="button" onClick={() => void selectRestore()} disabled={creating || restoring} className="secondary-button disabled:opacity-60">
              <FolderOpen className="h-4 w-4" /> Select backup to restore
            </button>
          </div>

          {created && (
            <div className="panel panel-muted p-4 text-sm text-[var(--color-text-secondary)]">
              <p className="font-semibold text-[var(--color-text-primary)]">Backup verified</p>
              <p className="mt-1 break-all">{created.summary.bundlePath}</p>
              <p className="mt-2">{created.summary.artifactFileCount} managed artifact{created.summary.artifactFileCount === 1 ? "" : "s"} · {formatBytes(created.summary.totalBytes)}</p>
            </div>
          )}

          {selection && (
            <div className="rounded-2xl border border-[var(--color-border)] p-4">
              <p className="font-semibold text-[var(--color-text-primary)]">Validated backup</p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Created {new Date(selection.summary.createdAt).toLocaleString()} · Job Ranger {selection.summary.appVersion} · {selection.summary.artifactFileCount} managed artifact{selection.summary.artifactFileCount === 1 ? "" : "s"}
              </p>
              {selection.warnings.map((warning) => <p key={warning} className="mt-2 text-sm text-[var(--color-text-secondary)]">{warning}</p>)}
              <div className="mt-5 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                Restoring replaces the current local Job Ranger database and managed artifacts with this verified backup. Job Ranger restarts automatically after staging.
              </div>
              <button type="button" onClick={() => void restore()} disabled={restoring} className="danger-button mt-4 disabled:opacity-60">
                <RotateCcw className="h-4 w-4" /> {restoring ? "Preparing restart..." : "Restore and restart"}
              </button>
            </div>
          )}
        </div>

        <div className="panel panel-strong p-6 space-y-4">
          <div className="flex items-start gap-3">
            <FileJson2 className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">JSON Resume</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                Import standard JSON Resume records as evidence proposals for review, or export only current confirmed Career Evidence. Import never silently changes your Career Profile.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="secondary-button" disabled={jsonBusy} onClick={() => void importJsonResume()}>
              Import JSON Resume
            </button>
            <button type="button" className="secondary-button" disabled={jsonBusy} onClick={() => void exportJsonResume()}>
              Export JSON Resume
            </button>
          </div>

          {jsonImport && (
            <div className="panel panel-muted rounded-2xl p-4 text-sm text-[var(--color-text-secondary)]">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {jsonImport.duplicate ? "Existing import reused" : "JSON Resume imported for review"}
              </p>
              <p className="mt-2">{jsonImport.proposedEvidence.length} candidate evidence record{jsonImport.proposedEvidence.length === 1 ? "" : "s"} available in Career Profile for confirmation.</p>
              {jsonImport.profileNameProposal && <p className="mt-2">The file suggests the name “{jsonImport.profileNameProposal}”. Your Career Profile was not changed automatically.</p>}
              {jsonImport.warnings.map((warning) => <p key={warning} className="mt-2">{warning}</p>)}
            </div>
          )}

          {jsonExport && (
            <div className="panel panel-muted rounded-2xl p-4 text-sm text-[var(--color-text-secondary)]">
              <p className="font-semibold text-[var(--color-text-primary)]">JSON Resume exported</p>
              <p className="mt-2 break-all">{jsonExport.filePath}</p>
              <p className="mt-2">{jsonExport.exportedEvidenceCount} current evidence record{jsonExport.exportedEvidenceCount === 1 ? "" : "s"} projected · {jsonExport.omittedEvidenceCount} omitted where no unambiguous standard section exists.</p>
              {jsonExport.warnings.map((warning) => <p key={warning} className="mt-2">{warning}</p>)}
            </div>
          )}
        </div>

        {error && <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      </div>
    </section>
  );
}
