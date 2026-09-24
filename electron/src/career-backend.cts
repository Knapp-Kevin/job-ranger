import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ApplicationUpdate,
  CareerProfile,
  LegacyCareerMigration,
  TrackedApplication,
} from "../../src/shared/contracts.js";
import { CareerRepository } from "./career-repository.cjs";
import { SqliteClient } from "./sqlite.cjs";

interface CareerBackendOptions {
  dataDirectory: string;
  databasePath: string;
  sqliteBinaryPath: string;
}

function cleanList(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function normalizeProfile(profile: CareerProfile): CareerProfile {
  const minimumPay =
    profile.minimumPay === null || Number.isNaN(profile.minimumPay)
      ? null
      : profile.payBasis === "annual"
        ? Math.max(0, Math.round(profile.minimumPay))
        : Math.max(0, Math.round(profile.minimumPay * 100) / 100);

  return {
    version: 2,
    fullName: profile.fullName.trim(),
    homeLocation: profile.homeLocation.trim(),
    radiusMiles:
      profile.radiusMiles === null || Number.isNaN(profile.radiusMiles)
        ? null
        : Math.max(0, Math.round(profile.radiusMiles)),
    minimumPay,
    payBasis: profile.payBasis === "annual" ? "annual" : "hourly",
    targetTitles: cleanList(profile.targetTitles),
    skills: cleanList(profile.skills),
    certifications: cleanList(profile.certifications),
    sectors: cleanList(profile.sectors),
    onCallPreference: profile.onCallPreference,
    fullTimeOnly: profile.fullTimeOnly,
    updatedAt: new Date().toISOString(),
  };
}

export class CareerBackend {
  private readonly sqlite: SqliteClient;
  private readonly repository: CareerRepository;
  private readonly artifactsDirectory: string;

  constructor(private readonly options: CareerBackendOptions) {
    this.sqlite = new SqliteClient(
      options.databasePath,
      options.sqliteBinaryPath,
    );
    this.repository = new CareerRepository(this.sqlite);
    this.artifactsDirectory = path.join(options.dataDirectory, "artifacts");
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.artifactsDirectory, { recursive: true });
  }

  getArtifactDirectory(): string {
    return this.artifactsDirectory;
  }

  async getProfile(): Promise<CareerProfile | null> {
    return this.repository.getProfile();
  }

  async saveProfile(profile: CareerProfile): Promise<CareerProfile> {
    return this.repository.saveProfile(normalizeProfile(profile));
  }

  async listApplications(): Promise<TrackedApplication[]> {
    return this.repository.listApplications();
  }

  async trackApplication(jobId: string): Promise<TrackedApplication> {
    return this.repository.createApplicationFromJob(jobId);
  }

  async updateApplication(
    id: string,
    update: ApplicationUpdate,
  ): Promise<TrackedApplication> {
    return this.repository.updateApplication(id, update);
  }

  async deleteApplication(id: string): Promise<void> {
    await this.repository.deleteApplication(id);
  }

  async migrateLegacy(payload: LegacyCareerMigration): Promise<void> {
    const existingProfile = await this.repository.getProfile();
    if (!existingProfile && payload.profile) {
      await this.repository.saveProfile(normalizeProfile(payload.profile));
    }

    for (const application of payload.applications) {
      await this.repository.importLegacyApplication(application);
    }
  }
}
