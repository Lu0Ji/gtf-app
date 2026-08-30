import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY env vars')
}

export const supabase = createClient(url, key)

// Public feed queries filter out group-scoped predictions with
// .is('group_id', null) — but that column only exists once the project's
// SQL Editor has run the "GROUP-SCOPED PREDICTIONS" migration in
// supabase/schema.sql. Until then, filtering by it 400s with Postgres error
// 42703 (undefined_column). Rather than let that silently empty out the
// whole public feed, retry once without the filter so the app degrades to
// "group predictions may still show in the public feed" instead of
// "nothing shows at all."
export async function queryWithGroupIdFallback(makeQuery) {
  const result = await makeQuery(true)
  if (result.error?.code === '42703') {
    return makeQuery(false)
  }
  return result
}
