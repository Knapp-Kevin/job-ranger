# Architecture and Evolution Plan

This document describes Job Ranger's current architecture and the intended direction of travel. Older phase plans are retained as historical records and should not be read as current implementation status.

## Current Architecture

```text
┌──────────────────────────────┐
│ React renderer               │
│ Dashboard / Jobs / Companies│
│ Filters / Settings           │
└──────────────┬───────────────┘
               │
               │ preload bridge / typed IPC
               ▼
┌──────────────────────────────┐
│ Electron desktop runtime     │
│ main process + backend       │
└───────┬──────────┬───────────┘
        │          │
        │          ├───────────────► OS integration
        │          │                 notifications / tray / shell
        │          │
        ▼          ▼
     SQLite     Scraping layer
                    │
          ┌─────────┼───────────┐
          ▼         ▼           ▼
      ATS APIs   HTML path   Browser path
```

## Runtime Boundaries

### Renderer

The React renderer owns presentation and user interaction. It does not receive direct Node.js access.

### Preload / IPC

The preload bridge exposes a constrained desktop API to the renderer. IPC is the boundary between user-interface code and privileged desktop behavior.

### Desktop backend

The backend owns persistence, scraper execution, source classification, runtime settings, scrape guards, and application-level desktop services.

### Persistence

Current shipped domain state is stored locally through SQLite-backed repository code. New durable product domains should prefer that same backend persistence model rather than creating unrelated renderer-only storage systems.

## Source Architecture

Job Ranger does not use one universal scraper and pretend the internet agreed on markup.

### Structured API adapters

- Greenhouse
- Lever
- SmartRecruiters
- Ashby

These are the preferred paths where a structured job-board API can be used reliably.

### Generic / detected extraction

Workday, iCIMS, BambooHR, Taleo, Oracle Careers, and generic careers pages can be recognized and routed through generic HTML or browser-backed extraction. These paths are intentionally described as best effort.

### Browser-required extraction

Some sources require a rendered browser context. Browser extraction is an untrusted-content boundary and should remain isolated from renderer privileges.

## Security Boundaries

The desktop shell currently uses:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- a preload boundary;
- external URL validation before opening the system browser;
- a renderer Content Security Policy;
- `X-Frame-Options: DENY` response headers for the renderer;
- sandboxing for the help window.

Any change that weakens those boundaries is a high-impact governance change, not an implementation convenience.

## Quality Architecture

Current automated layers include:

- TypeScript typechecking;
- Vite build validation;
- desktop TypeScript compilation;
- backend smoke tests;
- focused unit tests;
- Electron Playwright E2E coverage;
- PR CI running the `repo:health` baseline.

Passing CI is a gate, not a claim that every third-party careers portal or every supported OS has been fully exercised.

## Evolution Plan

### 1. Consumer job-search domain

The active Career Profile and Applications work should become native Job Ranger domain functionality.

The durable target is:

```text
Career Profile ─┐
                ├──► job fit / guidance
Jobs ───────────┤
                ├──► application workflow
Applications ───┘
```

Profile and application state should ultimately live behind the desktop backend and SQLite persistence rather than remaining renderer-only state.

### 2. Consumer-friendly discovery

The current shipped product expects users to add employer career pages themselves. That is too technical for the long-term audience.

The next discovery layer should let a user express ordinary intent, such as role, geography, commute tolerance, or employer interests, while Job Ranger resolves appropriate sources internally.

Source acquisition and source extraction should remain separate concerns so discovery improvements do not destabilize existing adapters.

### 3. Career intelligence layer

Career intelligence should be a native Job Ranger service boundary, not an embedded second application.

Deterministic capabilities should include explicit requirement matching, credentials, location/pay constraints, status tracking, and evidence-aware scoring.

Optional inference may later enrich:

- fuzzy experience matching;
- fit explanations;
- resume tailoring;
- interview preparation;
- transferable-skill analysis;
- skill/credential gap synthesis.

Inference must remain optional infrastructure. The base application should still function when no provider is configured.

### 4. Evidence and resume model

Resume/import functionality should distinguish source evidence from generated presentation. The system must be able to explain where a claimed skill, certification, responsibility, or accomplishment came from before it places that claim into a tailored resume.

### 5. Toolchain modernization

Issue #38 owns the coordinated migration of Node, Electron, Vite, and Electron ecosystem tooling.

Major upgrades are coupled by runtime and ESM requirements. They should be validated together with clean install, repository health, Electron E2E, and platform packaging rather than landed as unrelated Dependabot PRs.

### 6. Packaging maturity

Windows and macOS are currently published. Further maturity includes:

- supported Electron runtime;
- repeatable Windows packaging validation;
- macOS signing/notarization validation when credentials are available;
- explicit decision on Linux packaging rather than accidental partial support.

## Architectural Non-Goals

Job Ranger should not become:

- a collection of occupation-specific forks;
- a thin wrapper around a second CLI runtime;
- inference-dependent for basic product operation;
- a cloud backend solely because cloud architecture is fashionable;
- an autonomous mass-application system without explicit product and governance decisions.

## Third-Party Mechanisms

Open-source projects can be used as implementation ancestry, evidence, or code donors when licensing permits. Adapted functionality should become native Job Ranger architecture where appropriate, with required attribution preserved.

Career-Ops-related work is currently isolated to the active career-intelligence pull request and is not part of the shipped v1.0.2 architecture.
