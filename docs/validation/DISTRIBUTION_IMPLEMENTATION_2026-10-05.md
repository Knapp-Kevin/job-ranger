# Distribution Architecture Implementation Validation (2026-10-05)

**Scope:** implementation of the accepted distribution architecture ([`../design/DISTRIBUTION_ARCHITECTURE.md`](../design/DISTRIBUTION_ARCHITECTURE.md)): shared runtime-neutral core, local-first web/PWA runtime (#130), Microsoft Store AppX packaging (#125), portable `.jobranger` archives, and provenance.
**Change:** [Knapp-Kevin/job-ranger#142](https://github.com/Knapp-Kevin/job-ranger/pull/142), branch `claude/friendly-bell-62jsj4`, evidence head `86d4c05217a2a98afc5622cec48ee6151f0290d5` (the pre-merge review fixes below landed after it and were re-validated locally and by CI on the PR's final head), base `main` at `242b8761b2045b27de4936a261e663b3790c4afc`.
**Proves:** implemented behavior. **Does not prove:** shipped behavior. No release tag, Store listing, or production web origin exists.

## Hosted CI on the evidence head

| Workflow / job | Run | Result |
| --- | --- | --- |
| CI (`repository-health`: typecheck, Electron + PWA builds, `npm test`) | [37352799309](https://github.com/Knapp-Kevin/job-ranger/actions/runs/37352799309) | success |
| Electron E2E (`electron-e2e`) | [37352798746](https://github.com/Knapp-Kevin/job-ranger/actions/runs/37352798746) | success, 31/31 |
| Web/PWA runtime (`pwa`) | [37352798892](https://github.com/Knapp-Kevin/job-ranger/actions/runs/37352798892) | success: build, parser benchmark 9/9, browser suite 11/11 (Chromium) |
| Windows Store package (`store-package`) | [37352798825](https://github.com/Knapp-Kevin/job-ranger/actions/runs/37352798825) | success |
| Socket Security (dependency review) | — | success; two Low "obfuscated code" notes on the minified `pdf-lib` and `pdfjs-dist` bundles, answered on the PR (pinned, web-only, eval disabled, strict CSP + Trusted Types) |

## Local checks (Linux, Node 22)

- `npm run typecheck`, `npm test`: pass. Includes the portable archive smoke, the Store packaging config test, the runtime-adapter contract, PWA adapter tests, and **18 shared-core suites re-run on the SQLite WASM engine** (`tests/run-wasm-engine-parity.mjs`).
- `npm run test:pwa:e2e`: 11/11 (Chromium).
- `npm run test:pwa:parser-benchmark`: 9/9 on the shared Anydoc benchmark corpus.
- Electron E2E: 31/31.

## Windows Store package evidence (run 37352798825)

Environment: GitHub-hosted `windows-latest`, Windows `10.0.26100`. Package built with the **validation identity** (no Partner Center variables configured).

- Manifest verified against the real `.appx`: identity and version, capabilities exactly `runFullTrust` + `internetClient`, no extensions, canonical tile hashes, `app.asar` and bundled `sqlite3.exe` present.
- Installed a copy signed with an ephemeral self-signed certificate (removed afterwards; the submission artifact stays unsigned) and launched through `Invoke-CommandInDesktopPackage`. Package family name `JobRanger.PackageValidation_g7r71j59jvbwp`.
- In-package smoke, run by the real Electron main process:
  - `process.windowsStore: true`, channel `microsoft-store`;
  - SQLite resolved from `C:\Program Files\WindowsApps\…\app\resources\sqlite3.exe`;
  - healthcare-operations Career Ops scenario (non-software): profile, Target Track, authored and imported evidence, company and filter, preserved job snapshot, requirement coverage, application, JSON Resume, backup;
  - native DOCX resume import through Anydoc produced 4 evidence proposals;
  - Chromium PDF rendering passed the Truth Gate and the Anydoc Parseability Gate;
  - `.jobranger` archive created and restored into a second data root;
  - external-navigation validation;
  - historical NSIS install detected and importable.
- Isolation and coexistence:
  - Store data present only in `%LOCALAPPDATA%\Packages\<PFN>\LocalCache\Roaming\Job Ranger Store`; nothing leaked into the real `%APPDATA%`;
  - the historical NSIS database SHA-256 was unchanged;
  - uninstalling the package removed package data, and the historical NSIS data survived.

Evidence files (`windows-store-package.json`, `windows-store-package-smoke.json`, `windows-store-install.json`) are uploaded as workflow artifacts and printed in the job log.

## Pre-merge review

An adversarial review of the full diff (security invariants, data integrity, workflow security) found one blocking defect, fixed before merge with a reproduced failure:

- **Service worker on pretty-URL hosts.** The shell was precached from `/index.html`, which Cloudflare Pages redirects to `/`. A cached redirected response is refused for navigations, so every visit after the first would have failed. Fix: fetch the shell at its directory URL and re-wrap any redirected response. The browser-suite server now redirects `/index.html` like the production host; without the fix 3 tests fail, with it 11/11 pass.

Non-blocking hardening applied in the same change:

- `.jobranger` entry names that a file system could alias (case-only differences, trailing dot/space, `:` streams, reserved device names, control characters) are rejected on write and read.
- Restores interrupted after the data was copied into place (the web runtime moves directories by copy-then-delete) now complete from the verified live data instead of failing at every startup. A tampered stage is still refused. Covered by `tests/backup-restore-smoke-test.cjs`.
- The web SQLite engine no longer hands out a connection that is being reloaded after a failed save, so a concurrent write cannot report success and then vanish.
- The historical NSIS database is opened with `sqlite3 -readonly` during the Store import.
- A backup name without the `.jobranger` extension no longer silently overwrites an existing `<name>.jobranger` that the save dialog never confirmed.
- Workflow inputs (`inputs.tag`, `inputs.ref`) reach shell steps through `env:` instead of direct interpolation.

Observations kept as-is: interrupted web restores can leave a `.job-ranger-restore-rollback-*` copy of the previous data, which is kept rather than deleted automatically; validating a backup in the web runtime holds that backup's database image in memory until reload.

## Not performed (blockers and limitations)

- **Microsoft Store:** no Partner Center reservation, identity variables, submission, or certification. No Store-delivered install, Store upgrade, or clean Windows 11 Store install. #125 stays open.
- **Web/PWA:** no production deployment (`deploy-pwa.yml` needs a header-capable HTTPS host and the `production-web` environment). Firefox, Safari, mobile browsers, and real-device install not validated. #130 stays open.
- Live job-board CORS behavior in real browsers, and live acquisition inside the Store package, were not exercised. All CI smokes are network-free.
- The web PDF writer supported Latin-script (Windows-1252) text only at this evidence head. Later work adds embedded fonts for further scripts; see `docs/design/PWA_RUNTIME.md`.
- Pre-existing, unchanged by this work: job notifications are not wired to scrape completion in any build.
- v1.2.0 and its artifacts were not modified.
