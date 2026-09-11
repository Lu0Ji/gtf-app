// Refreshes public.real_world_events with upcoming rocket launches from The
// Space Devs' Launch Library 2 — free, public, no API key/signup (unlike
// football-data.org's Süper Lig tier, see below). Called from the client
// (Kesfet.jsx) the same refresh-on-view way fetch-sports-fixtures/
// fetch-news-headlines are.
//
// 2026-09-11: "kişiselleştirmeyi arttıralım" tavsiyesinin #7'si — "Yaklaşan
// Etkinlikler" tek kaynaktı (football-data.org). Gerçek boşluk araştırıldı:
// canlı verideki maçların kaynağı incelendiğinde SÜPER LİG HİÇ YOKTU —
// football-data.org'un competitions listesi (auth gerektirmeden erişilebilir)
// Süper Lig'i TIER_THREE olarak işaretliyor, mevcut ücretsiz anahtar sadece
// TIER_ONE'a erişebiliyor (Premier League/Bundesliga/Serie A gibi major
// Avrupa ligleri — canlı veride görülenle birebir eşleşiyor). Süper Lig'i
// açmak ücretli bir plan yükseltmesi gerektiriyor — bu bir maliyet kararı,
// tek taraflı yapılmadı, kullanıcıya ayrıca bildirildi. Alternatif bir
// ücretsiz Süper Lig kaynağı arandı: TheSportsDB'nin paylaşılan "3" test
// anahtarı çalışıyor ama üretim kullanımı için değil (ücretsiz/kayıtsız,
// ToS'u ihlal eder, herkesin paylaştığı bir anahtar) — o yüzden kullanılmadı.
//
// Bunun yerine gerçekten temiz bir kaynak eklendi: uzay fırlatmaları,
// "uzay" kategorisine tam oturan, genuinely açık bir API (bu proje için
// özel olarak tasarlanmamış ama herkese açık, üretim kullanımına uygun).
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const LAUNCH_LIBRARY_URL = "https://ll.thespacedevs.com/2.3.0/launches/upcoming/";
const STALE_AFTER_MINUTES = 60;
const LIMIT = 20;
// Only genuinely still-scheduled launches — "upcoming" per the API can
// still include one that already flew (a caching/last-updated lag seen
// directly while probing this API), which isn't a "predict the outcome"
// event anymore.
const OPEN_STATUSES = new Set(["Go for Launch", "To Be Determined", "To Be Confirmed", "Hold"]);

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (_req, ctx) => {
    const { data: latest } = await ctx.supabaseAdmin
      .from("real_world_events")
      .select("fetched_at")
      .eq("source", "thespacedevs")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const staleMs = STALE_AFTER_MINUTES * 60 * 1000;
    if (latest?.fetched_at && Date.now() - new Date(latest.fetched_at).getTime() < staleMs) {
      return Response.json({ skipped: true, reason: "cache still fresh" });
    }

    const apiRes = await fetch(`${LAUNCH_LIBRARY_URL}?limit=${LIMIT}&mode=normal`);
    if (!apiRes.ok) {
      const body = await apiRes.text();
      return Response.json({ error: `thespacedevs ${apiRes.status}`, body }, { status: 502 });
    }
    const payload = await apiRes.json();
    const launches = payload.results || [];
    const now = Date.now();

    const rows = launches
      .filter((l: any) => OPEN_STATUSES.has(l.status?.name) && new Date(l.net).getTime() > now)
      .map((l: any) => ({
        source: "thespacedevs",
        external_id: String(l.id),
        kind: "sports",
        category: "uzay",
        title: l.name,
        subtitle: l.launch_service_provider?.name || null,
        event_date: l.net,
        location: l.pad?.location?.name || null,
        metadata: {
          image: l.image?.image_url || l.image?.thumbnail_url || null,
          rocket: l.rocket?.configuration?.full_name || null,
          mission_type: l.mission?.type || null,
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
