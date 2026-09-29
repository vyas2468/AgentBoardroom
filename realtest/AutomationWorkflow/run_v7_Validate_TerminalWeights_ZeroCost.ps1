# AlexAligned Unified v7 Validate-TerminalWeights-ZeroCost launcher: same cross-check as
# run_v7_Validate_TerminalWeights.ps1, but against the ZeroCost .rts (Commission/Slippage both 0),
# to isolate whether cost drag from RealTest's per-lot trade accounting explains a return/drawdown
# gap against the web terminal's own backtest numbers.
# ASCII only, Windows PowerShell 5.1.
#
#   Runs AlexAligned_Unified_v7_Validate_TerminalWeights_ZeroCost.rts in Test mode (-test). Never
#   -import. Writes AlexAligned_Unified_v7_Validate_TerminalWeights_ZeroCost_*.csv into an
#   Outputs subfolder next to the script -- separate files from the cost-inclusive run, so both
#   sit side by side.
#
# BEFORE the first run: Terminal_Weights.csv must already be in this same folder (same file the
# cost-inclusive run used, for a fair comparison; NOT in Outputs).
#   -Ask      ask before starting
#   -NoPause  do not wait for Enter at the end (the .bat pauses instead)
param([switch]$Ask, [switch]$NoPause)
$ErrorActionPreference = 'Stop'
$Root = 'C:\RealTest21_newerv2'
$Scr  = Join-Path $Root 'Scripts\SectorTerminalScripts\AutomationWorkflow'
$Out  = Join-Path $Scr 'Outputs'
$Exe  = Join-Path $Root 'RealTest.exe'
$Rtd  = Join-Path $Root 'Data\alexaligned_unified_v7.rtd'
$Batch = Join-Path $Root 'batchlog.txt'
$Errl  = Join-Path $Root 'errorlog.txt'
$File = 'AlexAligned_Unified_v7_Validate_TerminalWeights_ZeroCost.rts'
$WeightsCsv = Join-Path $Scr 'Terminal_Weights.csv'
$TradesCsv  = Join-Path $Out 'AlexAligned_Unified_v7_Validate_TerminalWeights_ZeroCost_Trades.csv'
$ResultsCsv = Join-Path $Out 'AlexAligned_Unified_v7_Validate_TerminalWeights_ZeroCost_Results.csv'
$EquityCsv  = Join-Path $Out 'AlexAligned_Unified_v7_Validate_TerminalWeights_ZeroCost_Equity.csv'
$Flags = @('-test')

function Stop-Run([string]$why) {
  Write-Host ''; Write-Host ('STOPPED: ' + $why) -ForegroundColor Red
  if ($Ask -and -not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
  exit 1
}
function Line-Count([string]$p) { if (Test-Path $p) { @(Get-Content $p).Count } else { 0 } }

Write-Host '=== AlexAligned Unified v7: validate against Terminal_Weights.csv (ZERO COST) ===' -ForegroundColor Cyan
$rtp = @(Get-Process -Name 'RealTest*' -ErrorAction SilentlyContinue)
if ($rtp.Count) {
  Write-Host ''
  Write-Host 'Still running (from Task Manager, Details tab):' -ForegroundColor Yellow
  foreach ($p in $rtp) {
    $st = ''; try { $st = $p.StartTime.ToString('ddd HH:mm') } catch { $st = '?' }
    $wt = ''; try { $wt = $p.MainWindowTitle } catch { }
    Write-Host ('   ' + $p.ProcessName + '.exe   id ' + $p.Id + '   started ' + $st + $(if ($wt) { '   window: ' + $wt } else { '   (no window: a background job)' }))
  }
  Stop-Run ('RealTest is still running (' + $rtp.Count + ' process). Close the RealTest window, or if it has no window wait for the job to finish, or end it in Task Manager if it is left over from an earlier run. Then start again.')
}
if (-not (Test-Path $Exe)) { Stop-Run ('RealTest.exe not found at ' + $Exe) }
if (-not (Test-Path (Join-Path $Scr $File))) { Stop-Run ('script missing: ' + (Join-Path $Scr $File)) }
if (-not (Test-Path $Rtd)) { Stop-Run ('the shared data file does not exist yet: ' + $Rtd + '. Run part C (or the main workflow) first.') }
if (-not (Test-Path $WeightsCsv)) { Stop-Run ('Terminal_Weights.csv not found in ' + $Scr + '. Export it from the web terminal''s Backtest section and copy it there first -- see README_v7_Validate_TerminalWeights.md.') }
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out -Force | Out-Null }
if ($Ask) {
  $a = Read-Host 'Start the ZERO-COST validation run now? It runs RealTest once in Test mode. Type Y to start'
  if ($a -notmatch '^[Yy]') { Write-Host 'Cancelled.'; exit 0 }
}

$errBefore = Line-Count $Errl
$t0 = Get-Date
Write-Host ('[' + $t0.ToString('HH:mm:ss') + '] ' + ($Flags -join ' ') + '  ' + $File) -ForegroundColor Cyan
$scriptPath = Join-Path $Scr $File
$proc = Start-Process -FilePath $Exe -WorkingDirectory $Root -ArgumentList ($Flags + ('"' + $scriptPath + '"')) -Wait -PassThru
$mins = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
$bl = if (Test-Path $Batch) { Get-Content $Batch } else { @() }
$missing = @(); foreach ($k in $Flags) { if (-not ($bl | Where-Object { $_ -like ('OK: ' + $k + '*' + $File) })) { $missing += $k } }
$errNow = Line-Count $Errl
$resultsOk = (Test-Path $ResultsCsv) -and ((Get-Item $ResultsCsv).LastWriteTime -gt $t0)
$tradesOk  = (Test-Path $TradesCsv)  -and ((Get-Item $TradesCsv).LastWriteTime -gt $t0)
Write-Host ('   done in ' + $mins + ' min, exit ' + $proc.ExitCode + ', new error lines ' + ($errNow - $errBefore))
if ($missing.Count) { Stop-Run ('validation run batchlog is missing OK for ' + ($missing -join ', ') + '. See ' + $Batch) }
if ($errNow -gt $errBefore) { Stop-Run ('validation run wrote new lines to ' + $Errl + '. Check it for a RealTest parse error before re-running -- report the exact text so the .rts can be fixed.') }
if (-not $resultsOk) { Stop-Run ('the run did not write a fresh ' + $ResultsCsv) }
if (-not $tradesOk) { Write-Host ('   note: no trade list found at ' + $TradesCsv + ' -- fine if the CSV held no positions, otherwise check the run for errors.') -ForegroundColor Yellow }

Write-Host ''
Write-Host ('ZERO-COST VALIDATION RUN PASSED (no parse/runtime errors). ' + $mins + ' min.') -ForegroundColor Green
Write-Host ('Results (one row, ending value / return / drawdown): ' + $ResultsCsv)
Write-Host ('Trade list: ' + $TradesCsv)
Write-Host ('Equity curve: ' + $EquityCsv)
Write-Host 'Next: compare this ZERO-COST result against the cost-inclusive run''s Results CSV. If they are close, cost drag from per-lot trade accounting explains the earlier gap. If a big gap remains even here, something more structural is worth investigating.'
if ($Ask -and -not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
exit 0
