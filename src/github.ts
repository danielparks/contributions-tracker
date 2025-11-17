import { Octokit } from "@octokit/core";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import type { paginateGraphQLInterface } from "@octokit/plugin-paginate-graphql";

export function redirectToLogin(redirectUrl: string) {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "GitHub Client ID not found; make sure VITE_GITHUB_CLIENT_ID is set in " +
        " your .env file.",
    );
  }

  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", clientId);
  redirect.searchParams.set("redirect_uri", redirectUrl);
  redirect.searchParams.set("scope", "repo");
  document.location.href = redirect.href;
}

export async function getToken(code: string, backendUrl: string) {
  const url = new URL("/api/oauth/callback", backendUrl);
  url.searchParams.set("code", code);
  const response = await fetch(url);
  const data = await response.json() as { access_token?: string };
  return data.access_token;
}

export interface Contributions {
  login: string;
  name: string;
  calendar: ContributionCalendar;
  other?: string;
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionDay {
  contributionCount: number;
  contributionLevel: ContributionLevel;
  date: string;
}

export enum ContributionLevel {
  None = "NONE",
  FirstQuartile = "FIRST_QUARTILE",
  SecondQuartile = "SECOND_QUARTILE",
  ThirdQuartile = "THIRD_QUARTILE",
  FourthQuartile = "FOURTH_QUARTILE",
}

export interface CommitContributionsByRepository {
  repository: Repository;
  contributions: CommitContributions;
}

export interface CommitContributions {
  nodes: CommitNode[];
  pageInfo: CommitPageInfo;
}

export interface CommitNode {
  commitCount: number;
  isRestricted: boolean;
  occurredAt: string;
  resourcePath: string;
  url: string;
}

export interface CommitPageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface RepositoryContributions {
  nodes: RepositoryNode[];
  pageInfo: RepositoryPageInfo;
}

export interface RepositoryNode {
  isRestricted: boolean;
  occurredAt: string;
  repository: Repository;
  url: string;
}

export interface RepositoryPageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface Repository {
  isFork: boolean;
  isPrivate: boolean;
  url: string;
}

export type OctokitWithPagination = Octokit & paginateGraphQLInterface;

// Get an octokit instance to work with.
export function octokit(token: string): OctokitWithPagination {
  const MyOctokit = Octokit.plugin(paginateGraphQL);
  return new MyOctokit({ auth: `token ${token}` });
}

export function installRateLimitReport(octokit: OctokitWithPagination) {
  let printJob: number | null = null;
  octokit.hook.after("request", (response) => {
    const limit = response.headers["x-ratelimit-limit"] || "";
    const reset = response.headers["x-ratelimit-reset"];
    const resource = response.headers["x-ratelimit-resource"];
    const used = (response.headers["x-ratelimit-used"] || "").toString();

    // Only print the rate limit info after a batch of requests.
    if (printJob) {
      clearTimeout(printJob);
    }
    printJob = setTimeout(() => {
      printJob = null;
      console.log(`Rate limit used: ${used}/${limit}`, resource);
      if (reset) {
        const seconds = Number.parseInt(reset, 10);
        if (!Number.isNaN(seconds)) {
          console.log("Rate limit resets:", new Date(seconds * 1000));
        }
      }
    }, 1000);
  });
}

export async function queryCalendar(
  octokit: OctokitWithPagination,
): Promise<{ login: string; name: string; calendar: ContributionCalendar }> {
  const {
    viewer: {
      login,
      name,
      contributionsCollection: { contributionCalendar: calendar },
    },
  }: {
    viewer: {
      login: string;
      name: string;
      contributionsCollection: {
        contributionCalendar: ContributionCalendar;
      };
    };
  } = await octokit.graphql({
    query: `query {
      viewer {
        login
        name
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                contributionLevel
                date
              }
            }
          }
        }
      }
    }`,
  });

  return { login, name, calendar };
}

export async function queryCommits(
  octokit: OctokitWithPagination,
): Promise<CommitContributionsByRepository> {
  const {
    viewer: {
      contributionsCollection: { commitContributionsByRepository: commits },
    },
  }: {
    viewer: {
      contributionsCollection: {
        commitContributionsByRepository: CommitContributionsByRepository;
      };
    };
  } = await octokit.graphql(
    `query {
      viewer {
        contributionsCollection {
          commitContributionsByRepository(maxRepositories: 25) {
            repository {
              isFork
              isPrivate
              url
            }
            contributions(last: 50) {
              nodes {
                commitCount
                occurredAt
                isRestricted
                resourcePath
                url
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    }`,
  );
  return commits;
}

export async function queryRepositories(
  octokit: OctokitWithPagination,
): Promise<RepositoryContributions> {
  const {
    viewer: {
      contributionsCollection: { repositoryContributions: repos },
    },
  }: {
    viewer: {
      contributionsCollection: {
        repositoryContributions: RepositoryContributions;
      };
    };
  } = await octokit.graphql.paginate(
    `query paginate($cursor: String) {
      viewer {
        contributionsCollection {
          repositoryContributions(last: 100, after: $cursor) {
            nodes {
              isRestricted
              occurredAt
              repository {
                isFork
                isPrivate
                url
              }
              url
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }`,
  );
  return repos;
}
