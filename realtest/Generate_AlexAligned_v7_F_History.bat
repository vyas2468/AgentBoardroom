@echo off
rem Double-click this FIRST, before Run_AlexAligned_v7_F_History.bat.
rem Finds whichever of your part A/B/C/D scripts sit in this same folder and generates the
rem matching part-F historical scan scripts -- no need to type a node command by hand.
rem The window always stays open at the end, so any message can be read.
setlocal
set "PS1=%~dp0generate_v7_F_history.ps1"
echo === Generate part-F historical scan scripts ===
echo.
if not exist "%PS1%" (
  echo STOPPED: generate_v7_F_history.ps1 is not next to this .bat file.
  echo.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
echo.
echo PowerShell finished with exit code %ERRORLEVEL%. 0 means scripts were generated.
pause
