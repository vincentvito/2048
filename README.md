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

## Architecture

### Game Engine

The core 2048 engine lives in `src/lib/game-engine.ts` as pure functions with zero DOM dependencies. It handles grid creation, move simulation, tile merging, score calculation, and win/game-over detection. This module is shared between the browser (Game2048 component) and the PartyKit server (for server-authoritative multiplayer).

### Single-Player

`src/features/single-player/SinglePlayerScreen.tsx` orchestrates the single-player experience: game board rendering (canvas-based via `Game2048`), score persistence, confetti on win, and the game-over modal. Game state is saved to localStorage for resume.

### Multiplayer Protocol

Multiplayer uses PartyKit WebSocket rooms with a **server-authoritative** model:

1. **Matchmaking** — Players join a lobby (`party/lobby.ts`). If no human opponent is found within 15 seconds, a bot is matched.
2. **Game start** — The server generates initial boards for both players and sends them via `your_initial_state`.
3. **Moves** — Clients send `{ type: 'move', direction: 0|1|2|3 }`. The server computes the new grid/score using the shared engine and broadcasts authoritative state.
4. **Match resolution** — The server determines the winner based on its own computed scores. Matches end when: someone reaches 2048, a player runs out of moves, the timer expires (5 min), or a player forfeits.
5. **Reconnection** — Server persists game state in room storage. Reconnecting players receive their saved state via `your_state`.

Friend matches use a 6-character room code. Both ranked (affects ELO) and friendly (no ELO change) modes are supported.

### Auth & Sessions

- **Better Auth** handles email OTP sign-in with session cookies
- All API mutation routes resolve the user from the session (not from request body)
- The admin Supabase client is used server-side for database writes, bypassing RLS
- Guest users can play single-player without auth; scores are saved locally and submitted after sign-in

### Theming

Theme state is managed by `ThemeProvider` (React context). CSS custom properties in `globals.css` define per-theme colors, and a JS theme object in `src/lib/themes.ts` provides tile colors for canvas rendering.

## Project Structure

```
src/
  app/                    # Next.js pages and API routes
  components/             # Shared React components
    ui/                   # UI primitives (Modal, Button, Spinner, Badge)
  features/
    auth/                 # AppUser type, getDisplayName utility
    theme/                # ThemeProvider context
    single-player/        # SinglePlayerScreen
    multiplayer/
      game/               # MatchResultModal, LeaveWarningModal, MultiplayerHud, OpponentPreview
      lobby/              # (lobby screens)
      hooks/              # (multiplayer hooks)
  hooks/                  # PartyKit hooks (usePartyGame, usePartyMatchmaking)
  lib/                    # Utilities, auth, database clients, game engine, score service
    party/                # WebSocket message types
party/                    # PartyKit server (game rooms + lobby + bot AI)
supabase/                 # Migrations, config, edge functions, email templates
```
