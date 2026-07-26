// ─── Config ───────────────────────────────────────────────────────────────────

export interface RepoConfig {
  owner: string;
  repo: string;
}

// ─── GitHub raw payloads ──────────────────────────────────────────────────────

export interface GitHubUser {
  login: string;
  avatarUrl: string;
  url: string;
}

export interface GitHubLabel {
  name: string;
  color: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED';
  createdAt: string;
  closedAt: string | null;
  updatedAt: string;
  author: GitHubUser | null;
  assignees: GitHubUser[];
  labels: GitHubLabel[];
  comments: { totalCount: number };
  timelineItems?: { nodes: Array<{ createdAt: string; actor?: GitHubUser }> };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  createdAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  updatedAt: string;
  author: GitHubUser | null;
  assignees: GitHubUser[];
  labels: GitHubLabel[];
  reviewDecision: string | null;
  reviews: {
    totalCount: number;
    nodes: Array<{ author: GitHubUser | null; submittedAt: string; state: string }>;
  };
  comments: { totalCount: number };
  changedFiles: number;
  additions: number;
  deletions: number;
  baseRefName: string;
  headRefName: string;
}

export interface GitHubContributor {
  login: string;
  avatarUrl: string;
  url: string;
  contributions: number;
  firstContributionAt?: string;
}

export interface GitHubRepoStats {
  stargazerCount: number;
  forkCount: number;
  watcherCount: number;
  openIssueCount: number;
  openPRCount: number;
  defaultBranch: string;
  description: string | null;
  homepageUrl: string | null;
  pushedAt: string;
  createdAt: string;
  diskUsageKb: number;
  licenseInfo: { name: string } | null;
  languages: Array<{ name: string; size: number }>;
  topics: string[];
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  cost: number;
}

export interface GitHubApiResponse {
  repoStats: GitHubRepoStats;
  issues: GitHubIssue[];
  pullRequests: GitHubPullRequest[];
  contributors: GitHubContributor[];
  rateLimit: RateLimitInfo;
}

// ─── Computed metrics ─────────────────────────────────────────────────────────

export interface ResponseTimeMetrics {
  medianFirstResponseHours: number;
  medianCloseTimeHours: number;
  closedWithin7DaysPct: number;
  stalePct: number;
}

export interface PRMetrics {
  medianReviewLatencyHours: number;
  medianMergeTimeHours: number;
  mergeRate: number;
  avgReviewRounds: number;
  stalePRCount: number;
}

export interface ContributorMetrics {
  totalContributors: number;
  newContributorsLast30Days: number;
  topContributors: Array<{ login: string; contributions: number; avatarUrl: string }>;
}

export interface TriageMetrics {
  openIssues: number;
  openPRs: number;
  unlabeledIssues: number;
  topLabels: Array<{ name: string; count: number; color: string }>;
  hotspotLabels: string[];
}

export interface WeekOverWeekDelta {
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  closedIssues: number;
  mergedPRs: number;
  newContributors: number;
}

export interface HealthScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    responseTime: number;
    prVelocity: number;
    triageHealth: number;
    communityGrowth: number;
  };
}

// ─── Snapshot / output shape ──────────────────────────────────────────────────

export interface DailySnapshot {
  date: string;
  repo: RepoConfig;
  repoStats: GitHubRepoStats;
  issueMetrics: ResponseTimeMetrics;
  prMetrics: PRMetrics;
  contributorMetrics: ContributorMetrics;
  triageMetrics: TriageMetrics;
  healthScore: HealthScore;
  deltaFromPrevious: WeekOverWeekDelta | null;
  generatedAt: string;
  // Raw lists included in the snapshot for the dashboard
  issues: GitHubIssue[];
  pullRequests: GitHubPullRequest[];
  contributors: GitHubContributor[];
}

export interface HistoryEntry {
  date: string;
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  healthScore: number;
  newContributors: number;
}
