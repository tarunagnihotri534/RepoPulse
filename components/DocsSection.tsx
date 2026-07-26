'use client';

/**
 * DocsSection
 * ───────────
 * Daytona-style documentation: left rail (icon + title + prose) paired
 * with a right-side mini terminal showing real code from the project.
 *
 * Layout per entry:
 *   [icon  title]          [terminal window]
 *        description text
 *
 * On mobile the terminal drops below the text.
 * No box-card grid — pure flowing sections separated by a faint divider.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

// ─── Terminal mini-component ──────────────────────────────────────────────────

interface TerminalProps {
  filename: string;
  lines: Array<{ type: 'cmd' | 'comment' | 'key' | 'val' | 'dim' | 'ok' | 'plain'; text: string }>;
}

function Terminal({ filename, lines }: TerminalProps) {
  const colorMap: Record<string, string> = {
    cmd:     '#bc8cff',   // purple  — prompt / keyword
    comment: '#8b949e',   // muted   — // comments
    key:     '#58a6ff',   // accent  — function names / keys
    val:     '#3fb950',   // green   — values / strings
    ok:      '#3fb950',   // green   — success output
    dim:     '#6e7681',   // dimmer  — boilerplate
    plain:   '#c9d1d9',   // default text
  };

  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid #30363d',
      background: '#0d1117',
      overflow: 'hidden',
      fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: '0.72rem',
      lineHeight: 1.7,
      boxShadow: '0 8px 32px -12px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04) inset',
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.5rem 0.875rem',
        background: '#11161d',
        borderBottom: '1px solid #21262d',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
        </div>
        <span style={{ color: '#6e7681', fontSize: '0.65rem', letterSpacing: '0.04em' }}>{filename}</span>
        <span style={{ width: 42 }} />
      </div>
      {/* Code body */}
      <div style={{ padding: '0.75rem 1rem', overflowX: 'auto' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ color: colorMap[line.type] ?? colorMap.plain, whiteSpace: 'pre' }}>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section entry type ───────────────────────────────────────────────────────

interface DocEntry {
  icon: string;
  title: string;
  desc: string;
  terminal: TerminalProps;
}

// ─── All documentation entries — real code from the project ──────────────────

const ENTRIES: DocEntry[] = [
  // ── System Architecture ────────────────────────────────────────────────────
  {
    icon: '⚡',
    title: 'System Architecture',
    desc: `RepoPulse is a Next.js App Router application. The browser submits a POST to /api/analyze. The API route checks a SQLite cache first — if a fresh result exists (< 6 hours old) it returns immediately. On a cache miss it calls the GitHub GraphQL API, runs all metric calculations, writes the result to SQLite, increments the global usage counter, and returns the snapshot. The React dashboard renders the result client-side.`,
    terminal: {
      filename: 'app/api/analyze/route.ts',
      lines: [
        { type: 'comment', text: '// POST /api/analyze — core request flow' },
        { type: 'plain',   text: '' },
        { type: 'dim',     text: 'export async function POST(req: NextRequest) {' },
        { type: 'comment', text: '  // 1. validate owner/repo names' },
        { type: 'key',     text: '  const cached = await getCached(owner, repo);' },
        { type: 'comment', text: '  // 2. cache hit → return instantly (free)' },
        { type: 'val',     text: '  if (cached?.fresh) return cached.snapshot;' },
        { type: 'plain',   text: '' },
        { type: 'comment', text: '  // 3. enforce global 50/month cap' },
        { type: 'key',     text: '  const under = await isUnderCap();' },
        { type: 'val',     text: '  if (!under) return 429;' },
        { type: 'plain',   text: '' },
        { type: 'comment', text: '  // 4. fetch → compute → persist → return' },
        { type: 'key',     text: '  const snapshot = await runAggregator(opts);' },
        { type: 'key',     text: '  await setCache(owner, repo, snapshot);' },
        { type: 'key',     text: '  await incrementMonthlyCount();' },
        { type: 'dim',     text: '}' },
      ],
    },
  },

  // ── GitHub GraphQL Client ─────────────────────────────────────────────────
  {
    icon: '🐙',
    title: 'GitHub GraphQL Client',
    desc: `The aggregator fires four parallel GraphQL queries in one Promise.all — repo stats, issues (paginated, up to 500), pull requests (paginated, up to 500), and commit history for contributors. A MAX_PAGES = 5 guard keeps each run well under GitHub's 5,000 points/hour rate limit. A typical run costs ~100–300 points.`,
    terminal: {
      filename: 'lib/aggregator.ts',
      lines: [
        { type: 'comment', text: '// Four queries run in parallel — no sequential waterfall' },
        { type: 'plain',   text: '' },
        { type: 'key',     text: 'const [stats, issues, prs, contributors]' },
        { type: 'plain',   text: '  = await Promise.all([' },
        { type: 'val',     text: '    client.fetchRepoStats(owner, repo),' },
        { type: 'val',     text: '    client.fetchIssues(owner, repo),' },
        { type: 'val',     text: '    client.fetchPullRequests(owner, repo),' },
        { type: 'val',     text: '    client.fetchContributors(owner, repo),' },
        { type: 'plain',   text: '  ]);' },
        { type: 'plain',   text: '' },
        { type: 'comment', text: '// MAX_PAGES = 5 per resource keeps cost ~100-300 pts' },
        { type: 'comment', text: '// GitHub budget: 5,000 pts / hour' },
      ],
    },
  },

  // ── Issue Metrics ─────────────────────────────────────────────────────────
  {
    icon: '🐛',
    title: 'Issue Response Metrics',
    desc: `computeIssueMetrics walks every issue and measures: time to first timeline event (first response), time to close, whether it closed within 7 days, and whether it has gone stale (open with no update in 30+ days). All durations are computed in decimal hours using the hoursBetween utility. The median is computed over the full set — not a sample.`,
    terminal: {
      filename: 'lib/metrics/issues.ts',
      lines: [
        { type: 'key',     text: 'export function computeIssueMetrics(' },
        { type: 'plain',   text: '  issues: GitHubIssue[]' },
        { type: 'key',     text: '): ResponseTimeMetrics {' },
        { type: 'plain',   text: '' },
        { type: 'comment', text: '  // first timeline event = first response' },
        { type: 'val',     text: '  const h = hoursBetween(opened, firstEvent);' },
        { type: 'plain',   text: '  if (h >= 0) firstResponseTimes.push(h);' },
        { type: 'plain',   text: '' },
        { type: 'comment', text: '  // stale = open + no update in 30 days' },
        { type: 'val',     text: '  const days = (now - updatedAt) / 86_400_000;' },
        { type: 'plain',   text: '  if (days > 30) stale++;' },
        { type: 'plain',   text: '' },
        { type: 'key',     text: '  return {' },
        { type: 'val',     text: '    medianFirstResponseHours: median(times),' },
        { type: 'val',     text: '    closedWithin7DaysPct: ...' },
        { type: 'val',     text: '    stalePct: (stale / openIssues) * 100,' },
        { type: 'dim',     text: '  };' },
        { type: 'dim',     text: '}' },
      ],
    },
  },

  // ── Health Score ──────────────────────────────────────────────────────────
  {
    icon: '❤️',
    title: 'Composite Health Score',
    desc: `The health score is a 0–100 number built from four independent sub-scores (each out of 25): Response Time, PR Velocity, Triage Health, and Community Growth. Each dimension is scored on a linear decay curve — e.g. a median first-response under 4 hours scores full marks; over 168 hours (one week) scores zero. The final letter grade is A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, F otherwise.`,
    terminal: {
      filename: 'lib/metrics/health.ts',
      lines: [
        { type: 'comment', text: '// Each dimension = 0–25 pts, total = 0–100' },
        { type: 'plain',   text: '' },
        { type: 'key',     text: 'const responseScore  = scoreResponseTime(im) * 0.5' },
        { type: 'plain',   text: '  + scoreClosedPct(im) * 0.3' },
        { type: 'plain',   text: '  + scoreStalePct(im)  * 0.2;   // → /25' },
        { type: 'plain',   text: '' },
        { type: 'key',     text: 'const prScore        = scorePRLatency(pm) * 0.5' },
        { type: 'plain',   text: '  + scoreMergeRate(pm) * 0.3' },
        { type: 'plain',   text: '  + scoreStalePRs(pm)  * 0.2;   // → /25' },
        { type: 'plain',   text: '' },
        { type: 'comment', text: '// Grades: A≥85  B≥70  C≥55  D≥40  F<40' },
        { type: 'val',     text: 'return { score: Math.round(total), grade };' },
      ],
    },
  },

  // ── SQLite Cache ──────────────────────────────────────────────────────────
  {
    icon: '🗄️',
    title: 'SQLite Cache & Usage Cap',
    desc: `Results are stored in a SQLite database (via Prisma) in the repo_cache table — keyed by owner + repo, with the full DailySnapshot serialised as JSON and a Unix ms timestamp. A cache hit within 6 hours returns instantly and never touches GitHub or the usage counter. The usage table tracks a single row per YYYY-MM key, atomically incremented via Prisma upsert on every cache-miss lookup.`,
    terminal: {
      filename: 'lib/db.ts',
      lines: [
        { type: 'comment', text: '// repo_cache — one row per unique owner/repo' },
        { type: 'key',     text: 'await prisma.repoCache.upsert({' },
        { type: 'plain',   text: '  where:  { owner_repo: { owner, repo } },' },
        { type: 'val',     text: '  create: { owner, repo, snapshotJson,' },
        { type: 'val',     text: '            cachedAt: BigInt(Date.now()) },' },
        { type: 'val',     text: '  update: { snapshotJson,' },
        { type: 'val',     text: '            cachedAt: BigInt(Date.now()) },' },
        { type: 'dim',     text: '});' },
        { type: 'plain',   text: '' },
        { type: 'comment', text: '// usage — atomic increment per calendar month' },
        { type: 'key',     text: 'await prisma.usage.upsert({' },
        { type: 'plain',   text: '  where:  { month: "2025-07" },' },
        { type: 'val',     text: '  update: { count: { increment: 1 } },' },
        { type: 'val',     text: '  create: { month: "2025-07", count: 1 },' },
        { type: 'dim',     text: '});' },
      ],
    },
  },

  // ── Setup ─────────────────────────────────────────────────────────────────
  {
    icon: '🚀',
    title: 'Running RepoPulse locally',
    desc: `Clone the repo, install dependencies, copy the env template and fill in your GitHub fine-grained PAT (Public Repositories, read-only). Run prisma db push to create tracker.db, then npm run dev. The app starts on localhost:3000 — enter any public repo owner and name to get an instant health report.`,
    terminal: {
      filename: 'terminal',
      lines: [
        { type: 'cmd',   text: '$ git clone github.com/tarunagnihotri534/RepoPulse' },
        { type: 'cmd',   text: '$ cd RepoPulse && npm install' },
        { type: 'plain', text: '' },
        { type: 'cmd',   text: '$ cp .env.example .env.local' },
        { type: 'comment',text: '# fill in your token:' },
        { type: 'val',   text: 'GITHUB_TOKEN=ghp_your_token_here' },
        { type: 'val',   text: 'DATABASE_URL=file:./tracker.db' },
        { type: 'plain', text: '' },
        { type: 'cmd',   text: '$ npx prisma db push' },
        { type: 'ok',    text: '✓  SQLite database created at tracker.db' },
        { type: 'cmd',   text: '$ npm run dev' },
        { type: 'ok',    text: '✓  Ready at http://localhost:3000' },
      ],
    },
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function DocsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) return;

    const rows = gsap.utils.toArray<HTMLElement>('[data-doc-row]', root);
    rows.forEach((row) => {
      const left     = row.querySelector('[data-doc-left]')     as HTMLElement | null;
      const terminal = row.querySelector('[data-doc-terminal]') as HTMLElement | null;

      gsap.set(left,     { opacity: 0, x: -18 });
      gsap.set(terminal, { opacity: 0, x:  18 });

      ScrollTrigger.create({
        trigger: row,
        start:   'top 82%',
        once:    true,
        onEnter: () => {
          gsap.to(left,     { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' });
          gsap.to(terminal, { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out', delay: 0.08 });
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if ((st.vars.trigger as HTMLElement)?.closest?.('[data-docs-section]')) {
          st.kill();
        }
      });
    };
  }, []);

  return (
    <section
      id="docs"
      ref={sectionRef}
      data-docs-section
      className="w-full max-w-5xl"
      aria-label="Documentation"
    >
      {/* Heading */}
      <div className="mb-12 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-purple font-semibold mb-2">
          Documentation
        </p>
        <h2 className="text-2xl md:text-3xl tracking-tight text-[#eceef1] mb-3">
          How RepoPulse works
        </h2>
        <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed"
           style={{ fontFamily: 'var(--font-lato)' }}>
          Everything from the request flow to the metric calculations —
          annotated with the real code running in production.
        </p>
      </div>

      {/* Entries */}
      <div className="flex flex-col">
        {ENTRIES.map((entry, i) => (
          <div key={entry.title}>
            {/* Divider between entries */}
            {i > 0 && (
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, transparent, #30363d 30%, #30363d 70%, transparent)',
                margin: '3rem 0',
              }} />
            )}

            {/* Row */}
            <div
              data-doc-row
              className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start"
            >
              {/* Left — title + description */}
              <div data-doc-left className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      fontSize: '1.3rem',
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid #30363d',
                      background: 'rgba(188,140,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {entry.icon}
                  </span>
                  <h3 style={{
                    fontFamily: 'var(--font-boogaloo)',
                    fontSize: '1.15rem',
                    color: '#eceef1',
                    margin: 0,
                    letterSpacing: '0.01em',
                  }}>
                    {entry.title}
                  </h3>
                </div>

                <p style={{
                  fontSize: '0.875rem',
                  color: '#8b949e',
                  lineHeight: 1.75,
                  margin: 0,
                  paddingLeft: '0.25rem',
                  fontFamily: 'var(--font-lato)',
                }}>
                  {entry.desc}
                </p>
              </div>

              {/* Right — terminal */}
              <div data-doc-terminal>
                <Terminal {...entry.terminal} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
