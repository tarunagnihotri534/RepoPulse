'use client';

/**
 * TrendCharts — all five dashboard charts ported from the original charts.js.
 * Uses react-chartjs-2 with the same colour palette and chart types.
 *
 * Chart.js tree-shaking: we register only the components we use.
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';
import type { HealthScore } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
);

// ─── Colour tokens (match Tailwind config + original CSS) ─────────────────────
const C = {
  accent:  '#58a6ff',
  success: '#3fb950',
  warning: '#d29922',
  danger:  '#f85149',
  purple:  '#bc8cff',
  muted:   '#8b949e',
  border:  '#30363d',
  text:    '#c9d1d9',
  tooltip: '#1c2128',
};

// ─── Shared chart defaults ────────────────────────────────────────────────────
const sharedScales = {
  x: {
    ticks: { color: C.muted, maxTicksLimit: 10, font: { size: 11 } },
    grid:  { color: C.border + '44' },
  },
  y: {
    ticks: { color: C.muted, font: { size: 11 } },
    grid:  { color: C.border + '44' },
  },
};

const sharedPlugins = {
  legend: { labels: { color: C.text, boxWidth: 12, font: { size: 12 } } },
  tooltip: {
    backgroundColor: C.tooltip,
    borderColor: C.border,
    borderWidth: 1,
    titleColor: C.text,
    bodyColor: C.muted,
  },
};

const baseLineOpts: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: true,
  interaction: { mode: 'index', intersect: false },
  plugins: sharedPlugins,
  scales: sharedScales,
};

const baseBarOpts: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: true,
  interaction: { mode: 'index', intersect: false },
  plugins: sharedPlugins,
  scales: sharedScales,
};

// ─── History entry shape (mirrors lib/types HistoryEntry) ─────────────────────
interface HistoryEntry {
  date: string;
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  healthScore: number;
  newContributors: number;
}

interface TrendChartsProps {
  history: HistoryEntry[];
  breakdown: HealthScore['breakdown'];
}

export default function TrendCharts({ history, breakdown }: TrendChartsProps) {
  const labels = history.map((h) => h.date);

  // ── 1. Health score over time ──────────────────────────────────────────────
  const healthData = {
    labels,
    datasets: [{
      label: 'Health Score',
      data: history.map((h) => h.healthScore),
      borderColor: C.success,
      backgroundColor: C.success + '22',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    }],
  };
  const healthOpts: ChartOptions<'line'> = {
    ...baseLineOpts,
    scales: {
      ...sharedScales,
      y: { ...sharedScales.y, min: 0, max: 100 },
    },
  };

  // ── 2. Stars & forks ───────────────────────────────────────────────────────
  const starsData = {
    labels,
    datasets: [
      {
        label: 'Stars',
        data: history.map((h) => h.stars),
        borderColor: C.warning,
        backgroundColor: C.warning + '22',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Forks',
        data: history.map((h) => h.forks),
        borderColor: C.accent,
        backgroundColor: C.accent + '22',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  // ── 3. Open issues & PRs ───────────────────────────────────────────────────
  const issuesData = {
    labels,
    datasets: [
      {
        label: 'Open Issues',
        data: history.map((h) => h.openIssues),
        borderColor: C.danger,
        backgroundColor: C.danger + '22',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Open PRs',
        data: history.map((h) => h.openPRs),
        borderColor: C.purple,
        backgroundColor: C.purple + '22',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  // ── 4. New contributors (bar) ──────────────────────────────────────────────
  const contribData = {
    labels,
    datasets: [{
      label: 'New Contributors (30d)',
      data: history.map((h) => h.newContributors),
      backgroundColor: C.success + 'aa',
      borderColor: C.success,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  // ── 5. Score breakdown (radar) ─────────────────────────────────────────────
  const bdLabels = Object.keys(breakdown).map((k) =>
    k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
  );
  const radarData = {
    labels: bdLabels,
    datasets: [{
      label: 'Score (out of 25)',
      data: Object.values(breakdown),
      borderColor: C.accent,
      backgroundColor: C.accent + '33',
      pointBackgroundColor: C.accent,
      pointRadius: 4,
    }],
  };
  const radarOpts: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: sharedPlugins,
    scales: {
      r: {
        min: 0,
        max: 25,
        ticks: { color: C.muted, backdropColor: 'transparent', font: { size: 11 } },
        grid:  { color: C.border },
        pointLabels: { color: C.text, font: { size: 12 } },
      },
    },
  };

  // If there's no history yet, only show the radar breakdown
  const hasHistory = history.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Score breakdown — always shown */}
      <section>
        <h3 className="text-base font-semibold mb-3 pb-2 border-b border-border">
          Score Breakdown
        </h3>
        <div className="chart-container rounded-lg border border-border bg-surface p-4">
          <Radar data={radarData} options={radarOpts} aria-label="Health score breakdown" />
        </div>
      </section>

      {hasHistory && (
        <>
          <section>
            <h3 className="text-base font-semibold mb-3 pb-2 border-b border-border">
              Health Score Over Time
            </h3>
            <div className="chart-container rounded-lg border border-border bg-surface p-4">
              <Line data={healthData} options={healthOpts} aria-label="Health score trend" />
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold mb-3 pb-2 border-b border-border">
              Stars &amp; Forks Over Time
            </h3>
            <div className="chart-container rounded-lg border border-border bg-surface p-4">
              <Line data={starsData} options={baseLineOpts} aria-label="Stars and forks trend" />
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold mb-3 pb-2 border-b border-border">
              Open Issues &amp; PRs Over Time
            </h3>
            <div className="chart-container rounded-lg border border-border bg-surface p-4">
              <Line data={issuesData} options={baseLineOpts} aria-label="Open issues and PRs trend" />
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold mb-3 pb-2 border-b border-border">
              New Contributors (30-day rolling)
            </h3>
            <div className="chart-container rounded-lg border border-border bg-surface p-4">
              <Bar data={contribData} options={baseBarOpts} aria-label="New contributors trend" />
            </div>
          </section>
        </>
      )}

      {!hasHistory && (
        <p className="text-sm text-muted italic">
          Trend charts will appear after multiple lookups build up history for this repo.
        </p>
      )}
    </div>
  );
}
