# AlexAligned Unified v7 daily workflow launcher.  ASCII only, Windows PowerShell 5.1.
#
#   C  import + apply + scan   (creates the shared data file)          about 6 min
#   B  apply + scan            (correlation family)                     about 1 min
#   A  apply + scan            (engines, the long one)                  about 26 min
#   D  apply + scan            (optional engine diagnostics, -IncludeD)
#   merge the part CSVs -> AlexAligned_Unified_v7_scan.csv
#   run the terminal's own ingest on it -> Scripts\terminal_payload\ (gate for the terminal Update)
#
# One RealTest job at a time, never two.  Stops at the first failed gate.
#   -From B|A     resume at a later part (the shared data file must already exist)
#   -IncludeD     also run the optional diagnostics part
#   -Ask          ask before starting (used when launched from the terminal link)
#   -NoMerge      stop after the RealTest parts
#   -NoPause      do not wait for Enter at the end (the .bat pauses instead, so the window never closes early)
param(
  [ValidateSet('C','B','A')][string]$From = 'C',
  [switch]$IncludeD,
  [switch]$Ask,
  [switch]$NoMerge,
  [switch]$NoPause
)
$ErrorActionPreference = 'Stop'
$Root = 'C:\RealTest21_newerv2'
$Scr  = Join-Path $Root 'Scripts\SectorTerminalScripts'
$Exe  = Join-Path $Root 'RealTest.exe'
$Rtd  = Join-Path $Root 'Data\alexaligned_unified_v7.rtd'
$Batch = Join-Path $Root 'batchlog.txt'
$Errl  = Join-Path $Root 'errorlog.txt'
$Status = Join-Path $Scr 'v7_last_run.json'

$Parts = @(
  @{ Id='C'; File='AlexAligned_Unified_v7_C_EngineFree_25.09.2026.rts'; Csv='AlexAligned_Unified_v7C_scan.csv'; Flags=@('-import','-apply','-scan'); Ok=@('-import','-apply','-scan') },
  @{ Id='B'; File='AlexAligned_Unified_v7_B_Corr_25.09.2026.rts';       Csv='AlexAligned_Unified_v7B_scan.csv'; Flags=@('-apply','-scan');            Ok=@('-apply','-scan') },
  @{ Id='A'; File='AlexAligned_Unified_v7_A_Core_25.09.2026.rts';       Csv='AlexAligned_Unified_v7A_scan.csv'; Flags=@('-apply','-scan');            Ok=@('-apply','-scan') }
)
if ($IncludeD) {
  $Parts += @{ Id='D'; File='AlexAligned_Unified_v7_D_EngineDiag_25.09.2026.rts'; Csv='AlexAligned_Unified_v7D_scan.csv'; Flags=@('-apply','-scan'); Ok=@('-apply','-scan') }
}
$order = @('C','B','A','D')
$Parts = $Parts | Where-Object { $order.IndexOf($_.Id) -ge $order.IndexOf($From) -or $_.Id -eq 'D' }

$run = [ordered]@{ started = (Get-Date).ToString('s'); from = $From; parts = @(); result = 'running' }
function Save-Status { $run | ConvertTo-Json -Depth 6 | Set-Content -Path $Status -Encoding ASCII }
function Stop-Run([string]$why) {
  Write-Host ''; Write-Host ('STOPPED: ' + $why) -ForegroundColor Red
  $run.result = 'stopped: ' + $why; $run.ended = (Get-Date).ToString('s'); Save-Status
  if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
  exit 1
}
function Line-Count([string]$p) { if (Test-Path $p) { @(Get-Content $p).Count } else { 0 } }

Write-Host '=== AlexAligned Unified v7 workflow ===' -ForegroundColor Cyan
Write-Host ('Scripts folder: ' + $Scr)
Write-Host ('Parts to run: ' + (($Parts | ForEach-Object { $_.Id }) -join ' -> ') + '   then merge and terminal gate')

# ---- preflight ----
if (Get-Process -Name 'RealTest*' -ErrorAction SilentlyContinue) {
  Stop-Run 'a RealTest process is already running. Close it (an open window blocks -import) and start again.'
}
if (-not (Test-Path $Exe)) { Stop-Run ('RealTest.exe not found at ' + $Exe) }
if (-not (Test-Path $Scr)) { Stop-Run ('scripts folder not found: ' + $Scr) }
foreach ($p in $Parts) { if (-not (Test-Path (Join-Path $Scr $p.File))) { Stop-Run ('script missing: ' + (Join-Path $Scr $p.File)) } }
if ($From -ne 'C' -and -not (Test-Path $Rtd)) { Stop-Run ('the shared data file does not exist yet: ' + $Rtd + '. Start from part C.') }
$freeGb = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1)
Write-Host ('Free RAM: ' + $freeGb + ' GB (part A needs about 14 GB)')
if ($freeGb -lt 18) { Write-Host 'Warning: low free RAM. Close other programs first.' -ForegroundColor Yellow }
if ($Ask) {
  $a = Read-Host 'Start the run now? This runs RealTest for about 35 minutes. Type Y to start'
  if ($a -notmatch '^[Yy]') { Write-Host 'Cancelled.'; exit 0 }
}

# ---- the RealTest parts, strictly one after the other ----
foreach ($p in $Parts) {
  if (Get-Process -Name 'RealTest*' -ErrorAction SilentlyContinue) { Stop-Run ('RealTest is still running before part ' + $p.Id) }
  $errBefore = Line-Count $Errl
  $t0 = Get-Date
  Write-Host ''; Write-Host ('[' + $t0.ToString('HH:mm:ss') + '] Part ' + $p.Id + ': ' + ($p.Flags -join ' ') + '  ' + $p.File) -ForegroundColor Cyan
  $scriptPath = Join-Path $Scr $p.File
  $proc = Start-Process -FilePath $Exe -WorkingDirectory $Root -ArgumentList ($p.Flags + ('"' + $scriptPath + '"')) -Wait -PassThru
  $mins = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
  $bl = if (Test-Path $Batch) { Get-Content $Batch } else { @() }
  $missing = @(); foreach ($k in $p.Ok) { if (-not ($bl | Where-Object { $_ -like ('OK: ' + $k + '*' + $p.File) })) { $missing += $k } }
  $errNow = Line-Count $Errl
  $csv = Join-Path $Scr $p.Csv
  $csvOk = (Test-Path $csv) -and ((Get-Item $csv).LastWriteTime -gt $t0)
  $rows = 0; if ($csvOk) { $rows = @(Get-Content $csv).Count - 1 }
  $entry = [ordered]@{ part=$p.Id; minutes=$mins; exitCode=$proc.ExitCode; missingOk=($missing -join ','); newErrorLines=($errNow - $errBefore); csvRows=$rows }
  $run.parts += $entry; Save-Status
  Write-Host ('   done in ' + $mins + ' min, exit ' + $proc.ExitCode + ', csv rows ' + $rows + ', new error lines ' + ($errNow - $errBefore))
  if ($missing.Count) { Stop-Run ('part ' + $p.Id + ' batchlog is missing OK for ' + ($missing -join ', ') + '. See ' + $Batch) }
  if ($errNow -gt $errBefore) { Stop-Run ('part ' + $p.Id + ' wrote new lines to ' + $Errl) }
  if (-not $csvOk) { Stop-Run ('part ' + $p.Id + ' did not write a fresh ' + $p.Csv) }
}
if ($NoMerge) { $run.result = 'ok (no merge)'; $run.ended = (Get-Date).ToString('s'); Save-Status; Write-Host 'RealTest parts finished, merge skipped.' -ForegroundColor Green; if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }; exit 0 }

# ---- merge + terminal gate ----
Write-Host ''; Write-Host 'Merging the part CSVs ...' -ForegroundColor Cyan
& python (Join-Path $Scr '_generators\merge_v7_scans.py')
if ($LASTEXITCODE -ne 0) { Stop-Run 'merge_v7_scans.py failed (parts disagree on rows or columns)' }
Write-Host ''; Write-Host 'Running the terminal ingest gate ...' -ForegroundColor Cyan
& node (Join-Path $Scr '_generators\terminal_payload_v7.js')
if ($LASTEXITCODE -ne 0) { Stop-Run 'terminal ingest gate failed. Do NOT load this scan into the terminal.' }

$run.result = 'ok'; $run.ended = (Get-Date).ToString('s'); $run.merged = Join-Path $Scr 'AlexAligned_Unified_v7_scan.csv'; Save-Status
$tot = ($run.parts | Measure-Object -Property minutes -Sum).Sum
Write-Host ''
Write-Host ('ALL GATES PASSED. RealTest total ' + [math]::Round($tot,1) + ' min.') -ForegroundColor Green
Write-Host ('Merged scan: ' + $run.merged)
Write-Host 'Next: open the Sector Rotation Terminal and click Load it on the newer-scan banner, or drop the merged CSV into Update. Then Save this run.'
if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
exit 0
