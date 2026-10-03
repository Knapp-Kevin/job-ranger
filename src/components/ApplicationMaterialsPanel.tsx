import { useState } from "react";
import { AlertTriangle, ChevronDown, FileText, Plus, Trash2 } from "lucide-react";
import type { ApplicationMaterialProjection } from "../shared/application-materials";
import { getDesktopApi } from "../services/api";

interface ApplicationMaterialsPanelProps {
  applicationId: string;
}

function materialText(material: ApplicationMaterialProjection): string {
  return material.sections.map((section) => section.text).join("\n\n");
}

export function ApplicationMaterialsPanel({ applicationId }: ApplicationMaterialsPanelProps) {
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState<ApplicationMaterialProjection[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setMaterials(await getDesktopApi().applicationMaterials.list(applicationId));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load application materials",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && materials.length === 0 && !loading) void load();
  };

  const createCoverLetter = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const result = await getDesktopApi().applicationMaterials.createCoverLetter(applicationId);
      setWarnings(result.warnings);
      setMaterials(await getDesktopApi().applicationMaterials.list(applicationId));
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Unable to create cover letter",
      );
    } finally {
      setLoading(false);
    }
  };

  const remove = async (projectionId: string) => {
    setLoading(true);
    setError(null);
    try {
      await getDesktopApi().applicationMaterials.delete(projectionId);
      setMaterials(await getDesktopApi().applicationMaterials.list(applicationId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete application material",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={toggle}
      >
        <span>
          <span className="inline-flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
            <FileText className="h-4 w-4" /> Application materials
          </span>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            Factual drafts built only from confirmed Career Evidence.
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-xs leading-5 text-[var(--color-text-muted)]">
              Job Ranger keeps these drafts separate from Career Evidence. Rebuild a draft if its supporting evidence later changes.
            </p>
            <button
              type="button"
              className="secondary-button"
              disabled={loading}
              onClick={() => void createCoverLetter()}
            >
              <Plus className="h-4 w-4" /> Create cover letter
            </button>
          </div>

          {error && (
            <div className="support-note px-4 py-3 text-sm text-[var(--color-danger)]">{error}</div>
          )}

          {warnings.map((warning) => (
            <div key={warning} className="support-note px-4 py-3 text-sm">
              {warning}
            </div>
          ))}

          {loading && materials.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Loading application materials...</p>
          ) : materials.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              No application materials prepared yet.
            </p>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <article
                  key={material.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">Cover letter v{material.version}</span>
                        <span className="soft-badge">{material.status}</span>
                        <span className="soft-badge">{material.selectedEvidenceIds.length} evidence links</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Prepared {new Date(material.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="surface-link-button p-2 text-[var(--color-text-muted)]"
                      aria-label={`Delete cover letter version ${material.version}`}
                      disabled={loading}
                      onClick={() => void remove(material.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {material.staleEvidenceIds.length > 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--color-warning)] px-3 py-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-warning)]" />
                      <span>
                        Supporting Career Evidence changed after this draft was created. Do not use this version without reviewing or rebuilding it.
                      </span>
                    </div>
                  )}

                  <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 font-sans text-sm leading-6 text-[var(--color-text-primary)]">
                    {materialText(material)}
                  </pre>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
