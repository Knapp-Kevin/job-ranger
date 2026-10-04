# Security Policy

## Supported scope

Job Ranger is a local-first personal desktop application.

The latest published release and the current development/release-candidate branches are both considered for security maintenance, but they are not the same product state. The latest published installers remain **v1.1.2** while the v1.2.0 candidate contains substantially newer persistence, Career Evidence, resume, lifecycle, discovery, portability, and hardening code.

Job Ranger should not be represented as a hardened enterprise endpoint, centrally managed security product, or sandbox for arbitrary web content.

## Security model

The v1.2.0 candidate uses the following desktop boundaries:

- Electron renderer `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- primary renderer sandboxing;
- typed preload/IPC rather than direct Node access from React;
- renderer Content Security Policy;
- validated external navigation before `shell.openExternal`;
- constrained hidden browser surfaces for recognized browser-required acquisition;
- isolated Chromium resume rendering;
- local persistence rather than a hosted account backend.

These controls reduce risk but do not make third-party content trustworthy. Career pages, resumes, and imported documents remain untrusted input.

## Data handling

The current product stores structured state locally behind the Electron/SQLite boundary, including:

- companies and job sources;
- jobs and scrape history;
- filters and settings;
- Career Profile;
- Target Tracks;
- Applications;
- Career Evidence and provenance;
- job requirements and mappings;
- resume projections/artifacts;
- lifecycle contacts/events/offers;
- Career Stories;
- application materials and related local state.

Managed source/resume artifacts live under Job Ranger's local data/artifact directory.

Backup/restore is local and versioned. Cloud sync is not part of the current product.

Do not add telemetry, hosted account sync, external inference transmission, or other remote personal-data flows without explicit product governance, user disclosure, and security/privacy review.

## Imported career documents

Resume/document import treats files as untrusted input.

Current controls include:

- format/content validation where applicable;
- size/resource limits;
- source preservation before interpretation;
- SHA-256 hashing;
- parser/version extraction snapshots;
- explicit encrypted/malformed/unsupported/parser-failure states;
- explicit OCR-required state for image-only/scanned documents.

Job Ranger does not silently upload resumes to hosted OCR or inference services.

## Acquisition network policy

Automated acquisition has more authority than a normal user click and therefore uses a stricter network boundary.

Current controls reject automated fetch/browser requests targeting unsafe destinations such as:

- localhost/loopback;
- private-network IP literals;
- link-local addresses;
- hostnames that resolve to unsafe private/local addresses during policy validation;
- redirects into unsafe destinations detected by the policy.

The direct acquisition path validates redirect targets before following them. Recognized browser-backed sources apply the same public-network preflight to HTTP/HTTPS requests before Chromium is allowed to continue.

### DNS-rebinding residual risk

The current policy validates hostname resolution before a request is allowed, but the underlying Node or Chromium transport can perform its own DNS resolution when establishing the actual connection. The approved address is therefore **not connection-pinned**. A hostile hostname capable of changing DNS answers between policy validation and connection establishment creates a time-of-check/time-of-use risk tracked in issue #123.

The v1.2.0 release candidate reduces that exposure by disabling automated acquisition for arbitrary generic career-site hostnames. Unknown/generic career pages remain manual-review sources. Automated source classification is limited to recognized provider/vendor domains and known browser portals until connection-level anti-rebinding protection is implemented and validated.

This mitigation narrows the practical attack surface; it does not make the transport rebinding-proof and must not be documented as such.

Do not replace the acquisition boundary with a simple `http/https` URL check, and do not re-enable arbitrary-host automated acquisition without resolving or explicitly governing the connection-pinning requirement.

## External navigation

User-directed external links are validated separately from automated acquisition.

The fact that a URL is acceptable for `shell.openExternal` does not imply that Job Ranger should be allowed to retrieve it automatically from the privileged process.

## Resume rendering security

The resume renderer uses a dedicated hidden Chromium surface with:

- sandbox enabled;
- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- JavaScript disabled;
- navigation blocked;
- window opening denied;
- a document CSP denying remote resources;
- HTML-escaped user content.

Resume rendering must not become a general browser or remote-content surface.

## Backup and restore safety

Backup/restore is a destructive-data boundary and must fail closed.

Current design requirements include:

- SQLite snapshot rather than a casual copy of a live database;
- manifest/version validation;
- artifact/hash integrity validation;
- staged restore;
- path rebasing before activation when restoring to a different data root;
- preservation of the old live data as a rollback candidate until restored state is validated.

A restore feature that deletes the only known-good copy before proving the replacement works is considered a security/reliability defect.

## Reporting a vulnerability

Do **not** publish exploit details in a public issue.

If GitHub presents a private **Report a vulnerability** option for this repository, use that channel.

If no private reporting channel is available, open a public issue containing only a request for a private security contact and omit vulnerability details.

A useful private report includes:

- affected release/commit;
- reproduction steps;
- expected and actual behavior;
- realistic impact;
- whether user interaction is required;
- relevant logs/screenshots without unrelated personal data;
- suggested mitigation, if known.

## Security-relevant contribution rules

Changes touching any of the following require explicit review and risk-appropriate validation:

- Electron `webPreferences`;
- renderer sandboxing;
- preload/IPC exposure;
- external URL handling;
- acquisition-network policy;
- browser-backed extraction;
- local filesystem paths;
- backup/restore;
- SQLite access/migrations;
- Career Evidence authority;
- application lifecycle persistence;
- resume rendering/import;
- updater/install behavior;
- credentials/provider secrets;
- remote inference;
- telemetry or cloud services;
- browser autofill/form interaction.

Fail closed where malformed or deceptive content could cause unsafe navigation, execution, filesystem access, network access, or factual-authority escalation.

## Dependency security

Dependency state must be established from the current lockfile and current audit evidence, not from historical claims that an older release had zero known vulnerabilities.

`scripts/audit-dependencies.mjs` blocks high/critical findings except for one narrowly bounded upstream-blocked **dev-tool-only** advisory path:

- advisory: `GHSA-ch52-4w7c-c8xp`;
- exception is allowed only when the affected nodes are proven development-only and connected to that exact advisory;
- runtime dependencies, unrelated advisories, or disconnected high/critical findings still fail closed.

The exception exists because the supported upstream build-tool chain did not yet provide a patched version when reviewed. It is not a general audit waiver and should be removed once the supported dependency path is fixed.

Major dependency upgrades are reviewed as coordinated runtime/module/packaging/security migrations rather than merged solely because an automated bot produced a green diff.

Do not use `npm audit fix --force` as a substitute for dependency review.

## Validation policy

The repository intentionally preserves GitHub Actions budget.

Security-relevant validation may run through hosted workflows when needed, but documentation/remediation and some release-preparation checks may be executed manually by the maintainer in an isolated environment.

Manual validation evidence must state:

- environment;
- exact commands/checks;
- results;
- anything that could not be exercised.

A lack of hosted Actions run is not itself a security defect. A lack of validation evidence is.

## Release security

Before publication, the candidate must satisfy [`docs/RELEASE_READINESS.md`](./docs/RELEASE_READINESS.md), including:

- current dependency review;
- explicit disposition of material residual security risks, including #123;
- migration/upgrade validation;
- backup/restore proof;
- Windows bundled-SQLite validation;
- macOS package/notarization evidence where credentials permit;
- product-smoke validation;
- documentation truthfulness.

Published artifacts, not build configuration, define the supported release surface.
