# Plan: Phase 17 - Public discovery provider tranche: Himalayas (authorized scope) and We Work Remotely (HELD) (#136)

**change_class**: feature

**doc_tier**: standard

**terms**:
- term: provider eligibility text
  home: electron/src/source-discovery.cts

**boundaries**:
- limitations: desktop runtime only for Himalayas (the publisher sends no CORS header); at most 3 role searches per discovery; role-title matching is substring/token based and is not a relevance model
- non_goals: We Work Remotely enablement or release; PWA access to either provider; pagination; location as a hard filter; employer monitoring from provider links
- exclusions: no proxy, credential, scraping, application submission, new dependency or change to `SourceDiscoveryProviderId`

**pr_target**: main

Delivery: issue #136 via draft PR #233 (Phase 1) after this plan is audited.

**risk_grade**: L2 (untrusted network JSON/XML on the acquisition boundary; no new authority)

**iteration**: 2

Iteration 2 supersedes `docs/plans/136-provider-expansion.md` (iteration 1, commit `9965119`, never recorded or audited). The iteration-1 defects corrected here:
1. It prescribed `qortara status` / `qortara check ...` / `qortara gate record`. No `qortara` executable exists on this host, and `MythologIQ-Labs-LLC/qortara-logic` states no runtime has been migrated into it yet. The installed runtime is `qor-logic-plus 3.8.0`; the CI Commands section below uses its actual commands.
2. It lived outside the governed plan path (`docs/plan-qor-phase*.md`); the `prompt_injection_canaries` gate refused to scan it.
3. It lacked change_class, doc_tier, per-phase Affected Files, Feature Inventory Touches, Definition of Done and CI Commands, so the plan lints passed vacuously.
4. It stated Himalayas `pubDate` "can be a millisecond epoch value". The live API returns epoch **seconds** (see LD2).
5. Iteration-1 commits `fd19d24` and `9965119` were written after the exploratory branches existed and describe their behaviour. That is disclosed here; see Provenance.

## Provenance of existing code (binding disclosure)

Draft branches `wip/136-himalayas-discovery-unqualified` (head `e22d49b`) and `wip/136-wwr-rss-unqualified` (head `0c77dfc`) were written **before** any plan was recorded or audited. No gate authorized them. A PASS on this plan does not retroactively authorize those commits. After PASS, Phase 1 treats the Himalayas branch as a reviewed candidate input. Implementation records (a) red evidence from the existing Himalayas tests run against the `main` baseline, (b) red-first evidence for each new defect test in this plan, and (c) an intent lock taken before any new source edit. The WWR branch stays an unauthorized candidate (Phase 2 is HELD).

## Open Questions

None block the audit of Phase 1. Phase 2 is held on a publisher-terms question that the audit cannot resolve (see Phase 2).

## Locked Decisions (grep evidence against exact refs)

Baseline `main` = `b78d06c8a05e80f93b0eaf1de9bb89e9bd95b26c`; Himalayas candidate = `e22d49b1321839ccd5096a96c5b9ce7de103df2e`; WWR candidate = `0c77dfccaf91c6f7a337ac2c511a0116ff9b0a6a`.

- **LD1 - provider contract unchanged.** `git show b78d06c:src/shared/source-discovery.ts | grep -nE 'SourceDiscoveryProviderId ='` -> `3:export type SourceDiscoveryProviderId = "public-job-feeds";`. Himalayas results are candidates under this provider with `providerName: "Himalayas"`, `canMonitor: false`, `applyUrl: null`.
- **LD2 - Himalayas `pubDate` is epoch seconds.** Live `GET https://himalayas.app/jobs/api/search?q=software%20engineer&sort=recent&page=1` (2026-10-10T04:39Z) returned `pubDate: 1789962228` (an integer). The candidate does `new Date(value)` (`git show e22d49b:electron/src/himalayas-discovery.cts | grep -n 'new Date(value)'` -> `44:  const parsed = new Date(value);`). It renders 100% of live listings as `1970-01-21`. The candidate fixture uses milliseconds (`git show e22d49b:tests/himalayas-discovery.test.cjs | grep -n 'pubDate: 1791504000000'` -> `20:  pubDate: 1791504000000,`). The existing seconds helper is `git show b78d06c:electron/src/source-discovery.cts | grep -n 'const date = new Date(epoch \* 1000)'` -> `131:  const date = new Date(epoch * 1000);`. Decision: interpret a finite numeric `pubDate` < 1e12 as seconds and >= 1e12 as milliseconds; reject non-finite values, and reject dates more than 1 day in the future or before 2000-01-01 (to null).
- **LD3 - Himalayas time-zone restrictions are numbers.** Live `timezoneRestrictions: [-10, -4, ..., 3.5, ..., 14]`. The candidate accepts only strings (`git show e22d49b:electron/src/himalayas-discovery.cts | grep -nE 'shortText\(part, 80\)'` -> `35:    const text = shortText(part, 80);`), so every live list becomes `null` and every row reads "time zone eligibility unspecified". Decision: accept finite numbers in [-12, 14] and render them as `UTC-10`, `UTC+3.5`, and so on.
- **LD4 - long location lists are restrictions, not absence.** The candidate drops any list longer than 12 (`git show e22d49b:electron/src/himalayas-discovery.cts | grep -n 'value.length > 12'` -> `32:  if (value.length > 12) return null;`). A live EMEA listing had 164 countries, which displayed as "eligibility unspecified". Decision: accept up to 250 entries of <= 80 chars. Display the first 3 entries plus "and N more countries". Over 250 entries, or any invalid entry, stays `null`/unspecified. Never render "Worldwide" unless both lists are present and empty.
- **LD5 - at most 3 role searches, desktop only.** Live `OPTIONS` and `GET` with `Origin: http://localhost:5173` returned no `Access-Control-Allow-Origin` (2026-10-10). The web runtime is skipped with an explicit warning; the runtime kind is passed through `core-ipc` (`git show b78d06c:electron/src/core-ipc.cts | grep -n 'getRuntimeInfo'` -> `37:  getRuntimeInfo: () => Promise<RuntimeInfo>;`).
- **LD6 - result cap and fairness.** The result cap is the validator's (`git show b78d06c:electron/src/source-discovery-validator.cts | grep -n 'Math.min(40'` -> `39:  const limit = Math.min(40, Math.max(1, rawLimit));`). Candidate per-provider round-robin interleaving before the cap is retained.

## Phase 1: Himalayas defect closure and qualification (authorized scope on PR #233 branch)

### Affected Files

- `tests/himalayas-discovery.test.cjs` - add live-shaped fixtures first (seconds `pubDate`, numeric time zones, 164-country list, out-of-range date, non-finite number)
- `electron/src/himalayas-discovery.cts` - `publicationDate` seconds/ms rule (LD2); `restrictionList` accepting numeric offsets and up to 250 entries (LD3, LD4)
- `electron/src/source-discovery.cts` - `himalayasLocation` renders `UTC+/-n` and the bounded "and N more countries" summary
- `docs/plans/136-provider-expansion.md` - removed (superseded by this file)

### Changes

`publicationDate(value)`: number -> `value < 1e12 ? value * 1000 : value`; string -> `Date.parse`; result outside [2000-01-01, now + 1 day] -> `null`. `restrictionList(value, kind)`: array of length <= 250; `kind: "location"` requires strings <= 80 chars; `kind: "timezone"` requires finite numbers in [-12, 14], or numeric strings. Any invalid entry -> `null`. `himalayasLocation` keeps its existing branches and changes only how lists render.

### Unit Tests

- `tests/himalayas-discovery.test.cjs` - `normalizeHimalayasResponse` on a fixture with `pubDate: 1789962228` returns `publishedAt === "2026-09-21T03:43:48.000Z"`; on `pubDate: 1791504000000` it returns the same instant as `new Date(1791504000000)`; on a date in 2099 it returns `null`.
- `tests/himalayas-discovery.test.cjs` - a job with `timezoneRestrictions: [-5, 3.5]` yields a discovery candidate whose `location` contains `UTC-5` and `UTC+3.5` and does not contain "time zone eligibility unspecified".
- `tests/himalayas-discovery.test.cjs` - a job with a 164-entry location list yields a `location` that starts with `Remote 00b7 ` (middle dot) followed by the first 3 countries and contains `and 161 more countries`; a 251-entry list yields "eligibility unspecified"; neither yields "Worldwide".
- Existing candidate assertions (attribution, unsafe URL rejection, duplicate GUIDs, 429/malformed isolation, web skip, result-cap starvation) must pass unchanged.

## Phase 2: We Work Remotely RSS - HELD (no implementation authorized by this plan)

A PASS on this plan does **not** authorize merging, enabling or distributing WWR. Disposition: **HOLD pending written publisher clarification**.
- `https://weworkremotely.com/remote-job-rss-feed` (read 2026-10-10): "Anyone can use the feed, all we ask is that you attribute the links back to We Work Remotely."
- `https://weworkremotely.com/api-terms-and-guidelines` (read 2026-10-10): prohibits using "the API, or any We Work Remotely data" to build "A job advertising or job search service", and states "Scraping, copying, saving, or storing our data is strictly prohibited".
- Job Ranger discovery plausibly is a job search service, and "any We Work Remotely data" plausibly includes RSS items. Neither document resolves the conflict. The API terms put "the onus ... to contact us" on the integrator.

Technical qualification of the candidate `0c77dfc` is recorded as evidence only: 31 of 32 adversarial cases fail closed. Defects to fix before any future re-plan:
- **W1** country lists longer than 300 chars are dropped (4 of 89 live items).
- **W2** the 1 MiB cap rejects a 100-item feed at p90 item size (1,260,453 B). The live feed is capped at 10 items per category across 10 categories. A proposed 2 MiB cap accepts 100 items at the observed max item size (1,821,953 B) and still rejects 200 x max (3,643,753 B).
- **W3** an oversized stream calls `releaseLock` without `cancel`.
- **W4** the web warning says CORS is "unverified", but the live feed returns `Access-Control-Allow-Origin: *`. The wording must change to "not enabled pending publisher terms review".
- `region` is "Anywhere in the World" on 87 of 89 live items, including US-only items. The candidate already refuses to display it as worldwide.
These fixes are re-planned only after clearance.

## Phase 3: Evidence and documentation

### Affected Files

- `docs/validation/source-discovery-tranche-2-candidate.md` - live schema findings (LD2-LD5), coverage measurement method and results, labelled synthetic versus live
- `HELP.md` - Himalayas desktop-only availability and attribution; no WWR availability claim
- `docs/FEATURE_INDEX.md` - FX016 evidence column adds `tests/himalayas-discovery.test.cjs`
- `docs/GOVERNANCE_INDEX.md` - Tier 4 row points at this plan

### Unit Tests

- `tests/e2e/source-discovery.spec.ts` - the Electron flow shows an attributed "Found via Himalayas" result whose `Open opportunity` link targets `himalayas.app`, and approving monitoring is not offered for it (existing candidate test, must pass).

## Feature Inventory Touches

| entry_id | operation | test_path | test_descriptor |
| --- | --- | --- | --- |
| FX016 | MODIFIED | tests/himalayas-discovery.test.cjs | discoverPublicJobFeeds with a Himalayas fixture returns an attributed, non-monitorable candidate whose location carries country and UTC restrictions and whose publishedAt is the seconds-epoch instant |
| FX016 | MODIFIED | tests/e2e/source-discovery.spec.ts | Electron UI renders "Found via Himalayas" with an Open opportunity link to himalayas.app and no monitor approval for that row |

## Definition of Done

### Deliverable: Himalayas provider (Phase 1)

- **D1**: Desktop discovery adds attributed Himalayas opportunities with truthful date and eligibility, and degrades explicitly on web and on failure.
- **D2**: `normalizeHimalayasResponse(raw: unknown): HimalayasNormalizedJob[]` in `electron/src/himalayas-discovery.cts`; `himalayasLocation` in `electron/src/source-discovery.cts`; no change to `src/shared/source-discovery.ts`.
- **D3**: META_LEDGER PLAN, GATE, IMPLEMENT and SEAL entries for Phase 17; an intent lock captured before the new source edits; the GOVERNANCE_INDEX row updated.
- **D4**: `node tests/himalayas-discovery.test.cjs` passes twice; the new LD2-LD4 assertions failed (red) before the source change; `npm run test:e2e` passes the Himalayas spec.

### Deliverable: WWR disposition (Phase 2)

- **D1**: HOLD recorded with both quoted sources and the technical qualification evidence.
- **D2**: none (no code authorized).
- **D3**: The HOLD is stated in issue #136 and PR #238; PR #238 stays draft.
- **D4.d**: No runtime verification applies; the slice is not authorized. **Follow-up phase**: re-plan after written WWR clarification.

## CI Commands

- `npm run typecheck` - TypeScript (web and electron)
- `node tests/himalayas-discovery.test.cjs` - provider contract (run twice)
- `node tests/source-discovery-provider.test.cjs` - existing provider isolation and approval
- `npm run repo:health` - typecheck, builds and the full `npm test` suite
- `npm run test:pwa:e2e` - web runtime, including the Himalayas skip warning
- `npm run test:e2e` - Electron E2E, including the source-discovery spec
- `npm run test:release-upgrade` - release upgrade verification
- `qor-logic-plus scripts prompt_injection_canaries --files docs/ARCHITECTURE_PLAN.md docs/META_LEDGER.md docs/CONCEPT.md docs/plan-qor-phase17-provider-tranche.md` - governance canaries
- `qor-logic-plus verify-ledger` - ledger chain

## CI Coverage Exemptions

- `python scripts/generate-resume-parser-fixtures.py` - resume-parser benchmark workflows; unaffected by discovery providers
