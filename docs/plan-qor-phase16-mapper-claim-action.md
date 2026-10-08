# Plan: Phase 16 - Deterministic mapper caps direct support when the claim action is missing (G13, #168)

**change_class**: hotfix

**doc_tier**: standard

**terms_introduced**:
- term: claim verb
  home: electron/src/claim-action.cts

**boundaries**:
- limitations: English; a curated lexicon of five claim-verb families plus agent nouns; a curated recipient-marker list; word-position rules, with no parsing, model or embeddings
- non_goals: G11 (trailing period on the last requirement token); negation (G12, done); changing thresholds; changing credential, unconfirmed or gap logic
- exclusions: requirement extraction, mapping IDs and scoring are unchanged; only the confirmed `direct` branch can be capped

**pr_target**: main (issue #168)

**iteration**: 6

Iteration 6 is an editorial correction of iteration 5, made before any audit dispatch: LD6's frozen-set count was stale and now reads 51/15/9. No rule changed.

Amended after the plan audit VETOs recorded at META_LEDGER Entries #88, #89 and #90.

After the third VETO, the cycle-count escalation ran `/qor-remediate`. It classified a **gate-loop** pattern: plan audits on heuristic text rules do not converge on their own. It recorded a pending process proposal (gate `remediate.json`). The user approved, in chat, one override for this iteration under that proposal's rule, which is written into this plan as **Acceptance and residual-risk budget** below.

Iteration 5 follows VETO #91. The user approved it in chat on 2026-10-08, under the same LD6 rule, with a stop on any further VETO. It makes these changes:
- the contract text is fixed:
  - `hasRecipientMarker(evidenceText, requirementText?)`;
  - `claimActionNote(verb)` replaces a constant with a placeholder;
  - `claimActionText` is used throughout;
  - the Evidence section is updated;
- **verb-series rule**: a recipient verb followed directly by "and" or a comma is an active work verb ("Received and processed customer orders…");
- plural course nouns are aligned between plan and prototype;
- the corpus grows to 51 affirmative, 15 capped and 9 limitation items, validated with `g13-proto5.cjs`, with the G12 corpus unchanged.

Iteration 4 changes, kept:
- a recipient marker counts only in a clause that shares a requirement word, and a passive only when its auxiliary leads the clause. So a passive outcome line such as "payroll errors were reduced" can no longer cap a genuine match;
- the corpus grows to 49 affirmative, 15 capped and 5 limitation items, re-validated with `g13-proto4.cjs`, with the G12 corpus still unchanged;
- the iteration-3 audit's non-blocking items are applied.

Iteration 3 changes, kept:

Iteration 3 makes these changes:
- credential requirements are exempt from the cap;
- assignment and descriptive participles (tasked, entrusted, promoted, appointed, given, experienced, certified…) are not recipient markers;
- `with` and a comma are active positions for `-ing`;
- title use of "lead"/"head" counts as active;
- the checked **claim-action text** is specified exactly (LD1);
- the note wording is neutral;
- the corpus grows to 45 affirmative, 15 capped and 5 limitation items, re-validated with `g13-proto3.cjs` on exactly that text, with the G12 corpus still unchanged.

Iteration 2 changes, kept:

The iteration-1 design capped whenever the claim verb was *missing*, which structurally over-corrects "different verb, same work". Iteration 2 caps only on **positive evidence of a recipient role**, and only when the claim verb is not actively present:
- a passive participle;
- a recipient or attendee verb;
- "completed … training/course".

So out-of-family synonyms without a recipient marker can never be capped. Agent nouns, the progressive tense, evidence-side `-ing` nouns and "Experience <verb>ing" requirements are handled explicitly. The corpus grows to 35 affirmative, 13 capped and 4 limitation items, built from the audit's counterexamples. It was re-validated against the prototype on the real compiled mapper (`g13-proto2.cjs`), and it leaves the G12 negation corpus unchanged.

The deterministic requirement mapper treats evidence that shares a requirement's nouns but not its **action** as `direct` support. "Was paid through payroll as part of a large workforce." maps as `direct` to "Managed payroll for a large workforce." This phase caps such results at `transferable` when the evidence shows a recipient role and the requirement's claim verb has no active counterpart in the evidence. Synonymous verbs from the same family ("Led" for "Managed", "Taught" for "Train") keep `direct`. This is a deterministic product correctness fix, justified independently of inference.

Lessons from Phase 15 are applied from the start:
- acceptance is a versioned phrasing corpus, validated against a prototype built on the real compiled mapper before this plan was written;
- the change is a cap applied after classification, so it cannot increase support anywhere.

## Open Questions

None.

## Evidence

- `overlapScore` (`electron/src/requirement-mapper.cts`, after Phase 15) is the fraction of significant requirement tokens with an equivalent evidence token, scored on affirmed text. All tokens count equally, so an unmatched action token is offset by matched object nouns.
- The `direct` branch for confirmed evidence is `if (best.score >= 0.7)` in `classifyRequirementEvidence` (`requirement-mapper.cts:328-339` on `main` at `97c371b`). It returns "Confirmed Career Evidence closely matches the language of this requirement." The `transferable` branch follows at a score of 0.35 or more.
- `mapRequirementToEvidence` runs `classifyRequirementEvidence` on affirmed text and on raw text, and appends the G12 negation note only when the raw classification is stronger (Phase 15). A cap applied inside `classifyRequirementEvidence` therefore runs identically in both passes, and the negation note stays truthful.
- Measured on the real compiled mapper at `97c371b`, all of these pairs map as `direct` today:
  - "Managed payroll for a large workforce." against "Was paid through payroll as part of a large workforce.";
  - "Train new hires on safety procedures." against "Was trained on safety procedures with new hires.";
  - "Managed payroll training for a large workforce." against "Attended payroll training for a large workforce.";
  - the synonym pairs "Managed payroll…" against "Led payroll…" and "Train finance staff on Excel." against "Taught Excel workshops to finance staff.".
- A scratch prototype (`g13-proto5.cjs`) applies the iteration-5 cap to that mapper's output, using exactly the LD1 `claimActionText`. Over the draft corpus (`action-corpus.v5.json`):
  - all 51 affirmative items keep their pre-change classification. These include:
    - out-of-family synonyms;
    - agent nouns and titles;
    - progressive tense;
    - assignment participles;
    - credential items;
    - a passive outcome line in an unrelated clause;
    - "Received and processed…" and "Received, inspected and stocked…";
  - all 15 capped items go from `direct` to `transferable`;
  - all 9 limitations behave as recorded;
  - every item of the G12 negation corpus keeps its classification.
- Coverage is recomputed on every coverage read, so no migration is needed (Phase 15 evidence, `requirement-backend.cts:19-34`).
- `requirement-mapper.cts` is already over the Razor line limit, so the lexicon and checks go in a new module and the mapper changes only by wiring.

## Locked Decisions

- LD1: A new pure module `electron/src/claim-action.cts` exports:
  - `claimVerb(requirementText): { word, family } | null`;
  - `hasRecipientMarker(evidenceText, requirementText?): boolean`. With `requirementText`, the clause gate below applies; without it, the gate is skipped. The mapper always passes the requirement text;
  - `activelySatisfies(evidenceText, family): boolean`;
  - `claimActionNote(verb): string`, which returns the note for a claim verb;
  - `selectUncapped(ranked, isConfirmed, isCapped)`, the LD2(b) selection helper. It is typed on `{ evidence, score }[]`, and the mapper passes its own `isConfirmed` predicate.

  It imports nothing from inference and nothing from the mapper apart from types. It may import `affirmedText` from `evidence-negation.cjs`.
  - Words are lower-cased `[a-z]+` tokens inside clauses split at `.`, `;`, `:`, `!`, `?` and newlines.
  - On the evidence side, `,` is also kept as a position token. A comma inside a number ("2,000") becomes a harmless position token too.
  - The requirement side ignores commas.
  - **Claim-action text**: exported as `claimActionText(evidence, affirm)`. It is the user's own prose and labels, with each field on its own line, so every field is a separate clause:
    - `statement`, `action` and `context` (affirmed in the affirmed pass);
    - `titleOrName`;
    - each entry of `skills` and `methodsOrTools`;
    - each entry of `scope` and `outcomes` (affirmed in the affirmed pass).

    `organization`, `metrics` and the credential fields are excluded, so "Direct Energy" is never read as the user's action. This text is used only for the claim-action checks; scoring still uses `evidenceSearchText`.
  - **Lexicon**: five families. Each word has a known form: base, `-s`, past or participle, `-ing`, or agent noun.
    - **lead**: lead/leader; manage/manager; direct/director; oversee (oversaw, overseen); supervise/supervisor; head; run (ran); administer/administrator; own/owner; spearhead; drive (drove, driven).
    - **build**: build (built)/builder; develop/developer; create/creator; design/designer; engineer; implement; architect.
    - Some past forms (`led`, `run`, `built`) also appear in the irregular participle list below. Both lists are intentional; neither replaces the other.
    - **coordinate**: coordinate/coordinator; organize, organise/organizer, organiser; schedule/scheduler; arrange; plan (planned, planning)/planner.
    - **train**: train/trainer; teach (taught)/teacher; coach; mentor; instruct/instructor.
    - **approve**: approve/approver; authorize, authorise.
  - **Claim verb** (requirement side): the first family word that is not an agent noun.
    - An `-ing` form that is not the first word counts only if the word before it is one of `experience`, `for`, `in`, `of`, `at`, `with`, `and`, `to`, `including`, `on`. So "Experience managing payroll…" gives managed-family **lead**, while "Payroll training for staff" has no claim verb.
    - Requirements with no family word are never capped.
    - A requirement naming two actions ("Manage and train…") uses the first family word. The recipient-marker gate keeps this low-risk.
    - **Credential requirements** (`kind === "credential"`) are never capped, because receiving the credential is the claim.
  - **Recipient marker** (evidence side). It counts only in a clause of the claim-action text that contains a word of 4 or more letters also found in the requirement text, by exact lower-case equality. A marker in a clause about something else ("Received a spot award for accuracy.") therefore does not count. A marker is any of:
    - (a) a passive participle: a word of 5 or more letters ending in `ed`, or one of `paid`, `taught`, `led`, `run`, `built`, `shown`, `told`, `made`, `sent`, `held`, `brought`, `overseen`, `driven`. It must come right after one of `was`, `were`, `been`, `being`, `is`, `are`, `am`, `be`, `got`, `get`, `gets`, `getting`, skipping one `-ly` adverb, **and that auxiliary must be the first word of its clause**, optionally after `i` or `we`. So "Was paid…" and "I was trained…" are markers, while "payroll errors were reduced…" and "…were led by me" are not.
      - These participles are assignments or self-descriptions, not recipient roles, and are **never** markers: `tasked`, `entrusted`, `charged`, `promoted`, `appointed`, `selected`, `named`, `hired`, `chosen`, `assigned`, `asked`, `elected`, `recruited`, `given`, `experienced`, `skilled`, `certified`, `licensed`, `qualified`, `dedicated`, `committed`, `responsible`, `recognized`, `recognised`, `awarded`;
    - (b) one of `received`, `receiving`, `attended`, `attending`, `participated`, `participating`, `enrolled`, `benefited`, unless it is followed directly by `and` or a comma. "Received and processed…" is an active verb series, not a recipient role;
    - (c) `completed` followed later in the same clause by `training`, `course`, `class`, `workshop`, `program`, `bootcamp`, `seminar` or `certification` (singular or plural: `training`, `trainings`, `course`, `courses`, `class`, `classes`, `workshop`, `workshops`, `program`, `programs`, `bootcamp`, `bootcamps`, `seminar`, `seminars`, `certification`, `certifications`).
  - **Active satisfaction** (evidence side): a word of the claim verb's family in an active position, where the position rule depends on the form (one `-ly` adverb is skipped when looking at the previous word):
    - past or participle: not right after a passive auxiliary;
    - `-ing`: first in its clause, or after `for`, `in`, `of`, `by`, `while`, `and`, `including`, `to`, `with`, a comma, `been`, `am`, `is`, `are`, `was`, `were` or `be`. So the progressive, "tasked with managing" and "…, managing payroll" count, while a noun use such as "procedures training" does not;
    - base or `-s`: first in its clause, or after `and`, `to` or a comma. So "via direct deposit" and "my own" do not count. The exception is `lead` or `head` used as a title: last in the clause, or followed by `for`, `of`, `at` or a comma ("Payroll Lead for…", "Team Lead");
    - agent noun: always active, unless `by`, `from` or `with` appears among the 3 preceding words (someone else's role, as in "by the operations manager").
- LD2: The cap is applied in `classifyRequirementEvidence`, **only in the confirmed `direct` branch** (`best.score >= 0.7`). A record is **capped** when the requirement has a claim verb, **and** the record's `claimActionText` has a recipient marker (gated by the requirement text), **and** that text does not actively satisfy the claim verb's family. Otherwise the record is unaffected:
  - (a) If the best evidence is not capped, the result stays `direct`, unchanged.
  - (b) Otherwise, the first other ranked, confirmed, non-rejected evidence with a score of 0.7 or more that is not capped is chosen and returned as `direct`. The selection keeps ranking order. Credential requirements are never capped, so standing does not arise here. The selection lives in a helper in `claim-action.cts`, typed on `{ evidence, score }[]`, to keep the mapper's growth small.
  - (c) Otherwise, the result is `transferable` with the best evidence, and its explanation is the existing transferable explanation followed by `claimActionNote(claim verb)`:
    > The evidence does not show you performing this requirement's action ("<claim verb>"); it describes receiving, attending, or being the object of it, so it is not counted as direct support.
  - The text checked is `claimActionText(evidence, affirm)` from LD1: affirmed in the affirmed pass and raw in the raw pass, so the cap stays consistent with the G12 counterfactual.
  - No other branch changes: credential standing gaps, the unconfirmed `ambiguous`/`gap` paths, the `transferable` and `gap` thresholds, the mapping ID scheme and extraction all stay as they are. A capped result's mapping ID changes because its classification changes, exactly as with any other classification change.
- LD3: Since the cap only removes `direct` (to `transferable`), or swaps in another qualifying record, it can never strengthen a result.
- LD4: **Phrasing corpus acceptance.** `tests/fixtures/action-corpus.v1.json` is hash-pinned in the test. Items may carry optional `titleOrName` and `skills` fields, so fields other than the statement are exercised.
  - **51 affirmative items**, including the iteration-4 audit's verb-series cases ("Received and processed customer orders…", "Received, inspected and stocked…"), the iteration-3 audit's cases:
    - "Handled payroll…; payroll errors were reduced by 30%." (in both the statement and `outcomes`);
    - "Handled payroll… Received a spot award for accuracy.";
    - "Payroll audits… were led by me.".

    They also include the iteration-2 audit's cases:
    - "Was tasked with managing…", "Was entrusted with leading…";
    - "Was promoted to senior analyst, managing…", "Was given ownership of…", "Was promoted to Payroll Lead for…";
    - "Is experienced in…";
    - credential items ("Received an Engineering degree…", "Completed an accredited engineering degree program.");
    - a `skills`-field item and a statement without a trailing period;
    - and: same-verb, in-family synonyms, out-of-family synonyms, agent nouns and titles, progressive tense, adverbs, coordinated verbs, noun-only requirements, credential and trade phrasings, a passive marker alongside an active claim verb, and other-party agent nouns without a marker. Each `expected` is the pre-change classification and must not change, and none carries `claimActionNote`.
  - **15 capped items** (including items with `titleOrName` and `skills` fields): passive, recipient, attendee and participant phrasings, "completed … training", "Experience <verb>ing" requirements, a base-form adjective ("via direct deposit"), and an other-party agent noun with a marker. Each must be `direct` before the change and `transferable` with `claimActionNote` after it.
  - **9 limitations**, recorded with their observed result:
    - "Received approved vendor budgets…": `direct` (a participial adjective);
    - "Benefited from payroll automation…": `transferable` (a recipient verb);
    - "Gained exposure to payroll operations…": `direct` (outside the marker list);
    - "Was given payroll training…": `direct` (`given` is an assignment participle);
    - "Train new hires on licensing procedures.": `direct` (classified as a credential requirement, so never capped);
    - "Processed payroll… and received the Payroll Excellence Award.": `transferable` (a same-clause recipient verb about something else);
    - "Completed safety training sessions for 40 new hires.": `transferable` (the user delivered the sessions);
    - "Managed audits and was trained on payroll compliance…": `direct` (a coordinated passive is not a marker);
    - "Received a spot award, working with leadership on payroll…": `transferable` (the clause gate matched a common word).

  The former limitation "…were led by me" keeps `direct` under the clause-leading auxiliary rule, so it is now an affirmative item.

  `tests/claim-action.test.cjs` runs the corpus through the real `buildJobEvidenceCoverage`. It matches the note by its fixed prefix: "The evidence does not show you performing this requirement's action". The same test asserts that every G12 negation-corpus item keeps both its classification and the presence or absence of the G12 negation note.
- LD6: **Acceptance and residual-risk budget**, the gate-loop remediation, approved by the user for this phase.
  - The frozen acceptance set is `tests/fixtures/action-corpus.v1.json`: 51 affirmative, 15 capped and 9 limitation items, hash-pinned.
  - Residual risk is stated, not iterated away. It covers:
    - recipient phrasings outside the marker list;
    - participial adjectives;
    - claim verbs outside the five families;
    - credential-classified requirements;
    - incidental requirement-word overlap (including common words) in an unrelated clause;
    - recipient verbs about something else within a shared clause;
    - "completed … training" when the user delivered it;
    - coordinated passives.
  - Further long-tail phrasings found later are recorded as corpus limitations, or fixed in a later phase with their own corpus items. They are not grounds to reopen this plan.
  - The plan is defective only on a contract or consistency defect, or on a counterexample class shown to be common and absent from the corpus. In that case the Governor adds it to the corpus rather than redesigning the rules.
- LD5: BACKLOG G13 is marked complete with a reference to #168, and CHANGELOG gets an Unreleased "Fixed" entry. The inference adversarial fixture category `high-lexical-overlap-different-meaning` will print `deterministic=transferable`. That test asserts invariants only, so its fixture hash is unaffected.

## Phase 1: Claim-action cap

### Affected Files

- `electron/src/claim-action.cts` (new): the lexicon, `claimVerb`, `hasRecipientMarker`, `activelySatisfies`, `claimActionText` and `claimActionNote`.
- `electron/src/requirement-mapper.cts`: wiring in the `direct` branch of `classifyRequirementEvidence` per LD2.
- `tests/claim-action.test.cjs` (new) and `tests/fixtures/action-corpus.v1.json` (new).
- `tests/requirement-mapper.test.cjs`: G13 additions.
- `package.json`: the pure test is added to `test` and `test:unit` next to `evidence-negation.test.cjs`.
- `docs/BACKLOG.md`, `CHANGELOG.md`, `docs/GOVERNANCE_INDEX.md` (Phase 16 row).

### Unit Tests

- `tests/claim-action.test.cjs`:
  - `claimVerb` returns the exact word and family:
    - "Managed payroll for a large workforce." gives managed / lead;
    - "Train new hires on safety procedures." gives train / train;
    - "Managed payroll training…" gives managed / lead (the gerund is skipped);
    - "Payroll training for staff." gives null;
    - "Payroll processing for a large workforce." gives null;
    - "Training new hires on safety." gives training / train (a leading gerund counts);
    - "Experience managing payroll for a large workforce." gives managing / lead.
  - `activelySatisfies` returns true for:
    - "Led payroll…", "Taught Excel…", "Personally managed…", "Was responsible for and managed…";
    - "Have been managing…", "Responsible for training…";
    - "Shift supervisor for…", and a "Payroll Manager" title.

    It returns false for:
    - "Was trained on…", "Got trained on…", "Was supervised by the operations manager…", "Was paid through payroll…";
    - "Completed safety procedures training…" (an `-ing` noun);
    - "…via direct deposit…" (a base-form adjective).
  - `hasRecipientMarker`, called ungated (no requirement text):
    - true for "Was paid…", "Received payroll reports…", "Attended…", "Participated in…" and "Completed safety training…";
    - false for "Completed payroll migration…", "Handled payroll…", "Have been managing…", "Received and processed customer orders…" and "payroll errors were reduced…".

    One gated case: "Handled payroll. Received a spot award for accuracy." with the requirement "Managed payroll for a large workforce." is false, because the marker clause shares no requirement word.
  - The full corpus runs through the real mapper, with exact classifications and the presence or absence of the note.
- `tests/requirement-mapper.test.cjs` additions, via `mapRequirementToEvidence` with requirements built directly:
  - **Selection**: two confirmed records both scoring `direct`, where the higher-ranked one is passive ("Was trained on safety procedures with new hires.") and the lower-ranked one is active ("Trained new hires on safety procedures."). The result is `direct` with the active record's `evidenceId`.
  - **Cap with no alternative**: the result is `transferable` with the best record and `claimActionNote`.
  - **No claim verb**: "Payroll processing for a large workforce." is never capped.
  - **No recipient marker**: "Wrote production TypeScript services and APIs." against "Develop production TypeScript services and APIs." stays `direct`.
  - **Unconfirmed path untouched**: unconfirmed "Was trained on safety procedures with new hires." is still `ambiguous`, with no claim note.
  - **Credential path untouched**: credential requirements are never capped (corpus credential items), and the existing credential tests keep their exact results.
  - **G12 interaction**: "Never trained new hires on safety procedures; was trained on safety procedures." against "Train new hires on safety procedures." is not `direct`, and its explanation stays truthful. It gets the negation note only if the raw pass would have been stronger.
- All existing deterministic suites run unchanged:
  - `requirement-mapper.test.cjs`, `evidence-negation.test.cjs` (G12 corpus);
  - `opportunity-assessment.test.cjs`, `universal-career-fixtures.test.cjs`, `military-transition-fixture.test.cjs`;
  - `requirement-coverage-smoke-test.cjs`, `evidence-extension-smoke-test.cjs`;
  - the inference baseline and adversarial tests.

## Feature Inventory Touches

- n/a-justified: the user-facing coverage surface (`FX023`, `src/components/JobEvidenceCoverage.tsx`) is unchanged in source and route. Only the deterministic classification it displays becomes more accurate.

## Definition of Done

### Deliverable: Claim-action-aware direct support

- **D1**: Evidence that shows a recipient role (passive, recipient or attendee) without performing the requirement's action is no longer counted as direct support. Evidence without a recipient marker is never capped, so synonyms of any kind keep direct support. Explanations say why support was capped.
- **D2**: `claim-action.cts` exists (at most 250 lines; each function at most 40 lines). The mapper changes only in the `direct` branch wiring. There is no inference import, thresholds are unchanged, and a result can never get stronger.
- **D3**: Ledger plan, audit, implement and seal entries; BACKLOG G13 closed; CHANGELOG; governance index row.
- **D4**: `node tests/claim-action.test.cjs` (with the full corpus) and `node tests/requirement-mapper.test.cjs` pass; `npm test` and `npm run typecheck` pass; the G12 corpus is still green.

## CI Commands

- `npm test` - full suite, including the G12 corpus and existing deterministic suites.
- `npm run typecheck` - TypeScript.
- `node tests/claim-action.test.cjs` - claim-verb unit tests and the phrasing corpus.
