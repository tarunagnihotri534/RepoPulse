/**
 * On-demand aggregator.
 * Fetches GitHub data, computes all metrics, and returns a DailySnapshot.
 * No file writes — persistence is handled by lib/db.ts.
 */
import { GitHubClient } from './github';
import {
  computeContributorMetrics,
  computeHealthScore,
  computeIssueMetrics,
  computePRMetrics,
  computeTriageMetrics,
} from './metrics';
import type { DailySnapshot, HistoryEntry } from './types';
import { nowIso, todayIso } from './utils';

export interface AggregatorOptions {
  owner: string;
  repo: string;
  /** Previously stored history for this repo — used to compute WoW deltas */
  history?: HistoryEntry[];
}

export async function runAggregator(opts: AggregatorOptions): Promise<DailySnapshot> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_PAT ?? '';
  if (!token) {
    throw new Error('No GitHub token found. Set GITHUB_TOKEN environment variable.');
  }

  const client = new GitHubClient(token);
  const apiData = await client.fetchAll(opts.owner, opts.repo);

  const issueMetrics      = computeIssueMetrics(apiData.issues);
  const prMetrics         = computePRMetrics(apiData.pullRequests);
  const contributorMetrics = computeContributorMetrics(apiData.contributors);
  const triageMetrics     = computeTriageMetrics(apiData.issues);
  triageMetrics.openPRs   = apiData.repoStats.openPRCount;
  const healthScore       = computeHealthScore(issueMetrics, prMetrics, contributorMetrics, triageMetrics);

  // Week-over-week deltas from stored history
  const delta = computeWoWDelta(
    {
      repoStats: apiData.repoStats,
      triageMetrics,
      contributorMetrics,
      date: todayIso(),
    },
    opts.history ?? [],
  );

  return {
    date: todayIso(),
    repo: { owner: opts.owner, repo: opts.repo },
    repoStats: apiData.repoStats,
    issueMetrics,
    prMetrics,
    contributorMetrics,
    triageMetrics,
    healthScore,
    deltaFromPrevious: delta,
    generatedAt: nowIso(),
    // Embed raw lists so dashboard can render PR/issue/contributor tables
    issues: apiData.issues,
    pullRequests: apiData.pullRequests,
    contributors: apiData.contributors,
  };
}

// ─── WoW delta (inline — no separate deltas.ts needed) ───────────────────────

function computeWoWDelta(
  current: {
    repoStats: { stargazerCount: number; forkCount: number };
    triageMetrics: { openIssues: number; openPRs: number };
    contributorMetrics: { newContributorsLast30Days: number };
    date: string;
  },
  history: HistoryEntry[],
) {
  if (history.length === 0) return null;
  const targetDate = new Date(current.date);
  targetDate.setDate(targetDate.getDate() - 7);
  let closest: HistoryEntry | null = null;
  let closestDiff = Infinity;
  for (const entry of history) {
    const diff = Math.abs(new Date(entry.date).getTime() - targetDate.getTime());
    if (diff < closestDiff) { closestDiff = diff; closest = entry; }
  }
  if (!closest) return null;
  return {
    stars:           current.repoStats.stargazerCount - closest.stars,
    forks:           current.repoStats.forkCount - closest.forks,
    openIssues:      current.triageMetrics.openIssues - closest.openIssues,
    openPRs:         current.triageMetrics.openPRs - closest.openPRs,
    closedIssues:    0,
    mergedPRs:       0,
    newContributors: current.contributorMetrics.newContributorsLast30Days - closest.newContributors,
  };
}
