# Validate against Terminal_Weights.csv

This is an independent second opinion on the web terminal's own Backtest section. The terminal
already computes an equity curve for a portfolio over a date range and shows ending value,
return, and max drawdown. This RealTest script takes the exact sequence of positions the
terminal held -- nothing recomputed, nothing re-derived -- and prices that same sequence with
RealTest's own fill, commission and slippage model. If the two engines land on close to the same
ending value/return/drawdown for the same portfolio and dates, that is strong evidence the
terminal's own backtest math is right. If they diverge a lot, something is worth digging into.

## What it does and does not do

It does **not** run the sector rotation strategy itself -- no momentum scores, no basket
selection, none of that. It only reads a CSV of (rebalance date, symbol, weight) rows and holds
each symbol at its target weight until the CSV tells it to change, exactly like a trader
following someone else's model portfolio sheet. All of the actual rotation decisions came from
the terminal; RealTest is only checking the arithmetic of turning those decisions into an equity
curve.

## Step by step

1. In the web terminal, open the **Backtest** section for the portfolio you want to check, run it
   for whatever date range you care about, and use its **"Download Terminal_Weights.csv"**
   export. Note the ending value, return, and max drawdown it reports -- you'll compare against
   these at the end.
2. Copy `Terminal_Weights.csv`, unchanged, into `C:\RealTest21_newerv2\Scripts\SectorTerminalScripts\AutomationWorkflow`,
   the same folder as `AlexAligned_Unified_v7_Validate_TerminalWeights.rts`.
3. Open `AlexAligned_Unified_v7_Validate_TerminalWeights.rts` in a text editor and check the
   `StartDate`/`EndDate` lines under `TestSettings:` match the date range you actually backtested
   in the terminal. They default to 2025-09-15 through 2026-09-25 (the last documented terminal
   Backtest window at the time this script was written) -- if your export used a different
   window, edit both dates to match before running. A mismatched window will not produce an
   error; it will just silently compare the wrong stretch of the terminal's numbers.
4. Double-click `Run_AlexAligned_v7_Validate_TerminalWeights.bat`. It checks that RealTest isn't
   already running, that the shared data file and the CSV both exist, then runs RealTest once in
   Test mode. This never touches the shared `alexaligned_unified_v7.rtd` data file -- it only
   reads prices from it, the same way part E does.
5. When it finishes, it prints where three files landed next to the script:
   `..._Results.csv` (one row: ending equity, return, max drawdown, trade count -- the numbers to
   compare against the terminal), `..._Trades.csv` (the full trade list, useful if you want to
   check a specific fill), and `..._Equity.csv` (the daily equity curve, useful for plotting the
   two curves against each other).
6. Compare `..._Results.csv`'s ending value / return / max drawdown against what the terminal's
   own Backtest section reported for that same portfolio and date range in step 1.

## Reading the comparison

**A close match** (small differences, on the order of a few tenths of a percent) is expected and
fine -- it almost certainly comes from RealTest's own commission/slippage assumptions (edit or
zero those out in the `.rts` file's `Strategy:` section if you want a friction-free comparison),
small next-bar-fill timing differences, or rounding in weight-to-share conversion. That is a
**match**: it means the terminal's own backtest arithmetic is doing what it should for this
portfolio.

**A large or systematic divergence** -- ending values far apart, a very different drawdown shape,
or a trade count that doesn't make sense for the number of rebalance dates in the CSV -- means
something is worth investigating: either the terminal's Backtest section has a bug in how it
turns weights into P&L, or `Terminal_Weights.csv`'s export doesn't actually match what the
terminal's own chart shows (e.g. a rounding or timing difference in how weights were captured).
Either way, the trade list and equity curve CSVs from this run are the place to start narrowing
down where the two engines first disagree.

## A note on how this was built

This script was written and reviewed against the RealTest 2.1 script language reference, but it
has not been run against a real copy of RealTest.exe (not available in the environment that wrote
it). If RealTest reports a parse error the very first time you run it, please note the exact
error text -- that is the fastest way to get the syntax corrected.
