function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function createMacSigningEnvironment(source = process.env) {
  const env = { ...source };
  const hasLink = nonEmpty(env.CSC_LINK);
  const hasPassword = nonEmpty(env.CSC_KEY_PASSWORD);

  if (!hasLink || !hasPassword) {
    delete env.CSC_LINK;
    delete env.CSC_KEY_PASSWORD;
  }

  return env;
}

module.exports = { createMacSigningEnvironment };
