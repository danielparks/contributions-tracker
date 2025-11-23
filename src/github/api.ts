import { Octokit } from "@octokit/core";
import type {
  CommitContributionsByRepository,
  ContributionCalendar,
  CreatedIssueContribution,
  CreatedPullRequestContribution,
  CreatedRepositoryContribution,
  Maybe,
  User,
} from "./gql.ts";

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

export class GitHub {
  readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: `token ${token}` });
  }

  installRateLimitReport() {
    let printJob: number | null = null;
    this.octokit.hook.after("request", (response) => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async graphqlViewer(query: string, variables: { [key: string]: any } = {}) {
    const { viewer } = await this.octokit.graphql<{ viewer: User }>({
      query,
      ...variables,
    });
    return viewer;
  }

  async *queryBase(): AsyncGenerator<Contributions> {
    const query = `query (
      $commitCursor:String = null,
      $issueCursor:String = null,
      $prCursor:String = null,
      $repoCursor:String = null,
    ) {
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
            commitContributionsByRepository(maxRepositories: 50) {
              repository {
                isFork
                isPrivate
                url
              }
              contributions(first: 50, after: $commitCursor) {
                nodes {
                  commitCount
                  isRestricted
                  occurredAt
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
            issueContributions(first: 50, after: $issueCursor) {
              nodes {
                isRestricted
                occurredAt
                issue {
                  repository {
                    isFork
                    isPrivate
                    url
                  }
                  url
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
            pullRequestContributions(first: 50, after: $prCursor) {
              nodes {
                isRestricted
                occurredAt
                pullRequest {
                  repository {
                    isFork
                    isPrivate
                    url
                  }
                  url
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
            repositoryContributions(first: 50, after: $repoCursor) {
              nodes {
                isRestricted
                occurredAt
                repository {
                  isFork
                  isPrivate
                  url
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }`;
    const viewer = await this.graphqlViewer(query);
    const collection = viewer.contributionsCollection;
    const contributions = {
      login: viewer.login,
      name: viewer.name || "",
      calendar: collection.contributionCalendar,
      commits: collection.commitContributionsByRepository,
      issues: cleanNodes(collection.issueContributions.nodes),
      prs: cleanNodes(collection.pullRequestContributions.nodes),
      repositories: cleanNodes(collection.repositoryContributions.nodes),
    };

    // Yield initial data
    yield contributions;

    let commitPageInfo = collection.commitContributionsByRepository.find((
      { contributions },
    ) => contributions.pageInfo.hasNextPage)?.contributions.pageInfo;
    let issuePageInfo = collection.issueContributions.pageInfo;
    let prPageInfo = collection.pullRequestContributions.pageInfo;
    let repoPageInfo = collection.repositoryContributions.pageInfo;
    while (
      commitPageInfo?.hasNextPage || issuePageInfo.hasNextPage ||
      prPageInfo.hasNextPage || repoPageInfo.hasNextPage
    ) {
      const results = await this.graphqlViewer(
        query,
        {
          commitCursor: commitPageInfo?.endCursor,
          issueCursor: issuePageInfo.endCursor,
          prCursor: prPageInfo.endCursor,
          repoCursor: repoPageInfo.endCursor,
        },
      );

      const collection = results.contributionsCollection;
      if (commitPageInfo?.hasNextPage) {
        // Only load data if the last result wasn’t the last page.
        commitPageInfo = collection
          .commitContributionsByRepository.find(({ contributions }) =>
            contributions.pageInfo.hasNextPage
          )?.contributions.pageInfo;
        contributions.commits.push(
          ...collection.commitContributionsByRepository,
        );
      }

      if (issuePageInfo.hasNextPage) {
        // Only load data if the last result wasn’t the last page.
        const { nodes, pageInfo } = collection.issueContributions;
        contributions.issues.push(...cleanNodes(nodes));
        issuePageInfo = pageInfo;
      }

      if (prPageInfo.hasNextPage) {
        // Only load data if the last result wasn’t the last page.
        const { nodes, pageInfo } = collection.pullRequestContributions;
        contributions.prs.push(...cleanNodes(nodes));
        prPageInfo = pageInfo;
      }

      if (repoPageInfo.hasNextPage) {
        // Only load data if the last result wasn’t the last page.
        const { nodes, pageInfo } = collection.repositoryContributions;
        contributions.repositories.push(...cleanNodes(nodes));
        repoPageInfo = pageInfo;
      }

      // Yield updated data after each page load
      yield contributions;
    }
  }
}

export function cleanNodes<NodeType>(
  nodes: Maybe<Maybe<NodeType>[]> | undefined,
): NodeType[] {
  return (nodes || []).filter((node) => node !== null && node !== undefined);
}

export interface Contributions {
  login: string;
  name: string;
  calendar: ContributionCalendar;
  commits: CommitContributionsByRepository[];
  issues: CreatedIssueContribution[];
  prs: CreatedPullRequestContribution[];
  repositories: CreatedRepositoryContribution[];
}
