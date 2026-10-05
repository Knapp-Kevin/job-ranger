param(
  [switch]$RequireSigned,
  [string[]]$ArtifactPath,
  [string]$ReportPath
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
  $reportDir = Join-Path $PSScriptRoot "../build/trust"
  New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
  $ReportPath = Join-Path $reportDir "windows-signing.json"
} else {
  $ReportPath = [System.IO.Path]::GetFullPath($ReportPath)
  $reportDir = Split-Path -Parent $ReportPath
  if (-not [string]::IsNullOrWhiteSpace($reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
  }
}

$targets = @()
if ($ArtifactPath -and $ArtifactPath.Count -gt 0) {
  foreach ($candidate in $ArtifactPath) {
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      throw "Windows trust-verification artifact does not exist: $candidate"
    }
    $targets += (Resolve-Path -LiteralPath $candidate).Path
  }
} else {
  $appExe = Join-Path $PSScriptRoot "../release/win-unpacked/Job Ranger.exe"
  if (Test-Path -LiteralPath $appExe) {
    $targets += (Resolve-Path $appExe).Path
  }
  $targets += Get-ChildItem -Path (Join-Path $PSScriptRoot "../release") -Filter "Job*windows*.exe" -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
}
$targets = @($targets | Select-Object -Unique)

if ($targets.Count -eq 0) {
  throw "No Windows release executables were found for trust verification."
}

$results = foreach ($target in $targets) {
  $signature = Get-AuthenticodeSignature -FilePath $target
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $target
  $item = Get-Item -LiteralPath $target
  $subject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
  $issuer = if ($signature.SignerCertificate) { $signature.SignerCertificate.Issuer } else { $null }
  $entry = [ordered]@{
    path = $target
    fileName = $item.Name
    bytes = $item.Length
    sha256 = $hash.Hash.ToLowerInvariant()
    status = [string]$signature.Status
    statusMessage = $signature.StatusMessage
    signerSubject = $subject
    signerIssuer = $issuer
  }

  if ($RequireSigned -and $signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
    $entry.failure = "Public release requires a valid Authenticode signature."
  }

  [pscustomobject]$entry
}

$windowsCaption = $null
$windowsVersion = $null
try {
  $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
  $windowsCaption = $os.Caption
  $windowsVersion = $os.Version
} catch {
  $windowsCaption = [System.Environment]::OSVersion.VersionString
  $windowsVersion = [System.Environment]::OSVersion.Version.ToString()
}

$report = [ordered]@{
  schemaVersion = 2
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  requireSigned = [bool]$RequireSigned
  host = [ordered]@{
    computerName = $env:COMPUTERNAME
    os = $windowsCaption
    osVersion = $windowsVersion
    architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    powershellVersion = $PSVersionTable.PSVersion.ToString()
  }
  artifacts = $results
}
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $ReportPath -Encoding UTF8
Get-Content $ReportPath

$invalid = @($results | Where-Object { $_.status -ne "Valid" })
if ($RequireSigned -and $invalid.Count -gt 0) {
  throw "Windows distribution trust verification failed for $($invalid.Count) artifact(s)."
}
