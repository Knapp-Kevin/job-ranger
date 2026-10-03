import { useState } from "react";
import { ArrowRight, Check, Plus, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useCareerEvidence } from "../career/evidence";
import { useOnboardingPreference } from "../career/onboarding";
import type { CredentialStatus, EvidenceSubjectType } from "../shared/contracts";

const evidenceTypes: Array<{ value: EvidenceSubjectType; label: string }> = [
  { value: "role", label: "Job or role" },
  { value: "skill", label: "Skill" },
  { value: "credential", label: "License or credential" },
  { value: "education", label: "Education or training" },
  { value: "project", label: "Project, freelance, volunteer, or portfolio work" },
  { value: "achievement", label: "Achievement or result" },
  { value: "publication", label: "Publication or public work" },
  { value: "other", label: "Other useful career evidence" },
];

function splitList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function EvidenceEntry() {
  const navigate = useNavigate();
  const evidence = useCareerEvidence();
  const { dismiss } = useOnboardingPreference();
  const [subjectType, setSubjectType] = useState<EvidenceSubjectType>("role");
  const [statement, setStatement] = useState("");
  const [organization, setOrganization] = useState("");
  const [titleOrName, setTitleOrName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [skills, setSkills] = useState("");
  const [credentialIssuer, setCredentialIssuer] = useState("");
  const [credentialJurisdiction, setCredentialJurisdiction] = useState("");
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | "">("");
  const [credentialExpiration, setCredentialExpiration] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearForNext = () => {
    setStatement("");
    setOrganization("");
    setTitleOrName("");
    setStartDate("");
    setEndDate("");
    setSkills("");
    setCredentialIssuer("");
    setCredentialJurisdiction("");
    setCredentialStatus("");
    setCredentialExpiration("");
    setCredentialId("");
  };

  const handleSave = async () => {
    if (!statement.trim()) {
      setError("Describe one fact about your background before saving it.");
      return;
    }

    setError(null);
    try {
      await evidence.create({
        subjectType,
        statement,
        organization: organization || undefined,
        titleOrName: titleOrName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        skills: splitList(skills),
        credential:
          subjectType === "credential"
            ? {
                issuer: credentialIssuer || null,
                jurisdiction: credentialJurisdiction || null,
                status: credentialStatus || null,
                expirationDate: credentialExpiration || null,
                credentialId: credentialId || null,
              }
            : null,
      });
      setSaved(true);
      clearForNext();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save career evidence");
    }
  };

  const finish = () => {
    dismiss();
    navigate("/career-profile");
  };

  return (
    <Layout>
      <section className="panel panel-strong px-6 py-7 sm:px-8">
        <span className="alpha-pill">
          <Plus className="h-3.5 w-3.5" />
          Build my evidence
        </span>
        <h1 className="page-title mt-4">Build your career evidence one fact at a time.</h1>
        <p className="page-copy">
          Add work you can stand behind in an interview. A fact can come from a job, project, license, volunteer role, freelance engagement, education, portfolio, or something else that genuinely demonstrates what you have done.
        </p>
      </section>

      {(error || evidence.error) && (
        <section className="support-note mt-6 px-5 py-4 text-sm text-[var(--color-danger)]">
          {error ?? evidence.error}
        </section>
      )}

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.42fr]">
        <div className="panel panel-strong p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label>
              <span className="metric-label">What kind of evidence is this?</span>
              <select
                className="select-shell mt-2"
                aria-label="Evidence type"
                value={subjectType}
                onChange={(event) => {
                  setSubjectType(event.target.value as EvidenceSubjectType);
                  setSaved(false);
                }}
              >
                {evidenceTypes.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="metric-label">Organization or group</span>
              <input
                className="input-shell mt-2"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                placeholder="Optional"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="metric-label">What did you do, know, earn, or accomplish?</span>
              <textarea
                className="input-shell mt-2 min-h-32 resize-y py-3"
                value={statement}
                onChange={(event) => {
                  setStatement(event.target.value);
                  setSaved(false);
                }}
                placeholder="Example: Coordinated weekly scheduling for six field technicians across three service areas."
              />
              <span className="mt-2 block text-xs text-[var(--color-text-muted)]">
                Write one factual statement. You can add another one next. Job Ranger will not inflate it into something you did not say.
              </span>
            </label>

            <label>
              <span className="metric-label">Role, project, credential, or item name</span>
              <input
                className="input-shell mt-2"
                value={titleOrName}
                onChange={(event) => setTitleOrName(event.target.value)}
                placeholder="Optional"
              />
            </label>

            <label>
              <span className="metric-label">Skills or tools demonstrated</span>
              <input
                className="input-shell mt-2"
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                placeholder="Optional, comma separated"
              />
            </label>

            <label>
              <span className="metric-label">Started</span>
              <input
                className="input-shell mt-2"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                placeholder="Optional, e.g. 2023 or Jan 2023"
              />
            </label>

            <label>
              <span className="metric-label">Ended</span>
              <input
                className="input-shell mt-2"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                placeholder="Optional or Present"
              />
            </label>
          </div>

          {subjectType === "credential" && (
            <section className="border-divider mt-7 border-t pt-6">
              <div>
                <h2 className="text-lg font-semibold">Credential details</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                  Add only what you know. Status and expiration can affect whether a credential actually establishes current eligibility; Job Ranger will not assume an old license is active.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label>
                  <span className="metric-label">Issuer</span>
                  <input
                    className="input-shell mt-2"
                    aria-label="Credential issuer"
                    value={credentialIssuer}
                    onChange={(event) => setCredentialIssuer(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  <span className="metric-label">Jurisdiction</span>
                  <input
                    className="input-shell mt-2"
                    aria-label="Credential jurisdiction"
                    value={credentialJurisdiction}
                    onChange={(event) => setCredentialJurisdiction(event.target.value)}
                    placeholder="Optional, e.g. Maryland"
                  />
                </label>
                <label>
                  <span className="metric-label">Status</span>
                  <select
                    className="select-shell mt-2"
                    aria-label="Credential status"
                    value={credentialStatus}
                    onChange={(event) => setCredentialStatus(event.target.value as CredentialStatus | "")}
                  >
                    <option value="">Not specified</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
                <label>
                  <span className="metric-label">Expiration date</span>
                  <input
                    className="input-shell mt-2"
                    aria-label="Credential expiration date"
                    type="date"
                    value={credentialExpiration}
                    onChange={(event) => setCredentialExpiration(event.target.value)}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="metric-label">Credential or license number</span>
                  <input
                    className="input-shell mt-2"
                    aria-label="Credential identifier"
                    value={credentialId}
                    onChange={(event) => setCredentialId(event.target.value)}
                    placeholder="Optional"
                    autoComplete="off"
                  />
                </label>
              </div>
            </section>
          )}

          <div className="border-divider mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <div className="text-sm text-[var(--color-text-secondary)]">
              {saved ? (
                <span className="inline-flex items-center gap-2 font-semibold text-[var(--color-success)]">
                  <Check className="h-4 w-4" /> Saved as user-authored evidence
                </span>
              ) : (
                "Nothing becomes a claim until you save it."
              )}
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSave()}
              disabled={evidence.busy}
            >
              <Plus className="h-4 w-4" />
              {evidence.busy ? "Saving..." : "Add career evidence"}
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="story-card">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--color-success)]" />
              <h2 className="text-xl font-semibold">You are the source</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              Facts entered here are stored as user-authored Career Evidence. They do not pretend to come from an imported document, and editing them keeps that authority state intact.
            </p>
          </div>

          <div className="story-card">
            <p className="story-kicker">Keep moving</p>
            <h2 className="story-title">Add as much as is useful today.</h2>
            <p className="story-copy">
              You can stop after one fact and continue searching. Career history is allowed to be incremental. Civilization survives.
            </p>
            <button type="button" className="secondary-button mt-5" onClick={finish}>
              Continue to Career Profile
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </aside>
      </section>
    </Layout>
  );
}
