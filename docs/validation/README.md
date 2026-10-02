# Universal Validation

Job Ranger's universal-product claims are validated through maintained synthetic career fixtures rather than occupation-specific product modes.

- `UNIVERSAL_USER_STORY_MATRIX.md` maps US-0 through US-30 to required career contexts and validation state.
- `UNIVERSAL_FIXTURE_SCHEMA.md` governs fixture structure and change rules.
- `UNIVERSAL_FIXTURE_FINDINGS.md` records cross-context findings and product-model gaps exposed by the current fixture version.
- `../../tests/fixtures/universal-careers.v1.json` is the canonical synthetic fixture data used by automated domain tests.

The governing rule is simple: schema acceptance alone is not universality. A workflow must remain coherent, truthful, and useful across materially different career contexts without adding occupation-specific forks or silently changing evidence authority.
