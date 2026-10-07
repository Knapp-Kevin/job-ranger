# Career-Ops Provenance Register

**Status:** current third-party provenance record  
**Upstream:** `career-ops-hq/career-ops`  
**Upstream license:** MIT  
**Copyright:** Copyright (c) 2026 Santiago Fernández de Valderrama  
**License verification:** upstream `main` at `882004e083964c52b8e7130a7ba04a05ed72f057`; `LICENSE` blob `89c4ce0ad6b1db98d827ddd9725da5efdff55997`  
**Job Ranger audit date:** 2026-10-07

## Purpose

This register makes the Career-Ops lineage boundary auditable. It distinguishes ideas and architectural influence from copied or adapted source code.

The MIT grant permits use, modification, merging, publication, distribution, sublicensing, and sale of copies, provided the upstream copyright and permission notice are included in copies or substantial portions. Job Ranger preserves that notice in `THIRD_PARTY_NOTICES.md`.

This register is provenance evidence, not a claim of affiliation or endorsement.

## Current lineage classification

The September 24 Career Evidence research and architecture work identifies Career-Ops as a domain-specific implementation/reference donor. The implementation history reviewed on 2026-10-07 characterizes the resulting Job Ranger code as native adaptation rather than an embedded Career-Ops runtime.

The audit did **not** establish a verbatim upstream-file copy in the current Job Ranger implementation. That is a narrower statement than "no code was ever influenced by Career-Ops": the research explicitly adopted mechanisms and concepts from Career-Ops, and the full MIT notice remains preserved for any portions that qualify as adapted code.

Because the original September research did not pin a donor commit for each mechanism, the exact historical upstream revision is **not reconstructed after the fact**. Future direct code reuse must record the donor commit before merge.

## Mechanism-level provenance

| Career-Ops mechanism/reference | Job Ranger implementation/result | Classification | Notes |
| --- | --- | --- | --- |
| `jd-skill-gap.mjs`; `modes/pdf.md` existing / supported-by-resume / gap distinction | `electron/src/requirement-mapper.cts`, durable `JobRequirement` / `RequirementEvidenceMap`, direct / transferable / ambiguous / gap states | Native adaptation / architectural influence | Job Ranger uses its own contracts, persistence, classifications, thresholds, and evidence-authority rules. |
| `verify-cv-facts.mjs`; Career-Ops no-fabrication boundary | `electron/src/resume-service.cts`, `electron/src/truth-gate-tokens.cts`, Career Evidence authority and Truth Gate | Native adaptation / architectural influence | Job Ranger's gate is implemented against its own evidence lineage and projection model. |
| `modes/pdf.md` target-specific evidence ordering and gap preservation | `electron/src/resume-tailoring.cts` and tailoring service | Native adaptation / architectural influence | Job Ranger ranks only confirmed Career Evidence and preserves unsupported requirements as gaps. |
| `modes/ats.md` / PDF parseability concerns | Job Ranger Parseability Gate and generated-PDF reparse checks | Design/reference influence | Job Ranger does not embed Career-Ops ATS runtime or scoring implementation. |
| `modes/pdf/hm-audit.md` separation of factual truth from relevance review | Job Ranger architecture's separate truth / parseability / relevance concepts | Design/reference influence | Relevance remains distinct from factual authority. |
| Application-scoped tailored artifacts | Job Ranger versioned resume projections, artifacts, and exact application links | Design/reference influence | Implemented on Job Ranger's own SQLite-backed lifecycle model. |

## No embedded Career-Ops runtime

Job Ranger does not ship the Career-Ops CLI/runtime as a dependency and does not present itself as Career-Ops, "powered by Career-Ops," or an official Career-Ops distribution.

The Career-Ops name is used descriptively for attribution and lineage only. Upstream trademark policy remains separate from the MIT software license.

## Future donor rule

Before any future pull request copies or substantially adapts Career-Ops source code, assets, templates, or documentation, the PR must record:

1. upstream repository and exact donor commit SHA;
2. upstream path(s);
3. Job Ranger destination path(s);
4. reuse type: verbatim copy, modified copy, algorithmic adaptation, asset import, or reference only;
5. applicable license and copyright notice;
6. whether upstream has separate trademark, asset, dataset, model, or third-party licensing terms;
7. confirmation that `THIRD_PARTY_NOTICES.md` still reproduces the required notice;
8. confirmation that no attribution or branding implies sponsorship or endorsement.

If provenance cannot be established for a proposed copied component, it does not merge.

## License-boundary note

Job Ranger's current development line is AGPL-3.0-only. Historical v1.2.0 and earlier releases retain their MIT grants. Career-Ops-derived portions retain the upstream MIT notice regardless of Job Ranger's surrounding license.

User Career Evidence, resumes, application records, credentials, and other user-provided data are not relicensed merely because the Job Ranger software is open source.
