@echo off
rem Double-click AFTER the daily workflow has finished: runs the optional part E price history for the Ask tab.
rem The window always stays open at the end, so any message can be read.
setlocal
set "SCR=C:\RealTest21_newerv2\Scripts\SectorTerminalScripts\AutomationWorkflow"
set "PS1=%SCR%\run_v7_history.ps1"
set "RTS=%SCR%\AlexAligned_Unified_v7_E_History_26.09.2026.rts"
echo === AlexAligned v7 part E: price history ===
echo.
if not exist "%PS1%" goto missing
if not exist "%RTS%" goto missing
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Ask -NoPause
echo.
echo PowerShell finished with exit code %ERRORLEVEL%. 0 means PART E PASSED or you cancelled.
goto done

:missing
echo STOPPED: part E files are not in %SCR%
echo.
echo Needed directly in that folder, not in a subfolder:
echo    run_v7_history.ps1
echo    AlexAligned_Unified_v7_E_History_26.09.2026.rts
echo.
if exist "%PS1%" (echo    found: run_v7_history.ps1) else (echo    missing: run_v7_history.ps1)
if exist "%RTS%" (echo    found: the part E .rts) else (echo    missing: the part E .rts)
if exist "%~dp0run_v7_history.ps1" echo This .bat has them next to it in %~dp0 - move all files into %SCR%.

:done
echo.
pause
