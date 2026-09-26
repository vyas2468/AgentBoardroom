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
| v99 | My tiles (saved questions; browser + account sync), modern styling |

## Open items (owner's wish list)
1. Navy colour theme next to dark / light: add tokens under a `data-theme="navy"` attribute and check every tab, chart,
   map, table and PNG export for hard-coded colours before publishing.
2. Connections questions ignore "in rising subsectors" (the xlink engine does not take that filter yet).
3. AF Approach layout for very large subsectors (20+ names) is visible but busy.
4. Optional: open a pull request into main when the owner asks.
