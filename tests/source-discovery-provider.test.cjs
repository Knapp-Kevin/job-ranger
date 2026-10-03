const assert = require("node:assert/strict");
const {
  discoverPublicJobFeeds,
} = require("../electron-runtime/electron/src/source-discovery.cjs");

const request = {
  targetTrackId: "track-cs",
  roleTitles: ["Customer Success Manager"],
  locations: ["Baltimore, MD"],
  limit: 24,
};

const remoteRows = [
  { legal: "metadata row, not a job" },
  {
    id: 101,
    company: "Acme",
    position: "Customer Success Manager",
    location: "Remote",
    description: "<p>Own onboarding and customer outcomes.</p>",
    date: "2026-10-02T12:00:00Z",
    url: "https://remoteok.com/remote-jobs/101",
    apply_url: "https://boards.greenhouse.io/acme/jobs/101",
  },
  {
    id: 102,
    company: "Noisy Co",
    position: "Backend Engineer",
    location: "Remote",
    url: "https://remoteok.com/remote-jobs/102",
    apply_url: "https://jobs.lever.co/noisy/123",
  },
  {
    id: 103,
    company: "Unsafe Co",
    position: "Customer Success Manager",
    location: "Remote",
    url: "https://remoteok.com/remote-jobs/103",
    apply_url: "javascript:alert(1)",
  },
];

const arbeitnowRows = {
  data: [
    {
      slug: "beta-customer-success",
      company_name: "Beta GmbH",
      title: "Customer Success Specialist",
      description: "Support enterprise customers across Europe.",
      remote: true,
      url: "https://www.arbeitnow.com/jobs/beta-customer-success",
      tags: ["customer success"],
      job_types: ["Full-time"],
      location: "Berlin / Remote",
      created_at: 1790932800,
    },
  ],
};

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function successfulFetch(url) {
  const value = String(url);
  if (value.includes("remoteok.com")) return Promise.resolve(jsonResponse(remoteRows));
  if (value.includes("arbeitnow.com")) return Promise.resolve(jsonResponse(arbeitnowRows));
  throw new Error(`Unexpected URL ${value}`);
}

(async () => {
  const result = await discoverPublicJobFeeds(request, {
    fetchImpl: successfulFetch,
    existingCompanies: [],
    now: () => "2026-10-03T12:00:00.000Z",
  });

  assert.equal(result.coverage, "partial");
  assert.equal(result.generatedAt, "2026-10-03T12:00:00.000Z");
  assert.deepEqual(result.searchedLocations, ["Baltimore, MD"]);
  assert.equal(result.candidates.length, 3);
  assert.ok(!result.candidates.some((candidate) => candidate.employerName === "Noisy Co"));

  const acme = result.candidates.find((candidate) => candidate.employerName === "Acme");
  assert.ok(acme, "matching Remote OK opportunity should be returned");
  assert.equal(acme.sourceType, "greenhouse");
  assert.equal(acme.sourceUrl, "https://boards.greenhouse.io/acme");
  assert.equal(acme.canMonitor, true);
  assert.equal(acme.duplicateCompanyId, null);
  assert.equal(acme.provenanceUrl, "https://remoteok.com/remote-jobs/101");
  assert.match(acme.summary, /Own onboarding/);

  const unsafe = result.candidates.find((candidate) => candidate.employerName === "Unsafe Co");
  assert.ok(unsafe);
  assert.equal(unsafe.sourceUrl, null);
  assert.equal(unsafe.canMonitor, false);

  const arbeitnow = result.candidates.find((candidate) => candidate.employerName === "Beta GmbH");
  assert.ok(arbeitnow);
  assert.equal(arbeitnow.sourceUrl, null);
  assert.equal(arbeitnow.canMonitor, false);
  assert.equal(arbeitnow.employmentType, "Full-time");

  const duplicateResult = await discoverPublicJobFeeds(request, {
    fetchImpl: successfulFetch,
    existingCompanies: [
      {
        id: "company-9",
        name: "Acme",
        url: "https://boards.greenhouse.io/acme/jobs/999",
        sourceType: "greenhouse",
        sourceIdentifier: "acme",
      },
    ],
  });
  const duplicate = duplicateResult.candidates.find((candidate) => candidate.employerName === "Acme");
  assert.ok(duplicate);
  assert.equal(duplicate.canMonitor, false);
  assert.equal(duplicate.duplicateCompanyId, "company-9");

  const partialResult = await discoverPublicJobFeeds(request, {
    fetchImpl: async (url) => {
      if (String(url).includes("remoteok.com")) throw new Error("feed offline");
      return jsonResponse(arbeitnowRows);
    },
    existingCompanies: [],
  });
  assert.equal(partialResult.coverage, "partial");
  assert.ok(partialResult.candidates.some((candidate) => candidate.employerName === "Beta GmbH"));
  assert.ok(partialResult.warnings.some((warning) => /Remote OK was unavailable/.test(warning)));

  const unavailableResult = await discoverPublicJobFeeds(request, {
    fetchImpl: async () => {
      throw new Error("network unavailable");
    },
    existingCompanies: [],
  });
  assert.equal(unavailableResult.coverage, "unavailable");
  assert.equal(unavailableResult.candidates.length, 0);
  assert.ok(unavailableResult.warnings.some((warning) => /Remote OK was unavailable/.test(warning)));
  assert.ok(unavailableResult.warnings.some((warning) => /Arbeitnow was unavailable/.test(warning)));

  console.log("source discovery provider passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
