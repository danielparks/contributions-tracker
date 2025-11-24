import * as github from "./github/api.ts";

function parseDateTime(input: string) {
  const [year, month, ...rest] = input
    .split(/\D+/)
    .map((n) => Number.parseInt(n, 10));
  return new Date(year, month - 1, ...rest);
}

// Convert a date time to a date in UTC.
//
// This converts a local date time to its localtime date, then encodes it in UTC
// for simpler date math (UTC has no daylight saving time).
function toUtcDate(input: Date) {
  return Date.UTC(input.getFullYear(), input.getMonth(), input.getDate());
}

export class Calendar {
  name: string; // User’s name.
  start: Date;
  start_ms: number; // UTC date encoded as ms since 1970.
  days: Day[];

  constructor(name: string, start: Date, days: Day[] = []) {
    this.name = name;
    this.start = start;
    this.start_ms = toUtcDate(start);
    this.days = days;
  }

  static fromContributions(contributions: github.Contributions) {
    const calendar = new Calendar(
      contributions.name,
      parseDateTime(contributions.calendar.weeks[0].contributionDays[0].date),
      contributions.calendar.weeks.map((week) =>
        week.contributionDays.map((day) =>
          new Day(parseDateTime(day.date), day.contributionCount)
        )
      ).flat(),
    );
    return calendar.updateFromContributions(contributions);
  }

  updateFromContributions(contributions: github.Contributions) {
    // FIXME Ignores contributions.calendar; everything is loaded in first loop.
    // However, if we want to add contributions from another date range this
    // won’t work.

    for (const entry of contributions.commits) {
      const {
        repository: { url, isFork, isPrivate },
        contributions: { nodes },
      } = entry;
      const repository = new Repository(url, isFork, isPrivate);
      for (const node of github.cleanNodes(nodes)) {
        const { commitCount, occurredAt } = node;
        // occurredAt seems to be a localtime date explicitly in UTC, e.g.
        // "2025-10-02T07:00:00Z", so using `new Date()` to parse it works well.
        const day = this.day(new Date(occurredAt));
        if (!day) {
          console.warn(`Date "${occurredAt}" not in calendar`);
        } else {
          const repoDay = day.repositories.get(url);
          if (repoDay) {
            repoDay.commitCount += commitCount; // FIXME correct?
          } else {
            day.repositories.set(
              url,
              new RepositoryDay(repository, commitCount),
            );
          }
        }
      }
    }

    for (const node of contributions.issues) {
      const { url, isFork, isPrivate } = node.issue.repository;

      // occurredAt seems to be a UTC datetime, e.g. "2025-11-06T21:41:51Z", so
      // using `new Date()` to parse it works well.
      const day = this.day(new Date(node.occurredAt));
      if (!day) {
        console.warn(`Date "${node.occurredAt}" not in calendar`);
      } else {
        const repoDay = day.repositories.get(url);
        if (repoDay) {
          repoDay.issues.push(node.issue.url);
        } else {
          const repository = new Repository(url, isFork, isPrivate);
          const repoDay = new RepositoryDay(repository, 0, 0);
          repoDay.issues.push(node.issue.url);
          day.repositories.set(url, repoDay);
        }
      }
    }

    for (const node of contributions.prs) {
      const { url, isFork, isPrivate } = node.pullRequest.repository;

      // occurredAt seems to be a UTC datetime, e.g. "2025-11-06T21:41:51Z", so
      // using `new Date()` to parse it works well.
      const day = this.day(new Date(node.occurredAt));
      if (!day) {
        console.warn(`Date "${node.occurredAt}" not in calendar`);
      } else {
        const repoDay = day.repositories.get(url);
        if (repoDay) {
          repoDay.prs.push(node.pullRequest.url);
        } else {
          const repository = new Repository(url, isFork, isPrivate);
          const repoDay = new RepositoryDay(repository, 0, 0);
          repoDay.prs.push(node.pullRequest.url);
          day.repositories.set(url, repoDay);
        }
      }
    }

    for (const node of contributions.repositories) {
      const {
        occurredAt,
        repository: { url, isFork, isPrivate },
      } = node;
      const repository = new Repository(url, isFork, isPrivate);

      // occurredAt seems to be a UTC datetime, e.g. "2025-11-06T21:41:51Z", so
      // using `new Date()` to parse it works well.
      const day = this.day(new Date(occurredAt));
      if (!day) {
        console.warn(`Date "${occurredAt}" not in calendar`);
      } else {
        const repoDay = day.repositories.get(url);
        if (repoDay) {
          repoDay.created++;
        } else {
          day.repositories.set(url, new RepositoryDay(repository, 0, 1));
        }
      }
    }

    return this;
  }

  // Expects localtime date.
  day(date: Date): Day | undefined {
    // FIXME doens’t handle out-of-range dates well.
    return this.days[Math.round((toUtcDate(date) - this.start_ms) / 86400000)];
  }

  maxContributions() {
    return Math.max(
      ...this.days
        .filter((day) => day.contributionCount !== null)
        .map((day) => day.contributionCount as number),
    );
  }

  // FIXME test this.
  *weeks() {
    // Weeks always start on Sunday; if .start isn’t Sunday, pad with null Days.
    const firstWeek: Day[] = [];
    const date = new Date(this.start);
    for (let i = 0; i < this.start.getDay(); i++) {
      firstWeek.push(new Day(date, null));
      date.setDate(date.getDate() + 1);
    }
    firstWeek.push(...this.days.slice(0, 7 - this.start.getDay()));
    yield firstWeek;

    for (let i = 7 - this.start.getDay(); i < this.days.length; i += 7) {
      yield this.days.slice(i, i + 7);
    }
  }
}

export class Day {
  date: Date;
  contributionCount: number | null;
  repositories: Map<string, RepositoryDay>;

  constructor(
    date: Date,
    contributionCount: number | null = null,
    repositories: Map<string, RepositoryDay> = new Map(),
  ) {
    this.date = date;
    this.contributionCount = contributionCount;
    this.repositories = repositories;
  }

  // Do the contributions we know about add up to the contribution count?
  addsUp() {
    return this.contributionCount == this.knownContributionCount();
  }

  // Add up the contributions we know about specifically.
  knownContributionCount() {
    return [...this.repositories.values()].reduce(
      (total, repoDay) =>
        total + repoDay.created + repoDay.commitCount + repoDay.issues.length +
        repoDay.prs.length,
      0,
    );
  }
}

export class RepositoryDay {
  readonly repository: Repository;
  commitCount: number;
  // How many times the repo was created this day. (Typically 0, sometimes 1.)
  created = 0;
  // Issue urls
  issues: string[];
  // PR urls
  prs: string[];

  constructor(
    repository: Repository,
    commitCount = 0,
    created = 0,
  ) {
    this.repository = repository;
    this.commitCount = commitCount;
    this.created = created;
    this.issues = [];
    this.prs = [];
  }
}

export class Repository {
  url: string;
  isFork: boolean;
  isPrivate: boolean;
  constructor(url: string, isFork = false, isPrivate = false) {
    this.url = url;
    this.isFork = isFork;
    this.isPrivate = isPrivate;
  }
}
