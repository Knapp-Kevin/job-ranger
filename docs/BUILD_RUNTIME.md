# Electron Build and Runtime Authority

## Canonical source

`electron/src/` is the only authoritative checked-in Electron implementation.

Do not hand-edit or commit compiled Electron runtime files. New backend, preload, IPC, adapter, or main-process work belongs under `electron/src/` and is compiled before execution.

## Generated runtime

`npm run desktop:compile`:

1. removes the previous generated runtime;
2. removes any legacy generated root Electron artifacts;
3. creates temporary compatibility shims for older Node test entry paths;
4. compiles Electron TypeScript and shared runtime modules into `electron-runtime/`.

`electron-runtime/` is generated and ignored by Git. It is the runtime consumed by the application and packaging.

The project uses TypeScript `NodeNext` module and resolution semantics. `.cts` Electron sources compile to CommonJS `.cjs`; shared `.ts` modules retain ESM semantics. The supported Node baseline is `>=22.12.0`, whose CJS/ESM interoperability is exercised by repository smoke tests.

## Execution paths

- `package.json.main` points to `electron-runtime/electron/src/main.cjs`.
- `npm run electron:dev` waits for that generated main process and launches the package root.
- backend and career smoke tests run after `desktop:compile` and may use generated compatibility shims under `electron/*.cjs`; those shims only forward into `electron-runtime/` and contain no implementation logic.
- Electron Playwright launches the package root, so `package.json.main` selects the generated runtime exactly as a normal application launch does.
- Electron Builder packages `electron-runtime/**/*` and sets packaged `main` to `electron-runtime/electron/src/main.cjs`.

## Asset resolution

Main-process code must not infer application assets from the compiled module directory. The generated runtime is intentionally nested.

Renderer HTML and packaged assets resolve from `app.getAppPath()`. Preload resolves relative to the generated main-process module because it is emitted beside it.

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
- the packaged application contains the generated runtime entry point.

Issue #67 and PR #69 established this boundary after R0 exposed the previous checked-in-runtime drift.
