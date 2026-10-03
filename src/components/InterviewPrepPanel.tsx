import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import type { InterviewPrepResult } from "../shared/interview-prep";
import { getDesktopApi } from "../services/api";

interface InterviewPrepPanelProps {
  applicationId: string;
}

const CLASSIFICATION_CLASSES: Record<string, string> = {
  direct: "soft-badge-success",
  transferable: "soft-badge-info",
  ambiguous: "soft-badge-warning",
  gap: "soft-badge-danger",
};

export function InterviewPrepPanel({ applicationId }: InterviewPrepPanelProps) {
  const [open, setOpen] = useState(false);
  const [prep, setPrep] = useState<InterviewPrepResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setPrep(await getDesktopApi().interviewPrep.get(applicationId));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to build interview preparation",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !prep && !loading) void load();
  };

  return (
    <section className="panel panel-muted rounded-2xl p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={toggle}
      >
        <span>
          <span className="inline-flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
            <ClipboardCheck className="h-4 w-4" /> Interview prep
          </span>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            Grounded in this job, confirmed evidence, and the resume actually submitted.
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              className="secondary-button"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Rebuilding" : "Refresh prep"}
            </button>
          </div>

          {error && (
            <div className="support-note px-4 py-3 text-sm text-[var(--color-danger)]">{error}</div>
          )}

          {loading && !prep && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Rebuilding preparation from the current authoritative records...
            </p>
          )}

          {prep && (
            <>
              {prep.warnings.map((warning) => (
                <div key={warning} className="support-note px-4 py-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-warning)]" />
                    <span>{warning}</span>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                  <p className="metric-label">Role context</p>
                  <p className="mt-2 font-semibold">{prep.application.title}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {prep.application.companyName}
                    {prep.job?.location ? ` · ${prep.job.location}` : ""}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
                  <p className="metric-label">Submitted resume</p>
                  {prep.submittedResume ? (
                    <div className="mt-2 flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-[var(--color-success)]" />
                      <span className="font-semibold">Exact PDF v{prep.submittedResume.version} recorded</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      No exact submitted artifact is available.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 font-semibold">
                  <HelpCircle className="h-4 w-4" /> Questions to prepare
                </div>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--color-text-secondary)]">
                  {prep.suggestedQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--color-text-primary)]">Requirement-by-requirement preparation</h4>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  These are preparation cues, not predicted interview questions or hiring probabilities.
                </p>
                <div className="mt-3 space-y-3">
                  {prep.requirements.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      No explicit requirements are available to prepare against.
                    </p>
                  ) : (
                    prep.requirements.map((item) => (
                      <article key={item.requirementId} className="rounded-xl border border-[var(--color-border)] px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`soft-badge ${CLASSIFICATION_CLASSES[item.classification] ?? ""}`}>
                            {item.classification}
                          </span>
                          <span className="soft-badge">{item.kind}</span>
                          {item.evidenceId && (
                            <span
                              className={`soft-badge ${
                                item.submissionRelation === "exact"
                                  ? "soft-badge-success"
                                  : "soft-badge-warning"
                              }`}
                            >
                              {item.submissionRelation === "exact"
                                ? "Evidence was submitted"
                                : item.submissionRelation === "superseded"
                                  ? "Submitted claim has since changed"
                                  : "Evidence not on submitted resume"}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 font-semibold text-[var(--color-text-primary)]">{item.text}</p>
                        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{item.explanation}</p>

                        {item.evidenceStatement && (
                          <div className="mt-3 rounded-xl bg-[var(--color-surface)] px-3 py-3 text-sm">
                            <span className="metric-label">Confirmed evidence</span>
                            <p className="mt-1 text-[var(--color-text-secondary)]">{item.evidenceStatement}</p>
                          </div>
                        )}

                        {item.submittedStatementTexts.length > 0 && (
                          <div className="mt-3 rounded-xl bg-[var(--color-surface)] px-3 py-3 text-sm">
                            <span className="metric-label">
                              {item.submissionRelation === "superseded"
                                ? "What the submitted resume said before this evidence changed"
                                : "What the submitted resume said"}
                            </span>
                            {item.submittedStatementTexts.map((statement) => (
                              <p key={statement} className="mt-1 text-[var(--color-text-secondary)]">{statement}</p>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 border-l-2 border-[var(--color-primary)] pl-3 text-sm text-[var(--color-text-primary)]">
                          {item.preparationPrompt}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
