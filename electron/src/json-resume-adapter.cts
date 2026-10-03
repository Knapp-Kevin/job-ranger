import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  CandidateEvidence,
  CredentialDetails,
  EvidenceSubjectType,
  SourceArtifact,
} from "../../src/shared/contracts.js";
import type {
  JsonResumeExportResult,
  JsonResumeImportResult,
} from "../../src/shared/json-resume.js";
import { CareerEvidenceRepository } from "./career-evidence-repository.cjs";
import { CareerRepository } from "./career-repository.cjs";
import { SqliteClient, sql } from "./sqlite.cjs";

const JSON_RESUME_PARSER_ID = "json-resume-adapter";
const JSON_RESUME_PARSER_VERSION = "1";
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_SECTION_ITEMS = 2_000;

interface AdapterOptions {
  dataDirectory: string;
  databasePath: string;
  sqliteBinaryPath: string;
}

type JsonObject = Record<string, unknown>;

type EvidenceProposal = {
  evidence: CandidateEvidence;
  sourceLocator: string;
  sourceText: string;
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function text(value: unknown, max = 20_000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function textArray(value: unknown, maxItems = 200): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => text(item, 2_000))
    .filter((item): item is string => Boolean(item));
}

function section(value: unknown, name: string): JsonObject[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`JSON Resume ${name} must be an array`);
  if (value.length > MAX_SECTION_ITEMS) throw new Error(`JSON Resume ${name} is too large`);
  return value.filter(isObject);
}

function hashBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function proposal(
  subjectType: EvidenceSubjectType,
  input: {
    organization?: string | null;
    titleOrName?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    statement: string;
    skills?: string[];
    methodsOrTools?: string[];
    outcomes?: string[];
    credential?: CredentialDetails | null;
  },
  sourceLocator: string,
  sourceText: string,
  now: string,
): EvidenceProposal {
  return {
    evidence: {
      id: `evidence-${randomUUID()}`,
      subjectType,
      organization: input.organization ?? null,
      titleOrName: input.titleOrName ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      statement: input.statement,
      action: null,
      context: null,
      skills: unique(input.skills ?? []),
      methodsOrTools: unique(input.methodsOrTools ?? []),
      scope: [],
      outcomes: unique(input.outcomes ?? []),
      metrics: [],
      credential: input.credential ?? null,
      verificationState: "imported",
      confidence: null,
      createdAt: now,
      updatedAt: now,
    },
    sourceLocator,
    sourceText,
  };
}

function parseImport(root: JsonObject, now: string): { proposals: EvidenceProposal[]; warnings: string[] } {
  const proposals: EvidenceProposal[] = [];
  const warnings: string[] = [];

  section(root.work, "work").forEach((item, index) => {
    const organization = text(item.name);
    const position = text(item.position);
    const summary = text(item.summary);
    const roleStatement = summary ?? [position, organization].filter(Boolean).join(" at ") || "Imported work experience";
    proposals.push(proposal("role", {
      organization,
      titleOrName: position,
      startDate: text(item.startDate),
      endDate: text(item.endDate),
      statement: roleStatement,
    }, `work[${index}]`, JSON.stringify(item), now));

    textArray(item.highlights).forEach((highlight, highlightIndex) => {
      proposals.push(proposal("achievement", {
        organization,
        titleOrName: position,
        startDate: text(item.startDate),
        endDate: text(item.endDate),
        statement: highlight,
      }, `work[${index}].highlights[${highlightIndex}]`, highlight, now));
    });
  });

  section(root.education, "education").forEach((item, index) => {
    const institution = text(item.institution);
    const area = text(item.area);
    const studyType = text(item.studyType);
    const label = [studyType, area].filter(Boolean).join(" in ");
    proposals.push(proposal("education", {
      organization: institution,
      titleOrName: label || area || studyType,
      startDate: text(item.startDate),
      endDate: text(item.endDate),
      statement: [label || area || studyType || "Education", institution].filter(Boolean).join(" at "),
    }, `education[${index}]`, JSON.stringify(item), now));
  });

  section(root.skills, "skills").forEach((item, index) => {
    const name = text(item.name);
    const keywords = textArray(item.keywords);
    if (!name && keywords.length === 0) return;
    proposals.push(proposal("skill", {
      titleOrName: name ?? keywords[0],
      statement: name ?? keywords.join(", "),
      skills: unique([...(name ? [name] : []), ...keywords]),
    }, `skills[${index}]`, JSON.stringify(item), now));
  });

  section(root.certificates, "certificates").forEach((item, index) => {
    const name = text(item.name);
    if (!name) return;
    proposals.push(proposal("credential", {
      organization: text(item.issuer),
      titleOrName: name,
      startDate: text(item.date),
      statement: [name, text(item.issuer)].filter(Boolean).join(" — "),
      credential: {
        issuer: text(item.issuer),
        jurisdiction: null,
        status: null,
        expirationDate: null,
        credentialId: null,
      },
    }, `certificates[${index}]`, JSON.stringify(item), now));
  });

  section(root.projects, "projects").forEach((item, index) => {
    const name = text(item.name);
    const description = text(item.description);
    const highlights = textArray(item.highlights);
    if (!name && !description && highlights.length === 0) return;
    proposals.push(proposal("project", {
      titleOrName: name,
      startDate: text(item.startDate),
      endDate: text(item.endDate),
      statement: description ?? name ?? highlights[0],
      outcomes: highlights,
      methodsOrTools: textArray(item.keywords),
    }, `projects[${index}]`, JSON.stringify(item), now));
  });

  section(root.publications, "publications").forEach((item, index) => {
    const name = text(item.name);
    if (!name) return;
    proposals.push(proposal("publication", {
      organization: text(item.publisher),
      titleOrName: name,
      startDate: text(item.releaseDate),
      statement: text(item.summary) ?? name,
    }, `publications[${index}]`, JSON.stringify(item), now));
  });

  for (const sectionName of ["volunteer", "awards", "languages", "interests", "references"] as const) {
    if (Array.isArray(root[sectionName]) && root[sectionName].length > 0) {
      warnings.push(`${sectionName} is preserved in the source artifact but is not automatically converted to Career Evidence in adapter v1.`);
    }
  }
  if (proposals.length === 0) {
    warnings.push("No supported JSON Resume evidence sections contained importable records.");
  }
  return { proposals, warnings };
}

function exportJsonResume(
  profile: Awaited<ReturnType<CareerRepository["getProfile"]>>,
  evidence: CandidateEvidence[],
): { document: JsonObject; exportedEvidenceCount: number; omittedEvidenceCount: number; warnings: string[] } {
  const current = evidence.filter(
    (item) => item.verificationState === "user-confirmed" || item.verificationState === "user-authored",
  );
  const consumed = new Set<string>();

  const roleGroups = new Map<string, CandidateEvidence[]>();
  for (const item of current.filter((candidate) => candidate.subjectType === "role")) {
    const key = [item.organization ?? "", item.titleOrName ?? "", item.startDate ?? "", item.endDate ?? ""].join("\u001f");
    const group = roleGroups.get(key) ?? [];
    group.push(item);
    roleGroups.set(key, group);
  }
  for (const achievement of current.filter((candidate) => candidate.subjectType === "achievement")) {
    const key = [achievement.organization ?? "", achievement.titleOrName ?? "", achievement.startDate ?? "", achievement.endDate ?? ""].join("\u001f");
    if (roleGroups.has(key)) roleGroups.get(key)!.push(achievement);
  }

  const work = Array.from(roleGroups.values()).map((items) => {
    const role = items.find((item) => item.subjectType === "role") ?? items[0];
    items.forEach((item) => consumed.add(item.id));
    const highlights = items
      .filter((item) => item.id !== role.id)
      .flatMap((item) => [item.statement, ...item.outcomes])
      .filter(Boolean);
    return {
      name: role.organization ?? "",
      position: role.titleOrName ?? "",
      startDate: role.startDate ?? "",
      endDate: role.endDate ?? "",
      summary: role.statement,
      highlights: unique(highlights),
    };
  });

  const education = current.filter((item) => item.subjectType === "education").map((item) => {
    consumed.add(item.id);
    return {
      institution: item.organization ?? "",
      area: item.titleOrName ?? item.statement,
      studyType: "",
      startDate: item.startDate ?? "",
      endDate: item.endDate ?? "",
    };
  });

  const skills = current.filter((item) => item.subjectType === "skill").map((item) => {
    consumed.add(item.id);
    return {
      name: item.titleOrName ?? item.statement,
      keywords: unique([...item.skills, ...item.methodsOrTools]),
    };
  });

  const certificates = current.filter((item) => item.subjectType === "credential").map((item) => {
    consumed.add(item.id);
    return {
      name: item.titleOrName ?? item.statement,
      date: item.startDate ?? "",
      issuer: item.credential?.issuer ?? item.organization ?? "",
      url: "",
    };
  });

  const projects = current.filter((item) => item.subjectType === "project").map((item) => {
    consumed.add(item.id);
    return {
      name: item.titleOrName ?? item.statement,
      description: item.statement,
      startDate: item.startDate ?? "",
      endDate: item.endDate ?? "",
      highlights: unique(item.outcomes),
      keywords: unique([...item.skills, ...item.methodsOrTools]),
    };
  });

  const publications = current.filter((item) => item.subjectType === "publication").map((item) => {
    consumed.add(item.id);
    return {
      name: item.titleOrName ?? item.statement,
      publisher: item.organization ?? "",
      releaseDate: item.startDate ?? "",
      summary: item.statement,
    };
  });

  const omittedEvidenceCount = current.filter((item) => !consumed.has(item.id)).length;
  const warnings = omittedEvidenceCount > 0
    ? [`${omittedEvidenceCount} current Career Evidence record${omittedEvidenceCount === 1 ? " was" : "s were"} omitted because adapter v1 has no unambiguous standard JSON Resume section for them.`]
    : [];

  return {
    document: {
      basics: {
        name: profile?.fullName ?? "",
        location: profile?.homeLocation ? { address: profile.homeLocation } : undefined,
      },
      work,
      education,
      skills,
      certificates,
      projects,
      publications,
      meta: {
        canonical: "https://jsonresume.org/schema/",
        version: "v1.0.0",
        lastModified: new Date().toISOString(),
      },
    },
    exportedEvidenceCount: consumed.size,
    omittedEvidenceCount,
    warnings,
  };
}

export class JsonResumeAdapter {
  private readonly sqlite: SqliteClient;
  private readonly evidenceRepository: CareerEvidenceRepository;
  private readonly careerRepository: CareerRepository;
  private readonly sourceRoot: string;

  constructor(private readonly options: AdapterOptions) {
    this.sqlite = new SqliteClient(options.databasePath, options.sqliteBinaryPath);
    this.evidenceRepository = new CareerEvidenceRepository(this.sqlite);
    this.careerRepository = new CareerRepository(this.sqlite);
    this.sourceRoot = path.join(options.dataDirectory, "artifacts", "sources");
  }

  async importFile(filePath: string): Promise<JsonResumeImportResult> {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > MAX_IMPORT_BYTES) {
      throw new Error("JSON Resume import must be a regular JSON file under 10 MB");
    }
    const bytes = await fs.readFile(filePath);
    const contentHash = hashBytes(bytes);
    const raw = bytes.toString("utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("JSON Resume file is not valid JSON");
    }
    if (!isObject(parsed)) throw new Error("JSON Resume root must be an object");

    const now = new Date().toISOString();
    const basics = isObject(parsed.basics) ? parsed.basics : {};
    const profileNameProposal = text(basics.name, 500);
    const extracted = parseImport(parsed, now);

    const duplicate = await this.evidenceRepository.getSourceArtifactByHash(contentHash);
    if (duplicate) {
      return {
        artifact: duplicate,
        proposedEvidence: await this.evidenceRepository.listEvidenceForArtifact(duplicate.id),
        duplicate: true,
        warnings: ["This JSON Resume was already imported. Existing candidate evidence was reused.", ...extracted.warnings],
        profileNameProposal,
      };
    }

    const artifactId = `artifact-${randomUUID()}`;
    const artifactDirectory = path.join(this.sourceRoot, artifactId);
    const managedPath = path.join(artifactDirectory, "source.json");
    await fs.mkdir(artifactDirectory, { recursive: true });
    await fs.writeFile(managedPath, bytes);

    const artifact: SourceArtifact = {
      id: artifactId,
      kind: "resume",
      originalName: path.basename(filePath),
      mediaType: "application/json",
      detectedFormat: "json",
      contentHash,
      managedPath,
      byteSize: bytes.byteLength,
      importedAt: now,
      parserId: JSON_RESUME_PARSER_ID,
      parserVersion: JSON_RESUME_PARSER_VERSION,
      extractionState: extracted.proposals.length > 0 ? "review-required" : "extracted",
      warnings: extracted.warnings,
    };

    const snapshotId = `snapshot-${randomUUID()}`;
    const createdEvidenceIds: string[] = [];
    try {
      const savedArtifact = await this.evidenceRepository.createSourceArtifact(artifact);
      await this.evidenceRepository.createExtractionSnapshot({
        id: snapshotId,
        sourceArtifactId: artifactId,
        parserId: JSON_RESUME_PARSER_ID,
        parserVersion: JSON_RESUME_PARSER_VERSION,
        rawText: raw,
        structuredPayload: parsed,
        warnings: extracted.warnings,
        createdAt: now,
      });
      const proposedEvidence: CandidateEvidence[] = [];
      for (const item of extracted.proposals) {
        const saved = await this.evidenceRepository.createEvidenceProposal(item.evidence, {
          sourceArtifactId: artifactId,
          extractionSnapshotId: snapshotId,
          sourceLocator: item.sourceLocator,
          sourceText: item.sourceText,
          relation: "extracted",
        });
        createdEvidenceIds.push(saved.id);
        proposedEvidence.push(saved);
      }
      return {
        artifact: savedArtifact,
        proposedEvidence,
        duplicate: false,
        warnings: extracted.warnings,
        profileNameProposal,
      };
    } catch (error) {
      if (createdEvidenceIds.length > 0) {
        await this.sqlite.exec(`DELETE FROM candidate_evidence WHERE id IN (${createdEvidenceIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")});`);
      }
      await this.sqlite.exec(sql`DELETE FROM source_artifacts WHERE id = ${artifactId};`);
      await fs.rm(artifactDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  async exportFile(filePath: string): Promise<JsonResumeExportResult> {
    const profile = await this.careerRepository.getProfile();
    const reviewItems = await this.evidenceRepository.listEvidenceReviewItems();
    const exported = exportJsonResume(profile, reviewItems.map((item) => item.evidence));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(exported.document, null, 2)}\n`, "utf8");
    return {
      filePath,
      exportedEvidenceCount: exported.exportedEvidenceCount,
      omittedEvidenceCount: exported.omittedEvidenceCount,
      warnings: exported.warnings,
    };
  }
}
