function formatTimestamp(timestamp: number | string): string {
  return new Date(timestamp).toLocaleString();
}

export interface FooterProps {
  version: string;
  lastFetched?: number | string;
  githubAppLink?: boolean;
}

export function Footer(
  { version, lastFetched, githubAppLink = false }: FooterProps,
) {
  return (
    <footer>
      <p>
        <a href="https://github.com/danielparks/repoyear">
          github.com/danielparks/repoyear
        </a>{" "}
        • {version}
        {lastFetched && ` • Last updated ${formatTimestamp(lastFetched)}`}
      </p>
      {githubAppLink && (
        <p>
          <a
            href={"https://github.com/settings/connections/applications/" +
              import.meta.env.VITE_GITHUB_CLIENT_ID}
          >
            Manage GitHub access
          </a>
        </p>
      )}
    </footer>
  );
}
