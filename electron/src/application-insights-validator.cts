import type { ApplicationOfferInput } from "../../src/shared/application-insights.js";

const statuses = new Set(["active", "accepted", "declined", "withdrawn", "expired"]);
const payBases = new Set(["annual", "hourly", "other"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function optionalText(value: unknown, label: string, maxLength = 10_000): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${label} is too long`);
  return normalized;
}

function optionalDate(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a valid date`);
  }
  return value;
}

export function validateApplicationOfferInput(value: unknown): ApplicationOfferInput {
  if (!isObject(value)) throw new Error("Offer input must be an object");
  if (typeof value.status !== "string" || !statuses.has(value.status)) {
    throw new Error("Offer status is invalid");
  }
  if (typeof value.payBasis !== "string" || !payBases.has(value.payBasis)) {
    throw new Error("Offer pay basis is invalid");
  }

  let basePay: number | null = null;
  if (value.basePay !== undefined && value.basePay !== null && value.basePay !== "") {
    if (typeof value.basePay !== "number" || !Number.isFinite(value.basePay) || value.basePay < 0 || value.basePay > 100_000_000) {
      throw new Error("Offer base pay must be a finite non-negative number");
    }
    basePay = value.basePay;
  }

  const currency = optionalText(value.currency, "Offer currency", 3).toUpperCase() || "USD";
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Offer currency must be a three-letter currency code");
  }

  return {
    status: value.status as ApplicationOfferInput["status"],
    basePay,
    payBasis: value.payBasis as ApplicationOfferInput["payBasis"],
    currency,
    bonusNotes: optionalText(value.bonusNotes, "Bonus notes"),
    equityNotes: optionalText(value.equityNotes, "Equity notes"),
    benefitsNotes: optionalText(value.benefitsNotes, "Benefits notes"),
    startDate: optionalDate(value.startDate, "Offer start date"),
    responseDeadline: optionalDate(value.responseDeadline, "Offer response deadline"),
    negotiationNotes: optionalText(value.negotiationNotes, "Negotiation notes"),
  };
}
