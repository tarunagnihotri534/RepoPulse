/**
 * GET /api/usage
 *
 * Returns the global monthly usage counter so the frontend can show
 * the cap meter without making a full analyze request.
 *
 * Response:
 *  200  { month, count, cap, remaining, limitReached }
 */
import { NextResponse } from 'next/server';
import { getMonthlyCount, MONTHLY_CAP } from '@/lib/db';
import { currentMonth } from '@/lib/utils';

export async function GET() {
  try {
    const count = await getMonthlyCount();
    const remaining = Math.max(0, MONTHLY_CAP - count);
    return NextResponse.json({
      month:        currentMonth(),
      count,
      cap:          MONTHLY_CAP,
      remaining,
      limitReached: count >= MONTHLY_CAP,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/usage]', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
