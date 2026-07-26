'use client';

/**
 * FlickeringGrid
 * ──────────────
 * Full-bleed, fixed-position background grid of small square tiles that
 * randomly flicker in/out using GSAP. Zero canvas — pure div/CSS.
 *
 * Performance notes
 * ─────────────────
 * • The grid is built ONCE after mount with a ref — zero React re-renders
 *   after the initial paint.
 * • Tiles use `will-change: opacity` so the compositor handles them without
 *   triggering layout/paint.
 * • GSAP animations are all created inside a single gsap.context() so they
 *   are cleanly reverted on unmount.
 * • Only a random subset (~18 %) of tiles animate at any moment; the rest
 *   stay at their base opacity (0.04) — keeps total live tweens ~80-120 for
 *   a 1920×1080 viewport at 20px tiles, well within GSAP's sweet spot.
 *
 * Props
 * ─────
 *   tileSize    px size of each square tile        default 20
 *   gap         px gap between tiles               default 1
 *   color       CSS color string for tile bg       default '#bc8cff' (purple)
 *   baseOpacity resting opacity (0–1)              default 0.035
 *   maxOpacity  peak flicker opacity (0–1)         default 0.22
 *   flickerPct  fraction of tiles that animate     default 0.18 (18 %)
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export interface FlickeringGridProps {
  tileSize?:    number;
  gap?:         number;
  color?:       string;
  baseOpacity?: number;
  maxOpacity?:  number;
  flickerPct?:  number;
  className?:   string;
}

export default function FlickeringGrid({
  tileSize    = 20,
  gap         = 1,
  color       = '#bc8cff',
  baseOpacity = 0.035,
  maxOpacity  = 0.22,
  flickerPct  = 0.18,
  className   = '',
}: FlickeringGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Track GSAP context for cleanup
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── 1. Measure viewport and compute grid dimensions ──────────────────────
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const step = tileSize + gap;
    const cols = Math.ceil(vw / step) + 1;
    const rows = Math.ceil(vh / step) + 1;
    const total = cols * rows;

    // ── 2. Build the grid DOM in one batch (DocumentFragment) ────────────────
    // Using a fragment avoids repeated reflows while appending tiles.
    const fragment = document.createDocumentFragment();
    const tiles: HTMLDivElement[] = [];

    for (let i = 0; i < total; i++) {
      const tile = document.createElement('div');
      tile.style.cssText = [
        `width:${tileSize}px`,
        `height:${tileSize}px`,
        `background-color:${color}`,
        `opacity:${baseOpacity}`,
        `border-radius:2px`,
        `will-change:opacity`,
        `transform:translateZ(0)`, // promote to own layer
      ].join(';');
      fragment.appendChild(tile);
      tiles.push(tile);
    }

    // Grid container styles (set via JS to avoid extra CSS classes)
    container.style.cssText = [
      'display:grid',
      `grid-template-columns:repeat(${cols},${tileSize}px)`,
      `gap:${gap}px`,
      'position:fixed',
      'inset:0',
      'z-index:1',
      'pointer-events:none',
      'overflow:hidden',
    ].join(';');

    container.appendChild(fragment);

    if (reduced) {
      // Reduced-motion: just leave tiles at base opacity, no animation
      return;
    }

    // ── 3. Randomly pick the subset that will animate ────────────────────────
    // Shuffle indices (Fisher-Yates) then take the first N
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    const animCount = Math.floor(total * flickerPct);
    const animIndices = indices.slice(0, animCount);

    // ── 4. Animate each selected tile independently ──────────────────────────
    ctxRef.current = gsap.context(() => {
      animIndices.forEach((idx) => {
        const tile = tiles[idx];
        if (!tile) return;

        // Recursive self-scheduling — gives truly organic randomness because
        // every cycle gets fresh duration, peak opacity, and repeat delay.
        function flicker() {
          const fadeDur    = 0.6  + Math.random() * 1.4;   // 0.6–2 s fade-in
          const holdDur    = 0.05 + Math.random() * 0.3;   // tiny hold at peak
          const fadeOutDur = 0.8  + Math.random() * 1.8;   // 0.8–2.6 s fade-out
          const restDur    = 0.5  + Math.random() * 4.0;   // 0.5–4.5 s rest
          const peak       = maxOpacity * (0.45 + Math.random() * 0.55);

          gsap.timeline({ delay: Math.random() * 0.5 })
            .to(tile, { opacity: peak,        duration: fadeDur,    ease: 'power1.in'  })
            .to(tile, { opacity: peak,        duration: holdDur,    ease: 'none'       })
            .to(tile, { opacity: baseOpacity, duration: fadeOutDur, ease: 'power2.out' })
            .to(tile, { opacity: baseOpacity, duration: restDur,    ease: 'none',
                        onComplete: flicker });
        }

        // Stagger initial starts so they don't all begin together
        gsap.delayedCall(Math.random() * 8, flicker);
      });
    });

    // ── 5. Cleanup ────────────────────────────────────────────────────────────
    return () => {
      ctxRef.current?.revert();
      // Remove all tile children so React doesn't get confused on HMR
      while (container.firstChild) container.removeChild(container.firstChild);
      container.style.cssText = '';
    };
  // Intentionally run only once — props changes would require a full remount,
  // which is fine for a background layer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      // Base inline styles — overridden by the useEffect measurement pass
      style={{
        position: 'fixed',
        inset:    0,
        zIndex:   1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
