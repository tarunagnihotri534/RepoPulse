'use client';

/**
 * SystemFlowDiagram
 * ─────────────────
 * Animated 3D/pseudo-3D system-design explainer for RepoPulse.
 * Nodes revealed step-by-step on scroll via GSAP ScrollTrigger.
 * Animated particles travel along connector paths between steps.
 * Branch state: cache HIT vs MISS highlighted separately.
 * "Replay" button resets + replays the whole animation.
 *
 * Uses only:
 *  • GSAP + ScrollTrigger for animation
 *  • CSS 3D transforms for depth (translateZ, rotateX/Y, perspective)
 *  • Tailwind CSS for layout / spacing only
 *  • NO Three.js, NO Framer Motion, NO other animation library
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── Step definitions ────────────────────────────────────────────────────────

type BranchType = 'main' | 'hit' | 'miss';

interface Step {
  id: string;
  label: string;
  sub: string;
  icon: string;
  branch: BranchType;
  col: number;   // 0-indexed column in the 2-column layout
  row: number;   // 0-indexed row
}

const STEPS: Step[] = [
  { id: 'browser',  label: 'User Browser',         sub: 'React form · owner/repo submitted',         icon: '🖥️',  branch: 'main', col: 0, row: 0 },
  { id: 'api',      label: 'Next.js API Route',     sub: 'POST /api/analyze · validates input',       icon: '⚡',  branch: 'main', col: 1, row: 0 },
  { id: 'cache',    label: 'Cache / DB Lookup',     sub: 'SQLite · checks 6-hour TTL',                icon: '🗄️',  branch: 'main', col: 0, row: 1 },
  { id: 'hit',      label: 'Cache Hit',             sub: 'Returns cached snapshot instantly',         icon: '✅',  branch: 'hit',  col: 1, row: 1 },
  { id: 'github',   label: 'GitHub GraphQL API',    sub: 'Fetches issues · PRs · contributors',       icon: '🐙',  branch: 'miss', col: 0, row: 2 },
  { id: 'metrics',  label: 'Metrics Engine',        sub: 'Computes health score · deltas · triage',   icon: '🔬',  branch: 'miss', col: 1, row: 2 },
  { id: 'write',    label: 'Cache Write',           sub: 'Stores snapshot in SQLite',                 icon: '💾',  branch: 'miss', col: 0, row: 3 },
  { id: 'cap',      label: 'Usage Cap Tracker',     sub: 'Increments monthly counter · enforces 50',  icon: '📊',  branch: 'miss', col: 1, row: 3 },
  { id: 'dashboard',label: 'Dashboard',            sub: 'React renders health data to visitor',      icon: '📈',  branch: 'main', col: 0, row: 4 },
];

// Edges: [from id, to id, label, branch]
type EdgeDef = [string, string, string, BranchType];
const EDGES: EdgeDef[] = [
  ['browser',  'api',      'submits',    'main'],
  ['api',      'cache',    'checks',     'main'],
  ['cache',    'hit',      'HIT →',      'hit'],
  ['hit',      'dashboard','skips ahead','hit'],
  ['cache',    'github',   'MISS →',     'miss'],
  ['github',   'metrics',  'raw data',   'miss'],
  ['metrics',  'write',    'snapshot',   'miss'],
  ['write',    'cap',      'logs',       'miss'],
  ['cap',      'dashboard','returns',    'miss'],
];

const BRANCH_COLORS: Record<BranchType, string> = {
  main: '#58a6ff',
  hit:  '#3fb950',
  miss: '#d29922',
};

const BRANCH_BG: Record<BranchType, string> = {
  main: 'rgba(88,166,255,0.07)',
  hit:  'rgba(63,185,80,0.07)',
  miss: 'rgba(210,153,34,0.07)',
};

const BRANCH_BORDER: Record<BranchType, string> = {
  main: 'rgba(88,166,255,0.30)',
  hit:  'rgba(63,185,80,0.30)',
  miss: 'rgba(210,153,34,0.30)',
};

// ─── Node card ───────────────────────────────────────────────────────────────

interface NodeCardProps {
  step: Step;
  index: number;
}

function NodeCard({ step, index }: NodeCardProps) {
  const color  = BRANCH_COLORS[step.branch];
  const bg     = BRANCH_BG[step.branch];
  const border = BRANCH_BORDER[step.branch];
  const delay  = index * 0.13;

  return (
    <div
      data-flow-node={step.id}
      style={{
        opacity: 0,
        transform: 'perspective(600px) translateZ(-32px) translateY(16px)',
        transition: `border-color 200ms ease-out, box-shadow 200ms ease-out`,
        willChange: 'transform, opacity',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '1rem 1.25rem',
        position: 'relative',
        overflow: 'hidden',
        '--node-delay': `${delay}s`,
      } as React.CSSProperties}
      className="flow-node group cursor-default select-none"
    >
      {/* Glow layer */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          opacity: 0,
          background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${color}22, transparent 70%)`,
          transition: 'opacity 300ms ease-out',
          pointerEvents: 'none',
        }}
        className="node-glow"
      />

      {/* Step index badge */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 10,
        fontSize: '0.6rem',
        fontFamily: 'var(--font-mono)',
        color: color,
        opacity: 0.7,
        letterSpacing: '0.06em',
      }}>
        {String(index + 1).padStart(2, '0')}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
          {step.icon}
        </span>
        <div>
          <div style={{
            fontFamily: 'var(--font-boogaloo)',
            fontSize: '1.05rem',
            color: '#eceef1',
            lineHeight: 1.2,
            marginBottom: 3,
          }}>
            {step.label}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            fontFamily: 'var(--font-mono)',
          }}>
            {step.sub}
          </div>
        </div>
      </div>

      {/* Bottom color stripe */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        background: color,
        opacity: 0.55,
        borderRadius: '0 0 12px 12px',
      }} />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SystemFlowDiagram() {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const svgRef      = useRef<SVGSVGElement>(null);
  const particleRef = useRef<HTMLDivElement>(null);
  const tlRef       = useRef<gsap.core.Timeline | null>(null);
  const [branchMode, setBranchMode] = useState<'hit' | 'miss'>('miss');
  const playedRef = useRef(false);

  // ── Build SVG paths for edges ─────────────────────────────────────────────
  // We render paths purely through CSS/SVG — positions are set via data attributes
  // that we read after layout in useEffect.

  const buildTimeline = useCallback(() => {
    const root = sectionRef.current;
    if (!root) return;

    // Kill previous
    tlRef.current?.kill();
    ScrollTrigger.getAll().forEach((st) => {
      if (st.vars.id === 'flow-diagram') st.kill();
    });

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const nodes = gsap.utils.toArray<HTMLElement>('[data-flow-node]', root);
    const pathEls = gsap.utils.toArray<SVGPathElement>('[data-flow-path]', root);
    const particles = gsap.utils.toArray<HTMLElement>('[data-particle]', root);
    const branchLabels = gsap.utils.toArray<HTMLElement>('[data-branch-label]', root);
    const legendHit  = root.querySelector('[data-legend-hit]')  as HTMLElement | null;
    const legendMiss = root.querySelector('[data-legend-miss]') as HTMLElement | null;

    if (reduced) {
      nodes.forEach((n) => gsap.set(n, { opacity: 1, transform: 'perspective(600px) translateZ(0) translateY(0)' }));
      pathEls.forEach((p) => gsap.set(p, { strokeDashoffset: 0, opacity: 1 }));
      return;
    }

    // Reset states
    nodes.forEach((n) => gsap.set(n, { opacity: 0, transform: 'perspective(600px) translateZ(-32px) translateY(16px)' }));
    pathEls.forEach((p) => {
      const len = p.getTotalLength?.() ?? 80;
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
    });
    particles.forEach((p) => gsap.set(p, { opacity: 0 }));
    branchLabels.forEach((l) => gsap.set(l, { opacity: 0, y: 6 }));

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.out' },
    });

    tlRef.current = tl;

    // Reveal nodes one by one
    nodes.forEach((node, i) => {
      tl.to(node, {
        opacity: 1,
        transform: 'perspective(600px) translateZ(0px) translateY(0px)',
        duration: 0.55,
        ease: 'back.out(1.2)',
      }, i * 0.18);
    });

    // Draw edges after nodes appear
    pathEls.forEach((path, i) => {
      tl.to(path, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power2.inOut',
      }, 0.5 + i * 0.14);
    });

    // Branch labels
    branchLabels.forEach((label, i) => {
      tl.to(label, { opacity: 1, y: 0, duration: 0.35 }, 1.2 + i * 0.12);
    });

    // Particle travel along first path (repeating)
    const firstPath = pathEls[0];
    if (firstPath && particles[0]) {
      tl.to(particles[0], { opacity: 1, duration: 0.2 }, 0.6);
      tl.to(particles[0], {
        motionPath: { path: firstPath, align: firstPath, alignOrigin: [0.5, 0.5] },
        duration: 1.8,
        ease: 'none',
        repeat: -1,
        delay: 0.3,
      } as gsap.TweenVars, 0.6);
    }

    if (!reduced) {
      ScrollTrigger.create({
        id: 'flow-diagram',
        trigger: root,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          if (!playedRef.current) {
            playedRef.current = true;
            tl.play();
          }
        },
      });
    }
  }, []);

  useEffect(() => {
    buildTimeline();
    return () => {
      tlRef.current?.kill();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.vars.id === 'flow-diagram') st.kill();
      });
    };
  }, [buildTimeline]);

  const handleReplay = () => {
    playedRef.current = false;
    const root = sectionRef.current;
    if (!root) return;
    const nodes = gsap.utils.toArray<HTMLElement>('[data-flow-node]', root);
    const pathEls = gsap.utils.toArray<SVGPathElement>('[data-flow-path]', root);
    nodes.forEach((n) => gsap.set(n, { opacity: 0, transform: 'perspective(600px) translateZ(-32px) translateY(16px)' }));
    pathEls.forEach((p) => {
      const len = p.getTotalLength?.() ?? 80;
      gsap.set(p, { strokeDashoffset: len, opacity: 0 });
    });
    tlRef.current?.restart();
    playedRef.current = true;
  };

  // ── Filter nodes by branch ────────────────────────────────────────────────
  const visibleSteps = STEPS.filter(
    (s) => s.branch === 'main' || s.branch === branchMode,
  );

  return (
    <section
      ref={sectionRef}
      id="system-flow"
      className="w-full max-w-5xl"
      aria-label="System data flow diagram"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-purple font-semibold mb-1.5">
          System Architecture
        </p>
        <h2 className="text-xl md:text-2xl tracking-tight mb-4">
          How RepoPulse processes a request
        </h2>

        {/* Branch toggle + Replay */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setBranchMode('miss')}
              className={`px-4 py-1.5 text-xs font-semibold transition ${
                branchMode === 'miss'
                  ? 'bg-warning/20 text-warning border-warning/30'
                  : 'text-muted hover:text-[#c9d1d9]'
              }`}
              aria-pressed={branchMode === 'miss'}
            >
              Cache Miss (full flow)
            </button>
            <button
              onClick={() => setBranchMode('hit')}
              className={`px-4 py-1.5 text-xs font-semibold transition border-l border-border ${
                branchMode === 'hit'
                  ? 'bg-success/20 text-success'
                  : 'text-muted hover:text-[#c9d1d9]'
              }`}
              aria-pressed={branchMode === 'hit'}
            >
              Cache Hit (fast path)
            </button>
          </div>

          <button
            onClick={handleReplay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-muted hover:text-[#c9d1d9] hover:border-purple/40 transition"
            aria-label="Replay animation"
          >
            <span aria-hidden="true">↺</span> Replay
          </button>
        </div>
      </div>

      {/* Flow diagram */}
      <div
        style={{
          position: 'relative',
          perspective: '1200px',
        }}
      >
        {/* SVG connector layer — absolutely positioned behind nodes */}
        <svg
          ref={svgRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'visible',
          }}
        >
          <defs>
            {(['main', 'hit', 'miss'] as BranchType[]).map((b) => (
              <marker
                key={b}
                id={`arrow-${b}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={BRANCH_COLORS[b]} opacity="0.8" />
              </marker>
            ))}
          </defs>
          {/* Paths drawn at runtime via JS — placeholder here */}
          {EDGES.filter(([, , , branch]) => branch === 'main' || branch === branchMode).map(
            ([from, , label, branch], i) => (
              <g key={`${from}-${i}`}>
                <path
                  data-flow-path={`${from}-${i}`}
                  data-edge-branch={branch}
                  stroke={BRANCH_COLORS[branch as BranchType]}
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  markerEnd={`url(#arrow-${branch})`}
                  opacity="0"
                  d="M 0 0 L 0 0" // updated by JS after layout
                />
                {label && (
                  <text
                    data-branch-label
                    fontSize="9"
                    fill={BRANCH_COLORS[branch as BranchType]}
                    opacity="0"
                    fontFamily="var(--font-mono)"
                    letterSpacing="0.04em"
                  >
                    {label}
                  </text>
                )}
              </g>
            ),
          )}
        </svg>

        {/* Particle dot */}
        <div ref={particleRef}>
          <div
            data-particle
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: BRANCH_COLORS.main,
              boxShadow: `0 0 10px ${BRANCH_COLORS.main}`,
              zIndex: 20,
              pointerEvents: 'none',
              opacity: 0,
            }}
          />
        </div>

        {/* Node grid */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}
        >
          {visibleSteps.map((step, i) => (
            <NodeCard key={step.id} step={step} index={i} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-xs text-muted">
        {(['main', 'hit', 'miss'] as BranchType[]).map((b) => (
          <span key={b} className="flex items-center gap-1.5">
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: BRANCH_COLORS[b],
                boxShadow: `0 0 6px ${BRANCH_COLORS[b]}`,
              }}
            />
            <span style={{ color: BRANCH_COLORS[b], fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {b === 'main' ? 'Main path' : b === 'hit' ? 'Cache hit' : 'Cache miss'}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
