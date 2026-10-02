import { useCallback, useEffect, useState } from "react";
import type {
  CareerTargetTrack,
  CareerTargetTrackInput,
} from "../shared/contracts";
import { getDesktopApi } from "../services/api";

export const emptyTargetTrackInput: CareerTargetTrackInput = {
  name: "",
  relation: "target",
  roleTitles: [],
  seniority: null,
  direction: null,
  constraints: {
    geography: { locations: [], radiusMiles: null, strength: "preferred" },
    workModes: { values: [], strength: "preferred" },
    employmentArrangements: { values: [], strength: "preferred" },
    compensation: {
      floor: null,
      target: null,
      basis: "annual",
      floorStrength: "preferred",
    },
    onCall: { value: "either", strength: "preferred" },
    industries: { values: [], strength: "preferred" },
  },
  isActive: true,
};

export function toTargetTrackInput(track: CareerTargetTrack): CareerTargetTrackInput {
  const normalizeStrength = (value: string) =>
    value === "required" || value === "target" ? value : "preferred";

  return {
    name: track.name,
    relation: track.relation,
    roleTitles: [...track.roleTitles],
    seniority: track.seniority,
    direction: track.direction,
    constraints: {
      geography: {
        ...track.constraints.geography,
        locations: [...track.constraints.geography.locations],
        strength: normalizeStrength(track.constraints.geography.strength),
      },
      workModes: {
        values: [...track.constraints.workModes.values],
        strength: normalizeStrength(track.constraints.workModes.strength),
      },
      employmentArrangements: {
        values: [...track.constraints.employmentArrangements.values],
        strength: normalizeStrength(track.constraints.employmentArrangements.strength),
      },
      compensation: {
        ...track.constraints.compensation,
        floorStrength: normalizeStrength(track.constraints.compensation.floorStrength),
      },
      onCall: {
        ...track.constraints.onCall,
        strength: normalizeStrength(track.constraints.onCall.strength),
      },
      industries: {
        values: [...track.constraints.industries.values],
        strength: normalizeStrength(track.constraints.industries.strength),
      },
    },
    isActive: track.isActive,
  };
}

export function useTargetTracks() {
  const [tracks, setTracks] = useState<CareerTargetTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getDesktopApi().career.listTargetTracks();
      setTracks(next);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to load target tracks",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (id: string | null, input: CareerTargetTrackInput) => {
      setBusy(true);
      setError(null);
      try {
        const saved = id
          ? await getDesktopApi().career.updateTargetTrack(id, input)
          : await getDesktopApi().career.createTargetTrack(input);
        await refresh();
        return saved;
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Unable to save target track",
        );
        throw saveError;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await getDesktopApi().career.deleteTargetTrack(id);
        await refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete target track",
        );
        throw deleteError;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return { tracks, loading, busy, error, refresh, save, remove };
}
