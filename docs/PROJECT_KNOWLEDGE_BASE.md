# Sector Rotation Terminal + RealTest — Project Knowledge Base

**Purpose of this file:** orient a *new* Claude session (especially Claude Code CLI, which
doesn't inherit any chat memory) in a few minutes, without reading the ~29,000-line live
artifact page end to end. Read this file, then `.claude/skills/sector-terminal/SKILL.md`, then
go straight to the specific layer/tab/script you need. That should cover 90% of tasks without
opening `base/orig.html` at all.

Live page: **https://claude.ai/artifact/JBivgL88qHWeaCSsepr7cN**
Repo branch this was built on: `claude/artifact-access-question-f3s8rs`

---

## 1. What this project actually is

A single self-contained HTML page (a claude.ai Artifact) that turns a daily RealTest scan
export (a cross-sectional multi-factor equity scan: StepMA trend state, RMESA FIR/DSP line,
DVCWP clustering, Kalman velocity, Burg spectrum, composite/severity/anomaly scores — ~513
US large-cap names, 11 GICS-ish sectors, ~280+ computed columns) into ~68 analysis tabs, plus
a natural-language "Ask the terminal" query engine, a portfolio tracker with a historical
backtest replay, and a growing set of scripts that cross-check the page's own math against a
real RealTest run. Nothing on the page is AI-generated at answer time — every Ask answer is
either a small set of hand-written regex/JS rules or (rarely, as a documented fallback) a
Claude API call that only ever *writes a structured query spec*, never the prose. This
"deterministic engines only, nothing here is a forecast" framing is load-bearing across the
whole page — don't add anything that looks like a prediction or a recommendation.

## 2. Repository map

```
artifact/
  base/orig.html        <- the ORIGINAL page. NEVER edit this directly.
  layers/v81.js..v108.js<- every feature added since, as additive JS layers (see #4)
  layers/splice81.py    <- concatenates orig.html + all layers -> one page
  tools/harness.js      <- headless Playwright test runner
  tools/regress.sh      <- one-command regression: 5 suites vs saved baselines
  tools/probe.sh        <- ad-hoc single-question probe against a built page
  tools/tests/*.json    <- named question sets the harness runs (base/tiles/tall/bt/nd/...)
  tools/fixtures/live_scan.json      <- a real scan export, used to boot the page headlessly
  tools/fixtures/real_hist.csv.gz    <- a real Part-E price-history export (gunzip before use)
realtest/
  AlexAligned_Unified_v7_E_History_*.rts + Run_..._History.bat + run_v7_history.ps1
                          <- Part E: daily price-history export feeding trailing-return/
                             correlation features (see #6)
  AlexAligned_Unified_v7_Validate_TerminalWeights*.rts/.bat/.ps1 + README
                          <- cross-checks the page's OWN backtest math against a real
                             RealTest replay of Terminal_Weights.csv (see #6)
  AlexAligned_Unified_v7_Orders_TerminalWeights.rts/.bat/.ps1 + README
                          <- "what should I buy/sell for the next session" from the same
                             Terminal_Weights.csv (see #6) — NOT yet run for real, see #8
  Generate_AlexAligned_v7_F_History.bat, generate_v7_F_history.ps1, run_v7_F_history.ps1,
  merge_v7_F_history.py  <- Part F: a longer historical scan export, for backtesting further
                             back than Part E's window (optional, separate from Part E)
  v7_reference/           <- one reference copy of the Part C script, for context only
docs/
  FINAL_HANDOFF_*.txt     <- one plain-English handoff per work session, newest = most
                             accurate (see #9 for the full list and what each covers)
  PROJECT_KNOWLEDGE_BASE.md <- this file
.claude/skills/sector-terminal/SKILL.md
                          <- the actual step-by-step "how to safely change this page" recipe
                             (scratchpad setup, splice, regress.sh, publish, commit). Load it
                             with the Skill tool before touching any layer.
```

**What does NOT exist in this repo, and lives only on the user's Windows RealTest machine**
(`C:\RealTest21_newerv2\Scripts\SectorTerminalScripts\`): the daily main-scan Parts C/B/A/D
`.rts` scripts, `run_v7_workflow.ps1`, `Run_AlexAligned_v7_Workflow.bat`,
`install_alexrun_protocol.ps1`, and the merge/ingest generators. Those are only ever offered
to the user as **downloadable text embedded inside the page itself** (see `WF_LAUNCHER` /
`WF_INSTALLER` in `artifact/layers/v81.js`) — they predate this repo's `realtest/` folder and
were never checked in as files. **This is a known inconsistency** — see #8, item 1.

## 3. The three-way version-number trap (read this before touching anything)

There are **three completely independent numbering schemes** in play. Confusing them wastes
time:

1. **`artifact/layers/vNN.js` file names** (`v81.js` … `v108.js`). Just a sequential filename
   for each feature layer, in the order it was added. `splice81.py` concatenates them in
   exactly this numeric order. This is the ONLY numbering that matters for the codebase.
2. **Informal "vNNN published" labels in chat and in `docs/FINAL_HANDOFF_*.txt`** (v142, v143,
   v144… v147). These are just an informal running count of "how many times has this session
   published to the live artifact," invented in conversation for the user's convenience. They
   do **not** appear anywhere in the code, and do **not** correspond 1:1 with layer file
   numbers (e.g. layer `v107.js` was published as the informal "v146"; layer `v108.js` as
   "v147"). Don't try to derive one from the other.
3. **The claude.ai Artifact's own internal version id** (e.g. `1790636418-08c7`), returned by
   the `Artifact` tool's `read`/`publish` actions. This is the only version identifier the
   platform itself actually tracks.

When a handoff doc says "v146 confirmed live," it means sense #2, and you should verify
against sense #3 (read the live artifact, or just ask the user to check a specific new
question's behavior) rather than looking for "146" anywhere in the code.

## 4. How the page is built (read `.claude/skills/sector-terminal/SKILL.md` for the full recipe)

`artifact/base/orig.html` is the original page and is **never edited**. Every feature since is
an additive JS layer, `v81.js` through `v108.js`, each one an IIFE wrapped in try/catch that:
- monkey-patches existing global functions it needs to extend (capture the old function in a
  `_fnNameNN` var, define a new one that calls the old one first/last, reassign the global) —
  this is how almost every Ask-engine fix in this codebase works; see #7.
- registers new "kinds" in `QMX_KINDS` when it needs its own answer shape.
- appends new fields to existing lookup objects (`QM_SYM`, `QM_GRP`) — plain object literals,
  freely extensible from any later-loaded layer.

`splice81.py` concatenates `orig.html` + all layers into one page. **Never run a manual
regression/publish workflow without reading the skill file first** — it has the exact
scratchpad setup, the 5 regression suites and their expected-baseline files, and the publish
mechanics (including a claude.ai-specific "you must Read the entire live artifact source
before publish will be accepted" gate — see #10 for why this matters for CLI sessions).

## 5. Tab inventory (the page's own grouping, from `TG_GROUPS` in `orig.html`)

The page groups its ~68 tabs into 8 named themes (plus a "Master" quick-access group) via the
"Tab themes" pill row under the masthead. This is the fastest way to find where something
lives — click (or grep for) the group, not the whole tab bar.

| Group | Tabs (id — nav label, abbreviated) | What it's for |
|---|---|---|
| **Rotation & sectors** | rot, mo, rl, sw, sec, tm, lead, grain, sro, sst, stg, ild, arc, rtb | Where is money moving, sector/subsector level: the rotation quadrant, leaderboard, sector matrix, treemap, leaders/laggards, structure health scores, industry-vs-sector ledgers. |
| **Market reads** | pulse, movers, why, compass, div, rs, bdr, sgd, tin, spl | Whole-market context: breadth pulse, who moved the tape today, cross-asset compass, breadth internals, spread/lead-lag analysis. |
| **Relationships & graphs** | sbw, ng, cm, gm, hg, ripple, away, cg | Force-directed / network views: the Subsector Web, Relationship map, Correlation matrix, Hidden Groups (DVCWP clusters), Signal convergence map. |
| **Symbols & shortlists** | sym, uni, fun, hc, scr, cf | Per-symbol explorer, universe membership, the sector funnel, a short conviction shortlist, the confluence screener, and Conflicts (a name arguing with itself). |
| **Signals & structure** | ea, ah, rb, ms, sm, ab, ta, sd, cw, bc, tw, coh, look, vol, ext, theme, radar, cg | The largest group: one-lens-at-a-time diagnostics (Anomaly heatmap, Regime board, Momentum shape, Structure map, Attention board, Trend age, Structural drift, Contradiction watch, Breadth classifier, Trip wires, Cohorts, anomaly Themes). |
| **Baskets** | bkt, cg, mb, mbl, dmp | Long/short basket construction: Basket builder, Signal-convergence basket, Master basket (merges 3 methods), the Basket ledger (open/closed positions from saved history), the Decision Map. |
| **Tracking & history** | hst, ct, bt, rc | Cross-run history: the History tab (bump charts across saved scans), Call Tracker (pinned LONG/SHORT calls re-anchored over time), Basket tracker, Run comparison. |
| **Reference & AI** | qry, ai, eng, wf, src, src4 | **Ask the terminal** (see #7), AI Snapshot, "How the engine works," the Run-workflow operating procedure (see #6), and the page's own embedded source code (a meta "Source code library" tab). |
| *(Master, quick-access)* | mst + most of the above | A curated subset shown first; not a distinct category of its own. |

A handful of tabs (`mo`, `sw`, `gm`, `pulse`, `div`, `look`, `vol`, `ext`, `lead`, `grain`,
`theme`, `sbw`, `bdr`, `sgd`, `rs`, `movers`, `why`, `compass`, `radar`, `hg`, `ripple`, `away`)
render a "This tab needs the Unified v4 scan" placeholder until a *second*, optional scan
format ("Unified v4") is loaded — most of the day-to-day work (Master, Ask the terminal,
Basket builder, Backtest, Correlation matrix, Hidden Groups, Rotation) only needs the primary
scan and Part E history, not this v4 file.

**Every tab that renders real content also has a small "How this tab is built" figure at its
bottom** — an inline SVG process map with a plain-English caption describing its own data
flow. **When you need to understand one specific tab, read that figure's caption and the
`figcaption` text next to it, not the tab's full render function** — that's the "process maps"
shortcut the project owner specifically asked future sessions to use instead of reading
thousands of lines of chart-drawing code.

## 6. RealTest integration (two independent directions of data flow)

**A. RealTest → terminal** (produces the CSVs the page reads):
- **Main daily scan** (feeds nearly every tab): the user runs `Run_AlexAligned_v7_Workflow.bat`
  in `C:\RealTest21_newerv2\Scripts\SectorTerminalScripts\` on their own machine (NOT in this
  repo — see #2's "does not exist" note). Runs Parts C → B → A in strict sequence (~35 min
  total), merges into `AlexAligned_Unified_v7_scan.csv`, loaded into the page via the
  **Update** button / "newer scan" banner.
- **Part E — price history** (feeds trailing-return fields, correlation, the tear sheet, the
  backtest, and the new hierarchy/return-split diagnostic — see #7): `realtest/
  AlexAligned_Unified_v7_E_History_*.rts` + `Run_AlexAligned_v7_History.bat` +
  `run_v7_history.ps1`, all tracked in this repo. Run *after* the main scan, ~1 minute, loaded
  via the page's separate "Load price history" control.
- **Part F — longer historical scan** (optional, for backtesting further back than Part E's
  window): `realtest/generate_v7_F_history.ps1` + `Generate_AlexAligned_v7_F_History.bat`
  (generates the part-F `.rts` files via `_generators/gen_v7_F_history.js`) then
  `run_v7_F_history.ps1` + `Run_AlexAligned_v7_F_History.bat` (runs and merges them). Not on
  the day-to-day critical path.

**B. Terminal → RealTest** (independent cross-check that the page's own backtest math is
right, run in the opposite direction):
- Export **`Terminal_Weights.csv`** from the page's Backtest section for a tracked portfolio,
  drop it into `...\SectorTerminalScripts\`.
- **Validate**: `AlexAligned_Unified_v7_Validate_TerminalWeights.rts` (+ `.bat`/`.ps1`/README)
  replays it in RealTest's own Test mode and compares trade count / return / win rate against
  the page's own backtest result. **Confirmed working** against three real runs this session
  (970 RealTest trades vs. the page's own 964 — a near-exact match, after fixing two real bugs:
  an illegal `Side:` setting on a dynamic-sizing strategy, and RealTest splitting one holding
  period into many artificial trades because the export re-states a target weight for a
  held stock on every day it's held even though the page's own engine never resizes a held
  position — the RealTest script now ignores same-position weight restatements to match).
  A `_ZeroCost` variant isolates cost-drag from lot-splitting effects.
- **Orders mode**: `AlexAligned_Unified_v7_Orders_TerminalWeights.rts` (+ `.bat`/`.ps1`/README)
  asks "given this exact picks history, what should I buy/sell for the *next* session" instead
  of replaying the past. Built on the same proven sizing logic as Validate. **Not yet run for
  real** — see #8, item 2.

## 7. The Ask-the-terminal engine, in one page

Flow: `qmSubmit` → `qmAsk` (spelling/synonym normalization) → **`qmParseX`** (a chain of
layers, each either returning its own parsed spec or delegating to the previous layer —
*outermost-loaded layer runs first*) → **`qmValidateAny`** (dispatches on `spec.kind` via
`QMX_KINDS`, else falls through to the base engine's own `qmValidate`) → **`qmRun`/`qmRunX`**
(same dispatch pattern) → **`qmHtml`/`qmText`** (renders `res.lead`/`res.table`/`res.extra[]`/
`res.notes[]` generically, unless a layer has overridden `qmHtml` itself for a fully custom
layout — only `gadiag`, the "leader page," does this).

Useful globals: `qmT(q)` (normalized lowercase text), `qmSecMentions`/`qmIndMentions` (sector/
subsector name detection), `window.__hxApi` (price-history primitives: `get`, `metrics`, `ret`,
`corr`, `tickers`, `cut`), `window.__hxClusters`, `window.__gaScope` (a small hook v105 exposes
so later layers reuse its sector-name/min-member-count phrase matching instead of
re-implementing it — v106, v107 and v108 all reuse this same hook; extend it the same way
rather than adding a third copy of that regex).

**Kinds registered so far** (`QMX_KINDS`): `portfolio`, `spectrum`, `screen`, `count`,
`compare`, `explain` (base engine) · `neighbours`, `lookup` (base) · `diag`, `xlink` (v81) ·
`pairx` (v85) · `hcorr` (v91) · `htable` (v96) · `hxxx` family — `hcport`, `hblocks`, `hview`,
`hsmart`, `hconn`, `htheme` (v94–v98) · `gadiag` — the "leader page" 7-section diagnostic
(v105) · `gascope` — general named-sector + min-member scoping on the *default* bare-ranking
answer, renders as an ordinary compact table (v106) · `hrsplit` — Hidden Groups × return
horizon, positive/negative split (v107).

**Lessons learned the hard way (each one broke something once — don't repeat these):**
- `qmT` turns "one" into "1": any new regex must accept `(?:one|1)`.
- A new trigger regex can silently steal questions that already worked — always run the full
  regression suite (`regress.sh`) before publishing, never eyeball a few examples.
- Never put a multi-statement edit under a braceless `if(...)` — this once broke every
  question on the page.
- Spelling-vocabulary additions can "correct" ordinary words ("market" → "markets") — never
  correct by only adding/dropping trailing letters.
- Uppercase "IT" is the ticker for Gartner Inc; in sector questions it's rewritten to
  "information technology sector" first.
- A named-sector question with no other list-shaping words can go down **either** the base
  engine's bare group-ranking path (`qmParse`, kind falsy) **or** its symbol-level "screen"
  path (`qmParseX`, kind `"screen"`, sort field from `qmRankX`/`qmHz`) depending on exact
  phrasing — the trailing-horizon-return bug (fixed in v107) turned out to be in the *screen*
  path's horizon detector (`qmHz`), not the group-ranking path, even though the symptom looked
  identical to the earlier sector-scoping bug (fixed in v106) which *was* in the group-ranking
  path. **Trace which kind actually fires (the "How this was computed" JSON under every
  answer shows `spec.kind`) before assuming which function to patch.**
- A layer that wants to override a spec another layer's `qmParseX` already produces
  successfully (not `null`) must check its own trigger condition **before** calling the
  previous layer in the chain, not after — checking "if prev returns null" never fires once
  something upstream already answers the question (this exact bug hit both `hrsplit` (v107)
  and the leader-page-by-default redirect (v108) during development; both were fixed by moving
  the specific trigger check to the very top of the wrapped `qmParseX`).

## 8. What's still open, and why

1. **The page's own embedded workflow-launcher text is stale.** `WF_LAUNCHER` /
   `WF_INSTALLER` in `artifact/layers/v81.js` (what the "Run workflow" tab's "Download the
   launcher" button gives you) still hardcode `Scripts\` instead of
   `Scripts\SectorTerminalScripts\` — this is the exact bug just fixed locally for the user's
   copy of `run_v7_workflow.ps1` / `Run_AlexAligned_v7_Workflow.bat` (2026-09-28 evening
   session), but the fix was only handed to the user as two standalone files, **not** back-
   ported into the page's own embedded copy or into this repo as tracked files. Do that next:
   patch `WF_LAUNCHER`/`WF_INSTALLER` in `v81.js`, regression-test, republish, and consider
   adding `run_v7_workflow.ps1` / the `.bat` / `install_alexrun_protocol.ps1` as real tracked
   files under `realtest/` (they currently exist nowhere in git, only as embedded strings and
   on the user's own machine).
2. **RealTest orders-mode script not yet run for real.** `AlexAligned_Unified_v7_Orders_
   TerminalWeights.rts` was checked line-by-line against RealTest's own script-language
   reference, not against a real `RealTest.exe -orders` invocation. First real test is
   whenever the user gets to it — report the exact error text back if RealTest rejects it.
3. **General multi-column output for group-level rankings.** Today a group ranking's table
   columns are fixed by whichever single metric you sorted on (e.g. "top 10 subsectors ranked
   by breadth" only ever shows breadth-shaped columns). Asking for several unrelated extra
   columns at once ("...with correlation, return, and scorecard columns") isn't supported.
   The user explicitly asked for this and it was deferred, not forgotten — a natural next
   layer.
4. **A dedicated "export today's live weights" button.** Doesn't exist yet — the orders-mode
   script currently needs you to run a full historical backtest through today's date first,
   then export, to get a genuinely current `Terminal_Weights.csv` last row.
5. **Small, known limitation:** the *plain* symbol-list answer style still doesn't add an
   arbitrary extra column on request (e.g. "...and volume") — unrelated to the `gadiag`
   leader-page's own extra-column support (which does work: 5-day return, sector, volume),
   and unrelated to item 3 above (that's about *group*-level tables).
6. **Rebalance-frequency A/B test** (same portfolio, daily vs weekly vs monthly — compare trade
   count and return) — flagged as a 5-minute check whenever wanted, never actually run.
7. **Minor test-script housekeeping:** two of the repo's own test scripts need a small one-line
   setup fix to run fresh from scratch (a `localStorage` seed gap in `trkunit.js`/
   `backtest_unit.js`) — doesn't affect the live page.
8. **Older UI backlog, unchanged for a while:** Portfolio Tracker Compare/Combined views,
   money/sizing/overlap in the tracker, a navy colour theme option.

## 9. This session's handoff history (chronological — newest is most accurate)

`docs/FINAL_HANDOFF_2026-09-26.txt` through `_2235UTC.txt` (nine files, 26 Sep) and
`_2026-09-27_2146UTC.txt` cover the Portfolio Tracker's build-out (phases 1–2: track/rebalance/
weight-source settings) and the start of the RealTest backtest-integration planning — mostly
superseded by what's summarized in #6 above, but worth reading directly if you need the exact
history of *why* a tracker design decision was made.

`_2026-09-28_0000UTC.txt` through `_1600UTC.txt` (six files) cover, in order: the historical
replay/backtest engine (v104) shipping, the RealTest validation runner being built and its two
real bugs being found and fixed (see #6), backtest speed work (~47.5x), and v142/v143
publishing.

`_1700UTC.txt`: the sector-scoping bug (`gascope`, v106) found, fixed, and verified; v144/v145
publishing.

`_1912UTC.txt` (the most detailed and most recent before this file): the trailing-horizon
return fix and hierarchy/return-split diagnostic (v107, published as the informal "v146"), the
leader-page-by-default layout and anomaly-count metric (v108, published as "v147") — this is
the handoff to read if you want blow-by-blow detail on the most recent code changes, including
exact verification methodology (regression suite counts, smoke-test question lists).

**This file (`PROJECT_KNOWLEDGE_BASE.md`) is meant to replace re-reading all of the above** for
routine work — treat the handoff `.txt` files as an archival log, not a working reference.

## 10. A caveat specific to Claude Code CLI (vs. the claude.ai web/chat session this was built in)

Publishing a change to the live artifact was done, throughout this project, via the `Artifact`
tool's `publish` action — a claude.ai-specific capability with an anti-clobber gate (it refuses
to publish unless the full current live source has been `Read` in the same session first,
~29,000 lines). **Whether Claude Code CLI, in the environment the user runs it in, has access
to an equivalent `Artifact` tool at all is unknown from inside this session** — if it does not,
publishing a locally-built page will need a different mechanism (e.g. the user pastes the
built HTML back into a claude.ai chat for that session to publish, or some other bridge). A
future CLI session should verify this early — check for an `Artifact`-like tool before
promising to "publish" anything, and if none exists, say so plainly rather than attempting a
web-only action from a CLI context.

Everything else (the scratchpad setup, `splice81.py`, `harness.js`, `regress.sh`, git commit/
push) is plain filesystem + Node + Python work with no claude.ai-specific dependency, and
should work identically from Claude Code CLI.

## 11. New ideas surfaced but not started

- Parallel headless-browser instances, if the current ~47.5x backtest speedup ever stops being
  enough (a real, documented option from the backtest-speed work, not built).
- An optional "reason" column in `Terminal_Weights.csv` (reusing the Ask engine's own per-pick
  filter/rule text) if a future RealTest cross-check surfaces a hard-to-debug discrepancy.
- The `gadiag`/`gascope` reuse pattern (a narrow, composable spec redirect into an existing,
  already-validated rendering pipeline, rather than a new renderer) generalizes well — worth
  applying to other group-comparison question types if the user wants the same "always get
  the richest applicable layout" treatment elsewhere.
- Extending the trailing-horizon vocabulary (`v107`'s `HZ107` list) to genuinely arbitrary
  "N days"/"N months" phrasing (currently a fixed set: 30D, 1M, 3M, 6M, 12M, YTD) if a request
  for an uncovered horizon ever comes up.

## 12. Skills to load for this project

- **`sector-terminal`** (`.claude/skills/sector-terminal/SKILL.md`) — the only project-specific
  skill today. Load it with the `Skill` tool before any change to the terminal page, its Ask
  engine, tiles, portfolios, maps, or the RealTest Part E files. It has the exact scratchpad
  setup commands, the 5 regression suites, and the commit/publish checklist — don't reinvent
  any of that from scratch.
- No other project-specific skill exists yet. If a recurring workflow emerges that isn't
  covered by `sector-terminal` (for example, a repeatable "RealTest cross-check" checklist
  once the orders-mode script is proven), consider writing a second skill for it rather than
  re-deriving the steps each session — see the `skill-creator` meta-skill for how.
