/**
 * Notarization hook for macOS release builds.
 * Keep the Electron Builder hook itself in CommonJS, then load the ESM-only
 * @electron/notarize package dynamically when Apple credentials are present.
 */

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== "darwin") {
    return;
  }

  if (
    !process.env.APPLE_ID ||
    !process.env.APPLE_ID_PASSWORD ||
    !process.env.APPLE_TEAM_ID
  ) {
    console.log("Skipping macOS notarization because Apple credentials are not configured.");
    return;
  }

  const { notarize } = await import("@electron/notarize");
  const appName = context.packager.appInfo.productFilename;

  await notarize({
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
