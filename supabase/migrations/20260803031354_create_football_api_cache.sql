/*
# Create football API cache table

## Purpose
The app fetches live match, standings, and team data from the
football-data.org REST API. That API has strict rate limits (free tier
allows ~10 requests/minute). To stay within those limits and keep the
frontend fast, an edge function caches every upstream API response in
this table with a TTL. Subsequent requests within the TTL window are
served from the cache instead of hitting the upstream API.

## New Tables
- `football_api_cache`
  - `endpoint` (text, primary key) — a unique key identifying the
    logical request, e.g. "matches:PL" or "standings:PD". This is NOT
    a raw URL; it is a stable, human-readable cache key.
  - `payload` (jsonb) — the full JSON response body returned by the
    upstream API, stored verbatim so the edge function can return it
    without re-shaping.
  - `fetched_at` (timestamptz) — when the cached response was
    originally written. Used to decide whether the cache entry is
    still fresh.
  - `ttl_seconds` (integer) — how long this entry is considered fresh,
    in seconds. Different endpoints can have different TTLs (e.g.
    standings can be cached longer than live matches).

## Security
- Enable RLS on `football_api_cache`.
- This is a single-tenant app with no sign-in requirement for browsing
  match data. The edge function (running with the service role key)
  reads and writes this table; the frontend never touches it directly.
  However, we still allow anon/authenticated SELECT so that if the
  frontend ever needs to read the cache directly it can, and we allow
  all CRUD for anon+authenticated since this is purely cached public
  sports data with no sensitive content.
*/

CREATE TABLE IF NOT EXISTS football_api_cache (
  endpoint text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  ttl_seconds integer NOT NULL DEFAULT 3600
);

ALTER TABLE football_api_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_football_cache" ON football_api_cache;
CREATE POLICY "anon_select_football_cache"
  ON football_api_cache FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_football_cache" ON football_api_cache;
CREATE POLICY "anon_insert_football_cache"
  ON football_api_cache FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_football_cache" ON football_api_cache;
CREATE POLICY "anon_update_football_cache"
  ON football_api_cache FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_football_cache" ON football_api_cache;
CREATE POLICY "anon_delete_football_cache"
  ON football_api_cache FOR DELETE
  TO anon, authenticated USING (true);
