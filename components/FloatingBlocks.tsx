'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface BlockConfig {
  size: number;
  left: number;
  top: number;
  duration: number;
  delay: number;
  rotate: number;
}

const BLOCK_COUNT = 18;

function generateBlocks(): BlockConfig[] {
  const blocks: BlockConfig[] = [];
  for (let i = 0; i < BLOCK_COUNT; i++) {
    blocks.push({
      size: 14 + Math.random() * 34,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 18 + Math.random() * 22,
      delay: Math.random() * 8,
      rotate: Math.random() * 180 - 90,
    });
  }
  return blocks;
}

export default function FloatingBlocks() {
  const blocksRef = useRef<HTMLDivElement | null>(null);
  const blocksDataRef = useRef<BlockConfig[]>(generateBlocks());

  useEffect(() => {
    const container = blocksRef.current;
    if (!container) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const blockEls = gsap.utils.toArray<HTMLElement>('[data-float-block]', container);

      if (reduced) {
        blockEls.forEach((el, i) => {
          const cfg = blocksDataRef.current[i];
          if (!cfg) return;
          gsap.set(el, {
            width: cfg.size,
            height: cfg.size,
            left: `${cfg.left}%`,
            top: `${cfg.top}%`,
            opacity: 0.55,
            rotate: cfg.rotate,
          });
        });
        return;
      }

      blockEls.forEach((el, i) => {
        const cfg = blocksDataRef.current[i];
        if (!cfg) return;

        gsap.set(el, {
          width: cfg.size,
          height: cfg.size,
          left: `${cfg.left}%`,
          top: `${cfg.top}%`,
          opacity: 0,
          rotate: cfg.rotate,
        });

        gsap.to(el, {
          opacity: 0.55,
          duration: 1.2,
          delay: cfg.delay * 0.2,
          ease: 'power2.out',
        });

        gsap.to(el, {
          y: `random(-35, 35, 5)`,
          duration: cfg.duration,
          delay: cfg.delay,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });

        gsap.to(el, {
          x: `random(-28, 28, 4)`,
          duration: cfg.duration * 1.3,
          delay: cfg.delay * 0.6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });

        gsap.to(el, {
          rotate: cfg.rotate + `random(-40, 40, 10)`,
          duration: cfg.duration * 1.8,
          delay: cfg.delay * 0.3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div className="floating-blocks" ref={blocksRef} aria-hidden="true">
      {blocksDataRef.current.map((_, i) => (
        <span key={i} className="floating-block" data-float-block />
      ))}
    </div>
  );
}
