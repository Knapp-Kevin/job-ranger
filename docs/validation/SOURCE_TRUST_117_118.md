# Source Truth and Reliability Validation (#117 / #118)

**Status:** implementation present; validation pending  
**Release line:** v1.2.0 source-trust tranche  
**Initial implementation commit:** `7b6ed7a9fa113634c5cd611524044d98e819dcbb`

## Purpose

This tranche closes two related trust gaps at the acquisition boundary:

1. downstream reasoning must preserve and identify the exact job-source text it used;
2. source runs must distinguish successful zero-result retrieval from retrieval, access, parsing, extraction, timeout, policy, or unsupported-source failure.

## #117 source-truth contract

The implementation provides:

- durable immutable-per-content job source snapshots;
- source identity, URL, retrieval timestamp, extraction-version identifier, completeness state, safe text, and SHA-256 content hash;
- current snapshot linkage from each job;
- historical snapshot preservation when a posting changes;
- deduplication when the same source content is retrieved repeatedly;
- requirement records linked to the source snapshot used for extraction;
- requirement extraction from the preserved source text instead of only the 220-character UI snippet;
- explicit `full`, `partial`, or `listing-only` completeness surfaced to the user;
- no storage of arbitrary executable DOM/session state.

## #118 diagnostic contract

Each scrape run preserves a bounded diagnostic category separate from raw technical detail.

Implemented categories include:

- successful retrieval with jobs;
- successful retrieval with zero jobs;
- cooldown / circuit-open skip;
- unsupported source;
- browser path unavailable;
- network-policy rejection;
- employer/site access rejection;
- rate limiting;
- timeout;
- retrieval failure;
- extraction failure;
- parser failure;
- unclassified failure.

User-facing company state receives a plain-language diagnostic message while local run history may preserve the technical error separately.

## Required regression evidence

The focused regression must prove:

- a structured source creates a full-text snapshot;
- the snapshot has a SHA-256 hash and durable current linkage;
- repeated unchanged retrieval does not create duplicate snapshots;
- changed source text creates a new historical snapshot;
- requirement extraction can detect a requirement outside the old UI snippet and links it to the current snapshot;
- a structured source returning an empty array is `success-empty`, not a failure;
- a page that loads but yields no reliable job extraction is `extraction-failed`, not `success-empty`;
- the friendly source-state message does not expose raw implementation noise as the primary user explanation.

Validation evidence will be recorded only after the final cleaned implementation head passes repository health and Electron E2E.

## Release rule

Because this tranche changes executable acquisition/persistence behavior after `v1.2.0-rc.1`, that immutable tag must not move. Passing implementation produces a new validated candidate (`rc.2` or later).