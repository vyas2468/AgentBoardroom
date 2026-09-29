#!/usr/bin/env python3
"""
Merges the per-part historical scan CSVs (part F, one per A/B/C/D) into one combined
historical scan CSV, joined on (Date, Symbol).

This is a NEW script (there is no historical version of merge_v7_scans.py to copy from),
written defensively: it never overwrites an input file, it does a full outer join so a
symbol/date missing from one part still appears (with blanks for that part's columns) rather
than silently dropping rows, and it prints counts so a mismatch is visible immediately rather
than discovered later inside the terminal.

Usage:
    python3 merge_v7_F_history.py OUT.csv PART_A.csv PART_B.csv PART_C.csv PART_D.csv
    (list 2 to however many part CSVs you actually generated; order does not matter)
"""
import sys
import csv
from collections import OrderedDict


def read_part(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        if "Date" not in r.fieldnames or "Symbol" not in r.fieldnames:
            sys.exit("ERROR: %s has no Date/Symbol column (header: %s). Is this a real "
                      "part-F scan CSV?" % (path, r.fieldnames))
        rows = list(r)
    value_cols = [c for c in r.fieldnames if c not in ("Date", "Symbol")]
    return rows, value_cols


def main(argv):
    if len(argv) < 3:
        sys.exit("usage: merge_v7_F_history.py OUT.csv PART1.csv PART2.csv [PART3.csv PART4.csv ...]")
    out_path, part_paths = argv[1], argv[2:]

    merged = OrderedDict()   # (date, symbol) -> dict of all columns seen so far
    all_cols = []            # preserves first-seen column order across parts
    col_seen = set()
    per_part_keys = []

    for p in part_paths:
        rows, value_cols = read_part(p)
        keys_this_part = set()
        dupe_cols = [c for c in value_cols if c in col_seen]
        if dupe_cols:
            print("WARNING: %s has column name(s) already seen in an earlier part: %s "
                  "(both parts' formulas were named differently in RealTest, so this should "
                  "not normally happen -- check the two Scan: sections)." % (p, dupe_cols))
        for c in value_cols:
            if c not in col_seen:
                col_seen.add(c)
                all_cols.append(c)
        for row in rows:
            key = (row["Date"], row["Symbol"])
            keys_this_part.add(key)
            rec = merged.setdefault(key, {})
            for c in value_cols:
                rec[c] = row.get(c, "")
        per_part_keys.append((p, keys_this_part))
        print("read %s: %d rows, %d value columns" % (p, len(rows), len(value_cols)))

    # cross-check: every part should in general cover the same (date, symbol) set, since all
    # four are run with the same NumBars/EndDate against the same shared data file. Report any
    # mismatch instead of hiding it.
    all_keys = set(merged.keys())
    for p, keys in per_part_keys:
        missing = all_keys - keys
        if missing:
            print("NOTE: %s is missing %d (date, symbol) row(s) that appear in another part "
                  "(those rows will have blanks for %s's columns). First few: %s"
                  % (p, len(missing), p, list(sorted(missing))[:5]))

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Date", "Symbol"] + all_cols)
        for (date, symbol), rec in sorted(merged.items()):
            w.writerow([date, symbol] + [rec.get(c, "") for c in all_cols])

    print("wrote %s: %d rows, %d columns (Date, Symbol + %d value columns from %d part file(s))"
          % (out_path, len(merged), 2 + len(all_cols), len(all_cols), len(part_paths)))


if __name__ == "__main__":
    main(sys.argv)
