# 2048

A web-based 2048 game with real-time multiplayer, leaderboards, and themes.

## Features

- **Single-player** — Classic 2048 gameplay on 4x4 and 8x8 grids with local save/resume
- **Multiplayer** — Real-time ranked and friendly matches via PartyKit with ELO ratings
- **Leaderboard** — Global and daily high scores
- **Themes** — Classic, Ocean, Forest, and Midnight
- **Auth** — Email OTP sign-in via Better Auth
- **Mobile** — Touch/swipe support with responsive layout

## Stack

- **Framework** — [Next.js](https://nextjs.org) (App Router)
- **Language** — TypeScript
- **Styling** — Tailwind CSS v4
- **Database** — [Supabase](https://supabase.com) (Postgres)
- **Auth** — [Better Auth](https://www.better-auth.com) + Supabase
- **Multiplayer** — [PartyKit](https://partykit.io) (WebSocket rooms)
- **Email** — [Resend](https://resend.com)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (cloud or [local](https://supabase.com/docs/guides/cli/getting-started))

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env.local
```

See `.env.example` for all required variables. You'll need your Supabase URL, anon key, service role key, and a Postgres connection string at minimum.

### Database

Apply the migrations in `supabase/migrations/` to set up the required tables:

- `001_player_stats.sql`
- `002_matchmaking_queue.sql`
- `002_scores_rls.sql`
- `003_game_state.sql`
- `004_active_match.sql`

If running Supabase locally, `supabase start` will apply these automatically.

### Run

```bash
# Next.js + PartyKit together
npm run dev:all

# Or separately
npm run dev         # Next.js on :3000
npm run dev:party   # PartyKit on :1999
```

Single-player works with just `npm run dev`, but multiplayer requires PartyKit running as well.

### Deploy

```bash
npm run build           # Build Next.js
npm run party:deploy    # Deploy PartyKit server
```

## Project Structure

```
src/
  app/          # Next.js pages and API routes
  components/   # React components
  hooks/        # Custom React hooks
  lib/          # Utilities, auth, database clients
party/          # PartyKit server (game rooms + lobby)
supabase/       # Migrations, config, edge functions, email templates
```
