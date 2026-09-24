import type {
  ApplicationUpdate,
  CareerProfile,
  TrackedApplication,
} from "../../src/shared/contracts.js";
import { sql, SqliteClient } from "./sqlite.cjs";

type CareerProfileRow = {
  id: number;
  version: number;
  full_name: string;
  home_location: string;
  radius_miles: number | null;
  minimum_pay: number | null;
  pay_basis: CareerProfile["payBasis"];
  target_titles: string;
  skills: string;
  certifications: string;
  sectors: string;
  on_call_preference: CareerProfile["onCallPreference"];
  full_time_only: number;
  updated_at: string | null;
};

type ApplicationRow = {
  id: string;
  job_id: string;
  title: string;
  company_name: string;
  url: string;
  status: TrackedApplication["status"];
  notes: string;
  created_at: string;
  updated_at: string;
};

type JobSnapshotRow = {
  job_id: string;
  title: string;
  company_name: string;
  url: string;
};

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function mapProfile(row: CareerProfileRow): CareerProfile {
  return {
    version: 2,
    fullName: row.full_name,
    homeLocation: row.home_location,
    radiusMiles: row.radius_miles,
    minimumPay: row.minimum_pay,
    payBasis: row.pay_basis === "annual" ? "annual" : "hourly",
    targetTitles: parseStringArray(row.target_titles),
    skills: parseStringArray(row.skills),
    certifications: parseStringArray(row.certifications),
    sectors: parseStringArray(row.sectors),
    onCallPreference:
      row.on_call_preference === "yes" || row.on_call_preference === "no"
        ? row.on_call_preference
        : "either",
    fullTimeOnly: Boolean(row.full_time_only),
    updatedAt: row.updated_at,
  };
}

function mapApplication(row: ApplicationRow): TrackedApplication {
  return {
    id: row.id,
    jobId: row.job_id,
    title: row.title,
    companyName: row.company_name,
    url: row.url,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CareerRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  async getProfile(): Promise<CareerProfile | null> {
    const row = await this.sqlite.queryOne<CareerProfileRow>(
      "SELECT * FROM career_profile WHERE id = 1 LIMIT 1;",
    );
    return row ? mapProfile(row) : null;
  }

  async saveProfile(profile: CareerProfile): Promise<CareerProfile> {
    const row = await this.sqlite.queryOne<CareerProfileRow>(sql`
      INSERT INTO career_profile (
        id,
        version,
        full_name,
        home_location,
        radius_miles,
        minimum_pay,
        pay_basis,
        target_titles,
        skills,
        certifications,
        sectors,
        on_call_preference,
        full_time_only,
        updated_at
      ) VALUES (
        1,
        ${profile.version},
        ${profile.fullName},
        ${profile.homeLocation},
        ${profile.radiusMiles},
        ${profile.minimumPay},
        ${profile.payBasis},
        ${JSON.stringify(profile.targetTitles)},
        ${JSON.stringify(profile.skills)},
        ${JSON.stringify(profile.certifications)},
        ${JSON.stringify(profile.sectors)},
        ${profile.onCallPreference},
        ${profile.fullTimeOnly},
        ${profile.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        version = excluded.version,
        full_name = excluded.full_name,
        home_location = excluded.home_location,
        radius_miles = excluded.radius_miles,
        minimum_pay = excluded.minimum_pay,
        pay_basis = excluded.pay_basis,
        target_titles = excluded.target_titles,
        skills = excluded.skills,
        certifications = excluded.certifications,
        sectors = excluded.sectors,
        on_call_preference = excluded.on_call_preference,
        full_time_only = excluded.full_time_only,
        updated_at = excluded.updated_at
      RETURNING *;
    `);

    if (!row) {
      throw new Error("Failed to save Career Profile");
    }
    return mapProfile(row);
  }

  async listApplications(): Promise<TrackedApplication[]> {
    const rows = await this.sqlite.queryAll<ApplicationRow>(
      "SELECT * FROM applications ORDER BY updated_at DESC, created_at DESC;",
    );
    return rows.map(mapApplication);
  }

  async getApplicationById(id: string): Promise<TrackedApplication | null> {
    const row = await this.sqlite.queryOne<ApplicationRow>(
      sql`SELECT * FROM applications WHERE id = ${id} LIMIT 1;`,
    );
    return row ? mapApplication(row) : null;
  }

  async getApplicationByJobId(jobId: string): Promise<TrackedApplication | null> {
    const row = await this.sqlite.queryOne<ApplicationRow>(
      sql`SELECT * FROM applications WHERE job_id = ${jobId} LIMIT 1;`,
    );
    return row ? mapApplication(row) : null;
  }

  async createApplicationFromJob(jobId: string): Promise<TrackedApplication> {
    const existing = await this.getApplicationByJobId(jobId);
    if (existing) {
      return existing;
    }

    const job = await this.sqlite.queryOne<JobSnapshotRow>(sql`
      SELECT
        CAST(jobs.id AS TEXT) AS job_id,
        jobs.title AS title,
        companies.name AS company_name,
        jobs.url AS url
      FROM jobs
      JOIN companies ON companies.id = jobs.company_id
      WHERE jobs.id = ${jobId}
      LIMIT 1;
    `);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const now = new Date().toISOString();
    const id = `application-${job.job_id}`;
    const row = await this.sqlite.queryOne<ApplicationRow>(sql`
      INSERT INTO applications (
        id,
        job_id,
        title,
        company_name,
        url,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${job.job_id},
        ${job.title},
        ${job.company_name},
        ${job.url},
        ${"interested"},
        ${""},
        ${now},
        ${now}
      )
      RETURNING *;
    `);

    if (!row) {
      throw new Error(`Failed to track job ${jobId}`);
    }
    return mapApplication(row);
  }

  async updateApplication(
    id: string,
    update: ApplicationUpdate,
  ): Promise<TrackedApplication> {
    const current = await this.getApplicationById(id);
    if (!current) {
      throw new Error(`Application ${id} not found`);
    }

    const row = await this.sqlite.queryOne<ApplicationRow>(sql`
      UPDATE applications
      SET
        status = ${update.status ?? current.status},
        notes = ${update.notes ?? current.notes},
        updated_at = ${new Date().toISOString()}
      WHERE id = ${id}
      RETURNING *;
    `);

    if (!row) {
      throw new Error(`Failed to update application ${id}`);
    }
    return mapApplication(row);
  }

  async deleteApplication(id: string): Promise<void> {
    await this.sqlite.exec(sql`DELETE FROM applications WHERE id = ${id};`);
  }

  async importLegacyApplication(application: TrackedApplication): Promise<void> {
    await this.sqlite.exec(sql`
      INSERT OR IGNORE INTO applications (
        id,
        job_id,
        title,
        company_name,
        url,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES (
        ${application.id},
        ${application.jobId},
        ${application.title},
        ${application.companyName},
        ${application.url},
        ${application.status},
        ${application.notes},
        ${application.createdAt},
        ${application.updatedAt}
      );
    `);
  }
}
