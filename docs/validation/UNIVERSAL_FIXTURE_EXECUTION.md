# Universal Fixture Execution

Validation owner: #87

The automated harness is `tests/universal-career-fixtures.test.cjs` and is part of both `npm test` and `npm run test:unit`.

For each fixture it:

1. constructs a production-shaped Career Target Track;
2. constructs user-authored Career Evidence;
3. constructs a normalized synthetic Job;
4. runs the production requirement extractor;
5. runs the production requirement-to-Career-Evidence mapper;
6. runs the production selected-track opportunity assessment;
7. asserts the fixture's expected coverage and assessment behavior.

The harness also asserts that all ten matrix fixture codes are present and that each fixture records at least one known model pressure. Credential-heavy and career-change fixtures assert the presence of credential and transferable mappings respectively.

This is deliberately a domain-level regression suite. It complements rather than replaces Electron E2E. #87 remained open after this slice because representative end-to-end fixture paths and broader US-0 through US-30 evidence were still required. (#87 has since been completed; see [`UNIVERSAL_USER_STORY_MATRIX.md`](./UNIVERSAL_USER_STORY_MATRIX.md).)
