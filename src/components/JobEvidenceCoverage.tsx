import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, FileSearch, HelpCircle } from "lucide-react";
import type { JobEvidenceCoverage } from "../shared/contracts";
import { getDesktopApi } from "../services/api";

interface Props {
  jobId: string;
  onPrepareResume: () => void;
}

function classificationLabel(value: JobEvidenceCoverage["items"][number]["mapping"]["classification"]): string {
  switch (value) {
    case "direct":
      return "Supported";
    case "transferable":
      return "Transferable";
    case "ambiguous":
      return "Needs confirmation";
    case "gap":
      return "Gap";
  }
}

function ClassificationIcon({ value }: { value: JobEvidenceCoverage["items"][number]["mapping"]["classification"] }) {
  if (value === "direct" || value === "transferable") {
    return <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-success)]" />;
  }
  if (value === "ambiguous") {
    return <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-warning)]" />;
  }
  return <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-danger)]" />;
}

export function JobEvidenceCoveragePanel({ jobId, onPrepareResume }: Props) {
  const [coverage, setCoverage] = useState<JobEvidenceCoverage | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || coverage || loading) return;

    setLoading(true);
    setError(null);
    try {
      setCoverage(await getDesktopApi().jobs.getEvidenceCoverage(jobId));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to evaluate Career Evidence");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => void toggle()}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <FileSearch className="h-4 w-4 text-[var(--color-primary)]" />
          Evidence coverage
          {coverage && coverage.totalCount > 0 && (
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {coverage.supportedCount} supported · {coverage.ambiguousCount} to confirm · {coverage.gapCount} gaps
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-divider border-t px-4 py-4">
          {loading && <p className="text-sm text-[var(--color-text-secondary)]">Checking this listing against your Career Evidence...</p>}
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          {coverage && coverage.totalCount === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Job Ranger could not identify an explicit requirement in the listing text it currently has. The existing Career Profile fit score remains available above.
              </p>
              <button type="button" className="secondary-button" onClick={onPrepareResume}>
                Review Career Evidence
              </button>
            </div>
          )}

          {coverage && coverage.totalCount > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <span className="soft-badge soft-badge-success">{coverage.directCount} direct</span>
                <span className="soft-badge soft-badge-success">{coverage.transferableCount} transferable</span>
                <span className="soft-badge soft-badge-warning">{coverage.ambiguousCount} confirm</span>
                <span className="soft-badge soft-badge-danger">{coverage.gapCount} gaps</span>
              </div>

              <ul className="space-y-3">
                {coverage.items.map((item) => (
                  <li key={item.requirement.id} className="flex gap-2 text-sm leading-5">
                    <ClassificationIcon value={item.mapping.classification} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--color-text-primary)]">{classificationLabel(item.mapping.classification)}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{item.requirement.kind}</span>
                      </div>
                      <p className="mt-1 text-[var(--color-text-secondary)]">{item.requirement.text}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.mapping.explanation}</p>
                      {item.evidence && (
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Evidence: {item.evidence.statement}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Gaps stay gaps. Job Ranger does not turn missing requirements into resume claims.
                </p>
                <button type="button" className="secondary-button" onClick={onPrepareResume}>
                  Prepare resume
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
