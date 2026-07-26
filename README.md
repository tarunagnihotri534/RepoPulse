# MCP Repository Health Tracker

A hosted, multi-tenant web app that lets any visitor submit a public GitHub
repository and get a live health dashboard — issue response times, PR review
velocity, contributor growth, triage backlog, and a composite 0–100 health
score with a letter grade.

---

## Architecture

```
Browser  →  Next.js App Router
             │
             ├── app/page.tsx               Submission form + usage meter
             ├── app/dashboard/[owner]/[repo]/page.tsx  Dashboard (tabbed)
             │
             ├── app/api/analyze  POST       Cache check → GitHub fetch → DB write
             └── app/api/usage    GET        Global monthly counter

             lib/
             ├── github/client.ts           GitHub GraphQL API (unchanged logic)
             ├── metrics/                   Pure metric calculators (unchanged)
             ├── aggregator.ts              On-demand orchestration (no file I/O)
             └── db.ts                      Prisma + SQLite helpers

             prisma/schema.prisma
             ├── repo_cache                 owner, repo, snapshotJson, cachedAt
             └── usage                      month (YYYY-MM), count
```

**Data flow:**
1. User submits `owner/repo` → `POST /api/analyze`
2. Server checks SQLite cache — if fresh (<6 h), returns immediately
3. If stale/missing: checks global monthly cap (default 50/month)
4. If under cap: calls GitHub GraphQL API, computes all metrics, stores result, increments counter
5. Dashboard renders from the returned `DailySnapshot` JSON

---

## Running locally

### Prerequisites

- Node.js 18+
- A GitHub fine-grained Personal Access Token

### 1 — Clone and install

```bash
git clone https://github.com/YOUR_USER/mcp-repo-datatracker
cd mcp-repo-datatracker
npm install
```

### 2 — Create a GitHub PAT

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. **Repository access:** Public Repositories (read-only)
3. **Permissions:** Contents → Read-only
4. Copy the token

### 3 — Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
GITHUB_TOKEN=ghp_your_token_here
DATABASE_URL=file:./tracker.db
```

### 4 — Initialise the database

```bash
npx prisma db push
```

This creates `tracker.db` in the repo root.

### 5 — Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter any public repo, and click **Analyse Repository**.

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | Yes | — | GitHub fine-grained PAT (server-side only) |
| `DATABASE_URL` | Yes | — | SQLite path, e.g. `file:./tracker.db` |
| `MONTHLY_CAP` | No | `50` | Global lookup cap per calendar month |
| `SLACK_WEBHOOK_URL` | No | — | Slack incoming webhook for weekly digest |

---

## Usage cap

The cap is **global** — 50 total lookups across all visitors per month.

- **Cache hits** (same repo looked up within 6 hours) do **not** count against the cap
- Once the cap is reached, visitors see a clear message; previously-cached repos still load
- Cap resets on the 1st of each month
- Adjust with `MONTHLY_CAP=N` environment variable

---

## Deploying to Vercel

Vercel is the recommended deployment target for Next.js + SQLite (using the filesystem for the DB file, or swap to Turso/LibSQL for a persistent remote DB).

```bash
npm install -g vercel
vercel
```

Set environment variables in the Vercel dashboard:
- `GITHUB_TOKEN`
- `DATABASE_URL` → `file:/tmp/tracker.db` (ephemeral) or a remote DB URL
- `MONTHLY_CAP` (optional)

**Note:** Vercel's serverless functions have an ephemeral filesystem — the SQLite
file resets between deployments. For persistence across deployments use
[Turso](https://turso.tech) (drop-in LibSQL driver) or
[PlanetScale](https://planetscale.com) / Railway with a Postgres Prisma adapter.

### Deploying to Railway (persistent SQLite)

Railway gives you a persistent volume, making SQLite work properly long-term:

1. Create a new Railway project from your GitHub repo
2. Add a Volume mounted at `/data`
3. Set `DATABASE_URL=file:/data/tracker.db`
4. Set `GITHUB_TOKEN` and optionally `MONTHLY_CAP`
5. Deploy — Railway runs `prisma migrate deploy` via the build command

---

## Slack Digest

The `scripts/slack-digest.ts` script reads all cached snapshots from the SQLite
database and posts a Block Kit summary to a Slack incoming webhook.

```bash
# Preview (no webhook)
DATABASE_URL=file:./tracker.db npx ts-node --esm scripts/slack-digest.ts --dry-run

# Post for real
DATABASE_URL=file:./tracker.db \
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... \
  npx ts-node --esm scripts/slack-digest.ts
```

A GitHub Actions workflow (`.github/workflows/slack-digest.yml`) runs this
every Monday at 09:00 UTC. Set `DATABASE_URL` and `SLACK_WEBHOOK_URL` as
repository secrets.

---

## Project structure

```
├── app/
│   ├── layout.tsx                  Root layout (nav + footer)
│   ├── page.tsx                    Landing page + submission form
│   ├── globals.css
│   ├── api/
│   │   ├── analyze/route.ts        POST — cache check, cap enforcement, aggregation
│   │   └── usage/route.ts          GET  — monthly counter
│   └── dashboard/[owner]/[repo]/
│       └── page.tsx                Tabbed dashboard (Overview, Issues, PRs, Contributors, Trends)
├── components/
│   ├── GradeBanner.tsx
│   ├── StatCard.tsx
│   ├── BreakdownBar.tsx
│   ├── MetricsGrid.tsx
│   ├── LabelTable.tsx
│   ├── ContributorList.tsx
│   ├── PRTable.tsx
│   └── TrendCharts.tsx             react-chartjs-2 (line, bar, radar)
├── lib/
│   ├── types/index.ts              All TypeScript interfaces
│   ├── github/                     GraphQL client + queries
│   ├── metrics/                    Pure metric calculators
│   ├── utils/                      time, math helpers
│   ├── aggregator.ts               On-demand fetch → compute → return snapshot
│   └── db.ts                       Prisma helpers + usage cap
├── prisma/
│   └── schema.prisma               SQLite: repo_cache + usage tables
├── scripts/
│   └── slack-digest.ts             Standalone weekly Slack summary
└── .github/workflows/
    └── slack-digest.yml            Weekly cron (Mondays 09:00 UTC)
```

---

## Troubleshooting

**`GITHUB_TOKEN` not found**
Make sure `.env.local` exists and contains `GITHUB_TOKEN=ghp_...`

**`tracker.db` not found / Prisma errors**
Run `npx prisma db push` to create the database and apply the schema.

**Repository not found (404)**
Only public repositories are supported. Check spelling — owner and repo are case-insensitive.

**Monthly limit reached**
The global cap of 50 lookups has been used. Previously-cached repos still work. Resets on the 1st of the month, or increase `MONTHLY_CAP` in your env.

**Charts not rendering**
Chart.js is loaded client-side only. Make sure JavaScript is enabled and the browser supports ES2020.

**Rate limit errors from GitHub**
Each lookup costs ~100–400 GraphQL points. At 50 lookups/month with a 5,000 points/hour limit this is not a constraint. If you see rate limit errors, wait for the reset window shown in the error message.
