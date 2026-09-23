# Governance

Job Ranger is an independently maintained open-source project. This document defines how project decisions are made so contributors can distinguish discussion, implementation, and actual product commitments.

## Maintainer Authority

The repository owner is the final decision authority for product direction, releases, licensing choices, security boundaries, and merges.

Pull requests and issues are proposals until merged or otherwise explicitly accepted. An open pull request does not define shipped behavior.

## Decision Priorities

When priorities conflict, Job Ranger generally favors:

1. user safety and factual integrity;
2. privacy and clear authority boundaries;
3. reliability and evidence-backed product claims;
4. usability for nontechnical job seekers;
5. maintainability and testability;
6. feature breadth.

A feature that is impressive but confusing, unsafe, unverifiable, or impossible for an ordinary job seeker to operate is not automatically progress.

## Product Change Classes

### Routine

Examples: narrow bug fixes, documentation corrections, compatible dependency patches, visual polish that does not alter product behavior.

Routine work can proceed through normal pull-request review and CI.

### Material

Examples: persistence changes, new job-source behavior, new user workflows, major dependencies, packaging changes, or meaningful architectural refactors.

Material work should have an issue or clearly documented design rationale and must update affected documentation.

### High-impact

Examples: authentication, cloud sync, telemetry, credentials, external inference, autonomous application submission, security-boundary changes, or destructive migrations.

High-impact changes require explicit maintainer approval before implementation is treated as accepted direction.

## Truthful Status Language

Repository documentation uses these states:

- **shipped**: available in a published release;
- **implemented on main**: merged and present on the default branch;
- **in development**: active work not yet merged;
- **planned**: intended direction without completed implementation;
- **deferred**: intentionally not active;
- **historical**: retained for provenance, not current guidance.

CI success demonstrates that the checked assertions passed. It does not by itself prove product fitness, source compatibility, packaging correctness on every OS, or a successful user outcome.

## Merge Standard

Material changes should not merge unless:

- the change matches its stated scope;
- required tests pass;
- public claims remain true;
- documentation reflects the new reality;
- licensing and attribution are clear;
- known blockers are not hidden inside optimistic wording.

## Releases

Published GitHub Releases are the source of truth for downloadable artifacts. Build configuration may support targets that are not present in a particular release.

Release notes should describe what users can actually obtain and run, not every target that Electron Builder is theoretically configured to emit.

## Dependencies

Patch/minor updates may be grouped where compatibility permits. Major upgrades are treated as migrations with explicit runtime, module-system, packaging, and security review.

## Third-Party Work

Third-party code or design mechanisms may be incorporated only when the license permits it. Required copyright and license notices must be retained. Trademark or branding rights are treated separately from source-code licenses.
