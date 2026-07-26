/**
 * Database helpers — Prisma + SQLite.
 *
 * Tables:
 *   repo_cache  — per-repo cached DailySnapshot + timestamp
 *   usage       — global monthly lookup counter
 */
import { PrismaClient } from '@prisma/client';
import type { DailySnapshot, HistoryEntry } from './types';
import { currentMonth } from './utils';

// ─── Singleton Prisma client (safe for Next.js dev hot-reload) ────────────────

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Cache TTL in milliseconds (6 hours) */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Monthly global lookup cap */
export const MONTHLY_CAP = Number(process.env.MONTHLY_CAP ?? '50');

// ─── Cache helpers ─────────────────────────────────────────────────────────────

export interface CacheHit {
  snapshot: DailySnapshot;
  cachedAt: Date;
  fresh: boolean; // true = within TTL
}

/**
 * Look up a cached snapshot for owner/repo.
 * Returns null if no entry exists.
 */
export async function getCached(owner: string, repo: string): Promise<CacheHit | null> {
  const row = await prisma.repoCache.findUnique({
    where: { owner_repo: { owner: owner.toLowerCase(), repo: repo.toLowerCase() } },
  });
  if (!row) return null;

  const cachedAt = new Date(Number(row.cachedAt));
  const fresh = Date.now() - cachedAt.getTime() < CACHE_TTL_MS;
  const snapshot = JSON.parse(row.snapshotJson) as DailySnapshot;
  return { snapshot, cachedAt, fresh };
}

/**
 * Upsert a snapshot into the cache.
 */
export async function setCache(owner: string, repo: string, snapshot: DailySnapshot): Promise<void> {
  await prisma.repoCache.upsert({
    where: { owner_repo: { owner: owner.toLowerCase(), repo: repo.toLowerCase() } },
    create: {
      owner: owner.toLowerCase(),
      repo:  repo.toLowerCase(),
      snapshotJson: JSON.stringify(snapshot),
      cachedAt: BigInt(Date.now()),
    },
    update: {
      snapshotJson: JSON.stringify(snapshot),
      cachedAt: BigInt(Date.now()),
    },
  });
}

/**
 * Returns all cached repos as lightweight HistoryEntry arrays (for Slack digest).
 */
export async function getAllCachedSnapshots(): Promise<Array<{ owner: string; repo: string; snapshot: DailySnapshot }>> {
  const rows = await prisma.repoCache.findMany();
  return rows.map((r) => ({
    owner: r.owner,
    repo: r.repo,
    snapshot: JSON.parse(r.snapshotJson) as DailySnapshot,
  }));
}

// ─── History helpers ───────────────────────────────────────────────────────────
// History is derived from the cached snapshots keyed by repo.
// For WoW deltas we need a rolling array; we synthesise one from the single
// cached row (the previous snapshot) if it exists.

export function snapshotToHistoryEntry(snapshot: DailySnapshot): HistoryEntry {
  return {
    date:            snapshot.date,
    stars:           snapshot.repoStats.stargazerCount,
    forks:           snapshot.repoStats.forkCount,
    openIssues:      snapshot.triageMetrics.openIssues,
    openPRs:         snapshot.triageMetrics.openPRs,
    healthScore:     snapshot.healthScore.score,
    newContributors: snapshot.contributorMetrics.newContributorsLast30Days,
  };
}

// ─── Usage cap helpers ─────────────────────────────────────────────────────────

/**
 * Get the current month's global lookup count.
 */
export async function getMonthlyCount(): Promise<number> {
  const row = await prisma.usage.findUnique({ where: { month: currentMonth() } });
  return row?.count ?? 0;
}

/**
 * Atomically increment the global monthly counter by 1.
 * Returns the new count.
 */
export async function incrementMonthlyCount(): Promise<number> {
  const row = await prisma.usage.upsert({
    where: { month: currentMonth() },
    create: { month: currentMonth(), count: 1 },
    update: { count: { increment: 1 } },
  });
  return row.count;
}

/**
 * Returns true if a new (cache-miss) lookup is allowed.
 */
export async function isUnderCap(): Promise<boolean> {
  const count = await getMonthlyCount();
  return count < MONTHLY_CAP;
}
