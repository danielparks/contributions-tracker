export function getAppVersion(): string {
  const meta = document.querySelector('meta[name="app-version"]');
  return meta?.getAttribute("content") || "unknown";
}
