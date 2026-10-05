const assert = require("node:assert/strict");

const {
  extractionAnchor,
  extractionCoverage,
  extractionText,
  extractionTokens,
} = require("../electron-runtime/electron/src/text-tokens.cjs");

// The Parseability Gate's tokenizer before it became Unicode-aware.
const legacyStopWords = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of",
  "on", "or", "the", "to", "with", "using", "through", "across", "within",
  "while", "that", "this", "these", "those", "is", "are", "was", "were",
]);
const legacyTokens = (value) =>
  value
    .toLowerCase()
    .match(/[a-z0-9+#.-]+/g)
    ?.map((token) => token.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((token) => token.length > 1 && !legacyStopWords.has(token)) ?? [];
const legacyText = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cases = [];
function test(name, fn) {
  cases.push([name, fn]);
}

test("ASCII tokens, normalized text and anchors match the legacy gate", () => {
  const samples = [
    "Reduced p95 latency 38% by rewriting the C# ingestion path in Go 1.21.",
    "Owned CI/CD for 40+ services; migrated Jenkins -> GitHub Actions (2019-2021).",
    "Jane Q. Example",
    "jane.example@example.com",
    "+1 (555) 010-2000",
    "Node.js, TypeScript, React, .NET, A/B testing, e-commerce -- end-to-end.",
  ];
  for (const sample of samples) {
    assert.deepEqual(extractionTokens(sample), legacyTokens(sample), sample);
    assert.equal(extractionText(sample), legacyText(sample), sample);
    assert.equal(
      extractionAnchor(sample),
      legacyTokens(sample).slice(0, 3).join(" "),
      sample,
    );
  }
});

test("Chinese statement is no longer invisible to the gate", () => {
  const statement = "负责数据平台项目管理，带领五人团队完成迁移";
  assert.deepEqual(legacyTokens(statement), [], "legacy saw nothing");
  assert.ok(extractionTokens(statement).length > 0);

  // Line wrapped mid-run by the PDF renderer: still fully covered.
  const wrapped = extractionText("负责数据平台项目\n管理，带领五人团队完成迁移");
  assert.equal(extractionCoverage(statement, wrapped), 1);

  // Second half lost in extraction: flagged (< 0.9).
  const truncated = extractionText("负责数据平台项目管理");
  assert.ok(extractionCoverage(statement, truncated) < 0.9);

  // Replacement characters from a missing font: flagged.
  const tofu = extractionText("□□□□□□□□□□□□□□□□□□□□");
  assert.equal(extractionCoverage(statement, tofu), 0);
});

test("Japanese, Korean, Thai and Cyrillic statements are covered", () => {
  const samples = [
    ["クラウド基盤の移行プロジェクトを担当しました", "クラウド基盤の移行プロ\nジェクトを担当しました"],
    ["데이터 플랫폼 이전 프로젝트를 관리했습니다", "데이터 플랫폼 이전\n프로젝트를 관리했습니다"],
    ["ผู้จัดการโครงการย้ายระบบข้อมูล", "ผู้จัดการโครงการ\nย้ายระบบข้อมูล"],
    ["Руководил миграцией платформы данных", "Руководил миграцией\nплатформы данных"],
  ];
  for (const [statement, extractedRaw] of samples) {
    assert.ok(extractionTokens(statement).length > 0, statement);
    assert.equal(extractionCoverage(statement, extractionText(extractedRaw)), 1, statement);
    assert.ok(extractionCoverage(statement, extractionText("unrelated text")) < 0.9, statement);
  }
});

test("RTL text is checked by glyphs, not extractor order", () => {
  // Captured from the bundled extractor on Chromium-rendered PDFs: Arabic and
  // Hebrew come back in visual, partly scrambled order.
  const fixtures = [
    [
      "إدارة مشروع ترحيل البيانات وقيادة فريق من خمسة مهندسين",
      "ةرادإ مشرعو ترحيل البيانات وقياةد فريق من خمسة مهندسين",
    ],
    [
      "ניהול פרויקט הגירת נתונים והובלת צוות של חמישה מהנדסים",
      "ינריגה טקיורפ לוהינותנ תבוהו םלהשימח לש תווצ ת דנהמיסם",
    ],
  ];
  for (const [statement, extractedRaw] of fixtures) {
    const extracted = extractionText(extractedRaw);
    assert.equal(extractionCoverage(statement, extracted), 1, statement);
    // Half the glyphs lost: flagged.
    const half = extractionText(extractedRaw.slice(0, Math.floor(extractedRaw.length / 2)));
    assert.ok(extractionCoverage(statement, half) < 0.9, statement);
    // No reliable reading-order anchor for RTL-led statements.
    assert.equal(extractionAnchor(statement), "");
  }
});

test("Non-Latin contact names are checked", () => {
  for (const name of ["山田 太郎", "王小明", "김민준", "Иван Петров", "José Núñez", "محمد أحمد"]) {
    assert.ok(extractionTokens(name).length > 0, name);
    assert.equal(extractionCoverage(name, extractionText(`${name}\nemail`)), 1, name);
    assert.ok(extractionCoverage(name, extractionText("email phone")) < 0.8, name);
  }
});

test("Normalization tolerates extraction artifacts", () => {
  // Ligatures and full-width forms from PDF text layers.
  assert.equal(
    extractionCoverage("Certified data platform", extractionText("Certiﬁed data platform")),
    1,
  );
  assert.equal(
    extractionCoverage("Python 開発", extractionText("Ｐｙｔｈｏｎ 開発")),
    1,
  );
  // Decomposed accents compare equal to precomposed ones.
  assert.equal(
    extractionCoverage("Gestión de proyectos", extractionText("Gestión de proyectos")),
    1,
  );
});

test("Reading order anchors work for unspaced scripts", () => {
  const first = "负责数据平台项目管理";
  const second = "带领五人团队完成迁移";
  const extracted = extractionText(`${first}\n${second}`);
  const a = extracted.indexOf(extractionAnchor(first));
  const b = extracted.indexOf(extractionAnchor(second));
  assert.ok(a >= 0 && b > a, `anchors ${a} ${b}`);
  // Mixed Latin + Han: anchor stops before the unspaced chunk.
  assert.equal(extractionAnchor("Python 开发 平台"), "python");
});

let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}\n${error.stack}`);
  }
}
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log("Parseability Gate tokenizer tests passed.");
}
