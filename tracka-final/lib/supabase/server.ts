import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supabase for server code. It acts as the logged-in person, so the database privacy rules apply.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: fine, the middleware refreshes the session.
        }
      },
    },
  });
}
