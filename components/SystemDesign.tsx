'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface TickStyle {
  transform: string;
  height?: string;
  backgroundColor?: string;
}

const TICK_COUNT = 9;
const TICK_START_ANGLE = -90;
const TICK_END_ANGLE = 90;
const TICK_STEP = (TICK_END_ANGLE - TICK_START_ANGLE) / (TICK_COUNT - 1);

const ticks: TickStyle[] = Array.from({ length: TICK_COUNT }, (_, i) => {
  const angle = TICK_START_ANGLE + i * TICK_STEP;
  const isMajor = i === 0 || i === TICK_COUNT - 1 || i === Math.floor(TICK_COUNT / 2);
  return {
    transform: `translateX(-50%) rotate(${angle}deg) translateY(-56%)`,
    height: isMajor ? '12px' : '6px',
    backgroundColor: isMajor ? 'rgba(139, 148, 158, 0.85)' : undefined,
  };
});

const STAGE_LABELS = ['PROMPT', 'BUILD', 'FIX', 'EVAL'];

export default function SystemDesign() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const onceRef = useRef(false);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const runAnimations = () => {
      if (onceRef.current) return;
      onceRef.current = true;

      const cards = gsap.utils.toArray<HTMLElement>('[data-sd-card]', root);
      const gaugeFill = root.querySelector('[data-sd-gauge-fill]') as HTMLElement | null;
      const gaugeNeedle = root.querySelector('[data-sd-gauge-needle]') as HTMLElement | null;
      const gaugeValue = root.querySelector('[data-sd-gauge-value]') as HTMLElement | null;
      const boxScene = root.querySelector('[data-sd-box-scene]') as HTMLElement | null;
      const boxGhosts = gsap.utils.toArray<HTMLElement>('[data-sd-box-ghost]', root);
      const flowNodes = gsap.utils.toArray<HTMLElement>('[data-sd-flow-node]', root);
      const flowPaths = gsap.utils.toArray<SVGPathElement>('[data-sd-flow-path]', root);

      if (reduced) {
        cards.forEach((el) => gsap.set(el, { clearProps: 'all' }));
        if (gaugeFill) gsap.set(gaugeFill, { transform: 'rotate(-15deg)' });
        if (gaugeNeedle) gsap.set(gaugeNeedle, { transform: 'translateX(-50%) rotate(72deg)' });
        if (gaugeValue && gaugeValue.dataset) gsap.set(gaugeValue, { textContent: '90ms' });
        if (boxScene) gsap.set(boxScene, { rotateX: 0, rotateY: 0 });
        boxGhosts.forEach((el) => gsap.set(el, { opacity: 1 }));
        flowNodes.forEach((el) => gsap.set(el, { opacity: 1, scale: 1 }));
        flowPaths.forEach((el) => gsap.set(el, { opacity: 1, strokeDashoffset: 0 }));
        return;
      }

      // Initial states
      cards.forEach((el) => gsap.set(el, { opacity: 0, y: 22 }));
      if (gaugeFill) gsap.set(gaugeFill, { transformOrigin: '50% 100%', rotate: -90 });
      if (gaugeNeedle) gsap.set(gaugeNeedle, { transformOrigin: '50% 100%', transform: 'translateX(-50%) rotate(-90deg)' });
      if (gaugeValue) gsap.set(gaugeValue, { textContent: '0ms' });
      if (boxScene) gsap.set(boxScene, { rotateX: -15, rotateY: -28, transformPerspective: 700 });
      boxGhosts.forEach((el) => gsap.set(el, { opacity: 0, y: 6 }));
      flowNodes.forEach((el) => gsap.set(el, { opacity: 0, scale: 0.7 }));
      flowPaths.forEach((el) => {
        const len = el.getTotalLength();
        gsap.set(el, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.to(cards, { opacity: 1, y: 0, stagger: 0.09, duration: 0.55 }, 0);

      // Card 1: Gauge animation
      tl.to(gaugeFill, { rotate: -15, duration: 1.1, ease: 'power2.out' }, 0.35);
      tl.to(gaugeNeedle, { transform: 'translateX(-50%) rotate(72deg)', duration: 1.15, ease: 'power2.out' }, 0.38);
      if (gaugeValue) {
        const obj = { val: 0 };
        tl.to(obj, {
          val: 90,
          duration: 1.1,
          ease: 'power2.out',
          onUpdate: () => {
            gaugeValue.textContent = `${Math.round(obj.val)}ms`;
          },
        }, 0.38);
      }

      // Card 2: 3D box idle rotation
      tl.to(boxScene, { rotateX: -6, rotateY: 10, duration: 1.1, ease: 'power2.inOut' }, 0.3);
      tl.to(boxGhosts, { opacity: 1, y: 0, stagger: 0.07, duration: 0.55 }, 0.55);

      // Idle continuous float for 3D box
      if (boxScene) {
        gsap.to(boxScene, {
          rotateX: -12,
          rotateY: -18,
          duration: 4.2,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1.6,
        });
      }

      // Card 3: Flow chart reveal
      tl.to(
        flowNodes,
        { opacity: 1, scale: 1, stagger: 0.045, duration: 0.38, ease: 'back.out(1.6)' },
        0.55,
      );
      flowPaths.forEach((path, i) => {
        tl.to(
          path,
          { opacity: 1, strokeDashoffset: 0, duration: 0.65, ease: 'power2.out' },
          0.7 + i * 0.09,
        );
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runAnimations();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="system-design" className="w-full max-w-5xl">
      <div className="text-center mb-7">
        <p className="text-xs uppercase tracking-[0.18em] text-purple font-semibold mb-1.5">
          System Architecture
        </p>
        <h2 className="text-xl md:text-2xl tracking-tight">
          Built for speed, isolation, and massive scale
        </h2>
      </div>

      <div className="sysdesign-grid">
        {/* Card 1 — Gauge / speed */}
        <div className="sysdesign-card" data-sd-card>
          <h3 className="sysdesign-card-title">
            Lightning-Fast Infrastructure
            <br />
            <span className="text-sm text-muted font-sans font-normal">
              Sub 90ms cache hits from code to execution
            </span>
          </h3>
          <p className="sysdesign-card-desc">
            SQLite-backed cache layer with 6-hour TTL returns previously-analysed
            repos in milliseconds. Fresh GitHub lookups run through an optimised
            GraphQL aggregation pipeline.
          </p>

          <div className="sysdesign-gauge-wrap">
            <div className="sysdesign-gauge-arc">
              <div className="sysdesign-gauge-fill" data-sd-gauge-fill />
            </div>
            <div className="sysdesign-gauge-ticks" aria-hidden="true">
              {ticks.map((t, i) => (
                <span
                  key={i}
                  className="sysdesign-gauge-tick"
                  style={{ ...t } as React.CSSProperties}
                />
              ))}
            </div>
            <div className="sysdesign-gauge-needle" data-sd-gauge-needle />
            <div className="sysdesign-gauge-center" />
            <span className="sysdesign-gauge-value" data-sd-gauge-value>
              0ms
            </span>
            <span className="sysdesign-gauge-label">sandbox = daytona.create()</span>
          </div>
        </div>

        {/* Card 2 — Isolated runtime */}
        <div className="sysdesign-card" data-sd-card>
          <h3 className="sysdesign-card-title">
            Separated &amp; Isolated Runtime
            <br />
            <span className="text-sm text-muted font-sans font-normal">
              Zero-risk code execution sandbox
            </span>
          </h3>
          <p className="sysdesign-card-desc">
            Every metric calculation runs inside a pure, stateless function
            boundary. No user code ever touches your infrastructure — metrics
            modules are deterministic and side-effect free.
          </p>

          <div className="sysdesign-runtime-wrap">
            <div className="sysdesign-box-scene" data-sd-box-scene>
              <div className="sysdesign-box-ghost g1" data-sd-box-ghost />
              <div className="sysdesign-box-ghost g2" data-sd-box-ghost />
              <div className="sysdesign-box-ghost g3" data-sd-box-ghost />
              <div className="sysdesign-box-face top" />
              <div className="sysdesign-box-face side" />
              <div className="sysdesign-box-face front" />
              <div className="sysdesign-box-dashes" />
            </div>
          </div>
        </div>

        {/* Card 3 — Parallelization / flow */}
        <div className="sysdesign-card" data-sd-card>
          <h3 className="sysdesign-card-title">
            Massive Parallelization
            <br />
            <span className="text-sm text-muted font-sans font-normal">
              Concurrent pipelines with realtime output
            </span>
          </h3>
          <p className="sysdesign-card-desc">
            Issue metrics, PR velocity, contributor growth, and trend series
            all compute independently. Results stream into the dashboard the
            moment each stage completes.
          </p>

          <div className="sysdesign-flow-wrap">
            <div className="sysdesign-flow">
              <svg className="sysdesign-flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {/* Top SAVED splits to 4 forks */}
                <path className="sysdesign-flow-line" data-sd-flow-path d="M50 10 C 50 16, 10 16, 10 22" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M50 10 C 50 16, 36 16, 36 22" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M50 10 C 50 16, 63 16, 63 22" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M50 10 C 50 16, 90 16, 90 22" />
                {/* 4 columns vertical connectors between stages */}
                <path className="sysdesign-flow-line" data-sd-flow-path d="M10 33 L 10 80" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M36 33 L 36 80" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M63 33 L 63 80" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M90 33 L 90 80" />
                {/* 4 columns merge to bottom SAVED */}
                <path className="sysdesign-flow-line" data-sd-flow-path d="M10 85 C 10 91, 50 91, 50 97" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M36 85 C 36 91, 50 91, 50 97" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M63 85 C 63 91, 50 91, 50 97" />
                <path className="sysdesign-flow-line" data-sd-flow-path d="M90 85 C 90 91, 50 91, 50 97" />
              </svg>

              <div className="sysdesign-flow-node saved-top" data-sd-flow-node>SAVED</div>
              <div className="sysdesign-flow-node fork f1" data-sd-flow-node>⇅ FORK</div>
              <div className="sysdesign-flow-node fork f2" data-sd-flow-node>⇅ FORK</div>
              <div className="sysdesign-flow-node fork f3" data-sd-flow-node>⇅ FORK</div>
              <div className="sysdesign-flow-node fork f4" data-sd-flow-node>⇅ FORK</div>

              {[0, 1, 2, 3].map((row) =>
                [0, 1, 2, 3].map((col) => (
                  <div
                    key={`${row}-${col}`}
                    className={`sysdesign-flow-node stage s${row + 1} c${col + 1}`}
                    data-sd-flow-node
                  >
                    {STAGE_LABELS[row]}
                  </div>
                )),
              )}

              <div className="sysdesign-flow-node saved-bot" data-sd-flow-node>SAVED</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
