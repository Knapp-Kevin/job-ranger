import type { ApplicationArtifactPurpose, ResumeArtifactFormat } from "./career-contracts.js";

export type ApplicationEventKind =
  | "follow-up"
  | "interview"
  | "deadline"
  | "offer"
  | "other";

export interface ApplicationContact {
  id: string;
  applicationId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationContactInput {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string;
}

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  kind: ApplicationEventKind;
  title: string;
  eventAt: string;
  reminderAt: string | null;
  completedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationEventInput {
  kind: ApplicationEventKind;
  title: string;
  eventAt: string;
  reminderAt?: string | null;
  notes?: string;
}

export interface ApplicationEventUpdate {
  kind?: ApplicationEventKind;
  title?: string;
  eventAt?: string;
  reminderAt?: string | null;
  completedAt?: string | null;
  notes?: string;
}

export interface ApplicationArtifactHistoryItem {
  linkId: string;
  applicationId: string;
  resumeArtifactId: string;
  projectionId: string;
  version: number;
  format: ResumeArtifactFormat;
  purpose: ApplicationArtifactPurpose;
  managedPath: string;
  contentHash: string;
  artifactCreatedAt: string;
  recordedAt: string;
}

export interface ApplicationLifecycle {
  applicationId: string;
  contacts: ApplicationContact[];
  events: ApplicationEvent[];
  artifacts: ApplicationArtifactHistoryItem[];
}

export interface ApplicationLifecycleDesktopApi {
  applicationLifecycle: {
    get: (applicationId: string) => Promise<ApplicationLifecycle>;
    createContact: (
      applicationId: string,
      input: ApplicationContactInput,
    ) => Promise<ApplicationContact>;
    updateContact: (
      contactId: string,
      input: ApplicationContactInput,
    ) => Promise<ApplicationContact>;
    deleteContact: (contactId: string) => Promise<void>;
    createEvent: (
      applicationId: string,
      input: ApplicationEventInput,
    ) => Promise<ApplicationEvent>;
    updateEvent: (
      eventId: string,
      update: ApplicationEventUpdate,
    ) => Promise<ApplicationEvent>;
    deleteEvent: (eventId: string) => Promise<void>;
  };
}
