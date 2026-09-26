@echo off
rem Double-click AFTER the daily workflow has finished: runs the optional part E price history for the Ask tab.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RealTest21_newerv2\Scripts\run_v7_history.ps1" -Ask

