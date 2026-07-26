import type { GitHubPullRequest, PRMetrics } from '../types';
import { hoursBetween, median, now } from '../utils';

export function computePRMetrics(prs: GitHubPullRequest[]): PRMetrics {
  const reviewLatencies: number[] = [];
  const mergeTimes: number[] = [];
  let merged = 0;
  let closedWithoutMerge = 0;
  const reviewRounds: number[] = [];
  let stalePRCount = 0;
  const nowTs = now();

  for (const pr of prs) {
    const opened = new Date(pr.createdAt);
    const reviews = pr.reviews?.nodes ?? [];
    if (reviews.length > 0) {
      const firstReview = reviews.map((r) => new Date(r.submittedAt).getTime()).sort((a, b) => a - b)[0];
      const latency = hoursBetween(opened, new Date(firstReview));
      if (latency >= 0) reviewLatencies.push(latency);
      reviewRounds.push(reviews.length);
    }
    if (pr.state === 'MERGED' && pr.mergedAt) {
      mergeTimes.push(hoursBetween(opened, new Date(pr.mergedAt)));
      merged++;
    } else if (pr.state === 'CLOSED' && !pr.mergedAt) {
      closedWithoutMerge++;
    }
    if (pr.state === 'OPEN') {
      const daysSince = (nowTs - new Date(pr.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) stalePRCount++;
    }
  }

  const denominator = merged + closedWithoutMerge;
  return {
    medianReviewLatencyHours: median(reviewLatencies),
    medianMergeTimeHours: median(mergeTimes),
    mergeRate: denominator > 0 ? merged / denominator : 0,
    avgReviewRounds: reviewRounds.length > 0 ? reviewRounds.reduce((a, b) => a + b, 0) / reviewRounds.length : 0,
    stalePRCount,
  };
}
