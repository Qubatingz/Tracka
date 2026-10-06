import { createBrowserClient } from '@supabase/ssr';

// Supabase in the browser (login and file uploads).
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
