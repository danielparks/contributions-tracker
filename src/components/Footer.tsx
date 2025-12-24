function formatTimestamp(timestamp: number | string): string {
  return new Date(timestamp).toLocaleString();
}

export function Footer(
  { version, lastFetched }: { version: string; lastFetched?: number | string },
) {
  return (
    <footer>
      <a href="https://github.com/danielparks/repoyear">
        github.com/danielparks/repoyear
      </a>{" "}
      • {version}
      {lastFetched && ` • Last updated ${formatTimestamp(lastFetched)}`}
    </footer>
  );
}
