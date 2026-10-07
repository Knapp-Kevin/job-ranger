# Plan: Phase 15 - Deterministic requirement mapper respects negation in evidence (G12, #167)

**change_class**: hotfix

**doc_tier**: standard

**terms_introduced**:
- term: affirmed evidence text
  home: electron/src/evidence-negation.cts

**boundaries**:
- limitations: English negation cues only; clause-scoped; no model, embedding or fuzzy semantics
- non_goals: G13 (lexical overlap with a different meaning); negation in job requirement text; Truth Gate changes; inference
- exclusions: requirement extraction, credential standing and thresholds are unchanged

**pr_target**: main (issue #167)

**iteration**: 5

Amended after the plan audit VETOs recorded at META_LEDGER Entries #80, #81 and #82. After the third VETO, the cycle-count escalation ran `/qor-remediate` (gate `remediate.json`). It found that each audit was discovering another common resume phrasing, so acceptance is now defined against a versioned **phrasing corpus** instead of enumerated cases.

Iteration 5 follows the VETO at Entry #83, with a second escalation override that the user approved in chat. It makes these changes:
- **one comma rule for every cue class**, so a noun-cue list such as "No experience with SQL, Python, or Tableau." stays negated;
- the result/participle definition is aligned to 5 or more letters;
- the irregular past-tense list is extended;
- `never lost` and `never failed` are idioms;
- the -ed adjective limitation covers the "and"/"or" form;
- the corpus grows to 30 affirmative, 12 negated and 8 limitation items.

Iteration 4 changes, kept:
- a result clause joined by "and"/"or" plus a past-tense verb ends any cue's scope;
- the verb-cue comma exception skips an "and";
- `never missed` is an idiom;
- whole-word matching and per-field application are stated explicitly;
- the remaining edge cases are listed and tested as limitations;
- the phrasing corpus is added (LD7).

Iteration 3 changes, kept:
- verb negation and noun/exclusion cues get different scope rules, so result phrases survive and negated lists stay negated;
- a list of non-negating idioms is added;
- a boundary word right after a cue does not end the scope ("not yet");
- the note is shown only when negation changed the outcome;
- exact expected strings are given for every test.

The deterministic requirement mapper treats evidence that explicitly denies a requirement as `direct` support. This phase makes the mapper count only **affirmed** evidence text, so a requirement matched only inside a negated span is not supported by that span. Adjacent affirmed experience in another clause still counts. It is a deterministic product correctness fix, justified independently of inference.

## Open Questions

None.

## Evidence

- `overlapScore` (`electron/src/requirement-mapper.cts:162-170`) returns the fraction of the requirement's significant tokens that have an equivalent token anywhere in `evidenceSearchText` (`:142-160`). Evidence words never lower the score.
- The classification thresholds for confirmed evidence are `direct` at a score of 0.7 or more (`:306-316`), `transferable` at 0.35 or more (`:318-328`), and `gap` otherwise (`:330-339`). Unconfirmed evidence becomes `ambiguous` at 0.6 or more, otherwise `gap` (`:262-283`).
- Reproduction (`tests/fixtures/inference/adversarial.json`, category `negation-and-exclusion`): the requirement "Approved vendor budgets." against the evidence "Never approved the vendor budget; reviewed vendor budget drafts." scores 1.0 and maps as `direct`. `tests/inference-adversarial.test.cjs` printed `deterministic=direct` for this case at Phase 14.
- `significantTokens` (`:28-32`) drops tokens shorter than 3 characters and the stop words (`:13-17`), so "no" is never a requirement token. "not", "never" and "without" can be tokens, but none of the existing requirement fixtures use them.
- Coverage is recomputed and replaced whenever a job's coverage is read: `RequirementBackend.getJobEvidenceCoverage` calls `buildJobEvidenceCoverage`, then `replaceCoverage` (`electron/src/requirement-backend.cts:19-34`; `requirement-repository.cts:170-184`). Persisted mappings therefore refresh on the next coverage read for that job. Application Insights reads the stored `requirement_evidence_maps` rows directly (`electron/src/application-insights-backend.cts:486`), so a job whose coverage has not been re-read keeps its old rows until then. No migration is needed.
- `normalize` keeps `.` (`requirement-mapper.cts:19-25`), so a requirement token can carry a trailing period (for example `budgets.` or `sql.`). Tokens shorter than 5 characters get no prefix equivalence (`tokenEquivalent`, `:44-53`). Affirmed evidence text must therefore keep its original characters, delimiters included.
- Affirmed scores also determine rank order and the `score > 0` filter (`rankedEvidence`, `:231-240`), as well as which evidence is chosen for credential requirements (`:250`). Those effects are intended and are tested.
- A scan of the deterministic fixture corpus for negation cues found them only in job text and fixture metadata, never in evidence statements:
  - test files: `requirement-mapper.test.cjs`, `opportunity-assessment.test.cjs`, `universal-career-fixtures.test.cjs`, `military-transition-fixture.test.cjs`, `requirement-coverage-smoke-test.cjs`;
  - fixture files: `tests/fixtures/universal-careers.v1.json`, `military-transition.v1.json`.

  For example, `opportunity-assessment.test.cjs:224-227` has "no on-call requirement" in job descriptions, and `universal-careers.v1.json` has "not" in `knownModelPressures` metadata. Existing expectations are therefore not expected to change.
- `requirement-mapper.cts` is 371 lines, already over the 250-line Razor limit before this phase. New logic goes in a new module, and the mapper grows only by the wiring.
- The mapper is shared by Electron and PWA through `electron/src` (`tsconfig.electron.json` include), so the fix applies to both runtimes.

## Locked Decisions

- LD1: A new pure module `electron/src/evidence-negation.cts` exports `affirmedText(text: string): string`. It imports nothing from inference.
  - **Verbatim output**: every character outside a negated span is kept exactly, delimiters and trailing punctuation included. A negated span runs from the first character of the cue to the end of its scope, not including the delimiter that ends it, and is replaced by a single space. No clause is rebuilt.
  - **Clause boundaries**: `.`, `;`, `:`, `!`, `?`, newlines, and the contrast words `but`, `however`, `although`, `though`, `while`, `whereas`, `yet`. A boundary word that comes **directly after** a cue (only whitespace between them) does not end the scope, so "not yet" stays negated.
  - **Verb negation cues**: `not`, `never`, `cannot`, and contractions ending in `n't` (both `'` and `’`).
    - Scope runs to the clause boundary, so "Did not handle budgets, payroll, or invoices." negates the whole list.
  - **Noun-phrase and exclusion cues**: `no`, `without`, `nor`, `neither`, `except`, `excluding`, `other than`, `apart from`, `rather than`, `instead of`. They have the same scope as verb cues, so "No experience with SQL, Python, or Tableau." negates the whole list.
  - **One comma rule for all cues**: a comma does not end scope unless the next word, optionally after `and`, is a result or participle word or a past-tense verb.
    - A result or participle word is a word of 5 or more letters ending in `ing` or `ed`, or one of `which`, `resulting`, `leading`, `saving`.
    - Past-tense verbs are defined below.
    - So "Migrated ERP with no downtime, reducing operational costs by 20%." negates only "no downtime"; "Did not manage payroll, approved budgets." keeps "approved budgets"; and "…, and reduced cycle time" ends the scope.
  - **For every cue class**, scope also ends at `and` or `or` when the next word is a past-tense verb: a word of 5 or more letters ending in `ed`, or one of `led`, `built`, `ran`, `cut`, `grew`, `won`, `drove`, `wrote`, `taught`, `made`, `kept`, `sold`, `held`, `began`, `took`, `set`, `met`, `oversaw`, `spoke`, `gave`, `found`, `sent`, `brought`, `spent`, `paid`, `undertook`, `overcame`.
    - "Migrated 40 servers to AWS with no downtime and reduced hosting costs 30%." keeps "and reduced hosting costs 30%".
    - "No experience with Python and SQL" stays fully negated.
  - Cues match whole words only, so "Notably", "Noted" and "Nordic" are never cues.
  - A cue joined to another word by a hyphen on either side is not a cue ("no-code", "not-for-profit").
  - **Idioms that are not negation** (matched case-insensitively and left untouched): `not only`, `not just`, `not limited to`, `not to exceed`, `no less than`, `no more than`, `no fewer than`, `no later than`, `never missed`, `never lost`, `never failed`. So "including but not limited to payroll" is untouched.
  - **Double negatives** ("not without") are treated as negated, the conservative choice.
  - **Documented limitations, each tested as a known limitation**:
    - English only; non-Latin text passes through unchanged.
    - Postposed or passive negation ("Vendor budgets were never approved by me") keeps the text before the cue.
    - `.` splits abbreviations and decimals ("U.S.", "3.5%"), which can end a scope early. That is a rare miss in the dishonest direction, accepted and documented.
    - After any cue, a gerund list item or an `-ed` adjective that follows a comma or `and`/`or` ends the scope:
      - "Did not handle recruiting, onboarding, or training." keeps ", onboarding, or training";
      - "Did not lead large, distributed teams." keeps ", distributed teams";
      - "Has not used Python or advanced Excel." keeps "or advanced Excel".

      These are misses in the dishonest direction, documented and tested.
    - A trailing adjunct after a cue and a comma is erased ("Delivered the rollout with no defects, on schedule." keeps only "Delivered the rollout with"). This is a rare miss in the honest direction.
    - A proper noun in prose that starts with a cue word is negated ("No Kid Hungry" inside a statement). The `organization` field is protected (LD2).
    - A contrast word set off by commas right after a verb cue ends the scope early ("Did not, however, approve budgets.").
- LD2: `requirement-mapper.cts` applies `affirmedText` only to the free-text evidence fields: `statement`, `action`, `context`, `scope[]` and `outcomes[]`.
  - These fields are passed through unchanged: `organization`, `titleOrName`, `skills[]`, `methodsOrTools[]`, `metrics[]` and the credential fields. They are user-confirmed labels, not prose, and an organization such as "No Kid Hungry" must not negate itself.
  - Requirement text is not negation-processed. G12 concerns evidence; negation in job text is a different question and is out of scope.
  - Concretely, `evidenceSearchText(evidence, affirm: boolean)` gains a flag, and `overlapScore` scores with `affirm: true`.
  - `affirmedText` is applied to **each field separately**: `statement`, `action`, `context`, and each `scope` and `outcomes` entry. It is never applied to the joined string, so a cue's scope cannot run across fields.
- LD3: The classification thresholds, credential standing logic, unconfirmed-evidence logic, requirement extraction and mapping IDs are unchanged.
  - A negated-only match lowers the score, so classification falls through the existing thresholds.
  - For the fixture, the second clause still affirms "vendor" and "budget": 2/3 ≈ 0.67, so `transferable`. The adjacent experience is kept, not erased into `gap`.
- LD4: Explanations stay truthful. The note is added only when negation itself changed the outcome.
  - `negationChangedOutcome(candidates, finalClassification)` in `evidence-negation.cts` returns true when at least one candidate meets all three conditions:
    - (a) its raw classification is strictly stronger than its affirmed classification, so negation affected it;
    - (b) its raw classification is strictly stronger than the final classification;
    - (c) it is eligible: it is not rejected and, for a credential requirement, its credential standing is usable.
  - Each candidate carries `{ rawScore, affirmedScore, confirmed, eligible }`, and is classified with its own path's thresholds:
    - confirmed: `direct` at 0.7 or more, `transferable` at 0.35 or more, otherwise `gap`;
    - unconfirmed: `ambiguous` at 0.6 or more, otherwise `gap`.
  - The strength order is `direct` > `transferable` > `ambiguous` > `gap`.
  - The pool is every non-rejected evidence record, with confirmed and unconfirmed together, so a note is not lost when the best evidence switches pools.
  - A credential that is unusable is gap either way, so it never triggers the note (observation 3). Nor does an unconfirmed record without negation.
  - When true, the mapper appends:
    > Some of this evidence states the requirement in a negated form (for example "never" or "not"), which is not counted as support.
- LD5: Fixture expectations:
  - The `negation-and-exclusion` adversarial fixture now maps as `transferable`. `tests/inference-adversarial.test.cjs` asserts invariants, not classifications, so its fixture hash and assertions are unchanged; only its printed baseline line changes.
  - G13 and the other adversarial categories are untouched.
- LD7: **Phrasing corpus acceptance.** A versioned file, `tests/fixtures/negation-corpus.v1.json`, is the acceptance set for this phase. Its content hash is asserted in the test, so changes must be deliberate.
  - **30 affirmative items**: common resume phrasings, including STAR result phrases after "with no", "without" and "instead of", idioms, whole-word lookalikes, and plain usages ("Ranked No. 1 in regional sales.", "Supported 2,000 users with no outages."). Each `expected` value is the **pre-change** classification and must not change.
    - Four of them are `transferable` before this change because of G11, the trailing-period token. They are kept as-is to prove no regression.
  - **12 negated items**, including noun-cue lists ("No experience with SQL, Python, or Tableau." against "Python." maps as `gap`), must classify exactly as their `expected` value, which is weaker than the raw classification.
  - **8 limitations** record their exact affirmed text.
  - `tests/evidence-negation.test.cjs` runs the corpus through the real `buildJobEvidenceCoverage`, plus `affirmedText` for the limitations.
  - The Governor validated every item and the LD1 table against a prototype of these rules and a replica of the mapper's scoring before audit.
- LD6: BACKLOG G12 is marked complete with a reference to #167, and G13 gains its issue reference (#168). CHANGELOG gets an Unreleased "Fixed" entry.

## Phase 1: Negation-aware evidence text

### Affected Files

- `electron/src/evidence-negation.cts` (new): `affirmedText`, `negationChangedOutcome`.
- `electron/src/requirement-mapper.cts`: `evidenceSearchText` gains the `affirm` flag; `overlapScore` uses affirmed text; the explanation is wired to `negationChangedOutcome`.
- `tests/evidence-negation.test.cjs` (new), `tests/fixtures/negation-corpus.v1.json` (new), plus additions to `tests/requirement-mapper.test.cjs`.
- `package.json`: the new pure test is added to `test` and `test:unit` next to `requirement-mapper.test.cjs`.
- `docs/BACKLOG.md`, `CHANGELOG.md`, `docs/GOVERNANCE_INDEX.md` (Phase 15 row).

### Unit Tests

- `tests/evidence-negation.test.cjs` calls `affirmedText(input)`. It compares the output with internal whitespace collapsed to single spaces and trimmed, so punctuation must match exactly:

  | Input | Expected |
  | --- | --- |
  | "Never approved the vendor budget; reviewed vendor budget drafts." | "; reviewed vendor budget drafts." |
  | "Approved budgets, not invoices." | "Approved budgets, ." |
  | "Did not manage payroll but supported payroll audits." | "Did but supported payroll audits." |
  | "No experience with Python" | "" |
  | "Handled incident response without escalation" | "Handled incident response" |
  | "Did not handle budgets, payroll, or invoices." | "Did ." |
  | "Did not manage payroll, approved budgets." | "Did , approved budgets." |
  | "Migrated ERP with no downtime, reducing operational costs by 20%." | "Migrated ERP with , reducing operational costs by 20%." |
  | "No prior SQL experience, taught myself SQL and built dashboards." | ", taught myself SQL and built dashboards." |
  | "Built pipelines instead of manual reports, cutting reporting time 50%." | "Built pipelines , cutting reporting time 50%." |
  | "Handled all HR functions except payroll." | "Handled all HR functions ." |
  | "Reviewed vendor budgets rather than approving them." | "Reviewed vendor budgets ." |
  | "Built SQL. Did not manage payroll." | "Built SQL. Did ." |
  | "Not yet PMP certified; exam scheduled for March." | "; exam scheduled for March." |
  | "Didn't approve vendor budgets." / "Didn’t approve vendor budgets." | "." |
  | "Worked not without supervision." | "Worked ." |

  These inputs come back unchanged:
  - "Managed operations including but not limited to payroll, budgets, and vendor contracts."
  - "Managed no fewer than 12 engineers."
  - "Not only led the team but also hired staff."
  - "Built no-code automation tools."
  - "Led a not-for-profit fundraising program."
  - Text with no cue.
  - Non-Latin text.

  Further rows under the iteration-4 rules:

  | Input | Expected |
  | --- | --- |
  | "Migrated 40 servers to AWS with no downtime and reduced hosting costs 30%." | "Migrated 40 servers to AWS with and reduced hosting costs 30%." |
  | "Never missed a deadline, and reduced cycle time 15%." | unchanged (idiom) |
  | "Notably reduced claim processing time by 30%." | unchanged |
  | "No experience with SQL, Python, or Tableau." | "." |

  The limitations listed in LD1 are asserted with their exact strings from the corpus. For example, "Vendor budgets were never approved by me." becomes "Vendor budgets were ."
- `negationChangedOutcome` cases:
  - false for an unconfirmed record that scores 1.0 with no negation;
  - false for a negated but unusable credential;
  - true for negated confirmed A (raw 1.0, affirmed 0) when the final result is `transferable` from B;
  - true across pools: negated confirmed A with unconfirmed B as best.
- Further cases (already in the table above):
  - a negated comma list ("Did not handle budgets, payroll, or invoices.") removes everything after the cue;
  - each exclusion cue removes what follows ("Handled all HR functions except payroll." keeps "Handled all HR functions"; "Reviewed vendor budgets rather than approving them." keeps "Reviewed vendor budgets");
  - output is verbatim ("Built SQL. Did not manage payroll." becomes exactly "Built SQL." plus a space, keeping the period);
  - hyphen-joined cues are not cues ("Built no-code automation tools" and "Led a not-for-profit fundraising program" are unchanged);
  - known limitation: "Vendor budgets were never approved by me" keeps "Vendor budgets were".
- `tests/requirement-mapper.test.cjs` additions call `buildJobEvidenceCoverage` / `mapRequirementToEvidence` and assert classifications:
  - the fixture pair maps as `transferable`, and the explanation contains the negation note;
  - evidence negated in every clause ("Never approved vendor budgets.") against "Approved vendor budgets." maps as `gap`, with the note in the gap explanation;
  - negation in a different clause from the match does **not** downgrade: "Approved vendor budgets; did not manage payroll." stays `direct`;
  - evidence whose matched words sit before the cue ("Approved vendor budgets, not invoices.") stays `direct`;
  - a skill label is unaffected by statement negation: skills `["Budget approval"]` still supports "Budget approval";
  - an unconfirmed evidence path with negation never becomes `ambiguous` from a negated-only match;
  - an expired credential with no negation keeps its existing explanation with **no** negation note;
  - unconfirmed evidence with no negation that scores 1.0 is `ambiguous` with **no** negation note;
  - a ranking swap: negated evidence A (raw 1.0) and affirmed evidence B (0.67) give `transferable` with `evidenceId` B and the note;
  - "Did not handle budgets, payroll, or invoices." against "Payroll and invoices." maps as `gap`;
  - "Handled all HR functions except payroll." against "Handled payroll." does not map as `direct`;
  - "Migrated ERP with no downtime, reducing operational costs by 20%." against "Reduce operational costs." **stays `direct`**, with no note;
  - "Managed operations including but not limited to payroll, budgets, and vendor contracts." against "Manage vendor contracts." keeps its existing classification, with no note;
  - "Managed no fewer than 12 engineers." against "Manage engineers." keeps its existing classification;
  - "Not yet PMP certified; exam scheduled for March." (an experience record, not a credential) against "PMP certification." is **not** `direct`;
  - "Migrated 40 servers to AWS with no downtime and reduced hosting costs 30%." against "Reduce hosting costs." **stays `direct`**, with no note.

  The test helper adds no default skills, methods or other fields that could rescue a match.
- All existing deterministic suites run unchanged: `requirement-mapper.test.cjs`, `opportunity-assessment.test.cjs`, `universal-career-fixtures.test.cjs`, `military-transition-fixture.test.cjs`, `requirement-coverage-smoke-test.cjs`, `evidence-extension-smoke-test.cjs`, and the inference baseline and adversarial tests.

## Feature Inventory Touches

- n/a-justified: the user-facing coverage surface (`FX023`, `src/components/JobEvidenceCoverage.tsx:159`, tested by `tests/e2e/evidence-coverage.spec.ts`) is unchanged in source and route. Only the deterministic classification it displays becomes more accurate. The row stays as it is.

## Definition of Done

### Deliverable: Negation-aware deterministic mapping

- **D1**: Evidence that explicitly denies a requirement is no longer counted as support for it, while affirmed adjacent experience still counts, and explanations say why support was reduced.
- **D2**: `evidence-negation.cts` exists (at most 250 lines; each function at most 40 lines) and exports `affirmedText` and `negationChangedOutcome`. The mapper changes only by wiring: an `affirm` flag on `evidenceSearchText`, affirmed scoring, and one helper applied at the return sites. Thresholds and other logic are unchanged, and there is no inference import.
- **D3**: Ledger plan, audit, implement and seal entries; BACKLOG G12 closed and G13 linked; CHANGELOG; governance index row.
- **D4**: `node tests/evidence-negation.test.cjs`, including the full phrasing corpus, and `node tests/requirement-mapper.test.cjs` pass with the cases above; `npm test` and `npm run typecheck` pass; the adversarial baseline prints `negation-and-exclusion: deterministic=transferable`.

## CI Commands

- `npm test` - full suite, including existing deterministic mapping and assessment suites.
- `npm run typecheck` - TypeScript.
- `node tests/evidence-negation.test.cjs` - negation scope unit tests.
