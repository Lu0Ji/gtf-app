// Refreshes public.real_world_events with upcoming football fixtures from
// football-data.org. Called from the client (Kesfet.jsx) whenever someone
// opens "Yaklaşan Etkinlikler" and the cached data looks stale — see
// supabase/schema.sql's note on why this is refresh-on-view instead of a
// real background cron job.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const FOOTBALL_DATA_URL = "https://api.football-data.org/v4/matches";
const STALE_AFTER_MINUTES = 30;
// football-data.org's free tier rejects any dateFrom/dateTo span over 10
// days (learned by hitting the real 400 first, not documented up front).
const DAYS_AHEAD = 10;

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (_req, ctx) => {
    const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "FOOTBALL_DATA_API_KEY not configured" }, { status: 500 });
    }

    // Respect football-data.org's free-tier rate limit (10 req/min) and
    // avoid burning quota every time someone opens the screen — only
    // actually call out if the cache is genuinely stale.
    const { data: latest } = await ctx.supabaseAdmin
      .from("real_world_events")
      .select("fetched_at")
      .eq("source", "football-data")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const staleMs = STALE_AFTER_MINUTES * 60 * 1000;
    if (latest?.fetched_at && Date.now() - new Date(latest.fetched_at).getTime() < staleMs) {
      return Response.json({ skipped: true, reason: "cache still fresh" });
    }

    const dateFrom = new Date().toISOString().slice(0, 10);
    const dateTo = new Date(Date.now() + DAYS_AHEAD * 86400000).toISOString().slice(0, 10);
    const url = `${FOOTBALL_DATA_URL}?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`;

    const apiRes = await fetch(url, { headers: { "X-Auth-Token": apiKey } });
    if (!apiRes.ok) {
      const body = await apiRes.text();
      return Response.json({ error: `football-data.org ${apiRes.status}`, body }, { status: 502 });
    }
    const payload = await apiRes.json();
    const matches = payload.matches || [];

    const rows = matches.map((m: any) => ({
      source: "football-data",
      external_id: String(m.id),
      kind: "sports",
      category: "spor",
      title: `${m.homeTeam?.name || "?"} - ${m.awayTeam?.name || "?"}`,
      subtitle: m.competition?.name || null,
      event_date: m.utcDate,
      location: m.venue || null,
      metadata: {
        home_crest: m.homeTeam?.crest || null,
        away_crest: m.awayTeam?.crest || null,
        competition_emblem: m.competition?.emblem || null,
        matchday: m.matchday || null,
      },
      fetched_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      return Response.json({ upserted: 0 });
    }

    const { error } = await ctx.supabaseAdmin
      .from("real_world_events")
      .upsert(rows, { onConflict: "source,external_id" });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ upserted: rows.length });
  }),
};
