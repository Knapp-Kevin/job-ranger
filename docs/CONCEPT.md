# Product Concept

## Purpose

Job Ranger helps ordinary job seekers discover, monitor, evaluate, and manage job opportunities from a private desktop workspace without requiring software-development expertise, a cloud account, or an AI provider just to get started.

## Current Product Shape

The shipped foundation is a local-first career-page monitor. Users add employer career sources, Job Ranger retrieves and classifies those sources, stores discovered jobs locally, filters results, and can notify the user when new opportunities appear.

The active product direction expands that foundation into a broader job-search workspace. Career profile, fit guidance, and application tracking are being developed as native Job Ranger capabilities rather than as a second technical runtime bolted onto the side.

## Design Principles

### Consumer first

A person looking for work should not need to understand GitHub, Node.js, YAML, scraping architecture, model providers, or agent terminology to use the application.

The sophistication of the implementation should reduce the user's cognitive load rather than export it into the interface.

### Local first

Core search state belongs on the user's machine by default. A future remote service must earn its place through a concrete user benefit, clear disclosure, and appropriate privacy/security review.

### Deterministic before inferential

Discovery, storage, filters, monitoring, status tracking, reminders, and explicit requirement matching should continue to work without inference.

Optional inference can later improve fuzzy fit analysis, resume tailoring, interview preparation, career pivots, and explanatory guidance. It should make Job Ranger more capable, not decide whether the application opens its front door.

### Evidence before confidence

Job Ranger must not invent user experience, certifications, licenses, compensation, job requirements, or application history. Ambiguous information should be presented as something to verify, not transformed into certainty by prose quality.

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
- a guarantee that every career page can be extracted successfully.

## Success Standard

The practical acceptance test is simple:

> Can a nontechnical job seeker install Job Ranger, understand what to do next, find useful opportunities, and manage their search without needing the person who built it sitting beside them?

If not, the product still has work to do, regardless of how elegant the underlying architecture happens to be.
