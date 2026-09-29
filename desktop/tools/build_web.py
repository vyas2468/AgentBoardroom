#!/usr/bin/env python3
"""Build the desktop web bundle without modifying the published Artifact sources."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MARKER = "/* ---------- init ---------- */\ndrawQuad();"
EMBEDDED = {
    "__HX_RTS__": "AlexAligned_Unified_v7_E_History_26.09.2026.rts",
    "__HX_PS1__": "run_v7_history.ps1",
    "__HX_BAT__": "Run_AlexAligned_v7_History.bat",
}


def layer_number(path: Path) -> int:
    match = re.fullmatch(r"v(\d+)\.js", path.name)
    if not match:
        raise ValueError(f"Unexpected layer name: {path.name}")
    return int(match.group(1))


def build(output: Path) -> Path:
    base = ROOT / "artifact/base/orig.html"
    layers = sorted((ROOT / "artifact/layers").glob("v[0-9]*.js"), key=layer_number)
    workflow = ROOT / "realtest/AutomationWorkflow"
    fixture = ROOT / "artifact/tools/fixtures/live_scan.json"
    if not layers:
        raise RuntimeError("No Artifact feature layers were found")

    html = base.read_text(encoding="utf-8").replace("\r\n", "\n")
    if html.count(MARKER) != 1:
        raise RuntimeError("Artifact initialization marker changed; refusing an uncertain build")
    if "v81: Ask the terminal" in html:
        raise RuntimeError("Base page already contains layers; refusing to duplicate them")

    layer_text = "\n".join(path.read_text(encoding="utf-8") for path in layers)
    for placeholder, filename in EMBEDDED.items():
        text = (workflow / filename).read_text(encoding="latin1").replace("\r\n", "\n").replace("\n", "\r\n")
        layer_text = layer_text.replace(placeholder, json.dumps(text).replace("</", "<\\/"))
    if "__HX_" in layer_text:
        raise RuntimeError("An embedded RealTest placeholder was not resolved")

    html = html.replace(MARKER, layer_text + "\n" + MARKER)
    replacements = (
        (
            '<div class="eyebrow">AlexAligned Cross-Sectional Master v3 &middot; RealTest scan</div>',
            '<div class="eyebrow">CROSS-SECTIONAL MASTER - RT SCAN</div>',
        ),
        ("Deterministic engines only &mdash; StepMA with Alex bands,", "Deterministic engines only &mdash; StepMA,"),
    )
    for old, new in replacements:
        if html.count(old) != 1:
            raise RuntimeError(f"Expected exactly one desktop text replacement: {old}")
        html = html.replace(old, new)

    scan = json.loads(fixture.read_text(encoding="utf-8"))
    output.mkdir(parents=True, exist_ok=True)
    (output / "index.html").write_text(html, encoding="utf-8", newline="\n")
    (output / "data.js").write_text(
        "window.SCAN=" + json.dumps(scan, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"desktop bundle: {output} ({len(layers)} layers, {len(html):,} HTML characters)")
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", nargs="?", type=Path, default=ROOT / ".desktop-web")
    build(parser.parse_args().output.resolve())
