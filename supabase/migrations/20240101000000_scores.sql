-- Scores table for single-player leaderboard.

create table if not exists public.scores (
  id         uuid        primary key default gen_random_uuid(),
  username   text        not null,
  score      integer     not null,
  grid_size  integer     not null default 4,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.scores enable row level security;
