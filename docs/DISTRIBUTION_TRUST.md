# Distribution Trust

**Status:** release-readiness contract for v1.2.0 and later  
**Tracked by:** #125  
**Last reviewed:** 2026-10-04

Job Ranger distinguishes a **public release** from a **tester/prerelease build**. Producing an installer is not sufficient evidence that the installer has the platform trust properties expected by ordinary users.

## Release policy

A stable tag matching `vMAJOR.MINOR.PATCH` is a public release and must fail closed unless platform trust checks pass.

Prerelease tags such as `-rc.*` or `-beta*` may be produced without signing/notarization for bounded testing. Those artifacts must remain explicitly described as tester artifacts. The release workflow records trust evidence for them rather than silently treating missing signatures as success.

Do not disable SmartScreen, Smart App Control, Gatekeeper, Defender, or macOS system security globally to make Job Ranger installable.

## Artifact identity and release evidence

Every platform build publishes cryptographic identity evidence generated **after packaging from the exact files uploaded to the release**:

- `windows-SHA256SUMS.txt` and `windows-release-manifest.json`;
- `macos-SHA256SUMS.txt` and `macos-release-manifest.json`.

Each release manifest records:

- release tag;
- platform;
- public-release versus tester-only state;
- artifact filename;
- byte size;
- SHA-256 digest;
- the platform signing-verification evidence filename.

Checksums let a user prove that a downloaded file matches the GitHub Release asset before making any tester-only security exception. A matching checksum does not make an unsigned artifact signed or trusted by the operating system.

See [`TESTER_INSTALLATION.md`](./TESTER_INSTALLATION.md) for the bounded prerelease path.

## Windows public distribution

### Selected path: Microsoft Azure Artifact Signing

Job Ranger uses electron-builder v26's `win.azureSignOptions` integration when Artifact Signing configuration is present. electron-builder signs the application executables and installer during packaging rather than signing only the outer NSIS installer afterward.

Microsoft currently recommends Azure Artifact Signing for non-Store Windows distribution. As of 2026-10-04, the Basic plan is USD $9.99/month for up to 5,000 signatures, with additional signatures priced at $0.005 each.

References:

- https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options
- https://learn.microsoft.com/azure/artifact-signing/how-to-change-sku
- https://www.electron.build/v26/docs/features/code-signing/code-signing-win/

### Required repository variables

- `JOB_RANGER_WINDOWS_SIGN_ENDPOINT`
- `JOB_RANGER_WINDOWS_SIGN_ACCOUNT`
- `JOB_RANGER_WINDOWS_SIGN_PROFILE`
- `JOB_RANGER_WINDOWS_SIGN_PUBLISHER`

The publisher value must exactly match the certificate profile's subject/common name expected by electron-builder.

### Required GitHub secrets

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`

The Azure application/service principal should receive only the role required to sign with the selected Artifact Signing certificate profile. Do not grant subscription-wide administrative roles merely to make CI convenient.

### Verification

`scripts/verify-windows-distribution.ps1` checks both the unpacked Job Ranger executable and generated Windows installer(s) with `Get-AuthenticodeSignature` and writes `build/trust/windows-signing.json`.

For a stable public tag, every checked executable must report a valid Authenticode signature. The trust report is uploaded with the release assets alongside the SHA-256 checksum and release-manifest files.

A valid signature does not guarantee that Microsoft SmartScreen has accumulated enough publisher/file reputation to suppress every initial warning. SmartScreen reputation is an external platform decision and still requires clean-machine release validation.

## Windows tester path

Unsigned prerelease artifacts are allowed only for informed testers. They are not equivalent to public distribution.

Windows 11 may warn about or block unsigned/unrecognized applications. Smart App Control specifically blocks unknown unsigned code when Microsoft cannot establish sufficient trust. An OS-native SmartScreen flow may offer a per-file option to run an unrecognized app on some systems, but that is not a universal unsigned installation mechanism.

If Smart App Control blocks Job Ranger or Windows does not offer a per-app/per-file override, the unsigned build is **not installable on that configuration**. Job Ranger documentation must not instruct a user to disable Smart App Control, SmartScreen, Defender, or other Windows security globally.

Before using an unsigned tester artifact, verify its SHA-256 digest against `windows-SHA256SUMS.txt` from the same GitHub Release.

References:

- https://learn.microsoft.com/windows/apps/develop/smart-app-control/overview
- https://learn.microsoft.com/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control

## macOS public distribution

### Selected path: Developer ID Application + Apple notarization

Directly distributed Job Ranger builds must use an Apple Developer ID Application certificate, Hardened Runtime, Apple notarization, and a stapled notarization ticket.

As of 2026-10-04, Apple Developer Program membership is USD $99/year in the United States. Developer ID certificates are available to eligible program members for software distributed outside the Mac App Store.

References:

- https://developer.apple.com/help/account/membership/program-enrollment/
- https://developer.apple.com/help/account/certificates/create-developer-id-certificates
- https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution

### Required GitHub secrets

For code signing:

- `MAC_CSC_LINK` — base64-encoded Developer ID Application `.p12` accepted by electron-builder
- `MAC_CSC_KEY_PASSWORD`

For the current notarization hook:

- `APPLE_ID`
- `APPLE_ID_PASSWORD` — an Apple app-specific password, not the user's normal Apple Account password
- `APPLE_TEAM_ID`

A future migration to App Store Connect API-key authentication is acceptable and may reduce reliance on an Apple ID credential, but it is not required to close the current release gap.

### Verification

The build hook submits the signed `.app` with `notarytool`, waits for Apple approval, and staples the returned ticket.

`scripts/verify-macos-distribution.sh` then checks packaged app bundles with:

- `codesign --verify --deep --strict`;
- `spctl --assess --type exec`;
- `xcrun stapler validate`.

For a stable public tag, any failure blocks release. The trust report is uploaded as `build/trust/macos-signing.txt` alongside the SHA-256 checksum and release-manifest files.

## macOS tester path

Unsigned or unnotarized prerelease artifacts may be used by informed testers when macOS permits an explicit user override. Apple warns that opening unnotarized or unidentified software carries additional risk.

After attempting to open the app, a tester who has independently verified the artifact and trusts its source may use the OS-native **System Settings → Privacy & Security → Open Anyway** flow when macOS offers it. Do not instruct testers to disable Gatekeeper globally, remove quarantine recursively, or weaken system security.

Before making that exception, verify the artifact SHA-256 digest against `macos-SHA256SUMS.txt` from the same GitHub Release.

Reference:

- https://support.apple.com/102445

## Clean-machine validation still required

Repository checks cannot prove the full end-user trust experience. Before #125 is complete, release evidence must include:

1. a signed Windows installer built through Artifact Signing;
2. valid Authenticode verification for both the packaged app executable and installer;
3. installation/launch on a clean supported Windows 11 system with the observed SmartScreen/Smart App Control behavior recorded;
4. Developer ID-signed macOS x64 and arm64 artifacts;
5. successful Apple notarization and stapling verification;
6. launch on clean supported macOS systems with Gatekeeper behavior recorded;
7. checksum/release-manifest assets matching the tested packages;
8. release notes that distinguish any remaining tester-only path from normal public distribution.

Until those observations exist, #125 remains open even if the repository is fully prepared to consume the credentials.

## Linux

Linux packaging is tracked separately in #129 and should be evaluated on user value, support burden, update strategy, and target distributions. It must not be introduced merely as a way to avoid Windows or macOS trust requirements.
