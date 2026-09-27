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

## Scale and RAM (worth planning for up front)
- **RT side (part F + validation runner):** RT is built for large universes over many years, so a ~575-symbol,
  1-3 year daily scan history is well within its normal range — no special handling needed there. Two script-level
  choices keep it lean anyway: (a) `NumBars` sized to what's actually needed (e.g. 260 for one year, not the whole
  history) so the export doesn't grow unbounded; (b) the validation runner is its OWN small script (just
  `DataValueFile` + `DynamicSizing`), not folded into parts A-D, so a big backtest run never touches the live import.
- **Browser side (the terminal doing the replay) is the real constraint**, not RT: one merged scan CSV per rebalance
  date, held in the browser's JS heap and IndexedDB. Mitigations already in the plan (and to enforce in code):
  - Only fetch/keep the point-in-time data for rebalance dates actually needed for one replay, not the whole part F
    file at once (stream per-date rows, discard after use).
  - Heavy O(n²) engines (correlation penalty, price clusters, Hidden Groups) recompute only on rebalance dates
    (weekly/monthly), never daily, and only over the candidate shortlist, not the full ~575-symbol universe.
  - Store part F in IndexedDB like part E already does (not localStorage, which is far smaller), and cap how many
    days a single browser session replays in one go (chunk a multi-year backtest into yearly slices if needed).
  - A daily-rebalance, multi-year replay of a heavy-engine portfolio is the worst case; test that combination early
    (not just monthly) to see the real ceiling before promising it works for every rhythm.

## Design decision: the tracker's settings vs. RealTest's native equivalents
Confirmed (27 Sep, after the owner asked): the Portfolio Tracker's phase-2 settings (rebalance rhythm, entry fill,
cost bps, weight source) exist ONLY to drive the browser's live, forward-tracking estimate. They are NOT ported
into the RT backtest, and RT does NOT need a JS-equivalent re-implementation of any of them — RT already has
better, native tools for all four, using the SAME price series it trades with (no risk of the two engines
disagreeing on e.g. how volatility was measured):
- Rebalance timing -> RT's built-in `EndOfWeek` / `EndOfMonth` / `EndOfQuarter` / `EndOfYear`, gating
  `EntrySetup`/`ExitRule` or a `DynamicSizing` `Quantity` formula (documented RT pattern, "Rotational / Monthly
  Rebalance" example in realtest_script_language.md).
- Costs -> RT's native `Commission:` / `Slippage:` settings (real per-transaction accounting), not a bps deduction
  in a JS loop.
- Weighting -> an RT `Quantity:` formula: `100/Positions` (equal), `#Rank`-based (rank), or a native
  `StDev()`/return-based formula (inverse volatility) — computed by RT itself from the imported OHLC.

Consequence for the design in "Architecture" above: the terminal's replay/export (step 4) exports a DAILY,
cadence-agnostic list of the frozen query's eligible picks (+ rank, if the RT-side weighting needs it) — it does
NOT pre-bake rebalance timing, costs or weighting into the export. The RT validation-runner generator (step 5)
translates each tracked portfolio's OWN settings (settings.rebalance, settings.cost, settings.weight) into the
matching native RT directives when it writes that portfolio's `.rts` file (e.g. `settings.rebalance:"monthly"` ->
`Rotate: EndOfMonth` in the generated Data: section; `settings.cost` bps -> a `Commission:`/`Slippage:` formula;
`settings.weight` -> the matching `Quantity:` formula). One job stays in JS (selection logic RT cannot compute:
Early Warning direction, convergence lenses, clusters, correlation penalties); one job stays in RT (everything RT
already does correctly). Phase-2 tracker settings need NO rework for this — they're already correct and tested for
their own (browser, forward-tracking) purpose.

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
