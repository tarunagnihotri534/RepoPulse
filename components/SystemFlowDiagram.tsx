'use client';

/**
 * SystemFlowDiagram — Scroll-pinned pipeline walkthrough
 * ───────────────────────────────────────────────────────
 * The section pins itself while the user scrolls.
 * Each scroll step advances exactly one pipeline node:
 *   • Node card slides + fades in from below (CSS 3D translateZ depth)
 *   • SVG connector path draws itself with strokeDashoffset
 *   • A glowing particle travels along the connector to the next node
 *   • Left panel updates with the step description
 *
 * Scroll speed = 9 steps × 120vh scroll distance = ~1080vh total height.
 * The sticky wrapper gives the user full control — scroll slowly = slow anim.
 *
 * GSAP ScrollTrigger scrub:1 ties timeline progress directly to scroll.
 * No autoplay, no timeouts. Pure scroll → animation mapping.
 */

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ─── Pipeline steps ───────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'browser',
    label: 'User Browser',
    sub: 'POST /api/analyze',
    icon: '🖥️',
    color: '#58a6ff',
    detail: 'The visitor types an owner/repo into the React form and hits Analyse. The form validates the input client-side then fires a POST request to the Next.js API route.',
    code: 'fetch("/api/analyze", {\n  method: "POST",\n  body: JSON.stringify({ owner, repo })\n})',
  },
  {
    id: 'api',
    label: 'Next.js API Route',
    sub: 'Validates · checks cache',
    icon: '⚡',
    color: '#bc8cff',
    detail: 'The API route validates owner/repo names against GitHub naming rules, then checks the SQLite cache for a fresh result before doing anything expensive.',
    code: '// app/api/analyze/route.ts\nconst cached = await getCached(owner, repo);\nif (cached?.fresh) return cached.snapshot;',
  },
  {
    id: 'cap',
    label: 'Usage Cap Check',
    sub: '50 lookups / month global',
    icon: '🔒',
    color: '#f0883e',
    detail: 'Before hitting the GitHub API, the server checks the global monthly counter. If 50 live lookups have already been made this month, it returns 429. Cache hits bypass this check entirely.',
    code: 'const count = await getMonthlyCount();\nif (count >= MONTHLY_CAP) {\n  return 429; // limit reached\n}',
  },
  {
    id: 'github',
    label: 'GitHub GraphQL API',
    sub: 'Issues · PRs · Contributors',
    icon: '🐙',
    color: '#3fb950',
    detail: 'Four parallel GraphQL queries fetch repo stats, issues (paginated up to 500), pull requests (paginated up to 500), and commit history for contributors — all in one Promise.all.',
    code: 'const [stats, issues, prs, contribs]\n  = await Promise.all([\n    client.fetchRepoStats(owner, repo),\n    client.fetchIssues(owner, repo),\n    client.fetchPullRequests(owner, repo),\n    client.fetchContributors(owner, repo),\n  ]);',
  },
  {
    id: 'metrics',
    label: 'Metrics Engine',
    sub: 'Pure functions · zero side effects',
    icon: '🔬',
    color: '#58a6ff',
    detail: 'Five stateless compute functions run on the raw GitHub data: issue response times, PR review latency, contributor growth, triage health, and the composite 0–100 health score with letter grade.',
    code: 'const issueMetrics  = computeIssueMetrics(issues);\nconst prMetrics     = computePRMetrics(prs);\nconst contribMetrics= computeContributorMetrics(c);\nconst health        = computeHealthScore(...);',
  },
  {
    id: 'write',
    label: 'Cache Write',
    sub: 'SQLite · 6-hour TTL',
    icon: '💾',
    color: '#d29922',
    detail: 'The full DailySnapshot (including raw issue/PR/contributor lists) is serialised to JSON and upserted into SQLite via Prisma. The cachedAt timestamp is stored as a Unix ms BigInt.',
    code: 'await prisma.repoCache.upsert({\n  where: { owner_repo: { owner, repo } },\n  update: { snapshotJson, cachedAt },\n  create: { owner, repo, snapshotJson, cachedAt },\n});',
  },
  {
    id: 'counter',
    label: 'Counter Increment',
    sub: 'usage table · YYYY-MM key',
    icon: '📊',
    color: '#f85149',
    detail: 'The global monthly counter is atomically incremented via a Prisma upsert. The key is the current YYYY-MM string. This runs in parallel with the cache write.',
    code: 'await prisma.usage.upsert({\n  where: { month: currentMonth() },\n  update: { count: { increment: 1 } },\n  create: { month, count: 1 },\n});',
  },
  {
    id: 'response',
    label: 'API Response',
    sub: '{ snapshot, cachedAt, fromCache }',
    icon: '📦',
    color: '#bc8cff',
    detail: 'The API returns a JSON payload containing the full snapshot, the cache timestamp, and a fromCache boolean. The dashboard uses fromCache to show "Fresh fetch" vs "Cached" indicator.',
    code: 'return NextResponse.json({\n  snapshot,\n  cachedAt: new Date().toISOString(),\n  fromCache: false,\n});',
  },
  {
    id: 'dashboard',
    label: 'Dashboard Renders',
    sub: 'React · Tailwind · Chart.js',
    icon: '📈',
    color: '#3fb950',
    detail: 'The client receives the snapshot and renders the tabbed dashboard: Overview, Issues, PRs, Contributors, and Trends with react-chartjs-2 charts. All rendering happens in the browser.',
    code: 'setSnapshot(data.snapshot);\n// Tabs: Overview · Issues · PRs\n//       Contributors · Trends\n// Charts: health, stars, issues, radar',
  },
] as const;

type StepId = typeof STEPS[number]['id'];

// Each step has one outgoing connector (except last)
// [fromIndex, toIndex, label, isCachePath]
const CONNECTORS: [number, number, string, boolean][] = [
  [0, 1, 'POST request',       false],
  [1, 2, 'cache miss →',       false],
  [2, 3, 'under cap →',        false],
  [3, 4, 'raw data',           false],
  [4, 5, 'snapshot',           false],
  [5, 6, 'parallel write',     false],
  [6, 7, 'returns',            false],
  [7, 8, 'JSON response',      false],
];

// Pixel positions for each node in the right-panel canvas (640×520)
// Laid out as a flowing S-curve pipeline
const NODE_POS: [number, number][] = [
  [100, 50],   // 0 browser
  [400, 50],   // 1 api
  [400, 150],  // 2 cap
  [400, 260],  // 3 github
  [400, 370],  // 4 metrics
  [250, 450],  // 5 write
  [100, 370],  // 6 counter
  [100, 260],  // 7 response
  [250, 160],  // 8 dashboard
];

// ─── Utility: cubic bezier path between two points ────────────────────────────
function cubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = Math.abs(x2 - x1) * 0.5;
  const dy = Math.abs(y2 - y1) * 0.5;
  const curve = Math.max(dx, dy, 30);
  // Use a smooth cubic bezier
  return `M ${x1} ${y1} C ${x1} ${y1 + curve * 0.6}, ${x2} ${y2 - curve * 0.6}, ${x2} ${y2}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SystemFlowDiagram() {
  const wrapperRef  = useRef<HTMLDivElement>(null);  // scroll height container
  const stickyRef   = useRef<HTMLDivElement>(null);  // pinned viewport
  const svgRef      = useRef<SVGSVGElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [activeConnector, setActiveConnector] = useState(-1);
  const stepsRevealedRef = useRef<boolean[]>(Array(STEPS.length).fill(false));

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const sticky  = stickyRef.current;
    const svg     = svgRef.current;
    if (!wrapper || !sticky || !svg) return;

    // Each step gets 100vh of scroll room, plus 60vh padding at end
    const scrollHeight = STEPS.length * 100 + 60;
    wrapper.style.height = `${scrollHeight}vh`;

    // ── Initialise all node elements ────────────────────────────────────────
    const nodeEls = Array.from(
      svg.querySelectorAll<SVGGElement>('[data-node-idx]'),
    );
    const pathEls = Array.from(
      svg.querySelectorAll<SVGPathElement>('[data-connector-idx]'),
    );
    const particleEls = Array.from(
      svg.querySelectorAll<SVGCircleElement>('[data-particle-idx]'),
    );
    const labelEls = Array.from(
      svg.querySelectorAll<SVGTextElement>('[data-label-idx]'),
    );

    // Reset all to invisible
    nodeEls.forEach((n) => {
      gsap.set(n, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' });
    });
    pathEls.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 100;
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
    });
    particleEls.forEach((c) => gsap.set(c, { opacity: 0 }));
    labelEls.forEach((l) => gsap.set(l, { opacity: 0 }));

    // ── Main scroll-scrubbed timeline ───────────────────────────────────────
    // One "beat" per step. Each beat = reveal node + draw its incoming connector.
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    const beatDur = 1 / STEPS.length; // fraction of total timeline per step

    STEPS.forEach((_, i) => {
      const pos = `${i * beatDur}`;

      // 1. Reveal node
      const nodeEl = nodeEls[i];
      if (nodeEl) {
        tl.to(nodeEl, {
          opacity: 1,
          scale: 1,
          duration: beatDur * 0.5,
          ease: 'back.out(1.5)',
          onStart: () => setActiveStep(i),
        }, pos);
      }

      // 2. Draw connector from previous node
      if (i > 0) {
        const pathEl = pathEls[i - 1];
        const particleEl = particleEls[i - 1];
        const labelEl = labelEls[i - 1];

        if (pathEl) {
          const len = pathEl.getTotalLength ? pathEl.getTotalLength() : 100;
          gsap.set(pathEl, { strokeDasharray: len, strokeDashoffset: len });

          tl.to(pathEl, {
            strokeDashoffset: 0,
            opacity: 1,
            duration: beatDur * 0.6,
            ease: 'power2.inOut',
            onStart: () => setActiveConnector(i - 1),
          }, `${i * beatDur - beatDur * 0.15}`);
        }

        if (particleEl) {
          // Particle travels along the path
          const path = pathEls[i - 1];
          tl.fromTo(particleEl,
            { opacity: 0, attr: { cx: NODE_POS[i - 1][0], cy: NODE_POS[i - 1][1] } },
            {
              opacity: 1,
              motionPath: path ? { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: false } : {},
              duration: beatDur * 0.55,
              ease: 'power1.inOut',
              onComplete: () => { gsap.to(particleEl, { opacity: 0, duration: 0.2 }); },
            } as gsap.TweenVars,
            `${i * beatDur - beatDur * 0.1}`,
          );
        }

        if (labelEl) {
          tl.to(labelEl, {
            opacity: 0.7,
            duration: beatDur * 0.3,
          }, `${i * beatDur}`);
        }
      }
    });

    // ── Bind timeline to scroll ─────────────────────────────────────────────
    const st = ScrollTrigger.create({
      trigger: wrapper,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   1.2,           // 1.2s lag = very smooth, responsive to scroll speed
      pin:     sticky,
      pinSpacing: false,
      animation: tl,
      onUpdate: (self) => {
        // Update which step is active based on scroll progress
        const idx = Math.min(
          STEPS.length - 1,
          Math.floor(self.progress * STEPS.length),
        );
        setActiveStep(idx);
        stepsRevealedRef.current[idx] = true;
      },
    });

    return () => {
      tl.kill();
      st.kill();
    };
  }, []);

  const step = STEPS[activeStep];

  return (
    // Outer wrapper — tall so scroll has room
    <div ref={wrapperRef} className="w-full relative" id="system-flow">

      {/* Sticky viewport — pins while wrapper scrolls past */}
      <div
        ref={stickyRef}
        style={{ height: '100vh', top: 0 }}
        className="sticky w-full flex flex-col"
      >
        {/* Header */}
        <div className="text-center pt-8 pb-4 shrink-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-purple font-semibold mb-1">
            System Architecture
          </p>
          <h2 className="text-lg md:text-xl font-semibold tracking-tight text-[#eceef1]">
            How RepoPulse processes a request
          </h2>
          <p className="text-xs text-muted mt-1">Scroll slowly to walk through the pipeline ↓</p>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 min-h-0 gap-0 md:gap-4 px-4 md:px-8 pb-6 max-w-6xl mx-auto w-full">

          {/* LEFT — Step explanation */}
          <div className="w-full md:w-[340px] shrink-0 flex flex-col justify-center gap-4">

            {/* Step counter */}
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full border"
                style={{ color: step.color, borderColor: step.color + '44', background: step.color + '11' }}
              >
                STEP {activeStep + 1} / {STEPS.length}
              </span>
              {activeStep === STEPS.length - 1 && (
                <span className="text-xs text-success font-semibold animate-pulse">Complete ✓</span>
              )}
            </div>

            {/* Step title */}
            <div
              key={step.id}
              style={{
                borderLeft: `3px solid ${step.color}`,
                paddingLeft: '1rem',
                transition: 'all 0.4s ease',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: '1.5rem' }} aria-hidden="true">{step.icon}</span>
                <h3 className="text-base font-semibold text-[#eceef1]">{step.label}</h3>
              </div>
              <p className="text-xs text-muted mb-1 font-mono">{step.sub}</p>
              <p className="text-sm text-[#a0aab4] leading-relaxed">{step.detail}</p>
            </div>

            {/* Code snippet */}
            <div
              className="rounded-lg overflow-hidden border border-border"
              style={{ background: '#0d1117' }}
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f85149]/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#d29922]/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#3fb950]/70" />
                <span className="ml-2 text-[10px] text-muted font-mono">RepoPulse</span>
              </div>
              <pre
                className="text-[11px] font-mono leading-relaxed overflow-x-auto p-3"
                style={{ color: step.color, margin: 0 }}
              >
                <code>{step.code}</code>
              </pre>
            </div>

            {/* Step dots progress */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    width: i === activeStep ? 20 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: i <= activeStep ? s.color : '#30363d',
                    transition: 'all 0.35s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* RIGHT — SVG pipeline diagram */}
          <div className="flex-1 min-w-0 flex items-center justify-center relative">
            <svg
              ref={svgRef}
              viewBox="0 0 500 500"
              className="w-full h-full"
              style={{ maxHeight: '72vh', overflow: 'visible' }}
              aria-label="Pipeline flow diagram"
            >
              <defs>
                {STEPS.map((s) => (
                  <radialGradient key={s.id} id={`glow-${s.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor={s.color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </radialGradient>
                ))}
                <filter id="node-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="line-glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* ── Connector paths ─────────────────────────────────────── */}
              {CONNECTORS.map(([from, to, label], ci) => {
                const [x1, y1] = NODE_POS[from];
                const [x2, y2] = NODE_POS[to];
                const color = STEPS[from].color;
                const d = cubicPath(x1, y1, x2, y2);
                return (
                  <g key={ci}>
                    {/* Glow duplicate */}
                    <path
                      d={d}
                      stroke={color}
                      strokeWidth="4"
                      fill="none"
                      opacity="0.15"
                      filter="url(#line-glow)"
                    />
                    {/* Main path — animated by GSAP */}
                    <path
                      data-connector-idx={ci}
                      d={d}
                      stroke={color}
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="100"
                      strokeDashoffset="100"
                      opacity="0"
                    />
                    {/* Connector label */}
                    <text
                      data-label-idx={ci}
                      x={(x1 + x2) / 2 + 6}
                      y={(y1 + y2) / 2 - 5}
                      fontSize="7.5"
                      fill={color}
                      opacity="0"
                      fontFamily="monospace"
                      letterSpacing="0.04em"
                    >
                      {label}
                    </text>
                    {/* Particle */}
                    <circle
                      data-particle-idx={ci}
                      r="4"
                      fill={color}
                      opacity="0"
                      filter="url(#node-glow)"
                    />
                  </g>
                );
              })}

              {/* ── Node circles ────────────────────────────────────────── */}
              {STEPS.map((s, i) => {
                const [cx, cy] = NODE_POS[i];
                const isActive = i === activeStep;
                const isPast   = i < activeStep;
                return (
                  <g
                    key={s.id}
                    data-node-idx={i}
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  >
                    {/* Glow halo */}
                    <circle
                      cx={cx} cy={cy} r={isActive ? 32 : 24}
                      fill={`url(#glow-${s.id})`}
                      opacity={isActive ? 0.9 : isPast ? 0.4 : 0.2}
                    />
                    {/* Outer ring */}
                    <circle
                      cx={cx} cy={cy} r="20"
                      fill={isActive ? s.color + '22' : '#161b22'}
                      stroke={s.color}
                      strokeWidth={isActive ? 2 : 1}
                      opacity={isActive ? 1 : isPast ? 0.7 : 0.5}
                    />
                    {/* Icon */}
                    <text
                      x={cx} y={cy + 5}
                      textAnchor="middle"
                      fontSize="14"
                      dominantBaseline="auto"
                    >
                      {s.icon}
                    </text>
                    {/* Label below node */}
                    <text
                      x={cx}
                      y={cy + 32}
                      textAnchor="middle"
                      fontSize="8"
                      fill={isActive ? s.color : '#8b949e'}
                      fontFamily="monospace"
                      fontWeight={isActive ? 'bold' : 'normal'}
                    >
                      {s.label.split(' ').slice(0, 2).join(' ')}
                    </text>

                    {/* Active pulse ring */}
                    {isActive && (
                      <circle
                        cx={cx} cy={cy} r="24"
                        fill="none"
                        stroke={s.color}
                        strokeWidth="1"
                        opacity="0.5"
                      >
                        <animate
                          attributeName="r"
                          values="20;32;20"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.5;0;0.5"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Scroll hint — fades out after first step */}
        {activeStep === 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
            <span className="text-[10px] text-muted uppercase tracking-widest">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-muted/60 to-transparent animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
