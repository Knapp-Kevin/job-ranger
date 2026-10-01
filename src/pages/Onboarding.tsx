import { useEffect, useState } from "react";
import {
  ArrowRight,
  Compass,
  FileUp,
  PencilLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useCareerEvidence } from "../career/evidence";
import { useOnboardingPreference } from "../career/onboarding";
import type { CareerProfile, PayBasis } from "../career/storage";

interface OnboardingProps {
  profile: CareerProfile;
  saveProfile: (profile: CareerProfile) => Promise<CareerProfile>;
}

function splitTargets(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function Onboarding({ profile, saveProfile }: OnboardingProps) {
  const navigate = useNavigate();
  const evidence = useCareerEvidence();
  const { dismiss } = useOnboardingPreference();
  const [targetText, setTargetText] = useState(profile.targetTitles.join("\n"));
  const [homeLocation, setHomeLocation] = useState(profile.homeLocation);
  const [minimumPay, setMinimumPay] = useState(
    profile.minimumPay === null ? "" : String(profile.minimumPay),
  );
  const [payBasis, setPayBasis] = useState<PayBasis>(profile.payBasis);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetText(profile.targetTitles.join("\n"));
    setHomeLocation(profile.homeLocation);
    setMinimumPay(profile.minimumPay === null ? "" : String(profile.minimumPay));
    setPayBasis(profile.payBasis);
  }, [profile]);

  const finish = (destination = "/") => {
    dismiss();
    navigate(destination);
  };

  const handleResumeFirst = async () => {
    setError(null);
    try {
      const result = await evidence.importFile();
      if (result) {
        finish("/career-profile");
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import resume");
    }
  };

  const handleGoalFirst = async () => {
    const targets = splitTargets(targetText);
    if (targets.length === 0) {
      setError("Add at least one kind of work you want to pursue.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const parsedMinimumPay = minimumPay.trim() ? Number(minimumPay) : null;
      if (parsedMinimumPay !== null && (!Number.isFinite(parsedMinimumPay) || parsedMinimumPay < 0)) {
        setError("Minimum pay must be a non-negative number.");
        return;
      }

      await saveProfile({
        ...profile,
        homeLocation,
        minimumPay: parsedMinimumPay,
        payBasis,
        targetTitles: targets,
      });
      finish();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your starting goals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <section className="panel panel-strong overflow-hidden px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="alpha-pill">
              <Sparkles className="h-3.5 w-3.5" />
              First run
            </span>
            <h1 className="page-title mt-4">Start with what you already have.</h1>
            <p className="page-copy">
              You do not need a complete profile before Job Ranger becomes useful. Start from a resume, enter your background yourself, or just tell Job Ranger what kind of work you want. You can fill in the rest as the search develops.
            </p>
          </div>
          <button
            type="button"
            className="surface-link-button text-sm font-semibold text-[var(--color-text-secondary)]"
            onClick={() => finish()}
          >
            Skip setup for now
          </button>
        </div>
      </section>

      {(error || evidence.error) && (
        <section className="support-note mt-6 px-5 py-4 text-sm text-[var(--color-danger)]">
          {error ?? evidence.error}
        </section>
      )}

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <article className="story-card flex flex-col">
          <div className="flex items-center gap-3">
            <FileUp className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="story-kicker">Resume first</p>
          </div>
          <h2 className="story-title mt-3">I already have a resume</h2>
          <p className="story-copy flex-1">
            Import the document you already use. Job Ranger preserves the source, extracts career evidence locally, and asks you to review proposed facts before they become authoritative.
          </p>
          <button
            type="button"
            className="primary-button mt-5 w-fit"
            onClick={() => void handleResumeFirst()}
            disabled={evidence.busy}
          >
            <FileUp className="h-4 w-4" />
            {evidence.busy ? "Importing..." : "Import a resume"}
          </button>
        </article>

        <article className="story-card flex flex-col">
          <div className="flex items-center gap-3">
            <PencilLine className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="story-kicker">Build it myself</p>
          </div>
          <h2 className="story-title mt-3">I do not have a resume handy</h2>
          <p className="story-copy flex-1">
            Start with the experience, skills, credentials, projects, and preferences that matter to you. Irrelevant sections can stay empty, because apparently forms are allowed to serve people rather than the reverse.
          </p>
          <button
            type="button"
            className="secondary-button mt-5 w-fit"
            onClick={() => finish("/career-profile")}
          >
            Enter my background
            <ArrowRight className="h-4 w-4" />
          </button>
        </article>

        <article className="story-card flex flex-col">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="story-kicker">Goals first</p>
          </div>
          <h2 className="story-title mt-3">I know what I want to look for</h2>
          <p className="story-copy">
            Give Job Ranger enough direction to start. These are search goals and preferences, not claims about experience.
          </p>

          <div className="mt-5 space-y-4">
            <label>
              <span className="metric-label">Work I want to pursue</span>
              <textarea
                className="input-shell mt-2 min-h-24 resize-y py-3"
                value={targetText}
                onChange={(event) => setTargetText(event.target.value)}
                placeholder={"One role or direction per line\nAdjacent role\nStretch role"}
              />
            </label>
            <label>
              <span className="metric-label">Home area</span>
              <input
                className="input-shell mt-2"
                value={homeLocation}
                onChange={(event) => setHomeLocation(event.target.value)}
                placeholder="Optional city, state, or region"
              />
            </label>
            <label>
              <span className="metric-label">Minimum pay</span>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  className="input-shell"
                  type="number"
                  min="0"
                  step={payBasis === "hourly" ? "0.50" : "1000"}
                  value={minimumPay}
                  onChange={(event) => setMinimumPay(event.target.value)}
                  placeholder={payBasis === "hourly" ? "Optional" : "Optional annual minimum"}
                />
                <select
                  className="select-shell w-auto min-w-28"
                  aria-label="Onboarding pay basis"
                  value={payBasis}
                  onChange={(event) => setPayBasis(event.target.value as PayBasis)}
                >
                  <option value="hourly">per hour</option>
                  <option value="annual">per year</option>
                </select>
              </div>
            </label>
          </div>

          <button
            type="button"
            className="primary-button mt-5 w-fit"
            onClick={() => void handleGoalFirst()}
            disabled={saving}
          >
            <Compass className="h-4 w-4" />
            {saving ? "Saving..." : "Save goals and continue"}
          </button>
        </article>
      </section>

      <section className="support-note mt-6 flex items-start gap-3 px-5 py-4 text-sm text-[var(--color-text-secondary)]">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-success)]" />
        <p>
          Your actual career facts still live in Career Evidence, and imported statements remain proposals until you confirm them. First-run setup is guidance, not a second profile database.
        </p>
      </section>
    </Layout>
  );
}
