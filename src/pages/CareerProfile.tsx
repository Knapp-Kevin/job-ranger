import { useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, Compass, MapPin, Save, Sparkles } from "lucide-react";
import { Layout } from "../components/Layout";
import {
  emptyCareerProfile,
  type CareerProfile as CareerProfileValue,
  useCareerProfile,
} from "../career/storage";

function splitLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]): string {
  return values.join("\n");
}

export function CareerProfile() {
  const { profile, save } = useCareerProfile();
  const [draft, setDraft] = useState<CareerProfileValue>(profile);
  const [saved, setSaved] = useState(false);

  const targetText = useMemo(() => joinLines(draft.targetTitles), [draft.targetTitles]);
  const skillText = useMemo(() => joinLines(draft.skills), [draft.skills]);
  const certificationText = useMemo(() => joinLines(draft.certifications), [draft.certifications]);
  const sectorText = useMemo(() => joinLines(draft.sectors), [draft.sectors]);

  const update = <K extends keyof CareerProfileValue,>(key: K, value: CareerProfileValue[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const reset = () => {
    setDraft(emptyCareerProfile);
    setSaved(false);
  };

  const handleSave = () => {
    const next = save(draft);
    setDraft(next);
    setSaved(true);
  };

  return (
    <Layout>
      <section className="panel panel-strong px-6 py-7 sm:px-8">
        <span className="alpha-pill">
          <Sparkles className="h-3.5 w-3.5" />
          Start here
        </span>
        <h1 className="page-title mt-4">Tell Job Ranger what good work looks like for you.</h1>
        <p className="page-copy">
          No technical setup. Add the work you want, where you can work, what you already know, and what matters to you. Job Ranger uses this only on your device to explain which listings look worth your time.
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-5">
          <div className="story-card">
            <div className="flex items-center gap-3">
              <Compass className="h-5 w-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-semibold">Broaden the search, not your résumé</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              Start with roles you already understand, then add adjacent or stretch roles you would genuinely consider. Target roles guide discovery. They never become claims about experience you do not have.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>Add the role you do now or have done before.</li>
              <li>Add nearby roles that use the same strengths in a different setting.</li>
              <li>Add reasonable stretch roles you could grow into.</li>
            </ul>
          </div>

          <div className="story-card">
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-5 w-5 text-[var(--color-success)]" />
              <h2 className="text-xl font-semibold">What stays yours</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
              <li>Your career profile is stored locally in this app.</li>
              <li>Job Ranger never invents credentials, skills, or experience for you.</li>
              <li>The first match score is deterministic. No AI account is required.</li>
            </ul>
          </div>
        </aside>

        <div className="panel panel-strong p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label>
              <span className="metric-label">Your name</span>
              <input
                className="input-shell mt-2"
                value={draft.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                placeholder="Optional"
              />
            </label>

            <label>
              <span className="metric-label">Home area</span>
              <div className="relative mt-2">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  className="input-shell pl-11"
                  value={draft.homeLocation}
                  onChange={(event) => update("homeLocation", event.target.value)}
                  placeholder="City, state, or region"
                />
              </div>
            </label>

            <label>
              <span className="metric-label">Maximum commute</span>
              <div className="relative mt-2">
                <input
                  className="input-shell pr-16"
                  type="number"
                  min="0"
                  value={draft.radiusMiles ?? ""}
                  onChange={(event) =>
                    update("radiusMiles", event.target.value ? Number(event.target.value) : null)
                  }
                  placeholder="30"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">
                  miles
                </span>
              </div>
              <span className="mt-2 block text-xs text-[var(--color-text-muted)]">
                Saved as a preference. Current matching uses the listed city/area until distance data is available.
              </span>
            </label>

            <label>
              <span className="metric-label">Minimum pay</span>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">$</span>
                  <input
                    className="input-shell pl-8"
                    type="number"
                    min="0"
                    step={draft.payBasis === "hourly" ? "0.50" : "1000"}
                    value={draft.minimumPay ?? ""}
                    onChange={(event) =>
                      update("minimumPay", event.target.value ? Number(event.target.value) : null)
                    }
                    placeholder={draft.payBasis === "hourly" ? "30" : "75000"}
                  />
                </div>
                <select
                  className="select-shell w-auto min-w-28"
                  aria-label="Pay basis"
                  value={draft.payBasis}
                  onChange={(event) =>
                    update("payBasis", event.target.value as CareerProfileValue["payBasis"])
                  }
                >
                  <option value="hourly">per hour</option>
                  <option value="annual">per year</option>
                </select>
              </div>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label>
              <span className="metric-label">Roles you would consider</span>
              <textarea
                className="input-shell mt-2 min-h-36 resize-y py-3"
                value={targetText}
                onChange={(event) => update("targetTitles", splitLines(event.target.value))}
                placeholder={"Current or preferred role\nAdjacent role\nStretch role"}
              />
              <span className="mt-2 block text-xs text-[var(--color-text-muted)]">
                One title per line. Include adjacent roles that genuinely fit your interests and transferable strengths.
              </span>
            </label>

            <label>
              <span className="metric-label">Skills you already use</span>
              <textarea
                className="input-shell mt-2 min-h-36 resize-y py-3"
                value={skillText}
                onChange={(event) => update("skills", splitLines(event.target.value))}
                placeholder={"customer service\ntroubleshooting\nproject coordination"}
              />
              <span className="mt-2 block text-xs text-[var(--color-text-muted)]">Only list work you can defend in an interview.</span>
            </label>

            <label>
              <span className="metric-label">Certifications and licenses</span>
              <textarea
                className="input-shell mt-2 min-h-32 resize-y py-3"
                value={certificationText}
                onChange={(event) => update("certifications", splitLines(event.target.value))}
                placeholder={"Professional license\nIndustry certification\nSafety training"}
              />
              <span className="mt-2 block text-xs text-[var(--color-text-muted)]">Optional. Leave this blank if credentials are not important in your field.</span>
            </label>

            <label>
              <span className="metric-label">Industries or work settings you prefer</span>
              <textarea
                className="input-shell mt-2 min-h-32 resize-y py-3"
                value={sectorText}
                onChange={(event) => update("sectors", splitLines(event.target.value))}
                placeholder={"Industry\nWork environment\nSpecialty area"}
              />
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label>
              <span className="metric-label">After-hours or on-call work</span>
              <select
                className="select-shell mt-2"
                value={draft.onCallPreference}
                onChange={(event) => update("onCallPreference", event.target.value as CareerProfileValue["onCallPreference"])}
              >
                <option value="either">No preference</option>
                <option value="yes">Okay with it</option>
                <option value="no">Prefer to avoid it</option>
              </select>
              <span className="mt-2 block text-xs text-[var(--color-text-muted)]">Optional preference for roles where after-hours availability matters.</span>
            </label>

            <label className="panel panel-muted flex items-center gap-3 rounded-2xl px-4 py-3 sm:mt-6">
              <input
                type="checkbox"
                checked={draft.fullTimeOnly}
                onChange={(event) => update("fullTimeOnly", event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">Show full-time work as the default fit</span>
            </label>
          </div>

          <div className="border-divider mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <button type="button" className="surface-link-button text-sm font-semibold text-[var(--color-text-secondary)]" onClick={reset}>
              Clear form
            </button>
            <div className="flex items-center gap-3">
              {saved && <span className="text-sm font-semibold text-[var(--color-success)]">Saved on this device</span>}
              <button type="button" className="primary-button" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save career profile
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="support-note mt-6 flex items-start gap-3 px-5 py-4 text-sm text-[var(--color-text-secondary)]">
        <BriefcaseBusiness className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-primary)]" />
        <p>
          Next, open Find Jobs. Listings will show plain-language fit guidance based only on the information you saved here and the job data Job Ranger has actually collected.
        </p>
      </section>
    </Layout>
  );
}
