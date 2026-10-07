# Plan: Phase 6 - Windows runtime fixes (PWA adapter resolution, upgrade-check CRLF)

**change_class**: hotfix

**doc_tier**: minimal

**iteration**: 2 (amended after VETO at META_LEDGER Entry #33)

Closes BACKLOG D1 and D2. Both defects reproduce only on Windows hosts; CI runs Ubuntu, so this plan also adds Windows CI coverage for the two affected suites.

## Open Questions

None. Root causes were reproduced on a Windows 10 host on 2026-10-06:

- D1: `npm run build:pwa` then a browser call `window.electronAPI.system.getStatus()` rejects with `No handler registered for 'system:get-status'`; `dist-pwa/assets/worker-main-*.js` contains the `src/pwa/adapters/electron-worker.ts` registry twice (the literal `Attempted to register a second handler` occurs 2 times).
- D2: `D:\...\sqlite3.exe :memory: "create table a(x); create table b(x); select name from sqlite_master;" | od -c` prints `a \r \n b \r \n`.
- The same 2026-10-06 Windows run of `npm run test:release-upgrade` generated baseline data from v1.2.0 successfully ("9 baseline data directories checked") and failed only in the current-build comparison step, so the baseline release's own smoke tests run on Windows.

## Locked Decisions

- LD1: The plugin must not invent module ids. It decides *which file* an import maps to, then asks Vite's resolver for that file's id with `this.resolve(targetPath, importer, { skipSelf: true })`, the same resolver that handles the relative import in `worker-main.ts`. Both imports of `electron-worker.ts` then get one id regardless of slash direction, drive-letter casing, or symlink/junction realpath. Evidence of the current divergence:
  - `git show HEAD:vite.pwa.config.ts | grep -nE 'return path\.join\(adapters|return candidate;'` -> `45: return path.join(adapters, target === "worker" ? "electron-worker.ts" : "electron-page.ts");`, `49: return path.join(adapters, NODE_BUILTIN_ADAPTERS[builtin]);`, `58: return path.join(adapters, SHARED_CORE_ADAPTERS[path.basename(candidate)]);`, `61: return candidate;`
  - `git show HEAD:src/pwa/runtime/worker-main.ts | grep -nE 'adapters/electron-worker"'` -> `28: } from "../adapters/electron-worker";`
  - `skipSelf` is part of the installed bundler's plugin API (vite 8.3.2 on rolldown 1.2.12): `grep -n "skipSelf" node_modules/rolldown/dist/shared/define-config-kIZKjX8Q.d.mts` -> `2394: skipSelf?: boolean;` (doc comment: whether the calling plugin's resolveId is skipped; default true).
- LD2: The shared-core importer test at `vite.pwa.config.ts:48` compares Vite's forward-slash importer id against `\electron\src\` on Windows and never matches, so bare `fs`/`path` imports from `electron/src` skip their adapters there. The importer is slash-normalized before the `/electron/src/` test.
  - `git show HEAD:vite.pwa.config.ts | grep -nE 'importer\?\.includes'` -> `48: if (NODE_BUILTIN_ADAPTERS[builtin] && (source.startsWith("node:") || importer?.includes(\`${path.sep}electron${path.sep}src${path.sep}\`))) {`
- LD3: Target selection moves into a pure function that takes the path implementation and an `exists` predicate, so a unit test drives it with `path.win32` on any host. The Vite `Plugin` factory moves into the same module so its delegation to `this.resolve` is unit-testable with a fake plugin context; `vite.pwa.config.ts` only instantiates it.
- LD4: The invariant "one file, one module id" is verified on the real artifact: a test counts the adapter registry in the built worker bundle. This catches any remaining duplicate cause on whichever host builds it.
- LD5: sqlite CLI output is split with `/\r?\n/` through one helper used by both call sites in `scripts/upgrade-check/check-current-release.cjs` (`fingerprint` split at `:48`, `appliedVersions` split at `:110`). `electron/src/sqlite.cts:52` already uses `/\r?\n/` for `where.exe` output, the in-repo precedent.
  - `git show HEAD:scripts/upgrade-check/check-current-release.cjs | grep -nF '.split("\n")'` -> `48: .split("\n")`, `110: .split("\n")`
  - `git show HEAD:electron/src/sqlite.cts | grep -nF 'split(/\r?\n/)'` -> `52: .split(/\r?\n/)`
- LD6: Windows CI jobs that reach native sqlite reuse `.github/actions/provision-windows-sqlite` (pinned, SHA3-verified sqlite-tools; exports `SQLITE3_PATH`, honored first by `resolveSqliteBinary`). That covers both the release-upgrade job and the browser suite, whose `tests/pwa/portability.spec.ts` drives the compiled Electron core.
  - `grep -n "SQLITE3_PATH" .github/actions/provision-windows-sqlite/action.yml` -> `30: "SQLITE3_PATH=$sqlitePath" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append`
  - `git show HEAD:electron/src/sqlite.cts | grep -nE 'SQLITE3_PATH'` -> `32: if (process.env.SQLITE3_PATH) {`, `33: return process.env.SQLITE3_PATH;`

## Phase 1: PWA adapter resolution (D1)

### Unit Tests

- `tests/pwa-runtime-adapter-plugin.test.mjs` (new; run with `node --experimental-strip-types`). Uses the real `NODE_BUILTIN_ADAPTERS` and `SHARED_CORE_ADAPTERS` from `src/pwa/adapter-map.ts`.
  - `selectRuntimeAdapterTarget` with `path.win32`, root `C:\repo`:
    - `electron` (worker) returns `C:\repo\src\pwa\adapters\electron-worker.ts`; (page) returns `...\electron-page.ts`.
    - bare `fs` from importer `C:/repo/electron/src/backend.cts` (forward-slash, as Vite supplies it) returns `C:\repo\src\pwa\adapters\node-fs.ts`. Under the old `${path.sep}` check this case returns `null`, so the test fails on regression (LD2).
    - bare `fs` from `C:/repo/src/App.tsx` returns `null`.
    - `node:crypto` from any importer returns `...\node-crypto.ts`; `node:os` (not in the map) returns `{ error }` whose message names the importer.
    - `./sqlite.cjs` from `C:/repo/electron/src/backend.cts` with `exists` true returns `...\src\pwa\adapters\sqlite.ts`; unmapped `./backend-util.cjs` with `exists` true returns `C:\repo\electron\src\backend-util.cts`; `exists` false returns `null`.
    - The same cases with `path.posix` and root `/repo` return the posix equivalents.
  - `createRuntimeAdapterPlugin("worker", env).resolveId` called with a fake context whose `resolve` records its arguments and returns `{ id: "RESOLVED" }`:
    - for `electron`, calls `resolve` once with the `electron-worker.ts` target, the original importer, and `{ skipSelf: true }`, and returns `{ id: "RESOLVED" }`. If the plugin returned its own path instead of delegating, this fails.
    - for an unmapped `node:os`, calls the context's `error` with the importer-naming message.
    - for `react` (no adapter), returns `null` without calling `resolve`.
- `tests/pwa-worker-bundle.test.mjs` (new). Reads `dist-pwa/assets/`, asserts exactly one `worker-main-*.js` and exactly one occurrence of the `electron-worker.ts` registry literal `Attempted to register a second handler` in it. On the pre-fix Windows build the count is 2, so the test fails. Fails with a clear message when `dist-pwa` is absent.

### Affected Files

- `src/pwa/build/runtime-adapter-plugin.ts` (new) - exports `selectRuntimeAdapterTarget(source, importer, target, env)` returning `string | null | { error: string }`, where `env = { root, pathApi, exists, nodeBuiltinAdapters, sharedCoreAdapters }`; and `createRuntimeAdapterPlugin(target, env): Plugin` whose `resolveId` maps a string target through `this.resolve(targetPath, importer, { skipSelf: true })`, an error through `this.error`, and `null` through unchanged.
- `vite.pwa.config.ts` - replaces the inline `runtimeAdapterPlugin` with `createRuntimeAdapterPlugin(target, { root, pathApi: path, exists: existsSync, nodeBuiltinAdapters: NODE_BUILTIN_ADAPTERS, sharedCoreAdapters: SHARED_CORE_ADAPTERS })`; removes the `electronSource` and `adapters` locals (used only by the old plugin; `tsconfig.json` sets `noUnusedLocals`).
- `package.json` - append `node --experimental-strip-types tests/pwa-runtime-adapter-plugin.test.mjs` to `test` and `test:unit`; `test:pwa:e2e` runs `node tests/pwa-worker-bundle.test.mjs` after `build:pwa`.

## Phase 2: Upgrade-check line splitting (D2)

### Unit Tests

- `tests/upgrade-check-sqlite-output.test.cjs` (new) - `outputLines("a\r\nb\r\n")` returns `["a", "b"]`; `outputLines("a\nb\n")` returns `["a", "b"]`; `outputLines("")` returns `[]`; `"1001\r\n1002\n"` mapped through `Number` returns `[1001, 1002]`. A regression to `split("\n")` fails the first case (`"a\r"`).

### Affected Files

- `scripts/upgrade-check/sqlite-output.cjs` (new) - exports `outputLines(text)`: `text.split(/\r?\n/).filter(Boolean)`.
- `scripts/upgrade-check/check-current-release.cjs` - `fingerprint` and `appliedVersions` use `outputLines`.
- `package.json` - append `node tests/upgrade-check-sqlite-output.test.cjs` to `test` and `test:unit`.

## Phase 3: Windows CI coverage

### Affected Files

- `.github/workflows/pwa.yml`:
  - existing `pwa` job: add a `node tests/pwa-worker-bundle.test.mjs` step after "Build production web runtime".
  - new job `pwa-windows` on `windows-latest` (timeout 30): checkout, setup-node 22.12.0 with npm cache, `npm ci`, `uses: ./.github/actions/provision-windows-sqlite`, `npm run desktop:compile`, `npm run build:pwa`, `node tests/pwa-worker-bundle.test.mjs`, `npx playwright install chromium`, `npx playwright test --config playwright.pwa.config.ts --reporter=list`. Independent of the `pwa` job's `workflow_call` outputs, which are unchanged; it also runs for `workflow_call` callers, adding Windows coverage to them.
- `.github/workflows/ci.yml` - new job `release-upgrade-windows` on `windows-latest` (timeout 20): checkout with `fetch-depth: 0`, setup-node 22.12.0 with npm cache, `npm ci`, `uses: ./.github/actions/provision-windows-sqlite`, `npm run test:release-upgrade`, upload `build/trust/release-upgrade-report.json` as `release-upgrade-report-windows`.

## Feature Inventory Touches

| entry_id | operation | test_path | test_descriptor |
| --- | --- | --- | --- |
| FX046 | n/a-justified | tests/pwa/runtime.spec.ts | Build-config fix only; the spec's existing assertions (runtime boots, `getRuntimeInfo` returns kind web) become runnable on Windows. Status stays `unverified` until the Windows CI job reports green. |
| FX047 | n/a-justified | tests/pwa/update-and-storage.spec.ts | Same as FX046. |
| FX048 | n/a-justified | tests/pwa/unicode-resume.spec.ts | Same as FX046. |

## Definition of Done

### Deliverable: PWA adapter resolution

- **D1**: On Windows, the web runtime registers every IPC handler in the same module the worker dispatches from; all `tests/pwa` specs can pass.
- **D2**: `src/pwa/build/runtime-adapter-plugin.ts` exports `selectRuntimeAdapterTarget` and `createRuntimeAdapterPlugin`; every adapter target reaches the bundler through `this.resolve(..., { skipSelf: true })`; `vite.pwa.config.ts` instantiates the plugin and no longer builds ids itself.
- **D3**: META_LEDGER audit/implement/seal entries for Phase 6; BACKLOG D1 checked off at seal.
- **D4**: `tests/pwa-runtime-adapter-plugin.test.mjs` and `tests/pwa-worker-bundle.test.mjs` pass on the Windows host; `npm run test:pwa:e2e` passes 12/12 on the Windows host; the `pwa-windows` CI job passes.

### Deliverable: Upgrade-check line splitting

- **D1**: `npm run test:release-upgrade` compares baseline and current data correctly on Windows.
- **D2**: `scripts/upgrade-check/sqlite-output.cjs` exports `outputLines`; both split sites use it.
- **D3**: BACKLOG D2 checked off at seal.
- **D4**: `tests/upgrade-check-sqlite-output.test.cjs` passes; `npm run test:release-upgrade` passes on the Windows host; the `release-upgrade-windows` CI job passes.

### Deliverable: Windows CI coverage

- **D1**: Windows-only regressions in the web runtime build and the upgrade check fail CI.
- **D2**: `pwa-windows` job and bundle-check step in `.github/workflows/pwa.yml`; `release-upgrade-windows` job in `.github/workflows/ci.yml`.
- **D3**: Recorded in the seal entry.
- **D4**: Both new jobs and the amended `pwa` job run green on the Phase 6 PR.

## CI Commands

- `npm run typecheck` - TypeScript across web and Electron configs, including the new plugin module.
- `npm test` - full unit and smoke suite, including the new plugin and sqlite-output tests.
- `npm run test:pwa:e2e` - web runtime build, bundle check, and browser suite (expect 12/12 on Windows).
- `npm run test:release-upgrade` - upgrade verification from the latest published release.
- `npm run test:e2e` - Electron suite, to confirm the desktop runtime is unaffected.
