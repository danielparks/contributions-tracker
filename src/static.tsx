import "./App.css";
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { ContributionsView } from "./components/ContributionsView.tsx";
import { Calendar } from "./model.ts";
import type { Contributions } from "./github/api.ts";

export function StaticApp() {
  const [contributions, setContributions] = useState<Contributions[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("./assets/contributions.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data: Contributions[]) => {
        setContributions(data);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load contributions",
        );
      });
  }, []);

  const calendar = useMemo(() => {
    if (!contributions || contributions.length === 0) {
      return null;
    }

    const calendar = Calendar.fromContributions(contributions[0]);
    for (const contrib of contributions.slice(1)) {
      calendar.updateFromContributions(contrib);
    }
    return calendar;
  }, [contributions]);

  if (error) {
    return (
      <div className="login-container">
        <h1>GitHub Contribution Graph</h1>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!contributions) {
    return (
      <div className="login-container">
        <h1>GitHub Contribution Graph</h1>
        <div className="loading-message">Loading contributions...</div>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="login-container">
        <h1>GitHub Contribution Graph</h1>
        <div className="error-message">No contribution data available</div>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <h1>Contribution Graph for {calendar.name}</h1>
      </header>
      <ContributionsView calendar={calendar} />
    </>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary>
      <StaticApp />
    </ErrorBoundary>
  </StrictMode>,
);
