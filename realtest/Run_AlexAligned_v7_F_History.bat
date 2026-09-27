@echo off
rem Double-click AFTER you have generated at least one part-F .rts (see README_v7_F_history.md).
rem Runs the historical scan export (parts A/B/C/D, whichever exist) and merges them.
rem The window always stays open at the end, so any message can be read.
setlocal
set "SCR=C:\RealTest21_newerv2\Scripts"
set "PS1=%SCR%\run_v7_F_history.ps1"
set "MERGE=%SCR%\merge_v7_F_history.py"
echo === AlexAligned v7 part F: historical scan for backtesting ===
echo.
if not exist "%PS1%" goto missing
if not exist "%MERGE%" goto missing
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Ask -NoPause
echo.
echo PowerShell finished with exit code %ERRORLEVEL%. 0 means PART F PASSED or you cancelled.
goto done

:missing
echo STOPPED: part F files are not in %SCR%
echo.
echo Needed directly in that folder, not in a subfolder:
echo    run_v7_F_history.ps1
echo    merge_v7_F_history.py
echo    at least one AlexAligned_Unified_v7F_[A-D]_History.rts (generate with gen_v7_F_history.js)
echo.
if exist "%PS1%" (echo    found: run_v7_F_history.ps1) else (echo    missing: run_v7_F_history.ps1)
if exist "%MERGE%" (echo    found: merge_v7_F_history.py) else (echo    missing: merge_v7_F_history.py)
if exist "%~dp0run_v7_F_history.ps1" echo This .bat has them next to it in %~dp0 - move all files into %SCR%.

:done
echo.
pause
