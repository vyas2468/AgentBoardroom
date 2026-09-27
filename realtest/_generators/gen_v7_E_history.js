// Generates AlexAligned_Unified_v7_E_History_26.09.2026.rts from part C.
// The Import block is copied byte for byte from part C, so part E reads the same
// shared data file (alexaligned_unified_v7.rtd) and never needs its own import.
// Usage: node gen_v7_E_history.js <path to part C .rts> <output .rts> [NumBars=280]
"use strict";
const fs = require("fs");
const [src, out, numBarsArg] = process.argv.slice(2);
if (!src || !out) { console.error("usage: node gen_v7_E_history.js <partC.rts> <out.rts> [NumBars=280]"); process.exit(2); }
const numBars = numBarsArg ? parseInt(numBarsArg, 10) : 280;
if (!Number.isInteger(numBars) || numBars < 2) { console.error("NumBars must be a whole number >= 2"); process.exit(2); }
// Default filename stays exactly as before for backward compatibility with anything already
// pointing at it; a non-default NumBars gets its own filename so it never silently overwrites
// an existing 280-bar export (mirrors gen_v7_F_history.js's naming convention).
const outCsvName = numBars === 280
  ? "AlexAligned_Unified_v7E_history.csv"
  : "AlexAligned_Unified_v7E_history_" + numBars + "bars.csv";
const text = fs.readFileSync(src, "latin1");
if (!/\r\n/.test(text)) { console.error("part C is expected to have CRLF line endings"); process.exit(1); }
const lines = text.split("\r\n");
const iImp = lines.indexOf("Import:"), iSet = lines.indexOf("Settings:");
if (iImp < 0 || iSet < iImp) { console.error("could not find the Import: and Settings: sections in part C"); process.exit(1); }
let imp = lines.slice(iImp, iSet);
while (imp.length && imp[imp.length - 1].trim() === "") imp.pop();
const saveAs = imp.filter(l => /^\tSaveAs:\t/.test(l));
if (saveAs.length !== 1 || saveAs[0].indexOf("alexaligned_unified_v7.rtd") < 0) { console.error("unexpected SaveAs line in part C Import block"); process.exit(1); }
const dataFile = saveAs[0].replace(/^\tSaveAs:\t/, "");

const E = [
  "Notes:",
  "\tAlexAligned Unified v7 split, part E, daily price history for the terminal's Ask tab. OPTIONAL. Run AFTER part C (any time after), with apply and scan only, no import.",
  "\tGenerated from part C by gen_v7_E_history.js. The Import block below is copied byte for byte from part C and only runs when import is on the command line, so do NOT run this part with import.",
  "\tIt reads the shared data file written by part C and writes its OWN file, AlexAligned_Unified_v7E_history.csv. It is never merged with parts A B C D, so merge_v7_scans.py and terminal_payload_v7.js are unaffected.",
  "\tOne row per symbol per bar for the last " + numBars + " bars: Date, Symbol, HOpen, HHigh, HLow, HClose. About 575 x " + numBars + " = " + (575 * numBars).toLocaleString("en-US") + " rows.",
  "\tScanSettings NumBars " + numBars + " is what asks RealTest for the history; parts A B C use NumBars 1 for the latest bar only.",
  "\tNo engines, no Correl, no InList items: it should take well under a minute.",
  "",
].concat(imp).concat([
  "",
  "",
  "Settings:",
  "\tDataFile:\t" + dataFile,
  "\tBarSize:\tDaily",
  "\tEndDate:\tLatest",
  "\tAccountSize:\t100000",
  "\tUseAvailableBars:\tFalse",
  "\tSaveScanAs:\t?scriptpath?\\" + outCsvName,
  "",
  "\t// StartDate lives in TestSettings only, exactly as in parts A B C: a StartDate in",
  "\t// Settings corrupts the ScanSettings EndDate Latest plus NumBars anchoring.",
  "TestSettings:",
  "\tStartDate:\tEarliest",
  "",
  "",
  "Data:",
  "\t// raw daily prices, nothing else",
  "\thistOpenV:\tO",
  "\thistHighV:\tH",
  "\thistLowV:\tL",
  "\thistCloseV:\tC",
  "",
  "ScanSettings:",
  "\tEndDate:\tLatest",
  "\t// " + numBars + " bars, one row per symbol per bar. 252 trading days is one year of warm-up that a",
  "\t// point-in-time cluster/correlation backtest needs BEFORE its first replay date, on top of",
  "\t// however many bars the replay window itself covers (e.g. part F's NumBars).",
  "\tNumBars:\t" + numBars,
  "",
  "",
  "Scan:",
  "\t// Scan column names differ from the Data item names, as RealTest requires.",
  "\tHOpen:\thistOpenV",
  "\tHHigh:\thistHighV",
  "\tHLow:\thistLowV",
  "\tHClose:\thistCloseV",
  ""
]);
const body = E.join("\r\n");
if (/[^\x00-\x7f]/.test(body)) { console.error("non-ASCII character in output"); process.exit(1); }
fs.writeFileSync(out, body, "latin1");
console.log("wrote " + out + " (" + E.length + " lines; Import block " + imp.length + " lines copied from part C)");
