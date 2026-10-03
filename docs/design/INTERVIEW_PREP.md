# Evidence-grounded interview preparation

Issue: #65

## Purpose

Interview preparation is a read-only projection over existing Job Ranger authorities. It helps the user prepare to discuss a tracked opportunity without inventing career facts or forgetting what the employer actually received.

The preparation view composes three sources:

1. the saved tracked job and its extracted requirements;
2. confirmed/user-authored Career Evidence and the existing requirement-to-evidence mapping boundary;
3. the immutable snapshot of the latest resume artifact recorded as `submitted` for the application.

No new factual truth store is introduced.

## Key distinction

Confirmed evidence and submitted evidence are not the same thing.

A Career Evidence fact may legitimately support a requirement even when it did not appear on the resume sent to the employer. Interview prep therefore records both:

- whether confirmed evidence supports the requirement;
- whether a submitted-resume statement linked to that exact evidence ID was present in the immutable artifact snapshot.

When evidence was not submitted, Job Ranger explicitly tells the user to treat it as additional context rather than implying the employer already saw it.

## Requirement preparation

Each extracted requirement retains the existing deterministic classification:

- direct;
- transferable;
- ambiguous;
- gap.

The preparation cue is derived from that classification and evidence linkage. It does not predict an interview question, hiring probability, or recruiter reaction.

A gap remains a gap. Job Ranger tells the user to decide how to address it honestly rather than fabricating a substitute experience.

## Missing-context behavior

Preparation fails honestly rather than guessing:

- if the original tracked job record is missing, requirement-specific prep is unavailable;
- if no exact submitted artifact is linked, Career Evidence may still be used but Job Ranger cannot claim what the employer saw;
- if an artifact snapshot is unreadable, the submitted-resume portion is omitted and a warning is shown;
- if no explicit requirements can be extracted, coverage remains unknown.

## Inference boundary

No inference provider is required for this feature.

A future optional inference provider may propose better practice questions or evidence-bound phrasing, but it may not:

- establish new Career Evidence;
- rewrite a gap into support;
- change whether evidence was actually submitted;
- claim that a predicted question will be asked;
- generate unsupported STAR stories as factual career history.

## Validation

Repository health proves:

- preparation is grounded in a real tracked job;
- exact submitted artifact snapshot/version is identified;
- submitted evidence and confirmed-but-not-submitted evidence remain distinct;
- missing artifact/job state produces warnings rather than invented context;
- gaps/ambiguity remain visible.

Electron E2E proves the consumer view displays the exact submitted claim, additional confirmed evidence, and their different submission states without a fit percentage or hiring-probability claim.
