'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { DailySnapshot } from '@/lib/types';
import GradeBanner     from '@/components/GradeBanner';
import StatCard        from '@/components/StatCard';
import BreakdownBar    from '@/components/BreakdownBar';
import MetricsGrid     from '@/components/MetricsGrid';
import LabelTable      from '@/components/LabelTable';
import ContributorList from '@/components/ContributorList';
import PRTable         from '@/components/PRTable';

// Chart.js requires a browser environment — load client-side only
const TrendCharts = dynamic(() => import('@/components/TrendCharts'), { ssr: false });

type Tab = 'overview' | 'issues' | 'pulls' | 'contributors' | 'trends';

interface AnalyzeResponse {
  snapshot: DailySnapshot;
  cachedAt: string;
  fromCache: boolean;
  error?: string;
}

export default function DashboardPage() {
  const params  = useParams<{ owner: string; repo: string }>();
  const owner   = decodeURIComponent(params.owner);
  const repo    = decodeURIComponent(params.repo);

  const [snapshot,  setSnapshot]  = useState<DailySnapshot | null>(null);
  const [cachedAt,  setCachedAt]  = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<Tab>('overview');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res  = await fetch('/api/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ owner, repo }),
        });
        const data = await res.json() as AnalyzeResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? `HTTP ${res.status}`);
          return;
        }
        setSnapshot(data.snapshot);
        setCachedAt(data.cachedAt);
        setFromCache(data.fromCache);
      } catch {
        if (!cancelled) setError('Network error — please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [owner, repo]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-6 py-20">
        <div
          className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin"
          aria-label="Loading"
        />
        <p className="text-muted">
          Fetching data for <strong className="text-[#c9d1d9]">{owner}/{repo}</strong>…
        </p>
        <p className="text-xs text-muted">
          First lookups may take 10–20 seconds. Cached results return instantly.
        </p>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 max-w-lg mx-auto text-center">
        <p className="text-2xl font-bold text-danger">Something went wrong</p>
        <p className="text-muted">{error}</p>
        <Link
          href="/"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#0d1117] hover:bg-accent/90"
        >
          Back to search
        </Link>
      </div>
    );
  }

  if (!snapshot) return null;

  const {
    repoStats:          r,
    issueMetrics:       im,
    prMetrics:          pm,
    contributorMetrics: cm,
    triageMetrics:      tm,
    healthScore,
    deltaFromPrevious:  delta,
  } = snapshot;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',     label: 'Overview'      },
    { id: 'issues',       label: 'Issues'        },
    { id: 'pulls',        label: 'Pull Requests' },
    { id: 'contributors', label: 'Contributors'  },
    { id: 'trends',       label: 'Trends'        },
  ];

  // Seed a single-entry history array for the charts (more entries accumulate
  // as the same repo is looked up across different days)
  const historyEntry = {
    date:            snapshot.date,
    stars:           r.stargazerCount,
    forks:           r.forkCount,
    openIssues:      tm.openIssues,
    openPRs:         tm.openPRs,
    healthScore:     healthScore.score,
    newContributors: cm.newContributorsLast30Days,
  };

  return (
    <div className="flex flex-col gap-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted mb-1">
            <Link href="/" className="hover:text-accent">
              &larr; Search
            </Link>
          </div>
          <h1 className="text-2xl font-bold truncate">
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {owner}/{repo}
            </a>
          </h1>
          {r.description && (
            <p className="text-muted mt-1 text-sm">{r.description}</p>
          )}
        </div>
        <div className="text-xs text-muted text-right shrink-0">
          {fromCache ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Cached &middot; {cachedAt ? new Date(cachedAt).toLocaleTimeString() : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-2.5 py-1 text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Fresh fetch
            </span>
          )}
        </div>
      </div>

      {/* ── Grade banner ────────────────────────────────────────────────────── */}
      <GradeBanner health={healthScore} />

      {/* ── Top stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Stars"        value={r.stargazerCount.toLocaleString()} delta={delta?.stars} />
        <StatCard label="Forks"        value={r.forkCount.toLocaleString()} />
        <StatCard label="Open Issues"  value={tm.openIssues}  delta={delta?.openIssues} />
        <StatCard label="Open PRs"     value={tm.openPRs}     delta={delta?.openPRs} />
        <StatCard label="Contributors" value={cm.totalContributors} />
        <StatCard label="New (30d)"    value={cm.newContributorsLast30Days} />
      </div>

      {/* ── Tab nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="flex gap-1 border-b border-border"
        aria-label="Dashboard sections"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-[#c9d1d9]'
            }`}
            aria-current={tab === id ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Overview ────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">
              Health Score Breakdown
            </h2>
            <BreakdownBar breakdown={healthScore.breakdown} />
          </section>

          <section>
            <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">
              Key Metrics
            </h2>
            <MetricsGrid
              metrics={[
                { label: 'Median First Response', value: `${im.medianFirstResponseHours.toFixed(1)}h` },
                { label: 'Median Issue Close',    value: `${im.medianCloseTimeHours.toFixed(1)}h` },
                { label: 'Closed < 7 Days',       value: `${im.closedWithin7DaysPct.toFixed(0)}%` },
                { label: 'Stale Issues (>30d)',   value: `${im.stalePct.toFixed(0)}%` },
                { label: 'PR Review Latency',     value: `${pm.medianReviewLatencyHours.toFixed(1)}h` },
                { label: 'PR Merge Rate',         value: `${(pm.mergeRate * 100).toFixed(0)}%` },
              ]}
            />
          </section>

          {r.topics.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3 pb-2 border-b border-border">
                Topics
              </h2>
              <ul className="flex flex-wrap gap-2" role="list">
                {r.topics.map((t) => (
                  <li
                    key={t}
                    className="rounded-full bg-success/10 px-3 py-1 text-xs font-mono text-success"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ── Issues ──────────────────────────────────────────────────────────── */}
      {tab === 'issues' && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Open Issues"     value={tm.openIssues} />
            <StatCard label="Unlabeled"       value={tm.unlabeledIssues} />
            <StatCard label="Stale (>30d)"    value={`${im.stalePct.toFixed(0)}%`} />
            <StatCard label="Median Response" value={`${im.medianFirstResponseHours.toFixed(1)}h`} />
            <StatCard label="Median Close"    value={`${im.medianCloseTimeHours.toFixed(1)}h`} />
            <StatCard label="Closed < 7d"     value={`${im.closedWithin7DaysPct.toFixed(0)}%`} />
          </div>

          <section>
            <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">
              Top Labels (Open Issues)
            </h2>
            <LabelTable labels={tm.topLabels} totalOpen={tm.openIssues} />
          </section>

          {tm.hotspotLabels.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3 pb-2 border-b border-border">
                Hotspot Labels
              </h2>
              <p className="text-xs text-muted mb-3">
                Labels appearing on more than 10% of open issues.
              </p>
              <ul className="flex flex-wrap gap-2" role="list">
                {tm.hotspotLabels.map((l) => (
                  <li
                    key={l}
                    className="rounded-full bg-danger/10 px-3 py-1 text-xs font-mono text-danger"
                  >
                    {l}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ── Pull Requests ────────────────────────────────────────────────────── */}
      {tab === 'pulls' && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Open PRs"          value={tm.openPRs} />
            <StatCard label="Review Latency"    value={`${pm.medianReviewLatencyHours.toFixed(1)}h`} />
            <StatCard label="Merge Time"        value={`${pm.medianMergeTimeHours.toFixed(1)}h`} />
            <StatCard label="Merge Rate"        value={`${(pm.mergeRate * 100).toFixed(0)}%`} />
            <StatCard label="Avg Review Rounds" value={pm.avgReviewRounds.toFixed(1)} />
            <StatCard label="Stale PRs (>7d)"   value={pm.stalePRCount} />
          </div>

          <section>
            <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">
              Recent Pull Requests
            </h2>
            <PRTable prs={snapshot.pullRequests} owner={owner} repo={repo} />
          </section>
        </div>
      )}

      {/* ── Contributors ────────────────────────────────────────────────────── */}
      {tab === 'contributors' && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <StatCard label="Total Contributors" value={cm.totalContributors} />
            <StatCard label="New (Last 30d)"     value={cm.newContributorsLast30Days} />
          </div>

          <section>
            <h2 className="text-base font-semibold mb-4 pb-2 border-b border-border">
              Top 10 Contributors
            </h2>
            <ContributorList contributors={cm.topContributors} />
          </section>
        </div>
      )}

      {/* ── Trends ──────────────────────────────────────────────────────────── */}
      {tab === 'trends' && (
        <TrendCharts history={[historyEntry]} breakdown={healthScore.breakdown} />
      )}

      {/* ── Footer meta ─────────────────────────────────────────────────────── */}
      <div className="border-t border-border pt-4 text-xs text-muted flex flex-wrap gap-4 justify-between">
        <span>Generated: {new Date(snapshot.generatedAt).toLocaleString()}</span>
        <span>
          {r.licenseInfo && (
            <span className="mr-4">License: {r.licenseInfo.name}</span>
          )}
          {r.languages.slice(0, 3).map((l) => l.name).join(' · ')}
        </span>
      </div>
    </div>
  );
}
