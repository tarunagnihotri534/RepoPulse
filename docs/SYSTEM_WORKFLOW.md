# RepoPulse System Workflow

## 1 — Product Purpose
RepoPulse is a hosted, multi-tenant web app that lets **any unauthenticated visitor**
submit a public GitHub repository (`owner/repo`) and receive a live, visual health
dashboard covering issue response times, PR review velocity, contributor growth,
triage backlog, and a composite 0–100 health score with a letter grade (A–F).

There are **no user accounts, no sign-up, and no login**. Rate limiting is enforced
**globally** across all visitors per calendar month.

---

## 2 — High-Level Actors

| Actor            | Capability                                                        |
|------------------|-------------------------------------------------------------------|
| Visitor          | Submit a repo, view cached dashboards, no write access            |
| GitHub API       | GraphQL endpoint — supplies raw issue / PR / contributor data     |
| SQLite / Prisma  | Caches snapshots, counts monthly usage                            |
| Slack Webhook    | (Optional) receives a weekly digest of all cached repos           |
| Ops / Admin      | Sets env vars, deploys, triggers Slack digest on schedule         |

---

## 3 — End-to-End Workflows

### 3.1 Landing → Repo Health Checker → Submit

```
Visitor opens "/"
   │
   ▼
Navbar "RepoPulse" + "Repo Health Checker" link load (GSAP fade-in 0–0.36 s)
Hero headline + copy animate in
Console window animates in showing how to run the project
   │
   ▼
Visitor clicks "Repo Health Checker" (nav or hero CTA)
   │
   ▼
Page smooth-scrolls to the Analyser card
   │
   ▼
Visitor fills:
  • Owner / Organisation field   (e.g. modelcontextprotocol)
  • Repository name field        (e.g. servers)
   │
   ▼
Clicks "Analyse Repository"
   │
   ├─► Form validation: both fields non-empty?
   │      └─ No  → inline error, return
   │
   └─► POST /api/analyze  { owner, repo }
            │
            ├─► Step A — Cache check
            │     ├─ SQLite repo_cache row matching (owner, repo)
            │     └─ cachedAt within 6 hours?
            │           ├─ YES → return cached snapshot (NOT counted against cap)
            │           └─ NO  → continue
            │
            ├─► Step B — Global monthly cap check
            │     ├─ usage.count for current YYYY-MM
            │     └─ count >= MONTHLY_CAP (default 50)?
            │           ├─ YES → 429 JSON { error }
            │           └─ NO  → continue
            │
            ├─► Step C — GitHub GraphQL fetch
            │     ├─ lib/github/client.ts → graphql queries
            │     ├─ fetch: issues, PRs, reviews, labels, stargazers,
            │     │       forks, contributors, commit activity
            │     └─ GitHub 404 / not public → 404 JSON { error }
            │
            ├─► Step D — Metrics aggregation
            │     └─ lib/aggregator.ts + lib/metrics/*.ts
            │           computes:
            │             • healthScore (0–100) + letter grade
            │             • issue first-response / close times
            │             • PR review latency, merge time, merge rate
            │             • contributor growth, top-10 leaderboard
            │             • trend series (stars, forks, issues, PRs)
            │
            ├─► Step E — Persist
            │     ├─ UPSERT repo_cache (owner, repo, snapshotJson, cachedAt=now)
            │     └─ INCREMENT usage.count for current month
            │
            └─► Step F — Response 200 JSON { snapshot, cachedAt, fromCache:false }
   │
   ▼
Browser: router.push("/dashboard/[owner]/[repo]")
   │
   ▼
Dashboard page loads the same POST /api/analyze internally to fill its state
   • fromCache=true (99.9 % of the time — cached 2 ms prior)
   • renders GradeBanner, StatCards, tabbed sections
   • Charts.js renders on the client (dynamic import, SSR disabled)
```

### 3.2 Usage Meter on Landing

The landing page issues `GET /api/usage` at mount:
- Returns `{ month, count, cap, remaining, limitReached }`
- The meter bar fills to `count / cap × 100 %` with `success / warning / danger`
  colouring at the thresholds 70 % / 90 %.
- If `limitReached === true` the submit button is disabled and a helper copy
  explains the reset date (1st of next month).

### 3.3 Cached Repo Revisit

When a user (same or different) returns to `"/dashboard/[owner]/[repo]"` within
6&nbsp;hours the **POST /api/analyze** still runs but takes the `Cache hit` branch:
- `fromCache: true` in the response.
- `usage.count` is **not** incremented.
- Response latency: sub-50 ms (SQLite local read).

### 3.4 Weekly Slack Digest (cron)

Every **Monday 09:00 UTC**, `.github/workflows/slack-digest.yml` runs:

```
Actions runner
  └─ ts-node lib/scripts/slack-digest.ts
       ├─ SELECT * FROM repo_cache
       ├─ compute headline stats, worst/best 3 repos by healthScore
       ├─ build Slack Block Kit payload
       └─ POST to SLACK_WEBHOOK_URL
```

Dry-run mode: `--dry-run` prints the JSON to stdout, no webhook call.

---

## 4 — Core Modules & Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                        app/ (Next.js App Router)            │
│                                                             │
│  layout.tsx       RepoPulse navbar + footer, no auth        │
│  page.tsx         Hero + Console + Health Checker form      │
│                   + Feature grid + Usage meter              │
│                                                             │
│  dashboard/       Tabbed dashboard (Overview / Issues /     │
│  [owner]/[repo]   PRs / Contributors / Trends)              │
│                                                             │
│  api/analyze      POST  cache → cap → GitHub → aggregate    │
│  api/usage        GET   monthly counter JSON                │
└──────────────────────────────────┬──────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────┐
│                         lib/ (pure Node)                    │
│                                                             │
│  github/client.ts   GraphQL fetch, 1 retry, typed response  │
│  github/queries.ts  Raw GraphQL documents                   │
│                                                             │
│  metrics/*.ts       Pure calculators — no side effects      │
│                     health, issues, pullRequests,           │
│                     contributors                            │
│                                                             │
│  aggregator.ts      Orchestrates fetch → metrics → snapshot │
│  db.ts              Prisma wrapper + cap enforcement        │
│  types/index.ts     DailySnapshot and all DTOs              │
│  utils/             time formatting, math helpers           │
└──────────────────────────────────┬──────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────┐
│                         prisma/                             │
│  schema.prisma:                                                │
│    repo_cache  (owner PK, repo PK, snapshotJson, cachedAt) │
│    usage       (month PK, count)                            │
└─────────────────────────────────────────────────────────────┘
```

### Boundary rules
- **UI → API boundary**: Only `JSON.stringify`-able primitives cross.
  Components never call GitHub or Prisma directly.
- **API → metrics boundary**: `lib/metrics/*` are pure; no network, no DB.
  They accept typed data bags and return typed metric bags.
- **DB → API boundary**: Only `db.ts` imports Prisma; routes never do.
  This keeps the cap logic and cache window in one place.

---

## 5 — Error Contracts

| HTTP Status | Scenario                                                       | Body shape                      |
|-------------|----------------------------------------------------------------|---------------------------------|
| 200         | Success (fresh or cached)                                      | `{ snapshot, cachedAt, fromCache }` |
| 400         | Missing `owner` or `repo` field                                | `{ error: "…" }`                |
| 404         | GitHub repo missing, private, or GraphQL returned NOT_FOUND   | `{ error: "… not found / private …" }` |
| 429         | Global monthly lookup cap exhausted                            | `{ error: "Monthly limit of N lookups reached. Resets on the 1st of next month." }` |
| 500         | Uncaught GitHub error / DB error                               | `{ error: "Something went wrong. Please try again." }` |

**UI handling:**
- Form errors render inline above the submit button with `role="alert"`.
- Dashboard errors render a full-height call-to-action back to search.
- Network-level failures (no response body) show a fixed "Network error —
  please check your connection and try again." copy.

---

## 6 — Performance & Cache Contracts

| Item                                 | SLA / Value                       |
|--------------------------------------|-----------------------------------|
| LCP landing page (hero visible)      | < 1.2 s, no blocking JS           |
| Chart.js bundle                      | `dynamic(() => …, { ssr: false })`|
| Cache TTL for repo snapshots         | 6 hours (enforced server-side)    |
| Global cap default                   | 50 lookups / month, env-override  |
| Cache hit — does NOT count vs cap    | ✓ yes                             |
| GitHub GraphQL points per lookup     | 100–400                           |
| Dashboard cold-load time             | 10–20 s (GitHub-bound), then cached |

---

## 7 — Local Development Loop (Console Story)

The console component on the landing page walks a developer through these
commands in a typed-terminal animation, matching the flow documented in
`README.md`:

```bash
$ git clone https://github.com/YOUR_USER/RepoPulse
$ cd RepoPulse
$ npm install
$ cp .env.example .env.local
#   → GITHUB_TOKEN=ghp_…
#   → DATABASE_URL=file:./tracker.db
$ npx prisma db push
$ npm run dev
✔ ready on http://localhost:3000
```

The console footer shows live-simulated counters to give visitors immediate
context on what the app produces:

```
12 REPOS ANALYSED · 486 ISSUES · 2,314 PRs · 1,028 CONTRIBUTORS
```

---

## 8 — Deployment Targets (reference)

- **Vercel** — works, but SQLite file is ephemeral. Use `file:/tmp/tracker.db`
  for a throwaway install, or swap `DATABASE_URL` to Turso/LibSQL for
  persistence.
- **Railway + Volume** — persistent SQLite on `/data`. The recommended
  self-host path.
- Any Node 18+ host that runs `prisma migrate deploy` at build time and
  exposes a filesystem path for SQLite will work.

---

## 9 — Non-Goals (Explicitly Out of Scope)

1. User accounts, sign-up, login, per-user API keys.
2. Private repo analysis. Only public repos are supported.
3. Real-time streaming updates. All snapshots are point-in-time, refreshed
   on-demand with the 6-hour cache window.
4. Historical trend archives longer than what GitHub returns in one page
   of results (≈ 1 year).
