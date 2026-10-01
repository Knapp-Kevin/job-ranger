# Universal User Story Validation Matrix

Parent program: #81  
Validation owner: #87

## Purpose

This matrix maps the normative Universal User Stories to materially different synthetic career contexts. It is a validation artifact, not market segmentation and not a collection of occupation-specific product modes.

A story is not complete merely because its schema accepts data from each fixture. Validation must show that the workflow remains coherent, relevant, and truthful.

## Fixture codes

| Code | Context | Primary pressure on the product |
| --- | --- | --- |
| `HL` | Hourly/local worker | hourly compensation, commute, schedule, local discovery |
| `TR` | Skilled trades | credentials/licenses, geography, hands-on experience |
| `HC` | Licensed healthcare | jurisdictional credentials, shifts, eligibility |
| `TE` | Technical/portfolio-heavy | projects, open source, portfolio evidence |
| `GR` | Recent graduate/first job | sparse employment history, education/projects |
| `EX` | Senior executive/confidential search | multiple tracks, seniority, discretion, compensation |
| `CC` | Career changer | transferable evidence, adjacent/stretch roles |
| `FG` | Federal/government applicant | eligibility, grade/process differences, specialized artifacts |
| `CF` | Contractor/freelancer | engagements, project evidence, non-permanent arrangements |
| `RT` | Return-to-work/nonlinear history | timeline gaps without negative inference, mixed evidence |

## Status vocabulary

- `pending` — required validation has not yet been recorded.
- `partial` — some implementation/validation exists, but not enough to satisfy this matrix.
- `validated` — required contexts have current evidence and no unresolved blocker for the story.
- `deferred` — explicitly deferred with a linked issue/rationale.
- `not-applicable` — allowed only for a specific context with written rationale.

No story in this matrix is marked `validated` merely because an earlier single-occupation test passed.

## Story matrix

| Story | Owner | Required fixture contexts | Initial state |
| --- | --- | --- | --- |
| US-0 Adapt to the way my career works | #81 / #87 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-1 Resume-first onboarding | #82 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-2 No-resume onboarding | #82 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-3 Goal-first onboarding | #82 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-4 Multiple career targets | #83 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-5 Hard constraints vs preferences | #83 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-6 Employment arrangements | #83 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-7 Nontraditional experience | #84 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-8 Credentials that matter | #84 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-9 Evidence provenance | #84 / #59 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-10 Correct my record | #84 / #59 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-11 Find employers/sources for me | #85 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-12 Search beyond employer career pages | #85 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-13 Trust discovered sources | #85 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-14 Explain eligibility | #86 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-15 Explain evidence coverage | #86 / completed R2 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-16 Explain career alignment | #86 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-17 Explain preference alignment | #86 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-18 Show uncertainty | #86 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-19 Tailor my resume | #64 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-20 Explain resume changes | #64 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-21 Create application materials | #65 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-22 Preserve what I submitted | #65 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-23 Track applications | #65 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |
| US-24 Track people and events | #65 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-25 Remind me when action is needed | #65 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-26 Prepare me for interviews | #65 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-27 Show recurring gaps | #65 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-28 Show what is working | #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-29 Help me reconsider strategy | #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | pending |
| US-30 Preserve my career history over time | #59 / #65 / #88 | HL, TR, HC, TE, GR, EX, CC, FG, CF, RT | partial |

## Evidence requirements

A story can move to `validated` only when its issue or linked evidence records:

1. the fixture data/version used;
2. deterministic/domain tests where practical;
3. Electron product validation for user-facing workflows where practical;
4. any manual UX observations that cannot reasonably be automated;
5. known limitations and whether they are blocking;
6. proof that the story did not weaken Career Evidence authority, privacy boundaries, or user authority.

## Fixture rules

- Fixtures must be synthetic and reviewable.
- Fixtures must avoid irrelevant sensitive personal characteristics.
- A fixture may contain multiple target tracks when the story requires it.
- Domain-specific facts belong only where they are relevant to the fixture.
- Do not add global UI fields merely to make one fixture convenient.
- When a fixture exposes a real product defect, create or link a product issue rather than hard-coding fixture-specific behavior.

## Completion

Issue #87 closes when the matrix is backed by maintained synthetic fixtures and current validation evidence for the critical Universal User Story flows. Issue #81 cannot close while required matrix rows remain `pending` or `partial` without an explicit defer/reject decision.
