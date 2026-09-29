# AlexAligned Unified v7 part F launcher: historical scan export for RealTest backtesting.
# ASCII only, Windows PowerShell 5.1. OPTIONAL and separate from run_v7_workflow.ps1 and part E.
#
#   Runs each generated part-F script (F_A, F_B, F_C, F_D -- whichever exist next to this
#   script) with apply + scan (reads the shared data file, no import, never touches it), then
#   merges all their output CSVs (from the Outputs subfolder) into one combined historical scan
#   CSV with merge_v7_F_history.py.
#
# BEFORE the first run: generate the part-F scripts once with generate_v7_F_history.ps1 / its
# .bat (see README_v7_F_history.md) -- they read the part A/B/C/D sources from the PARENT
# folder (SectorTerminalScripts) but write the generated F scripts here, next to this launcher.
#
# Run this AFTER run_v7_workflow.ps1 (or any time after part C) has imported data at least
# once, never while another RealTest job is running. It never touches the merged daily scan,
# merge_v7_scans.py, or the terminal ingest gate -- only its own new files.
#   -Ask       ask before starting
#   -NoPause   do not wait for Enter at the end (the .bat pauses instead)
#   -NumBars   how many trailing bars each part-F script SHOULD have been generated with; used
#              only to sanity-check row counts, not to change the .rts files (default 260)
param([switch]$Ask, [switch]$NoPause, [int]$NumBars = 260)
$ErrorActionPreference = 'Stop'
$Root  = 'C:\RealTest21_newerv2'
$Scr   = Join-Path $Root 'Scripts\SectorTerminalScripts\AutomationWorkflow'
$Out   = Join-Path $Scr 'Outputs'
$Exe   = Join-Path $Root 'RealTest.exe'
$Rtd   = Join-Path $Root 'Data\alexaligned_unified_v7.rtd'
$Batch = Join-Path $Root 'batchlog.txt'
$Errl  = Join-Path $Root 'errorlog.txt'
$Python = 'python'
$MergeScript = Join-Path $Scr 'merge_v7_F_history.py'
$MergedCsv = Join-Path $Out ('AlexAligned_Unified_v7F_History_' + $NumBars + 'bars_Merged.csv')
# Only the parts that were actually generated are run -- it is fine to run just one or two
# while trying this out, e.g. only part C first.
$PartFiles = @('AlexAligned_Unified_v7F_A_History.rts', 'AlexAligned_Unified_v7F_B_History.rts',
               'AlexAligned_Unified_v7F_C_History.rts', 'AlexAligned_Unified_v7F_D_History.rts')
$Flags = @('-apply', '-scan')

function Stop-Run([string]$why) {
  Write-Host ''; Write-Host ('STOPPED: ' + $why) -ForegroundColor Red
  if ($Ask -and -not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
  exit 1
}
function Line-Count([string]$p) { if (Test-Path $p) { @(Get-Content $p).Count } else { 0 } }

Write-Host '=== AlexAligned Unified v7 part F: historical scan for RealTest backtesting ===' -ForegroundColor Cyan
$rtp = @(Get-Process -Name 'RealTest*' -ErrorAction SilentlyContinue)
if ($rtp.Count) {
  Write-Host ''
  Write-Host 'Still running (from Task Manager, Details tab):' -ForegroundColor Yellow
  foreach ($p in $rtp) {
    $st = ''; try { $st = $p.StartTime.ToString('ddd HH:mm') } catch { $st = '?' }
    Write-Host ('   ' + $p.ProcessName + '.exe   id ' + $p.Id + '   started ' + $st)
  }
  Stop-Run ('RealTest is still running (' + $rtp.Count + ' process). Close it, or end it in Task Manager if left over. Then start again.')
}
if (-not (Test-Path $Exe)) { Stop-Run ('RealTest.exe not found at ' + $Exe) }
if (-not (Test-Path $Rtd)) { Stop-Run ('the shared data file does not exist yet: ' + $Rtd + '. Run part C (or the main workflow) first.') }
if (-not (Test-Path $MergeScript)) { Stop-Run ('merge_v7_F_history.py not found in ' + $Scr) }

$present = @($PartFiles | Where-Object { Test-Path (Join-Path $Scr $_) })
if ($present.Count -eq 0) {
  Stop-Run ('no part-F scripts found in ' + $Scr + '. Generate at least one first with generate_v7_F_history.ps1 -- see README_v7_F_history.md.')
}
Write-Host ('Found ' + $present.Count + ' of 4 possible part-F scripts: ' + ($present -join ', '))
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out -Force | Out-Null }
if ($Ask) {
  $a = Read-Host ('Start part F now? It runs RealTest once per part (' + $present.Count + ' total), each producing ' + $NumBars + ' bars per symbol. This can take much longer than the daily 1-bar scan. Type Y to start')
  if ($a -notmatch '^[Yy]') { Write-Host 'Cancelled.'; exit 0 }
}

$producedCsvs = @()
foreach ($file in $present) {
  $scriptPath = Join-Path $Scr $file
  $errBefore = Line-Count $Errl
  $t0 = Get-Date
  Write-Host ('[' + $t0.ToString('HH:mm:ss') + '] ' + ($Flags -join ' ') + '  ' + $file) -ForegroundColor Cyan
  $proc = Start-Process -FilePath $Exe -WorkingDirectory $Root -ArgumentList ($Flags + ('"' + $scriptPath + '"')) -Wait -PassThru
  $mins = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
  $bl = if (Test-Path $Batch) { Get-Content $Batch } else { @() }
  $missing = @(); foreach ($k in $Flags) { if (-not ($bl | Where-Object { $_ -like ('OK: ' + $k + '*' + $file) })) { $missing += $k } }
  $errNow = Line-Count $Errl
  # the CSV this part writes is named in its own SaveScanAs -- discover it as the newest CSV
  # in Out matching this part's letter and today's run, rather than hard-coding the exact name.
  $letter = ($file -replace '.*_v7F_([A-D])_History\.rts$', '$1')
  $csv = Get-ChildItem -Path $Out -Filter ('*' + $letter + '*F_History_*bars.csv') -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt $t0.AddSeconds(-2) } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  Write-Host ('   done in ' + $mins + ' min, exit ' + $proc.ExitCode + ', new error lines ' + ($errNow - $errBefore) + $(if ($csv) { ', csv: ' + $csv.Name + ' (' + ((Get-Content $csv.FullName).Count - 1) + ' rows)' } else { ', NO NEW CSV FOUND' }))
  if ($missing.Count) { Stop-Run ($file + ' batchlog is missing OK for ' + ($missing -join ', ') + '. See ' + $Batch) }
  if ($errNow -gt $errBefore) { Stop-Run ($file + ' wrote new lines to ' + $Errl) }
  if (-not $csv) { Stop-Run ($file + ' did not produce a fresh *F_History_*bars.csv in ' + $Out + ' -- if this part''s own source script does not use the standard ?scriptpath? convention, its output may have landed next to the .rts (in ' + $Scr + ') instead of in Outputs; check there too.') }
  $producedCsvs += $csv.FullName
}

Write-Host ''
Write-Host ('Merging ' + $producedCsvs.Count + ' part file(s)...') -ForegroundColor Cyan
& $Python $MergeScript $MergedCsv @producedCsvs
if ($LASTEXITCODE -ne 0) { Stop-Run ('merge_v7_F_history.py exited with code ' + $LASTEXITCODE) }
if (-not (Test-Path $MergedCsv)) { Stop-Run ('merge did not produce ' + $MergedCsv) }
$head = (Get-Content $MergedCsv -TotalCount 1)
foreach ($c in @('Date', 'Symbol')) { if ($head -notmatch ('(^|,)"?' + $c + '"?(,|$)')) { Stop-Run ('the merged CSV has no ' + $c + ' column. Header: ' + $head) } }
$rows = @(Get-Content $MergedCsv).Count - 1

Write-Host ''
Write-Host ('PART F PASSED. ' + $producedCsvs.Count + ' part(s) merged, ' + $rows + ' rows.') -ForegroundColor Green
Write-Host ('Merged history file: ' + $MergedCsv)
Write-Host 'Next: hand this file to the terminal''s "Backtest this portfolio" import (once that feature exists) or keep it for the RealTest validation runner.'
if ($Ask -and -not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
exit 0
