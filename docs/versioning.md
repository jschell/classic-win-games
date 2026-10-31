# App versions and releases

`package.json` is the source of truth for the shared app version. The initial
version remains `0.1.0`; merging ordinary changes never bumps it or publishes a
Windows release automatically. Commit identity distinguishes builds between
numbered releases. Changes awaiting the next release go under `CHANGELOG.md`'s
Unreleased section.

## Bump once for a release

From a clean checkout with the intended release changes:

```sh
npm ci
npm run version:bump -- patch
npm test
```

Use `patch` for fixes, `minor` for new features, or `major` for the first stable
1.0 release or subsequent incompatible releases. For example, `0.1.0` becomes
`0.1.1`, `0.2.0`, or `1.0.0`, respectively. Only numeric major.minor.patch
versions are supported by this command; prereleases are not yet supported.

The command updates the npm manifest and lockfile, Tauri configuration, Rust
manifest and app lockfile entry, generated browser version module, Pages build
metadata, changelog section and service-worker content hash together. Dependency
versions stay unchanged. It refuses inconsistent metadata before writing.
Review the numbered changelog notes, commit all changes, and open a PR.
`npm run version:check` also runs as part of `npm test`.

To create the tag through GitHub Actions, use a release PR whose title starts with `[desktop-release] `, for example
`[desktop-release] Release 0.3.0`. After that explicit release commit reaches
main (including a normal GitHub merge with the PR title in its commit body),
**Tag desktop release** verifies the shared version, creates an annotated
`desktop-v<version>` tag at that commit, and dispatches the Windows workflow
against the tag. The workflow refuses to move an existing tag. It can also be
run manually on main. Ordinary merge titles do not trigger tagging.

Alternatively, after the PR merges and checks pass, tag the intended main commit
from your own checkout:

```sh
git switch main
git pull --ff-only
git tag desktop-v0.1.1
git push origin desktop-v0.1.1
```

Replace the example tag with the actual version. Packaging rejects a tag that
does not match the app version. The tag workflow builds/tests Windows and creates
a draft GitHub Release with versioned exe/ZIP files and checksums. Review the
release notes and manual acceptance checks before publishing. PRs and ordinary
merges do not create tags or public releases. Explicit release merges create a
tag and draft only; publication remains separate. Do not move an already published
tag; fix issues in a new patch release.

## About on web and Windows

Open **About** below the game board in either edition. It shows the edition,
shared version and seven-character build commit; the complete commit is in the
version text's tooltip. Game navigation does not change the build identity.
The web can deploy a newer commit/version while Windows stays on its last
published release. Each displays its own build, not the latest release fetched
from GitHub.

GitHub Pages' existing branch/Jekyll build renders `build-info.json` using
`site.github.build_revision`. No Pages settings change or runtime GitHub API
request is needed. The worker caches this same-origin metadata with the shell,
so About still identifies the running cached build offline. A plain static
server that does not process Jekyll shows the version followed by `development`
unless it serves generated metadata. Missing, invalid or mismatched metadata
never prevents gameplay and is not presented as a valid build commit.

Desktop staging replaces that template with JSON containing the checkout's
actual Git revision before embedding it. Locally modified builds append
`(modified)`; source archives without Git show `development`. Changing an app
version does not change saved-game schema keys, the desktop application ID,
origin or profile location.
