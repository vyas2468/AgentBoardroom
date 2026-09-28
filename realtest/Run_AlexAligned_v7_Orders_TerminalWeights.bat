@echo off
rem Runs RealTest in -orders mode to generate a next-session order list from
rem Terminal_Weights.csv. See the .rts file's Notes: for the important caveat about how
rem "next session" is only genuinely tomorrow if the CSV was exported from a backtest whose
rem window runs through today. The window always stays open at the end, so any message can
rem be read.
setlocal
set "SCR=C:\RealTest21_newerv2\Scripts\SectorTerminalScripts"
set "PS1=%SCR%\run_v7_Orders_TerminalWeights.ps1"
set "RTS=%SCR%\AlexAligned_Unified_v7_Orders_TerminalWeights.rts"
set "CSV=%SCR%\Terminal_Weights.csv"
echo === AlexAligned v7: next-session orders from Terminal_Weights.csv ===
echo.
if not exist "%PS1%" goto missing
if not exist "%RTS%" goto missing
if not exist "%CSV%" goto nocsv
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Ask -NoPause
echo.
echo PowerShell finished with exit code %ERRORLEVEL%. 0 means the run PASSED (no parse/runtime errors) or you cancelled.
goto done

:missing
echo STOPPED: order-generation files are not in %SCR%
echo.
echo Needed directly in that folder, not in a subfolder:
echo    run_v7_Orders_TerminalWeights.ps1
echo    AlexAligned_Unified_v7_Orders_TerminalWeights.rts
echo.
if exist "%PS1%" (echo    found: run_v7_Orders_TerminalWeights.ps1) else (echo    missing: run_v7_Orders_TerminalWeights.ps1)
if exist "%RTS%" (echo    found: the orders .rts) else (echo    missing: the orders .rts)
goto done

:nocsv
echo STOPPED: Terminal_Weights.csv is not in %SCR%
echo.
echo Export it from the web terminal's Backtest section -- for a genuinely current order list,
echo run the backtest through TODAY's date first, then export, so the CSV's last row is today's
echo own live picks. Copy it into %SCR% and run this .bat again.

:done
echo.
pause
