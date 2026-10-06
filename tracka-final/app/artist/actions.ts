'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveName(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get('name') || '').trim().slice(0, 60);
  await supabase.from('profiles').update({ display_name: name }).eq('id', user.id);
  revalidatePath('/artist');
}
