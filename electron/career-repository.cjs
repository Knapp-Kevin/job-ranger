"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareerRepository = void 0;
const sqlite_cjs_1 = require("./sqlite.cjs");
function parseStringArray(value) {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
            ? parsed.filter((item) => typeof item === "string")
            : [];
    }
    catch {
        return [];
    }
}
function mapProfile(row) {
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
        onCallPreference: row.on_call_preference === "yes" || row.on_call_preference === "no"
            ? row.on_call_preference
            : "either",
        fullTimeOnly: Boolean(row.full_time_only),
        updatedAt: row.updated_at,
    };
}
function mapApplication(row) {
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
class CareerRepository {
    sqlite;
    constructor(sqlite) {
        this.sqlite = sqlite;
    }
    async getProfile() {
        const row = await this.sqlite.queryOne("SELECT * FROM career_profile WHERE id = 1 LIMIT 1;");
        return row ? mapProfile(row) : null;
    }
    async saveProfile(profile) {
        const row = await this.sqlite.queryOne((0, sqlite_cjs_1.sql) `
      INSERT INTO career_profile (
        id, version, full_name, home_location, radius_miles, minimum_pay,
        pay_basis, target_titles, skills, certifications, sectors,
        on_call_preference, full_time_only, updated_at
      ) VALUES (
        1, ${profile.version}, ${profile.fullName}, ${profile.homeLocation},
        ${profile.radiusMiles}, ${profile.minimumPay}, ${profile.payBasis},
        ${JSON.stringify(profile.targetTitles)}, ${JSON.stringify(profile.skills)},
        ${JSON.stringify(profile.certifications)}, ${JSON.stringify(profile.sectors)},
        ${profile.onCallPreference}, ${profile.fullTimeOnly}, ${profile.updatedAt}
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
        if (!row)
            throw new Error("Failed to save Career Profile");
        return mapProfile(row);
    }
    async listApplications() {
        const rows = await this.sqlite.queryAll("SELECT * FROM applications ORDER BY updated_at DESC, created_at DESC;");
        return rows.map(mapApplication);
    }
    async getApplicationById(id) {
        const row = await this.sqlite.queryOne((0, sqlite_cjs_1.sql) `SELECT * FROM applications WHERE id = ${id} LIMIT 1;`);
        return row ? mapApplication(row) : null;
    }
    async getApplicationByJobId(jobId) {
        const row = await this.sqlite.queryOne((0, sqlite_cjs_1.sql) `SELECT * FROM applications WHERE job_id = ${jobId} LIMIT 1;`);
        return row ? mapApplication(row) : null;
    }
    async createApplicationFromJob(jobId) {
        const existing = await this.getApplicationByJobId(jobId);
        if (existing)
            return existing;
        const job = await this.sqlite.queryOne((0, sqlite_cjs_1.sql) `
      SELECT CAST(jobs.id AS TEXT) AS job_id, jobs.title AS title,
             companies.name AS company_name, jobs.url AS url
      FROM jobs
      JOIN companies ON companies.id = jobs.company_id
      WHERE jobs.id = ${jobId}
      LIMIT 1;
    `);
        if (!job)
            throw new Error(`Job ${jobId} not found`);
        const now = new Date().toISOString();
        const id = `application-${job.job_id}`;
        const row = await this.sqlite.queryOne((0, sqlite_cjs_1.sql) `
      INSERT INTO applications (
        id, job_id, title, company_name, url, status, notes, created_at, updated_at
      ) VALUES (
        ${id}, ${job.job_id}, ${job.title}, ${job.company_name}, ${job.url},
        ${"interested"}, ${""}, ${now}, ${now}
      )
      RETURNING *;
    `);
        if (!row)
            throw new Error(`Failed to track job ${jobId}`);
        return mapApplication(row);
    }
    async updateApplication(id, update) {
        const current = await this.getApplicationById(id);
        if (!current)
            throw new Error(`Application ${id} not found`);
        const row = await this.sqlite.queryOne((0, sqlite_cjs_1.sql) `
      UPDATE applications
      SET status = ${update.status ?? current.status},
          notes = ${update.notes ?? current.notes},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${id}
      RETURNING *;
    `);
        if (!row)
            throw new Error(`Failed to update application ${id}`);
        return mapApplication(row);
    }
    async deleteApplication(id) {
        await this.sqlite.exec((0, sqlite_cjs_1.sql) `DELETE FROM applications WHERE id = ${id};`);
    }
    async importLegacyApplication(application) {
        await this.sqlite.exec((0, sqlite_cjs_1.sql) `
      INSERT OR IGNORE INTO applications (
        id, job_id, title, company_name, url, status, notes, created_at, updated_at
      ) VALUES (
        ${application.id}, ${application.jobId}, ${application.title},
        ${application.companyName}, ${application.url}, ${application.status},
        ${application.notes}, ${application.createdAt}, ${application.updatedAt}
      );
    `);
    }
}
exports.CareerRepository = CareerRepository;
