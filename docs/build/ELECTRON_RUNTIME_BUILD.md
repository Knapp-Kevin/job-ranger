# Electron Runtime Build Contract

## Status

Issue #67 removes the historical split between TypeScript Electron source and a separately checked-in CommonJS runtime mirror.

The authoritative source is now:

- `electron/src/**` for Electron main/preload/backend/runtime source;
- `src/shared/**` for contracts shared with the renderer.

The generated runtime is:

- `electron/runtime/**`.

`electron/runtime/**` is disposable build output. It is ignored by Git and must never be edited or committed.

## Build pipeline

`npm run desktop:compile` performs three steps:

1. delete the previous `electron/runtime/` tree;
2. create `electron/runtime/package.json` with `type: commonjs`;
3. compile `electron/src/**` and `src/shared/**` into `electron/runtime/**` using `tsconfig.electron.json`.

`tsconfig.electron.json` uses the supported TypeScript 7 `NodeNext` module/resolution model. `src/shared/package.json` declares the shared source boundary as CommonJS for that NodeNext compilation target, so the Electron build emits shared `.js` contracts that can be required from generated `.cjs` modules. The renderer still consumes the same original TypeScript through its Vite/Bundler toolchain; no second shared-contract implementation exists.

The compiler preserves source-relative paths under the generated root. Important outputs include:

```text
electron/runtime/
├── package.json
├── electron/
│   └── src/
│       ├── main.cjs
│       ├── preload.cjs
│       ├── backend.cjs
│       ├── career-backend.cjs
│       ├── sqlite.cjs
│       ├── adapters/
│       └── validators/
└── src/
    └── shared/
        ├── contracts.js
        └── career-contracts.js
```

The generated runtime package boundary is CommonJS so Electron `.cts` output and the compiled shared `.js` contracts use one executable module system.

## Runtime consumers

Every executable Electron consumer must use generated output:

- `package.json` main: `electron/runtime/electron/src/main.cjs`;
- `electron:dev`: waits for and launches that generated main entry;
- backend persistence smoke tests: import generated backend modules;
- unit tests that exercise Electron runtime utilities: import generated modules;
- Playwright Electron E2E: launches the generated main entry;
- Electron Builder: packages `electron/runtime/**/*` and sets the packaged main entry to the same generated file;
- release verification: imports the generated SQLite resolver.

There is no supported path that executes checked-in root `electron/*.cjs` files.

## Application assets

Generated runtime location must not define UI asset paths.

The main process resolves the application root from its generated module location and loads production UI/icon assets from `dist/`, which is produced by Vite. The tray receives the resolved icon path explicitly.

## Drift prevention

`npm run desktop:verify` is part of the ordinary test and E2E paths. It fails when:

- the expected generated main/preload/backend/shared files are missing;
- the generated runtime does not declare CommonJS;
- `package.json` and Electron Builder disagree on the main entry;
- Electron Builder packages the broad Electron source tree instead of generated output;
- `electron/runtime/**` becomes tracked;
- legacy root CJS/adapters/validators/shared mirrors are tracked again;
- generated JavaScript appears inside the authoritative source tree.

Because `npm run repo:health` executes `npm test`, pull-request and main CI validate this contract from a clean checkout.

## Development rule

Edit `electron/src/**` or `src/shared/**`. Never edit generated runtime files.

If a new Electron runtime module is added, its source belongs under `electron/src`. If a contract is genuinely shared with the renderer, its source belongs under `src/shared`. Run `npm run desktop:compile` to regenerate the runtime locally.

`src/shared/package.json` is part of the build contract, not a second package distribution. Its module declaration exists so NodeNext produces CommonJS copies for the Electron runtime target while the browser build continues to use Vite.

## Packaging rule

Electron Builder packages only:

- Vite `dist/**/*`;
- `package.json`;
- generated `electron/runtime/**/*`;
- platform-specific extra resources such as the pinned Windows SQLite executable.

This ensures development, smoke tests, E2E, and packaged releases execute the same compiled Electron code rather than parallel source/runtime representations.
