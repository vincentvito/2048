# Manual Testing Guide

## Setup

1. **Run the DB migration** — go to Supabase dashboard > SQL Editor, paste and run `supabase/migrations/001_player_stats.sql`
2. **Start dev server**: `npm run dev`
3. **Open two browser windows** (or one regular + one incognito) both logged into different accounts

## Testing Each Feature

### 5-minute timer
- Both windows: sign in, click "Find Match"
- Once matched, the `05:00` timer should appear in the match header and count down
- At `00:30` it turns red, at `00:10` it pulses
- **Quick test**: temporarily change `GAME_DURATION = 5 * 60` to `GAME_DURATION = 30` in `src/hooks/useMultiplayerGame.ts` (line 6)

### Forfeit on leave
- Start a match between two windows
- Close one window (or click "Leave Match")
- After ~10 seconds, the other window should show "Victory! — Opponent Forfeited"

### ELO + Stats
- Before your first match, the lobby should show a stats card with ELO 1200, 0/0/0 W/L/T
- After a match ends, the result modal should show "+X ELO" (green) for winner and "-X ELO" (red) for loser
- Your rank badge (Bronze/Silver/Gold) appears below the scores
- Go back to lobby — stats card should reflect updated ELO, W/L, best score, total points

### Best score & total points
- Play a few matches, check that "Best" always shows your highest single-game score
- "Total Pts" should accumulate across all games

## Quick Smoke Test (30 seconds)

Change line 6 in `useMultiplayerGame.ts` to `GAME_DURATION = 30`, open two windows, find match, play for 30 seconds, and verify: timer counts down, time's up modal shows, ELO deltas appear, stats update. Then revert the constant.
