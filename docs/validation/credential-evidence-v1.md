# Structured credential evidence validation

Issue: #84

This slice adds bounded structured facts to Career Evidence when `subjectType` is `credential`.

## Structure

A credential may retain, when known:

- issuer;
- jurisdiction;
- status: active, pending, inactive, or expired;
- expiration date;
- credential/license identifier.

All fields remain optional. Missing structure does not invalidate older or imported credential evidence.

## Authority rules

Structured credential facts do not create a second truth store. They remain part of the canonical Career Evidence record and inherit its verification state and provenance.

Only user-confirmed or user-authored evidence can establish factual support. Imported evidence remains a proposal until confirmed.

For credential requirements, a textually matching credential does not establish current eligibility when its structured standing is known to be expired, inactive, pending, or past its expiration date. The mapper retains the matching evidence on the gap so the user can see why the requirement is not considered satisfied.

When both stale and currently usable matching credentials exist, deterministic mapping prefers the usable credential rather than the stronger stale textual match.

When standing is not provided, Job Ranger preserves the pre-existing evidence behavior rather than inventing an inactive or active state. Unknown standing can still support a textual credential requirement if the evidence itself is confirmed, but Job Ranger does not manufacture jurisdiction, issuer, status, or expiration facts.

## Privacy and UX

Credential structure is progressively disclosed only for credential evidence. The user is not required to enter an identifier, jurisdiction, issuer, status, or expiration date. Job Ranger does not infer these fields from occupation or title alone.

## Regression coverage

- validator rejects credential structure on non-credential evidence and rejects invalid statuses/dates;
- persistence smoke coverage verifies structured credentials survive restart;
- changing an evidence record away from `credential` clears credential-only structure;
- mapper coverage verifies active, expired, inactive, pending, date-expired, and stale-vs-current behavior;
- Electron E2E verifies structured credential authoring through the consumer UI and persistence after reload.
