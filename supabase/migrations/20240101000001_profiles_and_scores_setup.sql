-- Profiles table, auto-create trigger, link scores to users, and scores RLS.

-- 1. Create profiles table
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Profiles are viewable by everyone') then
    create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
  end if;
end $$;

-- 2. Auto-create profile on new user sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'Player')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Add user_id column to scores
alter table public.scores
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_scores_user_id on public.scores(user_id);

-- 4. Scores RLS policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'scores' and policyname = 'Anyone can read scores') then
    create policy "Anyone can read scores" on public.scores for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'scores' and policyname = 'Authenticated users can insert scores') then
    create policy "Authenticated users can insert scores" on public.scores for insert to authenticated with check (true);
  end if;
end $$;
