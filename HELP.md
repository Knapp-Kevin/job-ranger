# Job Ranger Help

Job Ranger is a local-first desktop application for discovering, evaluating, preparing for, and tracking job opportunities.

This guide distinguishes the **stable published release** from the newer v1.2.0 packaged candidate.

## Which version am I using?

The latest stable public installers are currently **v1.1.2** for:

- Windows x64;
- macOS Apple Silicon (arm64);
- macOS Intel (x64).

There is no supported packaged Linux release at this time.

The validated v1.2.0 packaged candidate is **v1.2.0-rc.3**. It contains a much broader Career Ops workflow but remains a tester prerelease until packaged consumer smoke and real platform signing/notarization evidence are complete.

## Stable v1.1.2 quick start

1. Open **Career Profile** and enter target roles, location, compensation, and work preferences.
2. Open **Companies** and add employer career pages to monitor.
3. Run a scrape or allow scheduled checks.
4. Open **Find Jobs** to review locally stored opportunities and deterministic fit guidance.
5. Choose **Track this job** for an opportunity worth following.
6. Use **Applications** for status and notes.
7. Use **Filters** to reduce noise.
8. Use **Settings** for notifications, scraping behavior, themes, and tray behavior.

The v1.1.2 Windows installer includes Job Ranger's SQLite runtime.

## v1.2.0 candidate workflow

### 1. First-run onboarding

New users can begin in several ways:

- **Resume first** — import an existing resume and review extracted Career Evidence.
- **No resume** — enter Career Evidence directly.
- **Goal first** — define the type of work you want before your career record is complete.

Partial setup remains valid.

### 2. Target Tracks

Use **Target Tracks** to keep separate job-search directions.

Where supported, choices preserve their meaning as:

- **Required** — hard constraint;
- **Preferred** — meaningful but not automatically disqualifying;
- **Target** — desired or aspirational value.

### 3. Career Evidence

Career Evidence is Job Ranger's factual career record.

Evidence can include employment, skills, education, projects, achievements, credentials/licenses, publications, volunteer/nontraditional work, and portfolio/work-sample references.

Imported evidence begins as a proposal. Only evidence you confirm or author directly may support factual application claims.

Evidence can be corrected, rejected, merged, or superseded without erasing history.

### 4. Resume import

The v1.2.0 candidate supports:

- DOCX;
- text-bearing PDF;
- plain text;
- pasted text.

Original source artifacts are preserved before interpretation. Job Ranger records hashes, parser metadata, extraction history, and duplicate state.

Image-only/scanned documents surface **OCR required** rather than silently uploading them to a hosted OCR service.

### 5. Companies and source discovery

Use **Companies** to:

- add recognized employer career sources manually;
- discover opportunities from configured discovery providers;
- review provenance/support information;
- explicitly approve a discovered employer source before monitoring.

Discovery and monitoring remain separate. Finding a job at an employer does not silently convert the employer into a trusted monitored source.

Arbitrary generic career-site hostnames remain manual-review/non-runnable in v1.2.0.

### 6. Source snapshots and diagnostics

v1.2.0 preserves canonical collected job-source snapshots with retrieval metadata, hashes, completeness state, and change history. Requirement analysis reasons over preserved source text rather than only a short listing snippet.

Acquisition outcomes distinguish states such as:

- success;
- success with zero jobs;
- cooldown/circuit state;
- unsupported source;
- browser unavailable;
- network-policy rejection;
- access denied;
- rate limiting;
- timeout/retrieval failure;
- extraction/parser failure.

This prevents “zero jobs” from pretending every source run succeeded normally.

### 7. Opportunity assessment

For a selected Target Track, Job Ranger separates:

- **Eligibility**;
- **Evidence coverage**;
- **Career alignment**;
- **Preference alignment**;
- **Blockers**;
- **Unknowns**.

Unknown information remains unknown instead of being converted into fake precision.

### 8. Resume workspace

The candidate can create a deterministic resume from confirmed Career Evidence with:

- ATS-oriented templates;
- target-job evidence selection;
- deterministic tailoring;
- evidence links;
- Truth Gate;
- isolated Chromium PDF rendering;
- Parseability Gate;
- versioned immutable artifacts;
- exact application-artifact linkage.

A tailored resume may emphasize supported evidence. It may not invent experience.

### 9. Applications

Applications can preserve:

- lifecycle status;
- notes;
- exact submitted resume artifact;
- contacts;
- interviews/milestones;
- deadlines/follow-up events;
- reminders;
- target-track association;
- offer/negotiation state;
- prepared application materials.

Job Ranger does not submit applications for you.

### 10. Interview preparation

Interview preparation is grounded in the tracked job, confirmed Career Evidence, requirement/evidence mappings, and the exact resume Job Ranger recorded as submitted.

It distinguishes what the employer saw, additional confirmed evidence, later-corrected evidence, and real gaps.

### 11. Career Stories

Career Stories provide reusable evidence-linked narratives for interviews/application preparation. Later factual changes can make older stories visibly stale.

### 12. Application materials

The candidate can prepare versioned evidence-grounded application materials. If supporting Career Evidence changes, prior drafts remain historical and are marked stale rather than silently rewritten.

### 13. Search Insights

Search Insights summarizes observed search state such as applications by Target Track/source/status, interview/offer outcomes, recurring unsupported requirements, and evidence-based strategy signals above bounded sample thresholds.

These are observations, not causal hiring claims. Raw application count is not treated as success.

### 14. Backup and restore

v1.2.0 provides versioned local backup/restore with:

- SQLite snapshot;
- managed artifacts;
- integrity hashes;
- staged restore;
- path rebasing when restored to another data root;
- rollback preservation until the restored state is validated.

### 15. JSON Resume interoperability

JSON Resume import/export is a portability adapter, not Job Ranger's canonical data model.

Imported JSON Resume facts still require user authority before becoming factual Career Evidence.

## Source-support labels

### Supported

A structured adapter exists and is the preferred acquisition path.

Current structured families:

- Greenhouse;
- Lever;
- SmartRecruiters;
- Ashby.

### Detected

Job Ranger recognizes a known provider/vendor portal and can attempt its governed extraction path. Reliability varies by site implementation.

Examples include Workday, iCIMS, BambooHR, Taleo, Oracle Careers, and Microsoft Careers.

### Browser required

A recognized portal requires the constrained rendered-browser path.

### Manual review

Job Ranger does not claim a reliable automated path. Arbitrary generic career-site hostnames remain manual review in v1.2.0.

## Acquisition security

v1.2.0 uses connection-level anti-rebinding protection for governed automated acquisition.

Policy resolution produces the exact approved public address set. Direct sockets connect only to approved addresses while TLS continues to verify the original hostname. Redirects are independently approved/pinned, and isolated browser HTTP/HTTPS document/subresource requests are routed through the governed transport.

Do not treat a source's ability to open in your normal browser as proof that Job Ranger should automatically retrieve it.

## Privacy and data storage

Job Ranger is local first.

The v1.2.0 candidate keeps structured career/search state behind the Electron/SQLite boundary, including Career Profile, Target Tracks, Applications, Career Evidence/provenance, job source snapshots, requirements/mappings, resumes, lifecycle records, Career Stories, application materials, and insights state.

Managed source/resume artifacts are stored in Job Ranger's local data/artifact directory rather than uploaded to a hosted Job Ranger account.

Core functionality does not require a remote inference provider.

## Testing v1.2.0-rc.3

rc.3 is a tester prerelease, not the stable public release.

Before running a prerelease artifact, verify its platform SHA-256 file and release manifest from the same GitHub Release.

### Windows 11

An unsigned tester build may be allowed through an OS-native SmartScreen per-file flow on some systems. If Smart App Control blocks the app or Windows provides no safe per-file/per-app override, stop. The unsigned prerelease is not supported on that configuration.

Do not disable Smart App Control, SmartScreen, or Defender globally merely to run Job Ranger.

### macOS

After verifying the checksum, attempt to open Job Ranger normally. If macOS blocks the unnotarized tester build and offers **System Settings → Privacy & Security → Open Anyway**, an informed tester may use that bounded exception.

Do not disable Gatekeeper globally or recursively strip quarantine metadata.

See [`docs/TESTER_INSTALLATION.md`](./docs/TESTER_INSTALLATION.md) and [`docs/DISTRIBUTION_TRUST.md`](./docs/DISTRIBUTION_TRUST.md).

## Troubleshooting

### I do not see jobs

Check:

1. the source URL points to a real careers/jobs page;
2. the source is active;
3. the latest acquisition status/diagnostic;
4. the source support state is not `manual-review`;
5. filters are not excluding results;
6. the third-party portal has not changed underneath its extraction path.

### Job Ranger found no requirements for a job

That does not prove the employer has no requirements. Review the preserved source snapshot and original posting; missing/partial source content remains an explicit uncertainty.

### Eligibility says Unclear

Job Ranger is missing a required fact, sufficient confirmed Career Evidence, or a clear interpretation. Unknown is intentionally different from mismatch.

### Imported resume evidence is not being used

Imported evidence is not factual authority until you review and confirm it.

### A credential is not supporting a job

Check its structured state. Expired, inactive, or pending credentials do not qualify merely because the name matches.

### An old application material or Career Story is marked stale

Supporting Career Evidence changed after the material/story was prepared. Review current evidence rather than assuming old wording is still factual.

### A source is unsupported or blocked

That is an intentional reliability/security state. Review the user-facing diagnostic and source support classification rather than trying to bypass acquisition policy.

### Notifications are not appearing

Confirm notifications are enabled in Job Ranger and allowed by the operating system.

### Closing the window exits the app

Enable **Minimize to system tray on close** in Settings if you want Job Ranger to remain available in the tray.

### Windows says SQLite is missing

Stable v1.1.2 Windows installers and v1.2.0 Windows candidates bundle the SQLite runtime. Developers running from source still need `sqlite3` on `PATH` or `SQLITE3_PATH` set explicitly.

### macOS warns about the application

Stable public v1.2.0 is intended to require Developer ID signing/notarization. rc.3 may remain unsigned for tester use; follow only the bounded tester guidance above.

## Frequently asked questions

### Does Job Ranger auto-apply for me?

No. Autonomous mass application submission is an explicit non-goal.

### Does Job Ranger invent qualifications or networking relationships?

No. Career claims require confirmed/user-authored Career Evidence, and the product design prohibits invented relationships/referrals/familiarity.

### Does Job Ranger upload my career/search history to a hosted account?

No hosted Job Ranger account is required by the current product.

### Does Job Ranger use AI?

Core functionality does not require remote inference. Any future optional external provider must be explicit and governed.

### Can Job Ranger read scanned/image-only resumes?

Not currently. Those imports surface an OCR-required state.

### Can Job Ranger export DOCX resumes?

Not currently. PDF is the governed resume output.

### Is every recognized dynamic careers site guaranteed to work?

No. Third-party portals vary and change. Job Ranger exposes support and reliability states specifically to avoid promising otherwise.

### Why is a generic employer career page marked manual review?

v1.2.0 deliberately automates recognized/governed source families rather than treating every arbitrary careers-looking hostname as an acceptable privileged acquisition target.

### Is Linux supported?

No. Linux packaging was evaluated and deferred until real user demand justifies the additional support surface.

## Developer appendix

### Requirements

- Node.js `>=22.12.0`;
- npm;
- `sqlite3` on `PATH`, or `SQLITE3_PATH` explicitly set.

### Common commands

```bash
npm ci
npm run repo:health
npm run test:unit
npm run test:e2e
npm run electron:dev
npm run electron:build:win
npm run electron:build:mac
```

For current architecture and release rules, see:

- [README.md](./README.md)
- [docs/SYSTEM_STATE.md](./docs/SYSTEM_STATE.md)
- [docs/ARCHITECTURE_PLAN.md](./docs/ARCHITECTURE_PLAN.md)
- [docs/RELEASE_READINESS.md](./docs/RELEASE_READINESS.md)
- [docs/DISTRIBUTION_TRUST.md](./docs/DISTRIBUTION_TRUST.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)
