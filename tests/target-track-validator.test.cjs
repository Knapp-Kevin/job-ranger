const assert = require("node:assert/strict");

const {
  validateCareerTargetTrackInput,
} = require("../electron-runtime/electron/src/target-track-validator.cjs");

function validTrack() {
  return {
    name: "Flexible search",
    relation: "target",
    roleTitles: [],
    seniority: null,
    direction: null,
    constraints: {
      geography: { locations: [], radiusMiles: null, strength: "preferred" },
      workModes: { values: [], strength: "preferred" },
      employmentArrangements: { values: [], strength: "preferred" },
      compensation: {
        floor: null,
        target: null,
        basis: "annual",
        floorStrength: "preferred",
      },
      onCall: { value: "either", strength: "preferred" },
      industries: { values: [], strength: "preferred" },
    },
    isActive: true,
  };
}

assert.equal(validateCareerTargetTrackInput(validTrack()).name, "Flexible search");

assert.throws(
  () =>
    validateCareerTargetTrackInput({
      ...validTrack(),
      constraints: {
        ...validTrack().constraints,
        workModes: { values: [], strength: "required" },
      },
    }),
  /cannot be required without at least one value/i,
);

assert.throws(
  () =>
    validateCareerTargetTrackInput({
      ...validTrack(),
      constraints: {
        ...validTrack().constraints,
        compensation: {
          floor: 100000,
          target: 90000,
          basis: "annual",
          floorStrength: "required",
        },
      },
    }),
  /target cannot be below/i,
);

assert.throws(
  () =>
    validateCareerTargetTrackInput({
      ...validTrack(),
      constraints: {
        ...validTrack().constraints,
        geography: {
          locations: ["Annapolis, MD"],
          radiusMiles: 25,
          strength: "unspecified",
        },
      },
    }),
  /required, preferred, or target/i,
  "unspecified is migration-only and must not be accepted from authored IPC input",
);

assert.throws(
  () =>
    validateCareerTargetTrackInput({
      ...validTrack(),
      constraints: {
        ...validTrack().constraints,
        compensation: {
          floor: null,
          target: 120000,
          basis: "annual",
          floorStrength: "required",
        },
      },
    }),
  /floor cannot be required without a floor value/i,
);

console.log("Target track validator tests passed!");
