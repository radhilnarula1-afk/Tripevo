-- Migration: Enable RLS Policies on public.users Table
-- This allows authenticated users to insert, update, and select their own profiles,
-- satisfying the foreign key constraints on itineraries and affiliate clicks.

-- 1. Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Create Policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Create Policy to allow users to read profiles
CREATE POLICY "Profiles are viewable by everyone"
ON public.users
FOR SELECT
TO authenticated, anon
USING (true);
