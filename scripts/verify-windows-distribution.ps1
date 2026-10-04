param(
  [switch]$RequireSigned
)

$ErrorActionPreference = "Stop"
$reportDir = Join-Path $PSScriptRoot "../build/trust"
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
$reportPath = Join-Path $reportDir "windows-signing.json"

$targets = @()
$appExe = Join-Path $PSScriptRoot "../release/win-unpacked/Job Ranger.exe"
if (Test-Path -LiteralPath $appExe) {
  $targets += (Resolve-Path $appExe).Path
}
$targets += Get-ChildItem -Path (Join-Path $PSScriptRoot "../release") -Filter "Job*windows*.exe" -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
$targets = @($targets | Select-Object -Unique)

if ($targets.Count -eq 0) {
  throw "No Windows release executables were found for trust verification."
}

$results = foreach ($target in $targets) {
  $signature = Get-AuthenticodeSignature -FilePath $target
  $subject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
  $issuer = if ($signature.SignerCertificate) { $signature.SignerCertificate.Issuer } else { $null }
  $entry = [ordered]@{
    path = $target
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

$report = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  requireSigned = [bool]$RequireSigned
  artifacts = $results
}
$report | ConvertTo-Json -Depth 6 | Set-Content -Path $reportPath -Encoding UTF8
Get-Content $reportPath

$invalid = @($results | Where-Object { $_.status -ne "Valid" })
if ($RequireSigned -and $invalid.Count -gt 0) {
  throw "Windows distribution trust verification failed for $($invalid.Count) artifact(s)."
}
