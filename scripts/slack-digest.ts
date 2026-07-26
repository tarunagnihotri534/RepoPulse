#!/usr/bin/env node
/**
 * slack-digest.ts — Weekly Slack digest for MCP Repo Health Tracker
 *
 * Reads the most recently cached snapshot from the SQLite database and
 * posts a Block Kit summary to a Slack incoming webhook.
 *
 * USAGE
 *   # Preview (no webhook needed)
 *   npx ts-node --esm scripts/slack-digest.ts --dry-run
 *
 *   # Post to Slack
 *   DATABASE_URL=file:./tracker.db \
 *   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... \
 *     npx ts-node --esm scripts/slack-digest.ts
 *
 * No external HTTP dependencies — uses Node built-ins for the POST.
 * Prisma Client is used to read from the DB.
 */

import https from 'https';
import { URL } from 'url';

// Minimal inline Prisma read so this script stays standalone-runnable
// without importing from the Next.js app tree.
async function loadPrisma() {
  // Dynamic import so the script can still run if Prisma hasn't been generated
  try {
    const { PrismaClient } = await import('@prisma/client');
    return new PrismaClient();
  } catch {
    console.error('[slack-digest] @prisma/client not found. Run: npx prisma generate');
    process.exit(1);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  date: string;
  stars: number;
  openIssues: number;
  openPRs: number;
  healthScore: number;
  newContributors: number;
}

interface Snapshot {
  date: string;
  repo: { owner: string; repo: string };
  repoStats: { stargazerCount: number; forkCount: number };
  issueMetrics: { medianFirstResponseHours: number; medianCloseTimeHours: number; stalePct: number };
  prMetrics: { medianReviewLatencyHours: number; mergeRate: number; stalePRCount: number };
  triageMetrics: { openIssues: number; openPRs: number; unlabeledIssues: number };
  contributorMetrics: { totalContributors: number; newContributorsLast30Days: number };
  healthScore: { score: number; grade: string };
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, d = 1) { return n.toFixed(d); }
function gradeEmoji(g: string) {
  return ({ A: '🟢', B: '🔵', C: '🟡', D: '🟠', F: '🔴' }[g] ?? '⚪');
}
function sign(n: number) { return n > 0 ? `+${n}` : `${n}`; }

function buildMessage(snap: Snapshot, prev?: HistoryEntry): object {
  const repoUrl = `https://github.com/${snap.repo.owner}/${snap.repo.repo}`;
  const grade   = snap.healthScore.grade;

  const header =
    `${gradeEmoji(grade)} *MCP Repo Health — Weekly Digest*\n` +
    `<${repoUrl}|${snap.repo.owner}/${snap.repo.repo}> · Score: *${snap.healthScore.score}/100* (Grade ${grade})`;

  const statsLines = [
    prev
      ? `• *Stars:* ${snap.repoStats.stargazerCount}  ${sign(snap.repoStats.stargazerCount - prev.stars)} WoW`
      : `• *Stars:* ${snap.repoStats.stargazerCount}`,
    prev
      ? `• *Open Issues:* ${snap.triageMetrics.openIssues}  ${sign(snap.triageMetrics.openIssues - prev.openIssues)} WoW`
      : `• *Open Issues:* ${snap.triageMetrics.openIssues}`,
    prev
      ? `• *Open PRs:* ${snap.triageMetrics.openPRs}  ${sign(snap.triageMetrics.openPRs - prev.openPRs)} WoW`
      : `• *Open PRs:* ${snap.triageMetrics.openPRs}`,
    `• *New Contributors (30d):* ${snap.contributorMetrics.newContributorsLast30Days}`,
  ].join('\n');

  const latencyLines = [
    `• *Median First Response:* ${fmt(snap.issueMetrics.medianFirstResponseHours)}h`,
    `• *Median Issue Close:* ${fmt(snap.issueMetrics.medianCloseTimeHours)}h`,
    `• *Stale Issues (>30d):* ${fmt(snap.issueMetrics.stalePct, 0)}%`,
    `• *PR Review Latency:* ${fmt(snap.prMetrics.medianReviewLatencyHours)}h`,
    `• *PR Merge Rate:* ${fmt(snap.prMetrics.mergeRate * 100, 0)}%`,
    `• *Stale PRs (>7d):* ${snap.prMetrics.stalePRCount}`,
    `• *Unlabeled Issues:* ${snap.triageMetrics.unlabeledIssues}`,
  ].join('\n');

  return {
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: header } },
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: `*Week-over-Week*\n${statsLines}` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Response & Review Latency*\n${latencyLines}` } },
      { type: 'divider' },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `Generated ${snap.generatedAt} · <${repoUrl}|View on GitHub>`,
        }],
      },
    ],
  };
}

function postToSlack(webhookUrl: string, payload: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url  = new URL(webhookUrl);
    const req  = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c: Buffer) => { data += c; });
        res.on('end', () => {
          res.statusCode === 200
            ? resolve()
            : reject(new Error(`Slack HTTP ${res.statusCode}: ${data}`));
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = await loadPrisma();

  // Load all cached repos from the DB
  const rows = await prisma.repoCache.findMany();
  await prisma.$disconnect();

  if (rows.length === 0) {
    console.log('[slack-digest] No cached repos in the database yet. Run a lookup first.');
    return;
  }

  for (const row of rows) {
    const snap = JSON.parse(row.snapshotJson) as Snapshot;
    const message = buildMessage(snap);

    if (dryRun) {
      console.log(`\n[slack-digest] DRY RUN — ${row.owner}/${row.repo}:`);
      console.log(JSON.stringify(message, null, 2));
      continue;
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('[slack-digest] SLACK_WEBHOOK_URL is not set. Run with --dry-run to preview.');
      process.exit(1);
    }
    await postToSlack(webhookUrl, message);
    console.log(`[slack-digest] Posted digest for ${row.owner}/${row.repo}`);
  }
}

main().catch((err) => {
  console.error('[slack-digest]', err instanceof Error ? err.message : err);
  process.exit(1);
});
