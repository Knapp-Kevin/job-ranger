#!/usr/bin/env bash
set -euo pipefail

require_trust="${1:-0}"
report_dir="build/trust"
report_path="$report_dir/macos-signing.txt"
mkdir -p "$report_dir"
: > "$report_path"

mapfile_cmd_available=0
if command -v mapfile >/dev/null 2>&1; then
  mapfile_cmd_available=1
fi

apps=()
while IFS= read -r -d '' app; do
  apps+=("$app")
done < <(find release -maxdepth 3 -type d -name 'Job Ranger.app' -print0 2>/dev/null)

if [[ ${#apps[@]} -eq 0 ]]; then
  echo "No packaged Job Ranger.app bundles were found." | tee -a "$report_path"
  exit 1
fi

failures=0
for app in "${apps[@]}"; do
  echo "APP: $app" | tee -a "$report_path"

  if codesign --verify --deep --strict --verbose=2 "$app" >>"$report_path" 2>&1; then
    echo "codesign: valid" | tee -a "$report_path"
  else
    echo "codesign: invalid" | tee -a "$report_path"
    failures=$((failures + 1))
  fi

  codesign -dv --verbose=4 "$app" >>"$report_path" 2>&1 || true

  if spctl --assess --verbose=2 --type exec "$app" >>"$report_path" 2>&1; then
    echo "gatekeeper: accepted" | tee -a "$report_path"
  else
    echo "gatekeeper: not accepted" | tee -a "$report_path"
    failures=$((failures + 1))
  fi

  if xcrun stapler validate "$app" >>"$report_path" 2>&1; then
    echo "stapler: valid" | tee -a "$report_path"
  else
    echo "stapler: missing-or-invalid" | tee -a "$report_path"
    failures=$((failures + 1))
  fi

done

if [[ "$require_trust" != "1" ]]; then
  echo "Tester mode: trust failures are recorded but do not fail the build." | tee -a "$report_path"
  exit 0
fi

if [[ $failures -gt 0 ]]; then
  echo "Public macOS distribution trust verification failed with $failures trust check failure(s)." | tee -a "$report_path"
  exit 1
fi

echo "Public macOS distribution trust verification passed." | tee -a "$report_path"
