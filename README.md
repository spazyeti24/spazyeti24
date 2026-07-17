# JobHunt OS v2

A local-first job-hunting app that runs the full loop:

**fetch listings** (JSearch / Adzuna) → **score each against your resume with Claude** (`claude-sonnet-4-6`) → **tailor materials** (resume bullets, cover letters, outreach) → **track applications** through a kanban pipeline.

Everything role-specific — resume, target roles, locations, score threshold, extra scoring instructions — is user-editable data on the Profile page. Nothing is hardcoded to any particular role.

## Stack

- `/server` — Node + Express + TypeScript, SQLite via Drizzle ORM (`./data/jobhunt.db`)
- `/web` — React + Vite + TypeScript + Tailwind
- `/shared` — TypeScript types imported by both

## Setup

```bash
# 1. Install dependencies (root, server, and web)
npm run install:all

# 2. Configure environment
cp .env.example .env
# ...then fill in the keys you have (see below)

# 3. (Optional) seed a sample profile + 3 fake jobs so the UI isn't empty
npm run seed

# 4. Run — server on :3001, web on :5173 (proxies /api to the server)
npm run dev
```

Open http://localhost:5173. Start on the **Profile** page — your resume and preferences drive scoring and tailoring.

Database tables are created automatically on first server start (migrations in `server/drizzle/` are applied at boot).

## API keys

All integrations are optional except Anthropic (needed for scoring/tailoring). The sidebar status panel and server startup log show which are active. Missing keys produce clear errors, never silent failures.

| Key | Where to get it |
| --- | --- |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| `RAPIDAPI_KEY` (JSearch) | [JSearch on RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) — subscribe (free tier available), key is under "X-RapidAPI-Key" |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | [Adzuna developer portal](https://developer.adzuna.com/) — register an app |

## How it works

1. **Profile** — edit your resume (markdown), target roles, locations, remote preference, salary floor, score threshold (default 70), and free-form extra scoring instructions.
2. **Searches** — save search configs (query, location, sources), run individually or all at once. Fetch summaries show new / duplicate / error counts per source. Optional "auto-score after fetch" toggle.
3. **Jobs** — sortable/filterable list. "Score new jobs" batches through unscored jobs (3 at a time) with live progress. Scores include sub-scores (fit, requirements, growth, comp), strengths, gaps, and a one-line verdict. Full job descriptions are always sent to the model — never truncated.
4. **Tailoring** — from a tracked application, generate resume bullets, a cover letter, or an outreach message, grounded in your resume plus the score's strengths/gaps. Regenerate with an optional note ("emphasize X").
5. **Tracker** — kanban board (interested → applied → screening → interview → offer / rejected / withdrawn) with drag-and-drop, next actions with overdue highlighting, and a detail drawer with the job description, score breakdown, materials, and notes.
6. **Dashboard** — new jobs awaiting review, high scorers this week, pipeline counts, upcoming next actions.

## Deploy later (not built yet, path kept clean)

- **Postgres:** swap the driver in `server/src/db/index.ts` and the dialect in `server/drizzle.config.ts` to Neon/Postgres — schema avoids SQLite-only features.
- **Hosting:** server and web deploy separately (Railway/Render + Vercel), or serve `web/dist` statically from Express.
- **Auth:** none in v1 (local only). Middleware would slot in at the `/api` mount point in `server/src/index.ts`.
