'use client';

import { useState, useEffect, FormEvent, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import dynamic from 'next/dynamic';

const Console = dynamic(() => import('@/components/Console'), { ssr: false });
const SystemArchitecture3D = dynamic(() => import('@/components/SystemArchitecture3D'), { ssr: false });
const DocsSection = dynamic(() => import('@/components/DocsSection'), { ssr: false });

interface UsageData {
  month: string;
  count: number;
  cap: number;
  remaining: number;
  limitReached: boolean;
}

const FEATURES = [
  { title: 'Health Score',  desc: '0–100 composite score across response time, PR velocity, triage health, and community growth — with a letter grade A through F.' },
  { title: 'Issue Metrics', desc: 'Median first-response and close times, closed-within-7-days %, stale issue %, and label breakdown.' },
  { title: 'PR Velocity',   desc: 'Median review latency and merge time, merge rate, average review rounds, and stale PR count.' },
  { title: 'Contributors',  desc: 'Total contributor count, new contributors in the last 30 days, and a top-10 leaderboard.' },
  { title: 'Trend Charts',  desc: 'Health score, stars / forks, open issues / PRs, and new contributors charted over time.' },
  { title: '6-hour Cache',  desc: 'Results are cached for 6 hours — repeated lookups of the same repo return instantly without counting against the cap.' },
];

const PARTNERS = [
  'GitHub',
  'GraphQL',
  'Next.js',
  'SQLite',
  'Prisma',
  'Chart.js',
];

export default function HomePage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [owner, setOwner]     = useState('');
  const [repo,  setRepo]      = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage]     = useState<UsageData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((d: UsageData) => setUsage(d))
      .catch(() => {});
  }, []);

  // ── Page-load GSAP timeline ────────────────────────────────
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const heroLogo     = root.querySelector('[data-hero-logo]')    as HTMLElement | null;
      const pill         = root.querySelector('[data-hero-pill]')    as HTMLElement | null;
      const h1           = root.querySelector('[data-hero-h1]')      as HTMLElement | null;
      const h1Accent     = root.querySelector('[data-hero-accent]')  as HTMLElement | null;
      const p            = root.querySelector('[data-hero-p]')       as HTMLElement | null;
      const ctas         = gsap.utils.toArray<HTMLElement>('[data-hero-cta]', root);
      const partners     = gsap.utils.toArray<HTMLElement>('[data-partner]', root);
      const usageWrap    = root.querySelector('[data-usage]')        as HTMLElement | null;
      const usageFill    = root.querySelector('[data-usage-fill]')   as HTMLElement | null;
      const featureCards = gsap.utils.toArray<HTMLElement>('[data-feature]', root);
      const heroFeatureCardsOnly = featureCards.filter((el) => !(el.closest('#docs')));

      const showAll = () => {
        [heroLogo, pill, h1, h1Accent, p, usageWrap].forEach((el) => { if (el) gsap.set(el, { clearProps: 'all' }); });
        [...ctas, ...partners, ...heroFeatureCardsOnly].forEach((el) => gsap.set(el, { clearProps: 'all' }));
      };

      if (reduced) {
        showAll();
        if (usage && usageFill) {
          const pct = Math.min(100, Math.round((usage.count / usage.cap) * 100));
          gsap.set(usageFill, { scaleX: pct / 100 });
        }
        return;
      }

      if (heroLogo)     gsap.set(heroLogo,     { opacity: 0, y: -12, scale: 0.88 });
      if (pill)         gsap.set(pill,         { opacity: 0, y: -8 });
      if (h1)           gsap.set(h1,           { opacity: 0, y: 18 });
      if (h1Accent)     gsap.set(h1Accent,     { backgroundPosition: '0% 50%' });
      if (p)            gsap.set(p,            { opacity: 0, y: 14 });
      if (usageWrap)    gsap.set(usageWrap,    { opacity: 0, y: 10 });
      ctas.forEach((el) =>         gsap.set(el, { opacity: 0, y: 10, scale: 0.98 }));
      partners.forEach((el) =>     gsap.set(el, { opacity: 0, y: 6 }));
      // Only target hero feature grid — doc cards (#docs) use their own scroll-reveal
      const heroFeatureCards = featureCards.filter((el) => !(el.closest('#docs')));
      heroFeatureCards.forEach((el) => gsap.set(el, { opacity: 0, y: 16 }));
      if (usageFill)    gsap.set(usageFill,    { scaleX: 0, transformOrigin: 'left center' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.to(heroLogo,     { opacity: 1, y: 0, scale: 1,                  duration: 0.55, ease: 'back.out(1.4)' }, 0.00)
        .to(pill,         { opacity: 1, y: 0,                           duration: 0.38 }, 0.10)
        .to(h1,           { opacity: 1, y: 0,                           duration: 0.65 }, 0.22)
        .to(p,            { opacity: 1, y: 0,                           duration: 0.52 }, 0.38)
        .to(ctas,         { opacity: 1, y: 0, scale: 1, stagger: 0.08,  duration: 0.45 }, 0.56)
        .to(partners,     { opacity: 1, y: 0, stagger: 0.04,            duration: 0.35 }, 0.70)
        .to(usageWrap,    { opacity: 1, y: 0,                           duration: 0.40 }, 0.98)
        .to(heroFeatureCards, { opacity: 1, y: 0, stagger: 0.06,            duration: 0.48 }, 1.08);

      if (h1Accent) {
        tl.to(h1Accent, {
          backgroundPosition: '200% 50%',
          duration: 2.4,
          ease: 'power1.inOut',
          repeat: -1,
          yoyo: true,
        }, 0.9);
      }
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // usage fill bar animation
  useEffect(() => {
    if (!usage) return;
    const root = rootRef.current;
    const fill = root?.querySelector('[data-usage-fill]') as HTMLElement | null;
    if (!fill) return;
    const pct = Math.min(100, Math.round((usage.count / usage.cap) * 100));
    gsap.to(fill, {
      scaleX: pct / 100,
      duration: 0.85,
      ease: 'power2.out',
      delay: 0.95,
    });
  }, [usage]);

  // ── Modal open/close + GSAP transitions ────────────────────
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const openModal = useCallback(() => {
    setError('');
    setOwner('');
    setRepo('');
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (submitLockRef.current) return;
    const root = modalRef.current;
    if (!root || reducedMotion) {
      setModalOpen(false);
      return;
    }
    const backdrop = root.querySelector('[data-modal-backdrop]') as HTMLElement | null;
    const panel    = root.querySelector('[data-modal-panel]')    as HTMLElement | null;
    const tl = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete: () => setModalOpen(false),
    });
    tl.to(panel,    { opacity: 0, y: 18, scale: 0.97, duration: 0.22 }, 0)
      .to(backdrop, { opacity: 0, duration: 0.25 }, 0);
  }, [reducedMotion]);

  useEffect(() => {
    if (!modalOpen) return;
    const root = modalRef.current;
    if (!root) return;

    // ESC to close
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);

    const backdrop = root.querySelector('[data-modal-backdrop]') as HTMLElement | null;
    const panel    = root.querySelector('[data-modal-panel]')    as HTMLElement | null;
    const fields   = gsap.utils.toArray<HTMLElement>('[data-modal-field]', root);
    const button   = root.querySelector('[data-modal-submit]')   as HTMLElement | null;

    if (reducedMotion) {
      fields.forEach((el) => gsap.set(el, { clearProps: 'all' }));
      if (button) gsap.set(button, { clearProps: 'all' });
      // focus first input
      const first = root.querySelector('input') as HTMLInputElement | null;
      if (first) setTimeout(() => first.focus(), 50);
    } else {
      gsap.set(backdrop, { opacity: 0 });
      gsap.set(panel,    { opacity: 0, y: 22, scale: 0.96 });
      fields.forEach((el) => gsap.set(el, { opacity: 0, y: 10 }));
      if (button) gsap.set(button, { opacity: 0, y: 10, scale: 0.98 });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.to(backdrop, { opacity: 1, duration: 0.28 }, 0)
        .to(panel,    { opacity: 1, y: 0, scale: 1, duration: 0.38 }, 0.05)
        .to(fields,   { opacity: 1, y: 0, stagger: 0.07, duration: 0.30 }, 0.24)
        .to(button,   { opacity: 1, y: 0, scale: 1, duration: 0.28 }, 0.48);

      const first = root.querySelector('input') as HTMLInputElement | null;
      if (first) setTimeout(() => first.focus(), 260);
    }

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [modalOpen, closeModal, reducedMotion]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const ownerTrim = owner.trim();
    const repoTrim  = repo.trim();
    if (!ownerTrim || !repoTrim) {
      setError('Please enter both an owner / organisation and a repository name.');
      return;
    }
    setLoading(true);
    submitLockRef.current = true;
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
      submitLockRef.current = false;
    }
  }

  const usagePct = usage
    ? Math.min(100, Math.round((usage.count / usage.cap) * 100))
    : 0;
  const usageClass =
    usagePct >= 90 ? 'danger' :
    usagePct >= 70 ? 'warning' :
                     'success';

  return (
    <div ref={rootRef} className="flex flex-col items-center gap-14 py-6 md:py-10">
      {/* 1. Hero */}
      <section className="w-full text-center max-w-3xl flex flex-col items-center gap-6 mt-6">
        <div data-hero-logo className="mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/artificial-heart.png"
            alt="RepoPulse Logo"
            className="h-20 w-20 md:h-24 md:w-24 object-contain mx-auto"
            style={{ filter: 'drop-shadow(0 0 18px rgba(188, 140, 255, 0.55))' }}
          />
        </div>

        <span className="pill" data-hero-pill>
          <span className="pill-dot" />
          NEW · Repo Health Checker v1 is here
        </span>

        <h1
          className="text-[2.75rem] sm:text-[3.75rem] md:text-[4.75rem] tracking-[0.01em] leading-[1.05] text-[#eceef1]"
          data-hero-h1
        >
          Open Source{' '}
          <span
            className="relative inline-block"
            data-hero-accent
            style={{
              background:
                'linear-gradient(90deg, #bc8cff 0%, #58a6ff 50%, #bc8cff 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Repository Health
          </span>
          <br />
          Pulse for Developers
        </h1>

        <p className="text-base md:text-lg text-muted leading-relaxed max-w-2xl" data-hero-p>
          Tap the button below and enter any public GitHub repository to get an
          instant health dashboard — issue response times, PR review velocity,
          contributor growth, triage backlog, and a composite health score with a
          letter grade.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button type="button" className="btn-primary" data-hero-cta onClick={openModal}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 12h18M12 3v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Open Repo Health Checker
          </button>
          <a href="#docs" className="btn-ghost" data-hero-cta onClick={(e) => {
            e.preventDefault();
            document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Documentation ↓
          </a>
        </div>

        <div className="w-full pt-4">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted mb-3">
            Works with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted">
            {PARTNERS.map((name) => (
              <span key={name} data-partner className="font-medium tracking-wide">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Console */}
      <section id="how-it-works" className="w-full max-w-4xl">
        <Console />
      </section>

      {/* 3. System Architecture (3D) */}
      <SystemArchitecture3D />

      {/* 4. Documentation */}
      <DocsSection />

      {/* 5. Usage meter */}
      {usage && (
        <section
          className="w-full max-w-xl"
          aria-label="Monthly usage"
          data-usage
        >
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>Global lookups this month</span>
            <span>
              {usage.count.toLocaleString()} / {usage.cap.toLocaleString()}
            </span>
          </div>
          <div className="usage-track" aria-hidden="true">
            <div
              className={`usage-fill ${usageClass}`}
              data-usage-fill
              style={{ width: '100%' }}
              role="progressbar"
              aria-valuenow={usage.count}
              aria-valuemin={0}
              aria-valuemax={usage.cap}
            />
          </div>
          <p className="mt-1 text-xs text-muted text-right">
            {usage.remaining.toLocaleString()} lookup{usage.remaining !== 1 ? 's' : ''} remaining
          </p>
        </section>
      )}

      {/* 6. Feature grid */}
      <section className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-purple font-semibold mb-1.5">
            Features
          </p>
          <h2 className="text-xl md:text-2xl tracking-tight">
            Everything you need to understand repo health
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ title, desc }) => (
            <div key={title} className="feature-card" data-feature>
              <p className="feature-title font-boogaloo text-lg">{title}</p>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Health Checker modal */}
      {modalOpen && (
        <div ref={modalRef}>
          <div
            className="modal-backdrop"
            data-modal-backdrop
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="modal-panel" data-modal-panel role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <div className="modal-header">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-purple font-semibold mb-1">
                    Repo Health Checker
                  </p>
                  <h2 id="modal-title" className="text-xl md:text-2xl tracking-tight text-[#eceef1]">
                    Analyse any public GitHub repo
                  </h2>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  onClick={closeModal}
                  aria-label="Close dialog"
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <p className="text-sm text-muted leading-relaxed mb-5">
                  Enter an owner / organisation and repository name. Results are cached for 6 hours;
                  repeated lookups are instant and don&apos;t count against the cap.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                  <div data-modal-field>
                    <label htmlFor="owner-m" className="field-label">
                      Owner / Organisation
                    </label>
                    <input
                      id="owner-m"
                      type="text"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="e.g. modelcontextprotocol"
                      autoComplete="off"
                      spellCheck={false}
                      className="field-input font-mono"
                      required
                    />
                  </div>

                  <div data-modal-field>
                    <label htmlFor="repo-m" className="field-label">
                      Repository name
                    </label>
                    <input
                      id="repo-m"
                      type="text"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      placeholder="e.g. servers"
                      autoComplete="off"
                      spellCheck={false}
                      className="field-input font-mono"
                      required
                    />
                  </div>

                  {error && (
                    <div className="alert-error" data-modal-field role="alert">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    data-modal-submit
                    disabled={loading || (usage?.limitReached ?? false)}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Analysing repository…' : 'Analyse Repository'}
                  </button>

                  {usage?.limitReached && (
                    <p className="alert-warn" data-modal-field>
                      Monthly limit of {usage.cap} lookups reached. Resets on the 1st of next month.
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
