interface BreakdownBarProps {
  breakdown: {
    responseTime: number;
    prVelocity: number;
    triageHealth: number;
    communityGrowth: number;
  };
}

const labels: Record<string, string> = {
  responseTime:    'Response Time',
  prVelocity:      'PR Velocity',
  triageHealth:    'Triage Health',
  communityGrowth: 'Community Growth',
};

export default function BreakdownBar({ breakdown }: BreakdownBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {(Object.entries(breakdown) as [string, number][]).map(([key, score]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-sm text-muted">{labels[key] ?? key}</span>
          <div
            className="flex-1 h-2 rounded-full bg-border overflow-hidden"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={25}
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${(score / 25) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right text-sm text-muted">{score}/25</span>
        </div>
      ))}
    </div>
  );
}
