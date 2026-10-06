import { redirect } from 'next/navigation';
import { getMe, faceUrl } from './data';

export async function sellerPage() {
  const me = await getMe();
  if (!me.user) redirect('/login?next=/seller');
  if (!me.seller) redirect('/sell');
  return { ...me, photo: faceUrl(me.supabase, me.profile?.photo_path) };
}
