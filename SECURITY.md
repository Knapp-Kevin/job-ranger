# Security Policy

## Supported Scope

Job Ranger is a local-first personal desktop application. The latest published release and the current `main` branch are the only versions considered for security maintenance.

The current published release is functional but still undergoing dependency and Electron toolchain modernization. It should not be represented as a hardened enterprise endpoint or a centrally managed security product.

## Security Model

Current desktop protections include:

- Electron renderer `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- a preload/IPC boundary rather than direct Node access from the renderer;
- validation before external URLs are opened;
- a renderer Content Security Policy;
- local persistence rather than a hosted account backend.

These controls reduce risk but do not make arbitrary career pages trustworthy. Job Ranger intentionally retrieves content from third-party sites, and scraper/browser paths should be treated as an untrusted-data boundary.

## Data Handling

Job Ranger stores application state locally. Network access is used to retrieve job-source content and, where applicable, load career pages through Electron's browser facilities.

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
- update/install behavior;
- credential or inference-provider handling;
- new remote services or telemetry.

Fail closed where a malformed or deceptive source could cause unsafe navigation or execution.

## Dependency Security

Dependabot is enabled and pull-request CI runs `npm ci` plus `npm run repo:health`. Major dependency upgrades are reviewed as coordinated migrations rather than merged solely because a bot opened a green pull request.

The active Electron/Node/Vite modernization is tracked in issue #38.
