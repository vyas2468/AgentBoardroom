@echo off
rem Double-click AFTER copying Terminal_Weights.csv (exported from the web terminal's Backtest
rem section) into this same folder. Runs the RealTest cross-check in Test mode.
rem The window always stays open at the end, so any message can be read.
setlocal
set "SCR=C:\RealTest21_newerv2\Scripts\SectorTerminalScripts\AutomationWorkflow"
set "PS1=%SCR%\run_v7_Validate_TerminalWeights.ps1"
set "RTS=%SCR%\AlexAligned_Unified_v7_Validate_TerminalWeights.rts"
set "CSV=%SCR%\Terminal_Weights.csv"
echo === AlexAligned v7: validate against Terminal_Weights.csv ===
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
echo    run_v7_Validate_TerminalWeights.ps1
echo    AlexAligned_Unified_v7_Validate_TerminalWeights.rts
echo.
if exist "%PS1%" (echo    found: run_v7_Validate_TerminalWeights.ps1) else (echo    missing: run_v7_Validate_TerminalWeights.ps1)
if exist "%RTS%" (echo    found: the validation .rts) else (echo    missing: the validation .rts)
goto done

:nocsv
echo STOPPED: Terminal_Weights.csv is not in %SCR%
echo.
echo Export it from the web terminal's Backtest section (the "Download Terminal_Weights.csv"
echo button, for the portfolio and date range you want to check) and copy it into
echo    %SCR%
echo Then run this .bat again. See README_v7_Validate_TerminalWeights.md for details.

:done
echo.
pause
