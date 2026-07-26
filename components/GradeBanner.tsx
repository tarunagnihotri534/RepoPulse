import type { HealthScore } from '@/lib/types';

const gradeColor: Record<string, string> = {
  A: 'text-success border-success/30 bg-success/5',
  B: 'text-accent  border-accent/30  bg-accent/5',
  C: 'text-warning border-warning/30 bg-warning/5',
  D: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  F: 'text-danger  border-danger/30  bg-danger/5',
};

interface GradeBannerProps {
  health: HealthScore;
}

export default function GradeBanner({ health }: GradeBannerProps) {
  const colors = gradeColor[health.grade] ?? gradeColor['F'];
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-lg border px-6 py-5 mb-8 ${colors}`}>
      <span className="text-5xl font-extrabold leading-none">{health.score}</span>
      <span className="text-xl text-muted">/ 100</span>
      <span className={`ml-auto rounded-lg px-5 py-2 text-2xl font-bold border ${colors}`}>
        Grade {health.grade}
      </span>
    </div>
  );
}
