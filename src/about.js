import { APP_VERSION } from "./version.js";

export function versionLabel(info) {
  const revision =
    info?.version === APP_VERSION && /^[a-f0-9]{40}$/.test(info?.revision)
      ? info.revision.slice(0, 7)
      : "development";
  return `${APP_VERSION} · ${revision}${info?.modified ? " (modified)" : ""}`;
}

export async function showAbout() {
  const output = document.getElementById("app-version");
  document.getElementById("app-edition").textContent =
    document.documentElement.dataset.packaged === "desktop"
      ? "Windows edition"
      : "Web edition";
  output.textContent = versionLabel();
  try {
    // Same-origin static metadata is cached with the web shell and embedded on Windows.
    const response = await fetch(
      new URL("../build-info.json", import.meta.url),
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return;
    const info = await response.json();
    output.textContent = versionLabel(info);
    if (info.version === APP_VERSION && /^[a-f0-9]{40}$/.test(info.revision))
      output.title = info.revision;
  } catch {
    /* Plain static servers and source archives still display the shared version. */
  }
}
