import { useEffect, useMemo, useState } from "react";
import { getDesktopApi } from "../services/api";
import type { ManualPublicationReceipt } from "../shared/personal-brand";
import {
  OUTCOME_KINDS, summarizeCareerOutcomes, type CareerOutcomeKind,
  type CareerOutcomeRecord, type PostAssociation,
} from "../shared/personal-brand-outcomes";

const LABELS: Record<CareerOutcomeKind, string> = {
  recruiter_outreach: "Recruiter contacted me",
  meaningful_conversation: "Meaningful professional conversation",
  referral: "Professional referral",
  interview_invitation: "Interview invitation",
  interview_completed: "Interview completed",
  offer: "Job offer",
  other: "Other career outcome",
};
const ASSOCIATIONS: Record<Exclude<PostAssociation, "none">, string> = {
  post_mentioned: "The other person explicitly mentioned this post",
  user_reported_discovery: "The other person said they discovered me through this post",
};

export function CareerOutcomeJournal({ publications }: { publications: ManualPublicationReceipt[] }) {
  const [events, setEvents] = useState<CareerOutcomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<CareerOutcomeKind>("recruiter_outreach");
  const [occurredLocal, setOccurredLocal] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Personal journal");
  const [note, setNote] = useState("");
  const [postId, setPostId] = useState("");
  const [association, setAssociation] = useState<PostAssociation>("none");
  const [confirmed, setConfirmed] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const summary = useMemo(() => summarizeCareerOutcomes(events), [events]);

  useEffect(() => {
    let active = true;
    void getDesktopApi().personalBrand.listCareerOutcomes()
      .then((rows) => { if (active) setEvents(rows); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(null); setMessage("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save career outcome."); }
    finally { setBusy(false); }
  }

  function addEvent() {
    void perform(async () => {
      if (!occurredLocal.trim()) throw new Error("Enter the actual date and time of the event.");
      const occurred = new Date(occurredLocal);
      if (!Number.isFinite(occurred.getTime())) throw new Error("Enter a valid event time.");
      await getDesktopApi().personalBrand.recordCareerOutcome({
        kind, occurredAt: occurred.toISOString(), sourceLabel, note,
        relatedPostId: postId || null,
        association: postId ? association : "none",
        userConfirmed: confirmed,
      });
      setEvents(await getDesktopApi().personalBrand.listCareerOutcomes());
      setNote(""); setConfirmed(false); setPostId(""); setAssociation("none"); setOccurredLocal("");
      setMessage("Career outcome recorded as user-attested, not attributed to a post.");
    });
  }
  function removeEvent(id: string) {
    void perform(async () => {
      if (removing !== id) throw new Error("Confirm which career outcome to remove.");
      await getDesktopApi().personalBrand.deleteCareerOutcome(id, true);
      setEvents(await getDesktopApi().personalBrand.listCareerOutcomes());
      setRemoving(null);
      setMessage("Local career outcome removed.");
    });
  }

  return (
    <section className="panel panel-strong p-6 space-y-4">
      <h2 className="text-xl font-semibold">5. Record real career outcomes</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Log meaningful career events independently of post performance. A reported relationship
        to a published post is context, not proof of causation.
      </p>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold">Type of career outcome
          <select className="input-shell mt-2 w-full" value={kind}
            onChange={(event) => setKind(event.target.value as CareerOutcomeKind)}>
            {OUTCOME_KINDS.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Local date and time of event
          <input className="input-shell mt-2 w-full" type="datetime-local" value={occurredLocal}
            onChange={(event) => setOccurredLocal(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold">Source of observation
          <input className="input-shell mt-2 w-full" value={sourceLabel}
            onChange={(event) => setSourceLabel(event.target.value)} maxLength={120}
            placeholder="Personal journal, email conversation or call notes" />
        </label>
        <label className="block text-sm font-semibold">Related published post (optional)
          <select className="input-shell mt-2 w-full" value={postId}
            onChange={(event) => { setPostId(event.target.value); setAssociation("none"); }}>
            <option value="">No known relationship to a published post</option>
            {publications.map((post) => (
              <option value={post.postId} key={post.postId}>
                {new Date(post.publishedAt).toLocaleDateString()} · {post.publishedUrl}
              </option>
            ))}
          </select>
        </label>
      </div>
      {postId && (
        <label className="block text-sm font-semibold">Observed post relationship
          <select className="input-shell mt-2 w-full" value={association}
            onChange={(event) => setAssociation(event.target.value as PostAssociation)}>
            <option value="none">Select a user-confirmed relationship</option>
            <option value="post_mentioned">{ASSOCIATIONS.post_mentioned}</option>
            <option value="user_reported_discovery">{ASSOCIATIONS.user_reported_discovery}</option>
          </select>
        </label>
      )}
      <label className="block text-sm font-semibold">Optional private context (max 500 characters)
        <textarea className="input-shell mt-2 w-full min-h-[70px]" value={note}
          onChange={(event) => setNote(event.target.value)} maxLength={500}
          placeholder="Avoid names, contact information and confidential details." />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>I confirm the event actually happened, the optional post relationship reflects what was stated, and I reviewed the note for privacy.</span>
      </label>
      <button type="button" className="primary-button"
        disabled={busy || !confirmed || !occurredLocal || !sourceLabel.trim() ||
          Boolean(postId && association === "none")}
        onClick={addEvent}>Save confirmed career outcome</button>
      <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-2">
        <h3 className="font-semibold">Observed career outcomes</h3>
        <p className="text-sm">
          <strong>{summary.count}</strong> confirmed events ·
          {" "}<strong>{summary.postAssociatedCount}</strong> with a reported post reference ·
          {" "}<strong>{summary.unlinkedCount}</strong> unlinked
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">{summary.message}</p>
      </div>
      {loading && <p role="status" className="text-sm">Loading career outcomes...</p>}
      {!loading && events.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No confirmed events recorded. Most career conversations need no post association.
        </p>
      )}
      {!loading && events.map((entry) => (
        <article key={entry.id} className="rounded-xl border border-[var(--color-border)] p-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{LABELS[entry.kind]}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {new Date(entry.occurredAt).toLocaleString()} · {entry.sourceLabel} · user-confirmed
              </p>
            </div>
            {removing === entry.id ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="secondary-button" disabled={busy}
                  onClick={() => setRemoving(null)}>Cancel removal</button>
                <button type="button" className="secondary-button" disabled={busy}
                  onClick={() => removeEvent(entry.id)}>Confirm removal</button>
              </div>
            ) : (
              <button type="button" className="secondary-button" disabled={busy}
                onClick={() => setRemoving(entry.id)}>Remove outcome</button>
            )}
          </div>
          {entry.note && <p className="text-sm whitespace-pre-wrap">{entry.note}</p>}
          <p className="text-sm text-[var(--color-text-secondary)]">
            {entry.relatedPostId && entry.association !== "none"
              ? `${ASSOCIATIONS[entry.association]} (user-attested; causal impact unknown).`
              : "No post association recorded."}
          </p>
        </article>
      ))}
    </section>
  );
}
