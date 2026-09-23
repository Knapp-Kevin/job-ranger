# Job Ranger Help

Job Ranger is a local-first desktop application for monitoring job opportunities. This guide is written for people using the app, not just people building it.

## Quick Start

### 1. Install Job Ranger

Use the latest published build from the repository's **Releases** page.

Current v1.0.2 release options include:

- Windows x64 executable
- macOS Apple Silicon (arm64) DMG or ZIP
- macOS Intel (x64) DMG or ZIP

There is no supported packaged Linux release at this time.

### 2. Add an employer

1. Open **Companies**.
2. Select **Add source**.
3. Enter the employer name.
4. Paste the employer's careers-page URL.
5. Choose the polling frequency.
6. Save the source.

### 3. Check for jobs

Run a scrape from the company/source workflow or allow Job Ranger's configured schedule to check the source.

Open **Jobs** to review locally stored results. Mark jobs as seen as you review them.

### 4. Reduce noise

Open **Filters** to configure criteria such as:

- title terms;
- keywords;
- locations;
- minimum salary.

### 5. Configure background behavior

Open **Settings** to control:

- scrape concurrency;
- scrape timeout;
- retries and cooldowns;
- desktop notifications;
- minimize-to-tray behavior.

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

## Troubleshooting

### The app opens but I do not see jobs

Check:

1. The URL points to a real careers or jobs page.
2. The source is active.
3. The latest scrape run did not fail.
4. The source support label is not `manual-review`.
5. Your filters are not excluding the results you expected to see.

Some dynamic career portals can still change underneath Job Ranger. A detected source is not the same thing as a guaranteed structured adapter.

### Job Ranger says a source is unsupported

That means the app could not identify a reliable extraction path. It is an intentional safety/reliability state, not a disguised success.

### Notifications are not appearing

Confirm:

- desktop notifications are enabled in Job Ranger;
- the notification subtype you want is enabled;
- your operating system allows notifications from Job Ranger.

### Closing the window exits the app

Enable **Minimize to system tray on close** in Settings if you want Job Ranger to remain available in the tray.

### Where is my local data?

Use:

**Help → Open Job Ranger Data Folder**

The Settings page also exposes desktop-backend facts including the database path and resolved SQLite binary.

### macOS warns about the application

Signing/notarization depends on the credentials available when a release is built. If macOS blocks an otherwise trusted release build, Finder's **Open** action can expose the operating system's manual override flow.

Do not bypass platform security warnings for a file you did not obtain from a source you trust.

## Privacy

Job Ranger is local first. Search state is stored on your machine. Network access is used to retrieve the career pages and job sources you ask Job Ranger to check.

The current shipped release does not require a Job Ranger cloud account.

## AI and Career Guidance

The v1.0.2 release does not require an AI provider.

Broader Career Profile, fit guidance, and Applications functionality is under active development and is not part of the published v1.0.2 release yet. The product direction is that deterministic job-search functionality remains useful without inference, while optional AI can later improve explanation and preparation features.

## Frequently Asked Questions

### Does Job Ranger auto-apply for me?

No. Job Ranger currently helps discover and review opportunities. Autonomous mass application is not a current product goal.

### Does Job Ranger upload my search history to a hosted account?

No hosted account is required in the current product.

### Is Job Ranger cross-platform?

Published v1.0.2 builds exist for Windows x64 and macOS x64/arm64. Linux is not currently a supported packaged release.

### Is every Workday/iCIMS/etc. careers page guaranteed to work?

No. Those sources can vary and change. Job Ranger exposes support levels specifically to avoid making that claim.

## Developer Appendix

### Requirements

- Node.js `>=20.19.0`
- npm
- `sqlite3` on `PATH`, or `SQLITE3_PATH` set explicitly

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
