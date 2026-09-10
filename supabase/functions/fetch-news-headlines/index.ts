// Refreshes public.real_world_events (kind='news') from several public RSS
// feeds — no API key, no signup needed for any of them. Called from the
// client (Kesfet.jsx) the same refresh-on-view way fetch-sports-fixtures is
// — see that function and supabase/schema.sql's GÜNDEM section for why
// there's no real cron here.
//
// 2026-09-10, two rounds of user feedback:
// 1. "daha fazla tarafsız kaynak ekleyelim" (more impartial sources) — was
//    Hürriyet-only. Added BBC Türkçe and DW Türkçe: foreign public-service
//    broadcasters' Turkish services, edited outside Turkey's own domestic
//    press pressures, as opposed to AA/TRT (state-owned) or partisan
//    domestic press on either side.
// 2. "sadece Türkiye için düşünmemek lazım" (don't just think about
//    Turkey) — every user saw the same Turkish sources regardless of their
//    app language. Every SOURCES entry now carries the `language` it's
//    tagged with (real_world_events.language, see schema.sql) so Kesfet.jsx
//    can scope its query to the viewer's own language instead of always
//    querying Turkish rows. One same-caliber public broadcaster per
//    language, same "foreign/public-service = independent of domestic
//    politics" reasoning as round 1 — BBC's language services cover
//    en/ru/ar/zh/es; neither BBC nor DW run German or Japanese services,
//    so those two use each country's own flagship public broadcaster
//    instead (Tagesschau/ARD for de, NHK for ja) — still public-service,
//    just domestic since no foreign-language equivalent exists to reuse.
// None of the non-Turkish sources publish real per-category feeds (unlike
// Hürriyet) — every one is wired in as a single general feed tagged
// 'dünya', the closest existing category to "general/world news", rather
// than force-fit into a category matrix that doesn't exist for them.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { XMLParser } from "npm:fast-xml-parser@4";

const STALE_AFTER_MINUTES = 20;
const ITEMS_PER_FEED = 8;

interface SourceDef {
  source: string;
  language: string;
  format: "rss2" | "rdf";
  feeds: { url: string; category: string }[];
}

const SOURCES: SourceDef[] = [
  {
    source: "hurriyet-rss",
    language: "tr",
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
    language: "tr",
    format: "rss2",
    feeds: [{ url: "https://feeds.bbci.co.uk/turkce/rss.xml", category: "dünya" }],
  },
  {
    source: "dw-turkce-rss",
    language: "tr",
    // RSS 1.0/RDF, not RSS 2.0 like every other feed here (curled and
    // diffed directly, not assumed) — items are flat siblings of <channel>
    // under <rdf:RDF>, dated via <dc:date> instead of <pubDate>.
    format: "rdf",
    feeds: [{ url: "https://rss.dw.com/rdf/rss-tur-all", category: "dünya" }],
  },
  {
    source: "bbc-news-rss",
    language: "en",
    format: "rss2",
    feeds: [{ url: "https://feeds.bbci.co.uk/news/rss.xml", category: "dünya" }],
  },
  {
    source: "bbc-russian-rss",
    language: "ru",
    format: "rss2",
    feeds: [{ url: "https://feeds.bbci.co.uk/russian/rss.xml", category: "dünya" }],
  },
  {
    source: "bbc-arabic-rss",
    language: "ar",
    format: "rss2",
    feeds: [{ url: "https://feeds.bbci.co.uk/arabic/rss.xml", category: "dünya" }],
  },
  {
    source: "bbc-chinese-rss",
    language: "zh",
    format: "rss2",
    // Simplified Chinese — matches this app's own zh.json locale.
    feeds: [{ url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml", category: "dünya" }],
  },
  {
    source: "bbc-mundo-rss",
    language: "es",
    format: "rss2",
    feeds: [{ url: "https://feeds.bbci.co.uk/mundo/rss.xml", category: "dünya" }],
  },
  {
    source: "tagesschau-rss",
    language: "de",
    format: "rss2",
    feeds: [{ url: "https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml", category: "dünya" }],
  },
  {
    source: "nhk-rss",
    language: "ja",
    format: "rss2",
    feeds: [{ url: "https://www3.nhk.or.jp/rss/news/cat0.xml", category: "dünya" }],
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
      SOURCES.map(async ({ source, language, format, feeds }) => {
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
                  language,
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
