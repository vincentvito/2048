-- Game state table for polling-based multiplayer (no WebSocket dependency)

create table if not exists public.game_state (
  id          uuid        primary key default gen_random_uuid(),
  room_id     text        not null,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  username    text        not null,
  elo         integer     not null default 1200,
  grid        jsonb       not null default '[]',
  score       integer     not null default 0,
  game_over   boolean     not null default false,
  won         boolean     not null default false,
  wants_rematch boolean   not null default false,
  forfeited   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for room lookups
create unique index if not exists idx_game_state_room_user on public.game_state (room_id, user_id);
create index if not exists idx_game_state_room on public.game_state (room_id);

-- Auto-update updated_at
create or replace function public.handle_game_state_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_game_state_updated_at on public.game_state;
create trigger trg_game_state_updated_at
  before update on public.game_state
  for each row
  execute function public.handle_game_state_updated_at();

-- RLS
alter table public.game_state enable row level security;

-- Users can view game state for their rooms
create policy "Users can view game state in their rooms"
  on public.game_state
  for select
  to authenticated
  using (
    exists (
      select 1 from public.game_state gs
      where gs.room_id = game_state.room_id
      and gs.user_id = auth.uid()
    )
  );

-- Users can insert their own game state
create policy "Users can insert own game state"
  on public.game_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own game state
create policy "Users can update own game state"
  on public.game_state
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Users can delete their own game state
create policy "Users can delete own game state"
  on public.game_state
  for delete
  to authenticated
  using (auth.uid() = user_id);
