import Link from 'next/link';
import { getMe } from '@/lib/data';
import Icon from './Icon';
import MobileMenu from './MobileMenu';

export default async function Header() {
  const { supabase, user, profile } = await getMe();
  let unread = 0;
  if (user) {
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
    unread = count || 0;
  }
  return (
    <header className="top">
      <Link className="logo" href="/" aria-label="Tracka home">
        <span className="wordmark">
          Tracka<i>.</i>
        </span>
      </Link>
      <nav className="mainnav" aria-label="Main">
        <Link href="/marketplace">Marketplace</Link>
        <Link href="/how">How it works</Link>
        <Link href="/sell">Sell on Tracka</Link>
      </nav>
      <span className="spacer" />
      {user ? (
        <>
          <Link className="bell" href="/notifications" aria-label={unread ? `${unread} new notifications` : 'Notifications'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.9 1.9 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && <span className="count">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <Link className="mebtn" href="/dashboard">
            <span className="meav empty">
              <Icon name={profile?.is_admin ? 'shield' : 'user'} size={18} />
            </span>
            <span className="melabel">{profile?.is_admin ? 'Control room' : 'Dashboard'}</span>
          </Link>
        </>
      ) : (
        <Link className="btn btn-yellow btn-sm" href="/login">
          Log in
        </Link>
      )}
      <MobileMenu />
    </header>
  );
}
