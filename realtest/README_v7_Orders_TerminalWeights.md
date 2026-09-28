# Orders mode: next-session order list from Terminal_Weights.csv

This is the `-orders`-mode companion to the RealTest validation runner
(`README_v7_Validate_TerminalWeights.md`). It uses the exact same proven strategy logic — the
`Shares <> 0` fix that made the validation run's trade count match the terminal's own (970 vs
964, confirmed against three real RealTest runs) — but instead of replaying history for a
return/drawdown comparison, it asks RealTest: *"given this exact sequence of picks, what should
I buy, sell, or resize for the next trading session?"*

## What you get

`AlexAligned_Unified_v7_Orders_TerminalWeights_Orders.csv` — a plain order list (symbol, side,
quantity) for the session after `Terminal_Weights.csv`'s own last dated row.

## The one thing to get right: how current is your CSV?

RealTest's `-orders` mode always generates orders for "the day after the last date this run has
data for." That's controlled entirely by `Terminal_Weights.csv`'s last row — there's no separate
"as of today" concept. In practice:

- **Run the terminal's backtest through today's date, then export immediately.** Because the
  terminal's live tracker and its backtest replay use the exact same frozen portfolio rules, a
  backtest window ending today reproduces today's own live recommendation as its final row. Do
  this, and the orders you get here are genuinely actionable for tomorrow — and also an
  independent RealTest-side check of the terminal's own "Latest update" BUY/SELL/HOLD section.
- **A stale CSV gives stale orders.** The launcher warns you if `Terminal_Weights.csv` is more
  than 24 hours old, but "less than 24 hours old" doesn't guarantee it covers today — check its
  last date yourself if in doubt.

A cleaner "export today's live weights directly, without running a full historical backtest
first" button is a planned future addition to the terminal, not built yet. This script works with
what already exists today.

## How to run it

1. Export `Terminal_Weights.csv` from the terminal's Backtest section (window ending today) and
   place it in `C:\RealTest21_newerv2\Scripts\SectorTerminalScripts`, same folder as the `.rts`.
2. Run `Run_AlexAligned_v7_Orders_TerminalWeights.bat`.
3. Read `AlexAligned_Unified_v7_Orders_TerminalWeights_Orders.csv` for the order list.
4. Compare it against the terminal's own "Latest update" section for the same portfolio.

## Unvalidated

Unlike the `-test` validation script (confirmed against three real runs today), this script's
`OrderSettings:`/`OrdersMode:`/`OrdersFile:` block has not yet been run against a real
`RealTest.exe -orders` invocation — it was checked against the RealTest 2.1 script language
reference's own worked example line by line. If RealTest reports a parse or runtime error on
first run, report the exact text back before hand-editing around it.
