# Sector Rotation Terminal — Windows desktop edition

This project hosts the checked-in Sector Rotation Terminal in a native WPF window using
Microsoft Edge WebView2. It does **not** publish to or modify the live claude.ai Artifact.
The original page and its additive layers remain the source of truth.

## What the first desktop edition preserves

- The complete existing HTML/CSS/JavaScript terminal and ordered `vNN.js` layers.
- Scan CSV and Part E history imports through the terminal's existing controls.
- Browser `localStorage` and IndexedDB, kept in the desktop application's WebView2 profile.
- Artifact-style document storage through a local JSON document store.
- Artifact-style downloads through a native Windows Save dialog.
- All deterministic Ask-the-terminal, chart, portfolio, tracker and backtest behavior.

The optional AI Snapshot narration is intentionally unavailable: the Artifact's `sample`
capability is not copied into the desktop application. The deterministic terminal does not
depend on it.

## Requirements

- Windows 10 or Windows 11.
- Visual Studio Community 2022 with the **.NET desktop development** workload, or the .NET 8 SDK.
- Microsoft Edge WebView2 Runtime. It is normally present on current Windows installations.
- Internet access for the first NuGet restore. The terminal itself can run locally; its web
  fonts currently fall back to installed system fonts when Google Fonts is unreachable.

## Run from Visual Studio

1. Open `desktop/SectorRotationTerminal.sln`.
2. Allow NuGet restore to complete.
3. Select `SectorRotationTerminal` as the startup project.
4. Press **F5**.

At startup the application assembles a private desktop copy under:

```text
%LocalAppData%\SectorRotationTerminal\Web
```

Application data is stored under `%LocalAppData%\SectorRotationTerminal`. The **Data folder**
button opens this location. Deleting it resets the desktop edition only; it has no effect on
the published Artifact.

## Build a distributable folder

From PowerShell with the .NET 8 SDK installed:

```powershell
desktop\publish-win-x64.ps1
```

The output is written to `desktop\publish\win-x64`. This is a self-contained .NET build, but
it uses the installed Evergreen WebView2 Runtime. A later installer can bundle Microsoft's
WebView2 bootstrapper or a fixed runtime if deployment to an offline machine requires it.

## Validate the web bundle without Windows

```bash
python3 desktop/tools/test_desktop_bundle.py
python3 desktop/tools/build_web.py /tmp/sector-terminal-desktop-web
```

The builder refuses to proceed when the base splice marker changes, a RealTest placeholder
is unresolved, or required inputs are absent. Its unit test also proves that building does
not modify the checked-in Artifact source.

For a full terminal regression, build the scratch web bundle and run the repository's normal
Playwright harness against it. The desktop app itself must additionally be smoke-tested on
Windows because WPF and WebView2 are unavailable in this Linux development environment.

## Local capability bridge

Before the terminal page loads, the host injects a small `window.claude.use(...)` compatibility
adapter:

- `db`: `doc(path).get()`, `.set(value)` and `.delete()` use JSON files in the local store.
- `downloads`: `.save(...)` displays a native Save File dialog and supports text and Blob data.
- `sample`: returns `null`, leaving optional generated narration disabled.

This deliberately matches the API expected by the existing terminal instead of rewriting its
feature code. The page is served from the private virtual host `https://sector-terminal.local`
so browser storage has a stable origin across releases.
