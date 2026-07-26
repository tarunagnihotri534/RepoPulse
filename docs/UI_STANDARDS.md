# RepoPulse UI Standards

## Overview
RepoPulse follows a dark-first, GitHub-inspired design system with subtle purple-accented
call-to-actions, grid-based depth, and typewriter/console aesthetics for developer-focused
content. All surfaces must be accessible (minimum 4.5:1 contrast) and animate on a
120&nbsp;ms / 240&nbsp;ms / 360&nbsp;ms GSAP timeline.

---

## 1 — Colour Palette

| Token           | Hex        | Usage                                                                 |
|-----------------|------------|-----------------------------------------------------------------------|
| `--bg-base`     | `#0d1117`  | Page background, used behind the subtle grid overlay                  |
| `--bg-surface`  | `#161b22`  | Cards, forms, console window, navbar backdrop                         |
| `--border`      | `#30363d`  | 1 px dividers, card outlines, input borders                           |
| `--text`        | `#c9d1d9`  | Primary body copy                                                     |
| `--text-muted`  | `#8b949e`  | Secondary labels, placeholder text, helper copy                       |
| `--accent`      | `#58a6ff`  | Links, focus rings, primary CTA (blue variant)                        |
| `--purple`      | `#bc8cff`  | Hero gradient stop, pill highlights, progress fill                    |
| `--purple-cta`  | `#a371f7`  | Primary CTA background — must use dark foreground `#0d1117`           |
| `--success`     | `#3fb950`  | Grade A/B, checkmarks, usage bar < 70 %                               |
| `--warning`     | `#d29922`  | Grade C/D, usage bar 70–90 %, soft alerts                             |
| `--danger`      | `#f85149`  | Grade F, error alerts, usage bar ≥ 90 %, form errors                  |

All tokens are mirrored as Tailwind utilities (`surface`, `border`, `muted`, `accent`,
`purple`, `success`, `warning`, `danger`) in `tailwind.config.ts`.

---

## 2 — Typography

| Role            | Stack / Size                          | Weight | Tracking |
|-----------------|---------------------------------------|--------|----------|
| Display (H1)    | 3.5–5 rem / 60–80 px, clamp allowed   | 800    | -0.02 em |
| Section title   | 1.75 rem / 28 px                      | 700    | tight    |
| Card title      | 1 rem / 16 px                         | 600    | normal   |
| Body            | 1 rem / 16 px (leading 1.6)           | 400    | normal   |
| Helper / meta   | 0.75–0.875 rem / 12–14 px             | 400    | normal   |
| Monospace       | SFMono / Consolas / Menlo             | 400    | 0        |

**Monospace** is used **exclusively** for: the console component, code tokens in
documentation, and the owner/repo input values. Do **not** use monospace for headings
or regular copy.

---

## 3 — Layout & Spacing

- Root grid: **8 px** base unit. Multiples of 4 (0.25 rem) are accepted only for
  micro-adjustments (padding inside buttons, form row gaps).
- Max content width: `max-w-5xl` on the landing page; dashboard may stretch to
  `max-w-6xl`.
- Hero section must sit on top of a **dotted grid overlay** (`background-image:
  linear-gradient` producing 1 px dots every 32 px) with a 6 % opacity purple
  radial wash at the top.
- Cards use the formula: `rounded-xl border border-border bg-surface p-6 shadow-lg`
  with a 240 ms `opacity` + `y:12` in-animation.

### Depth (shadows)

| Elevation | Shadow tokens (Tailwind arbitrary)                                     |
|-----------|------------------------------------------------------------------------|
| Flat      | `shadow-none` — input bases, unstyled rows                             |
| Low       | `shadow-md`  — hovered cards, dropdowns                                |
| High      | `shadow-[0_20px_60px_-15px_rgba(163,113,247,0.35)]` — purple-glow CTA  |

---

## 4 — Components

### 4.1 Navbar
- Sticky `top-0`, 56 px tall, `border-b border-border bg-surface/90 backdrop-blur`.
- Left: `RepoPulse` wordmark (no icon) in 600 weight; no hover underline.
- Right: up to two items — a **link** (`Repo Health Checker`) and optionally a
  secondary **ghost button**. **Sign up / Log in are NOT present.**
- GSAP behaviour: nav fades in from `y:-8` at 360 ms, opacity 0→1.

### 4.2 Primary button (purple CTA)
```
rounded-lg bg-[#a371f7] hover:bg-[#a371f7]/90
px-6 py-3 font-semibold text-[#0d1117]
focus:ring-2 focus:ring-[#a371f7]/60
transition-colors
```
Animate in from `scale:0.96, opacity:0` with 120 ms overshoot.

### 4.3 Ghost / secondary button
White border, transparent fill, `hover:bg-surface` — identical padding and radius
to the primary button so they align perfectly when placed side by side.

### 4.4 Text inputs
- 8 px radius, 1 px `border-border`, `bg-[#0d1117]` fill.
- `px-4 py-2.5` internal padding; 14 px text.
- Focus state drops default outline, applies `ring-2 ring-accent/60`.
- **Labels** sit above the input (not floating) in 12–13 px semibold.

### 4.5 Console window
- Rounded `xl` with a macOS-style traffic-light header (red/yellow/green 12 px dots).
- Body background `#11161d`, `font-mono`, 14 px, `p-6`.
- Lines prefixed with `$ ` (PS1) animate letter-by-letter via GSAP `text` plugin or
  a staggered `<span>` reveal at 22 ms per character.
- Output lines are indented one level and coloured: success → `#3fb950`, metadata →
  `#8b949e`, accent value → `#bc8cff`.
- Footer strip shows live counters (e.g. `3 AGENTS · 1,284 DOCS`) with a 1 px top
  border and 20 px horizontal padding.

### 4.6 Feature / metric cards
- 2×2 grid on `sm`, 1 column on mobile.
- Icon or mark left-aligned on the first line; title semibold; description `text-muted`
  14 px, 1.55 line-height.
- Hover: `translate-y(-1px)` + `border-[#a371f7]/40` 200 ms ease-out.

---

## 5 — Animation Spec (GSAP)

All animations live in client components inside a `useGSAP` / `useEffect + gsap.context`
block so they auto-cleanup. Use `gsap.timeline({ defaults: { ease: "power3.out" } })`
for coordinated page-load sequences.

### 5.1 Landing page timeline (total ≈ 1.1 s)

| Time  | Target             | From                | To           | Duration |
|-------|--------------------|---------------------|--------------|----------|
| 0.00  | Navbar             | y:-8, opacity:0     | y:0, op:1    | 0.36 s   |
| 0.12  | H1 display         | y:16, opacity:0,    | y:0, op:1    | 0.60 s   |
| 0.28  | Hero paragraph     | y:12, opacity:0     | y:0, op:1    | 0.50 s   |
| 0.44  | CTA row (buttons)  | y:10, opacity:0,    | y:0, op:1    | 0.42 s   |
| 0.62  | Console window     | y:20, opacity:0     | y:0, op:1    | 0.50 s   |
| 1.00  | Feature cards      | stagger 0.06 s each |              | 0.42 s   |
| 1.00  | Usage meter fill   | width:0%            | width:N%     | 0.80 s   |

### 5.2 Micro-interactions
- **Buttons**: `scale:1.02` on `pointerdown`, back to 1 on release (80 ms).
- **Inputs**: border colour transitions only — no scale.
- **Links**: underline expands from left on hover 200 ms.
- **Form submit**: button copy swaps to `Analysing...` and disables; a 2 px
  indeterminate progress bar grows along the card's top edge while waiting.

### 5.3 Scroll-triggered elements
Reserved for future expansion — if added, use `ScrollTrigger` with
`start: "top 85%"` and `toggleActions: "play none none none"`. Never pin or scrub the
primary hero; keep page load performant on low-end devices.

---

## 6 — Accessibility

- All interactive elements are reachable by Tab; focus ring MUST be visible
  (ring-2 accent/60, 0 offset).
- Heading order: one `<h1>` per page, strictly `h2` → `h3` below it.
- Colour alone never conveys state — pair every green/red metric with a glyph
  (checkmark, warning triangle) or a plain-text word.
- Console animations respect `prefers-reduced-motion`: when set, reveal text
  instantly with no stagger.
- Form errors use `role="alert"` and reference inputs via `aria-describedby`.

---

## 7 — Anti-patterns (DO NOT)

1. Add a **Sign up** or **Log in** button anywhere in the product surface.
2. Use bright (non-dark) themes or white backgrounds for primary pages.
3. Mix more than one accent colour (purple + blue is the allowed pair; never
   green/orange for CTAs).
4. Apply blur over the hero text layer — blur is reserved for the backdrop
   radial wash only.
5. Introduce ad-hoc spacings not divisible by 8 px.
6. Re-create animations with CSS `@keyframes` when GSAP is already available —
   centralise timeline logic for consistency.
