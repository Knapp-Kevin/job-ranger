import { useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, MapPin, Save, Sparkles, Wrench } from "lucide-react";
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

const hvacTargets = [
  "HVAC Service Technician",
  "Commercial HVAC Technician",
  "HVAC/R Technician",
  "Facilities HVAC Technician",
];

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

  const applyHvacStarter = () => {
    setDraft((current) => ({
      ...current,
      targetTitles: hvacTargets,
      sectors: current.sectors.length > 0 ? current.sectors : ["Commercial", "Residential"],
    }));
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
          No technical setup. Add the jobs you want, where you can work, and the experience you already have. Job Ranger uses this only on your device to explain which listings look worth your time.
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-5">
          <div className="story-card">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-semibold">HVAC starter</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              This adds common HVAC job titles to your search targets. It does not claim any certification, license, or skill you have not entered yourself.
            </p>
            <button type="button" className="secondary-button mt-4" onClick={applyHvacStarter}>
              Use HVAC job targets
            </button>
          </div>

          <div className="story-card">
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-5 w-5 text-[var(--color-success)]" />
              <h2 className="text-xl font-semibold">What stays yours</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
              <li>Your career profile is stored locally in this app.</li>
              <li>Job Ranger never invents credentials or experience for you.</li>
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
                  placeholder="Stevensville, MD"
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
                  placeholder="35"
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
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">$</span>
                <input
                  className="input-shell pl-8 pr-16"
                  type="number"
                  min="0"
                  step="0.50"
                  value={draft.minimumHourlyPay ?? ""}
                  onChange={(event) =>
                    update("minimumHourlyPay", event.target.value ? Number(event.target.value) : null)
                  }
                  placeholder="30"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">/hr</span>
              </div>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label>
              <span className="metric-label">Jobs you want</span>
              <textarea
                className="input-shell mt-2 min-h-36 resize-y py-3"
                value={targetText}
                onChange={(event) => update("targetTitles", splitLines(event.target.value))}
                placeholder={"HVAC Service Technician\nCommercial HVAC Technician"}
              />
              <span className="mt-2 block text-xs text-[var(--color-text-muted)]">One title per line.</span>
            </label>

            <label>
              <span className="metric-label">Skills you already use</span>
              <textarea
                className="input-shell mt-2 min-h-36 resize-y py-3"
                value={skillText}
                onChange={(event) => update("skills", splitLines(event.target.value))}
                placeholder={"heat pumps\nelectrical troubleshooting\nrooftop units"}
              />
              <span className="mt-2 block text-xs text-[var(--color-text-muted)]">Only list work you can defend in an interview.</span>
            </label>

            <label>
              <span className="metric-label">Certifications and licenses</span>
              <textarea
                className="input-shell mt-2 min-h-32 resize-y py-3"
                value={certificationText}
                onChange={(event) => update("certifications", splitLines(event.target.value))}
                placeholder={"EPA 608 Universal\nOSHA 10"}
              />
            </label>

            <label>
              <span className="metric-label">Work you prefer</span>
              <textarea
                className="input-shell mt-2 min-h-32 resize-y py-3"
                value={sectorText}
                onChange={(event) => update("sectors", splitLines(event.target.value))}
                placeholder={"Commercial\nResidential\nFacilities"}
              />
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label>
              <span className="metric-label">On-call work</span>
              <select
                className="select-shell mt-2"
                value={draft.onCallPreference}
                onChange={(event) => update("onCallPreference", event.target.value as CareerProfileValue["onCallPreference"])}
              >
                <option value="either">No preference</option>
                <option value="yes">Okay with on-call work</option>
                <option value="no">Avoid on-call work</option>
              </select>
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
          Next, open Find Jobs. Listings will show a plain-language fit score based only on the information you saved here and the job data Job Ranger has actually collected.
        </p>
      </section>
    </Layout>
  );
}
