// Refreshes public.real_world_events (kind='news') from Hürriyet's public
// category RSS feeds — no API key, no signup, and (unlike SeatGeek/
// Ticketmaster, both verified to have zero Turkey coverage) genuinely
// Turkey-relevant. Called from the client (Kesfet.jsx) the same
// refresh-on-view way fetch-sports-fixtures is — see that function and
// supabase/schema.sql's GÜNDEM section for why there's no real cron here.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { XMLParser } from "npm:fast-xml-parser@4";

const STALE_AFTER_MINUTES = 20;
const ITEMS_PER_FEED = 8;

// Hürriyet's URL slug -> this app's own category key (lib/categories.js).
const FEEDS: Record<string, string> = {
  ekonomi: "ekonomi",
  dunya: "dünya",
  teknoloji: "teknoloji",
  spor: "spor",
  siyaset: "siyaset",
};

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (_req, ctx) => {
    const { data: latest } = await ctx.supabaseAdmin
      .from("real_world_events")
      .select("fetched_at")
      .eq("source", "hurriyet-rss")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const staleMs = STALE_AFTER_MINUTES * 60 * 1000;
    if (latest?.fetched_at && Date.now() - new Date(latest.fetched_at).getTime() < staleMs) {
      return Response.json({ skipped: true, reason: "cache still fresh" });
    }

    const parser = new XMLParser({ ignoreAttributes: false });
    const now = new Date().toISOString();
    const rows: any[] = [];
    const errors: Record<string, string> = {};

    await Promise.all(
      Object.entries(FEEDS).map(async ([slug, category]) => {
        try {
          const res = await fetch(`https://www.hurriyet.com.tr/rss/${slug}`);
          if (!res.ok) {
            errors[slug] = `HTTP ${res.status}`;
            return;
          }
          const xml = await res.text();
          const parsed = parser.parse(xml);
          const items = parsed?.rss?.channel?.item;
          const list = Array.isArray(items) ? items : items ? [items] : [];

          for (const item of list.slice(0, ITEMS_PER_FEED)) {
            const link = typeof item.link === "string" ? item.link : item.link?.["#text"];
            if (!item.title || !link) continue;
            const thumbnail = item["media:thumbnail"]?.["@_url"] || null;
            rows.push({
              source: "hurriyet-rss",
              external_id: link,
              kind: "news",
              category,
              title: String(item.title).trim(),
              subtitle: item.description ? String(item.description).trim().slice(0, 200) : null,
              // Repurposed for news: publish time, not a future decision
              // point — see the GÜNDEM comment in supabase/schema.sql.
              event_date: item.pubDate ? new Date(item.pubDate).toISOString() : now,
              location: null,
              metadata: { link, thumbnail },
              fetched_at: now,
            });
          }
        } catch (e) {
          errors[slug] = e instanceof Error ? e.message : String(e);
        }
      })
    );

    if (rows.length === 0) {
      return Response.json({ upserted: 0, errors }, { status: Object.keys(errors).length > 0 ? 502 : 200 });
    }

    const { error } = await ctx.supabaseAdmin
      .from("real_world_events")
      .upsert(rows, { onConflict: "source,external_id" });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ upserted: rows.length, errors });
  }),
};
