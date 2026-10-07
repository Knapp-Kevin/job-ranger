// Closed, structured-only proposal schemas for the two Slice A tasks
// (contract Draft 0.2 "Proposal contracts"). Rationale is a closed code; no
// provider free text except the gated rewrite text.

import type {
  EvidenceField,
  ResumeStatementRewriteProposal,
  RewriteRationaleCode,
  SemanticEvidenceSupportProposal,
  SemanticRationaleCode,
} from "./contract.cjs";
import { fail, idText, list, oneOf, record, text } from "./schemas-envelope.cjs";

const RELATIONSHIPS = ["direct", "transferable", "ambiguous"] as const;
const SEMANTIC_CODES: readonly SemanticRationaleCode[] = [
  "shared-skill",
  "shared-method-or-tool",
  "similar-scope",
  "related-outcome",
  "adjacent-domain",
];
export const EVIDENCE_FIELDS: readonly EvidenceField[] = [
  "statement",
  "skills",
  "methodsOrTools",
  "scope",
  "outcomes",
  "metrics",
];
const REWRITE_CODES: readonly RewriteRationaleCode[] = [
  "clarity",
  "concision",
  "active-voice",
  "keyword-alignment",
  "ordering",
];

function candidate(entry: unknown, label: string): SemanticEvidenceSupportProposal["candidateEvidence"][number] {
  const item = record(entry, label, ["evidenceId", "proposedRelationship", "rationale"]);
  const rationale = record(item.rationale, `${label}.rationale`, ["code", "evidenceFields"]);
  const evidenceFields = list(rationale.evidenceFields, `${label}.rationale.evidenceFields`, 6, (field, fieldLabel) =>
    oneOf(field, fieldLabel, EVIDENCE_FIELDS),
  );
  if (evidenceFields.length === 0) fail(`${label}.rationale.evidenceFields must name at least one field`);
  if (new Set(evidenceFields).size !== evidenceFields.length) fail(`${label}.rationale.evidenceFields repeats a field`);
  return {
    evidenceId: idText(item.evidenceId, `${label}.evidenceId`),
    proposedRelationship: oneOf(item.proposedRelationship, `${label}.proposedRelationship`, RELATIONSHIPS),
    rationale: { code: oneOf(rationale.code, `${label}.rationale.code`, SEMANTIC_CODES), evidenceFields },
  };
}

export function validateSemanticProposal(value: unknown): SemanticEvidenceSupportProposal {
  const proposal = record(value, "proposal", ["requirementId", "candidateEvidence", "unknownRequirementIds"]);
  const candidateEvidence = list(proposal.candidateEvidence, "proposal.candidateEvidence", 25, candidate);
  if (new Set(candidateEvidence.map((item) => item.evidenceId)).size !== candidateEvidence.length) {
    fail("proposal.candidateEvidence repeats an evidence record");
  }
  return {
    requirementId: idText(proposal.requirementId, "proposal.requirementId"),
    candidateEvidence,
    unknownRequirementIds: list(proposal.unknownRequirementIds, "proposal.unknownRequirementIds", 50, idText),
  };
}

export function validateRewriteProposal(value: unknown): ResumeStatementRewriteProposal {
  const proposal = record(value, "proposal", [
    "sourceStatementId",
    "supportingEvidenceIds",
    "proposedText",
    "rationaleCode",
    "unsupportedRequirementIds",
  ]);
  const supportingEvidenceIds = list(proposal.supportingEvidenceIds, "proposal.supportingEvidenceIds", 25, idText);
  if (supportingEvidenceIds.length === 0) fail("proposal.supportingEvidenceIds must name at least one record");
  return {
    sourceStatementId: idText(proposal.sourceStatementId, "proposal.sourceStatementId"),
    supportingEvidenceIds,
    proposedText: text(proposal.proposedText, "proposal.proposedText", 1000),
    rationaleCode: oneOf(proposal.rationaleCode, "proposal.rationaleCode", REWRITE_CODES),
    unsupportedRequirementIds: list(proposal.unsupportedRequirementIds, "proposal.unsupportedRequirementIds", 50, idText),
  };
}
