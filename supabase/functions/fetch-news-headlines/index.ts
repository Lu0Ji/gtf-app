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
// 2026-09-11: "kişiselleştirmeyi arttıralım" tavsiyesinin #6'sı — non-tr
// dillerin hepsi tek genel feed'e (kategori filtresi için işe yaramaz)
// düşüyordu. Her URL yeniden, tek tek curl edildi (redirect mi gerçek mi
// diye): BBC'nin sadece İngilizce servisi (feeds.bbci.co.uk/news/... ve
// /sport/rss.xml) gerçek kategori feed'leri yayınlıyor — russian/arabic/
// zhongwen/mundo'nun hepsindeki kategori tahminleri genel feed'e
// yönlendiriyor (Türkçe'de bulunan aynı tuzak). Ama Tagesschau (de) ve NHK
// (ja) — ayrı yayıncılar, BBC değil — kendi gerçek kategori feed'lerine
// sahip çıktı. Sonuç: tr/en/de/ja artık gerçek kategori kırılımı alıyor,
// ru/ar/zh/es hâlâ tek genel 'dünya' feed'inde (bu dillerde gerçek bir
// kategori feed'i bulunamadı, force-fit yapılmadı — dürüst bir sınır,
// gizlenmedi).
//
// 2026-09-12: "bizim eklediğimiz diğer kategoriler için de tarafsız ve
// telifsiz kaynaklar bulalım" — ekonomi/teknoloji/spor/siyaset/eğlence/
// seyahat/eğitim/oyun hâlâ tek kaynaktı (Hürriyet), sadece 'dünya' 3
// kaynağa çıkmıştı. Üçüncü bir Türkçe tarafsız kaynak eklendi: Euronews
// Türkçe (pan-Avrupa, tek bir ülkenin hükümetine bağlı değil — BBC/DW ile
// aynı "yabancı/kamu yayıncısı = yerli siyasetten bağımsız" mantığı).
// Ama BBC Türkçe/DW Türkçe gibi Euronews Türkçe'nin de gerçek kategori
// feed'i yok (?section=... parametresi denendi, hepsi aynı genel feed'e
// düşüyor — yine "gerçek görünüp gerçek olmayan" tuzağı). Üçünü de tek
// 'dünya' kovasına atmak yerine (dürüst ama tembel bir sınır) Türkçe bir
// anahtar kelime sınıflandırıcısı eklendi (classifyTurkishCategory) — her
// haber kendi başlık+açıklamasına göre spor/siyaset/ekonomi/teknoloji/
// sağlık/eğlence'ye ayrılıyor, eşleşmeyen 'dünya'da kalıyor. Sadece Türkçe
// için yapıldı (İngilizce/Almanca/Japonca'da zaten gerçek kategori
// feed'leri var; 8 dilin hepsi için güvenilir anahtar kelime listesi
// yazmak ayrı, çok daha büyük bir araştırma turu gerektirir).
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { XMLParser } from "npm:fast-xml-parser@4";

const STALE_AFTER_MINUTES = 20;
const ITEMS_PER_FEED = 8;

// Sırayla en spesifik kategoriden en genele — ilk eşleşen kazanıyor.
// `words`: TAM token eşleşmesi gerekiyor (aşağıdaki containsWord()), ham
// substring değil — ilk denemede (canlı veriye bakılıp) `text.includes()`
// kullanılmıştı ve gerçek, ciddi yanlış eşleşmeler çıktı: "maç" (spor)
// "amaçlı"/"amaçları" (çok sık kullanılan "amaç" kelimesinin ekli hali)
// içinde geçiyor diye bir yapay zeka güvenliği haberini "spor" yaptı;
// "aşı" (sağlık) aynı şekilde "aşırı" (extreme) kelimesinin içinde
// yakalanıp bir güvenlik haberini "sağlık" yaptı. `phrases`: birden çok
// kelimeli veya zaten kendi başına çakışma riski taşımayan terimler,
// boşlukla dolgulu tam ifade eşleşmesiyle kontrol ediliyor (bkz.
// containsPhrase) — "yapay zeka"/"süper lig" gibi ifadelerin başka bir
// kelimenin içine yanlışlıkla sığması pratikte imkansız. Tekil kelimeler
// çekim ekleriyle (ör. "maçı", "aşısı") eşleşmeyebilir — bu bilinçli bir
// ödün: kaçırılan bir eşleşme sessizce 'dünya'ya düşer (zaten var olan
// dürüst varsayılan), yanlış bir eşleşme kullanıcıya güvenliği ilgili bir
// haberi "spor" diye gösterir — ikincisi çok daha kötü.
const TURKISH_CATEGORY_RULES: { category: string; words?: string[]; phrases?: string[] }[] = [
  {
    category: "spor",
    words: ["futbol", "basketbol", "voleybol", "maç", "gol", "transfer", "tenis", "olimpiyat", "galatasaray", "fenerbahçe", "beşiktaş", "trabzonspor"],
    phrases: ["süper lig", "şampiyonlar ligi", "milli takım", "formula 1", "teknik direktör"],
  },
  {
    category: "siyaset",
    words: ["hükümet", "meclis", "seçim", "muhalefet", "chp", "mhp", "tbmm", "referandum", "anayasa", "diplomasi", "büyükelçi", "cumhurbaşkanı", "cumhurbaşkanlığı", "başbakan"],
    phrases: ["ak parti"],
  },
  {
    category: "ekonomi",
    words: ["ekonomi", "dolar", "euro", "borsa", "enflasyon", "faiz", "ihracat", "ithalat", "zam", "bütçe", "yatırım", "işsizlik", "vergi"],
    phrases: ["merkez bankası", "asgari ücret"],
  },
  {
    category: "teknoloji",
    words: ["teknoloji", "telefon", "uygulama", "internet", "siber", "yazılım", "google", "apple", "microsoft", "çip"],
    phrases: ["yapay zeka", "elon musk"],
  },
  {
    category: "sağlık",
    words: ["sağlık", "hastane", "doktor", "aşı", "virüs", "salgın", "tedavi", "ilaç", "kanser", "hastalık"],
  },
  {
    category: "eğlence",
    words: ["dizi", "film", "sinema", "sanatçı", "şarkıcı", "konser", "oyuncu", "ünlü", "magazin", "netflix", "albüm"],
  },
];

// toLocaleLowerCase("tr") — Türkçe'nin noktalı/noktasız I sorunu (İ/I,
// i/ı) yüzünden düz .toLowerCase() burada yanlış sonuç verir (ör. "İş"
// "i̇ş" olur, "iş" değil), token eşleşmesini sessizce bozardı.
function normalizeTr(text: string): string {
  return text.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
}

function containsWord(tokens: Set<string>, word: string): boolean {
  return tokens.has(word);
}

function containsPhrase(paddedText: string, phrase: string): boolean {
  return paddedText.includes(` ${phrase} `);
}

function classifyTurkishCategory(title: string, description: string | null): string {
  const raw = normalizeTr(`${title} ${description || ""}`);
  // \p{L}/\p{N} (Unicode letter/number) yerine [a-z] kullanmak ğ/ş/ı/ö/ü/ç
  // gibi harfleri de ayırıcı sayardı, kelimeleri ortadan bölerdi.
  const tokens = new Set(raw.replace(/[^\p{L}\p{N}\s]/gu, " ").split(" ").filter(Boolean));
  const padded = ` ${raw.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;
  for (const rule of TURKISH_CATEGORY_RULES) {
    if (rule.words?.some((w) => containsWord(tokens, w))) return rule.category;
    if (rule.phrases?.some((p) => containsPhrase(padded, p))) return rule.category;
  }
  return "dünya";
}

interface SourceDef {
  source: string;
  language: string;
  format: "rss2" | "rdf";
  // category: "auto" -> classifyTurkishCategory() decides per item, for a
  // source whose only real feed is one general mixed-topic stream.
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
    feeds: [{ url: "https://feeds.bbci.co.uk/turkce/rss.xml", category: "auto" }],
  },
  {
    source: "dw-turkce-rss",
    language: "tr",
    // RSS 1.0/RDF, not RSS 2.0 like every other feed here (curled and
    // diffed directly, not assumed) — items are flat siblings of <channel>
    // under <rdf:RDF>, dated via <dc:date> instead of <pubDate>.
    format: "rdf",
    feeds: [{ url: "https://rss.dw.com/rdf/rss-tur-all", category: "auto" }],
  },
  {
    // Pan-Avrupa, tek bir hükümete bağlı değil — 2026-09-12 eklendi (bkz.
    // dosya başındaki not). ?section=... query param'ı denendi, hepsi aynı
    // genel feed'e düşüyor (BBC/DW ile aynı tuzak) — "auto" ile sınıflandırma.
    source: "euronews-turkce-rss",
    language: "tr",
    format: "rss2",
    feeds: [{ url: "https://tr.euronews.com/rss", category: "auto" }],
  },
  {
    source: "bbc-news-rss",
    language: "en",
    format: "rss2",
    // BBC's English service is the only one of its language editions that
    // publishes real per-category feeds — every one below curled to
    // genuinely distinct content, not the redirect-to-general trap the
    // other BBC language services (and Turkish Hürriyet dead slugs) hit.
    // Sport lives under a different subdomain path than the rest.
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "ekonomi" },
      { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "teknoloji" },
      { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "bilim" },
      { url: "https://feeds.bbci.co.uk/news/politics/rss.xml", category: "siyaset" },
      { url: "https://feeds.bbci.co.uk/news/health/rss.xml", category: "sağlık" },
      { url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", category: "eğlence" },
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "dünya" },
      { url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "spor" },
    ],
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
    // Real per-category feeds, verified by content (curled and diffed —
    // not the ".../index~rss2.xml" URL shape alone, which would've been
    // a guess). "inland" (domestic Germany) skews heavily political in
    // practice (tagesschau is Germany's flagship politics/current-affairs
    // broadcast), mapped to siyaset rather than left out.
    feeds: [
      { url: "https://www.tagesschau.de/wirtschaft/index~rss2.xml", category: "ekonomi" },
      { url: "https://www.tagesschau.de/inland/index~rss2.xml", category: "siyaset" },
      { url: "https://www.tagesschau.de/ausland/index~rss2.xml", category: "dünya" },
      { url: "https://www.tagesschau.de/sport/index~rss2.xml", category: "spor" },
      { url: "https://www.tagesschau.de/wissen/index~rss2.xml", category: "bilim" },
    ],
  },
  {
    source: "nhk-rss",
    language: "ja",
    format: "rss2",
    // NHK's numbered category feeds (cat1-cat7, undocumented but each
    // curled and confirmed genuinely distinct Japanese content, not a
    // shared fallback). cat1 (社会 "society/local affairs") skipped —
    // doesn't map cleanly onto any category here, same "skip rather than
    // force-fit" call as Hürriyet's kelebek/astroloji.
    feeds: [
      { url: "https://www3.nhk.or.jp/rss/news/cat5.xml", category: "ekonomi" },
      { url: "https://www3.nhk.or.jp/rss/news/cat4.xml", category: "siyaset" },
      { url: "https://www3.nhk.or.jp/rss/news/cat6.xml", category: "dünya" },
      { url: "https://www3.nhk.or.jp/rss/news/cat7.xml", category: "spor" },
      { url: "https://www3.nhk.or.jp/rss/news/cat3.xml", category: "bilim" },
      { url: "https://www3.nhk.or.jp/rss/news/cat2.xml", category: "eğlence" },
    ],
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
                const title = String(item.title).trim();
                const subtitle = item.description ? String(item.description).trim().slice(0, 200) : null;
                rows.push({
                  source,
                  external_id: link,
                  kind: "news",
                  category: category === "auto" ? classifyTurkishCategory(title, subtitle) : category,
                  language,
                  title,
                  subtitle,
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

    // A real category split (2026-09-11) means the same story can legitimately
    // appear in more than one section feed of the same publisher (a big
    // world story often runs in both "world" and "politics", say) — two
    // rows with the same (source, external_id) in one batch makes Postgres
    // reject the whole upsert ("ON CONFLICT DO UPDATE command cannot affect
    // row a second time"), not just the duplicate. Keep the first
    // occurrence per key — the feed order above lists the more specific
    // categories (ekonomi, teknoloji, ...) before the catch-all ones
    // (dünya), so a cross-posted story keeps its more specific category.
    const seen = new Set<string>();
    const dedupedRows = rows.filter((row) => {
      const key = `${row.source}:${row.external_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const { error } = await ctx.supabaseAdmin
      .from("real_world_events")
      .upsert(dedupedRows, { onConflict: "source,external_id" });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ upserted: dedupedRows.length, skipped, errors });
  }),
};
