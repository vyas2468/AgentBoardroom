# Generates part-F historical scan scripts from whichever part A/B/C/D scripts sit in the
# PARENT folder (SectorTerminalScripts -- the untouched daily-scan scripts are never moved
# into this AutomationWorkflow subfolder), so you never have to type the node command by hand.
# The generated F scripts themselves are written HERE, next to this .ps1, so their own outputs
# land in this folder's Outputs subfolder when run (see gen_v7_F_history.js and
# run_v7_F_history.ps1). Pure file generation -- does NOT run RealTest itself.
#
#   -NumBars   trailing bars each generated script asks for (default 260, about one year)
#   -Letters   which parts to generate, comma-separated (default A,B,C,D -- only ones actually
#              found are generated; missing ones are skipped with a message, not an error)
param([int]$NumBars = 260, [string]$Letters = 'A,B,C,D')
$ErrorActionPreference = 'Stop'
$Here = $PSScriptRoot
$SrcDir = Split-Path -Parent $Here
$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) { Write-Host 'STOPPED: node is not on PATH. Install Node.js or add it to PATH, then try again.' -ForegroundColor Red; exit 1 }
$Gen = Join-Path $Here '_generators\gen_v7_F_history.js'
if (-not (Test-Path $Gen)) { Write-Host ('STOPPED: generator not found at ' + $Gen) -ForegroundColor Red; exit 1 }

Write-Host '=== Generating part-F historical scan scripts ===' -ForegroundColor Cyan
Write-Host ('Looking for part A/B/C/D source scripts in: ' + $SrcDir)
$wanted = $Letters.Split(',') | ForEach-Object { $_.Trim().ToUpper() }
$made = 0
foreach ($letter in $wanted) {
  # candidates: any AlexAligned_Unified_v7_<letter>_*.rts in the PARENT folder that is NOT
  # itself an already-generated F script (those contain "F_" or "_History" in the name).
  $cands = Get-ChildItem -Path $SrcDir -Filter ('AlexAligned_Unified_v7_' + $letter + '_*.rts') -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch 'F_History|_v7F_' }
  if ($cands.Count -eq 0) {
    Write-Host ('   part ' + $letter + ': no source script found in ' + $SrcDir + ' (looked for AlexAligned_Unified_v7_' + $letter + '_*.rts) -- skipped')
    continue
  }
  if ($cands.Count -gt 1) {
    $src = $cands | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Write-Host ('   part ' + $letter + ': ' + $cands.Count + ' candidates found, using the newest: ' + $src.Name) -ForegroundColor Yellow
  } else {
    $src = $cands[0]
  }
  $out = Join-Path $Here ('AlexAligned_Unified_v7F_' + $letter + '_History.rts')
  & $Node.Source $Gen $src.FullName $out $NumBars
  if ($LASTEXITCODE -ne 0) { Write-Host ('STOPPED: generator failed for part ' + $letter + ' (exit ' + $LASTEXITCODE + ')') -ForegroundColor Red; exit 1 }
  $made++
}

Write-Host ''
if ($made -eq 0) {
  Write-Host ('Nothing generated -- no matching part A/B/C/D source scripts were found in ' + $SrcDir + '.') -ForegroundColor Yellow
  exit 1
}
Write-Host ($made.ToString() + ' part-F script(s) generated in ' + $Here + '. Next: run Run_AlexAligned_v7_F_History.bat.') -ForegroundColor Green
Read-Host 'Press Enter to close' | Out-Null
