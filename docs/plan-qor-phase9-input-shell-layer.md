# Plan: Phase 9 - Form-control icons overlap text (shell padding overrides Tailwind utilities)

**change_class**: hotfix

**doc_tier**: minimal

**pr_target**: phase/7-pwa-tailwind-source

**iteration**: 4 (amended after the plan audit VETOs recorded at META_LEDGER Entries #47, #48 and #49)

Closes BACKLOG G8. Treated as a public-review blocker: the Find Jobs filter bar is in the public demo's core shot, and the defect exists in the desktop app and the web app alike.

## Open Questions

None.

## Evidence

- Built web app with Phase 7 styles, Find Jobs at 1024, 1280, 1440 and 1600 px wide (2026-10-07): the search, location, company and target-track icons sit on the first letters of the placeholder or selected text.
- Each Find Jobs filter is a `<label className="relative">` with a 16 px icon at `absolute left-4` and the control at `pl-11` (2.75 rem), which is meant to clear the icon.
- `src/index.css` declares the shell controls' padding outside any `@layer`. Tailwind v4 emits utilities in `@layer utilities`, and unlayered declarations win over every cascade layer regardless of specificity, so `pl-11` never applies: the computed left padding stays 0.95 rem (15.2 px) and the text starts under the icon.
- The same override disables `pl-11`, `pr-16` and `pl-8` on three `src/pages/CareerProfile.tsx` fields (home-area icon, "miles" suffix, "$" prefix).
- Inventory of padding utilities written on shell controls in `src/` (every one is currently suppressed by the unlayered padding): `pl-11` on 5 controls (`Jobs.tsx:166,175,183,199`, `CareerProfile.tsx:227`), `pr-16` on 1 (`CareerProfile.tsx:240`), `pl-8` on 1 (`CareerProfile.tsx:265`), and `py-3` on 19 textareas (`ApplicationInsightsPanel.tsx:145,151`, `ApplicationLifecyclePanel.tsx:239,372`, `CareerStoriesPanel.tsx:215`, `Applications.tsx:108`, `CareerProfile.tsx:297,311,323,335,433,537`, `EvidenceEntry.tsx:209,459`, `Onboarding.tsx:270`, `Resume.tsx:345`, `TargetTracks.tsx:263,272,324`). Command: `grep -rnoE 'className="[^"]*(input|select|textarea)-shell[^"]*"' src --include=*.tsx | grep -E '\b(p|px|py|pl|pr|pt|pb)-'`.

## Locked Decisions

- LD1: Move only the `padding` declaration of the shell rule into `@layer components`; every other declaration of `.input-shell, .select-shell, .textarea-shell` and the `:focus` rule stay unlayered exactly as they are. Only padding utilities change precedence; width, border, background, color, shadow and focus behavior keep their current cascade position, so utilities such as `w-auto` on selects (`CareerProfile.tsx:278`, `Onboarding.tsx:281,303,337,358`, `TargetTracks.tsx:62`) remain overridden as today.
  - `git show HEAD:src/index.css | grep -nE '^\.input-shell,|^\.input-shell:focus,|padding: 0\.78rem 0\.95rem;'` -> `282:.input-shell,`, `290:  padding: 0.78rem 0.95rem;`, `298:.input-shell:focus,`
  - `git show HEAD:src/pages/Jobs.tsx | grep -nE 'className="(input|select)-shell pl-11"'` -> `166`, `175`, `183`, `199`
  - `git show HEAD:src/pages/CareerProfile.tsx | grep -nE 'className="input-shell (pl-11|pr-16|pl-8)"'` -> `227: className="input-shell pl-11"`, `240: className="input-shell pr-16"`, `265: className="input-shell pl-8"` (leading whitespace trimmed)
- LD2: Declared rendering changes, and nothing else: the seven `pl-11`/`pr-16`/`pl-8` controls get the clearance their markup asks for (the fix), and the 19 `py-3` textareas go from 0.78 rem to 0.75 rem vertical padding (about 0.5 px per side; their `min-h-*` heights are unchanged). The remaining unlayered rules on these elements (`src/index.css:77-88`) set only `font: inherit` and `color` and are untouched. Themes set only CSS variables (`src/theme/ThemeProvider.tsx:186`), so all three themes are affected identically.
  - `git show HEAD:src/index.css | grep -nE '^input,|font: inherit;'` -> `78:input,`, `81:  font: inherit;`, `84:input,`
- LD3: No markup, label or handler changes. Accessible names and keyboard behavior are untouched. The focus ring is untouched because the `:focus` rule sets only `outline`, `border-color` and `box-shadow`, contains no padding, and stays unlayered exactly where it is.

## Phase 1: Layer the control-shell padding

### Unit Tests

- `tests/e2e/filter-controls.spec.ts` (new, Electron). On Find Jobs, for each of the four filter controls, reads the icon's bounding box and the control's content-box left edge (box left + border-left + padding-left) and asserts the icon ends at least 4 px before the content begins. Focuses the search field, presses Tab, and asserts focus moves to the location field (the next filter control) with the focus ring applied (its computed `box-shadow` differs from its unfocused value). On Career Profile, asserts the same for the home-area icon and "$" prefix, and that the "miles" suffix starts at least 4 px after the commute field's content box ends. Asserts that one `py-3` textarea (Career Profile "Roles you would consider") has computed vertical padding of 12 px and an unchanged width equal to its container. Fails on the current build (icon ends 32 px from the control edge; content starts at about 16 px).
- `tests/pwa/filter-controls.spec.ts` (new, web production build). The same assertions against `dist-pwa`.

### Affected Files

- `src/index.css` - remove `padding` from the unlayered shell rule and add `@layer components { .input-shell, .select-shell, .textarea-shell { padding: 0.78rem 0.95rem; } }`.
- `tests/e2e/filter-controls.spec.ts`, `tests/pwa/filter-controls.spec.ts` - new.
- `docs/BACKLOG.md` - G8 checked off.
- `CHANGELOG.md` - Unreleased fix entry.
- `docs/GOVERNANCE_INDEX.md` - Phase 9 plan row.

## Feature Inventory Touches

| entry_id | operation | test_path | test_descriptor |
| --- | --- | --- | --- |
| FX022 | n/a-justified | tests/e2e/filter-controls.spec.ts | Styling fix; the new spec asserts the search and filter controls' text clears their icons. Filtering behavior itself is unchanged and stays unverified (BACKLOG B1). |
| FX009 | n/a-justified | tests/e2e/filter-controls.spec.ts | Styling fix to three Career Profile fields; saving the profile is unchanged and stays unverified. |

## Definition of Done

### Deliverable: Clear form-control spacing

- **D1**: Icons and affixes never overlap placeholder, selected or typed text in the Find Jobs filters or the three Career Profile fields, in Electron and the web app; no other layout change beyond the declared `py-3` textarea padding.
- **D2**: Only the shell rule's `padding` declaration lives in `@layer components`; the rest of the shell rule and its `:focus` rule remain unlayered and otherwise unchanged; both new specs exist.
- **D3**: Ledger plan/audit/implement/seal entries; BACKLOG G8 complete; CHANGELOG and governance index updated.
- **D4**: Both new specs fail before the change and pass after it; `npm run test:e2e` and `npm run test:pwa:e2e` pass apart from the known intermittent specs (BACKLOG G7, G10); screenshots of Find Jobs, Career Profile, Target Tracks and Onboarding at 1280, 1440 and 1600 px in the web app, and Find Jobs and Career Profile in Electron, show clear spacing, a visible focus ring, and select widths unchanged from before the fix.

## CI Commands

- `npx playwright test tests/e2e/filter-controls.spec.ts` - Electron layout assertions.
- `npx playwright test --config playwright.pwa.config.ts tests/pwa/filter-controls.spec.ts` - web layout assertions.
- `npm run test:e2e` - Electron suite.
- `npm run test:pwa:e2e` - web build and browser suite.
- `npm run typecheck` - TypeScript.
