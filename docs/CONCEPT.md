# Product Concept

## Purpose

Job Ranger helps ordinary job seekers discover, monitor, evaluate, and manage job opportunities from a private desktop workspace without requiring software-development expertise, a cloud account, or an AI provider just to get started.

The product is not built around one occupation, one employment model, or one conventional career path. Its user-facing contract is defined through universal user stories and validated against materially different career contexts.

## North-star user story

> **US-0:** As a job seeker, I want Job Ranger to adapt to the way my career works without requiring me to understand how Job Ranger works.

The full catalog lives in [`design/UNIVERSAL_USER_STORIES.md`](./design/UNIVERSAL_USER_STORIES.md) and is tracked by program issue #81.

## Current Product Shape

The published v1.1.2 release combines a local-first career-page monitor with the first native Career Intelligence workflow. Development on `main` is materially ahead of that release and includes durable Career Evidence, requirement/evidence mapping, and deterministic resume creation.

Users can already:

- maintain an occupation-agnostic Career Profile;
- add employer career sources for Job Ranger to monitor;
- collect and review jobs locally;
- see deterministic fit/evidence guidance based on saved profile data and collected listing evidence;
- track promising jobs through application states and notes;
- import career evidence and review its authority/provenance in the current development line;
- create deterministic evidence-backed resume artifacts in the current development line;
- filter results and receive desktop notifications.

Current gaps are now expressed as user-story work rather than disconnected feature lists. Major gaps include progressive first-run onboarding, multiple target tracks and hard-vs-soft constraints, broader Career Evidence coverage, consumer-friendly source discovery, explainable multi-dimensional opportunity assessment, and the broader application lifecycle.

## Design Principles

### Consumer first

A person looking for work should not need to understand GitHub, Node.js, YAML, scraping architecture, model providers, agent terminology, or ATS vendor taxonomy to use the application.

The sophistication of the implementation should reduce the user's cognitive load rather than export it into the interface.

### Universal core, bounded extensions

Job Ranger models the person, the opportunity, and the evidence without assuming what a “normal” career looks like.

The core workflow remains shared across career contexts. Occupation-specific concepts such as licenses, clearances, shift requirements, grade systems, portfolios, or other domain facts may be represented through bounded vocabularies/rules where necessary, but they should not fork Job Ranger into occupation-specific products.

Universality also does not justify an unbounded entity/attribute/value model that erases meaning merely because it can technically store anything.

### Local first

Core search state belongs on the user's machine by default. A future remote service must earn its place through a concrete user benefit, clear disclosure, and appropriate privacy/security review.

### Deterministic before inferential

Discovery, storage, filters, monitoring, status tracking, explicit requirement matching, and core Career Evidence workflows should continue to work without inference.

Optional inference can improve semantic mapping, resume tailoring, interview preparation, career pivots, and explanatory guidance. It should make Job Ranger more capable, not decide whether the application opens its front door.

### Evidence before confidence

Job Ranger must not invent user experience, certifications, licenses, compensation, job requirements, or application history. Ambiguous information should be presented as something to verify, not transformed into certainty by prose quality.

Career Evidence, not a resume or model response, is the canonical factual career domain. Imported and inferred information remains proposed until the user grants factual authority through the accepted evidence workflow.

### Preferences are not constraints

A preference such as remote work, compensation target, commute, schedule, travel, or employment arrangement must not silently become a disqualifier. The product must distinguish required constraints, meaningful preferences, and aspirational targets.

### Explain fit, do not simulate certainty

Job Ranger should explain eligibility/blockers, evidence coverage, career alignment, preference alignment, and unknowns separately. A single opaque percentage must not be presented as a hiring prediction or universal truth about fit.

### Honest source support

Career sites vary wildly. Job Ranger distinguishes supported structured adapters, detected best-effort paths, browser-required sources, and manual-review cases instead of pretending every page can be scraped reliably.

Source discovery remains separate from source acquisition. A discovered source is a candidate until the user approves it and Job Ranger can represent its support/trust state honestly.

### User authority

Job Ranger is a decision-support tool. It can find, organize, explain, and prepare. Autonomous application submission or other consequential external actions are not implied by the product and would require explicit future governance.

## What Job Ranger Is Not

Job Ranger is not currently:

- a recruiter-facing applicant tracking system;
- a hosted job-search social network;
- a cloud-account requirement wrapped around a desktop app;
- an AI-only career assistant;
- an autonomous mass-application bot;
- a guarantee that every career page or market source can be extracted successfully;
- a prediction engine that can know whether an employer will hire the user;
- a collection of occupation-specific profile forks.

## Success Standard

The practical acceptance test remains simple:

> Can a nontechnical job seeker install Job Ranger, understand what to do next, find useful opportunities, and manage their search without needing the person who built it sitting beside them?

The universal-user extension adds a second test:

> Does that workflow remain coherent when the user is hourly, salaried, licensed, portfolio-heavy, early-career, executive, changing careers, seeking government work, contracting, or returning after a nonlinear career history?

If not, the product still has work to do, regardless of how elegant the underlying architecture happens to be.
