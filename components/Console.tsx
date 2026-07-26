'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface ConsoleLine {
  type: 'cmd' | 'out';
  variant?: 'ok' | 'val' | 'meta';
  text: string;
}

const LINES: ConsoleLine[] = [
  { type: 'cmd', text: 'git clone https://github.com/YOUR_USER/RepoPulse' },
  { type: 'out', variant: 'meta', text: 'Cloning into \'RepoPulse\'... done' },
  { type: 'cmd', text: 'cd RepoPulse' },
  { type: 'cmd', text: 'npm install' },
  { type: 'out', variant: 'ok',   text: 'added 287 packages in 12s' },
  { type: 'cmd', text: 'cp .env.example .env.local' },
  { type: 'out', variant: 'meta', text: '#   GITHUB_TOKEN=ghp_...' },
  { type: 'out', variant: 'meta', text: '#   DATABASE_URL=file:./tracker.db' },
  { type: 'cmd', text: 'npx prisma db push' },
  { type: 'out', variant: 'ok',   text: 'Your database is now in sync with your schema.' },
  { type: 'cmd', text: 'npm run dev' },
  { type: 'out', variant: 'val',  text: 'ready - started server on 0.0.0.0:3000, url: http://localhost:3000' },
];

const FOOTER_STATS = [
  { label: 'REPOS',    value: '12' },
  { label: 'ISSUES',   value: '486' },
  { label: 'PRS',      value: '2,314' },
  { label: 'CONTRIBS', value: '1,028' },
];

export default function Console() {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const body = bodyRef.current;
    if (!body) return;

    const ctx = gsap.context(() => {
      const lineEls = gsap.utils.toArray<HTMLElement>('[data-cons-line]', body);
      const cmdTextEls = gsap.utils.toArray<HTMLElement>('[data-cons-cmd-text]', body);
      const outEls = gsap.utils.toArray<HTMLElement>('[data-cons-out]', body);
      const footerStatEls = gsap.utils.toArray<HTMLElement>('[data-cons-stat]', body);
      const progressFill = body.querySelector('[data-cons-progress-fill]') as HTMLElement | null;
      const caret = body.querySelector('[data-cons-caret]') as HTMLElement | null;

      if (reduced) {
        lineEls.forEach((el) => (el.style.opacity = '1'));
        cmdTextEls.forEach((el) => (el.style.visibility = 'visible'));
        outEls.forEach((el) => (el.style.opacity = '1'));
        footerStatEls.forEach((el) => (el.style.opacity = '1'));
        if (progressFill) gsap.set(progressFill, { scaleX: 0.72 });
        return;
      }

      gsap.set(lineEls, { opacity: 0 });
      gsap.set(cmdTextEls, { visibility: 'hidden' });
      gsap.set(outEls, { opacity: 0, y: 4 });
      gsap.set(footerStatEls, { opacity: 0, y: 6 });
      if (progressFill) gsap.set(progressFill, { scaleX: 0, transformOrigin: 'left center' });

      const tl = gsap.timeline({ delay: 0.95, defaults: { ease: 'none' } });

      // progress build-up starts slow, fills as lines complete
      tl.to(progressFill, { scaleX: 0.72, duration: 5.2, ease: 'power2.out' }, 0);

      let runningTime = 0;

      LINES.forEach((ln, idx) => {
        const lineEl = lineEls[idx];
        if (!lineEl) return;

        tl.set(lineEl, { opacity: 1 }, runningTime);

        if (ln.type === 'cmd') {
          const textEl = cmdTextEls.shift();
          const chars = ln.text.length;
          const duration = Math.max(0.18, chars * 0.018);
          if (textEl) {
            tl.set(textEl, { visibility: 'visible', clipPath: 'inset(0 100% 0 0)' }, runningTime);
            tl.to(textEl, { clipPath: 'inset(0 0% 0 0)', duration, ease: 'none' }, runningTime);
          }
          runningTime += duration + 0.12;
          // small caret bump when a command is being typed
          if (caret) {
            tl.fromTo(
              caret,
              { opacity: 0 },
              { opacity: 1, duration: 0.05, repeat: Math.floor(duration / 0.25), yoyo: true },
              runningTime - duration,
            );
          }
        } else {
          const outEl = outEls.shift();
          const duration = 0.22;
          if (outEl) {
            tl.to(outEl, { opacity: 1, y: 0, duration, ease: 'power3.out' }, runningTime);
          }
          runningTime += duration + 0.08;
        }
      });

      // footer stats fade in staggered
      tl.to(
        footerStatEls,
        { opacity: 1, y: 0, stagger: 0.05, duration: 0.35, ease: 'power2.out' },
        runningTime + 0.05,
      );

      // final caret stays blinking (CSS handles the blink, we just ensure visible)
      if (caret) tl.set(caret, { opacity: 1 }, runningTime);
    }, body);

    return () => ctx.revert();
  }, []);

  return (
    <div className="console w-full" data-console>
      <div className="console-header">
        <div className="console-lights" aria-hidden="true">
          <span className="console-light red" />
          <span className="console-light yellow" />
          <span className="console-light green" />
        </div>
        <div className="console-title">repopulse@localhost:3000</div>
        <div className="console-status">running</div>
      </div>

      <div className="console-body" ref={bodyRef}>
        {LINES.map((ln, i) => (
          <div className="console-line" data-cons-line key={i}>
            {ln.type === 'cmd' ? (
              <>
                <span className="console-ps1">$</span>
                <span data-cons-cmd-text>{ln.text}</span>
                {i === LINES.length - 1 && (
                  <span className="console-caret" data-cons-caret aria-hidden="true">_</span>
                )}
              </>
            ) : (
              <div
                className={`console-out ${ln.variant === 'ok' ? 'ok' : ''} ${ln.variant === 'val' ? 'val' : ''} ${ln.variant === 'meta' ? 'meta' : ''}`}
                data-cons-out
              >
                {ln.text}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="console-footer">
        <div className="console-footer-stats">
          {FOOTER_STATS.map((s) => (
            <div className="console-footer-stat" data-cons-stat key={s.label}>
              <b>{s.value}</b> {s.label}
            </div>
          ))}
        </div>
        <div className="console-progress" aria-hidden="true">
          <div className="console-progress-fill" data-cons-progress-fill style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
