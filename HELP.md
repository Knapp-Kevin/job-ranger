# Job Ranger Help

Job Ranger is a local-first desktop application for finding, monitoring, understanding, and tracking job opportunities. This guide is written for people using the app, not just people building it.

## Quick Start

### 1. Install Job Ranger

Use the latest published build from the repository's **Releases** page.

Current v1.1.1 release options include:

- Windows x64 installer
- macOS Apple Silicon (arm64) DMG or ZIP
- macOS Intel (x64) DMG or ZIP

There is no supported packaged Linux release at this time.

Windows users do **not** need to install SQLite separately. The v1.1.1 Windows package includes the SQLite runtime Job Ranger uses.

### 2. Set up your Career Profile

Open **Career Profile** and add the information that is true for you:

- target job titles;
- home area and commute preference;
- minimum pay;
- skills you already use;
- certifications and licenses you actually hold;
- work/sector preferences.

The HVAC starter can add common HVAC target titles. It does **not** add certifications, licenses, or experience on your behalf.

Career Profile is stored locally on this device. Job Ranger uses it to produce deterministic fit guidance without requiring an AI provider.

### 3. Add employers or job sources

1. Open **Companies**.
2. Select **Add source**.
3. Enter the employer name.
4. Paste the employer's careers-page URL.
5. Choose the polling frequency.
6. Save the source.

Job Ranger still expects the user to supply career pages in v1.1.1. Consumer-friendly source discovery is planned work.

### 4. Find and review jobs

Run a scrape from the company/source workflow or allow Job Ranger's configured schedule to check the source.

Open **Find Jobs** to review locally stored results. When a Career Profile is configured, listings can show:

- a deterministic fit score;
- plain-language reasons the listing may fit;
- items worth checking before applying;
- evidence such as title, location, pay, skills, or credentials that Job Ranger can actually see.

The score is guidance, not a hiring prediction. If a posting omits important information, Job Ranger should expose that uncertainty instead of inventing an answer.

### 5. Track applications

Choose **Track this job** on a listing you want to follow, then open **Applications**.

Available statuses are:

- Interested
- Applied
- Interview
- Offer
- Rejected
- Withdrawn

You can also keep free-form notes for contacts, dates, follow-ups, and other context.

Job Ranger does not submit applications for you.

### 6. Reduce noise

Open **Filters** to configure criteria such as:

- title terms;
- keywords;
- locations;
- minimum salary.

### 7. Configure background behavior

Open **Settings** to control:

- scrape concurrency;
- scrape timeout;
- retries and cooldowns;
- desktop notifications;
- minimize-to-tray behavior;
- functional themes.

## What the Source Labels Mean

Job Ranger does not claim every careers site works equally well.

### Supported

A structured adapter exists and is the preferred retrieval path.

Current supported adapter families:

- Greenhouse
- Lever
- SmartRecruiters
- Ashby

### Detected

Job Ranger recognizes the portal and can attempt a generic or browser-backed extraction path. Results may depend on the specific site's structure.

Examples include:

- Workday
- iCIMS
- BambooHR
- Taleo
- Oracle Careers
- generic career pages

### Browser required

The source requires a rendered browser path rather than a simple structured/API retrieval.

### Manual review

Job Ranger does not currently claim a reliable automated extraction path. This is preferable to quietly reporting a successful scrape that found nothing.

## Where Job Ranger Stores Data

Job Ranger is local first.

SQLite-backed desktop storage currently owns:

- companies and career sources;
- jobs;
- filters;
- settings;
- scrape history.

Career Profile and Applications are also local, but in the v1.1.x line they are stored in renderer-local storage rather than the SQLite backend. Moving those domains behind the same durable backend boundary is planned work.

Use **Help → Open Job Ranger Data Folder** for the desktop backend data folder. The Settings page also exposes backend facts including the database path and resolved SQLite binary.

## Troubleshooting

### The app opens but I do not see jobs

Check:

1. The URL points to a real careers or jobs page.
2. The source is active.
3. The latest scrape run did not fail.
4. The source support label is not `manual-review`.
5. Your filters are not excluding the results you expected to see.

Some dynamic career portals can change underneath Job Ranger. A detected source is not the same thing as a guaranteed structured adapter.

### Fit guidance is missing

Open **Career Profile** and make sure you have saved at least some target-role, location, or experience information. Fit guidance only appears when Job Ranger has profile evidence to compare with a listing.

### A fit score seems too high or too low

The current scorer is deterministic and intentionally simple. It uses the information in your Career Profile plus the job fields Job Ranger has collected. It does not secretly infer missing experience or read the employer's mind, a feature humanity has thankfully not implemented yet.

Treat the score as triage guidance. Review the actual posting before making a career decision.

### Job Ranger says a source is unsupported

That means the app could not identify a reliable extraction path. It is an intentional reliability state, not a disguised success.

### Notifications are not appearing

Confirm:

- desktop notifications are enabled in Job Ranger;
- the notification subtype you want is enabled;
- your operating system allows notifications from Job Ranger.

### Closing the window exits the app

Enable **Minimize to system tray on close** in Settings if you want Job Ranger to remain available in the tray.

### Windows reports that SQLite is missing

Published v1.1.1 Windows installers include Job Ranger's SQLite runtime. If a packaged v1.1.1 installation still reports that `sqlite3.exe` is missing, treat that as a release defect and report the exact version and installation path.

Developers running from source still need a host `sqlite3` executable on `PATH` or an explicit `SQLITE3_PATH`.

### macOS warns about the application

Signing/notarization depends on the credentials available when a release is built. If macOS blocks an otherwise trusted release build, Finder's **Open** action can expose the operating system's manual override flow.

Do not bypass platform security warnings for a file you did not obtain from a source you trust.

## Privacy and AI

Job Ranger v1.1.1 does not require an AI provider or hosted Job Ranger account. Search state and the current Career Intelligence workflow are local-first.

Network access is used to retrieve the career pages and job sources you ask Job Ranger to check.

Optional inference is a future enhancement path for richer explanation, resume, interview, and transferable-skill support. Remote inference must not silently receive personal career data, and the application should retain deterministic functionality without it.

## Frequently Asked Questions

### Does Job Ranger auto-apply for me?

No. Job Ranger helps discover, review, and track opportunities. Autonomous mass application is not a current product goal.

### Does Job Ranger invent qualifications to improve my match score?

No. Career Profile intentionally relies on information the user supplies. The HVAC starter adds target job titles only and does not fabricate certifications or skills.

### Does Job Ranger upload my search history to a hosted account?

No hosted account is required in the current product.

### Is Job Ranger cross-platform?

Published v1.1.1 builds are provided for Windows x64 and macOS x64/arm64. Linux is not currently a supported packaged release.

### Is every Workday/iCIMS/etc. careers page guaranteed to work?

No. Those sources can vary and change. Job Ranger exposes support levels specifically to avoid making that claim.

## Developer Appendix

### Requirements

- Node.js `>=22.12.0`
- npm
- `sqlite3` on `PATH`, or `SQLITE3_PATH` set explicitly

The SQLite prerequisite above is for source/development runs. Published Windows installers bundle a pinned, verified SQLite CLI. The current desktop/toolchain baseline includes Electron 44.4.5, Vite 8, and TypeScript 7.

### Common commands

```bash
npm ci
npm run repo:health
npm run electron:dev
npm run test:unit
npm run test:e2e
npm run electron:build:win
npm run electron:build:mac
```

For architecture and contribution guidance, see:

- [README.md](./README.md)
- [docs/README.md](./docs/README.md)
- [docs/ARCHITECTURE_PLAN.md](./docs/ARCHITECTURE_PLAN.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)
