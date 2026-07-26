import type { ContributorMetrics, HealthScore, PRMetrics, ResponseTimeMetrics, TriageMetrics } from '../types';

export function computeHealthScore(
  issueMetrics: ResponseTimeMetrics,
  prMetrics: PRMetrics,
  contributorMetrics: ContributorMetrics,
  triageMetrics: TriageMetrics,
): HealthScore {
  const responseScore = clamp(
    scoreResponseTime(issueMetrics.medianFirstResponseHours) * 0.5 +
    scoreClosedPct(issueMetrics.closedWithin7DaysPct) * 0.3 +
    scoreStalePct(issueMetrics.stalePct) * 0.2,
    0, 25,
  );
  const prScore = clamp(
    scorePRLatency(prMetrics.medianReviewLatencyHours) * 0.5 +
    scoreMergeRate(prMetrics.mergeRate) * 0.3 +
    scoreStalePRs(prMetrics.stalePRCount, triageMetrics.openPRs) * 0.2,
    0, 25,
  );
  const unlabeledRatio = triageMetrics.openIssues > 0
    ? triageMetrics.unlabeledIssues / triageMetrics.openIssues : 0;
  const triageScore = clamp(
    (1 - unlabeledRatio) * 15 + Math.max(0, 10 - triageMetrics.hotspotLabels.length * 2),
    0, 25,
  );
  const newPct = contributorMetrics.totalContributors > 0
    ? contributorMetrics.newContributorsLast30Days / contributorMetrics.totalContributors : 0;
  const communityScore = clamp(
    Math.min(contributorMetrics.totalContributors / 10, 1) * 15 + newPct * 10 * 10,
    0, 25,
  );
  const total = Math.round(responseScore + prScore + triageScore + communityScore);
  return {
    score: total,
    grade: gradeFromScore(total),
    breakdown: {
      responseTime: Math.round(responseScore),
      prVelocity: Math.round(prScore),
      triageHealth: Math.round(triageScore),
      communityGrowth: Math.round(communityScore),
    },
  };
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function gradeFromScore(s: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (s >= 85) return 'A'; if (s >= 70) return 'B'; if (s >= 55) return 'C'; if (s >= 40) return 'D'; return 'F';
}
function scoreResponseTime(h: number) { return h <= 0 ? 25 : h >= 168 ? 0 : 25 * (1 - h / 168); }
function scoreClosedPct(p: number)    { return clamp((p / 80) * 25, 0, 25); }
function scoreStalePct(p: number)     { return clamp(25 * (1 - p / 50), 0, 25); }
function scorePRLatency(h: number)    { return h <= 0 ? 25 : h >= 336 ? 0 : 25 * (1 - h / 336); }
function scoreMergeRate(r: number)    { return clamp(r * 25, 0, 25); }
function scoreStalePRs(s: number, o: number) { return o === 0 ? 25 : clamp(25 * (1 - s / o), 0, 25); }
