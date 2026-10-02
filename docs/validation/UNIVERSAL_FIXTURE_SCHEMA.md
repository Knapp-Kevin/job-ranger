# Universal Fixture Schema

Validation owner: #87

The canonical fixture document is `tests/fixtures/universal-careers.v1.json`.

## Contract

Each fixture contains:

- `code`: stable short identifier matching the validation matrix;
- `context`: human-readable career context;
- `targetTrack`: one canonical Career Target Track intent/constraint record;
- `evidence`: synthetic Career Evidence inputs using the same subject categories as production;
- `job`: a synthetic normalized job record passed through the production requirement extractor;
- `expected`: deterministic assertions for eligibility, career alignment, preference alignment, requirement coverage, and selected special cases;
- `knownModelPressures`: concrete model/UX gaps exposed by the context.

The fixture harness supplies backend-owned IDs, timestamps, origin, and verification state rather than storing them in the JSON.

## Rules

1. Fixtures must contain no real-person PII and no irrelevant sensitive traits.
2. Fixtures must use production contracts and production deterministic logic. A second fixture-only scoring or mapping engine is prohibited.
3. Fixture expectations must describe product behavior, not force product behavior. If a reasonable fixture fails because the product model is incomplete, record the failure and create/link a product issue instead of weakening the fixture.
4. Occupation-specific concepts may appear in synthetic evidence/job text, but should not create occupation-specific code paths.
5. A proposed universal field needs evidence from the fixture set or another documented workflow. A single-context convenience is insufficient by itself.
6. `knownModelPressures` are findings, not automatic implementation requirements. Cross-context recurrence and user value determine whether they graduate into the universal model.
7. Changes to fixture expectations require review with the same care as changes to production behavior because silently changing the expected answer defeats the point of regression tests.

## Versioning

The current document version is `1`. Breaking fixture-contract changes increment the top-level version and should either preserve the prior fixture file or include an explicit migration rationale in the validating PR.
