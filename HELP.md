# Job Ranger Help

Job Ranger is a local-first desktop application for discovering, evaluating, preparing for, and tracking job opportunities.

This guide distinguishes between the **published release** and the newer functionality already implemented on `main`.

## Which version am I using?

The latest published installers are currently **v1.1.2** for:

- Windows x64;
- macOS Apple Silicon (arm64);
- macOS Intel (x64).

There is no supported packaged Linux release at this time.

`main` contains a much newer workflow than v1.1.2. If you are running a development build from `main`, the additional sections below apply to you. If you downloaded v1.1.2 from Releases, use the published-release notes where behavior differs.

## Published v1.1.2 quick start

1. Open **Career Profile** and enter target roles, location, compensation, and work preferences.
2. Open **Companies** and add employer career pages to monitor.
3. Run a scrape or allow scheduled checks.
4. Open **Find Jobs** to review locally stored opportunities and deterministic fit guidance.
5. Choose **Track this job** for an opportunity worth following.
6. Use **Applications** for Interested, Applied, Interview, Offer, Rejected, or Withdrawn status and notes.
7. Use **Filters** to reduce noise.
8. Use **Settings** for notifications, scraping behavior, themes, and tray behavior.

The v1.1.2 Windows installer includes Job Ranger's SQLite runtime. Normal users do not need to install SQLite separately.

## Current `main` workflow

Current `main` expands Job Ranger into an end-to-end job-search workspace while keeping Career Evidence and application history local.

### 1. First-run onboarding

New users can begin in several ways:

- **Resume first** — import an existing resume and review extracted Career Evidence.
- **No resume** — enter Career Evidence directly without first building a traditional resume.
- **Goal first** — define what kind of work you want and begin using Job Ranger before your career record is complete.

Partial setup remains valid. Job Ranger should not require a person to complete a tax-form-sized profile before seeing value.

### 2. Target Tracks

Open **Target Tracks** to keep separate job-search directions.

A track can represent a different role family, employment arrangement, geography, work mode, schedule, or compensation expectation.

Where supported, choices preserve their meaning as:

- **Required** — a hard constraint;
- **Preferred** — meaningful but not automatically disqualifying;
- **Target** — an aspiration or desired value rather than a minimum.

This prevents unrelated search directions from being blended into one profile.

### 3. Career Evidence

Career Evidence is Job Ranger's factual career record.

Evidence can come from:

- imported resume documents;
- direct user entry;
- employment history;
- skills;
- education;
- projects;
- achievements;
- credentials/licenses;
- publications;
- volunteer or other nontraditional work;
- portfolio/work-sample references.

Imported evidence begins as a proposal. Only evidence you confirm or author directly may support factual application claims.

Evidence can be corrected, rejected, merged, or superseded without erasing the history of what changed.

### 4. Resume import

Current `main` supports:

- DOCX;
- text-bearing PDF;
- plain text;
- pasted text.

Original source artifacts are preserved before interpretation. Job Ranger hashes imported artifacts, records parser identity/version, and keeps extraction/provenance history.

Image-only/scanned documents surface an explicit **OCR required** state. Job Ranger does not silently upload them to a hosted OCR service.

### 5. Companies and source discovery

Open **Companies** to:

- add employer career sources manually;
- discover opportunities from the currently configured discovery providers;
- review discovery provenance/support information;
- explicitly approve a discovered employer source before Job Ranger begins monitoring it.

Discovery and monitoring are intentionally separate. Finding a job at an employer does not silently convert that employer into a trusted monitored source.

Current discovery provider coverage is partial. Manual source entry remains important.

### 6. Find Jobs and opportunity assessment

Current `main` no longer treats one percentage as universal truth about fit.

For a selected Target Track, Job Ranger can separate:

- **Eligibility** — whether known hard requirements appear satisfied, blocked, or unclear;
- **Evidence coverage** — direct, transferable, ambiguous, and unsupported requirements;
- **Career alignment** — how the role relates to the selected search direction;
- **Preference alignment** — location, work mode, compensation, schedule, and other known preferences;
- **Blockers** — known hard conflicts;
- **Unknowns** — important information the listing did not provide or Job Ranger could not reliably interpret.

Requirement analysis only reasons over job text Job Ranger actually collected. An absent requirement may reflect incomplete source ingestion rather than proof that the employer does not require it.

### 7. Resume workspace

Current `main` can create a deterministic resume from confirmed Career Evidence.

The resume workflow includes:

- ATS-oriented standard and compact templates;
- target-job evidence selection;
- deterministic target-specific tailoring;
- factual statement → Career Evidence linkage;
- a **Truth Gate** that blocks unsupported factual claims;
- isolated Chromium PDF rendering;
- PDF reparse and **Parseability Gate**;
- versioned immutable artifacts;
- version comparison;
- exact application-artifact linkage for submitted resumes.

A tailored resume may emphasize or translate supported evidence. It may not invent experience merely because a job description uses desirable words.

### 8. Applications

Applications now own a richer lifecycle than status + notes.

For each application, Job Ranger can preserve:

- lifecycle status;
- notes;
- the exact submitted resume artifact;
- contacts;
- interviews and other milestones;
- deadlines and follow-up events;
- reminders;
- target-track association;
- offer and negotiation state;
- prepared application materials.

Job Ranger does not submit applications for you.

### 9. Interview preparation

Interview preparation is grounded in:

- the tracked job;
- confirmed Career Evidence;
- requirement/evidence mappings;
- the exact resume Job Ranger recorded as submitted.

The UI can distinguish:

- evidence the employer already saw;
- confirmed evidence that was not on the submitted resume;
- changed/superseded evidence where the employer saw an older claim;
- real gaps that need an honest explanation.

Job Ranger does not fabricate STAR stories or pretend a gap is direct experience.

### 10. Career Stories

**Career Stories** provides a reusable evidence-linked place to prepare examples for interviews and applications.

Stories remain linked to Career Evidence so later factual corrections can be detected rather than silently leaving stale narratives behind.

### 11. Application materials

Current `main` can prepare evidence-grounded application-material projections such as a deterministic cover-letter draft.

Historical drafts remain versioned. If supporting Career Evidence later changes, the old material is marked stale instead of being quietly presented as current truth.

### 12. Search Insights

**Search Insights** summarizes observed search state such as:

- applications by target track;
- source and status patterns;
- interview/offer outcomes;
- recurring unsupported requirements;
- evidence-based strategy signals when there is enough saved data to justify them.

These are observations, not causal claims. Job Ranger should not tell you that a source or resume "caused" an interview merely because the numbers happen to line up.

### 13. Backup and restore

Settings on current `main` include a versioned Job Ranger backup workflow.

Backups include structured SQLite state and managed artifacts with integrity metadata. Restore is staged and verified before replacing live data. Managed artifact paths are rebased when restoring into a different Job Ranger data root.

A backup is preferable to discovering the philosophical meaning of "local-first" after a disk failure.

### 14. JSON Resume interoperability

Settings also expose JSON Resume import/export as a portability adapter.

- Import creates proposed/imported evidence that still requires user authority.
- Export projects only supported current Career Evidence into compatible standard fields.
- JSON Resume is not Job Ranger's canonical data model.

## Source-support labels

### Supported

A structured adapter exists and is the preferred acquisition path.

Current structured families:

- Greenhouse;
- Lever;
- SmartRecruiters;
- Ashby.

### Detected

Job Ranger recognizes the portal and can attempt generic or browser-backed extraction. Reliability varies by site implementation.

Examples include Workday, iCIMS, BambooHR, Taleo, Oracle Careers, and generic career pages.

### Browser required

A rendered browser path is required instead of a simple structured/API retrieval.

### Manual review

Job Ranger does not claim a reliable automated path. This is preferable to reporting success while finding nothing.

## Privacy and data storage

Job Ranger is local first.

Current `main` keeps structured product state behind the Electron/SQLite boundary, including:

- companies and sources;
- jobs and scrape history;
- filters and settings;
- Career Profile;
- Target Tracks;
- Applications;
- Career Evidence and provenance;
- requirements and mappings;
- resume projections/artifacts;
- lifecycle contacts/events/offers;
- Career Stories;
- application materials and insights metadata.

Managed source/resume artifacts are stored in Job Ranger's local data/artifact directory rather than uploaded to a hosted Job Ranger account.

Network access is used for job/source retrieval and optional discovery providers. Job Ranger does not currently require a remote inference provider.

## Troubleshooting

### I do not see jobs

Check:

1. the source URL points to a real careers/jobs page;
2. the source is active;
3. the latest scrape did not fail;
4. the source support state is not `manual-review`;
5. filters are not excluding the results;
6. a dynamic portal has not changed underneath the browser/extraction path.

A detected source is not the same thing as a guaranteed structured adapter.

### Job Ranger found no requirements for a job

That does not prove the employer has no requirements. It means Job Ranger did not extract any from the job text available to it.

Review the original posting before making an application decision.

### Eligibility says Unclear

This usually means Job Ranger is missing either:

- a required fact from the posting;
- sufficient confirmed Career Evidence;
- a clear interpretation of the available text.

Unknown is intentionally different from mismatch.

### Imported resume evidence is not being used

Imported evidence is not factual authority until you review and confirm it. Open the relevant Career Evidence review workflow and accept, edit, merge, or reject the proposal.

### A credential is not supporting a job

Check its structured state. An expired, inactive, or pending credential does not qualify merely because its name matches the posting.

### An old application material or Career Story is marked stale

One or more supporting Career Evidence records changed after the material/story was prepared. Review the current evidence and create/update the material rather than assuming the old wording is still factual.

### A source is unsupported or blocked

That is an intentional reliability/security state. Automated acquisition rejects unsafe/private-network destinations and does not blindly follow redirects into local address space.

### Notifications are not appearing

Confirm:

- notifications are enabled in Job Ranger;
- the specific notification type is enabled;
- the operating system allows notifications from Job Ranger.

### Closing the window exits the app

Enable **Minimize to system tray on close** in Settings if you want Job Ranger to remain available in the tray.

### Windows says SQLite is missing

Published v1.1.2 Windows installers include a bundled SQLite runtime. If a packaged installation reports it missing, report the exact Job Ranger version and installation path.

Developers running from source still need `sqlite3` on `PATH` or `SQLITE3_PATH` set explicitly.

### macOS warns about the application

Signing/notarization depends on credentials available to the release environment. Do not bypass platform security warnings for a file you did not obtain from a source you trust.

## Frequently asked questions

### Does Job Ranger auto-apply for me?

No. Autonomous mass application is an explicit non-goal under current product governance.

### Does Job Ranger invent qualifications?

No. Only confirmed/user-authored Career Evidence may support factual application claims.

### Does Job Ranger upload my career/search history to a hosted account?

No hosted Job Ranger account is required by the current product.

### Does Job Ranger use AI?

Core functionality does not require remote inference. A future optional inference adapter may be evaluated, but personal career data must never be transmitted silently.

### Can Job Ranger read scanned/image-only resumes?

Not currently. Those imports surface an OCR-required state. OCR is intentionally deferred rather than hidden behind an undisclosed upload.

### Can Job Ranger export DOCX resumes?

Not currently. PDF is the governed resume output. DOCX remains deferred until actual user demand justifies another rendering/compatibility path.

### Is every Workday/iCIMS/etc. source guaranteed to work?

No. Dynamic third-party portals vary and change. Job Ranger exposes support/reliability states specifically to avoid promising otherwise.

### Is Linux supported?

No packaged Linux release is currently supported.

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

Job Ranger deliberately preserves GitHub Actions budget. Some documentation/release-readiness work is validated manually by the maintainer rather than through hosted Actions. Validation evidence should state exactly what was run.

For current architecture and release rules, see:

- [README.md](./README.md)
- [docs/README.md](./docs/README.md)
- [docs/SYSTEM_STATE.md](./docs/SYSTEM_STATE.md)
- [docs/ARCHITECTURE_PLAN.md](./docs/ARCHITECTURE_PLAN.md)
- [docs/RELEASE_READINESS.md](./docs/RELEASE_READINESS.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)
