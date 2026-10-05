# Web / PWA Runtime

**Status:** implemented (merged to `main` via #142; post-v1.2.0, not released). **Not deployed.** No production origin exists yet, so the web app is not shipped and not a published supported channel.
**Tracks:** #130
**Architecture:** [`DISTRIBUTION_ARCHITECTURE.md`](./DISTRIBUTION_ARCHITECTURE.md)

## Summary

The web/PWA runtime is a first-class Job Ranger runtime. It runs the **same shared application core** as the Electron runtime: repositories, SQL migrations, domain services, the IPC channel table, and boundary validators. It also renders the **same React application**. Only runtime infrastructure differs, and it is supplied by explicit adapters.

```text
               React app (src/)  ──  shared preload bridge (electron/src/preload.cts)
                      │                               │
          ┌───────────┴────────────┐      ┌───────────┴────────────┐
          │ Electron renderer      │      │ Web page (src/pwa)     │
          │ ipcRenderer → main     │      │ postMessage → worker   │
          └───────────┬────────────┘      └───────────┬────────────┘
                      ▼                               ▼
   Electron main process                    Runtime worker (src/pwa/runtime/worker-main.ts)
   └─ shared core: core-ipc, resume-ipc, backup-ipc, evidence/lifecycle/stories/…,
      repositories, migrations, Truth Gate, Parseability Gate, archive, validators
      ├─ Electron adapters: sqlite3 CLI, node:fs, Anydoc, Chromium printToPDF, DNS-pinned fetch
      └─ Web adapters:      SQLite WASM + OPFS, OPFS fs, pdf.js/DOCX, pdf-lib, browser fetch policy
```

No runtime is a second source of product truth. If a domain rule changes in the shared core, it changes in both runtimes.

## Adapter map

The authoritative list is `src/pwa/adapter-map.ts`. It is applied at build time by `vite.pwa.config.ts` and checked by `tests/runtime-adapter-contract.test.mjs`, which requires every adapter to export the full contract of the module it replaces.

| Shared-core dependency | Electron implementation | Web implementation |
| --- | --- | --- |
| `sqlite.cts` (`SqliteClient`) | bundled `sqlite3` CLI | `WasmSqliteEngine`: `@sqlite.org/sqlite-wasm` 3.53.4, persisted to OPFS |
| `node:fs` | Node fs | OPFS adapter (`createWritable`, atomic commit on close) |
| `node:path` | Node path | POSIX path (`/job-ranger/...` virtual namespace) |
| `node:crypto` | Node crypto | Synchronous FIPS 180-4 SHA-256 plus `crypto.randomUUID` |
| `resume-parser.cts` | Anydoc 0.2.4 (native) | Bounded DOCX unzip (fflate) + WordprocessingML; pdf.js text layer |
| `resume-renderer.cts` | Hidden, JavaScript-disabled Chromium `printToPDF` | Deterministic pdf-lib ATS writer |
| `pinned-fetch.cts` | DNS-pinned sockets | Browser fetch: allowlisted origins, credential-less CORS |
| `electron` | Electron | Worker: IPC registry + user-gesture dialogs. Page: `contextBridge`/`ipcRenderer` shim |

The build fails on any unadapted `node:*` import. Electron imports are confined to IPC and infrastructure modules, and the contract test enforces this.

## Persistence

**Engine.** SQLite WASM runs the *same* migrations and repository SQL as Electron. To show this is semantically equivalent, `tests/run-wasm-engine-parity.mjs` re-runs the 18 shared-core domain smoke suites on the WASM engine. The suites cover persistence, Target Tracks, evidence authoring, lineage and supersession, lifecycle, insights, stories, materials, interview prep, requirement coverage, JSON Resume, backup/restore, portable archives, resume lifecycle and tailoring, resume import, and the v1.1.2→v1.2 upgrade.

**Durability model.**
- Each database path is one in-memory connection, shared by every client constructed for that path.
- After each write, the full database image is serialized and written to OPFS through `createWritable()`. The spec commits these writes atomically when the stream closes.
- The caller's promise resolves only after the write is durable, matching the CLI adapter, where a statement is durable once `sqlite3` exits.
- If persisting fails (quota exhausted, storage locked or evicted), the connection is reloaded from the last durable image and the caller receives the error. Memory never claims state that is not on disk. The UI shows a storage-failure banner.
- `VACUUM INTO` (backups) writes a serialized snapshot to the requested path.

**Single writer.** The runtime worker holds an exclusive Web Lock (`job-ranger-web-runtime-v1`) for its lifetime. A second tab shows "Job Ranger is open in another tab or window" and continues automatically once the first tab closes.

**Managed artifacts.** Source documents, resume PDFs, and backups live in OPFS under `/job-ranger/data/artifacts/…`. Paths are relative to the data root, and backups/archives rebase them on restore.

**Migrations and downgrade safety.** New migrations apply on startup exactly as in Electron. Data last opened by a *newer* schema is refused with an explanation rather than opened by older code. The guard is shared (`backend.cts`, plus the feature-migration registry `feature-migrations.cts`), so it protects both runtimes and also covers service-worker rollbacks.

**Storage durability and eviction.**
- At startup the runtime verifies OPFS round-trip writes.
- If OPFS, `createWritable`, or Web Locks are missing (for example in some private-browsing modes), the app refuses to start and explains why. It never silently falls back to temporary storage.
- Settings → *This installation* shows persistent-storage status, usage, and quota. The user can request persistent storage there. Warnings appear when persistence is not granted or usage passes 80% of quota.
- Guidance: install the app (installed PWAs are more likely to be granted persistence) and export `.jobranger` backups regularly.

## Portable data (`.jobranger`)

The portable archive (`electron/src/portable-archive.cts`) is a single-file container wrapping the existing versioned backup bundle:

- The container is ZIP with STORE entries only: no compression, encryption, ZIP64, or symlinks. Every path must be a safe relative path, and every entry is CRC-32 verified.
- `job-ranger-archive.json` records the archive format version, the producing runtime/channel/version/build, the content format/version, and the SHA-256 of the inner backup manifest.
- The inner `manifest.json` (backup format v1) pins the SHA-256 of the SQLite snapshot and every managed artifact. It also lists migrations and managed-path records.
- On restore, the shared `BackupService` re-verifies everything, checks every migration against the migrations *this build knows*, runs `PRAGMA integrity_check`, rebases managed paths, and stages the restore. The previous data is kept as the rollback candidate until the swap completes.
- A newer archive format, a newer backup format, or unknown migrations are rejected with an explicit message.

Supported directions, each tested end to end:

| From | To | Evidence |
| --- | --- | --- |
| Electron | PWA | `tests/pwa/portability.spec.ts`: restores a desktop archive in the browser and checks provenance and lineage |
| PWA | Electron | `tests/pwa/portability.spec.ts`: downloads the browser archive and restores it with the Electron engine |
| PWA | PWA | Same contract; covered by the archive and restore smoke on both engines |
| Electron (≤ v1.2.0 directory backup) | Electron | Select `manifest.json` inside the old backup folder |

The PWA never reads the Electron SQLite database directly. It only accepts validated archives.

## Security model

- **HTTPS only.** Production headers include HSTS and `upgrade-insecure-requests`.
- **CSP** (`src/pwa/security/policy.ts`): `default-src 'none'`; scripts from `'self'` plus `'wasm-unsafe-eval'` (WebAssembly compile only, JavaScript eval stays forbidden); `connect-src` limited to `'self'` and an explicit list of public job-feed APIs; `frame-ancestors 'none'`; `form-action 'none'`; `base-uri 'none'`.
- **Trusted Types.** `require-trusted-types-for 'script'` with a single named policy that mints script URLs only for same-origin `.js` files: the runtime worker and the service worker. All HTML sinks are blocked, which the browser test suite verifies.
- **No remote code.** No CDNs, remote fonts, or analytics. The previous Google Fonts `@import` was removed; the Electron CSP already blocked it.
- **No silent transmission of personal data.**
  - The only external requests are user-initiated GETs for public job postings, to allowlisted origins, without credentials or referrer.
  - The browser test suite records every outbound request during a full Career Ops workflow and asserts nothing else left the browser.
  - Resumes, Career Evidence, and applications never leave the device unless the user downloads a file.
- **Acquisition boundary.** Browsers expose no DNS or socket API, so Electron's connection-level DNS pinning cannot exist here. The browser boundary is strictly narrower:
  - the shared URL policy;
  - a host allowlist enforced in code and by CSP (CSP also covers redirect hops);
  - credential-less CORS;
  - mixed-content blocking;
  - Private Network Access.

  Sites that do not allow cross-origin reads are reported as "browser-unavailable" with an explanation.
- **File handling.** Pickers open only inside a user gesture. Size limits are enforced before reading: 50 MB for documents, 10 MB for JSON Resume, 1 GB for archives. Selected files are staged in OPFS, processed by the same validators and parsers, and deleted afterwards.
- **External navigation.** URLs are validated twice, in the worker and again on the page (`http`/`https` only), and opened with `noopener,noreferrer`.
- **Production headers.** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, COOP, CORP, and a restrictive `Permissions-Policy`.

## Service worker and updates

- The service worker caches **only the versioned application shell**. It never stores, reads, or proxies career data and never intercepts cross-origin requests.
- **Integrity.** Every shell asset is checked against the build's SHA-256 manifest during install. A partial or tampered deployment fails to install, and the running version keeps working; the failure is reported in the UI.
- **Version pinning.** The page, runtime worker, and WASM are served from the same versioned cache, so a page never talks to a runtime from another build.
- **User-confirmed activation.** A new version installs in the background, then waits until the user chooses "Reload to update". The first install activates immediately.
- **Recovery.** Settings → *Repair app shell*, also shown on the startup-failure screen, unregisters the service worker and deletes only `job-ranger-shell-*` caches. Career data is untouched.
- **Offline.** After the first visit, the full app (including SQLite WASM, the parser, and the PDF writer) works offline. Only job-source refreshes need the network.
- **Build identity.** Every build carries `version+commit` (`<meta name="job-ranger-build">`, `build-info.json`, Settings → This installation).

## Capability parity

| Capability | Web runtime | Notes |
| --- | --- | --- |
| Onboarding, Career Profile, Target Tracks | ✅ Full | Shared UI and core |
| Career Evidence authoring, review, merge, supersede, references, lineage | ✅ Full | Shared core |
| Resume import: DOCX, text PDF, TXT, paste | ✅ Full | Web parser: 9/9 on the shared benchmark corpus. Image-only PDFs report `ocr-required` (no hosted OCR), same as Electron |
| JSON Resume import/export | ✅ Full | File picker / download |
| Source discovery (public feeds) | ✅ When the feed allows CORS | RemoteOK and Arbeitnow allowlisted; CORS behavior still needs real-browser validation |
| Monitoring Greenhouse, Lever, Ashby, SmartRecruiters | ✅ When the API allows CORS | Fixture-validated in CI; live CORS behavior still needs real-browser validation |
| Monitoring Workday, iCIMS, Taleo, Oracle, BambooHR, Microsoft, generic HTML | ⛔ Windows app only | **Platform limitation:** cross-origin HTML cannot be read by a web page, and these sites need a full hidden browser window (Electron `BrowserWindow`). Shown in the UI as "Needs the Windows app" |
| Scheduled checks while the app is closed | ⛔ Windows app only | **Platform limitation:** no reliable background execution for web apps. Checks run while the tab is open |
| System tray and desktop notifications | ⛔ Windows app only | Settings say so. (Job-notification delivery is not wired to scrape completion in Electron either; this is pre-existing) |
| Opportunity assessment, requirement ↔ evidence mapping | ✅ Full | Shared core |
| Applications, lifecycle, contacts, reminders, offers | ✅ Full | Reminders are shown in-app, as in Electron |
| Career Stories, interview prep, application materials, Search Insights | ✅ Full | Shared core |
| Resume generation, Truth Gate, PDF export, Parseability Gate | ✅ Full, with a bounded difference | See "Resume / PDF path" below |
| Reveal file in folder | ↔ Download instead | Labelled "Download file" in the web app |
| Backup/restore | ✅ Full | `.jobranger` archives in both directions |

### Resume / PDF path

- **Truth Gate and evidence links.** Identical; the code is shared.
- **Deterministic evidence selection and projection.** Identical; the code is shared.
- **Rendering.** Electron prints the template HTML with sandboxed Chromium. The web runtime writes the same projection (contact snapshot, section order, statement order, statement text) with pdf-lib in standard Helvetica. The output is deterministic: identical inputs produce identical bytes, and metadata dates are fixed to the projection.
- **Parseability Gate.** The shared gate re-parses the exact produced bytes and enforces the same contact, statement-coverage, reading-order, and page-count rules. The parser differs: Electron uses Anydoc, the web runtime uses pdf.js. The gate records the parser ID and version in every artifact.
- **Bounded limitation.** The web PDF writer encodes Windows-1252 (Latin-script) text. A statement containing characters it cannot encode fails export with an explicit message naming the characters, instead of silently dropping them. Use the Windows app for such resumes until a Unicode font is embedded.

## Browser support

| Environment | Status |
| --- | --- |
| Chromium (Chrome/Edge engine), desktop | **Validated in CI.** Playwright suite against the production build with production headers |
| Firefox (≥ 111), desktop | Expected supported (OPFS, `createWritable`, Web Locks); **not yet validated on real devices** |
| Safari (≥ 26), macOS | Expected supported (`createWritable` arrived in Safari 26); **not yet validated on real devices** |
| Private browsing without OPFS | Refuses to start, with an explanation |

Installability (standalone PWA) on Windows, macOS, and Linux browsers still needs real-device validation before the web app is promoted as mainstream (#130).

## Deployment (not yet performed)

`.github/workflows/pwa.yml` builds and tests the web app on every pull request. Each release produces `job-ranger-web-v<version>.zip` with:
- `web-build-info.json`: build identity, CSP, and per-asset SHA-256;
- the browser-suite report;
- checksums and a release manifest;
- a GitHub artifact attestation.

`.github/workflows/deploy-pwa.yml` publishes an **already released and attested** archive without rebuilding it. It runs behind the protected `production-web` environment, which is the deployment authority, and targets a host that honors the shipped `_headers` file (Cloudflare Pages). After deploying, it verifies that the live origin serves the expected build ID and security headers.

Required owner configuration:
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets;
- `JOB_RANGER_PWA_PAGES_PROJECT` and `JOB_RANGER_PWA_ORIGIN` variables;
- reviewers on the `production-web` environment.

GitHub Pages is not suitable because it cannot send the required security headers.

## Development

```bash
npm run dev:pwa         # Vite dev server (development CSP relaxed for HMR)
npm run build:pwa       # production build → dist-pwa/
npm run preview:pwa     # serve dist-pwa with production security headers
npm run test:pwa:e2e    # build + browser suite (Playwright, Chromium)
npm run test:pwa:engine # shared-core suites on the SQLite WASM engine
```
