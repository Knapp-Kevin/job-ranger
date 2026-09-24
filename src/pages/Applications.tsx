import { ExternalLink, FileText, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Layout } from "../components/Layout";
import { useApplications, type ApplicationStatus } from "../career/storage";
import { getDesktopApi } from "../services/api";

const statuses: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "interested", label: "Interested" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export function Applications() {
  const { applications, update, remove } = useApplications();

  return (
    <Layout>
      <section className="panel panel-strong px-6 py-7 sm:px-8">
        <span className="alpha-pill">
          <FileText className="h-3.5 w-3.5" />
          Your job search
        </span>
        <h1 className="page-title mt-4">Keep track of what happens after a job looks promising.</h1>
        <p className="page-copy">
          Save a listing from Find Jobs, then move it through the real process: interested, applied, interview, offer, or closed. Everything here stays on this device.
        </p>
      </section>

      <div className="mt-8 space-y-4">
        {applications.length === 0 && (
          <div className="panel panel-strong px-6 py-12 text-center">
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">No applications tracked yet.</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Open Find Jobs and choose Track this job on anything you want to keep. It will appear here without submitting anything on your behalf.
            </p>
          </div>
        )}

        {applications.map((application) => (
          <article key={application.id} className="panel panel-strong p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => void getDesktopApi().openExternal(application.url)}
                  className="surface-link-button inline-flex items-center gap-2 text-xl font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
                >
                  {application.title}
                  <ExternalLink className="h-4 w-4" />
                </button>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{application.companyName}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Added {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="select-shell min-w-40"
                  value={application.status}
                  onChange={(event) => update(application.id, { status: event.target.value as ApplicationStatus })}
                  aria-label={`Application status for ${application.title}`}
                >
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => remove(application.id)}
                  aria-label={`Remove ${application.title} from applications`}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>

            <label className="mt-5 block">
              <span className="metric-label">Notes</span>
              <textarea
                className="input-shell mt-2 min-h-24 resize-y py-3"
                value={application.notes}
                onChange={(event) => update(application.id, { notes: event.target.value })}
                placeholder="Contact name, interview date, follow-up note, what you liked about the role..."
              />
            </label>
          </article>
        ))}
      </div>
    </Layout>
  );
}
