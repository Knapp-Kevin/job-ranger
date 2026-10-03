import { useCallback, useEffect, useState } from "react";
import type {
  ApplicationInsightDetail,
  ApplicationOfferInput,
  SearchLearningSnapshot,
} from "../shared/application-insights";
import { getDesktopApi } from "../services/api";

export function useApplicationInsights(applicationId: string, enabled = true) {
  const [detail, setDetail] = useState<ApplicationInsightDetail | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setDetail(await getDesktopApi().applicationInsights.get(applicationId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load application context");
    } finally {
      setLoading(false);
    }
  }, [applicationId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setTargetTrack = useCallback(async (targetTrackId: string | null) => {
    setBusy(true);
    try {
      const searchContext = await getDesktopApi().applicationInsights.setTargetTrack(
        applicationId,
        targetTrackId,
      );
      setDetail((current) => current ? { ...current, searchContext } : current);
      setError(null);
      return searchContext;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to assign target track";
      setError(message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [applicationId]);

  const saveOffer = useCallback(async (input: ApplicationOfferInput) => {
    setBusy(true);
    try {
      const offer = await getDesktopApi().applicationInsights.saveOffer(applicationId, input);
      setDetail((current) => current ? { ...current, offer } : current);
      setError(null);
      return offer;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to save offer details";
      setError(message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [applicationId]);

  const deleteOffer = useCallback(async () => {
    setBusy(true);
    try {
      await getDesktopApi().applicationInsights.deleteOffer(applicationId);
      setDetail((current) => current ? { ...current, offer: null } : current);
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to remove offer details";
      setError(message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [applicationId]);

  return { detail, loading, busy, error, refresh, setTargetTrack, saveOffer, deleteOffer };
}

export function useSearchLearning() {
  const [snapshot, setSnapshot] = useState<SearchLearningSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await getDesktopApi().applicationInsights.getSearchLearning());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to summarize search history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snapshot, loading, error, refresh };
}
