@echo off
rem Double-click to run the AlexAligned v7 daily workflow (C, B, A, merge, terminal gate).
rem The window always stays open at the end, so any message can be read.
rem NOTE: this .bat and its .ps1 now live in AutomationWorkflow for tidiness, but the actual
rem Part C/B/A/D scan scripts and their daily output CSVs are UNCHANGED -- still directly in
rem SectorTerminalScripts, one level up. run_v7_workflow.ps1's own $Scr variable points there,
rem not here. Do not move the Part A/B/C/D .rts files into this folder.
setlocal
set "SCR=C:\RealTest21_newerv2\Scripts\SectorTerminalScripts\AutomationWorkflow"
set "PS1=%SCR%\run_v7_workflow.ps1"
echo === AlexAligned v7: daily workflow (C, B, A, merge, terminal gate) ===
echo.
if not exist "%PS1%" goto missing
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Ask -NoPause
echo.
echo PowerShell finished with exit code %ERRORLEVEL%. 0 means ALL GATES PASSED (or you cancelled).
goto done

:missing
echo STOPPED: run_v7_workflow.ps1 was not found at
echo    %PS1%
echo.
if exist "%~dp0run_v7_workflow.ps1" echo This .bat has it next to it in %~dp0 - move it into %SCR%.
echo Update the SCR line at the top of this .bat if your scripts live somewhere else.

:done
echo.
pause
