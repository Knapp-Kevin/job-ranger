# Contributing to Job Ranger

Thanks for helping improve Job Ranger. The project is intentionally consumer-facing: contributions should make the job-search experience more reliable, understandable, private, and usable by people who do not have software-development expertise.

## Before You Start

Use an issue before beginning work that changes product behavior, architecture, persistence, security boundaries, packaging, or major dependencies. Small documentation corrections and narrowly scoped bug fixes can go directly to a pull request when the intent is obvious.

Security vulnerabilities should follow [SECURITY.md](./SECURITY.md), not a public issue containing exploit details.

## Product Boundaries

Contributions should preserve these principles:

- Core functionality remains useful without an inference provider.
- Local-first behavior is the default unless an explicit product decision changes it.
- The UI should describe user intent, not implementation jargon.
- Job-fit, resume, credential, and career claims must be evidence-aware and must not invent user experience.
- Unsupported source types must fail honestly rather than report fabricated success.
- Auto-apply or autonomous external actions require explicit governance and are not assumed merely because they are technically possible.

## Development Setup

Prerequisites:

- Node.js `>=20.19.0`
- npm
- `sqlite3` on `PATH`, or `SQLITE3_PATH` configured explicitly

```bash
npm ci
npm run repo:health
npm run electron:dev
```

## Pull Request Expectations

A pull request should:

1. Explain the user or maintenance problem being solved.
2. Keep the implementation no broader than necessary.
3. Update documentation when behavior, architecture, packaging, or public claims change.
4. Preserve existing security boundaries unless the PR explicitly strengthens them.
5. Include or update tests for behavior that can reasonably be automated.
6. Pass `npm run repo:health`.
7. Avoid mixing unrelated dependency, formatting, product, and documentation work into one change.

For user-facing changes, include screenshots when visual review materially helps reviewers judge the result.

## Dependency Changes

Patch and minor updates can be grouped when they are compatible and CI validates the result. Major-version changes are migrations, not routine hygiene. They should be reviewed for runtime requirements, ESM/CJS changes, packaging impact, Electron compatibility, and release behavior.

The coordinated toolchain modernization work is tracked in issue #38.

## Documentation Standards

Public documentation must distinguish:

- **shipped**: present in a published release;
- **implemented on main**: merged but not necessarily released;
- **in development**: active branch or pull request;
- **planned**: accepted direction without completed implementation;
- **historical**: retained for provenance but not current guidance.

Do not turn planning language into product claims.

## Licensing

By contributing, you agree that your contribution may be distributed under the repository's MIT License.

Do not copy third-party code into Job Ranger unless its license permits the intended use and its attribution requirements are preserved. Substantial adapted code must be documented in an appropriate notice file.

## Community

Participation is governed by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
