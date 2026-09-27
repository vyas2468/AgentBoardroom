# Backtesting Ask-terminal portfolios with RealTest — plan (27 Sep 2026)

## The goal
Any portfolio built and tracked in Ask the terminal can also be tested over past years, correctly (no look-ahead), with
RealTest (RT) doing the trade accounting, and the same rules used for live tracking.

## Is Gemini's idea right?
Half right.
- RIGHT (the RT side): RT can read per-date, per-symbol values from a CSV (`DataValueFile:` + `#DataValueFile`, `#Pad`
  turns missing rows into 0) and re-target every position each bar (`DynamicSizing: True`, `QtyType: Percent`,
  Quantity 0 = exit). A `Date,Symbol,TgtW` weights file therefore drives an exact RT backtest with RT's own costs,
  equity curve, CAGR and drawdown. Both features are in the RT 2.1 language reference.
- MISSING (the terminal side): the terminal only holds TODAY's scan. It cannot "iterate backward through the dataset"
  because Early Warning direction, severity, convergence lenses, clusters, anomaly etc. are computed by RT scripts
  A–D for the latest bar only. Replaying past days needs the scan AS IT WAS on each past day.
- THE FIX: the part scripts already say it: with `ScanSettings: NumBars` above 1 the scan "writes one row per symbol PER
  BAR". A "part F" copy of parts A–D with `NumBars: N` (e.g. 260 = one year) exports the scan fields for every past
  day. That is the historical record the terminal needs, computed by the same formulas as the live scan.

## Architecture (three pieces, one set of rules)
1. RT part F (history of the scan): parts A–D copied by a generator (like the part E generator) with
   `NumBars: N`, a new `SaveScanAs` name and a Date column; merged per date (like merge_v7_scans.py, keeping Date).
   The part E price history is lengthened to cover N + 252 bars (12-month lookbacks need a year before the first
   test day).
2. Terminal replay ("Backtest this portfolio" in the Portfolio Tracker): for each rebalance date d, build the
   terminal's data from the part F rows for d and the part E prices up to d only (no future bars), run the portfolio's
   frozen query through the SAME Ask engine, and record the picks. The existing tracker engine turns those records
   into trades and an equity curve (next-open fills, costs), so the in-page backtest and live tracking are one
   code path. Export `Terminal_Weights.csv` (Date, Symbol, TgtW).
3. RT validation runner: a small .rts that loads `Terminal_Weights.csv` through `DataValueFile`, trades it with
   `DynamicSizing` at the next open with the same costs, and saves trades / equity CSVs. RT's result must match the
   page's within rounding, which proves the terminal's accounting is right; RT then adds its full statistics.

## Honesty limits (stated in the answers)
- Universe: today's members only (survivorship bias) unless part F uses point-in-time index membership (Norgate
  `InSPX`-style); flagged, fix later.
- Heavy page-only engines (price clusters, correlation penalty, Hidden Groups from price history) are recomputed only on
  rebalance dates (weekly / monthly) to keep the replay fast; daily rebalancing uses the cached last value.
- Warm-up: the first test day needs a full lookback; earlier days are skipped, not approximated.
- It is a test of the rules, not a forecast.

## Task list (in order, and why)
0. Backup the current page (v138) + tag the repo. (So any step can be reverted.)
1. Quick fixes the owner found (small, user-facing, unblock tracking):
   a. "Track this portfolio" missing on one-per-cluster / block portfolios (`hcport` modes like `oneper`).
   b. "Build a portfolio of ILMN, RVTY, … , weighted" ignores the named tickers (picks A, QCOM, SMCI …) and ignores
      "weighted": restrict to the named tickers (onlyTk) and read "weighted" as score weights.
2. Tracker phase 2 core (needed by backtests too): per-portfolio settings — rebalance daily / weekly / monthly /
   quarterly / yearly, entry next open / close, costs, weights as the answer said. Engine tests first.
3. Part F RT scripts (owner runs them on Windows — started early so data is ready when step 4 is): generator + .bat,
   history of parts A–D, merge with Date; longer part E. Validate on 5 dates against the saved daily scans.
4. Terminal replay + "Backtest this portfolio": point-in-time data builder, replay loop, results in the tracker
   (equity vs RSP, trades, stats, rebalance comparison), Terminal_Weights.csv export. Tests: no-look-ahead test
   (deleting all rows after d must not change the picks on d), same-day parity with the live answer.
5. RT validation runner (.rts + .bat): weights → RT trades/equity; compare with the page; document the match.
6. Regression (348 answers + tracker tests), publish, handoff.

## Model use (owner's request)
Planning / review: Opus. Implementation steps 1–5: Sonnet sub-agents with precise briefs; every change regression
tested before publish.
