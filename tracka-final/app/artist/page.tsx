import Link from 'next/link';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import Pill from '@/components/Pill';
import ArtistTabs from '@/components/ArtistTabs';
import { CampaignJourney } from '@/components/Journey';
import { getMe, faceUrl } from '@/lib/data';
import { rwf } from '@/lib/util';
import { fee } from '@/lib/labels';
import { saveName } from './actions';

export const dynamic = 'force-dynamic';

export default async function ArtistHome() {
  const { supabase, user, profile, seller } = await getMe();
  const { data: camps } = await supabase.from('campaigns').select('*').eq('artist_id', user!.id).order('created_at', { ascending: false });
  const list = camps || [];
  const ids = list.map((c: any) => c.id);
  const { data: bks } = ids.length ? await supabase.from('bookings').select('*').in('campaign_id', ids) : { data: [] as any[] };
  const bookings = bks || [];
  const sids = Array.from(new Set(bookings.map((b: any) => b.seller_id)));
  const { data: sellers } = sids.length ? await supabase.from('sellers').select('id,name').in('id', sids) : { data: [] as any[] };
  const nameOf = (id: string) => (sellers || []).find((s: any) => s.id === id)?.name || 'A promoter';
  const of = (cid: string) => bookings.filter((b: any) => b.campaign_id === cid);
  const onRoad = list.filter((c: any) => ['payment_submitted', 'review', 'changes', 'active'].includes(c.status)).length;
  const held = list
    .filter((c: any) => ['review', 'changes', 'active'].includes(c.status))
    .reduce((t: number, c: any) => t + of(c.id).filter((b: any) => !['declined', 'refunded', 'paid_out'].includes(b.status)).reduce((s: number, b: any) => s + b.price, 0), 0);
  const delivered = bookings.filter((b: any) => b.status === 'approved' || b.status === 'paid_out').length;

  const todo: { text: string; sub: string; href: string; cta: string }[] = [];
  for (const c of list) {
    if (c.status === 'draft') todo.push({ text: `Finish “${c.title}”`, sub: of(c.id).length ? 'Pay to start it.' : 'Pick your promoters.', href: `/artist/c/${c.id}${of(c.id).length ? '/pay' : ''}`, cta: 'Continue' });
    if (c.status === 'changes') todo.push({ text: `New version of “${c.title}”`, sub: 'Our team asked for a change.', href: `/artist/c/${c.id}`, cta: 'Fix it' });
    for (const b of of(c.id)) {
      if (b.status === 'proof_submitted') todo.push({ text: `Result from ${nameOf(b.seller_id)}`, sub: `For “${c.title}”. Check it.`, href: `/artist/c/${c.id}`, cta: 'Check' });
      if ((b.status === 'approved' || b.status === 'paid_out') && !b.rating) todo.push({ text: `Rate ${nameOf(b.seller_id)}`, sub: `For “${c.title}”.`, href: `/artist/c/${c.id}`, cta: 'Rate' });
    }
  }

  return (
    <div className="page">
      <ArtistTabs active="/artist" />
      <div className="profhead">
        {(profile?.photo_path || profile?.avatar) && <Avatar name={profile.display_name || 'Me'} photo={faceUrl(supabase, profile.photo_path)} avatar={profile.avatar} useAvatar={profile.use_avatar} size={76} />}
        <div className="grow">
          <h1>{profile?.display_name ? `Hi ${profile.display_name}.` : 'Your songs.'}</h1>
          <p className="sub">Everything about your campaigns, in one place.</p>
        </div>
        <Link className="btn btn-yellow" href="/artist/new">
          New campaign
        </Link>
      </div>
      {!profile?.display_name && (
        <form className="form panel" action={saveName} style={{ marginBottom: 22 }}>
          <label className="label">
            Your artist name
            <input className="input" name="name" required />
          </label>
          <div className="row">
            <button className="btn btn-yellow" type="submit">
              Save
            </button>
          </div>
        </form>
      )}
      <div className="stats">
        <div>
          <small>On the road</small>
          <strong>{onRoad}</strong>
        </div>
        <div>
          <small>
            <Icon name="lock" size={14} /> Money held safely
          </small>
          <strong>{rwf(held)}</strong>
        </div>
        <div>
          <small>Songs delivered</small>
          <strong>{delivered}</strong>
        </div>
      </div>
      {todo.length > 0 && (
        <>
          <h2 className="st">Needs you</h2>
          {todo.map((t, i) => (
            <div className="item todo" key={i}>
              <Icon name="clock" size={20} />
              <div className="grow">
                <strong>{t.text}</strong>
                <small>{t.sub}</small>
              </div>
              <Link className="btn btn-yellow btn-sm" href={t.href}>
                {t.cta}
              </Link>
            </div>
          ))}
        </>
      )}
      <h2 className="st">Campaigns</h2>
      {list.length ? (
        list.map((c: any) => {
          const cb = of(c.id);
          const total = cb.reduce((s: number, b: any) => s + b.price, 0);
          return (
            <Link className="item" href={`/artist/c/${c.id}`} key={c.id}>
              <div className="grow">
                <strong>{c.title}</strong>
                <small>
                  {c.genre || 'Single'} · {cb.length} {cb.length === 1 ? 'promoter' : 'promoters'}
                </small>
              </div>
              <span className="price">{rwf(total + fee(total, c.fee_percent))}</span>
              <Pill st={c.status} />
              <div className="jwrap">
                <CampaignJourney c={c} bookings={cb} />
              </div>
            </Link>
          );
        })
      ) : (
        <div className="emptybox">
          <Icon name="note" size={34} />
          <p>No campaigns yet. Start with one song.</p>
          <Link className="btn btn-yellow btn-sm" href="/artist/new">
            Start a campaign
          </Link>
        </div>
      )}
      <div className="row" style={{ marginTop: 26 }}>
        {!seller && (
          <Link className="morelink" href="/sell">
            Do you also promote music? Sell on Tracka <Icon name="arrow" size={16} />
          </Link>
        )}
        <span className="spacer" />
        <form action="/auth/signout" method="post">
          <button className="btn btn-ghost btn-sm" type="submit">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
