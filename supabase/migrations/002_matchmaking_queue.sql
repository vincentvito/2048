-- Matchmaking queue for database-based matchmaking (no WebSocket dependency)

create table if not exists public.matchmaking_queue (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  username    text        not null,
  elo         integer     not null default 1200,
  status      text        not null default 'searching', -- 'searching', 'matched', 'expired'
  room_id     text,       -- set when matched
  opponent_id uuid,       -- set when matched
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for finding searching players
create index if not exists idx_matchmaking_queue_status on public.matchmaking_queue (status, created_at);

-- Index for user lookups
create index if not exists idx_matchmaking_queue_user on public.matchmaking_queue (user_id, status);

-- Auto-update updated_at
create or replace function public.handle_matchmaking_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_matchmaking_updated_at on public.matchmaking_queue;
create trigger trg_matchmaking_updated_at
  before update on public.matchmaking_queue
  for each row
  execute function public.handle_matchmaking_updated_at();

-- RLS
alter table public.matchmaking_queue enable row level security;

-- Users can view their own queue entries and matched opponents
create policy "Users can view own and matched entries"
  on public.matchmaking_queue
  for select
  to authenticated
  using (auth.uid() = user_id OR auth.uid() = opponent_id);

-- Users can insert their own entries
create policy "Users can insert own entries"
  on public.matchmaking_queue
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own entries
create policy "Users can update own entries"
  on public.matchmaking_queue
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Users can delete their own entries
create policy "Users can delete own entries"
  on public.matchmaking_queue
  for delete
  to authenticated
  using (auth.uid() = user_id);
