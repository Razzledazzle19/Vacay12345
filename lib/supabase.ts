import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Browser client that stores the session in cookies (not localStorage),
 * so Next.js middleware can read the session on every request.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
