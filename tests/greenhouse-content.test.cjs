// Regression: the Greenhouse Job Board API returns entity-escaped HTML in
// `content`. Requirement extraction must see real paragraph/list structure.
const assert = require('node:assert/strict');
const { greenhouseAdapter, unescapeGreenhouseContent } = require('../electron-runtime/electron/src/adapters/greenhouse.cjs');

(async () => {
  assert.equal(unescapeGreenhouseContent('&lt;li&gt;A &amp;amp; B&lt;/li&gt;'), '<li>A &amp; B</li>');
  assert.equal(unescapeGreenhouseContent('<li>Already HTML &amp; fine</li>'), '<li>Already HTML &amp; fine</li>');
  const fixture = {
    jobs: [{
      id: 7,
      title: 'Medical Office Coordinator',
      absolute_url: 'https://boards.greenhouse.io/harbor/jobs/7',
      location: { name: 'Baltimore, MD' },
      content: '&lt;ul&gt;&lt;li&gt;Patient scheduling experience is required.&lt;/li&gt;&lt;li&gt;BLS is preferred.&lt;/li&gt;&lt;/ul&gt;&lt;p&gt;Salary: $52,000 - $68,000&lt;/p&gt;',
    }],
  };
  const jobs = await greenhouseAdapter.scrape('harbor', {
    fetchImpl: async () => new Response(JSON.stringify(fixture), { status: 200 }),
    timeoutMs: 1000,
    retryCount: 0,
    userAgent: 'test',
  });
  assert.equal(jobs.length, 1);
  assert.doesNotMatch(jobs[0].descriptionText, /&lt;|<li>/);
  assert.match(jobs[0].descriptionText, /Patient scheduling experience is required\. BLS is preferred\./);
  assert.equal(jobs[0].salaryMin, 52000);
  assert.equal(jobs[0].extractionVersion, 'greenhouse-api-v2');
  console.log('Greenhouse content regression passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
