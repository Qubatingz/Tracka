import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { markAllRead } from './actions';

export const dynamic = 'force-dynamic';

export default async function Notifications() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/notifications');
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  const list = data || [];
  const unread = list.filter((n: any) => !n.read_at).length;
  return (
    <div className="page narrow">
      <div className="head">
        <div>
          <h1>Notifications.</h1>
          <p className="sub">{unread ? `${unread} new` : 'You are all caught up.'}</p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="btn btn-ghost btn-sm" type="submit">
              Mark all as read
            </button>
          </form>
        )}
      </div>
      {list.length === 0 && <p className="sub">Nothing yet. When something happens to your songs or bookings, it shows up here.</p>}
      {list.map((n: any) => (
        <Link key={n.id} className={'item' + (n.read_at ? '' : ' todo')} href={n.href || '/dashboard'}>
          <div className="grow">
            <strong style={{ fontWeight: n.read_at ? 400 : 600 }}>{n.text}</strong>
            <small>{new Date(n.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
          </div>
        </Link>
      ))}
    </div>
  );
}
