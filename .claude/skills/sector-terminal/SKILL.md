---
name: sector-terminal
description: Work on the Sector Rotation Terminal artifact (claude.ai/artifact/JBivgL88qHWeaCSsepr7cN) and its Ask-the-terminal engine - add features as new JS layers, rebuild the page, run the regression suite, publish, and commit. Use for any change to the terminal page, its Ask questions, tiles, portfolios, maps, or the RealTest part E files.
---

# Sector Rotation Terminal: how to work on it safely

The owner's rule: **nothing that works may break.** Every change is a new or edited *layer*; the base page is never edited;
every change is proven with the regression suite before publishing.

## Layout (repo)
- `artifact/base/orig.html` - the original page (never edit).
- `artifact/layers/v81.js ... v99.js` - feature layers, concatenated in order; `splice81.py` builds the page.
- `artifact/tools/harness.js` - headless test runner (Playwright + Chromium). `tests/*.json` question sets,
  `fixtures/live_scan.json` (the scan) and `fixtures/real_hist.csv.gz` (part E price history, gunzip first).
- `realtest/` - RealTest part E script and launchers (splice81.py embeds them into the page).
- `docs/HANDOFF.md` - state of play; `docs/SESSION_COMPLETE_FINAL_*.txt` - plain-English history for the owner.

## Set up a work folder (scratchpad)
```
W=<scratchpad>; mkdir -p $W/db $W/site_new
cp artifact/base/orig.html artifact/layers/* artifact/tools/*.js artifact/tools/tests/*.json $W/
cp artifact/tools/fixtures/live_scan.json $W/db/; gunzip -c artifact/tools/fixtures/real_hist.csv.gz > $W/real_hist.csv
cd $W && python3 splice81.py orig.html site_new/index.html      # builds the page
```
Add a new layer: write `vNN.js` (an IIFE wrapped in try/catch), then append it in splice81.py's `layer=` concatenation.

## Test (always, before publishing)
`NODE_PATH=/opt/node22/lib/node_modules`; Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
```
node harness.js site_new base.json                                   # 49 original questions, no history
QFILE=q_tiles.json node harness.js site_new tiles.json real_hist.csv  # 207 earlier tile questions
QFILE=q_tall_new.json node harness.js site_new new.json real_hist.csv # newer tile questions
```
Run them in parallel with `( ... &)`. Compare `answers[i].a` with the previous run's JSON: **every existing answer must be
word for word the same**; the only allowed differences are ones you intended. Also check `errs` for `pageerror`.
Do NOT `pkill -f harness.js` (it kills your own shell); let old runs finish.

## Publish and commit
- Artifact tool: `publish` with `url: https://claude.ai/artifact/JBivgL88qHWeaCSsepr7cN`, `file_path: site_new/index.html`,
  omit `capabilities` (keeps sample, db, downloads).
- Copy changed layers + splice81.py to `artifact/layers/`, commit with the session trailer, push to the working branch.
- Update the owner's summary text file and send it with SendUserFile.

## Ask engine: how a question flows
`qmSubmit` -> `qmAsk` (v98 wraps: spelling notes, "IT" -> IT Sector) -> `qmParseX` (outermost layer runs first; each layer
returns its own spec or calls the previous one) -> `qmValidateAny` -> `qmRun`/`qmRunX` (dispatch on `spec.kind`, register
new kinds in `QMX_KINDS`) -> `qmHtml` (res.lead, res.table {head, align, body, hxColor}, res.extra[], res.notes[], res.send).
Useful: `qmT(q)` normalised text, `qmSecMentions`, `qmIndMentions`, `window.__hxApi` (price history: get, metrics, ret,
corr, tickers, cut), `window.__hxClusters`, `window.__pcond` (shared portfolio conditions), `cgConvergence`, `relClusters`.
Kinds added this session: hxxx in v84-v99 (hcorr, hplot, hcport, hblocks, hview, htable, hsmart, hconn, htheme ...).

## Lessons (each one broke something once)
- `qmT` turns "one" into "1": regexes must accept `(?:one|1)`.
- A new trigger regex can steal questions that already work: make triggers specific, exclude existing phrasings,
  then prove it with the regression suite.
- Never put a multi-statement edit under a braceless `if(...)` - wrap it in `{ }` (this once broke every question).
- Spelling vocabulary additions can "correct" ordinary words ("market" -> "markets"): never correct by only adding or
  dropping letters at the end; protect words used in example questions.
- Uppercase "IT" is the ticker Gartner; in sector / link questions it is rewritten to "information technology sector".
- New spec fields must only appear when the words are present, or the "How this was computed" JSON changes.
- Canvas/SVG exports: use `window.__svgPng` / `window.__canvasPng`; thread export in v97 (SVG foreignObject).
- `downloads` go through `DLNS` (claude.use("downloads")); My tiles sync to the db doc `mytiles/main`.
