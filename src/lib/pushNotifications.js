import { supabase } from './supabase.js'

// Safe to embed — the VAPID public key is meant to be shared with every
// client; only its private half (in the send-push edge function's secrets)
// needs protecting. Generated once for this project; see supabase/schema.sql's
// WEB PUSH BİLDİRİMLERİ section for where the private key lives.
const VAPID_PUBLIC_KEY = 'BCk1kD_jJjzwJayr9bdyQ0XT36OqIkYctHrt0Gae0d1q3qvfLbhnbbGjlPIxQtPlPW3os0y9cZrDpscLP6P1nw8'

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' — enough states
// for a settings toggle to render correctly without asking for permission
// just to check.
export async function getPushSubscriptionState() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = reg ? await reg.pushManager.getSubscription() : null
  return sub ? 'subscribed' : 'unsubscribed'
}

export async function subscribeToPush(userId) {
  if (!isPushSupported()) throw new Error('Bu tarayıcı push bildirimlerini desteklemiyor.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Bildirim izni verilmedi.')

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  return sub
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (!sub) return
  const { endpoint } = sub
  await sub.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}
