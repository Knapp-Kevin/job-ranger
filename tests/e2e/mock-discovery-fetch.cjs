if (process.env.JOB_RANGER_E2E_DISCOVERY_MOCK === "1") {
  const dnsPromises = require("node:dns/promises");
  const originalLookup = dnsPromises.lookup.bind(dnsPromises);
  const originalFetch = globalThis.fetch.bind(globalThis);

  dnsPromises.lookup = async (hostname, options) => {
    if (hostname === "remoteok.com" || hostname === "www.arbeitnow.com") {
      const result = { address: "8.8.8.8", family: 4 };
      return options && typeof options === "object" && options.all ? [result] : result;
    }
    return originalLookup(hostname, options);
  };

  const remoteOkRows = [
    { legal: "fixture metadata row" },
    {
      id: 8501,
      company: "Acme Discovery",
      position: "Customer Success Manager",
      location: "Remote",
      description: "<p>Own customer onboarding and adoption outcomes.</p>",
      date: "2026-10-03T00:00:00Z",
      url: "https://remoteok.com/remote-jobs/8501",
      apply_url: "https://boards.greenhouse.io/acme-discovery/jobs/8501",
    },
  ];

  const arbeitnowRows = {
    data: [
      {
        slug: "beta-customer-success",
        company_name: "Beta Discovery",
        title: "Customer Success Specialist",
        description: "Support customers across implementation and adoption.",
        remote: true,
        url: "https://www.arbeitnow.com/jobs/beta-customer-success",
        tags: ["customer success"],
        job_types: ["Full-time"],
        location: "Remote",
        created_at: 1790985600,
      },
    ],
  };

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://remoteok.com/api") {
      return new Response(JSON.stringify(remoteOkRows), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url === "https://www.arbeitnow.com/api/job-board-api?page=1") {
      return new Response(JSON.stringify(arbeitnowRows), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return originalFetch(input, init);
  };
}
