// Generates a "part F" historical-scan variant of an existing part A/B/C/D script.
// Unlike gen_v7_E_history.js (which hand-writes new Data:/Scan: sections for raw prices),
// this generator does NOT touch Data: or Scan: at all -- it takes the owner's own, already
// working part script and changes ONLY two lines (NumBars and SaveScanAs), so every formula
// in the output is byte-identical to the one already validated in daily use. This is the
// safest possible transform: it cannot introduce a wrong indicator formula because it never
// reads or rewrites the indicator sections.
//
// Why reuse A/B/C/D instead of a new split: they were already split for speed (each computes
// a subset of columns, per part C's own Notes: "Generated from the v6 script by
// gen_AlexAligned_Unified_v7_split.py. Every v6 scan column is in exactly one part."). Reusing
// that same split for the history export means each part-F script only recomputes what its
// part already recomputes, so the existing speed design carries over. Some parts contain
// "engines" (peer correlation, InList membership, Correl()) that are the expensive kind of
// column; running those across NumBars>1 output rows is where the time comes from, not this
// generator or the split itself. See run_v7_F_history.ps1 and README_v7_F_history.md for
// how to size NumBars (default 260, about one year of trading days) and what to do if one
// part is slow: reduce NumBars for that part alone, or leave it out of the first pass. Never
// hand-edit a part's Data:/Scan: to try to speed it up here -- that risks changing a formula
// this project has not reviewed.
//
// Usage: node gen_v7_F_history.js <path to part A|B|C|D .rts> <output .rts> [NumBars=260]
"use strict";
const fs = require("fs");
const path = require("path");
const [src, out, numBarsArg] = process.argv.slice(2);
if (!src || !out) {
  console.error("usage: node gen_v7_F_history.js <partA|B|C|D.rts> <out.rts> [NumBars=260]");
  process.exit(2);
}
const NumBars = numBarsArg ? parseInt(numBarsArg, 10) : 260;
if (!Number.isInteger(NumBars) || NumBars < 2 || NumBars > 5000) {
  console.error("NumBars must be an integer between 2 and 5000 (got " + numBarsArg + ")");
  process.exit(2);
}

const text = fs.readFileSync(src, "latin1");
if (!/\r\n/.test(text)) { console.error("the source part script is expected to have CRLF line endings"); process.exit(1); }
const lines = text.split("\r\n");

// 1. Identify which part this is (A/B/C/D) from its own filename or Notes, only for labeling.
const baseName = path.basename(src);
const partLetter = (baseName.match(/_v7_([A-D])_/) || baseName.match(/[_ ]([A-D])[_ ]/) || [null, "?"])[1];

// 2. Find the ScanSettings: block and its NumBars line. Every part A/B/C/D is generated with
//    NumBars: 1 for the daily (latest bar only) scan -- this is the one line that must change.
const iScanSettings = lines.indexOf("ScanSettings:");
if (iScanSettings < 0) { console.error("could not find a ScanSettings: section in " + src); process.exit(1); }
let iNumBars = -1;
for (let i = iScanSettings; i < lines.length && i < iScanSettings + 30; i++) {
  if (/^\tNumBars:\t1\s*$/.test(lines[i])) { iNumBars = i; break; }
  if (i > iScanSettings && /^[A-Za-z]/.test(lines[i])) break; // next top-level section, stop looking
}
if (iNumBars < 0) { console.error("expected a line 'NumBars:\\t1' inside ScanSettings: in " + src + " -- found something different, refusing to guess"); process.exit(1); }

// 3. Find the SaveScanAs: line in Settings: and derive a new, DIFFERENT output filename so this
//    NEVER overwrites the part's own daily scan CSV.
const iSaveScanAs = lines.findIndex(l => /^\tSaveScanAs:\t/.test(l));
if (iSaveScanAs < 0) { console.error("could not find a SaveScanAs: line in " + src); process.exit(1); }
const oldSave = lines[iSaveScanAs];
const m = oldSave.match(/^\tSaveScanAs:\t(.*)\.csv\s*$/);
if (!m) { console.error("unexpected SaveScanAs: line format: " + oldSave); process.exit(1); }
const newSave = "\tSaveScanAs:\t" + m[1] + "_F_History_" + NumBars + "bars.csv";
if (newSave === oldSave) { console.error("generated the same SaveScanAs path as the original -- refusing to risk overwriting the live scan"); process.exit(1); }

// 4. Apply both edits. Everything else in the file -- Import:, Data:, Scan:, TestSettings:,
//    every formula -- is copied through completely unchanged.
const outLines = lines.slice();
outLines[iNumBars] = "\tNumBars:\t" + NumBars;
outLines[iSaveScanAs] = newSave;

const banner = [
  "Notes:",
  "\tGENERATED FILE -- part F (historical scan) variant of " + baseName + ", made by gen_v7_F_history.js.",
  "\tThe ONLY two changes from the source file: NumBars 1 -> " + NumBars + ", and SaveScanAs points at a NEW file",
  "\t(never the original), so running this can never overwrite that part's own daily scan output. Every",
  "\tData:/Scan: formula below is copied through byte for byte from " + baseName + " -- nothing was retyped.",
  "\tRun with -apply -scan only (no -import, no -test), same as the source part, AFTER the normal daily",
  "\tworkflow has already imported data at least once. See run_v7_F_history.ps1 and",
  "\tREADME_v7_F_history.md for how the four parts (A B C D) are run and merged.",
  "\tOutput: one row per symbol per bar for the last " + NumBars + " bars (about " + NumBars + " trading days;",
  "\t260 is roughly one year). This can be much slower than the daily 1-bar scan if this part contains",
  "\tpeer-correlation, InList membership or Correl() engines -- those recompute for every output bar, not",
  "\tjust the latest one. If this part is too slow, re-run this generator with a smaller NumBars for THIS",
  "\tpart only; do not hand-edit the Data:/Scan: sections below to try to speed it up.",
  "",
  "// ---- original Notes below, unchanged ----",
].join("\r\n");

const origNotesStart = outLines.indexOf("Notes:");
const origNotesEnd = origNotesStart >= 0 ? outLines.findIndex((l, i) => i > origNotesStart && /^[A-Za-z]/.test(l)) : 0;
const body = origNotesStart === 0
  ? banner + "\r\n" + outLines.slice(origNotesEnd).join("\r\n")
  : banner + "\r\n" + outLines.join("\r\n");

fs.writeFileSync(out, body, "latin1");
console.log("wrote " + out + " (part " + partLetter + ", NumBars " + NumBars + "; output CSV: " + m[1] + "_F_History_" + NumBars + "bars.csv)");
