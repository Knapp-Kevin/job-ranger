import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CandidateEvidence,
  CandidateEvidenceReviewItem,
  EvidenceReviewUpdate,
  PastedResumeInput,
  ResumeImportResult,
  SourceArtifact,
} from "../shared/contracts";
import { getDesktopApi } from "../services/api";

const evidenceEvent = "job-ranger:career-evidence-changed";

export function useCareerEvidence() {
  const [artifacts, setArtifacts] = useState<SourceArtifact[]>([]);
  const [items, setItems] = useState<CandidateEvidenceReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<ResumeImportResult | null>(null);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshSequence.current;
    try {
      const [nextArtifacts, nextItems] = await Promise.all([
        getDesktopApi().career.listSourceArtifacts(),
        getDesktopApi().career.listEvidence(),
      ]);
      if (requestId !== refreshSequence.current) return;
      setArtifacts(nextArtifacts);
      setItems(nextItems);
      setError(null);
    } catch (refreshError) {
      if (requestId !== refreshSequence.current) return;
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to load career evidence",
      );
    } finally {
      if (requestId === refreshSequence.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handleChange = () => void refresh();
    window.addEventListener(evidenceEvent, handleChange);
    return () => window.removeEventListener(evidenceEvent, handleChange);
  }, [refresh]);

  const runImport = useCallback(
    async (operation: () => Promise<ResumeImportResult | null>) => {
      setBusy(true);
      setError(null);
      try {
        const result = await operation();
        if (result) {
          setLastImport(result);
          await refresh();
          window.dispatchEvent(new CustomEvent(evidenceEvent));
        }
        return result;
      } catch (importError) {
        setError(
          importError instanceof Error
            ? importError.message
            : "Unable to import career evidence",
        );
        throw importError;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const importFile = useCallback(
    () => runImport(() => getDesktopApi().career.selectResumeImport()),
    [runImport],
  );

  const importPastedText = useCallback(
    (input: PastedResumeInput) =>
      runImport(() => getDesktopApi().career.importPastedText(input)),
    [runImport],
  );

  const review = useCallback(
    async (id: string, update: EvidenceReviewUpdate) => {
      setBusy(true);
      setError(null);
      try {
        const reviewed = await getDesktopApi().career.reviewEvidence(id, update);

        // The backend write is authoritative. Reflect that returned state immediately
        // instead of making the user wait for a second IPC round trip before the
        // review queue changes. A canonical refresh still follows to reconcile source
        // metadata and any concurrent changes.
        setItems((current) =>
          current.map((item) =>
            item.evidence.id === reviewed.id
              ? { ...item, evidence: reviewed }
              : item,
          ),
        );

        await refresh();
        window.dispatchEvent(new CustomEvent(evidenceEvent));
        return reviewed;
      } catch (reviewError) {
        setError(
          reviewError instanceof Error
            ? reviewError.message
            : "Unable to review career evidence",
        );
        throw reviewError;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const merge = useCallback(
    async (sourceId: string, targetId: string) => {
      setBusy(true);
      setError(null);
      try {
        const merged = await getDesktopApi().career.mergeEvidence(sourceId, targetId);
        await refresh();
        window.dispatchEvent(new CustomEvent(evidenceEvent));
        return merged;
      } catch (mergeError) {
        setError(
          mergeError instanceof Error
            ? mergeError.message
            : "Unable to merge career evidence",
        );
        throw mergeError;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const pending = useMemo(
    () => items.filter(({ evidence }) => evidence.verificationState === "imported"),
    [items],
  );

  const confirmed = useMemo(
    () =>
      items.filter(
        ({ evidence }) =>
          evidence.verificationState === "user-confirmed" ||
          evidence.verificationState === "user-authored",
      ),
    [items],
  );

  const rejected = useMemo(
    () => items.filter(({ evidence }) => evidence.verificationState === "rejected"),
    [items],
  );

  return {
    artifacts,
    items,
    pending,
    confirmed,
    rejected,
    loading,
    busy,
    error,
    lastImport,
    refresh,
    importFile,
    importPastedText,
    review,
    merge,
  };
}

export type CareerEvidenceRecord = CandidateEvidence;
