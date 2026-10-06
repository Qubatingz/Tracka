import { redirect } from 'next/navigation';
import { getMe } from '@/lib/data';

// Sends each person to the right place.
export default async function Dashboard() {
  const { user, profile, seller } = await getMe();
  if (!user) redirect('/login');
  if (profile?.is_admin) redirect('/admin');
  if (seller) redirect('/seller');
  redirect('/artist');
}
