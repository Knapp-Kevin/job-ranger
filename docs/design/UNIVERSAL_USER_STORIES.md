# Universal User Stories

**Program:** #81 — Universal User Stories

## Purpose

Job Ranger should work across materially different career paths without requiring the product to know what a “normal” career looks like.

The product contract is expressed through **user stories**. Career archetypes and synthetic personas are validation fixtures only. They exist to expose hidden assumptions, not to define separate versions of Job Ranger.

## North-star user story

> **US-0:** As a job seeker, I want Job Ranger to adapt to the way my career works without requiring me to understand how Job Ranger works.

## Governing rules

1. Career Profile owns intent and preferences, not factual career history.
2. Career Evidence owns factual career history and provenance.
3. Applications owns the search lifecycle.
4. Parsers, search providers, and inference providers may propose information; they do not establish factual truth.
5. Core workflows remain useful without inference.
6. Unknown information remains unknown rather than becoming an arbitrary negative or positive signal.
7. Hard constraints and preferences have different semantics.
8. Occupation-specific concepts may extend the universal core through bounded vocabularies/rules, but must not fork the product into occupation-specific applications.
9. Universality must not be implemented as an unbounded entity/attribute/value schema that erases meaning.
10. Consequential external actions remain under user authority.

## User-story catalog

### Start from whatever I have

#### US-1 — Resume-first onboarding

As a job seeker with an existing resume, I want to import it so Job Ranger can build an initial evidence set without making me retype my career history.

Owned by: #82, using the Career Evidence import architecture from #59.

#### US-2 — No-resume onboarding

As a job seeker without a resume, I want to describe my background incrementally so I can use Job Ranger without first creating a traditional resume.

Owned by: #82.

#### US-3 — Goal-first onboarding

As a user who knows what I want but has not entered my history yet, I want to start with target work and constraints so Job Ranger can begin helping immediately.

Owned by: #82.

### Describe what I want

#### US-4 — Multiple career targets

As a job seeker pursuing more than one career direction, I want separate target tracks so Job Ranger does not mix incompatible goals.

Owned by: #83.

#### US-5 — Hard constraints vs preferences

As a job seeker, I want to distinguish requirements from preferences so Job Ranger does not reject a good opportunity because of something I merely prefer.

Owned by: #83.

#### US-6 — Employment arrangements

As a user, I want to specify acceptable work arrangements without Job Ranger assuming permanent salaried full-time employment.

Owned by: #83.

### Represent what I can actually prove

#### US-7 — Nontraditional experience

As someone whose experience is not entirely conventional employment, I want legitimate projects, freelance work, open-source work, volunteer work, military/service experience, portfolios, and other evidence to participate in matching.

Owned by: #84.

#### US-8 — Credentials that matter

As someone in a credentialed field, I want licenses, certifications, clearances, registrations, and eligibility facts represented explicitly rather than flattened into generic skills.

Owned by: #84.

#### US-9 — Evidence provenance

As a user, I want every factual claim to remain traceable to its source and authority state.

Owned by: #84 and existing Career Evidence contracts under #59.

#### US-10 — Correct my record

As a user, I want to edit, merge, reject, supersede, and confirm evidence when the imported record is incomplete, duplicated, or wrong.

Owned by: #84 and existing Career Evidence review behavior.

### Find opportunities

#### US-11 — Find employers and sources for me

As a user who knows the kind of work I want but not which companies hire for it, I want Job Ranger to discover likely employers and opportunity sources.

Owned by: #85.

#### US-12 — Search beyond employer career pages

As a user, I want Job Ranger to discover opportunities from relevant source classes without requiring me to understand ATS vendors or career-page URLs.

Owned by: #85.

#### US-13 — Trust discovered sources

As a user, I want to review and approve discovered sources before Job Ranger begins monitoring them.

Owned by: #85.

### Decide what deserves attention

#### US-14 — Explain eligibility

As a user, I want to know whether I appear eligible for an opportunity and what requirement could block me.

Owned by: #86.

#### US-15 — Explain evidence coverage

As a user, I want to see which requirements my evidence directly supports, which are transferable, which are ambiguous, and which remain gaps.

Owned by: #86, building on completed R2 requirement/evidence mapping.

#### US-16 — Explain career alignment

As a user, I want to know whether an opportunity advances the career direction represented by the selected target track.

Owned by: #86.

#### US-17 — Explain preference alignment

As a user, I want to understand alignment with compensation, geography, work mode, schedule, travel, employment arrangement, and other preferences/constraints I supplied.

Owned by: #86.

#### US-18 — Show uncertainty

As a user, I want Job Ranger to distinguish known match, known mismatch, missing information, and uncertain interpretation.

Owned by: #86.

### Pursue opportunities truthfully

#### US-19 — Tailor my resume

As a user, I want Job Ranger to emphasize relevant verified experience for a specific opportunity without introducing unsupported claims.

Owned by: #64 and reconciled through #88.

#### US-20 — Explain resume changes

As a user, I want to see what changed between resume versions and why.

Owned by: #64 and reconciled through #88.

#### US-21 — Create application materials

As a user, I want Job Ranger to help create application materials from confirmed Career Evidence.

Owned by: #65 and reconciled through #88.

#### US-22 — Preserve what I submitted

As a user, I want the exact resume and application materials associated with an Application so I know what the employer received.

Owned by: #65 and reconciled through #88.

### Manage the search

#### US-23 — Track applications

As a user, I want to track each opportunity through interest, application, interview, offer, rejection, withdrawal, and other outcomes.

Existing product capability; downstream lifecycle ownership is #65/#88.

#### US-24 — Track people and events

As a user, I want to record recruiters, hiring managers, interviews, deadlines, follow-ups, and important dates.

Owned by: #65/#88.

#### US-25 — Remind me when action is needed

As a user, I want reminders for follow-ups, interviews, application deadlines, and other meaningful events.

Owned by: #65/#88.

#### US-26 — Prepare me for interviews

As a user, I want interview preparation grounded in the actual job, confirmed Career Evidence, and exact submitted materials.

Owned by: #65/#88.

### Learn from the search

#### US-27 — Show recurring gaps

As a user, I want to see requirements that repeatedly appear in jobs I want but that my confirmed evidence does not support.

Owned by: #65/#88.

#### US-28 — Show what is working

As a user, I want to see which target tracks, opportunity types, sources, and approaches correlate with downstream progress in my actual application history.

Owned by: #88.

#### US-29 — Help me reconsider strategy

As a user whose search is not producing downstream progress, I want Job Ranger to surface evidence-based strategy signals without inventing causal certainty or reducing the search to activity quotas.

Owned by: #88.

#### US-30 — Preserve my career history over time

As a user, I want Job Ranger to maintain an increasingly complete Career Evidence record rather than reconstructing my history from each new resume.

Owned by: the Career Evidence architecture plus #65 portability and #88 reconciliation.

## Universal opportunity assessment

Job Ranger should not reduce every opportunity to one opaque universal percentage.

The user-facing assessment should instead separate at least:

- **eligibility/blockers**;
- **evidence coverage**;
- **career-track alignment**;
- **preference/constraint alignment**;
- **unknowns/uncertainty**.

A compact summary is acceptable, but users must be able to inspect the evidence, requirement, constraint, or source limitation behind the conclusion.

## Progressive onboarding

First-run setup should support three valid entry paths:

1. **resume-first** — import an existing artifact and review proposed evidence;
2. **evidence-first/manual** — enter relevant background incrementally without a resume;
3. **goal-first** — define target work and initial constraints, then add evidence later.

Partial profiles are valid product states. Job Ranger should become more useful as information is added rather than refusing to work until a large form is complete.

## Target tracks and constraint semantics

A user may pursue materially different directions at the same time. A target track can contain role concepts, seniority direction, compensation, geography, work mode, employment arrangement, schedule, travel, relocation, and other preferences.

Preferences must distinguish at least:

- **required** — violating this makes the opportunity unacceptable unless the user changes the requirement;
- **preferred** — a meaningful positive/negative factor but not a disqualifier;
- **target** — an aspirational value such as target compensation that does not become a hard floor.

## Validation model

Issue #87 owns the cross-career validation standard.

Minimum representative contexts include:

- hourly/local work;
- skilled trades;
- licensed healthcare;
- technical/portfolio-heavy work;
- recent graduate/first job;
- senior executive/confidential search;
- career change/transferable skills;
- federal/government employment;
- contract/freelance work;
- return-to-work/nonlinear career history.

These contexts are synthetic fixtures, not target-market segmentation and not separate product modes.

For each US-0 through US-30 story, validation records one of:

- applicable and automated;
- applicable and manually validated;
- not applicable with rationale;
- blocked/deferred with a linked issue.

## Program completion

Issue #81 closes only when every user story is implemented and validated or explicitly deferred/rejected with rationale, the validation matrix is maintained, and current roadmap/system documentation reflects the resulting product state.
