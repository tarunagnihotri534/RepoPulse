import type {
  GitHubApiResponse,
  GitHubContributor,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepoStats,
  RateLimitInfo,
} from '../types';
import {
  CONTRIBUTORS_QUERY,
  ISSUES_QUERY,
  PULL_REQUESTS_QUERY,
  REPO_STATS_QUERY,
} from './queries';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const MAX_PAGES = 5;

export class GitHubClient {
  private token: string;
  private totalCost = 0;

  constructor(token: string) {
    this.token = token;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'mcp-repo-datatracker/2.0',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API HTTP ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (json.errors?.length) {
      throw new Error(`GitHub GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`);
    }
    if (!json.data) throw new Error('GitHub API returned no data');
    return json.data;
  }

  private trackCost(rl: RateLimitInfo): void {
    this.totalCost += rl.cost;
  }

  async fetchRepoStats(owner: string, repo: string): Promise<{ stats: GitHubRepoStats; rateLimit: RateLimitInfo }> {
    const data = await this.graphql<{
      rateLimit: RateLimitInfo;
      repository: {
        stargazerCount: number; forkCount: number;
        watchers: { totalCount: number };
        openIssues: { totalCount: number }; openPRs: { totalCount: number };
        defaultBranchRef: { name: string } | null;
        description: string | null; homepageUrl: string | null;
        pushedAt: string; createdAt: string; diskUsage: number;
        licenseInfo: { name: string } | null;
        languages: { edges: Array<{ size: number; node: { name: string } }> };
        repositoryTopics: { nodes: Array<{ topic: { name: string } }> };
      };
    }>(REPO_STATS_QUERY, { owner, repo });

    this.trackCost(data.rateLimit);
    const r = data.repository;
    return {
      stats: {
        stargazerCount: r.stargazerCount,
        forkCount: r.forkCount,
        watcherCount: r.watchers.totalCount,
        openIssueCount: r.openIssues.totalCount,
        openPRCount: r.openPRs.totalCount,
        defaultBranch: r.defaultBranchRef?.name ?? 'main',
        description: r.description,
        homepageUrl: r.homepageUrl,
        pushedAt: r.pushedAt,
        createdAt: r.createdAt,
        diskUsageKb: r.diskUsage,
        licenseInfo: r.licenseInfo,
        languages: r.languages.edges.map((e) => ({ name: e.node.name, size: e.size })),
        topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
      },
      rateLimit: data.rateLimit,
    };
  }

  async fetchIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    const issues: GitHubIssue[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await this.graphql<{
        rateLimit: RateLimitInfo;
        repository: {
          issues: {
            pageInfo: { hasNextPage: boolean; endCursor: string };
            nodes: Array<{
              number: number; title: string; state: 'OPEN' | 'CLOSED';
              createdAt: string; closedAt: string | null; updatedAt: string;
              author: { login: string; avatarUrl: string; url: string } | null;
              assignees: { nodes: Array<{ login: string; avatarUrl: string; url: string }> };
              labels: { nodes: Array<{ name: string; color: string }> };
              comments: { totalCount: number };
              timelineItems: { nodes: Array<{ createdAt?: string; actor?: { login: string; avatarUrl: string; url: string }; author?: { login: string; avatarUrl: string; url: string } }> };
            }>;
          };
        };
      }>(ISSUES_QUERY, { owner, repo, cursor });

      this.trackCost(data.rateLimit);
      for (const n of data.repository.issues.nodes) {
        issues.push({
          number: n.number, title: n.title, state: n.state,
          createdAt: n.createdAt, closedAt: n.closedAt, updatedAt: n.updatedAt,
          author: n.author,
          assignees: n.assignees.nodes,
          labels: n.labels.nodes,
          comments: n.comments,
          timelineItems: {
            nodes: n.timelineItems.nodes.map((t) => ({
              createdAt: t.createdAt ?? '',
              actor: t.actor ?? t.author,
            })),
          },
        });
      }
      if (!data.repository.issues.pageInfo.hasNextPage) break;
      cursor = data.repository.issues.pageInfo.endCursor;
    }
    return issues;
  }

  async fetchPullRequests(owner: string, repo: string): Promise<GitHubPullRequest[]> {
    const prs: GitHubPullRequest[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await this.graphql<{
        rateLimit: RateLimitInfo;
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: boolean; endCursor: string };
            nodes: Array<GitHubPullRequest & {
              assignees: { nodes: Array<{ login: string; avatarUrl: string; url: string }> };
              labels: { nodes: Array<{ name: string; color: string }> };
            }>;
          };
        };
      }>(PULL_REQUESTS_QUERY, { owner, repo, cursor });

      this.trackCost(data.rateLimit);
      for (const n of data.repository.pullRequests.nodes) {
        prs.push({ ...n, assignees: n.assignees.nodes, labels: n.labels.nodes } as unknown as GitHubPullRequest);
      }
      if (!data.repository.pullRequests.pageInfo.hasNextPage) break;
      cursor = data.repository.pullRequests.pageInfo.endCursor;
    }
    return prs;
  }

  async fetchContributors(owner: string, repo: string): Promise<GitHubContributor[]> {
    const map = new Map<string, { login: string; avatarUrl: string; url: string; count: number; firstDate: string }>();
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await this.graphql<{
        rateLimit: RateLimitInfo;
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                pageInfo: { hasNextPage: boolean; endCursor: string };
                nodes: Array<{ author: { user: { login: string; avatarUrl: string; url: string } | null; date: string } }>;
              };
            };
          } | null;
        };
      }>(CONTRIBUTORS_QUERY, { owner, repo, cursor });

      this.trackCost(data.rateLimit);
      const history = data.repository.defaultBranchRef?.target?.history;
      if (!history) break;
      for (const commit of history.nodes) {
        const user = commit.author.user;
        if (!user) continue;
        const existing = map.get(user.login);
        if (!existing) {
          map.set(user.login, { login: user.login, avatarUrl: user.avatarUrl, url: user.url, count: 1, firstDate: commit.author.date });
        } else {
          existing.count++;
          if (commit.author.date < existing.firstDate) existing.firstDate = commit.author.date;
        }
      }
      if (!history.pageInfo.hasNextPage) break;
      cursor = history.pageInfo.endCursor;
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ login: c.login, avatarUrl: c.avatarUrl, url: c.url, contributions: c.count, firstContributionAt: c.firstDate }));
  }

  async fetchAll(owner: string, repo: string): Promise<GitHubApiResponse> {
    const [{ stats, rateLimit }, issues, pullRequests, contributors] = await Promise.all([
      this.fetchRepoStats(owner, repo),
      this.fetchIssues(owner, repo),
      this.fetchPullRequests(owner, repo),
      this.fetchContributors(owner, repo),
    ]);
    return { repoStats: stats, issues, pullRequests, contributors, rateLimit };
  }
}
