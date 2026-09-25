# Third-Party Notices

## career-ops lineage

Job Ranger is an independent project. Some career-search workflow concepts in Job Ranger's career intelligence work were informed by the open-source **career-ops** project by Santiago Fernández de Valderrama.

- Upstream project: `career-ops-hq/career-ops`
- License: MIT
- Relationship: independent project; no endorsement, sponsorship, certification, or official affiliation is implied.
- Branding: Job Ranger does not use the career-ops name as a product name, logo, or "powered by" claim.

Where Job Ranger incorporates or adapts code from career-ops, the following MIT notice applies to those portions:

```text
MIT License

Copyright (c) 2026 Santiago Fernández de Valderrama

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Career-ops also publishes a separate trademark policy covering its project name and brand. Job Ranger's attribution above is descriptive lineage only and is intentionally written to avoid implying an official relationship.

## Anydoc

Job Ranger uses **Anydoc** for local extraction of text-bearing DOCX and PDF resume documents. Job Ranger invokes the packaged parser directly and keeps hosted OCR disabled by default; imported content is preserved and proposed as reviewable career evidence rather than automatically becoming user-confirmed fact.

- Project: `firecrawl/anydoc`
- Version adopted: `0.2.4`
- License: MIT
- Copyright: Copyright (c) 2026 Sideguide Technologies Inc.
- Relationship: third-party runtime dependency; no endorsement, sponsorship, or official affiliation is implied.

The following MIT notice applies to Anydoc and its packaged platform-native components:

```text
MIT License

Copyright (c) 2026 Sideguide Technologies Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## SQLite

Job Ranger's packaged Windows release includes the official SQLite command-line shell so normal users do not need to install a separate SQLite executable.

- Project: SQLite
- Distribution source: `sqlite.org`
- Bundled Windows release line: SQLite 3.53.4 x64 command-line shell
- Status: SQLite's authors dedicate the SQLite deliverable code to the public domain; no SQLite license is required for redistribution of the bundled executable.
- Release integrity: the Windows release workflow downloads the pinned official tools archive and verifies its published SHA3-256 digest before extracting `sqlite3.exe`.

SQLite is a separate project. Its inclusion does not imply endorsement of Job Ranger by the SQLite authors or Hwaci.
