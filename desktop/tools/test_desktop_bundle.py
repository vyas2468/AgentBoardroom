#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from build_web import ROOT, build


class DesktopBundleTests(unittest.TestCase):
    def test_build_is_complete_and_does_not_modify_artifact(self) -> None:
        watched = [ROOT / "artifact/base/orig.html", *sorted((ROOT / "artifact/layers").glob("v[0-9]*.js"))]
        before = {path: path.read_bytes() for path in watched}
        with tempfile.TemporaryDirectory() as temporary:
            output = build(Path(temporary))
            html = (output / "index.html").read_text(encoding="utf-8")
            data = (output / "data.js").read_text(encoding="utf-8")
            self.assertIn("v110: Subsector Web", html)
            self.assertNotIn("__HX_", html)
            self.assertEqual(1, html.count("v81: Ask the terminal"))
            self.assertTrue(data.startswith("window.SCAN="))
            scan = json.loads(data.removeprefix("window.SCAN=").removesuffix(";\n"))
            self.assertGreater(len(scan["symbols"]), 500)
        self.assertEqual(before, {path: path.read_bytes() for path in watched})


if __name__ == "__main__":
    unittest.main()
