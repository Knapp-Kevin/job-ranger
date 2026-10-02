# Universal Career Fixture Findings

Validation owner: #87  
Fixture data: `tests/fixtures/universal-careers.v1.json`

## Purpose

These fixtures are deliberately synthetic career contexts used to expose assumptions in Job Ranger's universal career model. They are not product personas, market segments, or occupation-specific modes.

The regression test runs every fixture through the production requirement extractor, requirement-to-Career-Evidence mapper, and selected-track opportunity assessment. A fixture is useful when it either passes without a special-case code path or exposes a concrete product-model gap that should be handled generically.

## Fixture set

| Code | Context | Primary modeled pressure | Current finding |
| --- | --- | --- | --- |
| HL | Hourly/local worker | hourly compensation, commute, on-site work | Core model works; shift/schedule availability remains a real target-track gap. |
| TR | Skilled trades | credential-heavy evidence, geography, hourly pay | Core flow works; credential issuer/jurisdiction/status/expiration need richer evidence semantics. |
| HC | Licensed healthcare | licensed work, hourly pay, on-site requirements | Core flow works; license jurisdiction/expiration and shift availability remain gaps. |
| TE | Technical/portfolio-heavy | project evidence, remote work, annual compensation | Core flow works; portfolio/work-sample references need a governed evidence representation. |
| GR | Recent graduate/first job | sparse employment history, education/projects | Core flow works without requiring conventional employment history. |
| EX | Senior executive/confidential search | seniority, annual compensation, search discretion | Core flow works; travel tolerance and confidential-search preferences are not first-class. |
| CC | Career changer | transferable evidence, adjacent-role intent | Transferable evidence remains distinct from direct evidence and participates in assessment. |
| FG | Federal/government applicant | specialized experience, process/artifact differences | Core evidence/assessment flow works; grade/series/eligibility and federal artifact rules remain distinct gaps. |
| CF | Contractor/freelancer | contract/freelance arrangements, project evidence, hourly pay | Core flow works without assuming permanent employment; engagement chronology and portfolio references need richer semantics. |
| RT | Return-to-work/nonlinear history | volunteer/project evidence, non-linear chronology | Core flow works without penalizing timeline gaps or requiring conventional employment chronology. |

## Cross-cutting findings

### Proven by the current fixture suite

- The same target-track contract can represent hourly and annual compensation without occupation-specific branches.
- Full-time employment is not a universal assumption; contract, freelance, part-time, and internship-capable values remain part of the same model.
- Career Evidence from roles, projects, education, credentials, and volunteer-like project work can participate in the same deterministic requirement mapper.
- Career changers can receive transferable mappings without rewriting adjacent experience as direct experience.
- Sparse or nonlinear conventional employment history is not itself treated as negative evidence.
- Credential-heavy roles can be assessed without creating a healthcare/trades-specific assessment engine.
- Missing or unsupported facts remain gaps/unknowns rather than becoming invented qualifications.

### Product-model gaps exposed by multiple fixtures

These are candidates for generic model expansion because more than one materially different fixture needs them:

1. **Schedule / shift availability**: exposed by hourly/local and licensed-healthcare contexts. This belongs in target-track constraints rather than an occupation-specific UI.
2. **Richer credential semantics**: issuer, jurisdiction, status, expiration/valid-through, and possibly credential identifier where the user chooses to store it. Exposed by trades and healthcare.
3. **Portfolio / work-sample references**: exposed by technical and contractor/freelancer contexts. The representation should support safe links or local references without turning the evidence model into a document dump.
4. **Travel tolerance**: exposed by executive work and plausibly other roles. It belongs in optional search constraints if validated further.

### Gaps that remain context-specific until broader evidence appears

- federal grade/series/eligibility semantics;
- federal resume/application artifact rules;
- confidential-search/discretion preferences.

Those should not become global required fields merely because one fixture needs them. The governing question remains whether a generic optional capability improves more than one legitimate workflow without contaminating everyone else's UI.

## Governance conclusion

The fixture suite supports the existing universal architecture: shared Career Evidence plus independent Career Target Tracks and deterministic opportunity assessment. It does **not** justify occupation-specific product forks.

The suite does justify targeted expansion of the universal model where multiple contexts expose the same missing concept. Those expansions should remain optional, progressively disclosed, and governed by #83/#84 rather than implemented inside the fixture layer.
