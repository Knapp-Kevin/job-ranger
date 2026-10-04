const { spawnSync } = require("node:child_process");
const { createMacSigningEnvironment } = require("./macos-signing-env.cjs");

const result = spawnSync(
  "electron-builder",
  ["--mac", "--publish", "never"],
  {
    env: createMacSigningEnvironment(process.env),
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
