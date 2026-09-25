import type { EvidenceSubjectType } from "../../src/shared/contracts.js";

export interface EvidenceProposalDraft {
  subjectType: EvidenceSubjectType;
  statement: string;
  context: string | null;
  confidence: number;
  sourceLocator: string;
  sourceText: string;
}

const sectionAliases = new Map<string, string>([
  ["experience", "experience"],
  ["work experience", "experience"],
  ["professional experience", "experience"],
  ["employment", "experience"],
  ["employment history", "experience"],
  ["work history", "experience"],
  ["skills", "skills"],
  ["technical skills", "skills"],
  ["core skills", "skills"],
  ["competencies", "skills"],
  ["certifications", "credentials"],
  ["certifications and licenses", "credentials"],
  ["licenses", "credentials"],
  ["licenses and certifications", "credentials"],
  ["credentials", "credentials"],
  ["education", "education"],
  ["projects", "projects"],
  ["selected projects", "projects"],
  ["publications", "publications"],
  ["selected publications", "publications"],
  ["achievements", "achievements"],
  ["accomplishments", "achievements"],
]);

function stripMarkdown(value: string): string {
  return value
    .replace(/^\s{0,3}#{1,6}\s+/, "")
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeading(value: string): string | null {
  const plain = stripMarkdown(value).replace(/:$/, "").trim();
  if (!plain || plain.length > 80) return null;
  const normalized = plain.toLowerCase();
  const alias = sectionAliases.get(normalized);
  if (alias) return alias;

  const isMarkdownHeading = /^\s{0,3}#{1,6}\s+/.test(value);
  const isUpperHeading =
    plain.length >= 3 &&
    plain === plain.toUpperCase() &&
    /[A-Z]/.test(plain) &&
    !/[.!?]$/.test(plain);
  return isMarkdownHeading || isUpperHeading ? normalized : null;
}

function isBullet(value: string): boolean {
  return /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(value);
}

function looksLikeRoleHeader(statement: string): boolean {
  const hasDate =
    /\b(?:19|20)\d{2}\b/.test(statement) ||
    /\b(?:present|current)\b/i.test(statement);
  const hasRoleSeparator = /\s(?:at|@|\||—|–|-)\s/i.test(statement);
  return hasDate && hasRoleSeparator;
}

function subjectFor(
  section: string | null,
  statement: string,
  bullet: boolean,
): EvidenceSubjectType {
  if (section === "credentials") return "credential";
  if (section === "skills") return "skill";
  if (section === "education") return "education";
  if (section === "projects") return "project";
  if (section === "publications") return "publication";
  if (section === "achievements") return "achievement";
  if (section === "experience") {
    return !bullet && looksLikeRoleHeader(statement) ? "role" : "achievement";
  }
  if (/\b(?:certification|certified|license|licensed)\b/i.test(statement)) {
    return "credential";
  }
  return "other";
}

function splitSkillStatements(statement: string): string[] {
  if (!statement.includes(",")) return [statement];
  const parts = statement
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  return parts.length > 1 ? parts : [statement];
}

export function normalizeEvidenceProposals(rawText: string): EvidenceProposalDraft[] {
  const proposals: EvidenceProposalDraft[] = [];
  const seen = new Set<string>();
  let section: string | null = null;

  rawText.split(/\r?\n/).forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed || /^[-*_]{3,}$/.test(trimmed)) return;

    const heading = normalizeHeading(rawLine);
    if (heading) {
      section = heading;
      return;
    }

    const statement = stripMarkdown(rawLine);
    if (!statement || statement.length < 2) return;

    const bullet = isBullet(rawLine);
    const subjectType = subjectFor(section, statement, bullet);
    const statements =
      subjectType === "skill" ? splitSkillStatements(statement) : [statement];

    for (const normalizedStatement of statements) {
      const dedupeKey = `${subjectType}:${normalizedStatement.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      proposals.push({
        subjectType,
        statement: normalizedStatement,
        context: section,
        confidence: 1,
        sourceLocator: `line:${index + 1}`,
        sourceText: statement,
      });
    }
  });

  return proposals;
}
