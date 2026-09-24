import { useCallback, useEffect, useState } from "react";
import type { Job } from "../types";

export type OnCallPreference = "yes" | "no" | "either";
export type PayBasis = "hourly" | "annual";
export type ApplicationStatus =
  | "interested"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface CareerProfile {
  version: 2;
  fullName: string;
  homeLocation: string;
  radiusMiles: number | null;
  minimumPay: number | null;
  payBasis: PayBasis;
  targetTitles: string[];
  skills: string[];
  certifications: string[];
  sectors: string[];
  onCallPreference: OnCallPreference;
  fullTimeOnly: boolean;
  updatedAt: string | null;
}

interface StoredCareerProfile extends Partial<CareerProfile> {
  minimumHourlyPay?: number | null;
  version?: number;
}

export interface TrackedApplication {
  id: string;
  jobId: string;
  title: string;
  companyName: string;
  url: string;
  status: ApplicationStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const profileKey = "job-ranger.career-profile.v1";
const applicationsKey = "job-ranger.applications.v1";
const profileEvent = "job-ranger:career-profile-changed";
const applicationsEvent = "job-ranger:applications-changed";

export const emptyCareerProfile: CareerProfile = {
  version: 2,
  fullName: "",
  homeLocation: "",
  radiusMiles: null,
  minimumPay: null,
  payBasis: "hourly",
  targetTitles: [],
  skills: [],
  certifications: [],
  sectors: [],
  onCallPreference: "either",
  fullTimeOnly: true,
  updatedAt: null,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function cleanList(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function normalizeCareerProfile(profile: CareerProfile): CareerProfile {
  const normalizedMinimumPay =
    profile.minimumPay === null || Number.isNaN(profile.minimumPay)
      ? null
      : profile.payBasis === "annual"
        ? Math.max(0, Math.round(profile.minimumPay))
        : Math.max(0, Math.round(profile.minimumPay * 100) / 100);

  return {
    ...profile,
    version: 2,
    fullName: profile.fullName.trim(),
    homeLocation: profile.homeLocation.trim(),
    radiusMiles:
      profile.radiusMiles === null || Number.isNaN(profile.radiusMiles)
        ? null
        : Math.max(0, Math.round(profile.radiusMiles)),
    minimumPay: normalizedMinimumPay,
    payBasis: profile.payBasis === "annual" ? "annual" : "hourly",
    targetTitles: cleanList(profile.targetTitles),
    skills: cleanList(profile.skills),
    certifications: cleanList(profile.certifications),
    sectors: cleanList(profile.sectors),
    updatedAt: new Date().toISOString(),
  };
}

export function loadCareerProfile(): CareerProfile {
  const stored = readJson<StoredCareerProfile>(profileKey, {});
  const { minimumHourlyPay: legacyMinimumHourlyPay, ...current } = stored;
  const minimumPay =
    typeof current.minimumPay === "number"
      ? current.minimumPay
      : typeof legacyMinimumHourlyPay === "number"
        ? legacyMinimumHourlyPay
        : null;

  return {
    ...emptyCareerProfile,
    ...current,
    version: 2,
    minimumPay,
    payBasis: current.payBasis === "annual" ? "annual" : "hourly",
    targetTitles: Array.isArray(current.targetTitles) ? current.targetTitles : [],
    skills: Array.isArray(current.skills) ? current.skills : [],
    certifications: Array.isArray(current.certifications) ? current.certifications : [],
    sectors: Array.isArray(current.sectors) ? current.sectors : [],
  };
}

export function saveCareerProfile(profile: CareerProfile): CareerProfile {
  const normalized = normalizeCareerProfile(profile);
  window.localStorage.setItem(profileKey, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(profileEvent));
  return normalized;
}

export function hasCareerProfile(profile: CareerProfile): boolean {
  return Boolean(profile.homeLocation || profile.targetTitles.length > 0 || profile.skills.length > 0);
}

export function useCareerProfile() {
  const [profile, setProfile] = useState<CareerProfile>(() => loadCareerProfile());

  useEffect(() => {
    const refresh = () => setProfile(loadCareerProfile());
    window.addEventListener("storage", refresh);
    window.addEventListener(profileEvent, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(profileEvent, refresh);
    };
  }, []);

  const save = useCallback((next: CareerProfile) => {
    const saved = saveCareerProfile(next);
    setProfile(saved);
    return saved;
  }, []);

  return { profile, save, configured: hasCareerProfile(profile) };
}

export function loadApplications(): TrackedApplication[] {
  const stored = readJson<TrackedApplication[]>(applicationsKey, []);
  return Array.isArray(stored) ? stored : [];
}

function writeApplications(applications: TrackedApplication[]): void {
  window.localStorage.setItem(applicationsKey, JSON.stringify(applications));
  window.dispatchEvent(new CustomEvent(applicationsEvent));
}

export function trackJob(job: Job, companyName: string): TrackedApplication {
  const current = loadApplications();
  const existing = current.find((application) => application.jobId === job.id);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const application: TrackedApplication = {
    id: `application-${job.id}`,
    jobId: job.id,
    title: job.title,
    companyName,
    url: job.url,
    status: "interested",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
  writeApplications([application, ...current]);
  return application;
}

export function useApplications() {
  const [applications, setApplications] = useState<TrackedApplication[]>(() => loadApplications());

  useEffect(() => {
    const refresh = () => setApplications(loadApplications());
    window.addEventListener("storage", refresh);
    window.addEventListener(applicationsEvent, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(applicationsEvent, refresh);
    };
  }, []);

  const update = useCallback((id: string, patch: Partial<Pick<TrackedApplication, "status" | "notes">>) => {
    const next = loadApplications().map((application) =>
      application.id === id
        ? { ...application, ...patch, updatedAt: new Date().toISOString() }
        : application,
    );
    writeApplications(next);
    setApplications(next);
  }, []);

  const remove = useCallback((id: string) => {
    const next = loadApplications().filter((application) => application.id !== id);
    writeApplications(next);
    setApplications(next);
  }, []);

  return { applications, update, remove };
}
