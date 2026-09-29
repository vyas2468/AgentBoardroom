# AlexAligned Unified v7 Orders-TerminalWeights launcher: runs RealTest in -orders mode to
# generate a next-session order list from Terminal_Weights.csv, using the same proven
# DynamicSizing/Quantity logic as run_v7_Validate_TerminalWeights.ps1 (see that script's .rts
# Notes: for the Shares <> 0 fix explanation).
# ASCII only, Windows PowerShell 5.1.
#
#   Runs AlexAligned_Unified_v7_Orders_TerminalWeights.rts in Orders mode (-orders). Never
#   -import, never -test. Writes AlexAligned_Unified_v7_Orders_TerminalWeights_Orders.csv into
#   an Outputs subfolder next to the script (the OrdersFile: path in the .rts).
#
# BEFORE the first run: Terminal_Weights.csv must already be in this same folder (next to this
# script, NOT in Outputs). See the .rts file's Notes: for an important caveat -- this only gives
# genuinely actionable next-session orders if that CSV's last row is close to today's actual date
# (i.e. exported from a backtest whose window runs through today).
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
$File = 'AlexAligned_Unified_v7_Orders_TerminalWeights.rts'
$WeightsCsv = Join-Path $Scr 'Terminal_Weights.csv'
$OrdersCsv  = Join-Path $Out 'AlexAligned_Unified_v7_Orders_TerminalWeights_Orders.csv'
$Flags = @('-orders')

function Stop-Run([string]$why) {
  Write-Host ''; Write-Host ('STOPPED: ' + $why) -ForegroundColor Red
  if ($Ask -and -not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
  exit 1
}
function Line-Count([string]$p) { if (Test-Path $p) { @(Get-Content $p).Count } else { 0 } }

Write-Host '=== AlexAligned Unified v7: next-session orders from Terminal_Weights.csv ===' -ForegroundColor Cyan
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
if (-not (Test-Path $WeightsCsv)) { Stop-Run ('Terminal_Weights.csv not found in ' + $Scr + '. Export it from the web terminal''s Backtest section (a window that runs through TODAY) and copy it there first.') }
$csvAge = (Get-Date) - (Get-Item $WeightsCsv).LastWriteTime
if ($csvAge.TotalHours -gt 24) {
  Write-Host ('WARNING: Terminal_Weights.csv is ' + [math]::Round($csvAge.TotalHours,1) + ' hours old -- the orders below may not be for tomorrow, they are for the day after that file''s own LAST dated row. Re-export from the terminal first if you want genuinely current orders.') -ForegroundColor Yellow
}
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out -Force | Out-Null }
if ($Ask) {
  $a = Read-Host 'Start the ORDERS run now? It runs RealTest once in Orders mode. Type Y to start'
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
$ordersOk = (Test-Path $OrdersCsv) -and ((Get-Item $OrdersCsv).LastWriteTime -gt $t0)
Write-Host ('   done in ' + $mins + ' min, exit ' + $proc.ExitCode + ', new error lines ' + ($errNow - $errBefore))
if ($missing.Count) { Stop-Run ('orders run batchlog is missing OK for ' + ($missing -join ', ') + '. See ' + $Batch) }
if ($errNow -gt $errBefore) { Stop-Run ('orders run wrote new lines to ' + $Errl + '. Check it for a RealTest parse error before re-running -- report the exact text so the .rts can be fixed.') }
if (-not $ordersOk) { Write-Host ('   note: no fresh ' + $OrdersCsv + ' found -- fine if there were no orders to generate (nothing to buy/sell/resize), otherwise check the run for errors.') -ForegroundColor Yellow }

Write-Host ''
Write-Host ('ORDERS RUN PASSED (no parse/runtime errors). ' + $mins + ' min.') -ForegroundColor Green
Write-Host ('Order list: ' + $OrdersCsv)
Write-Host 'Next: compare this order list against the terminal''s own "Latest update" BUY/SELL/HOLD section for the same portfolio, as an independent cross-check.'
if ($Ask -and -not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
exit 0
