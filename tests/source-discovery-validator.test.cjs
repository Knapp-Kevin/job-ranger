const assert = require("node:assert/strict");
const {
  validateSourceDiscoveryRequest,
} = require("../electron-runtime/electron/src/source-discovery-validator.cjs");

const valid = validateSourceDiscoveryRequest({
  targetTrackId: "track-1",
  roleTitles: ["Customer Success Manager", "Implementation Manager"],
  locations: ["Baltimore, MD"],
  limit: 24,
});
assert.deepEqual(valid, {
  targetTrackId: "track-1",
  roleTitles: ["Customer Success Manager", "Implementation Manager"],
  locations: ["Baltimore, MD"],
  limit: 24,
});

assert.throws(
  () =>
    validateSourceDiscoveryRequest({
      targetTrackId: "track-1",
      roleTitles: [],
      locations: [],
      limit: 24,
    }),
  /At least one target role is required/,
);

assert.throws(
  () =>
    validateSourceDiscoveryRequest({
      targetTrackId: "track-1",
      roleTitles: Array.from({ length: 13 }, (_, index) => `Role ${index}`),
      locations: [],
      limit: 24,
    }),
  /too many values/,
);

assert.throws(
  () =>
    validateSourceDiscoveryRequest({
      targetTrackId: "track-1",
      roleTitles: ["Engineer"],
      locations: [],
      limit: 12.5,
    }),
  /must be an integer/,
);

const clamped = validateSourceDiscoveryRequest({
  targetTrackId: "track-1",
  roleTitles: ["Engineer"],
  locations: [],
  limit: 500,
});
assert.equal(clamped.limit, 40);

console.log("source discovery validator passed");
