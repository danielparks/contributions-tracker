function formatTimestamp(timestamp: number | string): string {
  const date = typeof timestamp === "number"
    ? new Date(timestamp)
    : new Date(timestamp);
  return date.toLocaleString();
}

export function Footer(
  { version, lastFetched }: { version: string; lastFetched?: number | string },
) {
  return (
    <footer>
      <a href="https://github.com/danielparks/contributions-tracker">
        github.com/danielparks/contributions-tracker
      </a>{" "}
      • {version}
      {lastFetched && ` • Data from ${formatTimestamp(lastFetched)}`}
    </footer>
  );
}
