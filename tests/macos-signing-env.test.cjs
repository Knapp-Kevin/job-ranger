const assert = require("node:assert/strict");

const {
  createMacSigningEnvironment,
} = require("../scripts/macos-signing-env.cjs");

function run() {
  const blank = createMacSigningEnvironment({
    PATH: "/usr/bin",
    CSC_LINK: "",
    CSC_KEY_PASSWORD: "",
  });
  assert.equal(blank.PATH, "/usr/bin");
  assert.equal(Object.hasOwn(blank, "CSC_LINK"), false);
  assert.equal(Object.hasOwn(blank, "CSC_KEY_PASSWORD"), false);

  const partialLink = createMacSigningEnvironment({
    CSC_LINK: "certificate-base64",
    CSC_KEY_PASSWORD: "   ",
  });
  assert.equal(Object.hasOwn(partialLink, "CSC_LINK"), false);
  assert.equal(Object.hasOwn(partialLink, "CSC_KEY_PASSWORD"), false);

  const partialPassword = createMacSigningEnvironment({
    CSC_LINK: " ",
    CSC_KEY_PASSWORD: "secret",
  });
  assert.equal(Object.hasOwn(partialPassword, "CSC_LINK"), false);
  assert.equal(Object.hasOwn(partialPassword, "CSC_KEY_PASSWORD"), false);

  const signed = createMacSigningEnvironment({
    CSC_LINK: "certificate-base64",
    CSC_KEY_PASSWORD: "secret",
    APPLE_ID: "developer@example.com",
  });
  assert.equal(signed.CSC_LINK, "certificate-base64");
  assert.equal(signed.CSC_KEY_PASSWORD, "secret");
  assert.equal(signed.APPLE_ID, "developer@example.com");

  console.log("macOS signing environment tests passed!");
}

run();
