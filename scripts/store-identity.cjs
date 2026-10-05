/**
 * Microsoft Store package identity resolution for electron-builder.store.cjs.
 * Kept separate so the identity rules are unit-testable (tests/store-packaging-config.test.cjs).
 */
const VALIDATION_IDENTITY = Object.freeze({
  identityName: "JobRanger.PackageValidation",
  publisher: "CN=Job Ranger Package Validation",
  publisherDisplayName: "Job Ranger (package validation build)",
  displayName: "Job Ranger (validation)",
});

function resolveStoreIdentity(env = process.env) {
  const configured = {
    identityName: env.JOB_RANGER_STORE_IDENTITY_NAME?.trim() || "",
    publisher: env.JOB_RANGER_STORE_PUBLISHER?.trim() || "",
    publisherDisplayName: env.JOB_RANGER_STORE_PUBLISHER_DISPLAY_NAME?.trim() || "",
  };
  const provided = Object.values(configured).filter(Boolean).length;
  const requireIdentity = env.JOB_RANGER_REQUIRE_STORE_IDENTITY === "1";

  if (provided > 0 && provided < 3) {
    throw new Error(
      "Microsoft Store identity is only partially configured. Provide JOB_RANGER_STORE_IDENTITY_NAME, JOB_RANGER_STORE_PUBLISHER, and JOB_RANGER_STORE_PUBLISHER_DISPLAY_NAME together.",
    );
  }
  if (provided === 0) {
    if (requireIdentity) {
      throw new Error(
        "A Microsoft Store submission package requires the Partner Center identity (JOB_RANGER_STORE_IDENTITY_NAME, JOB_RANGER_STORE_PUBLISHER, JOB_RANGER_STORE_PUBLISHER_DISPLAY_NAME).",
      );
    }
    return { ...VALIDATION_IDENTITY, kind: "validation" };
  }
  if (!/^[A-Za-z0-9.-]{3,50}$/.test(configured.identityName)) {
    throw new Error("JOB_RANGER_STORE_IDENTITY_NAME must be 3-50 characters of letters, digits, periods, or dashes.");
  }
  if (!/^CN=/.test(configured.publisher)) {
    throw new Error("JOB_RANGER_STORE_PUBLISHER must be the Partner Center publisher distinguished name (starting with CN=).");
  }
  return {
    ...configured,
    displayName: env.JOB_RANGER_STORE_DISPLAY_NAME?.trim() || "Job Ranger",
    kind: "store",
  };
}

module.exports = { resolveStoreIdentity, VALIDATION_IDENTITY };
