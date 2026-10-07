# Project Backlog

Governed engineering work for Job Ranger. Product capability candidates, deferrals, and non-goals
live in [`PRODUCT_GAP_REVIEW.md`](./PRODUCT_GAP_REVIEW.md); this file tracks work that has been
identified concretely enough to plan. Items close only through a sealed governance cycle.

## Blockers (Must Fix Before Progress)

### Development Blockers

- [x] [D1] (Phase 6 - Complete) PWA build on Windows registers IPC handlers into a duplicate adapter module. `vite.pwa.config.ts` `runtimeAdapterPlugin.resolveId` returns backslash paths, so the worker bundle contains two copies of `src/pwa/adapters/electron-worker.ts`; every web-runtime call fails with `No handler registered for '<channel>'` and all `tests/pwa` specs fail on Windows hosts (CI runs Ubuntu and does not see it).
- [x] [D2] (Phase 6 - Complete) `npm run test:release-upgrade` fails on Windows. `scripts/upgrade-check/check-current-release.cjs` splits `sqlite3` output on `\n`; Windows `sqlite3.exe` emits `\r\n`, leaving `\r` on every table name.

## Backlog (Planned Work)

- [ ] [B1] User-story-driven end-to-end coverage. Extend `docs/design/UNIVERSAL_USER_STORIES.md` and `docs/validation/UNIVERSAL_USER_STORY_MATRIX.md` with per-story steps and expected end state, then add UI-driven specs for journeys with no UI test today: track a job, change application status and notes, save the Career Profile, save a filter, run a source, save settings, Electron backup/restore, resume statement edit under the Truth Gate, imported-evidence edit/reject/merge, skip onboarding, destructive deletes other than removing a source (filter, application, story, contact, event, cover letter, target track), Jobs search, JSON Resume import, and the Career Profile resume import in the desktop runtime (only `tests/pwa/career-ops.spec.ts` drives it today).
- [ ] [B2] Control-behavior sweep: a spec that visits every route and asserts each button/link navigates or acts as specified.
- [ ] [B3] Accessible names: add names to controls that have none (resume statement textareas, Settings runtime inputs whose labels are not associated, toast dismiss button) and to the Jobs search inputs and company select, whose wrapping labels contain only an icon so their names fall back to placeholder or option text; make repeated per-row names unique (Career Profile Confirm/Edit/Reject, Companies Run/Remove, Filters Delete).
- [ ] [B4] PWA career-ops spec drives the UI instead of `window.electronAPI` for its workflow steps.

## Product Gaps Found (Not Yet Planned)

- [ ] [G1] Sources cannot be edited, paused, or rescheduled after creation (`updateCompany` is not wired to any UI).
- [ ] [G2] Filters cannot be edited or toggled (`updateFilter` is not wired); "Title excludes" is not shown on the filter card.
- [ ] [G3] Cover letters cannot be exported, copied, or downloaded.
- [ ] [G4] Destructive actions run without confirmation (company, filter, application, story, contact, event, cover letter, target track, offer details); `ConfirmDialog` is unused.
- [ ] [G5] Notification checkboxes save only through "Save runtime settings" in a different section, with no on-screen cue.
- [ ] [G6] No in-app Help entry point in the renderer; the web runtime has no help link.
- [ ] [G7] Flaky Electron specs on Windows: `tests/e2e/resume-tailoring.spec.ts` "user previews, discards, and accepts a deterministic tailoring plan" fails intermittently ("Requirements Job Ranger will not claim" not visible; 1 of 2 runs on 2026-10-06, 3 of 4 on 2026-10-07); `tests/e2e/app.spec.ts:68` "career profile is occupation agnostic and supports annual pay" failed once on 2026-10-07 and passed 3 reruns.

## Housekeeping

- [ ] [H1] Archive historical plan files from `docs/` and `docs/planning/` into the Tier 6 archive (see `GOVERNANCE_INDEX.md` Tier 4).
