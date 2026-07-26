/**
 * POST /api/analyze
 *
 * Body: { owner: string; repo: string }
 *
 * Flow:
 *  1. Validate input (alphanumeric / hyphen / dot — GitHub naming rules)
 *  2. Check DB cache → if fresh (< 6 h) return cached result immediately
 *  3. Check global monthly cap → if exceeded return 429
 *  4. Run aggregator, increment counter, store result, return fresh result
 *
 * Response shape:
 *  200  { snapshot, cachedAt, fromCache }
 *  400  { error }
 *  429  { error, count, cap }
 *  500  { error }
 */
import { NextRequest, NextResponse } from 'next/server';
import { runAggregator } from '@/lib/aggregator';
import {
  getCached,
  setCache,
  isUnderCap,
  incrementMonthlyCount,
  getMonthlyCount,
  MONTHLY_CAP,
  snapshotToHistoryEntry,
} from '@/lib/db';

// GitHub owner/repo name: letters, digits, hyphens, dots, underscores; 1–100 chars
const VALID_SEGMENT = /^[a-zA-Z0-9._-]{1,100}$/;

function validateSegment(s: unknown, field: string): string | null {
  if (typeof s !== 'string' || !VALID_SEGMENT.test(s)) {
    return `"${field}" must be a valid GitHub name (1–100 alphanumeric/hyphen/dot/underscore chars)`;
  }
  return null;
}

export async function POST(req: NextRequest) {
  // ── 1. Parse & validate body ───────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const { owner, repo } = body as Record<string, unknown>;
  const ownerErr = validateSegment(owner, 'owner');
  if (ownerErr) return NextResponse.json({ error: ownerErr }, { status: 400 });
  const repoErr = validateSegment(repo, 'repo');
  if (repoErr) return NextResponse.json({ error: repoErr }, { status: 400 });

  const ownerStr = (owner as string).toLowerCase();
  const repoStr  = (repo  as string).toLowerCase();

  // ── 2. Check cache ─────────────────────────────────────────────────────────
  try {
    const cached = await getCached(ownerStr, repoStr);
    if (cached?.fresh) {
      return NextResponse.json({
        snapshot:  cached.snapshot,
        cachedAt:  cached.cachedAt.toISOString(),
        fromCache: true,
      });
    }

    // ── 3. Check global monthly cap ──────────────────────────────────────────
    const under = await isUnderCap();
    if (!under) {
      const count = await getMonthlyCount();
      return NextResponse.json(
        {
          error: `Monthly lookup limit of ${MONTHLY_CAP} reached. Cached results are still available for previously looked-up repos. Resets on the 1st of next month.`,
          count,
          cap: MONTHLY_CAP,
        },
        { status: 429 },
      );
    }

    // ── 4. Fetch fresh data ───────────────────────────────────────────────────
    // Pass the stale cached snapshot as history (for WoW deltas) if it exists
    const history = cached ? [snapshotToHistoryEntry(cached.snapshot)] : [];

    const snapshot = await runAggregator({
      owner: ownerStr,
      repo:  repoStr,
      history,
    });

    // Persist + increment counter (do both before returning)
    await Promise.all([
      setCache(ownerStr, repoStr, snapshot),
      incrementMonthlyCount(),
    ]);

    return NextResponse.json({
      snapshot,
      cachedAt:  new Date().toISOString(),
      fromCache: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Surface GitHub "not found" as 404 instead of 500
    if (message.includes('Could not resolve to a Repository')) {
      return NextResponse.json(
        { error: `Repository "${ownerStr}/${repoStr}" not found or is private.` },
        { status: 404 },
      );
    }

    console.error('[api/analyze]', message);
    return NextResponse.json({ error: 'Internal error — check server logs.' }, { status: 500 });
  }
}
