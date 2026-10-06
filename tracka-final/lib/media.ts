import type { createClient } from './supabase/server';

// Private files are opened with short-lived links (1 hour).
export async function signedMap(supabase: ReturnType<typeof createClient>, bucket: string, paths: (string | null | undefined)[]) {
  const list = Array.from(new Set(paths.filter(Boolean) as string[]));
  const out: Record<string, string> = {};
  if (!list.length) return out;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(list, 3600);
  for (const row of data || []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}
