import { createClient } from './supabase/server';

// Who is logged in, with their profile and (if they sell) their seller page.
export async function getMe() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as any, seller: null as any };
  const [{ data: profile }, { data: seller }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('sellers').select('*').eq('profile_id', user.id).maybeSingle(),
  ]);
  return { supabase, user, profile: profile as any, seller: seller as any };
}

export async function getSettings(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  return (data || {}) as any;
}

export function faceUrl(supabase: ReturnType<typeof createClient>, path?: string | null) {
  return path ? supabase.storage.from('faces').getPublicUrl(path).data.publicUrl : null;
}
