# Product Concept

## Purpose

Job Ranger helps ordinary job seekers discover, monitor, evaluate, and manage job opportunities from a private desktop workspace without requiring software-development expertise, a cloud account, or an AI provider just to get started.

## Current Product Shape

Job Ranger v1.1.0 combines a local-first career-page monitor with the first native Career Intelligence workflow.

Users can:

- create a Career Profile with roles, location, pay, skills, credentials, and work preferences;
- add employer career sources for Job Ranger to monitor;
- collect and review jobs locally;
- see deterministic fit guidance based on profile data and collected listing evidence;
- track promising jobs through application states and notes;
- filter results and receive desktop notifications.

Career Profile, fit guidance, and application tracking are native Job Ranger capabilities rather than a second technical runtime bolted onto the side.

The current product still expects users to know which employer career pages to add. Consumer-friendly source discovery, durable backend persistence for Career Profile/Applications, resume evidence handling, and optional inference remain future product slices.

## Design Principles

### Consumer first

A person looking for work should not need to understand GitHub, Node.js, YAML, scraping architecture, model providers, or agent terminology to use the application.

The sophistication of the implementation should reduce the user's cognitive load rather than export it into the interface.

### Local first

Core search state belongs on the user's machine by default. A future remote service must earn its place through a concrete user benefit, clear disclosure, and appropriate privacy/security review.

### Deterministic before inferential

Discovery, storage, filters, monitoring, status tracking, and explicit requirement matching should continue to work without inference.

Optional inference can later improve fuzzy fit analysis, resume tailoring, interview preparation, career pivots, and explanatory guidance. It should make Job Ranger more capable, not decide whether the application opens its front door.

### Evidence before confidence

Job Ranger must not invent user experience, certifications, licenses, compensation, job requirements, or application history. Ambiguous information should be presented as something to verify, not transformed into certainty by prose quality.

The Career Profile starter flows are intentionally conservative. For example, the HVAC starter can suggest target job titles but does not grant the user licenses, certifications, or skills they did not enter themselves.

### Honest source support

Career sites vary wildly. Job Ranger distinguishes supported structured adapters, detected best-effort paths, browser-required sources, and manual-review cases instead of pretending every page can be scraped reliably.

### User authority

Job Ranger is a decision-support tool. It can find, organize, explain, and prepare. Autonomous application submission or other consequential external actions are not implied by the product and would require explicit future governance.

## What Job Ranger Is Not

Job Ranger is not currently:

- a recruiter-facing applicant tracking system;
- a hosted job-search social network;
- a cloud-account requirement wrapped around a desktop app;
- an AI-only career assistant;
- an autonomous mass-application bot;
- a guarantee that every career page can be extracted successfully;
- a prediction engine that can know whether an employer will hire the user.

## Success Standard

The practical acceptance test is simple:

> Can a nontechnical job seeker install Job Ranger, understand what to do next, find useful opportunities, and manage their search without needing the person who built it sitting beside them?

If not, the product still has work to do, regardless of how elegant the underlying architecture happens to be.
