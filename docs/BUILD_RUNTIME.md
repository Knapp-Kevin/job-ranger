# Electron Build and Runtime Authority

## Canonical source

`electron/src/` is the only authoritative checked-in Electron implementation.

Do not hand-edit or commit compiled Electron runtime files. New backend, preload, IPC, adapter, or main-process work belongs under `electron/src/` and is compiled before execution.

## Generated runtime

`npm run desktop:compile`:

1. removes the previous generated runtime;
2. removes legacy generated root Electron artifacts;
3. creates temporary compatibility shims for older Node/test/release-verification entry paths;
4. compiles Electron TypeScript and shared runtime modules into `electron-runtime/`.

`electron-runtime/` is generated and ignored by Git. It is the runtime consumed by the application and packaging.

The project uses TypeScript `NodeNext` module and resolution semantics. `.cts` Electron sources compile to CommonJS `.cjs`; shared `.ts` modules retain ESM semantics. The supported Node baseline is `>=22.12.0`.

## Execution paths

- `package.json.main` points to `electron-runtime/electron/src/main.cjs`.
- `npm run electron:dev` waits for that generated main process and launches the package root.
- backend/career smoke tests run after `desktop:compile` and may use generated compatibility shims under `electron/*.cjs`.
- those shims forward into `electron-runtime/` and contain no independent implementation logic.
- Electron Playwright launches the package root, so `package.json.main` selects the same generated runtime used by normal application launch.
- Electron Builder packages `electron-runtime/**/*` and sets packaged `main` to `electron-runtime/electron/src/main.cjs`.

## Release-workflow compatibility shim

The Windows release workflow performs a packaged-SQLite resolver check after the build and currently loads `electron/sqlite.cjs`.

That path is intentional: `desktop:compile` creates `electron/sqlite.cjs` as a temporary compatibility shim that forwards to the generated runtime implementation. It is **not** a second checked-in SQLite resolver and does not weaken `electron/src/**` as the implementation authority.

If the compatibility shim is ever removed, release verification must be updated in the same change so packaged SQLite resolution remains explicitly proven.

## Asset resolution

Main-process code must not infer application assets from the compiled module directory. The generated runtime is intentionally nested.

Renderer HTML and packaged assets resolve from `app.getAppPath()`. Preload resolves relative to the generated main-process module because it is emitted beside it.

## Web/PWA build

`npm run build:pwa` (`vite.pwa.config.ts`) bundles the **same** `electron/src/**` shared core for the browser. It does not use `electron-runtime/`. Runtime-specific modules and Node built-ins are replaced at build time by the adapters listed in `src/pwa/adapter-map.ts`. The build fails on any unadapted `node:*` import. Output goes to `dist-pwa/` (ignored by Git) and includes:
- `sw.js`, with the SHA-256 shell manifest;
- `_headers`, with the production security headers;
- `build-info.json`, with build ID, commit, CSP, and asset hashes.

See [`design/PWA_RUNTIME.md`](./design/PWA_RUNTIME.md).

## Microsoft Store build

`npm run electron:build:store` packages the same generated runtime with `electron-builder.store.cjs` (AppX). It runs on Windows only. Package identity comes from environment/repository variables. See [`design/MICROSOFT_STORE_PACKAGING.md`](./design/MICROSOFT_STORE_PACKAGING.md).

## Source-control rules

- track `electron/src/**`;
- ignore `electron-runtime/**`;
- ignore generated compatibility shims and generated root Electron directories;
- do not restore checked-in compiled copies as a convenience.

This prevents source/runtime drift and ensures a new Electron service cannot work locally while being absent from the packaged application merely because a stale compiled file was committed earlier.

## Validation contract

Changes to the Electron build boundary must prove, at minimum:

- `npm run repo:health`;
- `npm run test:unit`;
- Electron Playwright E2E;
- Electron Builder directory/package validation;
- the packaged application contains the generated runtime entry point;
- packaged SQLite/runtime resolution still uses the generated implementation path.

These checks may run through hosted CI when justified or manually in an isolated maintainer environment when preserving GitHub Actions budget. Validation evidence must state the environment, exact commands, results, and anything not exercised.

Release candidates additionally follow [`RELEASE_READINESS.md`](./RELEASE_READINESS.md).

Issue #67 and PR #69 established this boundary after R0 exposed the previous checked-in-runtime drift.
