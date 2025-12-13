import "./App.css";
import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { ContributionsView } from "./components/ContributionsView.tsx";
import { Calendar } from "./model.ts";
import type { Contributions } from "./github/api.ts";

declare global {
  interface Window {
    CALENDAR_DATA?: Contributions[];
  }
}

export function StaticApp() {
  const calendar = useMemo(() => {
    const contributions = window.CALENDAR_DATA;
    if (
      !contributions || !Array.isArray(contributions) ||
      contributions.length === 0
    ) {
      return null;
    }

    const calendar = Calendar.fromContributions(contributions[0]);
    for (const contrib of contributions.slice(1)) {
      calendar.updateFromContributions(contrib);
    }
    return calendar;
  }, []);

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
