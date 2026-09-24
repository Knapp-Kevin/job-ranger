"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canEvidenceSupportFactualClaim = canEvidenceSupportFactualClaim;
exports.evaluateResumeStatementTruth = evaluateResumeStatementTruth;
function canEvidenceSupportFactualClaim(evidence) {
    return evidence.verificationState === "user-confirmed" ||
        evidence.verificationState === "user-authored";
}
function evaluateResumeStatementTruth(statement, evidence) {
    const byId = new Map(evidence.map((item) => [item.id, item]));
    const missingEvidenceIds = statement.evidenceIds.filter((id) => !byId.has(id));
    const unconfirmedEvidenceIds = statement.evidenceIds.filter((id) => {
        const item = byId.get(id);
        return item ? !canEvidenceSupportFactualClaim(item) : false;
    });
    const requiresEvidence = statement.generationMode !== "user-authored";
    const supported = missingEvidenceIds.length === 0 &&
        unconfirmedEvidenceIds.length === 0 &&
        (!requiresEvidence || statement.evidenceIds.length > 0);
    return { supported, missingEvidenceIds, unconfirmedEvidenceIds };
}
