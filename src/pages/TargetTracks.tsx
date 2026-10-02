import { useEffect, useMemo, useState } from "react";
import { Compass, Plus, Save, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import {
  emptyTargetTrackInput,
  toTargetTrackInput,
  useTargetTracks,
} from "../career/target-tracks";
import type {
  CareerTargetTrack,
  CareerTargetTrackInput,
  EmploymentArrangement,
  PreferenceStrength,
  WorkMode,
} from "../shared/contracts";

const workModeOptions: Array<{ value: WorkMode; label: string }> = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
];

const arrangementOptions: Array<{
  value: EmploymentArrangement;
  label: string;
}> = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
  { value: "seasonal", label: "Seasonal" },
  { value: "other", label: "Other" },
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

function cloneEmpty(): CareerTargetTrackInput {
  return structuredClone(emptyTargetTrackInput);
}

function StrengthSelect({
  value,
  onChange,
  label,
}: {
  value: PreferenceStrength;
  onChange: (value: Exclude<PreferenceStrength, "unspecified">) => void;
  label: string;
}) {
  const normalized = value === "unspecified" ? "preferred" : value;
  return (
    <select
      className="select-shell w-full sm:w-auto sm:min-w-32"
      aria-label={label}
      value={normalized}
      onChange={(event) =>
        onChange(event.target.value as Exclude<PreferenceStrength, "unspecified">)
      }
    >
      <option value="required">Required</option>
      <option value="preferred">Preferred</option>
      <option value="target">Target</option>
    </select>
  );
}

function ToggleList<T extends string>({
  options,
  values,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  values: T[];
  onChange: (values: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <label
            key={option.value}
            className="panel panel-muted flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? Array.from(new Set([...values, option.value]))
                    : values.filter((value) => value !== option.value),
                )
              }
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export function TargetTracks() {
  const targetTracks = useTargetTracks();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CareerTargetTrackInput>(cloneEmpty);
  const [saved, setSaved] = useState(false);

  const editingTrack = useMemo(
    () => targetTracks.tracks.find((track) => track.id === editingId) ?? null,
    [editingId, targetTracks.tracks],
  );

  useEffect(() => {
    if (!editingId && targetTracks.tracks.length > 0) {
      const first = targetTracks.tracks[0];
      setEditingId(first.id);
      setDraft(toTargetTrackInput(first));
    }
  }, [editingId, targetTracks.tracks]);

  const startNew = () => {
    setEditingId(null);
    setDraft(cloneEmpty());
    setSaved(false);
  };

  const edit = (track: CareerTargetTrack) => {
    setEditingId(track.id);
    setDraft(toTargetTrackInput(track));
    setSaved(false);
  };

  const updateConstraints = <K extends keyof CareerTargetTrackInput["constraints"]>(
    key: K,
    value: CareerTargetTrackInput["constraints"][K],
  ) => {
    setDraft((current) => ({
      ...current,
      constraints: { ...current.constraints, [key]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    const result = await targetTracks.save(editingId, draft);
    setEditingId(result.id);
    setDraft(toTargetTrackInput(result));
    setSaved(true);
  };

  const handleDelete = async () => {
    if (!editingId || !editingTrack || editingTrack.origin !== "user") return;
    await targetTracks.remove(editingId);
    setEditingId(null);
    setDraft(cloneEmpty());
    setSaved(false);
  };

  return (
    <Layout>
      <section className="panel panel-strong px-6 py-7 sm:px-8">
        <span className="alpha-pill">
          <Compass className="h-3.5 w-3.5" />
          Search intent
        </span>
        <h1 className="page-title mt-4">Keep different career directions separate.</h1>
        <p className="page-copy">
          A target track describes one kind of search: the roles, work arrangement, location,
          and compensation rules that belong together. Create another track when those rules
          materially change. Leave fields empty when they do not matter.
        </p>
      </section>

      {targetTracks.error && (
        <section className="support-note mt-6 px-5 py-4 text-sm text-[var(--color-danger)]">
          {targetTracks.error}
        </section>
      )}

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="panel panel-strong p-4">
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <h2 className="text-lg font-semibold">Target tracks</h2>
            <button type="button" className="secondary-button" onClick={startNew}>
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {targetTracks.loading && (
              <p className="px-2 py-4 text-sm text-[var(--color-text-muted)]">Loading tracks...</p>
            )}
            {!targetTracks.loading && targetTracks.tracks.length === 0 && (
              <p className="px-2 py-4 text-sm leading-6 text-[var(--color-text-muted)]">
                No tracks yet. Create one for the first search direction you want Job Ranger to assess independently.
              </p>
            )}
            {targetTracks.tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => edit(track)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  editingId === track.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[var(--color-text-primary)]">{track.name}</span>
                  {!track.isActive && (
                    <span className="text-xs text-[var(--color-text-muted)]">Paused</span>
                  )}
                </div>
                <p className="mt-1 text-xs capitalize text-[var(--color-text-muted)]">
                  {track.relation} · {track.roleTitles.length} role{track.roleTitles.length === 1 ? "" : "s"}
                </p>
                {track.origin === "legacy-profile" && (
                  <p className="mt-2 text-xs font-semibold text-[var(--color-warning)]">
                    Imported from Career Profile
                  </p>
                )}
              </button>
            ))}
          </div>
        </aside>

        <div className="panel panel-strong p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="metric-label">
                {editingTrack ? "Edit track" : "New track"}
              </span>
              <h2 className="mt-2 text-2xl font-semibold">
                {editingTrack?.name || "Define a search direction"}
              </h2>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Active
            </label>
          </div>

          {editingTrack?.origin === "legacy-profile" && (
            <div className="support-note mt-5 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
              This track mirrors your older Career Profile settings. Saving changes here promotes it
              to an independent target track, after which Career Profile edits will no longer overwrite it.
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <label>
              <span className="metric-label">Track name</span>
              <input
                className="input-shell mt-2"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Primary search, Contract work, Career change..."
              />
            </label>
            <label>
              <span className="metric-label">Relationship to my career</span>
              <select
                className="select-shell mt-2"
                value={draft.relation}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    relation: event.target.value as CareerTargetTrackInput["relation"],
                  }))
                }
              >
                <option value="current">Current</option>
                <option value="target">Target</option>
                <option value="adjacent">Adjacent</option>
                <option value="stretch">Stretch</option>
              </select>
            </label>
          </div>

          <label className="mt-5 block">
            <span className="metric-label">Roles in this track</span>
            <textarea
              className="input-shell mt-2 min-h-28 resize-y py-3"
              value={draft.roleTitles.join("\n")}
              onChange={(event) =>
                setDraft((current) => ({ ...current, roleTitles: splitList(event.target.value) }))
              }
              placeholder={"Customer Success Manager\nImplementation Manager"}
            />
          </label>

          <div className="border-divider mt-7 border-t pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Where I can work</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Leave locations empty when geography does not constrain this track.</p>
              </div>
              <StrengthSelect
                label="Geography importance"
                value={draft.constraints.geography.strength}
                onChange={(strength) =>
                  updateConstraints("geography", { ...draft.constraints.geography, strength })
                }
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
              <textarea
                aria-label="Track locations"
                className="input-shell min-h-24 resize-y py-3"
                value={draft.constraints.geography.locations.join("\n")}
                onChange={(event) =>
                  updateConstraints("geography", {
                    ...draft.constraints.geography,
                    locations: splitList(event.target.value),
                  })
                }
                placeholder={"Annapolis, MD\nBaltimore, MD"}
              />
              <label>
                <span className="metric-label">Commute radius</span>
                <input
                  className="input-shell mt-2"
                  aria-label="Track commute radius"
                  type="number"
                  min="0"
                  value={draft.constraints.geography.radiusMiles ?? ""}
                  onChange={(event) =>
                    updateConstraints("geography", {
                      ...draft.constraints.geography,
                      radiusMiles: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder="Miles"
                />
              </label>
            </div>
          </div>

          <div className="border-divider mt-7 border-t pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Work mode</h3>
              <StrengthSelect
                label="Work mode importance"
                value={draft.constraints.workModes.strength}
                onChange={(strength) =>
                  updateConstraints("workModes", { ...draft.constraints.workModes, strength })
                }
              />
            </div>
            <div className="mt-4">
              <ToggleList
                options={workModeOptions}
                values={draft.constraints.workModes.values}
                onChange={(values) =>
                  updateConstraints("workModes", { ...draft.constraints.workModes, values })
                }
              />
            </div>
          </div>

          <div className="border-divider mt-7 border-t pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Employment arrangement</h3>
              <StrengthSelect
                label="Employment arrangement importance"
                value={draft.constraints.employmentArrangements.strength}
                onChange={(strength) =>
                  updateConstraints("employmentArrangements", {
                    ...draft.constraints.employmentArrangements,
                    strength,
                  })
                }
              />
            </div>
            <div className="mt-4">
              <ToggleList
                options={arrangementOptions}
                values={draft.constraints.employmentArrangements.values}
                onChange={(values) =>
                  updateConstraints("employmentArrangements", {
                    ...draft.constraints.employmentArrangements,
                    values,
                  })
                }
              />
            </div>
          </div>

          <div className="border-divider mt-7 border-t pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Compensation</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">A floor is the minimum you will accept. A target is where you would like to land.</p>
              </div>
              <StrengthSelect
                label="Compensation floor importance"
                value={draft.constraints.compensation.floorStrength}
                onChange={(floorStrength) =>
                  updateConstraints("compensation", {
                    ...draft.constraints.compensation,
                    floorStrength,
                  })
                }
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label>
                <span className="metric-label">Floor</span>
                <input
                  className="input-shell mt-2"
                  aria-label="Compensation floor"
                  type="number"
                  min="0"
                  value={draft.constraints.compensation.floor ?? ""}
                  onChange={(event) =>
                    updateConstraints("compensation", {
                      ...draft.constraints.compensation,
                      floor: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
              </label>
              <label>
                <span className="metric-label">Target</span>
                <input
                  className="input-shell mt-2"
                  aria-label="Compensation target"
                  type="number"
                  min="0"
                  value={draft.constraints.compensation.target ?? ""}
                  onChange={(event) =>
                    updateConstraints("compensation", {
                      ...draft.constraints.compensation,
                      target: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
              </label>
              <label>
                <span className="metric-label">Basis</span>
                <select
                  className="select-shell mt-2"
                  aria-label="Track pay basis"
                  value={draft.constraints.compensation.basis}
                  onChange={(event) =>
                    updateConstraints("compensation", {
                      ...draft.constraints.compensation,
                      basis: event.target.value as CareerTargetTrackInput["constraints"]["compensation"]["basis"],
                    })
                  }
                >
                  <option value="annual">Per year</option>
                  <option value="hourly">Per hour</option>
                </select>
              </label>
            </div>
          </div>

          <details className="border-divider mt-7 border-t pt-6">
            <summary className="cursor-pointer text-lg font-semibold">Optional context</summary>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">Only add these when they matter to this particular search direction.</p>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <label>
                <span className="metric-label">Seniority</span>
                <input
                  className="input-shell mt-2"
                  value={draft.seniority ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, seniority: event.target.value || null }))
                  }
                  placeholder="Senior, lead, entry-level..."
                />
              </label>
              <label>
                <span className="metric-label">Career direction</span>
                <input
                  className="input-shell mt-2"
                  value={draft.direction ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, direction: event.target.value || null }))
                  }
                  placeholder="Move toward people leadership..."
                />
              </label>
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="metric-label">Industries or settings</span>
                <StrengthSelect
                  label="Industry importance"
                  value={draft.constraints.industries.strength}
                  onChange={(strength) =>
                    updateConstraints("industries", { ...draft.constraints.industries, strength })
                  }
                />
              </div>
              <textarea
                className="input-shell mt-2 min-h-24 resize-y py-3"
                aria-label="Track industries"
                value={draft.constraints.industries.values.join("\n")}
                onChange={(event) =>
                  updateConstraints("industries", {
                    ...draft.constraints.industries,
                    values: splitList(event.target.value),
                  })
                }
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label>
                <span className="metric-label">After-hours or on-call</span>
                <select
                  className="select-shell mt-2"
                  aria-label="Track on-call preference"
                  value={draft.constraints.onCall.value}
                  onChange={(event) =>
                    updateConstraints("onCall", {
                      ...draft.constraints.onCall,
                      value: event.target.value as CareerTargetTrackInput["constraints"]["onCall"]["value"],
                    })
                  }
                >
                  <option value="either">No preference</option>
                  <option value="yes">Okay with it</option>
                  <option value="no">Avoid it</option>
                </select>
              </label>
              <StrengthSelect
                label="On-call importance"
                value={draft.constraints.onCall.strength}
                onChange={(strength) =>
                  updateConstraints("onCall", { ...draft.constraints.onCall, strength })
                }
              />
            </div>
          </details>

          <div className="border-divider mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <div>
              {saved && (
                <span className="text-sm font-semibold text-[var(--color-success)]">Saved</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {editingTrack?.origin === "user" && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleDelete()}
                  disabled={targetTracks.busy}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSave()}
                disabled={targetTracks.busy || !draft.name.trim()}
              >
                <Save className="h-4 w-4" />
                {targetTracks.busy ? "Saving..." : "Save target track"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
