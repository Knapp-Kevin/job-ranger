# Security Policy

## Supported Scope

Job Ranger is a local-first personal desktop application. The latest published release and current `main` branch are the versions considered for security maintenance.

The v1.1.0 line runs on the supported Electron 44.4.5 runtime and the coordinated Node 22.12 / Vite 8 / TypeScript 7 toolchain. It should still not be represented as a hardened enterprise endpoint or centrally managed security product.

## Security Model

Current desktop protections include:

- Electron renderer `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- a preload/IPC boundary rather than direct Node access from the renderer;
- validation before external URLs are opened;
- a renderer Content Security Policy;
- sandboxing for the separate help window;
- local persistence rather than a hosted account backend.

These controls reduce risk but do not make arbitrary career pages trustworthy. Job Ranger intentionally retrieves content from third-party sites, and scraper/browser paths remain an untrusted-data boundary.

## Data Handling

Job Ranger stores application state locally. Network access is used to retrieve job-source content and, where applicable, load career pages through Electron's browser facilities.

SQLite-backed storage owns companies, jobs, filters, settings, and scrape history. Career Profile and Applications are also local in v1.1.0 but currently use renderer-local storage pending migration behind the desktop backend.

Do not add telemetry, remote account sync, or external inference transmission without an explicit product decision, clear user disclosure, and appropriate security/privacy review.

## Reporting a Vulnerability

Do **not** publish exploit details in a public issue.

If GitHub presents a private **Report a vulnerability** option for this repository, use that channel. If no private reporting channel is available, open a public issue containing only a request for a private security contact and omit the vulnerability details.

A useful private report includes:

- affected version or commit;
- reproduction steps;
- expected and actual behavior;
- realistic impact;
- whether user interaction is required;
- any suggested mitigation, if known.

## Security-Relevant Contribution Rules

Changes touching any of the following require explicit review and tests appropriate to the risk:

- Electron `webPreferences`;
- preload or IPC exposure;
- external URL handling;
- HTML/browser extraction;
- local filesystem paths;
- SQLite access or migrations;
- Career Profile or Applications persistence migration;
- update/install behavior;
- credential or inference-provider handling;
- new remote services or telemetry.

Fail closed where a malformed or deceptive source could cause unsafe navigation or execution.

## Dependency Security

Dependabot is enabled and pull-request CI performs clean installation, dependency audit reporting, and `npm run repo:health`. Major dependency upgrades are reviewed as coordinated migrations rather than merged solely because a bot opened a green pull request.

The v1.1.0 release-prep dependency audit reports zero known npm vulnerabilities. The former issue #38 modernization moved the project to Node.js 22.12+, Electron 44.4.5, Vite 8, TypeScript 7, and current Node 22-compatible Electron tooling.

Security status should continue to be established from the current lockfile and CI/release evidence rather than from stale historical dependency counts.
