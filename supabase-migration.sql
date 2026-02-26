-- Migration: Add profiles table, add user_id to scores
-- Run this in the Supabase Dashboard SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Auto-create profile on new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'Player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to avoid duplicate trigger error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add user_id column to scores table
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.scores(user_id);

-- 5. Backfill profiles for existing auth users (if any)
INSERT INTO public.profiles (id, username)
SELECT id, COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1), 'Player')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Update scores RLS to allow authenticated users to insert their own scores
-- (Drop existing policies first if they conflict)
DO $$
BEGIN
  -- Allow anyone to read scores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scores' AND policyname = 'Scores are viewable by everyone') THEN
    EXECUTE 'CREATE POLICY "Scores are viewable by everyone" ON public.scores FOR SELECT USING (true)';
  END IF;

  -- Allow authenticated users to insert scores with their own user_id
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scores' AND policyname = 'Authenticated users can insert own scores') THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
