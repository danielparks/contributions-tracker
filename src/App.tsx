import "./App.css";
import { useEffect, useState } from "react";
import * as github from "./github/api.ts";
import type { ContributionCalendarDay } from "./github/gql.ts";

const BASE_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:3000";

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("github_token"),
  );
  const [info, setInfo] = useState<github.Contributions | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback. Runs only on mount.
  useEffect(() => {
    (async () => {
      if (accessToken) {
        return;
      }

      const code = new URLSearchParams(document.location.search).get("code");
      if (!code) {
        return;
      }

      setLoading(true);
      setError(null);

      const token = await github.getToken(code, BACKEND_URL);
      if (token) {
        setAccessToken(token);
        // FIXME? This will be available to the entire origin.
        localStorage.setItem("github_token", token);
        history.replaceState({}, document.title, "/");
      } else {
        setError("Failed to authenticate with GitHub");
      }
    })().catch((error: unknown) => {
      setError("Error during authentication");
      console.error(error);
    });
    // This should only run on mount, not when accessToken changes:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      if (!accessToken) {
        setInfo(null);
        return;
      }
      setLoading(true);

      /*
      contributionsCollection:
        commitContributionsByRepository
        issueContributions or issueContributionsByRepository // opened
        pullRequestContributions or pullRequestContributionsByRepository
        pullRequestReviewContributions or pullRequestReviewContributionsByRepository
        repositoryContributions // repos created
        joinedGitHubContribution
        contributionYears // years the user has made contributions
        hasActivityInThePast // alternative
        mostRecentCollectionWithActivity // maybe automatically gets earlier stuff?
      */
      const octokit = github.octokit(accessToken);
      github.installRateLimitReport(octokit);
      const { login, name, calendar } = await github.queryCalendar(octokit);
      const commits = await github.queryCommits(octokit);
      const repos = await github.queryRepositories(octokit);

      setInfo({
        login,
        name,
        calendar,
        other: `commits: ${JSON.stringify(commits, null, 4)}\n\nrepos: ${
          JSON.stringify(repos, null, 4)
        }`,
      });
      setLoading(false);
    })().catch((error: unknown) => {
      console.error("Error getting contribution data", error);
      setError("Error getting contribution data");
    });
  }, [accessToken]);

  function login(): void {
    try {
      github.redirectToLogin(BASE_URL);
    } catch (error: unknown) {
      console.error("Error redirecting to GitHub login:", error);
      setError("Configuration error. Could not log into GitHub.");
    }
  }

  function logout(): void {
    setAccessToken(null);
    localStorage.removeItem("github_token");
  }

  if (accessToken === null) {
    return (
      <>
        {error && <h3>Error: {error}</h3>}
        <button type="button" onClick={login}>Log in</button>
      </>
    );
  }

  return (
    <>
      <h1>Contribution Graph{info && " for " + info.name}</h1>
      <button type="button" onClick={logout}>Log out</button>
      {error && <h3 className="error">Error: {error}</h3>}
      {loading ? <h3 className="loading">Loading</h3> : info
        ? (
          <>
            <label>
              <input
                type="checkbox"
                onChange={(e) => {
                  setShowNumbers(e.target.checked);
                }}
              />{" "}
              Show numbers
            </label>
            <ContributionsGraph
              contributions={info}
              showNumbers={showNumbers}
            />
          </>
        )
        : <h3>No contributions data</h3>}
    </>
  );
}

function ContributionsGraph(
  { contributions, showNumbers }: {
    contributions: github.Contributions;
    showNumbers: boolean;
  },
) {
  const weeks = contributions.calendar.weeks;
  const day_max = Math.max(
    ...weeks.map((week) =>
      Math.max(...week.contributionDays.map((day) => day.contributionCount))
    ),
  );

  function day_style(day: ContributionCalendarDay) {
    let value = 100;
    let color = "transparent";
    if (day.contributionCount > 0) {
      value = 55 * (1 - day.contributionCount / day_max) + 40;
      if (showNumbers) {
        color = value < 70 ? "#fff" : "#333";
      }
    }
    return {
      color,
      background: `hsl(270deg 40 ${value.toString()})`,
    };
  }

  return (
    <>
      <table className="contributions">
        <tbody>
          {weeks.map((week) => (
            <tr key={`week${week.contributionDays[0].date}`} className="week">
              {week.contributionDays.map((day) => (
                <td
                  key={`day${day.date}`}
                  style={day_style(day)}
                >
                  {day.contributionCount}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {contributions.other && <pre>{contributions.other}</pre>}
    </>
  );
}
