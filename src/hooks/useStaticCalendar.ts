import { useEffect, useMemo, useState } from "react";
import { Calendar } from "../model.ts";
import type { Contributions } from "../github/api.ts";

export interface UseStaticCalendarResult {
  calendar: Calendar | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetches and builds a `Calendar` from pre-generated contributions JSON.
 *
 * Used by the static entry points (static.html and compact.html) to load
 * contribution data without requiring GitHub API access.
 */
export function useStaticCalendar(): UseStaticCalendarResult {
  const [contributions, setContributions] = useState<Contributions[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_CONTRIBUTIONS_URL ||
      "assets/contributions.json";
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data: Contributions[]) => {
        setContributions(data);
      })
      .catch((error: unknown) => {
        console.error(`Error loading ${url}`, error);
        setError("Could not load contributions.");
      });
  }, []);

  const calendar = useMemo(
    () => Calendar.fromContributions(...contributions || []),
    [contributions],
  );

  return {
    calendar,
    error,
    loading: !contributions && !error,
  };
}
