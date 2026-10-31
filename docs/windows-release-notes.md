Windows x64 executable for Classic Win Games: Klondike, FreeCell, Spider and Hearts.

- Download the `.exe`, or extract the optional ZIP, then launch the game.
- Requires Windows 11 x64 and Microsoft Edge WebView2 Runtime. The runtime is
  normally installed on Windows 11; this download does not bundle it.
- All game assets are embedded. Play works offline once prerequisites exist.
- Saves and Undo remain in the Windows user profile across executable replacements.
  Browser saves are separate; export/import is not included yet.
- This initial executable is unsigned. Actual launch behavior depends on Windows
  security policy. SHA-256 hashes are in `checksums.txt`.

The Windows CI workflow builds the release executable and exercises all four
games, mouse shortcuts, saved Undo after process restart and worker exclusion.
The release remains a draft for review. A clean disconnected-PC runtime setup
test, physical touch/scaling review and an upgrade from a previous published
desktop version remain manual acceptance checks.

See [Windows documentation](https://github.com/jschell/classic-win-games/blob/main/docs/windows.md).
