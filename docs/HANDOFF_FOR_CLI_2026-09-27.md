# Handoff: continuing this build in Claude Code CLI (27 Sep 2026)

## Current state
- Live page: https://claude.ai/artifact/JBivgL88qHWeaCSsepr7cN — **version 139** (all 348 regression questions pass;
  today's two bug fixes are in: Track button on cluster/one-per portfolios, named-ticker portfolios honour the list
  and "weighted").
- Branch: `claude/artifact-access-question-f3s8rs`, folder `artifact/` in this repo.
- Backup tag: `v138-before-rt-backtest` (repo tag) + `artifact/backup/index_v138_before_rt_backtest.html` (the fully
  built page) — the last known-good state before today's RT-backtest work started. If anything from here on needs
  reverting, restore from that tag/file, not from memory.
- Plans already written (read these before doing anything else):
  - `docs/RT_BACKTEST_PLAN_2026-09-27.md` — the RealTest backtesting design (this is the current priority).
  - `docs/TRACKER_PLAN_2026-09-26.txt` — Portfolio Tracker phase 2 (settings, compare, combined, money/sizing).
  - `docs/FINAL_HANDOFF_2026-09-26_2235UTC.txt` — full history of what's built and why, in plain English.
  - `docs/HANDOFF.md` — the technical, layer-by-layer reference (start at its top "SESSION UPDATE" section).

## Why this is a web-only vs. CLI-only split
- **The Artifact publish tool only exists in claude.ai web sessions.** CLI Claude Code cannot push a new version to
  `claude.ai/artifact/...`. So CLI's job is: edit code, build, test — NOT publish.
- **Practical workflow:** do all editing/testing in CLI (fast, no browser automation overhead per turn beyond what
  the test scripts themselves need), then either (a) come back to a web session and ask it to build from the same
  branch and publish, or (b) hand the built `site_new/index.html` + updated layer files to a web session with the
  instruction "read these from the branch, verify the regression yourself, then publish."
- **Never let CLI Claude Code publish by editing the live artifact HTML anywhere claude.ai serves it directly** —
  there is no such path; the only publish route is the web session's Artifact tool.

## Repo layout (what CLI needs to know)
```
artifact/
  base/orig.html          <- the ORIGINAL page. NEVER edit this file directly.
  layers/v81.js ... v103.js  <- feature layers, applied in order by splice81.py. Each wraps the
                                global functions of earlier layers (qmParseX, qmRunX, qmHtml, etc.)
                                and falls through to the previous behavior for anything it doesn't
                                recognize. New features = NEW layer files (v104.js, v105.js, ...),
                                almost never edits to existing layers (exceptions: today's two bug
                                fixes, which were narrow, tested, regression-clean edits to v102/v103).
  layers/splice81.py       <- concatenates orig.html + all layers into one built page.
  backup/                  <- full built-page snapshots taken before risky work (add to this before
                                any large change).
  tools/                   <- test harness (harness.js), regress.sh, probe.sh, fixtures, saved
                                question sets (q_*.json) and saved baseline answers (r_*.json).
docs/
  HANDOFF.md, FINAL_HANDOFF_*.txt, TRACKER_PLAN_*.txt, RT_BACKTEST_PLAN_*.md  <- all context/plans.
```

## How to build and test locally (CLI)
Everything below runs from a scratch working folder (CLI should create its own, e.g. under a tmp dir
or a git-ignored `.scratch/` folder — never inside `artifact/` itself, to keep the repo clean):

```bash
mkdir -p /tmp/rt-work && cd /tmp/rt-work
cp -r <repo>/artifact/layers/*.js .
cp <repo>/artifact/base/orig.html .
cp -r <repo>/artifact/tools/* .   # harness.js, regress.sh, probe.sh, fixtures, q_*.json, r_*.json baselines
mkdir -p site_new
python3 splice81.py orig.html site_new/index.html     # builds the full page
```

Playwright + a headless Chromium must be available (same as this session used:
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `NODE_PATH=/opt/node22/lib/node_modules` — CLI's
own machine will have its own equivalents; resolve them once and don't assume this session's paths).

**Before touching anything, run the baseline regression** to confirm the starting point is clean:
```bash
./regress.sh baseline
```
This must print `same 49/49 changed: []` (and the same for tiles/bt/nd/tall) for **all 5 suites**. If it
doesn't, stop and diagnose before making any change — you're not starting from a known-good state.

## The non-negotiable rule for every change
1. Never edit `orig.html`.
2. New features go in a new layer file (next version number), which wraps existing globals and falls
   through unchanged for anything it doesn't explicitly handle.
3. A narrow, targeted edit to an *existing* layer is only acceptable for a genuine bug fix (like today's
   two), and only when it's provably scoped (regex/condition narrow enough that nothing else can match it).
4. After ANY change: rebuild (`python3 splice81.py orig.html site_new/index.html`) and run
   `./regress.sh <tag>`. **All 5 suites must show `changed: []`** (the Track-button line is already
   filtered out by regress.sh's comparison, so that's the one expected/ignored diff). If anything else
   changed, the fix is too broad — narrow it and retest. Do not publish/hand off a change with any other
   regression diff, ever.
5. Test every new/changed question for real using `./probe.sh <questions.json> <out.json> <charLimit>`
   against the actual scan + price history fixtures before considering it done.
6. Before starting a large or risky change, snapshot: `cp site_new/index.html
   <repo>/artifact/backup/index_vNNN_before_<whatyourdoing>.html` and note it in the handoff so it's
   revertible.
7. Only after the regression is clean and the new behavior is verified: commit the changed layer file(s)
   (and any new test fixtures) to `artifact/layers/` and `artifact/tools/` in the repo, on the same branch,
   with a clear commit message — but leave the actual **publish** to a web session (see above).

## Next priority: the RealTest backtest work
Read `docs/RT_BACKTEST_PLAN_2026-09-27.md` in full before starting. Summary of the task order there:
0. (Done) Backup + plan.
1. (Done, v139) Two quick fixes: Track button on cluster portfolios; named-ticker portfolios.
2. **Tracker phase 2 core** (do this next): per-portfolio settings — rebalance rhythm (daily / weekly /
   monthly / quarterly / yearly), entry price convention (next open vs close), costs, weight source
   (equal / answer's own weights / inverse volatility). Write engine-level tests on made-up data with
   exact expected numbers FIRST (like the existing 19 tracker engine tests in `artifact/tools/trkunit.js`
   — extend that file, don't replace it), then wire into the tracker UI.
3. RT "part F" scripts (historical scan export) — these are `.rts`/`.bat`/`.ps1` files the OWNER runs on
   their own Windows RealTest install, not something CLI can execute. CLI's job is to generate/write these
   scripts correctly (following `realtest_script_language.md` conventions — `DataValueFile`, `ScanSettings:
   NumBars`, `#Pad`) and hand them over for the owner to run and return the output CSVs.
4. Terminal replay ("Backtest this portfolio"): point-in-time data builder + replay loop, reusing the
   existing tracker engine (`window.__trk.engine` in v103.js) so live tracking and backtesting share one
   code path. Test with a "no-look-ahead" check: deleting all data after date d must not change picks on d.
5. RT validation runner script (owner runs it): confirms RT's own trade accounting matches the page's
   numbers within rounding.
6. Full regression, then hand back to a web session for publish + handoff update.

## Safety checklist for every CLI session on this project
- [ ] Read `docs/HANDOFF.md` top section and the relevant plan doc(s) first.
- [ ] Confirm current branch is `claude/artifact-access-question-f3s8rs` and it's up to date with origin.
- [ ] Run the baseline regression before changing anything; confirm `changed: []` on all 5 suites.
- [ ] New feature → new layer file. Bug fix → narrowest possible edit to the existing layer, regression-proven.
- [ ] Every change: rebuild, regress (all 5 suites clean), probe-test the new/changed questions for real.
- [ ] Snapshot to `artifact/backup/` before large/risky changes.
- [ ] Commit layer + test files to the repo on the same branch; do NOT attempt to publish from CLI.
- [ ] When ready to go live: hand back to a web (claude.ai) Claude Code session with a pointer to the
      commit(s) to build and publish, and ask it to re-run the regression itself before publishing (never
      trust "it passed in another session" without re-verifying, since the two environments can differ).
- [ ] Update `docs/HANDOFF.md` and produce a timestamped `docs/FINAL_HANDOFF_<date>_<time>.txt` at the end
      of the session, same format as previous ones in this repo.
