# Feature Index

Per `qor/references/doctrine-feature-inventory.md` (ships with the installed Qor-logic-plus skills, not this repo): one row per user-touchable feature, cross-referenced
to the test that proves it works. V1 (2026-10-06) enumerates the user journeys reachable from the
renderer routes in `src/App.tsx` plus the runtime-specific (Electron / web) surfaces.

Status is assigned honestly:

- `verified` — a UI-driven Playwright spec exercises the feature and passed on 2026-10-06
  (`npm run test:e2e`, Windows host).
- `unverified` — no UI-driven test; or the feature is only reached through `window.electronAPI`
  calls in tests; or its only tests currently fail. Every `tests/pwa` spec fails on Windows hosts
  until BACKLOG D1 is fixed, so web-only rows are `unverified` here even where a spec exists.

Surface is the route (or runtime surface) where the feature ships.

| ID | Name | Source-of-truth file:line | Doc citation | Test path | Verification status | Surface |
| --- | --- | --- | --- | --- | --- | --- |
| FX001 | Primary navigation sidebar | src/components/Sidebar.tsx:16 | HELP.md | tests/e2e/app.spec.ts | verified | shell |
| FX002 | Dashboard next-step navigation | src/pages/Dashboard.tsx:162 | HELP.md | tests/e2e/app.spec.ts | verified | / |
| FX003 | Onboarding: start from a resume | src/pages/Onboarding.tsx:226 | docs/design/UNIVERSAL_USER_STORIES.md (US-1) | tests/e2e/onboarding.spec.ts | verified | /onboarding |
| FX004 | Onboarding: enter background manually | src/pages/Onboarding.tsx:246 | docs/design/UNIVERSAL_USER_STORIES.md (US-2) | tests/e2e/onboarding.spec.ts | verified | /onboarding |
| FX005 | Onboarding: goal-first target track | src/pages/Onboarding.tsx:370 | docs/design/UNIVERSAL_USER_STORIES.md (US-3) | tests/e2e/onboarding.spec.ts | verified | /onboarding |
| FX006 | Onboarding: skip setup | src/pages/Onboarding.tsx:200 | HELP.md |  | unverified | /onboarding |
| FX007 | Author Career Evidence (incl. credentials, references) | src/pages/EvidenceEntry.tsx:341 | docs/design/UNIVERSAL_USER_STORIES.md (US-7, US-8) | tests/e2e/credential-evidence.spec.ts | verified | /career-evidence/new |
| FX008 | Replace evidence with supersede lineage | src/pages/EvidenceEntry.tsx:466 | docs/validation/evidence-references-lineage-v1.md | tests/e2e/evidence-history.spec.ts | verified | /career-evidence/new |
| FX009 | Save Career Profile preferences | src/pages/CareerProfile.tsx:378 | HELP.md |  | unverified | /career-profile |
| FX010 | Paste resume text and extract evidence | src/pages/CareerProfile.tsx:441 | docs/design/UNIVERSAL_USER_STORIES.md (US-1) | tests/e2e/app.spec.ts | verified | /career-profile |
| FX011 | Import resume file from Career Profile (DOCX/PDF/TXT) | src/pages/CareerProfile.tsx:397 | docs/design/UNIVERSAL_USER_STORIES.md (US-1) | tests/pwa/career-ops.spec.ts | unverified | /career-profile |
| FX012 | Review imported evidence: confirm | src/pages/CareerProfile.tsx:576 | docs/design/UNIVERSAL_USER_STORIES.md (US-9) | tests/e2e/app.spec.ts | verified | /career-profile |
| FX013 | Review imported evidence: edit, reject, merge | src/pages/CareerProfile.tsx:585 | docs/design/UNIVERSAL_USER_STORIES.md (US-9, US-10) |  | unverified | /career-profile |
| FX014 | Target Tracks with constraint strengths | src/pages/TargetTracks.tsx:337 | docs/design/UNIVERSAL_USER_STORIES.md (US-4, US-5, US-6) | tests/e2e/target-tracks.spec.ts | verified | /target-tracks |
| FX015 | Delete a Target Track | src/pages/TargetTracks.tsx:335 | HELP.md |  | unverified | /target-tracks |
| FX016 | Discover opportunities and approve a source | src/pages/Companies.tsx:217 | docs/validation/source-discovery-tranche-1.md | tests/e2e/source-discovery.spec.ts | verified | /companies |
| FX017 | Add a job source manually | src/components/CompanyForm.tsx:93 | HELP.md | tests/e2e/app.spec.ts | verified | /companies |
| FX018 | Run a source scrape | src/pages/Companies.tsx:488 | HELP.md |  | unverified | /companies |
| FX019 | Remove a job source | src/pages/Companies.tsx:497 | HELP.md | tests/e2e/app.spec.ts | verified | /companies |
| FX020 | Create a filter | src/components/FilterForm.tsx:165 | HELP.md |  | unverified | /filters |
| FX021 | Delete a filter | src/pages/Filters.tsx:84 | HELP.md |  | unverified | /filters |
| FX022 | Browse and search jobs | src/pages/Jobs.tsx:162 | HELP.md |  | unverified | /jobs |
| FX023 | Opportunity assessment against a track | src/components/JobEvidenceCoverage.tsx:159 | docs/design/UNIVERSAL_USER_STORIES.md (US-14 to US-18) | tests/e2e/evidence-coverage.spec.ts | verified | /jobs |
| FX024 | Mark job seen | src/pages/Jobs.tsx:291 | HELP.md |  | unverified | /jobs |
| FX025 | Track a job as an application | src/pages/Jobs.tsx:300 | HELP.md |  | unverified | /jobs |
| FX026 | Prepare resume for a job | src/components/JobEvidenceCoverage.tsx:349 | docs/design/UNIVERSAL_USER_STORIES.md (US-19) | tests/e2e/evidence-coverage.spec.ts | verified | /jobs |
| FX027 | Application status and notes | src/pages/Applications.tsx:77 | docs/design/APPLICATION_LIFECYCLE_FOUNDATION.md |  | unverified | /applications |
| FX028 | Remove an application | src/pages/Applications.tsx:93 | HELP.md |  | unverified | /applications |
| FX029 | Application contacts, events, and reminders | src/components/ApplicationLifecyclePanel.tsx:179 | docs/design/APPLICATION_LIFECYCLE_FOUNDATION.md | tests/e2e/application-lifecycle.spec.ts | verified | /applications |
| FX030 | Search context and offer details | src/components/ApplicationInsightsPanel.tsx:160 | docs/design/SEARCH_LEARNING.md | tests/e2e/application-insights.spec.ts | verified | /applications |
| FX031 | Cover letter drafts with stale-evidence warning | src/components/ApplicationMaterialsPanel.tsx:98 | docs/design/APPLICATION_MATERIALS.md | tests/e2e/application-materials.spec.ts | verified | /applications |
| FX032 | Interview prep | src/components/InterviewPrepPanel.tsx:52 | docs/design/INTERVIEW_PREP.md | tests/e2e/interview-prep.spec.ts | verified | /applications |
| FX033 | Career Stories linked to evidence | src/components/CareerStoriesPanel.tsx:279 | docs/design/CAREER_STORIES.md | tests/e2e/career-stories.spec.ts | verified | /career-stories |
| FX034 | Delete a Career Story | src/components/CareerStoriesPanel.tsx:328 | docs/design/CAREER_STORIES.md |  | unverified | /career-stories |
| FX035 | Search Insights | src/pages/SearchInsights.tsx:1 | docs/design/SEARCH_LEARNING.md | tests/e2e/application-insights.spec.ts | verified | /search-insights |
| FX036 | Create truthful resume draft and export verified PDF | src/pages/Resume.tsx:296 | docs/design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md | tests/e2e/app.spec.ts | verified | /resume |
| FX037 | Edit resume statements under the Truth Gate | src/pages/Resume.tsx:345 | docs/design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md |  | unverified | /resume |
| FX038 | Compare resume versions | src/pages/Resume.tsx:352 | HELP.md |  | unverified | /resume |
| FX039 | Tailor a resume to a job | src/components/ResumeTailoringPanel.tsx:125 | docs/design/UNIVERSAL_USER_STORIES.md (US-19, US-20) | tests/e2e/resume-tailoring.spec.ts | verified | /resume |
| FX040 | Theme selection | src/pages/Settings.tsx:66 | HELP.md |  | unverified | /settings |
| FX041 | Runtime and notification settings | src/pages/Settings.tsx:158 | HELP.md |  | unverified | /settings |
| FX042 | Backup and restore | src/components/BackupRestorePanel.tsx:79 | docs/design/BACKUP_RESTORE.md | tests/pwa/portability.spec.ts | unverified | /settings |
| FX043 | JSON Resume export | src/components/JsonResumePanel.tsx:68 | HELP.md | tests/pwa/career-ops.spec.ts | unverified | /settings |
| FX044 | JSON Resume import | src/components/JsonResumePanel.tsx:59 | HELP.md |  | unverified | /settings |
| FX045 | Store app: import legacy desktop data | src/components/RuntimePanel.tsx:161 | docs/design/MICROSOFT_STORE_PACKAGING.md |  | unverified | /settings |
| FX046 | Web runtime boot, security headers, offline shell | src/pwa/PwaShell.tsx:24 | docs/design/PWA_RUNTIME.md | tests/pwa/runtime.spec.ts | unverified | web runtime |
| FX047 | Web runtime verified update and shell repair | src/pwa/PwaShell.tsx:105 | docs/design/PWA_RUNTIME.md | tests/pwa/update-and-storage.spec.ts | unverified | web runtime |
| FX048 | Web runtime non-Latin resume PDF | src/pwa/runtime/resume-pdf.ts:1 | docs/design/PWA_RUNTIME.md | tests/pwa/unicode-resume.spec.ts | unverified | web runtime |
| FX049 | Desktop Help window and data folder menu | electron/src/main.cts:190 | HELP.md |  | unverified | desktop menu |
| FX050 | Desktop tray and notifications | electron/src/tray-notifications.cts:30 | HELP.md |  | unverified | desktop tray |
| FX051 | Candidate-controlled cover-letter copy (unqualified branch, not shipped) | src/components/ApplicationMaterialsPanel.tsx:62 | docs/design/APPLICATION_MATERIALS.md | tests/e2e/application-materials.spec.ts, tests/pwa/application-handoff.spec.ts, tests/application-handoff.test.mjs | unverified | /applications |
