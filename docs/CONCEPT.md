# Product Concept

## Purpose

Job Ranger helps ordinary job seekers discover, monitor, evaluate, prepare for, and manage job opportunities from a private desktop workspace without requiring software-development expertise, a cloud account, or an AI provider just to get started.

The product is not built around one occupation, one employment model, or one conventional career path. Its user-facing contract is defined through universal user stories and validated against materially different career contexts.

## North-star user story

> **US-0:** As a job seeker, I want Job Ranger to adapt to the way my career works without requiring me to understand how Job Ranger works.

The full catalog lives in [`design/UNIVERSAL_USER_STORIES.md`](./design/UNIVERSAL_USER_STORIES.md).

## Product shape

The latest published release is still **v1.1.2**, but current `main` is a much broader product.

The implemented workflow now spans:

- progressive onboarding;
- multiple Target Tracks;
- local Career Evidence import and direct authoring;
- source monitoring plus partial consumer source discovery;
- explainable opportunity assessment;
- evidence-backed resume creation and tailoring;
- exact submitted-artifact history;
- application contacts, milestones, reminders, interviews, and offers;
- evidence-grounded interview preparation;
- reusable Career Stories;
- evidence-grounded application materials;
- Search Insights and recurring-gap analysis;
- verified local backup/restore;
- JSON Resume interoperability.

This breadth does not change the product's authority model. Career Evidence remains factual truth; Target Tracks remain intent; Applications own lifecycle state; external services remain adapters.

## Design principles

### Consumer first

A person looking for work should not need to understand GitHub, Node.js, YAML, scraping architecture, model providers, agent terminology, or ATS vendor taxonomy to use Job Ranger.

Implementation sophistication should reduce user cognitive load rather than export it into the interface.

### Universal core, bounded extensions

Job Ranger models the person, the opportunity, and the evidence without assuming what a “normal” career looks like.

The core remains shared across career contexts. Occupation-specific concepts such as licenses, clearances, shift requirements, grade systems, portfolios, or specialized document formats may be represented through bounded vocabularies/rules where evidence demonstrates the need.

Universality does not justify an unbounded entity/attribute/value model that erases meaning merely because it can technically store anything.

### Local first

Core search state belongs on the user's machine by default.

A remote service must earn its place through a concrete benefit, explicit disclosure, and security/privacy review. Backup/restore exists before cloud sync because portability is useful without requiring an account.

### Deterministic before inferential

Discovery, persistence, monitoring, evidence review, requirement mapping, opportunity assessment, resume creation/tailoring, application materials, interview prep, Career Stories, lifecycle tracking, and Search Insights all have deterministic paths.

Optional inference may improve semantic interpretation or language later, but it should make Job Ranger more capable rather than deciding whether the product is usable.

### Evidence before confidence

Job Ranger must not invent user experience, credentials, compensation, employer requirements, application history, or outcomes.

Career Evidence, not a resume or model response, is the canonical factual career domain.

Imported information remains proposed until the user grants factual authority. Historical materials preserve what was true/used at the time and can become visibly stale when current evidence changes.

### Preferences are not constraints

Remote work, compensation, commute, schedule, employment arrangement, and similar search choices must preserve their intended strength. A preference is not silently promoted to a blocker.

### Explain fit, do not simulate certainty

Job Ranger separates:

- eligibility;
- evidence coverage;
- career alignment;
- preference alignment;
- blockers;
- unknowns.

Unknown information remains unknown. A single opaque percentage must not be presented as a hiring prediction or universal truth.

### Honest source support

Career sites vary wildly.

Job Ranger distinguishes structured supported adapters, detected best-effort paths, browser-required sources, and manual-review cases. Discovery remains separate from acquisition, and a discovered source does not become trusted/monitored without explicit user approval.

### User authority

Job Ranger is a decision-support tool.

It can find, organize, explain, prepare, remind, preserve, and analyze. The user remains responsible for consequential external actions, including submitting an application.

### Historical truth matters

The product must preserve what actually happened:

- what source text Job Ranger saw;
- what Career Evidence existed at the time;
- what resume was submitted;
- what application material was prepared;
- how evidence was corrected later;
- what outcomes were observed.

A later correction should improve current truth without rewriting history.

## What Job Ranger is not

Job Ranger is not currently:

- a recruiter-facing applicant tracking system;
- a hosted job-search social network;
- a mandatory cloud-account product;
- an AI-only career assistant;
- an autonomous mass-application bot;
- a guarantee that every third-party career page can be extracted successfully;
- a prediction engine that can know whether an employer will hire the user;
- a collection of occupation-specific profile forks;
- a generic agent/runtime platform looking for a reason to exist.

## Current product frontier

The completion of the Universal User Stories and Career Evidence programs does not mean there are no remaining ideas.

The strongest current **needed** gaps are:

1. fuller/canonical job-description preservation where source capabilities permit it;
2. better dynamic-source failure diagnostics and reliability measurement;
3. publishing a new release containing the product already implemented on `main`.

Current **candidate** ideas include broader discovery providers, faster arbitrary-job capture, reusable application-question answers, bounded user-controlled form assistance, broader networking workflows, calendar mirroring, and mock-interview practice.

Current **deferred** capabilities include remote inference, OCR, DOCX resume export, specialized federal/academic document projections, cloud sync, and Linux packaging until evidence justifies the complexity.

See [`PRODUCT_GAP_REVIEW.md`](./PRODUCT_GAP_REVIEW.md).

## Success standard

The practical acceptance test remains:

> Can a nontechnical job seeker install Job Ranger, understand what to do next, find useful opportunities, prepare truthful materials, and manage their search without needing the person who built it sitting beside them?

The universality test remains:

> Does that workflow stay coherent when the user is hourly, salaried, licensed, portfolio-heavy, early-career, executive, changing careers, seeking government work, contracting, or returning after a nonlinear career history?

The release test adds a third question:

> Can the repository prove that the downloadable installer actually contains the capabilities the documentation claims it contains?

If any answer is no, the product still has work to do regardless of how elegant the architecture looks on a diagram.
