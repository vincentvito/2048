-- Fix 401 on leaderboard: allow anonymous users to read the scores table.
-- The scores table is used by the single-player leaderboard and must be
-- publicly readable so guests (not logged in) can see the leaderboard.

-- Enable RLS if not already on (safe to run twice).
alter table public.scores enable row level security;

-- Allow anyone (including unauthenticated / anon role) to read scores.
create policy "Anyone can read scores"
  on public.scores
  for select
  to anon, authenticated
  using (true);

-- Only authenticated users can insert their own scores.
-- (Skip if a policy already exists — adjust name if your project uses a different one.)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'scores'
      and policyname = 'Authenticated users can insert scores'
  ) then
    execute $policy$
      create policy "Authenticated users can insert scores"
        on public.scores
        for insert
        to authenticated
        with check (true)
    $policy$;
  end if;
end;
$$;
