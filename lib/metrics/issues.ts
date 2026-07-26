import type { GitHubIssue, ResponseTimeMetrics, TriageMetrics } from '../types';
import { hoursBetween, median, now } from '../utils';

export function computeIssueMetrics(issues: GitHubIssue[]): ResponseTimeMetrics {
  const closeTimes: number[] = [];
  const firstResponseTimes: number[] = [];
  let closedWithin7 = 0;
  let stale = 0;
  let closedTotal = 0;
  const nowTs = now();

  for (const issue of issues) {
    const opened = new Date(issue.createdAt);
    const firstEvent = issue.timelineItems?.nodes?.[0];
    if (firstEvent?.createdAt) {
      const h = hoursBetween(opened, new Date(firstEvent.createdAt));
      if (h >= 0) firstResponseTimes.push(h);
    }
    if (issue.state === 'CLOSED' && issue.closedAt) {
      const h = hoursBetween(opened, new Date(issue.closedAt));
      closeTimes.push(h);
      closedTotal++;
      if (h <= 7 * 24) closedWithin7++;
    }
    if (issue.state === 'OPEN') {
      const daysSince = (nowTs - new Date(issue.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) stale++;
    }
  }

  const openIssues = issues.filter((i) => i.state === 'OPEN').length;
  return {
    medianFirstResponseHours: median(firstResponseTimes),
    medianCloseTimeHours: median(closeTimes),
    closedWithin7DaysPct: closedTotal > 0 ? (closedWithin7 / closedTotal) * 100 : 0,
    stalePct: openIssues > 0 ? (stale / openIssues) * 100 : 0,
  };
}

export function computeTriageMetrics(issues: GitHubIssue[]): TriageMetrics {
  const openIssues = issues.filter((i) => i.state === 'OPEN');
  const labelCounts = new Map<string, { count: number; color: string }>();
  for (const issue of openIssues) {
    for (const label of issue.labels) {
      const existing = labelCounts.get(label.name);
      if (!existing) labelCounts.set(label.name, { count: 1, color: label.color });
      else existing.count++;
    }
  }
  const unlabeledIssues = openIssues.filter((i) => i.labels.length === 0).length;
  const topLabels = Array.from(labelCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, { count, color }]) => ({ name, count, color }));
  const threshold = openIssues.length * 0.1;
  const hotspotLabels = topLabels.filter((l) => l.count > threshold).map((l) => l.name);
  return { openIssues: openIssues.length, openPRs: 0, unlabeledIssues, topLabels, hotspotLabels };
}
