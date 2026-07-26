'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface UsageData {
  month: string;
  count: number;
  cap: number;
  remaining: number;
  limitReached: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [owner, setOwner]     = useState('');
  const [repo,  setRepo]      = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage]     = useState<UsageData | null>(null);

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((d: UsageData) => setUsage(d))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const ownerTrim = owner.trim();
    const repoTrim  = repo.trim();
    if (!ownerTrim || !repoTrim) {
      setError('Please enter both an owner and a repository name.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ owner: ownerTrim, repo: repoTrim }),
      });
      if (res.status === 429) {
        const data = await res.json() as { error: string };
        setError(data.error);
        return;
      }
      if (res.status === 404) {
        setError(`Repository "${ownerTrim}/${repoTrim}" not found or is private.`);
        return;
      }
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      router.push(
        `/dashboard/${encodeURIComponent(ownerTrim)}/${encodeURIComponent(repoTrim)}`,
      );
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const usagePct = usage
    ? Math.min(100, Math.round((usage.count / usage.cap) * 100))
    : 0;
  const usageColor =
    usagePct >= 90 ? 'bg-danger' :
    usagePct >= 70 ? 'bg-warning' :
                     'bg-success';

  return (
    <div className="flex flex-col items-center gap-12 py-8">
      {/* Hero */}
      <section className="text-center max-w-2xl">
        <h1 className="text-4xl font-extrabold mb-4 tracking-tight">
          MCP Repository Health Tracker
        </h1>
        <p className="text-lg text-muted leading-relaxed">
          Enter any public GitHub repository to get an instant health dashboard —
          issue response times, PR review velocity, contributor growth, triage backlog,
          and a composite health score with grade.
        </p>
      </section>

      {/* Submission form */}
      <section className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner" className="text-sm font-medium">
              Owner / Organisation
            </label>
            <input
              id="owner"
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. modelcontextprotocol"
              autoComplete="off"
              spellCheck={false}
              className="rounded-lg border border-border bg-[#0d1117] px-4 py-2.5 text-sm
                         placeholder:text-muted focus:outline-none focus:ring-2
                         focus:ring-accent/60 transition"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="repo" className="text-sm font-medium">
              Repository name
            </label>
            <input
              id="repo"
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="e.g. servers"
              autoComplete="off"
              spellCheck={false}
              className="rounded-lg border border-border bg-[#0d1117] px-4 py-2.5 text-sm
                         placeholder:text-muted focus:outline-none focus:ring-2
                         focus:ring-accent/60 transition"
              required
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (usage?.limitReached ?? false)}
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-[#0d1117] transition
                       hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/60
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analysing...' : 'Analyse Repository'}
          </button>

          {usage?.limitReached && (
            <p className="text-center text-xs text-warning">
              Monthly limit of {usage.cap} lookups reached. Resets on the 1st of next month.
            </p>
          )}
        </form>
      </section>

      {/* Usage meter */}
      {usage && (
        <section className="w-full max-w-lg" aria-label="Monthly usage">
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>Global lookups this month</span>
            <span>{usage.count} / {usage.cap}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usageColor}`}
              style={{ width: `${usagePct}%` }}
              role="progressbar"
              aria-valuenow={usage.count}
              aria-valuemin={0}
              aria-valuemax={usage.cap}
            />
          </div>
          <p className="mt-1 text-xs text-muted text-right">
            {usage.remaining} lookup{usage.remaining !== 1 ? 's' : ''} remaining
          </p>
        </section>
      )}

      {/* Feature grid */}
      <section className="w-full max-w-3xl">
        <h2 className="sr-only">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ title, desc }) => (
            <div key={title} className="rounded-lg border border-border bg-surface p-5">
              <p className="font-semibold mb-1">{title}</p>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  { title: 'Health Score',  desc: '0-100 composite score across response time, PR velocity, triage health, and community growth — with a letter grade A through F.' },
  { title: 'Issue Metrics', desc: 'Median first-response and close times, closed-within-7-days %, stale issue %, and label breakdown.' },
  { title: 'PR Velocity',   desc: 'Median review latency and merge time, merge rate, average review rounds, and stale PR count.' },
  { title: 'Contributors',  desc: 'Total contributor count, new contributors in the last 30 days, and a top-10 leaderboard.' },
  { title: 'Trend Charts',  desc: 'Health score, stars/forks, open issues/PRs, and new contributors charted over time.' },
  { title: '6-hour Cache',  desc: 'Results are cached for 6 hours — repeated lookups of the same repo return instantly without counting against the cap.' },
];
