@echo off
rem Zero-cost variant of Run_AlexAligned_v7_Validate_TerminalWeights.bat -- same Terminal_Weights.csv,
rem same window, Commission and Slippage both forced to 0. Run this to check whether cost drag from
rem RealTest's per-lot trade accounting explains a gap against the cost-inclusive run's numbers.
rem The window always stays open at the end, so any message can be read.
setlocal
set "SCR=C:\RealTest21_newerv2\Scripts\SectorTerminalScripts\AutomationWorkflow"
set "PS1=%SCR%\run_v7_Validate_TerminalWeights_ZeroCost.ps1"
set "RTS=%SCR%\AlexAligned_Unified_v7_Validate_TerminalWeights_ZeroCost.rts"
set "CSV=%SCR%\Terminal_Weights.csv"
echo === AlexAligned v7: validate against Terminal_Weights.csv (ZERO COST) ===
echo.
if not exist "%PS1%" goto missing
if not exist "%RTS%" goto missing
if not exist "%CSV%" goto nocsv
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Ask -NoPause
echo.
echo PowerShell finished with exit code %ERRORLEVEL%. 0 means the run PASSED (no parse/runtime errors) or you cancelled.
goto done

:missing
echo STOPPED: validation files are not in %SCR%
echo.
echo Needed directly in that folder, not in a subfolder:
echo    run_v7_Validate_TerminalWeights_ZeroCost.ps1
echo    AlexAligned_Unified_v7_Validate_TerminalWeights_ZeroCost.rts
echo.
if exist "%PS1%" (echo    found: run_v7_Validate_TerminalWeights_ZeroCost.ps1) else (echo    missing: run_v7_Validate_TerminalWeights_ZeroCost.ps1)
if exist "%RTS%" (echo    found: the zero-cost validation .rts) else (echo    missing: the zero-cost validation .rts)
goto done

:nocsv
echo STOPPED: Terminal_Weights.csv is not in %SCR%
echo.
echo Use the SAME Terminal_Weights.csv the cost-inclusive run used (for a fair comparison), or
echo re-export it from the web terminal's Backtest section if you no longer have it.

:done
echo.
pause
