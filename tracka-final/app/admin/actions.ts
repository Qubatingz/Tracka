'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function setSellerStatus(formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase.rpc('admin_set_seller_status', {
    p_seller: String(formData.get('id')),
    p_status: String(formData.get('status')),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
  revalidatePath('/admin/promoters');
  revalidatePath('/marketplace');
}
