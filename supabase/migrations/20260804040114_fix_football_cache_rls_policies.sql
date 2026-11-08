/*
# Fix overly permissive RLS policies on football_api_cache

## Problem
The INSERT, UPDATE, and DELETE policies on football_api_cache
used `WITH CHECK (true)` and `USING (true)`, allowing anyone
to insert, modify, or delete cached API responses. Supabase's
security advisor flagged this.

## Fix
- Keep SELECT public (anon + authenticated) — the cache stores
  public sports data and the frontend reads it.
- Remove INSERT, UPDATE, and DELETE policies for anon/authenticated.
  Only the edge function (using the service role key, which bypasses
  RLS) needs to write to this table. The frontend never writes to it.

## Security changes
- DROP the three permissive write policies:
  anon_insert_football_cache, anon_update_football_cache,
  anon_delete_football_cache
- Keep anon_select_football_cache (read-only, intentionally public)
*/

DROP POLICY IF EXISTS "anon_insert_football_cache" ON football_api_cache;
DROP POLICY IF EXISTS "anon_update_football_cache" ON football_api_cache;
DROP POLICY IF EXISTS "anon_delete_football_cache" ON football_api_cache;
