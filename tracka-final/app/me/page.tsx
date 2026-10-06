import AvatarMaker from '@/components/AvatarMaker';
import { getMe } from '@/lib/data';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Me({ searchParams }: { searchParams: { back?: string } }) {
  const { user, profile } = await getMe();
  if (!user) redirect('/login?next=/me');
  const back = searchParams.back && searchParams.back.startsWith('/') ? searchParams.back : '/dashboard';
  return (
    <div className="page">
      <div className="head">
        <div>
          <h1>Your avatar.</h1>
          <p className="sub">It shows on your profile, your bookings and your reviews.</p>
        </div>
      </div>
      <AvatarMaker userId={user.id} initial={profile?.avatar || null} back={back} />
    </div>
  );
}
