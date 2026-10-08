# Personal Brand Publishing and Analytics

## Status

Implemented in successive bounded slices; this document records both delivered capabilities and proposed follow-ons for ADR-0001.

This design gives Job Ranger a concrete starting point for personal-brand publishing, post composition guidance, analytics, and career-outcome learning without requiring model inference.

The capability is a **Career Ops** surface. It is not a general social scheduler and it is not a product-marketing subsystem.

## Implementation checkpoint (2026-10-08)

**Implemented in the initial bounded core slice:** `src/shared/personal-brand.ts` provides a deterministic, inference-free and network-free Personal Brand foundation. It includes typed drafting fields, per-destination conservative character limits, explicit evidence/privacy findings, unchanged-copy SHA-256 preparation, human-attested manual publication receipts with platform permalink validation and duplicate prevention, append-only analytics snapshots with per-metric provenance and missing-versus-zero protection, derived rates, and comparisons gated by platform and post age. `tests/personal-brand.test.mjs` contains focused positive, negative and boundary fixtures and is included in the normal unit test command.

**Not implemented by this checkpoint:** no persisted Personal Brand workspace, UI routing/composer, social provider authorization, automatic publication, API analytics retrieval, ChatGPT MCP server, or full Career Evidence integration. The `verified` claim flag is an explicit caller-supplied review attestation; this core cannot infer claim truth from arbitrary text. `prepareManualPost` only prepares a copy package after human editorial review; it does not publish or establish authority on behalf of the user. Canonical persistence, existing Truth Gate bindings, end-to-end PWA/native UI, backup/restore, and plugin transport remain separate implementation slices before release. No public release capability is claimed for this core.

**Next executable slice:** bind these functions to the existing career services and canonical local persistence (including versioned migration, backup/restore and failure-safe saves); surface the complete human-operated draft → readiness → copy → confirmed permalink → timestamped metrics → learning workflow in the app. Reuse the same typed services through a permissioned future ChatGPT MCP adapter, without bypassing user approval or weakening the deterministic standalone path. Direct multi-provider publishing stays outside the initial critical path.

## Executable manual workflow (2026-10-08, second implementation slice)

**Current code:** `src/pages/PersonalBrand.tsx` is reachable from **Personal Brand** in the Job Ranger navigation, on the same application shell as the rest of Career Ops. `src/shared/personal-brand-api.ts` defines the runtime-neutral application contract. `electron/src/personal-brand-ipc.cts` and `electron/src/personal-brand-backend.cts` implement that contract once; the Electron preload and PWA worker route the same IPC channels to it. No separate in-browser `localStorage` authority exists.

**Local persistence:** feature migration **1005** (`personal_brand_manual_publishing`) adds four SQLite tables: drafts, prepared immutable copy packages, user-confirmed publication receipts, and append-only analytics snapshots. Draft updates are revision-guarded and previous approved versions are kept. Receipt rows are unique by post and provider URL, and snapshots reference an existing recorded publication. These tables live in the ordinary Job Ranger database and thus follow its existing `.jobranger` backup/restore portability and downgrade protection. New provider credentials and external network traffic are not involved.

**Complete first-use path:** navigate to **Personal Brand**; create a LinkedIn text draft, select objective/audience/hook type and hypothesis; inspect deterministic readiness findings; personally review the actual claims and privacy; save and prepare an exact text version for copying; publish manually on LinkedIn; return to record the permalink, actual time, and explicit user confirmation; then enter the available LinkedIn metrics. Blank fields remain `unavailable` rather than becoming zero. Snapshots preserve actual capture/reporting windows and manual provenance and derive rates using available denominators. Existing snapshots survive reload, app restarts, and backup. Comparisons across same-age cohorts currently exist in the pure service contract; UI cohort comparison and advisory next-experiment views remain pending.

**Evidence honesty:** This baseline cannot semantically verify arbitrary prose, locate unsupported claims automatically, certify suitability of a hook, or attribute career outcomes to a social post. The UI explicitly requires human editorial review. When a caller supplies Career Evidence IDs, the backend rechecks that those records still exist and are current before preparing the post; it does not validate that the text semantically follows from the evidence. No model is required, and a model cannot become canonical authority. Manual publication URLs are **user-attested**, not verified via a LinkedIn API.

**Supported scope:** LinkedIn text/manual workflow only in the UI. The pure core defines future destination vocabulary but that does not imply working Facebook, Instagram, X, media publishing, provider analytics, direct scheduling, or background execution. Those require separately approved capabilities. The ChatGPT/MCP integration (#173) is still unimplemented and must use this same typed service, with scoped authorization and confirmed external actions.

**Validation:** `tests/personal-brand-persistence.test.cjs` exercises versioning, duplicates, observation provenance, SQLite restart and data-copy recovery; `tests/pwa/personal-brand.spec.ts` tests real browser UI copy/receipt/metrics after reload; `tests/pwa/portability.spec.ts` checks Personal Brand records across both existing PWA/desktop backup directions. Typecheck, PWA/desktop builds, and normal unit tests are the regression baseline. These are development/test claims, not a declaration of an end-user public release.

**Follow-on work:** complete proper Career Evidence selection and exact claim-to-source binding in the UI, richer qualitative outcome tracking and comparable-age learning, accessibility/manual acceptance, plugin proof and tool-level authorization, and real provider capabilities only when they provide demonstrated value. Do not equate task completion with public distribution readiness.

## Per-claim Career Evidence editing (third implementation slice, 2026-10-08)

**User-facing behavior:** The Personal Brand composer now lets the user enumerate individual factual claims, select one or more current Career Evidence records, inspect each supporting statement and its verification state, explicitly attest that the evidence supports the specific claim, and separately approve its privacy disclosure. Changing a claim, its links, or the actual post body clears previous attestations. Empty or unconfirmed claim entries remain blocking under the existing deterministic readiness contract. The editor also reports links whose evidence has been deleted, rejected, or superseded and provides a refresh control.

**Authority boundary:** The candidate evidence list comes from the existing `career.listEvidence()` read service, not a new competing store. The backend remains authoritative: on every `prepareDraft` call it rechecks all linked Career Evidence IDs against the canonical SQLite verification states. Reusing an old prepared post through the **Recheck evidence and copy** action calls that same backend validation again; it cannot silently copy a stale package. The exact copy hash remains bound to the approved draft revision, with versioned claim associations in the saved draft. The published-post receipt records a historical user action; it is not a claim that the provider or an AI fact-checked the text.

**Important limitation:** Linking is an explicit user assertion, not automated semantic entailment. No machine can infer from a selected record alone whether a factual sentence has been fully supported or whether confidential information may be disclosed. Posts containing unenumerated claims are still human review only (the core emits a warning, not fabricated verification). Full source lineage suggestions, semantic Truth Gate extension, post-age comparison UI and experiment recommendations are separate work.

**Regression coverage:** The PWA browser workflow tests creating current user-authored Career Evidence, editing and approving a linked claim, persisting the association, superseding the evidence, disabling reuse, rejecting the attempted backend prepare with stale evidence, and re-linking to the successor with new human attestations. This test runs through the existing shared Electron/PWA API in CI. No schema migration or additional provider permissions are required.

## Comparable-age analytics and explainable experiments (fourth implementation slice, 2026-10-08)

**Implemented:** `src/shared/personal-brand-learning.ts` is a pure deterministic read projection over existing Personal Brand receipts, current persisted drafts and append-only analytics snapshots. `src/pages/PersonalBrand.tsx` now displays a cohort comparison and descriptive next-experiment suggestion. It reads every publication's existing `listSnapshots(postId)` through the shared runtime API and refreshes after a newly entered snapshot. No schema migration, extra provider credentials, ChatGPT integration, automatic posting, or inference is introduced.

**Comparable windows:** 24 hours ±3 hours, 48 hours ±6 hours, or 7 days ±12 hours. Cohort age is calculated from each snapshot's **`windowEnd - publishedAt`**, never from the later entry/capture time. Comparisons require a cumulative observation window starting within 15 minutes of actual publication, the selected platform, and the nearest eligible snapshot for each post. The nearest snapshot is chosen **before inspecting its metric values**, to avoid choosing a convenient number. User-selectable outcomes include impressions, unique reached, fully observed engagement components divided by reached, attributed profile views divided by reached, and attributed followers divided by reached. Blank, unknown, estimated, zero-denominator, and partial engagement inputs are excluded with specific reasons. A measured zero with a positive denominator remains an observed zero.

**Honest provenance and versioning:** Rows display the metric's manual/provider observation state, source label, observation age, and exclusion reason. Different source labels and manually transcribed figures raise explicit caveats. If a post's current draft revision does not match its published revision, its historical objective, hook and format are marked unknown. The app does not fabricate metadata from the revised draft. Comparing content attributes is suppressed for such cases.

**Learning output:** With two or more eligible observations, the engine describes a testable one-variable next experiment. Only when two posts have matching known objectives and formats, different known hooks, and comparable observations does it propose a hook variation. It **never** calls one hook a proven winner, predicts reach, asserts platform-label penalties, or attributes hiring outcomes to social posts. With insufficient compatible observations it asks for matching cumulative data instead of ranking posts. The renderer shows included and excluded rows rather than silently dropping weak data.

**Validation:** `tests/personal-brand-learning.test.mjs` covers measurement-window vs capture-time discrepancies, exact/boundary age tolerances, absent/estimated metrics, zero-denominator behavior, complete engagement arithmetic, nearest-snapshot selection, stale draft metadata, different platforms, mixed sources and advisory language. Both normal and unit test commands run it. `tests/pwa/personal-brand.spec.ts` adds a browser end-to-end path for two real local publications, delayed capture of cumulative 24-hour metrics, measured rate comparisons, missing 48-hour windows, missing response components, and persistence across page reloads. Existing PWA/Electron portability and release-upgrade checks remain required.

**Remaining:** Learning cannot control for algorithmic distribution, publication time, audience differences, topical sentiment, or actual interview invitations. The next improvements should include richer **user-verified career outcome attribution** and repeatable experiment planning. Provider integrations and the ChatGPT plugin (#173) are separate, optional tracks; standalone determinism remains the baseline.

## Core principle

> **Job Ranger helps the user decide what professional story to tell, verify that it is grounded in their real evidence, publish exactly what they approved, and learn whether that communication improves professional discovery and career outcomes.**

The baseline system does not write posts for the user.

It structures the decision, checks the draft, preserves provenance, publishes exact approved content when a provider supports it, and interprets observed results through deterministic rules.

## Product boundary

Job Ranger owns the professional presence of a person.

It may use:

- Career Direction / Target Tracks;
- Career Evidence;
- Career Stories;
- projects and work samples;
- credentials;
- applications and search outcomes;
- user-authored professional objectives.

It does not own:

- product ICPs;
- company campaign strategy;
- organization-page content calendars;
- product launches;
- product-market conversion;
- customer acquisition campaigns.

A user's project can appear as professional evidence. That does not turn Job Ranger into the marketing system for that project.

## High-level architecture

```text
Career Direction / Career Evidence / Professional Objective
                         |
                         v
                Presence Brief
                         |
                         v
                User-written Draft
                         |
                         v
        Deterministic Composition Guidance
                         |
                         v
                  Exact Approval
                         |
                         v
               Provider Publication
                         |
                         v
              Publication Receipt
                         |
                         v
           Time-series Analytics Snapshots
                         |
                         v
            Deterministic Comparison
                         |
                         v
            Personal Brand Learning
                         |
                         v
             Career Outcome Evidence
```

## 1. Personal Brand bounded context

Suggested shared-core service boundary:

```text
PersonalBrandService
  briefs
  drafts
  approvals
  publicationExperiments
  analyticsSnapshots
  outcomes
  learning

SocialProviderAdapter
  identity
  capabilities
  publish
  analytics

PersonalBrandGuidanceEngine
  compositionFindings
  readinessFacets
  comparisonCohorts
  advisoryLearning
```

Runtime-specific adapters handle provider transport and secure credential mechanics. Domain rules remain in shared application code.

## 2. Presence Brief

The user begins with the professional reason for posting.

```ts
type PresenceObjective =
  | "recruiter_discovery"
  | "expertise_proof"
  | "project_visibility"
  | "career_narrative"
  | "network_growth"
  | "community_contribution"
  | "job_search_learning"
  | "other";

type IntendedAudience =
  | "recruiters"
  | "hiring_managers"
  | "peers"
  | "founders"
  | "customers"
  | "technical_community"
  | "local_network"
  | "general_professional"
  | "other";

interface PresenceBrief {
  id: string;
  objective: PresenceObjective;
  targetTrackId?: string;
  intendedAudience: IntendedAudience[];
  desiredOutcome: string;
  topic: string;
  professionalTheme:
    | "career_experience"
    | "lesson_learned"
    | "build_proof"
    | "technical_expertise"
    | "industry_observation"
    | "career_transition"
    | "project_release"
    | "work_principle"
    | "other";
  hookArchetype?: string;
  toneConstraints: string[];
  careerEvidenceIds: string[];
  projectReferences: string[];
  destinationId: string;
  format: "text" | "image" | "video" | "document" | "link";
  mediaAssetIds: string[];
  callToAction?: string;
  experimentHypothesis: string;
  createdAt: string;
}
```

## 3. Composition guidance without inference

### 3.1 Guided questions

Job Ranger can help the user compose a post without generating prose.

The composer should ask structured questions based on the objective.

Examples:

**Recruiter discovery**

- What do you want a recruiter to understand about you?
- Which Career Evidence proves it?
- What kind of role or problem does that evidence relate to?
- Is the post understandable without knowing your current job search?

**Expertise proof**

- What did you build, decide, fix, measure, or learn?
- What evidence can be shown?
- What tradeoff or problem makes the work interesting?
- What claim would be misleading if phrased too strongly?

**Career narrative**

- What changed in your thinking or direction?
- What experience supports that change?
- What do you want the reader to remember about your professional identity?

**Project visibility**

- Is the project being shown as evidence of your work or being marketed as a product?
- If the primary objective is users, leads, customers, or product validation, the workflow belongs in Viable rather than Job Ranger.
- If the primary objective is demonstrating what you can build or how you think, it belongs here.

### 3.2 Hook archetypes

Job Ranger may present structures, not generated lines.

| Archetype | User guidance |
| --- | --- |
| Concrete experience | Start with one thing that actually happened. |
| Contradiction | Put two true facts together that appear not to fit. |
| Build proof | State what now works, then show the evidence. |
| Lesson | Begin with the conclusion earned by an experience. |
| Counterintuitive observation | State the professional observation that challenges the expected explanation. |
| Before/after | Contrast an earlier state or belief with the current one. |
| Question | Use only if the body genuinely resolves or investigates it. |

The chosen archetype is stored for later analytics comparison.

### 3.3 Tone constraints

Tone controls are explicit constraints, not rewrite instructions.

Examples:

- analytical, not aggrieved;
- confident, not boastful;
- personal, not confessional;
- technically precise;
- avoid partisan framing;
- avoid naming an employer;
- avoid confidential customer details;
- explain uncertainty;
- no unsupported numeric claims.

The user can add custom constraints.

### 3.4 Deterministic draft findings

```ts
interface PersonalBrandFinding {
  id: string;
  severity: "info" | "warning" | "blocking";
  ruleId: string;
  message: string;
  relatedEvidenceIds?: string[];
  remediationHint?: string;
}
```

Initial rules:

- platform character limit;
- no objective selected;
- no intended audience selected;
- no destination selected;
- factual career claim lacks linked Career Evidence;
- linked Career Evidence is proposed/rejected/superseded rather than current confirmed evidence;
- credential claim references expired/revoked evidence where that matters;
- numeric accomplishment is absent from linked evidence;
- employer/customer name is used while the brief marks it private;
- confidential note/source is referenced by a public draft;
- project claim exceeds the project's recorded role/evidence;
- external link violates destination policy;
- image/video lacks accessibility metadata;
- unsupported media format;
- continuity-dependent opening when standalone discovery is desired;
- selected objective has no intended outcome;
- "single-variable experiment" changed multiple tracked variables;
- draft changed after approval;
- destination/provider capability unavailable.

The engine may point at a problem. It may not rewrite the sentence.

## 4. Readiness facets

Do not create one personal-brand score.

Expose:

- **Evidence readiness**: claims are grounded in current Career Evidence.
- **Positioning readiness**: objective, audience, and professional theme are explicit.
- **Message readiness**: hook, body, CTA, and tone constraints are complete.
- **Privacy readiness**: no protected/private evidence is being exposed unintentionally.
- **Channel readiness**: destination limits and media requirements pass.
- **Experiment readiness**: hypothesis and changed variables are explicit.
- **Approval readiness**: exact content has current user approval.

## 5. Exact-content approval

Publishing is externally consequential.

An approval binds:

- exact content hash/version;
- destination;
- visibility/audience setting where supported;
- media;
- accessibility text;
- scheduled window;
- user identity;
- approval time.

Any content edit invalidates approval.

The first implementation should not rewrite or "improve" content at execution time.

## 6. Publication experiment

```ts
interface PersonalBrandExperiment {
  id: string;
  briefId: string;
  approvedDraftId: string;
  destinationId: string;
  provider: string;
  scheduledFor?: string;
  publishedAt?: string;
  timezone: string;
  providerPublicationId?: string;
  status:
    | "draft"
    | "approved"
    | "scheduled"
    | "publishing"
    | "published"
    | "outcome_unknown"
    | "failed";
  changedVariables: Array<
    "topic" | "hook" | "tone" | "format" | "media" | "timing" | "audience" | "cta"
  >;
}
```

Provider publication identity is the join key for connected analytics.

## 7. Provider-neutral adapter

```ts
interface PersonalSocialCapabilities {
  publishText: boolean;
  publishImage: boolean;
  publishVideo: boolean;
  publicationReceipt: boolean;
  postAnalytics: boolean;
  profileAnalytics: boolean;
  videoAnalytics: boolean;
  commentContent: boolean;
  demographicAnalytics: boolean;
}

interface PersonalSocialProvider {
  capabilities(): Promise<PersonalSocialCapabilities>;

  publishExact(input: {
    destinationId: string;
    approvedDraftId: string;
    body: string;
    media: readonly MediaReference[];
  }): Promise<PublicationProviderResult>;

  collectPostAnalytics(input: {
    destinationId: string;
    providerPublicationId: string;
    window?: { from: string; to: string };
  }): Promise<ProviderAnalyticsResult>;

  collectProfileAnalytics?(input: {
    destinationId: string;
    window?: { from: string; to: string };
  }): Promise<ProviderAnalyticsResult>;
}
```

Provider adapters do not decide what is good career content.

## 8. Runtime capability model

Job Ranger is multi-runtime. Connected social capability must remain honest.

**PWA baseline**

- compose;
- validate;
- approve;
- copy/export exact post package;
- manually record publication receipt;
- manually import analytics;
- compare results and learn.

**Native runtime**

May additionally support, when provider evidence permits:

- secure credential storage;
- connected publishing;
- connected analytics retrieval;
- provider receipt reconciliation.

Do not weaken the PWA because connected publishing requires a native capability.

Do not claim browser-safe token storage or provider CORS support until proven for the specific provider contract.

## 9. Analytics snapshots

```ts
type AnalyticsEvidenceState =
  | "provider_observed"
  | "manual"
  | "estimated"
  | "unavailable"
  | "unknown";

interface PersonalBrandMetric {
  metric: string;
  value?: number;
  unit: "count" | "ratio" | "milliseconds" | "seconds";
  state: AnalyticsEvidenceState;
  providerMetric?: string;
  limitation?: string;
}

interface PersonalBrandAnalyticsSnapshot {
  id: string;
  experimentId: string;
  capturedAt: string;
  windowStartsAt?: string;
  windowEndsAt?: string;
  source: string;
  metrics: PersonalBrandMetric[];
}
```

Suggested observation checkpoints:

- 1 hour;
- 3 hours;
- 24 hours;
- 48 hours;
- 7 days.

These are reminders/checkpoint targets, not a requirement that Job Ranger invent data when the app was not running.

## 10. Metric families

### Distribution

- impressions;
- members/users reached;
- in-network distribution;
- out-of-network distribution;
- video plays.

### Response

- reactions;
- comments;
- reposts/shares;
- saves;
- sends;
- link clicks;
- watch time.

### Personal-brand conversion

- profile views from content;
- followers gained from content;
- relevant connection requests where observable/user-recorded.

### Career outcome

- recruiter profile visit;
- recruiter/hiring-manager message;
- relevant professional inbound;
- portfolio/GitHub visit where attributable;
- referral;
- interview;
- consulting/speaking inquiry;
- job opportunity;
- user-defined outcome.

Career outcomes may be manually confirmed when the provider cannot establish attribution.

## 11. Deterministic derived metrics

```text
impressions_per_reached = impressions / members_reached
engagements = reactions + comments + reposts + saves + sends
engagement_per_reached = engagements / members_reached
comment_rate = comments / members_reached
repost_rate = reposts / members_reached
save_rate = saves / members_reached
profile_conversion = profile_views_from_content / members_reached
follower_conversion = followers_gained_from_content / members_reached
out_of_network_share = out_of_network_impressions / impressions
career_conversion = career_outcomes / members_reached
```

Every derived metric stores formula version and source snapshot IDs.

Unavailable denominators yield unavailable results.

## 12. Objective-aware interpretation

Job Ranger should not interpret every post against one universal engagement target.

Suggested facet priority by objective:

| Objective | Primary evidence | Secondary evidence |
| --- | --- | --- |
| Recruiter discovery | out-of-network reach, profile views, recruiter outcomes | followers, comments |
| Expertise proof | saves, comments, profile views, relevant inbound | reach, followers |
| Project visibility | profile views, project/portfolio visits, relevant inbound | saves, reach |
| Career narrative | profile views, relevant comments, follower conversion | reach |
| Network growth | followers, relevant connections, comments | reach |
| Community contribution | comments, saves, reposts | profile conversion |

This is a deterministic mapping that the user can inspect and override.

Do not create one opaque "personal brand score."

## 13. Cohort comparison

Comparable-post filters should include:

- objective;
- audience;
- professional theme;
- hook archetype;
- format/media;
- weekday;
- time bucket;
- publication age;
- target track;
- destination.

Initial evidence tiers:

- **Insufficient**: fewer than 3 comparable observations.
- **Emerging**: at least 3 across at least 2 dates.
- **Repeatable candidate**: at least 5 with the same directional result in at least 4.
- **Established local pattern**: at least 8 across at least 4 weeks with no single post accounting for more than half of the cited outcome.

These are conservative product heuristics, not claims of causal proof.

## 14. Deterministic learning examples

Allowed:

> Concrete-experience hooks have produced higher median out-of-network reach than product/project announcement hooks in 4 of 5 comparable text posts. Profile conversion is also higher in 3 of 5. Treat this as an emerging pattern.

Allowed:

> There are only two Thursday-afternoon posts in this cohort. Job Ranger does not yet have enough evidence to recommend Thursday afternoon over Tuesday morning.

Allowed:

> This post had high reach but weak recruiter/profile conversion for a recruiter-discovery objective. Do not treat reach alone as a successful career outcome.

Not allowed:

> LinkedIn likes emotional posts, so always be more controversial.

Not allowed:

> Tuesday at 11:30 is your best time to post.

unless the user's own comparable evidence meets the documented recommendation threshold.

## 15. Manual analytics workflow

Until connected analytics exists, Job Ranger should still support the full learning model.

A manual snapshot can record:

- capture time;
- impressions;
- members reached;
- network distribution;
- reactions/comments/reposts/saves/sends;
- profile views/followers;
- demographic observations;
- source note or screenshot reference;
- limitations.

Manual evidence must remain visibly manual.

This is not a temporary hack. It is the permanent fallback when providers withhold an API field.

## 16. Demographic observations

Some platforms expose professional demographics in the UI without exposing the same fields through an API.

Model these separately:

```ts
interface DemographicObservation {
  id: string;
  experimentId: string;
  capturedAt: string;
  source: "provider" | "manual";
  dimension:
    | "seniority"
    | "industry"
    | "job_title"
    | "company_size"
    | "company"
    | "geography"
    | "other";
  label: string;
  share?: number;
  count?: number;
  limitation?: string;
}
```

Do not synthesize a demographic profile by combining unrelated top-category percentages into one imaginary person.

## 17. Privacy and data ownership

Personal-brand analytics can expose sensitive professional behavior.

Rules:

- local-first storage remains authoritative;
- social credentials are runtime capability state, not portable career data;
- portable backups must not contain provider tokens;
- publication content and analytics may be included in user-controlled backup when explicitly part of Job Ranger workspace data;
- imported screenshots/evidence remain local unless the user explicitly exports them;
- Job Ranger must not silently upload Career Evidence to a social provider;
- only the exact approved public content and required media leave the device during publication.

## 18. Implementation slices

### Slice A: Personal Brand domain and manual composition

- add Presence Brief;
- add user-authored draft/version records;
- add hook/theme/tone taxonomies;
- link optional Career Evidence and Target Track;
- add deterministic composition findings and readiness facets;
- add exact-content approval;
- no provider connection.

This is the recommended first implementation slice.

### Slice B: publication experiment and manual outcome capture

- add PersonalBrandExperiment;
- add manual publication receipt;
- add 1h/3h/24h/48h/7d reminder targets;
- add manual analytics snapshots;
- add career outcome events.

This makes the current real-world LinkedIn experiment usable without waiting on provider approval.

### Slice C: analytics comparison and learning

- add deterministic derived metrics;
- add objective-aware facets;
- add cohort filters;
- add evidence tiers;
- add source-citing learning cards;
- add timing/content guidance.

### Slice D: provider capability and credential foundation

- add provider-neutral interface;
- add runtime capability state;
- add secure native credential references;
- keep manual PWA path;
- no connected analytics assumption.

### Slice E: LinkedIn exact publishing

- prove identity and permission boundary;
- publish exact approved text first;
- persist provider publication identity;
- handle ambiguous dispatch without blind retry;
- add media only after text path is proven.

### Slice F: LinkedIn analytics

- add analytics permission/capability detection;
- retrieve supported member-post/profile/video metrics;
- map to normalized snapshots;
- preserve unavailable API-only/UI-only fields honestly.

### Slice G: richer professional outcome linkage

- connect publication experiments to recruiter interactions, portfolio visits, interviews, referrals, or opportunities;
- require user confirmation where attribution is uncertain.

## 19. Test strategy

### Domain tests

- evidence-linked claim validation;
- stale/superseded Career Evidence blocks or warns correctly;
- objective-aware metric priorities;
- formula correctness;
- zero/unavailable denominator handling;
- cohort filtering;
- evidence tier thresholds;
- approval invalidation after edits;
- privacy constraints.

### Provider contract tests

Use fake adapters to test:

- publish success;
- rejected publish;
- ambiguous publish;
- analytics unavailable;
- partial metric response;
- rate limit;
- auth expired;
- provider metric rename/mapping.

### Cross-runtime tests

- PWA supports complete manual workflow;
- native capabilities appear only where available;
- backups exclude credentials;
- portable restore does not falsely restore provider connection authority.

## 20. Non-goals

- requiring an LLM;
- autonomous post writing;
- autonomous posting without exact approval;
- mass posting;
- company-page marketing campaigns;
- product-market analytics;
- one opaque personal-brand score;
- scraping unsupported LinkedIn surfaces;
- a runtime dependency on Viable.

## Relationship to Viable

The architecture intentionally mirrors Viable's publication-experiment and analytics concepts because the mechanical problem is similar.

The semantics are not shared:

- Job Ranger asks whether professional communication advances a person's career.
- Viable asks whether market communication advances a product.

A future common protocol library may remove duplicated HTTP/schema mechanics. It must not become a shared domain or data authority.

## Related documents

- `../adr/0001-personal-brand-publishing-and-analytics.md`;
- `../ARCHITECTURE_PLAN.md`;
- `INFERENCE_CONTRACT.md`;
- `CAREER_EVIDENCE_PERSISTENCE_CONTRACT.md`;
- `SEARCH_LEARNING.md`;
- `../DISTRIBUTION_TRUST.md`.
