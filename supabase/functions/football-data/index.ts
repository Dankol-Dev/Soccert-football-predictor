// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./deno-env.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LEAGUE_CODES: Record<string, string> = {
  PL: "Premier League",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
};

const TTL_MATCHES = 90;
const TTL_STANDINGS = 3600;

interface CacheRow {
  endpoint: string;
  payload: unknown;
  fetched_at: string;
  ttl_seconds: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Football API key is not configured. Set FOOTBALL_DATA_API_KEY in your Supabase project secrets (Edge Functions > Secrets).",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const footballDataApiKey = apiKey;

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/football-data/, "");
    const params = url.searchParams;
    const resource = params.get("resource") || path.split("/").filter(Boolean)[0] || "matches";

    async function fetchWithCache(
      cacheKey: string,
      upstreamPath: string,
      ttl: number
    ): Promise<{ payload: unknown | null; ok: boolean; status: number; error: string | null; stale: boolean }> {
      const { data: cached } = await supabase
        .from("football_api_cache")
        .select("*")
        .eq("endpoint", cacheKey)
        .maybeSingle<CacheRow>();

      if (cached) {
        const ageSec = (Date.now() - new Date(cached.fetched_at).getTime()) / 1000;
        if (ageSec < cached.ttl_seconds) {
          return { payload: cached.payload, ok: true, status: 200, error: null, stale: false };
        }
      }

      const upstreamUrl = `https://api.football-data.org/v4${upstreamPath}`;
      const resp = await fetch(upstreamUrl, {
        headers: { "X-Auth-Token": footballDataApiKey },
      });

      if (!resp.ok) {
        if (cached) {
          return {
            payload: cached.payload,
            ok: true,
            status: 200,
            error: `Football API returned ${resp.status}; serving cached data`,
            stale: true,
          };
        }
        const errText = await resp.text();
        return {
          payload: null,
          ok: false,
          status: resp.status,
          error: `Football API returned ${resp.status}: ${errText}`,
          stale: false,
        };
      }

      const payload = await resp.json();

      await supabase
        .from("football_api_cache")
        .upsert({
          endpoint: cacheKey,
          payload,
          fetched_at: new Date().toISOString(),
          ttl_seconds: ttl,
        });

      return { payload, ok: true, status: 200, error: null, stale: false };
    }

    if (resource === "matches") {
      const entries = await Promise.all(
        Object.keys(LEAGUE_CODES).map(async (code) => {
          const result = await fetchWithCache(
            `matches:${code}`,
            `/competitions/${code}/matches?status=SCHEDULED,TIMED,LIVE,IN_PLAY,PAUSED,FINISHED,SUSPENDED,POSTPONED,CANCELLED,AWARDED`,
            TTL_MATCHES
          );
          return {
            code,
            competition: LEAGUE_CODES[code],
            ok: result.ok,
            error: result.error,
            stale: result.stale,
            data: result.payload,
          };
        })
      );

      const errors = entries.filter((e) => e.error).map((e) => `${e.competition}: ${e.error}`);
      const okEntries = entries.filter((e) => e.ok);

      if (okEntries.length === 0) {
        return new Response(
          JSON.stringify({ error: "All leagues failed to load", details: errors }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = {
        matches: okEntries.map((e) => ({
          competition: e.competition,
          competitionCode: e.code,
          stale: e.stale,
          data: e.data,
        })),
        partialErrors: errors.length > 0 ? errors : undefined,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resource === "standings") {
      const code = params.get("code") || "PL";
      if (!LEAGUE_CODES[code]) {
        return new Response(
          JSON.stringify({ error: `Unsupported league code: ${code}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const result = await fetchWithCache(
        `standings:${code}`,
        `/competitions/${code}/standings`,
        TTL_STANDINGS
      );

      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          competition: LEAGUE_CODES[code],
          competitionCode: code,
          data: result.payload,
          stale: result.stale,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown resource: ${resource}. Use ?resource=matches or ?resource=standings&code=PL` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
