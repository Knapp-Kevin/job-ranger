"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCareerProfile = validateCareerProfile;
exports.validateApplicationUpdate = validateApplicationUpdate;
exports.validateLegacyCareerMigration = validateLegacyCareerMigration;
function requireRecord(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${label} must be an object`);
    }
    return value;
}
function requireString(value, label, maxLength = 10000) {
    if (typeof value !== "string") {
        throw new Error(`${label} must be a string`);
    }
    if (value.length > maxLength) {
        throw new Error(`${label} is too long`);
    }
    return value;
}
function nullableFiniteNumber(value, label) {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`${label} must be a finite number or null`);
    }
    return value;
}
function stringArray(value, label) {
    if (!Array.isArray(value)) {
        throw new Error(`${label} must be an array`);
    }
    if (value.length > 500) {
        throw new Error(`${label} contains too many items`);
    }
    return value.map((item, index) => requireString(item, `${label}[${index}]`, 500));
}
function applicationStatus(value) {
    const allowed = ["interested", "applied", "interview", "offer", "rejected", "withdrawn"];
    if (typeof value !== "string" || !allowed.includes(value)) {
        throw new Error("Application status is invalid");
    }
    return value;
}
function payBasis(value) {
    if (value !== "hourly" && value !== "annual") {
        throw new Error("Pay basis must be hourly or annual");
    }
    return value;
}
function onCallPreference(value) {
    if (value !== "yes" && value !== "no" && value !== "either") {
        throw new Error("On-call preference is invalid");
    }
    return value;
}
function externalUrl(value, label) {
    const raw = requireString(value, label, 5000).trim();
    let parsed;
    try {
        parsed = new URL(raw);
    }
    catch {
        throw new Error(`${label} must be a valid URL`);
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error(`${label} must use http or https`);
    }
    return parsed.toString();
}
function isoLikeString(value, label) {
    const raw = requireString(value, label, 100);
    if (Number.isNaN(Date.parse(raw))) {
        throw new Error(`${label} must be a valid date/time`);
    }
    return raw;
}
function validateCareerProfile(value) {
    const record = requireRecord(value, "Career Profile");
    if (record.version !== 2) {
        throw new Error("Career Profile version must be 2");
    }
    if (typeof record.fullTimeOnly !== "boolean") {
        throw new Error("Full-time preference must be a boolean");
    }
    const updatedAt = record.updatedAt === null || record.updatedAt === undefined
        ? null
        : isoLikeString(record.updatedAt, "Career Profile updatedAt");
    return {
        version: 2,
        fullName: requireString(record.fullName, "Full name", 500),
        homeLocation: requireString(record.homeLocation, "Home location", 500),
        radiusMiles: nullableFiniteNumber(record.radiusMiles, "Radius miles"),
        minimumPay: nullableFiniteNumber(record.minimumPay, "Minimum pay"),
        payBasis: payBasis(record.payBasis),
        targetTitles: stringArray(record.targetTitles, "Target titles"),
        skills: stringArray(record.skills, "Skills"),
        certifications: stringArray(record.certifications, "Certifications"),
        sectors: stringArray(record.sectors, "Sectors"),
        onCallPreference: onCallPreference(record.onCallPreference),
        fullTimeOnly: record.fullTimeOnly,
        updatedAt,
    };
}
function validateApplicationUpdate(value) {
    const record = requireRecord(value, "Application update");
    const update = {};
    if (record.status !== undefined) {
        update.status = applicationStatus(record.status);
    }
    if (record.notes !== undefined) {
        update.notes = requireString(record.notes, "Application notes", 50000);
    }
    return update;
}
function validateTrackedApplication(value) {
    const record = requireRecord(value, "Legacy application");
    return {
        id: requireString(record.id, "Application id", 500).trim(),
        jobId: requireString(record.jobId, "Job id", 500).trim(),
        title: requireString(record.title, "Application title", 1000).trim(),
        companyName: requireString(record.companyName, "Company name", 1000).trim(),
        url: externalUrl(record.url, "Application URL"),
        status: applicationStatus(record.status),
        notes: requireString(record.notes, "Application notes", 50000),
        createdAt: isoLikeString(record.createdAt, "Application createdAt"),
        updatedAt: isoLikeString(record.updatedAt, "Application updatedAt"),
    };
}
function validateLegacyCareerMigration(value) {
    const record = requireRecord(value, "Legacy career migration");
    if (!Array.isArray(record.applications)) {
        throw new Error("Legacy applications must be an array");
    }
    if (record.applications.length > 10000) {
        throw new Error("Legacy migration contains too many applications");
    }
    return {
        profile: record.profile === null || record.profile === undefined
            ? null
            : validateCareerProfile(record.profile),
        applications: record.applications.map(validateTrackedApplication),
    };
}
