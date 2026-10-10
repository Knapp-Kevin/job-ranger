# Governed Plan: Public Discovery Provider Tranche #136

**Status:** PLAN PREPARED / NOT RECORDED / INDEPENDENT AUDIT PENDING  
**Class:** material discovery-provider change; no new submission or monitoring authority  
**Baseline:** `main` at `ebfd7c9abb0468bf8aef01442781ecfd60f5477a`  
**Work item:** [#136](https://github.com/MythologIQ-Labs-LLC/job-ranger/issues/136)  
**Governance:** Qortara PLAN → independently audited PASS → IMPLEMENT (red tests first) → VERIFY → SUBSTANTIATE/SEAL. No plan-gate or audit outcome is implied by this file.

## Open questions before promotion

1. The installed Qortara CLI and runtime are not accessible in the current environment. Check `qortara status`, run plan checks and record the exact plan under the authorized runtime before claiming Qortara-governed implementation.
2. **PWA CORS:** Himalayas says its public JSON endpoints do not return `Access-Control-Allow-Origin` and may only be called from a backend/build step. Job Ranger's web runtime is local-first and does not have a general discovery gateway. Do not add an invisible proxy or credentials. First tranche may be desktop-supported while web explicitly degrades to an honest source-unavailable warning; independent review must decide whether that is acceptable before promotion.
3. **We Work Remotely RSS:** its public RSS page says feeds may be used with attribution, but its separate API terms expressly prohibit building a job-search service using WWR API data, and direct applying may not bypass WWR. Whether those API terms also constrain the public RSS feed is not established. **Publisher/terms clearance is a blocking prerequisite for release.** Independently qualify a strict RSS parser and browser cross-origin behavior; do not scrape, proxy, or substitute an authenticated API.
4. Real-world **unique relevant opportunity coverage** over the frozen universal career fixtures has not yet been measured. Do not claim #136 complete solely because providers return data.

## Verified public-provider references (2026-10-09)

- Himalayas API and attribution: https://himalayas.app/docs/remote-jobs-api and https://himalayas.app/api . Public/no-key `GET /jobs/api/search?q=...&sort=recent&page=1`; source attribution and backlink required; no reposting to third-party job aggregators. Cached daily, rate-limited (429). Explicit **no CORS for browser JavaScript**.
- Himalayas machine-readable schema: https://himalayas.app/docs/openapi.json . `jobs[]` includes `title`, `companyName`, `companySlug`, `applicationLink`, `guid`, `locationRestrictions` and `timezoneRestrictions`; `pubDate` can be a millisecond epoch value in the advertised schema. Treat undefined versus empty restrictions carefully.
- We Work Remotely official RSS and attribution: https://weworkremotely.com/remote-job-rss-feed and `https://weworkremotely.com/remote-jobs.rss`. Category feeds are official. The listing-posting API is separate and requires a partnership. Separate API usage restrictions: https://weworkremotely.com/api-terms-and-guidelines ; the interaction of those restrictions with the public RSS grant remains unresolved.

## Grounded current repository boundary

- `src/shared/source-discovery.ts:3` defines one `public-job-feeds` discovery ID, bounded request/result and per-candidate provider metadata. Keep its wire schema backward-compatible.
- `electron/src/source-discovery-provider.cts:9` provides `SourceDiscoveryProvider` and delegates public-feed discovery into `electron/src/source-discovery.cts`.
- `electron/src/source-discovery.cts:318-332` currently fetches Remote OK and Arbeitnow with `Promise.allSettled`, role filters, computes monitorable structured ATS sources and returns `partial` or `unavailable`.
- `electron/src/source-discovery-fetch.cts:6` centralizes redirect checks, URL syntax checks, timeouts and JSON requests. Reuse rather than bypassing the acquisition network boundary.
- `src/pages/Companies.tsx:323-381` already credits each result with `Found via {providerName}` and offers an explicit `Open opportunity`; `Approve & monitor source` is an independent deliberate action.
- `tests/source-discovery-provider.test.cjs:74` exercises provider normalization, monitoring approval and failure isolation. `tests/e2e/source-discovery.spec.ts:111` exercises the UI. New tests must assert actual returned results and failure consequences.

## Goal

Improve deliberate, diverse discovery for user-authored Target Tracks through first-party public APIs and feeds. The system should surface a **small relevant set**, preserve provider attribution and geographic restrictions, avoid silent monitoring, and account for provider failure without treating unavailable data as a market result.

## Scope and phases

### Phase 1: Himalayas search results, behind the public-feed provider

**Red tests (before source edits):**
- Add deterministic `tests/himalayas-discovery.test.cjs` for one matching role, a non-matching job, location-limited and timezone-limited jobs, missing `applicationLink`, invalid URLs, missing/duplicate GUIDs, duplicate results, unsafe apply URL and malformed payloads.
- Use a fake `fetchImpl` and exact asserted `SourceDiscoveryCandidate` fields for attribution, IDs, opportunity URL, source selection and `canMonitor`. Require no network in tests.
- Include per-source failure tests (HTTP 429, browser CORS skip, malformed `jobs` response); verify Remote OK/Arbeitnow results remain available and failures are explicit.
- Saturate the original Remote OK feed with matching jobs and set a short result cap; assert that at least one unique, relevant Himalayas listing still appears. An overall result limit must not systematically starve later providers.
- Run the new tests twice successfully after implementation; capture expected red output before implementing.

**Implementation:**
- Implement small isolated Himalayas normalization and role matching, reusing existing matching/snippet/dedup/security helpers where safe. Wire the actual runtime kind through `electron/src/core-ipc.cts:84` via existing `getRuntimeInfo()` (`electron/src/core-ipc.cts:37`) and the provider context, so unsupported browser requests are skipped rather than silently attempted. The displayed location must disclose geographic eligibility restrictions; no unqualified `Remote worldwide` claims when fields are missing.
- The desktop provider makes at most 3 bounded, role-specific first-page searches, with URL-encoded query values and explicit 429/failure isolation; interleave each source's matching listings deterministically before the result cap to preserve useful diversity; a `nextCursor` from the browse API is **not** applicable to search endpoint pagination.
- Keep `SourceDiscoveryProviderId` and the existing source authority model unchanged. Structured employer monitoring only from separately vetted ATS URLs, via existing detection and user-approval flow; provider links are opportunity-first.
- Include provider name **Himalayas**, link candidates to their credited Himalayas listing, and never publish to third-party job aggregation services.
- No new credentials, sync, cloud proxy or dependency.

### Phase 2: We Work Remotely (independently assessed before enabling)

**Red tests:** deterministic WWR RSS fixture with `Employer: Role` titles, XML CDATA and escaped entities, country-versus-region conflicts, duplicate GUIDs/links, HTML descriptions, invalid nesting, forbidden DTD/entity declarations, oversized feed, cross-host redirects, unsafe links, failure isolation and explicit PWA exclusion pending verified CORS.

**Implementation:** fetch the documented first-party public RSS only once per discovery, with strict size/item caps, manual redirect and publisher host checks, no DTD/entity expansion, no authenticated API. Preserve `We Work Remotely` name and backlink; no direct application URLs, employer monitoring or application submission. Prefer `country` to `region` for eligibility, and do not claim worldwide access from a broad region value alone. On web, fail visibly and omit the fetch unless real cross-origin support is established; no cloud proxy. Do not treat the posting API as a candidate application API. This phase is a release-blocked candidate until publisher terms review clears the usage, even if technical tests pass.

### Phase 3: Evidence, docs and qualification

**Tests:** `npm run repo:health`, `npm run test:pwa:e2e`, `npm run test:e2e`, `npm run test:release-upgrade`, provider-specific fixtures including Windows. Collect exact-head CI; compare de-duplicated unique employer/title/eligibility results on frozen fixtures (Remote OK/Arbeitnow baseline vs. added providers), not volume alone.

**Documentation:** update source discovery design/validation, HELP and feature inventory with supported versus unavailable runtime behavior and attribution. Record browser CORS results without claiming platform parity from an Electron-only test. Record a justified defer/reject if WWR cannot be integrated safely.

## Non-goals and controls

No anonymous browser proxy, CORS bypass, silent monitoring, authenticated scraping, mass-apply, application submission, fabricated geo eligibility, undifferentiated full labor market coverage, automatic resume rewriting or continuous high-frequency polling. Preserve explicit source approval and candidate privacy. Provider data remains third-party evidence, never a developer instruction or confirmed Career Evidence.

## Qortara and verification obligations

Preflight must execute in a real writable checkout:
```bash
qortara status
qortara check plan-citations --plan docs/plans/136-provider-expansion.md
qortara check plan-tests --plan docs/plans/136-provider-expansion.md
qortara check plan-consistency --plan docs/plans/136-provider-expansion.md
qortara gate record plan - <authorized-plan-fields.json>
```

Separate independent auditor must inspect exact plan bytes and record PASS through Qortara, followed by intent lock before implementing an **authorized** change. Existing exploratory candidate branches, if any, are **not** retroactively audited. After implementation, execute all relevant runtime and source validation commands, `qortara check all --record`, `qortara gate verify` and the authorized verification/substantiation seal. Do not merge or release before PASS.
