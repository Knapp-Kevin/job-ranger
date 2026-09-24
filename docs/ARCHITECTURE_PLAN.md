# Architecture and Evolution Plan

This document describes Job Ranger's current architecture and intended direction. Older phase plans are retained as historical records and should not be read as current implementation status.

## Current Architecture

```text
┌─────────────────────────────────────┐
│ React renderer                      │
│ Home / Find Jobs / Applications     │
│ Career Profile / Companies          │
│ Filters / Settings                  │
└──────────────────┬──────────────────┘
                   │
                   │ preload bridge / typed IPC
                   ▼
┌─────────────────────────────────────┐
│ Electron 44 desktop runtime         │
│ main process + backend              │
└──────────┬───────────┬──────────────┘
           │           │
           │           ├──────────────► OS integration
           │           │                notifications / tray / shell
           ▼           ▼
        SQLite      Scraping layer
                       │
             ┌─────────┼───────────┐
             ▼         ▼           ▼
         ATS APIs   HTML path   Browser path

Renderer-local Career Profile / Applications
        │
        └── planned migration to backend + SQLite
```

## Runtime Boundaries

### Renderer

The React renderer owns presentation and ordinary user interaction. It does not receive direct Node.js access.

The Career Profile and Applications domains are native Job Ranger functionality in v1.1.0. Their current persistence is renderer-local; this is an acknowledged transitional boundary, not the intended final storage architecture.

### Preload / IPC

The preload bridge exposes a constrained desktop API to the renderer. IPC is the boundary between user-interface code and privileged desktop behavior.

### Desktop backend

The backend owns SQLite persistence, scraper execution, source classification, runtime settings, scrape guards, and application-level desktop services.

### Persistence

Current durable backend state is SQLite-backed for companies, jobs, filters, settings, and scrape history.

Career Profile and Applications are local in v1.1.0 but still use renderer-local storage. Their next architectural step is migration behind the same backend repository boundary, with data migration rather than casually abandoning existing local state.

## Career Intelligence Architecture

Career Intelligence is native Job Ranger behavior rather than an embedded Career-Ops runtime or a second CLI application.

The current deterministic flow is:

```text
Career Profile ──────┐
                     ├──► deterministic fit evaluation ──► Find Jobs guidance
Collected Job Data ──┘

Find Jobs ──► user chooses Track this job ──► Applications
```

The scorer uses explicit profile information and collected listing evidence. It is designed for prioritization and explanation, not as a hiring-outcome prediction.

Career-Ops served as implementation ancestry/design evidence for portions of the career-search workflow. Required MIT attribution is preserved in `THIRD_PARTY_NOTICES.md`. Job Ranger remains an independent project and does not embed the Career-Ops runtime.

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

The desktop shell uses:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- a preload boundary;
- external URL validation before opening the system browser;
- a renderer Content Security Policy;
- `X-Frame-Options: DENY` response headers for the renderer;
- sandboxing for the help window.

Any change that weakens those boundaries is a high-impact governance change, not an implementation convenience.

## Runtime and Build Architecture

The v1.1.0 baseline is deliberately coordinated:

- Node.js `>=22.12.0`;
- Electron `44.4.5`;
- Vite `8.x`;
- TypeScript `7.0.2`;
- React `19.2.3`;
- Electron Builder `26.x`.

Electron ecosystem tooling now includes the Node 22-compatible `@electron/notarize` 3.x and `@electron/fuses` 2.x lines. The Electron Builder notarization hook remains CommonJS and dynamically imports the ESM-only notarization package when Apple credentials are available.

Major runtime/toolchain upgrades should continue to be treated as coordinated compatibility migrations rather than independent dependency bumps.

## Quality Architecture

Automated layers include:

- TypeScript typechecking;
- Vite production build validation;
- desktop TypeScript compilation;
- backend smoke tests;
- focused unit tests;
- Electron Playwright E2E coverage;
- PR and `main` CI;
- dependency audit reporting.

The current Electron E2E suite passes 11/11 on the Electron 44 runtime. Passing CI is a gate, not a claim that every third-party careers portal or every supported OS has been fully exercised.

## Evolution Plan

### 1. Durable Career Intelligence persistence

Move Career Profile and Applications behind the desktop backend and SQLite repository boundary.

The migration should preserve existing user data where practical and add deterministic persistence/scorer coverage.

### 2. First-run and consumer-friendly discovery

The current product still expects users to add employer career pages themselves. That is too technical for the long-term audience.

First-run should guide the user through Career Profile and then let ordinary intent such as role, geography, commute tolerance, and employer interests drive source discovery.

Source acquisition and source extraction should remain separate concerns so discovery improvements do not destabilize existing adapters.

### 3. Evidence and resume model

Resume/import functionality should distinguish source evidence from generated presentation. The system must be able to explain where a claimed skill, certification, responsibility, or accomplishment came from before it places that claim into tailored application material.

### 4. Optional inference layer

Inference may later enrich:

- fuzzy experience matching;
- richer fit explanations;
- resume tailoring;
- interview preparation;
- transferable-skill analysis;
- skill/credential gap synthesis.

Inference remains optional infrastructure. The base application must still function when no provider is configured, and remote inference must not silently receive personal career data.

### 5. Source and packaging maturity

Continue evidence-based improvements for dynamic source families, maintain Windows/macOS packaging confidence, validate notarization whenever production Apple credentials are available, and decide explicitly whether Linux becomes a supported packaged target.

## Architectural Non-Goals

Job Ranger should not become:

- a collection of occupation-specific forks;
- a thin wrapper around a second CLI runtime;
- inference-dependent for basic product operation;
- a cloud backend solely because cloud architecture is fashionable;
- an autonomous mass-application system without explicit product and governance decisions.

## Third-Party Mechanisms

Open-source projects can be implementation ancestry, evidence, or code donors when licensing permits. Adapted functionality should become native Job Ranger architecture where appropriate, with required attribution preserved.

Career-Ops-related concepts used in the Career Intelligence foundation are now native Job Ranger functionality. Attribution and the independence/trademark boundary are documented in `THIRD_PARTY_NOTICES.md`.
