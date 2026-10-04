const base = require("./electron-builder.json");

const requireSigning = process.env.JOB_RANGER_REQUIRE_WINDOWS_SIGNING === "1";
const azure = {
  endpoint: process.env.JOB_RANGER_WINDOWS_SIGN_ENDPOINT,
  codeSigningAccountName: process.env.JOB_RANGER_WINDOWS_SIGN_ACCOUNT,
  certificateProfileName: process.env.JOB_RANGER_WINDOWS_SIGN_PROFILE,
  publisherName: process.env.JOB_RANGER_WINDOWS_SIGN_PUBLISHER,
};
const auth = {
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
};

const azureValues = Object.values(azure);
const authValues = Object.values(auth);
const azureConfigured = azureValues.every(Boolean);
const authConfigured = authValues.every(Boolean);
const anyAzureConfiguration = [...azureValues, ...authValues].some(Boolean);

if (anyAzureConfiguration && (!azureConfigured || !authConfigured)) {
  throw new Error(
    "Windows Azure Artifact Signing is only partially configured. Provide endpoint, account, profile, publisher, AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET together.",
  );
}

if (requireSigning && (!azureConfigured || !authConfigured)) {
  throw new Error(
    "Windows code signing is required for this public release, but Azure Artifact Signing configuration is incomplete.",
  );
}

module.exports = {
  ...base,
  win: {
    ...base.win,
    ...(azureConfigured && authConfigured
      ? {
          azureSignOptions: {
            endpoint: azure.endpoint,
            codeSigningAccountName: azure.codeSigningAccountName,
            certificateProfileName: azure.certificateProfileName,
            publisherName: azure.publisherName,
          },
        }
      : {}),
  },
};
