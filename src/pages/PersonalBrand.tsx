import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Save, BarChart3, CheckCircle2, AlertTriangle } from "lucide-react";
import { Layout } from "../components/Layout";
import { getDesktopApi } from "../services/api";
import {
  assessPersonalBrandDraft, derivedPostMetrics,
  type AnalyticsSnapshot, type ManualPostPackage, type ManualPublicationReceipt,
  type PersonalBrandDraft, type MetricName,
} from "../shared/personal-brand";
import type { PersonalBrandDraftInput } from "../shared/personal-brand-api";

const baseInput: PersonalBrandDraftInput = {
  body: "",
  objective: "expertise_proof",
  audiences: ["recruiters", "hiring managers"],
  destination: "linkedin",
  format: "text",
  hookArchetype: null,
  hypothesis: "",
  claimChecks: [],
  mediaCount: 0,
  mediaAccessibilityReviewed: true,
};
const objectives = [
  ["recruiter_discovery", "Recruiter discovery"],
  ["expertise_proof", "Demonstrate expertise"],
  ["project_visibility", "Project visibility"],
  ["career_narrative", "Career narrative"],
  ["network_growth", "Network growth"],
  ["community_contribution", "Community contribution"],
  ["job_search_learning", "Job-search learning"],
  ["other", "Other"],
] as const;
const hooks = [
  ["", "Not selected"],
  ["concrete_experience", "Specific experience"],
  ["contradiction", "Contradiction"],
  ["build_proof", "Demonstrated work"],
  ["lesson", "Lesson"],
  ["counterintuitive", "Counterintuitive claim"],
  ["before_after", "Before / after"],
  ["question", "Question"],
  ["other", "Other"],
] as const;
const metricInputs: ReadonlyArray<[MetricName, string]> = [
  ["impressions", "Impressions"],
  ["reached", "Members reached"],
  ["reactions", "Reactions"],
  ["comments", "Comments"],
  ["reposts", "Reposts"],
  ["saves", "Saves"],
  ["sends", "Sends"],
  ["profile_views", "Profile views from post"],
  ["followers_gained", "Followers gained"],
];

function inputFromDraft(draft: PersonalBrandDraft): PersonalBrandDraftInput {
  const { id: _id, revision: _revision, ...input } = draft;
  return input;
}
function formatPercent(n: number | null): string {
  return n === null ? "Unavailable" : `${(n * 100).toFixed(2)}%`;
}
export function PersonalBrand() {
  const [drafts, setDrafts] = useState<PersonalBrandDraft[]>([]);
  const [selected, setSelected] = useState<PersonalBrandDraft | null>(null);
  const [input, setInput] = useState<PersonalBrandDraftInput>(baseInput);
  const [dirty, setDirty] = useState(false);
  const [prepared, setPrepared] = useState<ManualPostPackage[]>([]);
  const [publications, setPublications] = useState<ManualPublicationReceipt[]>([]);
  const [postId, setPostId] = useState("");
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([]);
  const [metrics, setMetrics] = useState<Partial<Record<MetricName, string>>>({});
  const [metricsSource, setMetricsSource] = useState("LinkedIn post analytics (manual entry)");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [publishedLocal, setPublishedLocal] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [publishedConfirmed, setPublishedConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async (preferredDraftId?: string) => {
    const api = getDesktopApi().personalBrand;
    const [loadedDrafts, loadedPrepared, loadedPublications] = await Promise.all([
      api.listDrafts(), api.listPrepared(), api.listPublications(),
    ]);
    setDrafts(loadedDrafts);
    setPrepared(loadedPrepared);
    setPublications(loadedPublications);
    if (preferredDraftId) {
      const active = loadedDrafts.find((item) => item.id === preferredDraftId);
      if (active) { setSelected(active); setInput(inputFromDraft(active)); setDirty(false); }
    }
    return { loadedDrafts, loadedPublications };
  }, []);

  useEffect(() => {
    let live = true;
    const start = async () => {
      try {
        const { loadedDrafts, loadedPublications } = await refresh();
        if (!live) return;
        if (loadedDrafts.length) {
          setSelected(loadedDrafts[0]);
          setInput(inputFromDraft(loadedDrafts[0]));
        }
        if (loadedPublications.length) setPostId(loadedPublications[0].postId);
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : "Unable to load Personal Brand records.");
      } finally { if (live) setLoading(false); }
    };
    void start();
    return () => { live = false; };
  }, [refresh]);

  useEffect(() => {
    if (!postId) { setSnapshots([]); return; }
    let live = true;
    void getDesktopApi().personalBrand.listSnapshots(postId)
      .then((items) => { if (live) setSnapshots(items); })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { live = false; };
  }, [postId]);

  const current = useMemo<PersonalBrandDraft>(() => ({
    ...input, id: selected?.id ?? "new-draft", revision: selected?.revision ?? 1,
  }), [input, selected]);
  const readiness = useMemo(() => assessPersonalBrandDraft(current), [current]);
  const currentPackage = prepared.find((item) =>
    item.draftId === selected?.id && item.approvedRevision === selected?.revision);
  const currentReceipt = publications.find((item) =>
    item.draftId === selected?.id && item.approvedRevision === selected?.revision);
  const lastSnapshot = snapshots.at(-1);
  const summary = lastSnapshot ? derivedPostMetrics(lastSnapshot) : null;

  const change = <K extends keyof PersonalBrandDraftInput>(key: K, value: PersonalBrandDraftInput[K]) => {
    setInput((before) => ({ ...before, [key]: value }));
    setDirty(true);
    setReviewed(false);
    setNotice("");
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null); setNotice("");
    try { await fn(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete this action."); }
    finally { setBusy(false); }
  };
  const save = async (): Promise<PersonalBrandDraft> => {
    if (selected && !dirty) return selected;
    const api = getDesktopApi().personalBrand;
    const saved = selected
      ? await api.updateDraft(selected.id, selected.revision, input)
      : await api.createDraft(input);
    await refresh(saved.id);
    setSelected(saved); setDirty(false);
    return saved;
  };
  const copyPost = () => void run(async () => {
    const saved = !selected || dirty ? await save() : selected;
    const pkg = await getDesktopApi().personalBrand.prepareDraft(saved.id, saved.revision, reviewed);
    await refresh(saved.id);
    try {
      await navigator.clipboard.writeText(pkg.body);
      setNotice("Approved text copied. Paste it into LinkedIn, then return with the permalink.");
    } catch {
      setNotice("Copy permission was unavailable. Select the post text below and copy it manually.");
    }
  });
  const confirmPost = () => void run(async () => {
    if (!selected || dirty || !currentPackage) throw new Error("Save and prepare the exact version before recording publication.");
    if (!publishedLocal.trim()) throw new Error("Enter the actual publication date and time.");
    const receipt = await getDesktopApi().personalBrand.confirmPublication({
      draftId: selected.id,
      revision: selected.revision,
      publishedUrl: publishedUrl.trim(),
      publishedAt: new Date(publishedLocal).toISOString(),
      userConfirmed: publishedConfirmed,
    });
    await refresh(selected.id);
    setPostId(receipt.postId);
    setPublishedConfirmed(false);
    setNotice("Your publication was recorded as user-confirmed, not independently verified by LinkedIn.");
  });
  const recordMetrics = () => void run(async () => {
    if (!postId) throw new Error("Select a recorded publication.");
    const receipt = publications.find((item) => item.postId === postId);
    if (!receipt) throw new Error("Publication not found.");
    const capturedAt = new Date().toISOString();
    const observations = metricInputs.map(([name]) => {
      const value = metrics[name]?.trim();
      return value === undefined || value === ""
        ? { name, state: "unavailable" as const, limitation: "Not reported in this manual snapshot." }
        : { name, state: "manual" as const, value: Number(value) };
    });
    await getDesktopApi().personalBrand.appendSnapshot(postId, {
      capturedAt,
      windowStart: receipt.publishedAt,
      windowEnd: capturedAt,
      sourceLabel: metricsSource.trim(),
      observations,
    });
    setSnapshots(await getDesktopApi().personalBrand.listSnapshots(postId));
    setMetrics({});
    setNotice("Timestamped analytics saved with manual provenance. Empty fields remain unavailable, not zero.");
  });

  return (
    <Layout>
      <section className="panel panel-strong p-6 sm:p-8 space-y-3">
        <span className="alpha-pill"><BarChart3 className="h-3.5 w-3.5" /> Professional presence</span>
        <h1 className="page-title">Make the post useful. Then measure what happened.</h1>
        <p className="page-copy">Job Ranger supports an intentional, manual LinkedIn workflow. It does not publish for you, invent career claims, or require AI or a social account connection.</p>
      </section>
      {error && <section role="alert" className="support-note mt-5 p-4 text-sm text-[var(--color-danger)]">{error}</section>}
      {notice && <section role="status" className="support-note mt-5 p-4 text-sm">{notice}</section>}
      {loading ? <p className="mt-6">Loading saved professional presence data...</p> : (
        <div className="mt-6 space-y-6">
          <section className="panel panel-strong p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">1. Compose and validate</h2>
              <button type="button" className="secondary-button" onClick={() => {
                setSelected(null); setInput({ ...baseInput }); setReviewed(false); setPublishedConfirmed(false); setDirty(false); setError(null); setNotice("");
              }}>New post</button>
            </div>
            <label className="block text-sm font-semibold">Saved drafts
              <select className="input-shell mt-2 w-full" value={selected?.id ?? ""} onChange={(e) => {
                const next = drafts.find((draft) => draft.id === e.target.value) ?? null;
                setSelected(next); setInput(next ? inputFromDraft(next) : { ...baseInput });
                setDirty(false); setReviewed(false); setPublishedConfirmed(false);
              }}>
                <option value="">New draft</option>
                {drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.body.slice(0, 75) || "(untitled)"} · v{draft.revision}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold">Objective
                <select className="input-shell mt-2 w-full" value={input.objective ?? ""} onChange={(e) => change("objective", e.target.value as PersonalBrandDraftInput["objective"])}>
                  {objectives.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Hook type
                <select className="input-shell mt-2 w-full" value={input.hookArchetype ?? ""} onChange={(e) => change("hookArchetype", (e.target.value || null) as PersonalBrandDraftInput["hookArchetype"])}>
                  {hooks.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Audience
                <input className="input-shell mt-2 w-full" value={input.audiences.join(", ")} onChange={(e) => change("audiences", e.target.value.split(",").map((s) => s.trim()))} placeholder="Recruiters, hiring managers" />
              </label>
            </div>
            <label className="block text-sm font-semibold">Post text (LinkedIn, text only)
              <textarea className="input-shell mt-2 w-full min-h-[230px]" value={input.body} onChange={(e) => change("body", e.target.value)} placeholder="Start with a specific, supportable claim or experience." />
              <span className="text-xs font-normal text-[var(--color-text-secondary)]">{input.body.length} / 3,000 characters</span>
            </label>
            <label className="block text-sm font-semibold">Hypothesis to evaluate
              <input className="input-shell mt-2 w-full" value={input.hypothesis} onChange={(e) => change("hypothesis", e.target.value)} placeholder="What should this post accomplish, and what will we observe?" />
            </label>
            <section className="rounded-xl border border-[var(--color-border)] p-4">
              <h3 className="font-semibold">Deterministic readiness</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">These checks do not prove that prose is factual, emotionally effective, or safe to disclose. Those require editorial and Career Evidence review.</p>
              <ul className="mt-3 space-y-1 text-sm">
                {readiness.findings.map((item) => (
                  <li key={item.code} className="flex gap-2">
                    {item.severity === "blocking" ? <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-danger)]" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />}
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            </section>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              <span>I personally reviewed the exact content, including all factual claims, supporting evidence, privacy, and wording. I understand that preparing a copy does not publish it.</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={busy} className="secondary-button" onClick={() => void run(async () => { await save(); setNotice("Draft saved in the Job Ranger database."); })}><Save className="h-4 w-4" /> Save draft</button>
              <button type="button" disabled={busy || !reviewed || readiness.status === "blocked"} className="primary-button" onClick={copyPost}><ClipboardCopy className="h-4 w-4" /> Prepare and copy</button>
            </div>
            {currentPackage && !dirty && (
              <div className="space-y-2">
                <button type="button" className="secondary-button" onClick={() => {
                  if (!navigator.clipboard) {
                    setNotice("Clipboard access is unavailable. Select the exact prepared text below to copy manually.");
                    return;
                  }
                  void navigator.clipboard.writeText(currentPackage.body)
                    .then(() => setNotice("Exact approved text copied."))
                    .catch(() => setNotice("Clipboard access was denied. Select the exact prepared text below to copy manually."));
                }}>
                  <ClipboardCopy className="h-4 w-4" /> Copy prepared text again
                </button>
                <textarea readOnly aria-label="Exact prepared post text" className="input-shell w-full min-h-[100px] text-sm" value={currentPackage.body} />
              </div>
            )}
          </section>

          <section className="panel panel-strong p-6 space-y-4">
            <h2 className="text-xl font-semibold">2. Record publication</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">After posting manually, record LinkedIn's actual permalink and publication time. Job Ranger labels this a user-confirmed receipt.</p>
            <label className="block text-sm font-semibold">LinkedIn post URL
              <input type="url" className="input-shell mt-2 w-full" value={publishedUrl} onChange={(e) => setPublishedUrl(e.target.value)} placeholder="https://www.linkedin.com/feed/update/..." />
            </label>
            <label className="block text-sm font-semibold">Local publication date and time
              <input type="datetime-local" className="input-shell mt-2 w-full" value={publishedLocal} onChange={(e) => setPublishedLocal(e.target.value)} />
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={publishedConfirmed} onChange={(e) => setPublishedConfirmed(e.target.checked)} />
              <span>I confirm this exact post was published by me.</span>
            </label>
            <button type="button" className="primary-button" disabled={busy || !currentPackage || !publishedConfirmed || dirty || Boolean(currentReceipt)} onClick={confirmPost}>
              {currentReceipt ? "Publication recorded" : "Record manual publication"}
            </button>
          </section>

          <section className="panel panel-strong p-6 space-y-4">
            <h2 className="text-xl font-semibold">3. Observe and learn</h2>
            <label className="block text-sm font-semibold">Published post
              <select className="input-shell mt-2 w-full" value={postId} onChange={(e) => setPostId(e.target.value)}>
                <option value="">Select a publication</option>
                {publications.map((receipt) => <option key={receipt.postId} value={receipt.postId}>{receipt.destination} · {new Date(receipt.publishedAt).toLocaleString()} · {receipt.draftId.slice(0, 14)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Source of this snapshot
              <input className="input-shell mt-2 w-full" value={metricsSource} onChange={(e) => setMetricsSource(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {metricInputs.map(([name, label]) => (
                <label key={name} className="text-sm font-semibold">{label}
                  <input type="number" min="0" step="1" inputMode="numeric" className="input-shell mt-2 w-full" value={metrics[name] ?? ""} onChange={(e) => setMetrics((before) => ({ ...before, [name]: e.target.value }))} placeholder="Not available" />
                </label>
              ))}
            </div>
            <button type="button" disabled={busy || !postId} className="primary-button" onClick={recordMetrics}>Save timestamped analytics</button>
            <p className="text-xs text-[var(--color-text-secondary)]">Blank metrics are unavailable, not zero. Results are self-reported snapshots, not retrieved from LinkedIn.</p>
            {summary && lastSnapshot && (
              <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-2">
                <p className="font-semibold">Latest snapshot: {new Date(lastSnapshot.capturedAt).toLocaleString()}</p>
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <p>Impressions: <strong>{summary.impressions ?? "Unavailable"}</strong></p>
                  <p>Reached: <strong>{summary.reached ?? "Unavailable"}</strong></p>
                  <p>Engagement/reached: <strong>{formatPercent(summary.engagementsPerReached)}</strong></p>
                  <p>Profile visits/reached: <strong>{formatPercent(summary.profileViewsPerReached)}</strong></p>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">{summary.caveat} {snapshots.length} snapshot(s) saved.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  );
}
