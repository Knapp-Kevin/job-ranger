# Plan: Phase 8 - PWA update test races the browser's own service-worker update check

**change_class**: hotfix

**doc_tier**: minimal

**pr_target**: phase/6-windows-pwa-adapter-upgrade-crlf (ships in PR #158)

**iteration**: 2 (amended after the plan audit VETO recorded at META_LEDGER Entry #38)

## Open Questions

None blocking. One CI observation stays open as evidence-gathering (see LD4).

## Evidence

- PR #158 run 37572804981, job `pwa-windows`: `tests/pwa/update-and-storage.spec.ts:87` timed out after 120 s waiting for `load` after "Repair app shell". No trace was uploaded (the job keeps `test-results/` only on the runner).
- Local reproduction on the Windows 10 dev host, 2026-10-07: `npx playwright test --config playwright.pwa.config.ts tests/pwa/update-and-storage.spec.ts --repeat-each=15` -> 1 failure in 15 (repeat 13) at `:79`: `Expected: "1.3.0+a7322b533216.next"`, `Received: "1.3.0+a7322b533216.broken"`. Trace `test-results/update-and-storage-service-22f33-and-never-touch-career-data-repeat13/trace.zip` timeline:
  - 18.355 `page.reload()` after step 1, with the server still on the broken root (`:62` `server.setRoot(roots.broken)` is not reverted before the reload at `:67`).
  - 18.511 `GET /sw.js`: Chrome's navigation-triggered service-worker update check fetches the broken worker and starts installing it.
  - 19.054-19.089 that install fetches `help.html`, `/` (3,107 bytes: the broken shell) and `manifest.webmanifest` (2,122 bytes: the original). The test switched to the next root (`:72`) between the shell and manifest requests. The broken worker's manifest hash is the original manifest's (the variant corrupts `manifest.webmanifest` after hashing, `:25-29`), so every file verifies and the broken build installs.
  - 19.084 the test's own `update()`; 19.152 `pwa-update-ready` visible (68 ms later, the broken build already waiting); "Reload to update" activates it; `:79` reads the broken build id.
- The application behaved correctly (it cached only bytes matching its manifest). The defect is the test switching server roots while the browser can still run its own update check against the previous root.

## Locked Decisions

- LD1: Withdraw the broken deployment before the user reloads: in step 1, `server.setRoot(roots.current)` immediately after the error assertions and before `page.reload()`. The navigation-triggered update check then compares against the active version's own `sw.js` and installs nothing.
  - `git show HEAD:tests/pwa/update-and-storage.spec.ts | grep -nE 'setRoot\(roots\.(broken|next)\)|await page.reload\(\);'` -> `57: await page.reload();`, `62: server.setRoot(roots.broken);`, `67: await page.reload();`, `72: server.setRoot(roots.next);`
- LD2: Start step 2 from a known service-worker state: before `server.setRoot(roots.next)`, poll until the registration has no `installing` or `waiting` worker. If a stray install ever appears again, the test fails at a clear assertion instead of later at a misleading build-id comparison.
- LD3: Register reload waits before the action, `await Promise.all([page.waitForEvent("load"), <click>])`, at the three reload-triggering steps. This is hygiene, not the root cause: Playwright 1.63 `click()` waits for a triggered navigation to commit, and `load` arrives as a later message, so a missed event is unlikely; the pattern removes the exposure at no cost.
  - `git show HEAD:tests/pwa/update-and-storage.spec.ts | grep -nE 'Reload to update|repair-app-shell|waitForEvent\("load"\)'` -> `76: await page.getByRole("button", { name: "Reload to update" }).click();`, `77: await page.waitForEvent("load");`, `86: await page.getByTestId("repair-app-shell").click();`, `87: await page.waitForEvent("load");`
  - `git show HEAD:tests/pwa/portability.spec.ts | grep -nE 'Restore and restart|waitForEvent\("load"\)'` -> `99: await page.getByRole("button", { name: "Restore and restart" }).click();`, `100: await page.waitForEvent("load");`
- LD4: The hosted-runner timeout at `:87` is not explained by the local trace. Both PWA CI jobs upload `test-results/` (traces, screenshots, error context) when the browser suite fails, so a recurrence carries evidence. BACKLOG records it as an open item until the evidence closes it.
  - `grep -n "trace" playwright.pwa.config.ts` -> `trace: "retain-on-failure",`

## Phase 1: Test sequencing and CI evidence

### Unit Tests

- `tests/pwa/update-and-storage.spec.ts` (changed): step 1 reverts the root before reloading (LD1); a new assertion before step 2 polls `navigator.serviceWorker.getRegistration()` until `installing` and `waiting` are both null (LD2); the "Reload to update" and "Repair app shell" waits use `Promise.all` (LD3). Post-reload assertions (next build id, cache set, preserved profile) are unchanged, so a real regression in update or repair still fails the test.
- `tests/pwa/portability.spec.ts` (changed): the "Restore and restart" wait uses `Promise.all` (LD3); restore assertions unchanged.

### Affected Files

- `tests/pwa/update-and-storage.spec.ts`, `tests/pwa/portability.spec.ts` - as above.
- `.github/workflows/pwa.yml` - `pwa` and `pwa-windows`: upload `test-results/` with `if: failure()` after the browser suite (artifact names `pwa-test-results-linux`, `pwa-test-results-windows`; 14-day retention).
- `docs/BACKLOG.md` - D4 (this race) added and checked off at seal; G9 opened for the unexplained hosted-runner timeout at the repair step.

## Feature Inventory Touches

| entry_id | operation | test_path | test_descriptor |
| --- | --- | --- | --- |
| FX047 | n/a-justified | tests/pwa/update-and-storage.spec.ts | Test sequencing fix; update and repair assertions unchanged. |
| FX042 | n/a-justified | tests/pwa/portability.spec.ts | Reload-wait ordering only; restore assertions unchanged. |

## Definition of Done

### Deliverable: Deterministic update test

- **D1**: The update test no longer lets the browser install a deployment the test has already withdrawn; reload waits cannot miss their event.
- **D2**: LD1-LD3 applied exactly at the cited lines; both PWA CI jobs upload `test-results/` on failure.
- **D3**: META_LEDGER audit/implement/seal entries for Phase 8; BACKLOG D4 complete and G9 open.
- **D4**: Before the change the spec failed 1 in 15 local runs with the trace above. After it, `tests/pwa/update-and-storage.spec.ts --repeat-each=45` passes 45/45 on the same host, and `npm run test:pwa:e2e` passes 12/12. On PR #158 the `pwa-windows` job is re-run until three runs have completed; all three must be green, along with `pwa`, `release-upgrade`, `release-upgrade-windows`, `repository-health`, and `store-package`.

## CI Commands

- `npx playwright test --config playwright.pwa.config.ts tests/pwa/update-and-storage.spec.ts --repeat-each=45` - repeated execution of the sequenced spec.
- `npm run test:pwa:e2e` - full web build and browser suite.
- `npm run typecheck` - TypeScript.
