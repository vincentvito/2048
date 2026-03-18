-- Player stats table for ranked multiplayer ELO and statistics tracking.

create table if not exists public.player_stats (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null unique references auth.users (id) on delete cascade,
  username   text        not null,
  elo        integer     not null default 1200,
  best_score integer     not null default 0,
  total_points bigint    not null default 0,
  games_played integer   not null default 0,
  wins       integer     not null default 0,
  losses     integer     not null default 0,
  ties       integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for leaderboard queries (ORDER BY elo DESC).
create index if not exists idx_player_stats_elo on public.player_stats (elo desc);

-- Trigger to auto-update the updated_at column on every row modification.
create or replace function public.handle_player_stats_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_player_stats_updated_at on public.player_stats;
create trigger trg_player_stats_updated_at
  before update on public.player_stats
  for each row
  execute function public.handle_player_stats_updated_at();

-- Row Level Security -----------------------------------------------------------

alter table public.player_stats enable row level security;

-- Any authenticated user can read all player stats (needed for leaderboards).
create policy "Authenticated users can view all player stats"
  on public.player_stats
  for select
  to authenticated
  using (true);

-- Users can only insert their own stats row.
create policy "Users can insert their own stats"
  on public.player_stats
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can only update their own stats row.
create policy "Users can update their own stats"
  on public.player_stats
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
