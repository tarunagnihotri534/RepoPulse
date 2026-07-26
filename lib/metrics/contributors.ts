import type { ContributorMetrics, GitHubContributor } from '../types';

export function computeContributorMetrics(contributors: GitHubContributor[]): ContributorMetrics {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newContributorsLast30Days = contributors.filter(
    (c) => c.firstContributionAt && new Date(c.firstContributionAt) >= thirtyDaysAgo,
  ).length;
  return {
    totalContributors: contributors.length,
    newContributorsLast30Days,
    topContributors: contributors.slice(0, 10).map((c) => ({
      login: c.login,
      contributions: c.contributions,
      avatarUrl: c.avatarUrl,
    })),
  };
}
