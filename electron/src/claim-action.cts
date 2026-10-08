// Claim-action cap for deterministic requirement mapping (G13, #168).
// A confirmed `direct` result is capped at `transferable` only when the
// evidence shows a RECIPIENT role (passive, recipient/attendee verb, or a
// completed course) in a clause about the requirement, AND the requirement's
// claim verb has no active counterpart in the evidence. Evidence without a
// recipient marker is never capped, so synonyms of any kind keep `direct`.
// No model; English only. Rules: docs/plan-qor-phase16-mapper-claim-action.md.
//
// Known limitations (tests/fixtures/action-corpus.v1.json): recipient phrasings
// outside the marker list, participial adjectives, claim verbs outside the five
// families, credential-classified requirements, incidental word overlap in an
// unrelated clause, recipient verbs about something else in a shared clause,
// "completed ... training/program" the user delivered, coordinated passives, and
// the one-word "-ly" skip also passing over non-adverb "-ly" words.

import type { CandidateEvidence } from "../../src/shared/career-contracts.js";
import { affirmedText } from "./evidence-negation.cjs";

type Form = "base" | "s" | "past" | "ing" | "agent";
type Family = "lead" | "build" | "coordinate" | "train" | "approve";

// Each entry: base | -s | past/participle forms | -ing | agent nouns ("" = none). Comma-separated where several.
const LEXICON: Record<Family, string[]> = {
  lead: [
    "lead|leads|led|leading|leader", "manage|manages|managed|managing|manager",
    "direct|directs|directed|directing|director", "oversee|oversees|oversaw,overseen|overseeing|",
    "supervise|supervises|supervised|supervising|supervisor", "head|heads|headed|heading|", "run|runs|ran|running|",
    "administer|administers|administered|administering|administrator", "own|owns|owned|owning|owner",
    "spearhead|spearheads|spearheaded|spearheading|", "drive|drives|drove,driven|driving|",
  ],
  build: [
    "build|builds|built|building|builder", "develop|develops|developed|developing|developer",
    "create|creates|created|creating|creator", "design|designs|designed|designing|designer",
    "engineer|engineers|engineered|engineering|", "implement|implements|implemented|implementing|",
    "architect|architects|architected|architecting|",
  ],
  coordinate: [
    "coordinate|coordinates|coordinated|coordinating|coordinator",
    "organize,organise|organizes,organises|organized,organised|organizing,organising|organizer,organiser",
    "schedule|schedules|scheduled|scheduling|scheduler", "arrange|arranges|arranged|arranging|",
    "plan|plans|planned|planning|planner",
  ],
  train: [
    "train|trains|trained|training|trainer", "teach|teaches|taught|teaching|teacher", "coach|coaches|coached|coaching|",
    "mentor|mentors|mentored|mentoring|", "instruct|instructs|instructed|instructing|instructor",
  ],
  approve: ["approve|approves|approved|approving|approver", "authorize,authorise|authorizes,authorises|authorized,authorised|authorizing,authorising|"],
};

const FORMS: readonly Form[] = ["base", "s", "past", "ing", "agent"];
const WORD_FORM = new Map<string, { family: Family; form: Form }>(
  (Object.entries(LEXICON) as Array<[Family, string[]]>).flatMap(([family, entries]) =>
    entries.flatMap((entry) =>
      entry.split("|").flatMap((words, index) =>
        words.split(",").filter(Boolean).map((word): [string, { family: Family; form: Form }] => [word, { family, form: FORMS[index] }]),
      ),
    ),
  ),
);

const set = (words: string) => new Set(words.split(" "));
const PASSIVE_AUX = set("was were been being is are am be got get gets getting");
const REQUIREMENT_ING_PREDECESSORS = set("experience for in of at with and to including on");
const EVIDENCE_ING_PREDECESSORS = set("for in of by while and including to with , been am is are was were be");
const RECIPIENT_VERBS = set("received receiving attended attending participated participating enrolled benefited");
const COURSE_NOUNS = set("training trainings course courses class classes workshop workshops program programs bootcamp bootcamps seminar seminars certification certifications");
const IRREGULAR_PARTICIPLES = set("paid taught led run built shown told made sent held brought overseen driven");
const NON_RECIPIENT_PARTICIPLES = set(
  "tasked entrusted charged promoted appointed selected named hired chosen assigned asked elected recruited given " +
    "experienced skilled certified licensed qualified dedicated committed responsible recognized recognised awarded",
);
const OTHER_PARTY = set("by from with");
const TITLE_FOLLOWERS = set("for of at ,");

export interface ClaimVerb {
  word: string;
  family: Family;
}

function clauses(text: string): string[][] {
  return text
    .toLowerCase()
    .split(/[.;:!?\n]+/)
    .map((clause) => clause.match(/[a-z]+|,/g) ?? [])
    .filter((tokens) => tokens.some((token) => token !== ","));
}

function previousIndex(tokens: string[], index: number): number {
  return tokens[index - 1]?.endsWith("ly") ? index - 2 : index - 1;
}

/** The requirement's first claim verb from the lexicon, or null (never capped). */
export function claimVerb(requirementText: string): ClaimVerb | null {
  const tokens = requirementText.toLowerCase().match(/[a-z]+/g) ?? [];
  for (let index = 0; index < tokens.length; index += 1) {
    const hit = WORD_FORM.get(tokens[index]);
    if (!hit || hit.form === "agent") continue;
    if (index > 0 && hit.form === "ing" && !REQUIREMENT_ING_PREDECESSORS.has(tokens[index - 1])) continue;
    return { word: tokens[index], family: hit.family };
  }
  return null;
}

function isRecipientParticiple(word: string): boolean {
  if (NON_RECIPIENT_PARTICIPLES.has(word)) return false;
  return (word.length >= 5 && word.endsWith("ed")) || IRREGULAR_PARTICIPLES.has(word);
}

function auxiliaryLeadsClause(tokens: string[], auxiliaryIndex: number): boolean {
  const lead = tokens[0] === "i" || tokens[0] === "we" ? 1 : 0;
  return auxiliaryIndex === lead;
}

function markerAt(tokens: string[], index: number): boolean {
  const word = tokens[index];
  if (RECIPIENT_VERBS.has(word)) return !(tokens[index + 1] === "and" || tokens[index + 1] === ",");
  if (word === "completed") return tokens.slice(index + 1).some((next) => COURSE_NOUNS.has(next));
  if (!isRecipientParticiple(word)) return false;
  const auxiliary = previousIndex(tokens, index);
  return PASSIVE_AUX.has(tokens[auxiliary]) && auxiliaryLeadsClause(tokens, auxiliary);
}

/** True when a clause shows a recipient role; with requirementText, only clauses sharing a 4+ letter requirement word count. */
export function hasRecipientMarker(evidenceText: string, requirementText?: string): boolean {
  const requirementWords = requirementText
    ? new Set((requirementText.toLowerCase().match(/[a-z]+/g) ?? []).filter((word) => word.length >= 4))
    : null;
  return clauses(evidenceText).some((tokens) => {
    if (requirementWords && !tokens.some((token) => token.length >= 4 && requirementWords.has(token))) return false;
    return tokens.some((_, index) => markerAt(tokens, index));
  });
}

function activeAt(tokens: string[], index: number, form: Form): boolean {
  const previous = tokens[previousIndex(tokens, index)];
  if (form === "agent") {
    const words = tokens.slice(0, index).filter((token) => token !== ",").slice(-3);
    return !words.some((word) => OTHER_PARTY.has(word));
  }
  if (form === "past") return !PASSIVE_AUX.has(previous);
  if (form === "ing") return index === 0 || EVIDENCE_ING_PREDECESSORS.has(previous);
  if (index === 0 || previous === "and" || previous === "to" || previous === ",") return true;
  const word = tokens[index];
  return (word === "lead" || word === "head") && (index === tokens.length - 1 || TITLE_FOLLOWERS.has(tokens[index + 1]));
}

/** True when a word of the family appears in an active position in any clause. */
export function activelySatisfies(evidenceText: string, family: Family): boolean {
  return clauses(evidenceText).some((tokens) =>
    tokens.some((token, index) => {
      const hit = WORD_FORM.get(token);
      return hit !== undefined && hit.family === family && activeAt(tokens, index, hit.form);
    }),
  );
}

/** The user's own prose and labels, one field per line. Organization, metrics and credential fields are excluded. */
export function claimActionText(evidence: CandidateEvidence, affirm: boolean): string {
  const prose = (value: string | null): string | null => (value && affirm ? affirmedText(value) : value);
  return [
    prose(evidence.statement), prose(evidence.action), prose(evidence.context), evidence.titleOrName,
    ...evidence.skills, ...evidence.methodsOrTools, ...evidence.scope.map(prose), ...evidence.outcomes.map(prose),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

export const CLAIM_ACTION_NOTE_PREFIX = "The evidence does not show you performing this requirement's action";

export function claimActionNote(verb: string): string {
  return `${CLAIM_ACTION_NOTE_PREFIX} ("${verb}"); it describes receiving, attending, or being the object of it, so it is not counted as direct support.`;
}

/** True when this record must not count as direct support for a requirement with this claim verb. */
export function isCapped(evidence: CandidateEvidence, requirementText: string, verb: ClaimVerb, affirm: boolean): boolean {
  const text = claimActionText(evidence, affirm);
  return hasRecipientMarker(text, requirementText) && !activelySatisfies(text, verb.family);
}

/** LD2(b): the first ranked, confirmed record at the direct threshold that is not capped. */
export function selectUncapped<T extends { evidence: CandidateEvidence; score: number }>(
  ranked: readonly T[],
  isConfirmed: (evidence: CandidateEvidence) => boolean,
  capped: (evidence: CandidateEvidence) => boolean,
): T | null {
  return ranked.find((item) => item.score >= 0.7 && isConfirmed(item.evidence) && !capped(item.evidence)) ?? null;
}
