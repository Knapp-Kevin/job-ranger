"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareerBackend = void 0;
const fs = require("node:fs").promises;
const path = require("node:path");
const career_repository_cjs_1 = require("./career-repository.cjs");
const sqlite_cjs_1 = require("./sqlite.cjs");
function cleanList(values) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
function normalizeProfile(profile) {
    const minimumPay = profile.minimumPay === null || Number.isNaN(profile.minimumPay)
        ? null
        : profile.payBasis === "annual"
            ? Math.max(0, Math.round(profile.minimumPay))
            : Math.max(0, Math.round(profile.minimumPay * 100) / 100);
    return {
        version: 2,
        fullName: profile.fullName.trim(),
        homeLocation: profile.homeLocation.trim(),
        radiusMiles: profile.radiusMiles === null || Number.isNaN(profile.radiusMiles)
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
class CareerBackend {
    sqlite;
    repository;
    artifactsDirectory;
    constructor(options) {
        this.sqlite = new sqlite_cjs_1.SqliteClient(options.databasePath, options.sqliteBinaryPath);
        this.repository = new career_repository_cjs_1.CareerRepository(this.sqlite);
        this.artifactsDirectory = path.join(options.dataDirectory, "artifacts");
    }
    async initialize() {
        await fs.mkdir(this.artifactsDirectory, { recursive: true });
    }
    getArtifactDirectory() {
        return this.artifactsDirectory;
    }
    async getProfile() {
        return this.repository.getProfile();
    }
    async saveProfile(profile) {
        return this.repository.saveProfile(normalizeProfile(profile));
    }
    async listApplications() {
        return this.repository.listApplications();
    }
    async trackApplication(jobId) {
        return this.repository.createApplicationFromJob(jobId);
    }
    async updateApplication(id, update) {
        return this.repository.updateApplication(id, update);
    }
    async deleteApplication(id) {
        await this.repository.deleteApplication(id);
    }
    async migrateLegacy(payload) {
        const existingProfile = await this.repository.getProfile();
        if (!existingProfile && payload.profile) {
            await this.repository.saveProfile(normalizeProfile(payload.profile));
        }
        for (const application of payload.applications) {
            await this.repository.importLegacyApplication(application);
        }
    }
}
exports.CareerBackend = CareerBackend;
