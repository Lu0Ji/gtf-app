// Refreshes public.real_world_events (kind='news') from several public RSS
// feeds — no API key, no signup needed for any of them. Called from the
// client (Kesfet.jsx) the same refresh-on-view way fetch-sports-fixtures is
// — see that function and supabase/schema.sql's GÜNDEM section for why
// there's no real cron here.
//
// 2026-09-10: was Hürriyet-only. User feedback: "daha fazla tarafsız kaynak
// ekleyelim" (let's add more impartial sources) — a single domestic outlet
// is one newsroom's editorial lens on everything a user sees here. Added
// BBC Türkçe and DW Türkçe: both foreign public-service broadcasters'
// Turkish-language services, edited outside Turkey's own domestic press
// pressures — the two most commonly cited "genuinely independent of
// Turkish politics" Turkish-language newsrooms, as opposed to AA/TRT
// (state-owned) or the openly partisan domestic press on either side.
// Neither publishes real per-category feeds (every category slug guessed
// and curled either 301-redirects to the same general feed [BBC] or 200s
// with an empty channel [DW] — same "looks real, isn't" trap the Hürriyet
// feeds comment below already warns about), so both are wired in as a
// single general feed tagged 'dünya' rather than force-fit into a category
// matrix that doesn't exist. DW's feed is also RSS 1.0/RDF, not RSS 2.0
// like the other two (curled and diffed directly, not assumed) — items are
// flat siblings of <channel> under <rdf:RDF>, dated via <dc:date> instead
// of <pubDate>, hence the `format` field below.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { XMLParser } from "npm:fast-xml-parser@4";

const STALE_AFTER_MINUTES = 20;
const ITEMS_PER_FEED = 8;

interface SourceDef {
  source: string;
  format: "rss2" | "rdf";
  feeds: { url: string; category: string }[];
}

const SOURCES: SourceDef[] = [
  {
    source: "hurriyet-rss",
    format: "rss2",
    // Hürriyet's URL slug -> this app's own category key (lib/categories.js).
    // 2026-09-07: expanded from 5 to 9 — a beta pass flagged the gündem feed
    // as too thin ("dünya ve spor... fazlalaştırmamız lazım"). Every
    // candidate slug below was hit directly first (curl, not guessed from
    // memory) to confirm it's a real feed and not Hürriyet's generic
    // redirect-to-"son-dakika-haberleri" fallback that a dead slug 301s to
    // (kultur-sanat, saglik, otomobil, bilim-teknoloji, gastro, kripto,
    // bilim all do this — tried, none are real feeds, left out on purpose).
    // "kelebek" (lifestyle) and "astroloji" (horoscope) are real feeds too
    // but don't map cleanly to any category here, so skipped rather than
    // force-fit.
    feeds: [
      { url: "https://www.hurriyet.com.tr/rss/ekonomi", category: "ekonomi" },
      { url: "https://www.hurriyet.com.tr/rss/dunya", category: "dünya" },
      { url: "https://www.hurriyet.com.tr/rss/teknoloji", category: "teknoloji" },
      { url: "https://www.hurriyet.com.tr/rss/spor", category: "spor" },
      { url: "https://www.hurriyet.com.tr/rss/siyaset", category: "siyaset" },
      { url: "https://www.hurriyet.com.tr/rss/magazin", category: "eğlence" },
      { url: "https://www.hurriyet.com.tr/rss/seyahat", category: "seyahat" },
      { url: "https://www.hurriyet.com.tr/rss/egitim", category: "eğitim" },
      { url: "https://www.hurriyet.com.tr/rss/oyun", category: "oyun" },
    ],
  },
  {
    source: "bbc-turkce-rss",
    format: "rss2",
    feeds: [{ url: "https://feeds.bbci.co.uk/turkce/rss.xml", category: "dünya" }],
  },
  {
    source: "dw-turkce-rss",
    format: "rdf",
    feeds: [{ url: "https://rss.dw.com/rdf/rss-tur-all", category: "dünya" }],
  },
];

function parseRss2Items(parsed: any): any[] {
  const items = parsed?.rss?.channel?.item;
  return Array.isArray(items) ? items : items ? [items] : [];
}

function parseRdfItems(parsed: any): any[] {
  const items = parsed?.["rdf:RDF"]?.item;
  return Array.isArray(items) ? items : items ? [items] : [];
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (_req, ctx) => {
    const parser = new XMLParser({ ignoreAttributes: false });
    const now = new Date().toISOString();
    const staleMs = STALE_AFTER_MINUTES * 60 * 1000;
    const rows: any[] = [];
    const errors: Record<string, string> = {};
    const skipped: string[] = [];

    await Promise.all(
      SOURCES.map(async ({ source, format, feeds }) => {
        // Staleness is checked per source, not globally — one slow/stale
        // feed shouldn't block the others from refreshing, and a brand-new
        // source (nothing fetched yet) always runs.
        const { data: latest } = await ctx.supabaseAdmin
          .from("real_world_events")
          .select("fetched_at")
          .eq("source", source)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest?.fetched_at && Date.now() - new Date(latest.fetched_at).getTime() < staleMs) {
          skipped.push(source);
          return;
        }

        await Promise.all(
          feeds.map(async ({ url, category }) => {
            const key = `${source}:${category}`;
            try {
              const res = await fetch(url);
              if (!res.ok) {
                errors[key] = `HTTP ${res.status}`;
                return;
              }
              const xml = await res.text();
              const parsed = parser.parse(xml);
              const list = (format === "rdf" ? parseRdfItems(parsed) : parseRss2Items(parsed)).slice(
                0,
                ITEMS_PER_FEED
              );

              for (const item of list) {
                const link = typeof item.link === "string" ? item.link : item.link?.["#text"];
                if (!item.title || !link) continue;
                const thumbnail = item["media:thumbnail"]?.["@_url"] || null;
                const dateStr = format === "rdf" ? item["dc:date"] : item.pubDate;
                rows.push({
                  source,
                  external_id: link,
                  kind: "news",
                  category,
                  title: String(item.title).trim(),
                  subtitle: item.description ? String(item.description).trim().slice(0, 200) : null,
                  // Repurposed for news: publish time, not a future decision
                  // point — see the GÜNDEM comment in supabase/schema.sql.
                  event_date: dateStr ? new Date(dateStr).toISOString() : now,
                  location: null,
                  metadata: { link, thumbnail },
                  fetched_at: now,
                });
              }
            } catch (e) {
              errors[key] = e instanceof Error ? e.message : String(e);
            }
          })
        );
      })
    );

    if (rows.length === 0) {
      return Response.json(
        { upserted: 0, skipped, errors },
        { status: Object.keys(errors).length > 0 ? 502 : 200 }
      );
    }

    const { error } = await ctx.supabaseAdmin
      .from("real_world_events")
      .upsert(rows, { onConflict: "source,external_id" });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ upserted: rows.length, skipped, errors });
  }),
};
