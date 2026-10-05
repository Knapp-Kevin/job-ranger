<p align="center">
  <img src="docs/assets/branding/job-ranger-banner.png" alt="Job Ranger - Find Your Next Opportunity" width="100%" />
</p>

# Job Ranger

<p align="center">
  <strong>A local-first Career Ops companion for understanding where you want to go, finding the right paths to employment, preparing truthful materials, and managing a focused search without turning your career into somebody else's cloud product.</strong>
</p>

<p align="center">
  <a href="https://github.com/Knapp-Kevin/job-ranger/releases/tag/v1.1.2"><img src="https://img.shields.io/badge/stable%20release-v1.1.2-0f172a.svg" alt="Stable release v1.1.2" /></a>
  <a href="https://github.com/Knapp-Kevin/job-ranger/releases/tag/v1.2.0-rc.5"><img src="https://img.shields.io/badge/packaged%20candidate-v1.2.0--rc.5-2563eb.svg" alt="Packaged candidate v1.2.0-rc.5" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-2563eb.svg" alt="Windows and macOS" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-15803d.svg" alt="MIT License" /></a>
</p>

## Release status

**v1.1.2 remains the latest stable public release.** Its Windows and macOS installers were published on September 24, 2026.

**v1.2.0-rc.5 is the current validated packaged candidate.** It was built from immutable commit `71f9b790a1f456321aee2c783f39f4a6784b83a9`. Hosted Windows x64 and macOS x64/arm64 release jobs passed, including packaged healthcare-operations smoke, native platform trust-verifier execution, SHA-256 generation, schema-v2 release manifests, and release-asset upload.

rc.5 is still a **tester prerelease**, not the stable public release. Stable v1.2.0 is blocked on real Windows signing / macOS Developer ID + notarization credentials and clean-machine platform-trust validation, not on repository, package, or release-verifier functionality.

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

## Install the current stable release

Normal users do not need Git, Node.js, npm, SQLite, a terminal, or an AI account.

### Windows

**[Download Job Ranger v1.1.2 for Windows x64 (.exe)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.2/Job.Ranger-v1.1.2-windows-x64.exe)**

The Windows installer includes the SQLite runtime Job Ranger needs.

### macOS

- **[Apple Silicon / M-series Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.2/Job.Ranger-v1.1.2-macos-arm64.dmg)**
- **[Intel Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.2/Job.Ranger-v1.1.2-macos-x64.dmg)**

Linux does not currently have a supported packaged release.

### Testing v1.2.0-rc.5

The rc.5 artifacts are for informed testers. They may be unsigned/unnotarized and are not the normal public installation path.

Before upload, the Windows and macOS packaged runtimes each executed the release-blocking healthcare-operations package-smoke harness from their own packaged application. The refactored platform trust verifiers also ran successfully in their native hosted release environments. The resulting package-smoke reports, trust reports, checksums, and release manifests are published with the prerelease.

Verify the platform SHA-256 file and release manifest before using a prerelease artifact. See [`docs/TESTER_INSTALLATION.md`](./docs/TESTER_INSTALLATION.md), [`docs/DISTRIBUTION_TRUST.md`](./docs/DISTRIBUTION_TRUST.md), and [`docs/CLEAN_MACHINE_TRUST_VALIDATION.md`](./docs/CLEAN_MACHINE_TRUST_VALIDATION.md).

Job Ranger does not recommend disabling Smart App Control, SmartScreen, Defender, Gatekeeper, or other platform security globally merely to run a tester build.

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

| Capability | Stable v1.1.2 | v1.2.0 candidate |
| --- | --- | --- |
| Electron desktop app / local job-source state | **Shipped** | **Packaged candidate** |
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

The v1.2.0 candidate separates eligibility, evidence coverage, career-track alignment, preference alignment, blockers, and unknowns. Missing job data stays missing instead of becoming fake precision.

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

## Privacy and security posture

The v1.2.0 candidate keeps structured career/search state local and uses typed IPC boundaries rather than exposing Node.js directly to the renderer. Main/browser/render surfaces retain sandboxing and appropriate web-security controls. Automated acquisition uses a connection-pinned private-network boundary rather than preflight-only hostname checking.

Stable public distribution is fail-closed:

- Windows direct distribution requires configured Azure Artifact Signing and valid Authenticode evidence;
- macOS direct distribution requires Developer ID signing, notarization, stapling, and platform verification.

The repository plumbing, packaged-runtime validation, and clean-machine evidence tooling exist, but actual credential-backed clean-machine evidence is still pending under #125/#130.

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
- Microsoft Store AppX proof-of-concept after v1.2.0 if distribution demand justifies it.

Linux packaging has been evaluated and deferred until real demand. It is not a v1.2.0 blocker.

## Development

Normal users should use stable published installers. The following is for repository development.

### Prerequisites

- Node.js `>=22.12.0`
- npm
- `sqlite3` on `PATH`, or `SQLITE3_PATH` set explicitly

### Core commands

```bash
npm ci
npm run repo:health
npm run test:unit
npm run test:e2e
npm run electron:dev
npm run electron:build:win
npm run electron:build:mac
```

## Release engineering

Stable GitHub Releases are the authority for normal user-installable builds.

`v1.2.0-rc.5` proves immutable prerelease packaging for Windows x64 and macOS x64/arm64, including bundled SQLite verification on Windows, actual packaged-runtime smoke on both platforms, native execution of the refactored trust-verification scripts, platform trust-state evidence, SHA-256 files, and schema-v2 release manifests.

Before stable v1.2.0:

- configure and verify real Windows signing;
- configure and verify real macOS Developer ID signing/notarization/stapling;
- record clean-machine Windows/macOS platform-trust launch behavior;
- build the immutable stable tag;
- verify final stable package-smoke/trust/checksum/manifest evidence and downloads;
- only then switch README download links and shipped-status documentation from v1.1.2 to v1.2.0.

See [`docs/RELEASE_READINESS.md`](./docs/RELEASE_READINESS.md), [`docs/DISTRIBUTION_TRUST.md`](./docs/DISTRIBUTION_TRUST.md), [`docs/CLEAN_MACHINE_TRUST_VALIDATION.md`](./docs/CLEAN_MACHINE_TRUST_VALIDATION.md), and [`docs/validation/RELEASE_CANDIDATE_V1.2.0.md`](./docs/validation/RELEASE_CANDIDATE_V1.2.0.md).

## Documentation hierarchy

Start with [`docs/README.md`](./docs/README.md).

## Governance, security, and attribution

- [`GOVERNANCE.md`](./GOVERNANCE.md) — decision authority and truth/status language.
- [`SECURITY.md`](./SECURITY.md) — security posture and reporting guidance.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow.
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — community expectations.
- [`docs/BRANDING.md`](./docs/BRANDING.md) — canonical visual assets and usage.
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) — third-party attribution and provenance.

## License

Job Ranger is open source under the [MIT License](./LICENSE). Third-party dependencies and adapted components retain their own obligations as recorded in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
