import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Layout } from "../components/Layout";
import { JobEvidenceCoveragePanel } from "../components/JobEvidenceCoverage";
import { useAppContext } from "../context/AppContext";
import { getDesktopApi } from "../services/api";
import { evaluateJobFit } from "../career/match";
import { trackJob, useCareerProfile } from "../career/storage";

export function Jobs() {
  const { jobs, companies, markJobAsSeen, loading } = useAppContext();
  const { profile, configured, loading: profileLoading } = useCareerProfile();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"fit" | "newest">("fit");
  const [trackError, setTrackError] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    const next = jobs
      .filter((job) => {
        const query = searchTerm.trim().toLowerCase();
        const location = locationTerm.trim().toLowerCase();

        const matchesSearch =
          !query ||
          job.title.toLowerCase().includes(query) ||
          job.descriptionSnippet.toLowerCase().includes(query);
        const matchesLocation = !location || job.location.toLowerCase().includes(location);
        const matchesCompany = companyFilter === "all" || job.companyId === companyFilter;

        return matchesSearch && matchesLocation && matchesCompany;
      })
      .map((job) => ({
        job,
        fit: profileLoading ? null : evaluateJobFit(job, profile),
      }));

    if (sortBy === "fit" && configured) {
      next.sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1));
    }

    return next;
  }, [
    jobs,
    searchTerm,
    locationTerm,
    companyFilter,
    sortBy,
    configured,
    profile,
    profileLoading,
  ]);

  const handleTrackJob = async (job: (typeof jobs)[number]) => {
    setTrackError(null);
    try {
      await trackJob(job);
      navigate("/applications");
    } catch (error) {
      setTrackError(
        error instanceof Error ? error.message : "Unable to track this job",
      );
    }
  };

  const handlePrepareResume = async (job: (typeof jobs)[number]) => {
    setTrackError(null);
    try {
      await trackJob(job);
      navigate(`/resume?job=${encodeURIComponent(job.id)}`);
    } catch (error) {
      setTrackError(
        error instanceof Error
          ? error.message
          : "Unable to start resume preparation",
      );
    }
  };

  return (
    <Layout>
      <section className="panel panel-strong px-6 py-7 sm:px-8">
        <span className="alpha-pill">
          <Sparkles className="h-3.5 w-3.5" />
          Find Jobs
        </span>
        <h1 className="page-title mt-4">
          Spend your time on the jobs that look worth it.
        </h1>
        <p className="page-copy">
          Job Ranger compares each saved listing with your Career Profile and
          explains the evidence it can actually see. The score is a local,
          deterministic guide, not a hiring prediction.
        </p>
      </section>

      {!profileLoading && !configured && (
        <section className="support-note mt-6 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">
              Set up your Career Profile to see match explanations.
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              It takes a couple of minutes and stays on this device.
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/career-profile")}
          >
            Create Career Profile
          </button>
        </section>
      )}

      {trackError && (
        <section className="support-note mt-6 px-5 py-4 text-sm text-[var(--color-danger)]">
          {trackError}
        </section>
      )}

      <section className="panel panel-muted mt-6 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title or description"
              className="input-shell pl-11"
            />
          </label>
          <label className="relative">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={locationTerm}
              onChange={(event) => setLocationTerm(event.target.value)}
              placeholder="Filter by location"
              className="input-shell pl-11"
            />
          </label>
          <label className="relative">
            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <select
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="select-shell pl-11"
            >
              <option value="all">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="relative">
            <Target className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as "fit" | "newest")
              }
              className="select-shell pl-11"
            >
              <option value="fit">Best fit first</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
        </div>
      </section>

      <div className="mt-8 space-y-4">
        {filteredJobs.length === 0 && (
          <div className="panel panel-strong px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
            {loading
              ? "Loading jobs..."
              : "No jobs match the current filters. Try widening the search or run another company scan."}
          </div>
        )}

        {filteredJobs.map(({ job, fit }) => {
          const company = companies.find(
            (candidate) => candidate.id === job.companyId,
          );
          const companyName = company?.name ?? "Unknown company";
          const fitClass =
            fit?.band === "strong"
              ? "soft-badge-success"
              : fit?.band === "good" || fit?.band === "possible"
                ? "soft-badge-warning"
                : "soft-badge-danger";

          return (
            <article
              key={job.id}
              className="panel panel-strong p-6 transition hover:-translate-y-0.5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {fit && (
                      <span className={`soft-badge ${fitClass}`}>
                        <Target className="h-3.5 w-3.5" />
                        {fit.label} · {fit.score}%
                      </span>
                    )}
                    {job.isNew && (
                      <span className="soft-badge soft-badge-warning">New</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void getDesktopApi().openExternal(job.url)}
                    className="surface-link-button mt-3 inline-flex items-center gap-2 text-xl font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
                  >
                    {job.title}
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-[var(--color-text-muted)]" />
                      {companyName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[var(--color-text-muted)]" />
                      {job.location || "Location not provided"}
                    </span>
                    {job.salaryText && <span>{job.salaryText}</span>}
                    {job.matchedFilterCount > 0 && (
                      <span className="soft-badge soft-badge-success">
                        <Filter className="h-3.5 w-3.5" />
                        {job.matchedFilterCount} saved filter
                        {job.matchedFilterCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {job.isNew && (
                    <button
                      type="button"
                      onClick={() => void markJobAsSeen(job.id)}
                      className="secondary-button"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark seen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleTrackJob(job)}
                    className="primary-button"
                  >
                    Track this job
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                {job.descriptionSnippet}
              </p>

              {fit && (
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="panel panel-muted rounded-2xl p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Why it may fit
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {fit.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>✓ {reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="panel panel-muted rounded-2xl p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      What to check
                    </p>
                    {fit.concerns.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                        {fit.concerns.slice(0, 3).map((concern) => (
                          <li key={concern}>• {concern}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                        No obvious concern surfaced from the data Job Ranger
                        currently has.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <JobEvidenceCoveragePanel
                jobId={job.id}
                onPrepareResume={() => void handlePrepareResume(job)}
              />

              <div className="border-divider mt-4 flex flex-wrap items-center gap-4 border-t pt-4 text-xs text-[var(--color-text-muted)]">
                <span>
                  First seen{" "}
                  {formatDistanceToNow(new Date(job.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                <span>
                  Last seen{" "}
                  {formatDistanceToNow(new Date(job.lastSeenAt), {
                    addSuffix: true,
                  })}
                </span>
                <span>
                  {job.isActive
                    ? "Still active on source"
                    : "Marked inactive on source"}
                </span>
                {fit && (
                  <span>Fit score uses only saved profile + collected listing data</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Layout>
  );
}
