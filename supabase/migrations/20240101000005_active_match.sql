-- Add active match tracking columns to player_stats.
-- These are set when a user enters a multiplayer game and cleared when the game ends,
-- so that a returning user can be prompted to rejoin their match.

alter table public.player_stats
  add column if not exists active_room_id      text,
  add column if not exists active_game_mode    text,
  add column if not exists active_friend_code  text;
