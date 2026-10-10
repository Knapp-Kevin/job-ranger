# Application Materials

Application materials are versioned projections of application context and confirmed Career Evidence. They are not a second source of career truth.

## Authority boundaries

- Career Evidence remains the authority for factual career claims.
- The tracked Application owns the opportunity context.
- Requirement mapping determines which confirmed evidence supports the saved job.
- Application materials may quote or organize supported confirmed evidence, but they do not create new factual evidence.
- A generated draft is a historical projection. Later Career Evidence corrections do not rewrite the old draft.
- Each factual section snapshots the `updatedAt` value of the supporting Career Evidence it used.
- If supporting evidence is later edited, rejected, merged, or superseded, the historical draft is marked stale and should be rebuilt before use.
- No inference provider is required for deterministic material creation.

## First supported material

The first material type is a deterministic cover-letter draft. It contains:

1. an opening based only on the tracked application title and company;
2. up to three concise factual paragraphs derived from the strongest distinct direct or transferable Career Evidence mappings;
3. a neutral closing using the saved profile name when available.

Unsupported or ambiguous job requirements remain visible as warnings and are never converted into claims.

## Versioning

Each created cover letter receives a monotonically increasing version per application. Old versions remain available until explicitly deleted. Deleting the application cascades its prepared materials.

Version history is immutable application context, not a live view of current Career Evidence. When factual evidence changes after a material version was prepared, Job Ranger preserves the old wording for history and marks that version stale rather than silently rewriting it.

## Development candidate: deliberate cover-letter handoff (issue #228)

A scoped candidate implementation adds **Copy cover letter** for a selected saved version. The UI re-reads the canonical material list and refuses missing, stale, empty, unsupported, or incorrectly evidence-linked drafts. Copying is explicit, not automatic. The action does not submit an employer application, change application status, or transmit content to Job Ranger's servers.

The clipboard is outside Job Ranger's local database: the candidate chooses when to copy, and operating-system/browser clipboard consumers can then access the text. An unavailable or denied clipboard must be shown as a failure.

**Qualification:** The feature is on an isolated WIP branch only. Formal Qortara plan and audit gates, Electron/PWA integration tests, and release readiness are not yet established. See `docs/plans/228-application-handoff.md` and issue #228.

## Deliberate limitations

This tranche does not add free-form AI rewriting, arbitrary factual editing, autonomous submission, DOCX/PDF rendering, or generic document templates. Those capabilities require their own evidence-backed justification and must preserve the same truth boundary.
