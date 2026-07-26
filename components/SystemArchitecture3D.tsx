'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Html,
  Line,
  RoundedBox,
  Sphere,
  Icosahedron,
  Float,
  Environment,
} from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

type FlowMode = 'miss' | 'hit' | 'replay';

const COLORS = {
  blue: '#58a6ff',
  green: '#3fb950',
  amber: '#d29922',
  purple: '#bc8cff',
  node: '#1f6feb',
  nodeEdge: '#58a6ff',
  wire: 'rgba(88, 166, 255, 0.55)',
  wireDim: 'rgba(48, 54, 61, 0.6)',
  bg: '#0d1117',
};

interface NodeDef {
  id: string;
  label: string;
  shortLabel: string;
  shape: 'box' | 'sphere' | 'ico';
  position: [number, number, number];
  color: string;
  accent: string;
  size?: number;
  logo: string;
  logoBg?: string;
  logoSize?: number;
}

const NODES: NodeDef[] = [
  {
    id: 'browser',
    label: 'User Browser',
    shortLabel: 'BROWSER',
    shape: 'box',
    position: [-6.0, 1.2, 0.0],
    color: '#161b22',
    accent: COLORS.blue,
    size: 1.1,
    logo: '/chrome-logo.svg',
    logoBg: 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)',
    logoSize: 1.12,
  },
  {
    id: 'api',
    label: 'Next.js API Route',
    shortLabel: 'API',
    shape: 'ico',
    position: [-3.0, 2.0, 0.8],
    color: '#161b22',
    accent: COLORS.purple,
    size: 0.95,
    logo: 'https://cdn.simpleicons.org/nextdotjs/ffffff',
    logoBg: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
  },
  {
    id: 'cache',
    label: 'Cache / DB Lookup',
    shortLabel: 'CACHE',
    shape: 'sphere',
    position: [-0.2, 0.4, -1.6],
    color: '#0f2a17',
    accent: COLORS.green,
    size: 1.0,
    logo: 'https://cdn.simpleicons.org/prisma/ffffff',
    logoBg: 'linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)',
  },
  {
    id: 'cap',
    label: 'Usage Cap Tracker',
    shortLabel: 'CAP',
    shape: 'box',
    position: [0.4, 3.2, 0.6],
    color: '#2a220f',
    accent: COLORS.amber,
    size: 0.85,
    logo: 'https://cdn.simpleicons.org/cloudflare/F38020',
    logoBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
  },
  {
    id: 'github',
    label: 'GitHub GraphQL API',
    shortLabel: 'GITHUB',
    shape: 'ico',
    position: [3.2, 2.2, 2.0],
    color: '#161b22',
    accent: COLORS.blue,
    size: 1.0,
    logo: 'https://cdn.simpleicons.org/github/ffffff',
    logoBg: 'linear-gradient(135deg, #0a0a0a 0%, #1f2937 100%)',
  },
  {
    id: 'metrics',
    label: 'Metrics Engine',
    shortLabel: 'METRICS',
    shape: 'box',
    position: [4.2, 0.2, -1.0],
    color: '#161b22',
    accent: COLORS.purple,
    size: 1.05,
    logo: 'https://cdn.simpleicons.org/chartdotjs/FF6384',
    logoBg: 'linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%)',
  },
  {
    id: 'dashboard',
    label: 'Dashboard UI',
    shortLabel: 'DASH',
    shape: 'box',
    position: [6.8, 1.4, 0.2],
    color: '#0f2a17',
    accent: COLORS.green,
    size: 1.15,
    logo: '/artificial-heart.png',
    logoBg: 'linear-gradient(135deg, #0f2a17 0%, #14532d 100%)',
  },
];

interface EdgeDef {
  id: string;
  from: string;
  to: string;
  via: [number, number, number][];
  color: 'blue' | 'green' | 'amber' | 'dim';
  inModes: FlowMode[];
  order: number;
}

const EDGES: EdgeDef[] = [
  {
    id: 'browser->api',
    from: 'browser',
    to: 'api',
    via: [[-4.5, 1.7, 0.4]],
    color: 'blue',
    inModes: ['miss', 'hit', 'replay'],
    order: 0,
  },
  {
    id: 'api->cache',
    from: 'api',
    to: 'cache',
    via: [[-1.6, 1.2, -0.4]],
    color: 'blue',
    inModes: ['miss', 'hit', 'replay'],
    order: 1,
  },
  {
    id: 'cache->api-hit',
    from: 'cache',
    to: 'api',
    via: [[-1.4, 1.5, -0.2]],
    color: 'green',
    inModes: ['hit', 'replay'],
    order: 2,
  },
  {
    id: 'api->cap',
    from: 'api',
    to: 'cap',
    via: [[-1.0, 2.7, 0.7]],
    color: 'amber',
    inModes: ['miss', 'replay'],
    order: 2,
  },
  {
    id: 'cap->api',
    from: 'cap',
    to: 'api',
    via: [[-1.4, 2.5, 0.9]],
    color: 'amber',
    inModes: ['miss', 'replay'],
    order: 3,
  },
  {
    id: 'api->github',
    from: 'api',
    to: 'github',
    via: [[0.1, 2.3, 1.5]],
    color: 'amber',
    inModes: ['miss', 'replay'],
    order: 4,
  },
  {
    id: 'github->metrics',
    from: 'github',
    to: 'metrics',
    via: [[4.3, 1.2, 0.5]],
    color: 'blue',
    inModes: ['miss', 'replay'],
    order: 5,
  },
  {
    id: 'metrics->cache',
    from: 'metrics',
    to: 'cache',
    via: [[2.0, 0.3, -1.3]],
    color: 'blue',
    inModes: ['miss', 'replay'],
    order: 6,
  },
  {
    id: 'api->dashboard',
    from: 'api',
    to: 'dashboard',
    via: [[1.9, 1.8, 0.5]],
    color: 'blue',
    inModes: ['miss', 'hit', 'replay'],
    order: 7,
  },
  {
    id: 'dashboard->browser',
    from: 'dashboard',
    to: 'browser',
    via: [[0.4, 1.3, 0.1]],
    color: 'green',
    inModes: ['miss', 'hit', 'replay'],
    order: 8,
  },
];

function getNodeById(id: string): NodeDef {
  return NODES.find((n) => n.id === id) || NODES[0];
}

function buildCatmullPath(a: THREE.Vector3, b: THREE.Vector3, via: [number, number, number][]): THREE.Vector3[] {
  const pts = [a, ...via.map((v) => new THREE.Vector3(...v)), b];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
  return curve.getPoints(48);
}

/* ─────────────────────────────────────────────────────────────
   Scene components
   ───────────────────────────────────────────────────────────── */

function NodeMesh({ def, active, accentOverride }: { def: NodeDef; active: boolean; accentOverride?: string }) {
  const accent = accentOverride ?? def.accent;
  const size = def.size ?? 1;
  // logo disc diameter per shape, with per-node scaling via logoSize
  const logoPx = Math.round(96 * (def.shape === 'ico' ? 0.85 : 1) * (def.logoSize ?? 1));

  return (
    <group position={def.position}>
      <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.4}>
        {/* Logo disc centered on the node (billboard via Html) */}
        <Html
          position={[0, 0, 0]}
          center
          distanceFactor={4.2}
          zIndexRange={[40, 10]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            aria-hidden
            style={{
              width: logoPx,
              height: logoPx,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: `2px solid ${accent}${active ? 'ff' : '44'}`,
              boxShadow: active ? `0 0 20px ${accent}aa` : `0 0 10px ${accent}22`,
              transform: `scale(${active ? 1.08 : 1})`,
              transition: 'transform 220ms ease-out, border-color 220ms ease-out, box-shadow 220ms ease-out',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={def.logo}
              alt={def.label}
              draggable={false}
              style={{
                width: '86%',
                height: '86%',
                objectFit: 'contain',
                display: 'block',
                userSelect: 'none',
                // @ts-expect-error — non-standard drag prevention, harmless for actual DOM
                WebkitUserDrag: 'none',
              }}
            />
          </div>
        </Html>
      </Float>

      {/* Hanging short-label tag on top */}
      <Html
        position={[0, size * 0.9 + 0.5, 0]}
        center
        distanceFactor={8}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            padding: '0.28rem 0.6rem',
            borderRadius: 999,
            border: `1px solid ${accent}`,
            background: 'rgba(22, 27, 34, 0.85)',
            color: accent,
            fontFamily: 'SFMono-Regular, Consolas, Menlo, monospace',
            fontSize: 10,
            letterSpacing: '0.08em',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: active ? `0 0 18px ${accent}66` : 'none',
            backdropFilter: 'blur(4px)',
            transition: 'box-shadow 220ms ease-out',
          }}
        >
          {def.shortLabel}
        </div>
      </Html>

      {/* Large floating label below the node (HTML, avoids troika-three-text incompatibility) */}
      <Html
        position={[0, -(size * 0.75 + 0.7), 0]}
        center
        distanceFactor={8}
        zIndexRange={[5, 0]}
        style={{ pointerEvents: 'none', width: 'max-content' }}
      >
        <div
          style={{
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            color: active ? '#eceef1' : '#8b949e',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.85)',
            padding: '2px 6px',
          }}
        >
          {def.label}
        </div>
      </Html>
    </group>
  );
}

function WireEdge({
  edge,
  nodes,
  highlight,
  pulseProgress,
}: {
  edge: EdgeDef;
  nodes: Record<string, NodeDef>;
  highlight: boolean;
  pulseProgress: number;
}) {
  const a = new THREE.Vector3(...nodes[edge.from].position);
  const b = new THREE.Vector3(...nodes[edge.to].position);
  const points = useMemo(
    () => buildCatmullPath(a, b, edge.via),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edge.id],
  );

  const colorKey = edge.color;
  const baseColor =
    colorKey === 'green' ? COLORS.green :
    colorKey === 'amber' ? COLORS.amber :
    colorKey === 'dim' ? '#30363d' : COLORS.blue;

  const visibleColor = highlight ? baseColor : 'rgba(48, 54, 61, 0.55)';
  const lineOpacity = highlight ? 0.95 : 0.4;

  const pulseMeshRef = useRef<THREE.Mesh>(null);
  const curveRef = useMemo(() => {
    const aV = new THREE.Vector3(...nodes[edge.from].position);
    const bV = new THREE.Vector3(...nodes[edge.to].position);
    const pts = [aV, ...edge.via.map((v) => new THREE.Vector3(...v)), bV];
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edge.id]);

  useFrame(() => {
    if (!pulseMeshRef.current) return;
    if (pulseProgress <= 0 || pulseProgress >= 1) {
      pulseMeshRef.current.visible = false;
      return;
    }
    pulseMeshRef.current.visible = highlight;
    const p = Math.min(1, Math.max(0, pulseProgress));
    const pos = curveRef.getPoint(p);
    pulseMeshRef.current.position.copy(pos);
    pulseMeshRef.current.lookAt(curveRef.getPoint(Math.min(1, p + 0.01)));
  });

  return (
    <group>
      <Line
        points={points}
        color={visibleColor}
        lineWidth={highlight ? 3 : 1.2}
        transparent
        opacity={lineOpacity}
      />
      {/* Inner glow line */}
      {highlight && (
        <Line
          points={points}
          color={baseColor}
          lineWidth={0.8}
          transparent
          opacity={0.95}
        />
      )}
      {/* Traveling pulse particle */}
      <mesh ref={pulseMeshRef} visible={false}>
        <sphereGeometry args={[0.09, 18, 18]} />
        <meshBasicMaterial color={baseColor} toneMapped={false} />
      </mesh>
      <pointLight
        color={baseColor}
        intensity={highlight && pulseProgress > 0 && pulseProgress < 1 ? 1.4 : 0}
        distance={1.8}
        decay={2}
      />
      <PulseFollower curve={curveRef} color={baseColor} progress={pulseProgress} enabled={highlight} />
    </group>
  );
}

function PulseFollower({
  curve,
  color,
  progress,
  enabled,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  progress: number;
  enabled: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const trailCount = 10;
  const positions = useMemo(() => new Float32Array(trailCount * 3), []);

  useFrame(() => {
    if (!ref.current || !enabled) return;
    const geo = ref.current.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < trailCount; i++) {
      const t = Math.max(0, progress - i * 0.012);
      if (t <= 0) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -999;
        positions[i * 3 + 2] = 0;
      } else {
        const pt = curve.getPoint(t);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      }
    }
    pos.array = positions;
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.11}
        sizeAttenuation
        transparent
        opacity={enabled ? 0.85 : 0}
        toneMapped={false}
      />
    </points>
  );
}

interface SceneProps {
  mode: FlowMode;
  stepIndex: number;
  pulseByEdge: Record<string, number>;
}

function Scene({ mode, stepIndex, pulseByEdge }: SceneProps) {
  const nodesMap = useMemo(() => {
    const m: Record<string, NodeDef> = {};
    NODES.forEach((n) => (m[n.id] = n));
    return m;
  }, []);

  const stepEdge = EDGES.find((e) => e.order === stepIndex);
  const stepFrom = stepEdge ? stepEdge.from : null;
  const stepTo = stepEdge ? stepEdge.to : null;

  return (
    <>
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, 14, 26]} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={0.75} color="#ffffff" castShadow />
      <pointLight position={[-6, 3, 3]} intensity={0.6} color={COLORS.purple} distance={16} />
      <pointLight position={[7, 2, -4]} intensity={0.5} color={COLORS.blue} distance={14} />
      <pointLight position={[0, -4, 0]} intensity={0.3} color={COLORS.green} distance={12} />

      {/* Ground plane accent */}
      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial
          color="#0a0e14"
          metalness={0.2}
          roughness={0.95}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Grid ring */}
      <mesh position={[0, -2.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.5, 10, 96]} />
        <meshBasicMaterial color={COLORS.blue} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Nodes */}
      {NODES.map((n) => {
        let active = false;
        if (stepEdge) {
          if (n.id === stepFrom) {
            active = true;
          } else if (n.id === stepTo) {
            const progress = pulseByEdge[stepEdge.id] ?? -1;
            if (progress >= 0.9) {
              active = true;
            }
          }
        }
        return <NodeMesh key={n.id} def={n} active={active} />;
      })}

      {/* Edges */}
      {EDGES.map((e) => {
        const highlight = e.inModes.includes(mode) && (mode === 'replay' || e.order <= stepIndex);
        return (
          <WireEdge
            key={e.id}
            edge={e}
            nodes={nodesMap}
            highlight={highlight}
            pulseProgress={pulseByEdge[e.id] ?? -1}
          />
        );
      })}

      <OrbitControls
        enabled={true}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={7.5}
        maxDistance={20}
        minPolarAngle={0.35 * Math.PI}
        maxPolarAngle={0.78 * Math.PI}
        target={[0.8, 1.4, 0]}
      />
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Wrapper with tabs + GSAP-driven step logic
   ───────────────────────────────────────────────────────────── */

const TABS: { id: FlowMode; title: string; sub: string; accent: string }[] = [
  { id: 'miss',  title: 'Cache Miss',  sub: 'Full pipeline',          accent: COLORS.amber },
  { id: 'hit',   title: 'Cache Hit',   sub: 'Fast path (~50 ms)',     accent: COLORS.green },
  { id: 'replay',title: 'Replay',      sub: 'Step-by-step trace',     accent: COLORS.blue  },
];

function edgeOrderMax(mode: FlowMode): number {
  if (mode === 'hit') return 3;
  return 8;
}

export default function SystemArchitecture3D() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<FlowMode>('miss');
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [pulseByEdge, setPulseByEdge] = useState<Record<string, number>>({});
  const startedRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Run step animation whenever mode changes OR section scrolls into view
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const run = () => {
      if (tlRef.current) {
        tlRef.current.kill();
      }
      startedRef.current = true;

      const maxOrder = edgeOrderMax(mode);
      const edgesToRun = EDGES.filter((e) => e.inModes.includes(mode) && e.order <= maxOrder)
        .sort((a, b) => a.order - b.order);

      // Reset
      setStepIndex(-1);
      setPulseByEdge({});

      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      tlRef.current = tl;
      const pulseProgresses: Record<string, number> = {};

      const travelDuration = 1.0;
      const pauseDuration = 1.4;
      const stepDuration = travelDuration + pauseDuration;

      edgesToRun.forEach((e, i) => {
        const pulseObj = { t: -1 };
        pulseProgresses[e.id] = -1;
        const startStep = i * stepDuration;

        // 1. Highlight the current edge/step
        tl.add(() => setStepIndex(e.order), startStep);

        // 2. Animate the pulse/particle traveling along the edge
        tl.to(
          pulseObj,
          {
            t: 1.05,
            duration: travelDuration,
            ease: 'power2.inOut',
            onUpdate: () => {
              pulseProgresses[e.id] = pulseObj.t;
              setPulseByEdge({ ...pulseProgresses });
            },
          },
          startStep + 0.02,
        );
      });

      // Replay mode: keep repeating
      if (mode === 'replay') {
        tl.eventCallback('onComplete', () => {
          window.setTimeout(() => {
            if (sectionRef.current) run();
          }, 900);
        });
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run();
            // For non-replay modes: fire once, then keep observing for re-entry
            if (mode !== 'replay') observer.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (tlRef.current) tlRef.current.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Tab bar GSAP text reveal
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const title = root.querySelector('[data-sa-title]') as HTMLElement | null;
      const sub = root.querySelector('[data-sa-sub]') as HTMLElement | null;
      const tabs = gsap.utils.toArray<HTMLElement>('[data-sa-tab]', root);
      const legend = root.querySelector('[data-sa-legend]') as HTMLElement | null;

      if (reduced) {
        [title, sub, legend, ...tabs].forEach((el) => {
          if (el) gsap.set(el, { clearProps: 'all' });
        });
        return;
      }

      gsap.set(title, { opacity: 0, y: 14 });
      gsap.set(sub, { opacity: 0, y: 10 });
      gsap.set(tabs, { opacity: 0, y: 10, scale: 0.97 });
      gsap.set(legend, { opacity: 0, y: 8 });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.to(title,  { opacity: 1, y: 0, duration: 0.55 }, 0.05)
        .to(sub,    { opacity: 1, y: 0, duration: 0.45 }, 0.18)
        .to(tabs,   { opacity: 1, y: 0, scale: 1, stagger: 0.07, duration: 0.4 }, 0.3)
        .to(legend, { opacity: 1, y: 0, duration: 0.4 }, 0.62);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="system-design" className="w-full max-w-5xl">
      <div className="text-center mb-5">
        <p className="text-xs uppercase tracking-[0.18em] text-purple font-semibold mb-1.5" data-sa-sub>
          System Architecture
        </p>
        <h2 className="text-xl md:text-2xl tracking-tight" data-sa-title>
          Explore the data flow in 3D
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-4">
        {TABS.map((t) => {
          const selected = mode === t.id;
          return (
            <button
              key={t.id}
              data-sa-tab
              onClick={() => setMode(t.id)}
              className="relative rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200"
              style={{
                borderColor: selected ? t.accent : 'var(--border)',
                backgroundColor: selected ? `${t.accent}14` : 'var(--bg-surface)',
                color: selected ? t.accent : 'var(--text-muted)',
                boxShadow: selected ? `0 0 0 1px ${t.accent}44, 0 6px 20px -10px ${t.accent}aa` : undefined,
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.accent, boxShadow: `0 0 8px ${t.accent}` }}
                />
                {t.title}
                <span className="hidden sm:inline text-[0.7rem] opacity-80 font-normal">· {t.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5 mb-3 text-xs text-muted" data-sa-legend>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.blue, boxShadow: `0 0 6px ${COLORS.blue}` }} />
          Main pipeline
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}` }} />
          Cache hit · fast path
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.amber, boxShadow: `0 0 6px ${COLORS.amber}` }} />
          Cache miss · GitHub fetch
        </span>
        <span className="inline-flex items-center gap-1.5 opacity-80">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Click model to orbit and explore
        </span>
      </div>

      {/* 3D scene */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border"
        style={{
          height: 'min(72vh, 560px)',
          minHeight: 440,
          borderColor: 'var(--border)',
          backgroundColor: COLORS.bg,
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 70px -25px rgba(0,0,0,0.8), 0 0 0 1px rgba(163,113,247,0.05)',
        }}
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [1.0, 2.2, 12.5], fov: 42, near: 0.1, far: 60 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Scene
            mode={mode}
            stepIndex={stepIndex}
            pulseByEdge={pulseByEdge}
          />
        </Canvas>

        {/* Corner HUD */}
        <div
          className="pointer-events-none absolute left-3 top-3 rounded-lg border px-3 py-2 backdrop-blur-md"
          style={{
            borderColor: 'rgba(48, 54, 61, 0.8)',
            backgroundColor: 'rgba(22, 27, 34, 0.68)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.03em',
          }}
        >
          <div className="mb-1 font-semibold" style={{ color: TABS.find((x) => x.id === mode)?.accent }}>
            MODE · {mode.toUpperCase()}
          </div>
          <div className="text-muted">
            STEP {Math.max(0, stepIndex + 1)} / {edgeOrderMax(mode) + 1}
          </div>
        </div>

        <div
          className="pointer-events-none absolute right-3 top-3 rounded-lg border px-3 py-2 backdrop-blur-md"
          style={{
            borderColor: 'rgba(48, 54, 61, 0.8)',
            backgroundColor: 'rgba(22, 27, 34, 0.68)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            maxWidth: 260,
          }}
        >
          <div className="mb-1 text-muted">Current step</div>
          <div style={{ color: 'var(--text)' }}>
            {(() => {
              const edge = EDGES.find((e) => e.order === stepIndex);
              if (!edge || stepIndex < 0) return 'Idle · awaiting first packet';
              const from = getNodeById(edge.from).label;
              const to = getNodeById(edge.to).label;
              return `${from}  →  ${to}`;
            })()}
          </div>
        </div>
      </div>
    </section>
  );
}
