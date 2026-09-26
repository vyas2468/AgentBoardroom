# AlexAligned Unified v7 part E launcher: daily price history for the terminal's Ask tab.
# ASCII only, Windows PowerShell 5.1.  OPTIONAL and separate from run_v7_workflow.ps1.
#
#   E  apply + scan   (reads the shared data file from part C, no import)   under a minute
#   writes Scripts\AlexAligned_Unified_v7E_history.csv  (never merged with parts A B C D)
#
# Run it AFTER run_v7_workflow.ps1 has finished (or any time after part C), never while
# another RealTest job is running.  It does not touch the merged scan, the merge script or
# the terminal ingest gate.  Stops at the first failed check, like the main launcher.
#   -Ask   ask before starting
param([switch]$Ask)
$ErrorActionPreference = 'Stop'
$Root = 'C:\RealTest21_newerv2'
$Scr  = Join-Path $Root 'Scripts'
$Exe  = Join-Path $Root 'RealTest.exe'
$Rtd  = Join-Path $Root 'Data\alexaligned_unified_v7.rtd'
$Batch = Join-Path $Root 'batchlog.txt'
$Errl  = Join-Path $Root 'errorlog.txt'
$File = 'AlexAligned_Unified_v7_E_History_26.09.2026.rts'
$Csv  = Join-Path $Scr 'AlexAligned_Unified_v7E_history.csv'
$Flags = @('-apply','-scan')

function Stop-Run([string]$why) {
  Write-Host ''; Write-Host ('STOPPED: ' + $why) -ForegroundColor Red
  if ($Ask) { Read-Host 'Press Enter to close' | Out-Null }
  exit 1
}
function Line-Count([string]$p) { if (Test-Path $p) { @(Get-Content $p).Count } else { 0 } }

Write-Host '=== AlexAligned Unified v7 part E: price history ===' -ForegroundColor Cyan
if (Get-Process -Name 'RealTest*' -ErrorAction SilentlyContinue) { Stop-Run 'a RealTest process is already running. Wait for it to finish, then start again.' }
if (-not (Test-Path $Exe)) { Stop-Run ('RealTest.exe not found at ' + $Exe) }
if (-not (Test-Path (Join-Path $Scr $File))) { Stop-Run ('script missing: ' + $File) }
if (-not (Test-Path $Rtd)) { Stop-Run ('the shared data file does not exist yet: ' + $Rtd + '. Run part C (or the main workflow) first.') }
if ($Ask) {
  $a = Read-Host 'Start part E now? It runs RealTest once, for about a minute. Type Y to start'
  if ($a -notmatch '^[Yy]') { Write-Host 'Cancelled.'; exit 0 }
}

$errBefore = Line-Count $Errl
$t0 = Get-Date
Write-Host ('[' + $t0.ToString('HH:mm:ss') + '] Part E: ' + ($Flags -join ' ') + '  ' + $File) -ForegroundColor Cyan
$scriptPath = Join-Path $Scr $File
$proc = Start-Process -FilePath $Exe -WorkingDirectory $Root -ArgumentList ($Flags + ('"' + $scriptPath + '"')) -Wait -PassThru
$mins = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
$bl = if (Test-Path $Batch) { Get-Content $Batch } else { @() }
$missing = @(); foreach ($k in $Flags) { if (-not ($bl | Where-Object { $_ -like ('OK: ' + $k + '*' + $File) })) { $missing += $k } }
$errNow = Line-Count $Errl
$csvOk = (Test-Path $Csv) -and ((Get-Item $Csv).LastWriteTime -gt $t0)
$rows = 0; if ($csvOk) { $rows = @(Get-Content $Csv).Count - 1 }
Write-Host ('   done in ' + $mins + ' min, exit ' + $proc.ExitCode + ', csv rows ' + $rows + ', new error lines ' + ($errNow - $errBefore))
if ($missing.Count) { Stop-Run ('part E batchlog is missing OK for ' + ($missing -join ', ') + '. See ' + $Batch) }
if ($errNow -gt $errBefore) { Stop-Run ('part E wrote new lines to ' + $Errl) }
if (-not $csvOk) { Stop-Run ('part E did not write a fresh ' + $Csv) }
$head = (Get-Content $Csv -TotalCount 1)
foreach ($c in @('Date','Symbol','HClose')) { if ($head -notmatch ('(^|,)"?' + $c + '"?(,|$)')) { Stop-Run ('the history CSV has no ' + $c + ' column. Header: ' + $head) } }
if ($rows -lt 20000) { Stop-Run ('only ' + $rows + ' rows. Expected about 575 symbols x 280 bars. Check ScanSettings NumBars in ' + $File) }

Write-Host ''
Write-Host ('PART E PASSED. ' + $rows + ' rows in ' + $mins + ' min.') -ForegroundColor Green
Write-Host ('History file: ' + $Csv)
Write-Host 'Next: open the Sector Rotation Terminal, tab Ask the terminal, click Load price history and drop this CSV.'
if ($Ask) { Read-Host 'Press Enter to close' | Out-Null }
exit 0
