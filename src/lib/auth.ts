import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

console.log('Supabase URL tersedia:', !!supabaseUrl)
console.log('Supabase Key tersedia:', !!supabaseKey)

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase environment variables tidak terbaca. Periksa .env.local'
  )
}

export const supabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseKey
)