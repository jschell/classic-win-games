# Windows executable

The desktop edition is a minimal Tauri v2 shell around the same `src/`, HTML,
CSS and icons used by the browser/PWA. Initial target: Windows 11 x64.

## Downloads and saves

The Windows workflow produces `ClassicWinGames-<version>-windows-x64.exe`, an
optional ZIP containing the executable and instructions, and `checksums.txt`.
These are application executables, not setup installers. No MSI/NSIS installer
is built in this first iteration.

Run the executable, or extract the ZIP first. Microsoft Edge WebView2 Runtime
must already be installed. It normally exists on Windows 11, but is not embedded
in this small download. Microsoft's Evergreen Standalone Installer can be
transferred separately for a disconnected PC. Do not confuse the small online
bootstrapper with the offline runtime installer.

All game assets are embedded. The game has no application auto-updater. The
Microsoft runtime has its own servicing behavior, independent of this game.
To update the game, close it and replace the executable.

Saves, Undo and preferences use the app's WebView profile under
`%LOCALAPPDATA%\com.jschell.classic-win-games\`. This is distinct from browser
storage. Saves stay on the PC rather than beside the executable. Keep this
directory across updates. Save export/import is a follow-up, not a feature of
the initial wrapper. Deleting the app data deletes its saved progress.

Storage identity is fixed: application ID `com.jschell.classic-win-games`, main
window label `main`, HTTPS origin `https://tauri.localhost` on Windows, and the
default app-local-data profile. Changing these needs an explicit migration.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `src-tauri/` | Rust shell, app identity, window configuration, icons and locked dependencies |
| `tools/build-desktop.mjs` | Stage only frontend assets; inject the desktop HTML marker |
| `build/desktop-web/` | Generated frontend; excluded from Git |
| `tools/package-windows.mjs` | Name the release executable and verify its version/tag |
| `tests/desktop/smoke.mjs` | WebDriver checks against the actual release executable on disposable Windows CI |
| `.github/workflows/windows-release.yml` | Windows build, smoke tests, artifacts and tag-triggered draft release |

The staging step excludes the service worker and web manifest. The HTML marker
also prevents the complete worker lifecycle from starting in the desktop app.
Normal web builds retain their existing PWA worker. No game engines are forked.
Native file-drop handling is disabled so HTML card dragging works on Windows.
The shell keeps a single instance, focuses its window on another launch and
allows navigation only to the embedded application origin. No frontend native
IPC permissions, shell access, native filesystem plugin or updater is enabled.

## Build on Windows

Install Node.js 22, the Rust toolchain specified in `rust-toolchain.toml`, the
Microsoft C++ build tools required by Tauri, and WebView2 Runtime. Then:

```powershell
npm ci
npm test
npm run build:windows
```

The raw binary is `src-tauri/target/release/classic-win-games.exe`. For a named
download and instructions, run `node tools/package-windows.mjs`. The workflow
adds the optional ZIP and its checksum. `npm run desktop:dev` opens a development
build; distribute only the release binary produced by `build:windows`.

Rust and CLI versions are pinned; commit both lockfiles when updating dependencies.
Use `npm run version:bump -- patch|minor|major` to update all app versions
together. Release tags must be `desktop-v<version>`. See the [shared versioning
and release procedure](versioning.md); About below the board identifies this
executable's version and build commit.

## CI and publication

Pull requests and manual dispatch build/test Windows and retain downloadable
artifacts for 14 days. Pushing a matching `desktop-v*` tag produces a **draft**
GitHub Release after the Windows job passes. Normal merges do not automatically
publish desktop releases. The existing Pages deployment continues independently.

The automated native checks cover all four games, real mouse double-click and
HTML dragging through Windows mouse input, a stock row, Hearts passing, Finish/Undo, confirmation cancellation,
saved deal/Undo after a process restart, and absence of worker registrations.
Screenshots and driver logs are retained. They use WebDriver against the release
executable; no debug/test commands are compiled into the product.

Run `test:desktop` only on disposable Windows CI (`CI=true`); it loads fixtures
into that runner's app profile. It needs a matching Edge WebDriver, provisioned by the workflow. The test
launches the executable normally, then attaches the driver to it; driver launch
mode would create a new temporary profile and invalidate persistence checks. On the disposable elevated runner,
it temporarily sets the app-specific machine WebView2 debug-port policy needed
by Runtime 150+ and removes it afterward. This policy is never shipped or set
on users' PCs. See [Microsoft's explanation](https://github.com/MicrosoftEdge/WebView2Feedback/issues/5645). The normal Chromium/WebKit tests also
exercise the staged frontend separately from the web/PWA deployment.

Before publishing the draft, manually verify a clean disconnected Windows VM
with and without WebView2, upgrade/persistence from a prior desktop build,
touch and display scaling, and the downloaded unsigned executable's behavior
under the intended Windows security policy. The hosted runner's preinstalled
runtime does not prove missing-runtime installation. Record results in the release.

## References

- [Tauri Windows prerequisites and installers](https://v2.tauri.app/distribute/windows-installer/)
- [Tauri window configuration](https://v2.tauri.app/reference/config/)
- [Tauri Windows WebDriver CI](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/webdriver)
- [Microsoft WebView2 distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)
