# Source discovery tranche 1

Issue: #85 (US-11 through US-13)

## Purpose

This tranche establishes the consumer-facing source-discovery boundary without changing Job Ranger's existing source-acquisition authority model.

The product distinction is explicit:

1. a **discovery provider** says where a lead came from;
2. an **employer** is the organization hiring;
3. an **opportunity** is the specific role that was found;
4. a **monitorable source** is an employer source Job Ranger can reliably acquire only after user approval.

Discovery never silently promotes any of the first three concepts into the fourth.

## Provider contract

`SourceDiscoveryProvider` is represented by the shared source-discovery request/result contract and desktop API seam. Provider-specific response shapes remain in the Electron discovery implementation.

The first built-in provider uses two public, no-auth job feeds:

- Remote OK public JSON feed;
- Arbeitnow public job-board API.

The provider performs deterministic role-title matching, candidate deduplication, provider-failure isolation, explicit provenance, and bounded result limits without requiring an inference provider.

## Coverage statement

Coverage is intentionally reported as **partial** whenever at least one feed succeeds and **unavailable** when all configured feeds fail.

This tranche does not claim exhaustive labor-market coverage. In particular:

- Remote OK is remote-first;
- Arbeitnow skews toward European and remote opportunities;
- provider location fields are inconsistent, so target-track geography is carried into the discovery request and displayed in the UX but is not yet used as a hard result filter;
- public-feed availability can change independently of Job Ranger.

The UI must preserve these limitations rather than converting them into confidence scores or silent assumptions.

## Source approval boundary

Remote OK may provide a direct application URL. Job Ranger may offer a monitorable employer source only when that URL deterministically resolves through the existing source detector to one of the structured acquisition families already supported in this tranche:

- Greenhouse;
- Lever;
- SmartRecruiters;
- Ashby.

The approved URL is canonicalized to the employer board rather than storing a one-off posting URL. Existing monitored sources are compared by normalized board identity to prevent duplicate approval.

Other discovered opportunities remain opportunity-only. An aggregator listing, unrecognized application URL, or unsupported source is never silently added to Companies.

Approval reuses the existing `companies.create` / `JobScoutBackend.createCompany()` path. Discovery does not bypass source detection, support classification, local scheduling, acquisition-network policy, or scraper adapters.

## Trust and safety rules

- user approval is required before monitoring;
- dismissal affects only the current discovery run and does not mutate career truth;
- discovered links are not Career Evidence and do not establish qualifications;
- source-provider wording remains secondary diagnostics rather than required ATS knowledge;
- one feed failing does not erase valid results from another feed;
- total provider failure is represented as unavailable rather than as an empty labor market;
- results are deterministic and inference-independent.

## Regression coverage

The governed test suite covers:

- request validation and bounded inputs;
- deterministic role filtering;
- canonical structured-source detection;
- duplicate monitored-source detection;
- unsafe or unrecognized application links remaining non-monitorable;
- opportunity-only provider results;
- one-provider failure with partial results;
- all-provider failure with explicit unavailable state.

## Remaining #85 frontier

This tranche intentionally does **not** complete #85. Broader discovery coverage still needs validation and provider work for materially different job-seeker contexts, including where justified:

- federal and other government employment portals;
- state/local government sources;
- hospital and healthcare systems;
- school districts and education sources;
- skilled-trade, apprenticeship, and union sources;
- staffing and contract marketplaces;
- professional associations;
- niche industry boards.

Additional providers must reuse the same discovery/approval contract rather than creating occupation-specific source workflows. The governed cross-career fixtures in #87 should determine which classes earn implementation next.
