# Handoff: Sector Rotation Terminal (end of 26 Sep 2026 session)

**Live page:** https://claude.ai/artifact/JBivgL88qHWeaCSsepr7cN (latest published version listed in the summary file)
**Branch:** `claude/artifact-access-question-f3s8rs`
**How to work on it:** read `.claude/skills/sector-terminal/SKILL.md` first (setup, build, test, publish, lessons).
**Owner-facing history:** `docs/SESSION_COMPLETE_FINAL_2026-09-26.txt` (plain English, Parts 1-13).

## State
- Base page `artifact/base/orig.html` + layers `artifact/layers/v81.js ... v99.js`, built by `splice81.py`.
- Everything is published, committed and pushed. Regression suite passes: 49 original questions and all earlier tile
  questions answer word for word as before; all newer tile questions answer; no page errors.
- Test data in `artifact/tools/fixtures` (scan + gzipped part E history); question sets in `artifact/tools/tests`.

## What each layer does
| Layer | Adds |
|---|---|
| v81 | Part E price history loader, long-horizon fields, `window.__hxApi` |
| v82 | Downloads, zip, PNG export helpers, Subsector Web switches |
| v83-v84 | Tear-sheet history block, price correlation matrix, hidden-group / relationship checks, radar |
| v85 | Alex-style pair test (cointegration) |
| v86 | Jump-to-bottom arrow, section menu |
| v87 | Relationship questions (peers, misfits, breaking / forming, lead-lag, price groups) |
| v88 | Hierarchical clusters map, blocks in Ask, `__hxClusters` |
| v89 | "Save as PNG (3x)" everywhere |
| v90 | Guide tab |
| v91 | Correlation questions (pairs, matrices, sector pairs, related pairs, low-correlation portfolios) |
| v92 | Process maps |
| v93 | Example tiles (themes and questions) |
| v94 | Charts in answers, cluster / block portfolios (with extra conditions), hedges, diagnostics, anomaly check, Subsector Web in Ask |
| v95 | AF Approach (correlation-tree Subsector Web), maps in Ask (relationship, convergence, matrix, hidden groups) |
| v96 | Alex-style colour-coded sentiment / breadth / SEW tables |
| v97 | Ask: show/hide switches, per-answer timing, remove + undo, thread PNG / PDF export |
| v98 | Spelling, ETF tear links, adaptive portfolios (stocks, ETFs, mixed, smart long/short), shared conditions, connections, themes and rotation, foldable tabs |
| v99 | My tiles (saved questions; browser + account sync), modern styling, full-width layout, aligned header (version 110) |

## Open items (owner's wish list)
1. Navy colour theme next to dark / light: add tokens under a `data-theme="navy"` attribute and check every tab, chart,
   map, table and PNG export for hard-coded colours before publishing.
2. Connections questions ignore "in rising subsectors" (the xlink engine does not take that filter yet).
3. AF Approach layout for very large subsectors (20+ names) is visible but busy.
4. Optional: open a pull request into main when the owner asks.

---

## NEXT TASK (start here in the new session): "Tracked lists" - daily buy / sell / hold and performance

### The owner's request (their words, summarised)
Each day, get the terminal to give a final list of tickers from a saved combination question, use it as a research tool
for real orders, and track how it performs: names that drop off the list are sold, new names are bought, names that
remain are held.

### The answer given at the end of the last session (verbatim)
Partly. You can already get a daily list: save the question in My tiles, load the new scan and part E each day, and
press Run. With the same data the same question always gives the same list, so any change comes from the new day's
data. What the terminal doesn't do yet is the bookkeeping you describe.

What's missing today:
1. It doesn't remember yesterday's list. Each answer stands alone, so you'd have to compare the lists by eye to see
   what's new and what dropped out.
2. There's no buy / sell / hold view. Your logic is right: names that drop out are sells, new names are buys, and names
   still on the list are holds. But nothing works that out for you.
3. There's no performance record. Nothing stores the entry date and price, or compares later prices with RSP, so you
   can't see how the list has done over time.

What I'd add (a "Tracked lists" feature, built the same safe way as before):
- Mark a question as tracked: mark any My tiles question as tracked. Each day you press Run, or "Run all tracked" in
  one go.
- Snapshots: each run saves the tickers, the scan date and each name's closing price to your account, like My tiles.
- Changes table: a colour-coded table of BUY (new), SELL (dropped) and HOLD (kept), with the reason each name entered or
  left, e.g. "no longer improving" or "fell out of the top 10".
- A buffer rule against churn: without one, a name at rank 10 today and 11 tomorrow gets sold and bought back, which
  costs money in real trading. The usual fix: keep holding until a name falls below, say, rank 15, and only buy names in
  the top 10. Optionally, add a minimum holding period.
- A performance ledger: each position's entry date and price, its current price and return, the list's equal-weight
  return against RSP, and closed trades with their results. It's all computed from the scan prices you load each day.

Limits to keep in mind:
- The scan is end-of-day, so any real order would fill at the next day's prices. The ledger would show that, so it
  doesn't flatter results.
- The ledger tracks the list itself, not your broker fills. If you want your actual fills, it would need your own entry
  prices typed in.
- It's a way to track results going forward, not a backtest. The terminal can't replay past days, because it only keeps
  the scans you've saved.

Cost: this is one new layer plus tests, a similar size to My tiles (roughly 1.5-2x that work). It's best done in a
fresh session.

### Step-by-step plan for the new session
1. Read this file and use the `sector-terminal` skill (`.claude/skills/sector-terminal/SKILL.md`): set up the scratch
   folder from `artifact/`, build with `splice81.py`, run the baseline regression and save the outputs as the reference.
2. Write a new layer `v100.js` (add it to splice81.py after v99). Nothing in v81-v99 changes except, if needed, a small
   hook in v99 for a "Track" toggle on each My tiles question.
3. Tracked flag: each My tiles question gets a "Track" switch (stored in the same `mytiles/main` document as a list of
   tracked questions; keep the existing `tiles` field unchanged for compatibility).
4. Snapshot on run: when a tracked question is answered, read the answer's ticker list from `res.send.items` (sides
   long / short) or the table's Symbol column, plus the scan date (`U.date`) and each name's close (`SYM` px, or
   part E last close). Store one document per question per scan date, e.g. `tracked/<questionId>/days/<YYYY-MM-DD>`
   (path grammar: even segment count for documents). Re-running on the same scan date overwrites that day, never
   duplicates.
5. Changes view in the answer: compare with the previous stored date -> BUY (new), SELL (dropped), HOLD (kept); for each
   dropped name say why where possible (re-test the question's conditions on that row via `window.__pcond` / the spec
   filters, or "fell out of the top N").
6. Buffer rule (optional per tracked question, default off): buy only names ranked <= N, keep holding until rank > N+B
   (default B = N/2); optional minimum holding days. Show which names were kept by the buffer.
7. Ledger: positions (entry date, entry price = close on the entry scan date, noted as "next open in practice"),
   current price, return, days held; closed trades with exit date/price/return; the list's equal-weight return since
   start against RSP (from part E closes). Offer a CSV download of the ledger (downloads helper in v82).
8. "Run all tracked" button in My tiles: runs every tracked question in order (reuse the existing Run all pattern).
9. Test: extend a harness script that simulates two scan dates (load the scan, run, then change `U.date` / prices or
   use two saved scans) and checks BUY / SELL / HOLD and ledger maths; run the full regression (49 base, 207 tiles,
   64 newer tiles - all must be word for word unchanged); simulate the db like `artifact/tools/v99_cloud.js`.
10. Publish to the same artifact URL (omit capabilities), copy layers to `artifact/layers`, update this handoff and the
    owner's summary file, commit and push, send the summary file.
