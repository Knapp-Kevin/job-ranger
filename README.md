<p align="center">
  <img src="docs/assets/branding/job-ranger-banner.png" alt="Job Ranger - Find Your Next Opportunity" width="100%" />
</p>

# Job Ranger

<p align="center">
  <strong>A local-first Career Ops companion for understanding where you want to go, finding the right paths to employment, preparing truthful materials, and managing a focused search without turning your career into somebody else's cloud product.</strong>
</p>

<p align="center">
  <a href="https://github.com/Knapp-Kevin/job-ranger/releases/tag/v1.2.0"><img src="https://img.shields.io/badge/stable%20release-v1.2.0-0f172a.svg" alt="Stable release v1.2.0" /></a>
  <img src="https://img.shields.io/badge/stable%20platforms-Windows%20%7C%20macOS-2563eb.svg" alt="Stable release platforms: Windows and macOS" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--only-15803d.svg" alt="AGPL-3.0-only License" /></a>
</p>

## Release status

**v1.2.0 is the current stable public release.** It was published on October 5, 2026 from immutable commit `71f9b790a1f456321aee2c783f39f4a6784b83a9`, promoted byte-for-byte from the validated rc.5 artifacts. Windows x64 and macOS x64/arm64 packages, packaged healthcare-operations smoke reports, trust-state evidence, SHA-256 files, and schema-v2 release manifests are published with the release.

**Distribution trust limitation:** v1.2.0 is intentionally unsigned/unnotarized under an explicit owner-approved exception. Windows SmartScreen / Smart App Control or macOS Gatekeeper may warn or block execution depending on system policy. Do not disable platform security globally.

### Where Job Ranger distribution is going

| Channel | Status | Notes |
| --- | --- | --- |
| **Microsoft Store** (Windows native) | Implemented; package validated in CI; **certification pending** (#125) | Not yet listed in the Store |
| **Web app / PWA** (Windows, macOS, Linux browsers) | Implemented and tested; **not deployed** (#130) | Local-first: your data stays in your browser; nothing is uploaded |
| Direct-download installers | Advanced/test artifacts going forward | v1.2.0 below remains the current stable release |

Neither new channel is yet a supported **public** distribution channel. The PWA is available now for local dogfooding through the self-host path below; a public URL will be added only when a production web origin is intentionally promoted. Architecture: [`docs/design/DISTRIBUTION_ARCHITECTURE.md`](./docs/design/DISTRIBUTION_ARCHITECTURE.md).

Job Ranger uses these status terms deliberately:

| Status | Meaning |
| --- | --- |
| **Shipped / stable** | Present in a stable GitHub Release intended for normal users. |
| **Packaged candidate** | Built from an immutable prerelease tag and validated as release artifacts, but not promoted as stable. |
| **Implemented** | Present in repository/release lineage but not necessarily in the latest stable installer. |
| **Candidate / next** | Evidence-backed possible future work, not a commitment. |
| **Deferred** | Intentionally inactive. |
| **Historical** | Retained for provenance. |

For exact current state, see [`docs/SYSTEM_STATE.md`](./docs/SYSTEM_STATE.md) and [`docs/validation/RELEASE_CANDIDATE_V1.2.0.md`](./docs/validation/RELEASE_CANDIDATE_V1.2.0.md).

## Try the current PWA locally

The post-v1.2 development line is ready for persistent local dogfooding in a Chromium desktop browser. This does **not** require a public host, a Job Ranger account, or the unsigned desktop installer.

Prerequisites for the PWA path are Node.js `>=22.12.0` and npm.

```bash
git clone https://github.com/Knapp-Kevin/job-ranger.git
cd job-ranger
npm ci
npm run selfhost:pwa
```

Then open **http://localhost:4174** and install the PWA from Chrome or Edge if desired.

Important persistence rules:

- Keep using the exact `http://localhost:4174` origin. Job Ranger deliberately refuses silent port fallback because browser storage is origin-bound.
- Application updates replace the application shell, not your Career Ops data. The PWA stores its SQLite database and managed artifacts in browser-local OPFS.
- Before meaningful upgrades or experiments, export a `.jobranger` portable backup from Job Ranger. The archive is the supported recovery and later localhost → public-origin migration path.
- Do not clear this site's browser storage unless you intend to remove the local Job Ranger profile.
- Firefox/Safari and real-device installability are still validation work under #130; Chrome/Edge Chromium is the current evidence-backed dogfood path.

The implementation and persistence guarantees are documented in [`docs/design/PWA_RUNTIME.md`](./docs/design/PWA_RUNTIME.md).

## Install the current stable release

Normal users do not need Git, Node.js, npm, SQLite, a terminal, or an AI account.

### Windows

**[Download Job Ranger v1.2.0 for Windows x64 (.exe)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.2.0/Job.Ranger-v1.2.0-windows-x64.exe)**

The Windows installer includes the SQLite runtime Job Ranger needs.

### macOS

- **[Apple Silicon / M-series Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.2.0/Job.Ranger-v1.2.0-macos-arm64.dmg)**
- **[Intel Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.2.0/Job.Ranger-v1.2.0-macos-x64.dmg)**

Linux does not currently have a supported packaged release.

### v1.2.0 distribution trust note

v1.2.0 uses the exact rc.5 binaries that passed packaged-runtime smoke and native trust-verifier execution. The release remains unsigned/unnotarized. Verify the platform SHA-256 file and release manifest before use. See [`docs/TESTER_INSTALLATION.md`](./docs/TESTER_INSTALLATION.md), [`docs/DISTRIBUTION_TRUST.md`](./docs/DISTRIBUTION_TRUST.md), and [`docs/CLEAN_MACHINE_TRUST_VALIDATION.md`](./docs/CLEAN_MACHINE_TRUST_VALIDATION.md).

Job Ranger does not recommend disabling Smart App Control, SmartScreen, Defender, Gatekeeper, or other platform security globally. Use only bounded OS-provided per-app/per-file exceptions when available.

## What Job Ranger is

Job searching contains an absurd amount of clerical work. People repeatedly check the same sources, lose track of opportunities, rewrite the same career facts, forget which resume they submitted, and maintain increasingly haunted collections of tabs, notes, spreadsheets, and half-finished documents.

Job Ranger is designed around **quality over quantity**: understanding the person behind the resume, identifying career directions worth pursuing, finding companies and opportunities that fit those directions, and helping the user choose a useful path to employment rather than maximizing application throughput.

The guiding progression is:

> **Person → Career Direction → Companies → People → Opportunities → Applications**

A user may enter anywhere in that chain. The resume is useful evidence about prior work, not a command to keep repeating it and not the sole definition of who the user is.

Job Ranger is designed to make the workflow coherent while preserving user authority:

1. describe what kind of work, environment, constraints, and direction you actually want;
2. build a factual Career Evidence record from a resume or direct entry;
3. discover and monitor employers, sources, and opportunities that fit those directions;
4. assess which opportunities deserve attention using explicit requirements, evidence, constraints, preferences, and unknowns;
5. prepare evidence-backed resumes and application materials for opportunities the user intentionally chooses to pursue;
6. track the exact materials, people, events, reminders, interviews, offers, and outcomes around each application;
7. learn from recurring gaps and observed results without pretending correlation is destiny or application count is progress;
8. keep the core workflow local and useful without an AI provider.

Broader Career Ops company-targeting and relationship-path behavior has a completed bounded design contract under #121, but it is **not claimed as implemented in v1.2.0**.

Job Ranger does **not** autonomously mass-apply, invent qualifications or relationships, silently transmit career data to an inference provider, optimize for raw application volume, or treat one opaque score as hiring truth.

## Capability map

| Capability | v1.1.2 | v1.2.0 stable |
| --- | --- | --- |
| Electron desktop app / local job-source state | **Shipped** | **Shipped** |
| Greenhouse, Lever, SmartRecruiters, Ashby adapters | **Shipped** | **Hardened** |
| Recognized dynamic/browser provider acquisition | Best effort | Governed connection-pinned transport |
| Arbitrary generic career-page automation | Best effort | Manual review / non-runnable |
| Canonical source snapshots + source diagnostics | Not shipped | **Implemented** |
| Career Profile | **Shipped** | Durable SQLite authority |
| Applications status/notes | **Shipped** | Durable lifecycle authority |
| Progressive onboarding | Not shipped | **Implemented** |
| Multiple Target Tracks | Not shipped | **Implemented** |
| Career Evidence / provenance / correction | Not shipped | **Implemented** |
| DOCX/text-PDF/plain/pasted resume import | Not shipped | **Implemented** |
| Structured credentials and schedule constraints | Not shipped | **Implemented** |
| Consumer source discovery + explicit approval | Not shipped | **Implemented, partial provider coverage** |
| Explainable opportunity assessment | Basic fit score | Eligibility/evidence/track/preferences/blockers/unknowns |
| Deterministic resume PDF + Truth/Parseability Gates | Not shipped | **Implemented** |
| Target-specific deterministic tailoring | Not shipped | **Implemented** |
| Exact submitted resume history | Not shipped | **Implemented** |
| Contacts, milestones, reminders, follow-ups | Not shipped | **Implemented** |
| Career Stories | Not shipped | **Implemented** |
| Evidence-grounded interview preparation | Not shipped | **Implemented** |
| Evidence-grounded application materials | Not shipped | **Implemented** |
| Offer / negotiation state | Not shipped | **Implemented** |
| Search Insights / recurring-gap analysis | Not shipped | **Implemented** |
| Verified backup / staged restore | Not shipped | **Implemented** |
| JSON Resume interoperability | Not shipped | **Implemented** |
| Connection-level DNS-rebinding protection | Not shipped | **Implemented** |
| Packaged-binary release smoke | Not shipped | **Implemented and passed on rc.5** |
| Stable Windows/macOS trust fail-closed pipeline | Not shipped | **Implemented; real credentials/evidence pending** |
| Clean-machine trust evidence tooling | Not shipped | **Implemented and native-runner compatible** |
| Remote inference provider | Not shipped | Deferred |
| OCR for scanned/image-only resumes | Not shipped | Deferred |
| DOCX resume export | Not shipped | Deferred |
| Career Ops relationship-path implementation | Not shipped | Future candidate; design complete |
| Autonomous mass auto-apply | Not shipped | Explicit non-goal |
| Linux installer | Not shipped | Deferred until demand |

## Core product principles

### Quality over quantity

The product should optimize for **qualified, intentional progress**, not applications sent. A smaller number of well-understood opportunities that fit the user's direction, evidence, constraints, and preferences is preferable to a large queue of weak matches.

Automation should reduce clerical burden and the cost of making good decisions. It should not remove the user's judgment from consequential external actions or convert employers and professional networks into targets for automated volume.

### Career Evidence is factual authority

Career Profile and Target Tracks describe intent. Career Evidence describes what is factually true about the user. Imported information begins as a proposal. Only user-confirmed or user-authored evidence can support factual application claims.

### Preferences are not constraints

Remote preference, compensation target, commute, schedule, employment arrangement, and similar choices retain explicit semantics. A preference does not silently become a blocker.

### Explain uncertainty instead of scoring around it

v1.2.0 separates eligibility, evidence coverage, career-track alignment, preference alignment, blockers, and unknowns. Missing job data stays missing instead of becoming fake precision.

### Local first, useful before AI

The core workflow works without an AI account or hosted Job Ranger account. Optional external capabilities must be narrow adapters with explicit disclosure and may not become authorities over career truth.

### User authority

Job Ranger can discover, organize, explain, prepare, remind, preserve, and analyze. Consequential external actions remain with the user.

## Source support and acquisition trust

Job Ranger does not pretend every careers site is equally automatable.

| Support level | Meaning |
| --- | --- |
| `supported` | A structured adapter exists and is the preferred path. |
| `detected` | Job Ranger recognizes a known provider/vendor portal and can attempt its governed extraction path. |
| `browser-required` | A recognized portal requires a constrained rendered-browser path. |
| `manual-review` | No reliable or sufficiently bounded automated path is claimed. |

Current structured adapters are Greenhouse, Lever, SmartRecruiters, and Ashby. Recognized Workday, iCIMS, BambooHR, Taleo, Oracle Careers, Microsoft Careers, and known browser portals use detected or browser-backed paths where applicable.

v1.2.0 keeps arbitrary generic career-site hostnames manual-review/non-runnable. Governed acquisition uses connection-level address pinning: policy resolves the approved public address set, direct sockets connect only to approved addresses while TLS continues to verify the original hostname, redirects are independently pinned, and isolated browser HTTP/HTTPS traffic is routed through the governed transport. See [`SECURITY.md`](./SECURITY.md).

Source discovery remains separate from source acquisition. A discovered opportunity or employer is not silently converted into a monitored trusted source; the user approves monitoring explicitly.

## Current architecture

```text
React renderer
  onboarding / jobs / applications / search insights
  Career Profile / Career Evidence / Career Stories
  Target Tracks / Resume
  Companies / Filters / Settings
          │
          ▼ typed preload / IPC
Electron main process
  acquisition + pinned network transport
  canonical job-source snapshots + diagnostics
  Career Profile / Career Evidence / provenance
  Target Tracks / requirements / assessment
  Resume projection + Truth/Parseability Gates
  application lifecycle / interview prep / materials
  Career Stories / Search Insights / offers
  backup + staged restore / JSON Resume adapter
          │
          ▼
        SQLite + managed local artifacts
```

`electron/src/**` is the only checked-in privileged implementation authority. `electron-runtime/**` is generated for development, tests, packaging, and execution.

On the post-v1.2.0 development line, the same shared core also runs in a **web/PWA runtime**: a browser runtime worker with SQLite WASM on the origin-private file system, browser document parsing, and deterministic PDF output, behind strict CSP and Trusted Types. Runtime-specific mechanics come from explicit adapters, so there is one product truth across runtimes. See [`docs/design/PWA_RUNTIME.md`](./docs/design/PWA_RUNTIME.md) and [`docs/ARCHITECTURE_PLAN.md`](./docs/ARCHITECTURE_PLAN.md).

## Privacy and security posture

v1.2.0 keeps structured career/search state local and uses typed IPC boundaries rather than exposing Node.js directly to the renderer. Main/browser/render surfaces retain sandboxing and appropriate web-security controls. Automated acquisition uses a connection-pinned private-network boundary rather than preflight-only hostname checking.

v1.2.0 is the documented owner-approved unsigned exception: its rc.5 binaries were immutable, byte-verified, package-smoke validated, and accompanied by trust/checksum manifests. Going forward, ordinary-user trust comes from Microsoft Store certification (Windows) and the HTTPS origin plus its security policy (web). Every released artifact also carries SHA-256 evidence, a release manifest, and a GitHub artifact attestation. Azure Artifact Signing is optional. See [`docs/DISTRIBUTION_TRUST.md`](./docs/DISTRIBUTION_TRUST.md).

Remote inference, telemetry, cloud account sync, or credential-bearing external services require explicit future governance and disclosure.

## Product gaps and evaluated candidates

Current dispositions live in [`docs/PRODUCT_GAP_REVIEW.md`](./docs/PRODUCT_GAP_REVIEW.md).

Examples still suitable for future evidence-backed consideration include:

- broader discovery providers, especially government/niche sources;
- easier capture of jobs encountered in a normal browser;
- reusable application-question answers and bounded user-controlled form assistance;
- implementation of the already-bounded Career Ops company/relationship-path design;
- mock-interview practice and feedback;
- calendar mirroring;
Native Linux and macOS packaging are not planned. Those platforms are served by the web app.

## Development

Normal users should use stable published installers. The following is for repository development.

### Prerequisites

- Node.js `>=22.12.0`
- npm
- `sqlite3` on `PATH`, or `SQLITE3_PATH` set explicitly

### Core commands

```bash
npm ci
npm run repo:health          # typecheck, desktop + web builds, full test suite
npm run test:unit
npm run test:e2e             # Electron Playwright
npm run electron:dev
npm run electron:build:win   # direct-download NSIS (advanced/test channel)
npm run electron:build:store # Microsoft Store AppX (Windows only)
```

### Web/PWA runtime

```bash
npm run dev:pwa              # development server
npm run build:pwa            # production build -> dist-pwa/
npm run preview:pwa          # serve an existing build at http://localhost:4174
npm run selfhost:pwa         # build + serve the persistent localhost dogfood runtime
npm run test:pwa:e2e         # browser suite (Playwright, Chromium)
npm run test:pwa:engine      # shared-core suites on the SQLite WASM engine
```

## Release engineering

Stable GitHub Releases are the authority for normal user-installable builds.

`v1.2.0` is the current stable release and is byte-identical to the validated rc.5 package artifacts at `71f9b790a1f456321aee2c783f39f4a6784b83a9`. The outstanding distribution work is external:
- Microsoft Store: Partner Center identity, submission, and certification;
- web app: a production HTTPS origin and real-browser validation.

No v1.2.0 artifact is ever mutated.

See [`docs/RELEASE_READINESS.md`](./docs/RELEASE_READINESS.md), [`docs/DISTRIBUTION_TRUST.md`](./docs/DISTRIBUTION_TRUST.md), [`docs/CLEAN_MACHINE_TRUST_VALIDATION.md`](./docs/CLEAN_MACHINE_TRUST_VALIDATION.md), and [`docs/validation/RELEASE_CANDIDATE_V1.2.0.md`](./docs/validation/RELEASE_CANDIDATE_V1.2.0.md).

## Documentation hierarchy

Start with [`docs/README.md`](./docs/README.md).

## Governance, security, and attribution

- [`GOVERNANCE.md`](./GOVERNANCE.md) — decision authority and truth/status language.
- [`SECURITY.md`](./SECURITY.md) — security posture and reporting guidance.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow.
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — community expectations.
- [`docs/BRANDING.md`](./docs/BRANDING.md) — canonical visual assets and usage.
- [`TRADEMARKS.md`](./TRADEMARKS.md) — Job Ranger name/mark usage and official-distribution identity.
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) — third-party attribution and provenance.

## License

Job Ranger's current development line is open source under the [GNU Affero General Public License v3.0 only (AGPL-3.0-only)](./LICENSE). Commercial use and paid distribution are permitted, while covered modified versions remain subject to AGPL source-sharing requirements. Historical versions already released under MIT, including v1.2.0, retain their prior MIT grants; see [`LICENSE_HISTORY.md`](./LICENSE_HISTORY.md). The Job Ranger name and official-distribution identity remain governed separately by [`TRADEMARKS.md`](./TRADEMARKS.md). Third-party dependencies and adapted components retain their own obligations as recorded in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
