// Sends a Web Push notification to every subscription a user has (they can
// have more than one — different browsers/devices). Called from Postgres
// triggers (supabase/schema.sql's WEB PUSH BİLDİRİMLERİ section, via
// pg_net) with a shared secret header — never with a Supabase JWT, so it's
// deployed with --no-verify-jwt and does its own check instead. That's a
// deliberate scope-down from the project's usual service_role-key auth
// (withSupabase's auth:["secret"]): the trigger only ever needs to say
// "push this one notification", never anything a real service_role key
// could also do, so a leaked trigger secret can't read/write any table.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import webpush from "npm:web-push@3.6.7";

const TRIGGER_SECRET = Deno.env.get("PUSH_TRIGGER_SECRET");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:destek@gelecektahminfonu.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

Deno.serve(async (req) => {
  if (!TRIGGER_SECRET || req.headers.get("x-push-trigger-secret") !== TRIGGER_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return Response.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  let body: { user_id?: string; title?: string; body?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { user_id, title, body: message, url = "/" } = body;
  if (!user_id || !title || !message) {
    return Response.json({ error: "user_id, title, body are required" }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) return Response.json({ sent: 0, reason: "no subscriptions" });

  const payload = JSON.stringify({ title, body: message, url });
  const staleIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (e) {
        // 404/410 means the browser/OS dropped this subscription — clean it
        // up so future pushes to this user don't keep paying for a dead
        // endpoint. Any other error (network blip, etc.) is left alone.
        const status = e?.statusCode;
        if (status === 404 || status === 410) staleIds.push(sub.id);
      }
    })
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return Response.json({ sent, pruned: staleIds.length });
});
