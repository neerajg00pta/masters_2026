# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Masters Fantasy Golf Pool — a web app for running a multi-player fantasy golf draft pool for the Masters Tournament. Players draft golfers before the tournament, then earn points based on their golfers' performance across all four rounds. Deployed to GitHub Pages. See `pool-platform-spec.md` for the universal pool platform architecture, and `functional-spec.md` for the Masters-specific game rules.

## Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # TypeScript check + Vite build (output: dist/)
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

## Architecture

### Stack
- **Frontend:** React 19 + TypeScript (strict mode), Vite 8, React Router v7
- **Hosting:** GitHub Pages (static files only)
- **Database:** Supabase (PostgreSQL) — direct client access via `@supabase/supabase-js`
- **Live Scores:** ESPN or PGA Tour API, polled client-side

### Data Model

All state lives in Supabase. Four core tables per `pool-platform-spec.md`:

- **`config`** (single row) — `pool_locked`, `live_scoring`, draft settings (picks per player, snake draft order, etc.)
- **`users`** — player accounts (name, email, admin flag, paid flag)
- **`selections`** — draft picks: `golfer_id + user_id + pick_order` (composite PK). Each player drafts N golfers before the tournament starts.
- **`events`** — golfer tournament entries: golfer name, scores per round (R1–R4), total score, status (`scheduled`/`live`/`final`/`cut`), `external_id` for API matching, `score_locked`

### Authentication

No passwords. Email-based access codes per the platform spec. Admin creates users, distributes invite links (`?token=email`). Cookie-based sessions (30-day). Hidden admin activation via keystroke.

### Routing

- `/` — Login (if no session) or Draft Board + Leaderboard (if logged in)
- `/rules` — Game rules and scoring
- `/admin` — Pool settings + user management
- `/admin/events` — Golfer/score management + live scoring controls

### GitHub Pages Deployment

- Vite `base` set to `/<repo-name>/`
- GitHub Actions workflow builds and deploys on push to `main`
- HashRouter required (GitHub Pages doesn't support SPA fallback)

### Fantasy Golf Game Logic

- **Draft Phase (setup):** Players draft golfers in order (snake draft or similar). Each player picks N golfers. Pool is locked when draft completes.
- **Tournament Phase (gameplay):** Four rounds of golf. Scores flow in via live API or manual admin entry. Player standings update based on their drafted golfers' cumulative performance.
- **Scoring:** Based on golfers' tournament scores (strokes). Lower is better. Players' scores = sum of their golfers' scores relative to par. Missed cut golfers may receive a penalty score.
- **Leaderboard:** Ranked by total team score (lowest wins). Drill-down shows per-golfer breakdown by round.

### Looking Up Player IDs

- **ESPN ID:** Search `site:espn.com [player name] "golf profile"`
- **Masters ID:** Search `site:masters.com [player name]`
