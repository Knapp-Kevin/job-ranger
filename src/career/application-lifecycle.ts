import { useCallback, useEffect, useState } from "react";
import type {
  ApplicationContactInput,
  ApplicationEventInput,
  ApplicationEventUpdate,
  ApplicationLifecycle,
} from "../shared/application-lifecycle";
import { getDesktopApi } from "../services/api";

const emptyLifecycle = (applicationId: string): ApplicationLifecycle => ({
  applicationId,
  contacts: [],
  events: [],
  artifacts: [],
});

export function useApplicationLifecycle(applicationId: string, enabled = true) {
  const [lifecycle, setLifecycle] = useState<ApplicationLifecycle>(() =>
    emptyLifecycle(applicationId),
  );
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const next = await getDesktopApi().applicationLifecycle.get(applicationId);
      setLifecycle(next);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to load application details",
      );
    } finally {
      setLoading(false);
    }
  }, [applicationId, enabled]);

  useEffect(() => {
    setLifecycle(emptyLifecycle(applicationId));
    if (enabled) void refresh();
  }, [applicationId, enabled, refresh]);

  const runMutation = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      setBusy(true);
      setError(null);
      try {
        const result = await action();
        await refresh();
        return result;
      } catch (mutationError) {
        setError(
          mutationError instanceof Error ? mutationError.message : "Unable to update application",
        );
        throw mutationError;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    lifecycle,
    loading,
    busy,
    error,
    refresh,
    createContact: (input: ApplicationContactInput) =>
      runMutation(() =>
        getDesktopApi().applicationLifecycle.createContact(applicationId, input),
      ),
    updateContact: (contactId: string, input: ApplicationContactInput) =>
      runMutation(() => getDesktopApi().applicationLifecycle.updateContact(contactId, input)),
    deleteContact: (contactId: string) =>
      runMutation(() => getDesktopApi().applicationLifecycle.deleteContact(contactId)),
    createEvent: (input: ApplicationEventInput) =>
      runMutation(() =>
        getDesktopApi().applicationLifecycle.createEvent(applicationId, input),
      ),
    updateEvent: (eventId: string, update: ApplicationEventUpdate) =>
      runMutation(() => getDesktopApi().applicationLifecycle.updateEvent(eventId, update)),
    deleteEvent: (eventId: string) =>
      runMutation(() => getDesktopApi().applicationLifecycle.deleteEvent(eventId)),
  };
}
