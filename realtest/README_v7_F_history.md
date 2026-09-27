# Part F: historical scan export for RealTest backtesting

Part F answers a question parts A-E cannot: what did the scan's own indicators (Early Warning
direction, severity, convergence lenses, clusters, anomaly, etc.) look like on every PAST bar,
not just today's. Part E already does this for raw prices only; part F does it for the full
indicator set, split the same way A/B/C/D already are, for speed.

## Why this is safe (read this before running anything)

- **Every formula is copied byte for byte.** `gen_v7_F_history.js` changes exactly two lines in
  a copy of your existing part A/B/C/D script -- `NumBars: 1` becomes `NumBars: <N>`, and
  `SaveScanAs` points at a brand new filename. Nothing else in the file is touched, so the
  numbers it produces use the exact same, already-validated formulas as your daily scan.
- **It can never overwrite your daily scan output** -- the generator refuses to run if the new
  filename would collide with the original.
- **It never touches Import** (that block only runs with `-import` on the command line, exactly
  like parts A-D already work) **or the shared .rtd file's contents** -- part F only ever runs
  with `-apply -scan`, read-only against data already imported by your normal daily workflow.
- **It reuses the existing A/B/C/D split**, not a new one. Those four scripts were already split
  by column for speed; running each part-F variant only recomputes what that part already
  computes. No formula in A/B/C/D was hand-edited or re-derived to build this.

## One-time setup

**Easiest: double-click `Generate_AlexAligned_v7_F_History.bat`.** It finds whichever of your
part A/B/C/D scripts sit in the same folder and generates the matching part-F scripts
automatically -- no typing required. Run it again any time you want to regenerate with a
different NumBars (`generate_v7_F_history.ps1 -NumBars 60`, if you prefer PowerShell directly).

Or, to generate just one part by hand (e.g. to try part C alone first):
```
node _generators\gen_v7_F_history.js  AlexAligned_Unified_v7_C_....rts  AlexAligned_Unified_v7F_C_History.rts  260
```
The generator refuses to run (with a clear error) if the source file doesn't look like a normal
part A/B/C/D script, rather than guessing.

**Why 260 bars to start:** about one year of trading days. It's a real, useful backtest window
on its own, and it's the number to try first before committing to a multi-year export, since a
part containing peer-correlation, InList membership or `Correl()` "engines" can take much
longer per output bar than the daily 1-bar scan -- those recompute for every bar written out,
not just the latest one. If a part is too slow at 260, re-run the generator for that part alone
with a smaller number (e.g. 60); the other parts can keep 260. Never hand-edit a generated
script's `Data:`/`Scan:` section to try to speed it up.

Put all of these files (the `.py`, `.ps1`, `.bat` and the generated `.rts` scripts) in the same
Scripts folder as your other launchers -- or in a subfolder of your own, e.g.
`Scripts\SectorTerminalScripts`, which is fine: RealTest resolves `DataFile:` and `?scriptpath?`
paths correctly either way. If you use a subfolder, edit the `$Scr`/`SCR` line near the top of
`run_v7_F_history.ps1` and `Run_AlexAligned_v7_F_History.bat` to point at it (leave `$Root` as
`C:\RealTest21_newerv2` -- that is RealTest.exe's own folder, not affected by moving Scripts).
The same two-line edit applies to your existing part A-E launchers if you move those too.

## Running it

Double-click `Run_AlexAligned_v7_F_History.bat` after your normal daily workflow has imported
data at least once. It:
1. Checks RealTest isn't already running, and that the shared data file exists.
2. Runs each part-F script it finds (1 to 4 of them -- it's fine to start with just one).
3. Verifies each run's batchlog/errorlog/output CSV, the same way the other launchers do.
4. Merges all produced CSVs by (Date, Symbol) with `merge_v7_F_history.py` into one combined
   file, `AlexAligned_Unified_v7F_History_<N>bars_Merged.csv`.
5. Prints PASS/FAIL and stays open so you can read it.

If you only generated part C, only part C runs and merges (a valid one-column-family backtest
history on its own) -- you don't need all four to try this out.

## What's next

This merged CSV is the input the terminal's point-in-time replay ("Backtest this portfolio")
will read from, once that feature is built (see `docs/RT_BACKTEST_PLAN_2026-09-27.md` in the
main repo). Nothing on the web app side depends on this yet -- generating and running part F is
independent, safe to do at any time, and does not change anything about your existing daily
workflow, part E, or the live terminal.
