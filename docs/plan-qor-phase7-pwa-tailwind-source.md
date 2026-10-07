# Plan: Phase 7 - Web runtime ships without Tailwind utilities

**change_class**: hotfix

**doc_tier**: minimal

**pr_target**: phase/6-windows-pwa-adapter-upgrade-crlf

## Open Questions

None. Defect observed on 2026-10-07 while recording a demo of the web runtime: layout utilities are missing from every web build (not Windows-specific).

- `dist-pwa/assets/index-CwMqb0bL.css` is 17,109 bytes and contains no `.flex{`, `.grid{`, `.gap-3{`, `.rounded-2xl{`, or `.items-center{` rule; the desktop build `dist/assets/index-DPx-m3yj.css` (51,398 bytes) contains each once. `src/components/Sidebar.tsx` uses all five (`className="flex items-center gap-3"`, `className="brand-mark flex h-10 w-10 items-center justify-center rounded-2xl"`).
- Screenshots of the built web app show colors and fonts (plain CSS in `src/index.css`) but no layout: the sidebar stacks icons above labels and cards span the full width.
- No web test asserts layout, so `tests/pwa` passed 12/12 on the unstyled app.

## Locked Decisions

- LD1: Root cause. `@tailwindcss/vite` scans for class candidates from the Vite config root when the CSS does not name a source. The web build sets `root: path.join(root, "web")`, and the components live in `src/`, outside that root, so no utility candidates are found. The desktop build sets no root (repository root) and scans `src/`.
  - `git show HEAD:vite.pwa.config.ts | grep -nE 'root: path.join\(root, "web"\)'` -> `root: path.join(root, "web"),`
  - `grep -n "root" vite.config.ts` -> no `root` option (Vite default: the project root)
  - `node_modules/@tailwindcss/vite/dist/index.mjs` (v4.3.3): the scanner falls back to `[{base:this.base,pattern:"**/*",negated:!1}]` when the stylesheet declares no source, and `this.base` is the resolved Vite config root (`new z(i,e.root,...)`).
- LD2: Fix in the shared stylesheet, not the build config: `src/index.css` changes `@import "tailwindcss";` to `@import "tailwindcss" source("..");`, making the repository root the scan base for both builds. Both builds then scan the same tree (`.gitignore` still applies), so the web and desktop stylesheets come from the same candidate set. Tailwind v4 documents `source(...)` on the import as the way to set the base path for automatic source detection.
  - `git show HEAD:src/index.css | grep -n '@import'` -> `1:@import "tailwindcss";`
- LD3: Guard on the built artifact: a test reads the built web stylesheet and requires rules for shell classes the app uses. No layout assertion exists today, so the test is the regression boundary.

## Phase 1: Tailwind source for the web build

### Unit Tests

- `tests/pwa-css-utilities.test.mjs` (new). Reads the single `dist-pwa/assets/index-*.css` and asserts it contains a rule for each of `.flex{`, `.items-center{`, `.gap-3{`, `.rounded-2xl{`, `.grid{` (classes used by `src/components/Sidebar.tsx` and `src/pages/Dashboard.tsx`). Fails with the missing class names. Fails clearly when `dist-pwa` is absent. On the current build every assertion fails.

### Affected Files

- `src/index.css` - line 1 becomes `@import "tailwindcss" source("..");`.
- `package.json` - `test:pwa:e2e` runs `node tests/pwa-css-utilities.test.mjs` after the bundle check.
- `.github/workflows/pwa.yml` - `pwa` and `pwa-windows` jobs run `node tests/pwa-css-utilities.test.mjs` after the worker bundle check.

## Feature Inventory Touches

| entry_id | operation | test_path | test_descriptor |
| --- | --- | --- | --- |
| FX046 | n/a-justified | tests/pwa/runtime.spec.ts | Stylesheet-scope fix only; no runtime behavior change. Layout is guarded by `tests/pwa-css-utilities.test.mjs`. |

## Definition of Done

### Deliverable: Styled web runtime

- **D1**: The built web app renders the same layout utilities as the desktop app.
- **D2**: `src/index.css` imports Tailwind with `source("..")`; `tests/pwa-css-utilities.test.mjs` exists and runs in `test:pwa:e2e` and both PWA CI jobs.
- **D3**: META_LEDGER audit/implement/seal entries for Phase 7; BACKLOG entry for the defect added and checked off at seal; CHANGELOG Unreleased records the fix.
- **D4**: `tests/pwa-css-utilities.test.mjs` fails before the change and passes after `npm run build:pwa`; the desktop stylesheet still contains the same five rules after `npm run build`; `npm run test:pwa:e2e` passes 12/12; a screenshot of the built web app's Home and Applications pages shows the sidebar and card layout.

## CI Commands

- `npm run build` - desktop renderer build; stylesheet keeps its utilities.
- `npm run test:pwa:e2e` - web build, bundle and CSS checks, browser suite.
- `npm run typecheck` - unchanged TypeScript surface.
