export function Footer({ version }: { version: string }) {
  return (
    <footer>
      <a href="https://github.com/danielparks/contributions-tracker">
        github.com/danielparks/contributions-tracker
      </a>{" "}
      • {version}
    </footer>
  );
}
