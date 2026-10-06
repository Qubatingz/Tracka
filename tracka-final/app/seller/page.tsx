import Icon from '@/components/Icon';
import Pill from '@/components/Pill';
import SellerTabs from '@/components/SellerTabs';
import SellerHead from '@/components/SellerHead';
import RpcButton from '@/components/RpcButton';
import RpcForm from '@/components/RpcForm';
import ProofForm from '@/components/ProofForm';
import ReplyForm from '@/components/ReplyForm';
import ProofView from '@/components/ProofView';
import { BookingJourney } from '@/components/Journey';
import { sellerPage } from '@/lib/seller';
import { signedMap } from '@/lib/media';
import { rwf } from '@/lib/util';
import { niceDay, todayS } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export default async function SellerHome() {
  const { supabase, seller, profile, photo } = await sellerPage();
  const { data: bks } = await supabase.from('bookings').select('*').eq('seller_id', seller.id).neq('status', 'pending_payment').order('created_at', { ascending: false });
  const mine = bks || [];
  const cids = Array.from(new Set(mine.map((b: any) => b.campaign_id)));
  const { data: camps } = cids.length ? await supabase.from('campaigns').select('id,title,genre,song_path,link,artist_id').in('id', cids) : { data: [] as any[] };
  const aids = Array.from(new Set((camps || []).map((c: any) => c.artist_id)));
  const bids = mine.map((b: any) => b.id);
  const [{ data: artists }, { data: proofs }] = await Promise.all([
    aids.length ? supabase.from('public_profiles').select('id,display_name').in('id', aids) : Promise.resolve({ data: [] as any[] }),
    bids.length ? supabase.from('proofs').select('*').in('booking_id', bids).order('created_at') : Promise.resolve({ data: [] as any[] }),
  ]);
  const songs = await signedMap(supabase, 'songs', (camps || []).map((c: any) => c.song_path));
  const media = await signedMap(supabase, 'proofs', (proofs || []).flatMap((p: any) => [p.image_path, p.video_path]));
  const camp = (id: string) => (camps || []).find((c: any) => c.id === id) || { title: 'Song' };
  const artistName = (aid: string) => (artists || []).find((a: any) => a.id === aid)?.display_name || 'An artist';
  const proofOf = (bid: string) => (proofs || []).filter((p: any) => p.booking_id === bid && p.kind === 'proof').pop();
  const replyOf = (bid: string) => (proofs || []).filter((p: any) => p.booking_id === bid && p.kind === 'reply').pop();
  const todo = mine.filter((b: any) => ['booked', 'scheduled', 'live'].includes(b.status));
  const wait = mine.filter((b: any) => ['proof_submitted', 'disputed'].includes(b.status));
  const done = mine.filter((b: any) => ['approved', 'paid_out', 'declined', 'refunded'].includes(b.status));
  const sum = (sts: string[]) => mine.filter((b: any) => sts.includes(b.status)).reduce((t: number, b: any) => t + b.price, 0);
  const today = todayS();

  return (
    <div className="page">
      <SellerTabs active="/seller" todo={todo.length} />
      <SellerHead seller={seller} profile={profile} photo={photo} />
      {seller.status === 'pending' && (
        <div className="panel-yellow bigstate small">
          <Icon name="clock" size={30} />
          <div>
            <strong>We&apos;re checking your ID and your page.</strong>
            <p>Meanwhile, finish your profile and calendar: full profiles get booked more.</p>
          </div>
        </div>
      )}
      {(seller.status === 'rejected' || seller.status === 'suspended') && (
        <div className="panel bigstate small">
          <Icon name="lock" size={30} />
          <div>
            <strong>{seller.status === 'suspended' ? 'Your account is suspended.' : 'Not approved yet.'}</strong>
            <p>Contact the Tracka team to know more.</p>
          </div>
        </div>
      )}
      {seller.status === 'verified' && (
        <div className="stats">
          <div>
            <small>
              <Icon name="clock" size={14} /> To do
            </small>
            <strong>{todo.length}</strong>
          </div>
          <div>
            <small>
              <Icon name="eye" size={14} /> Waiting for check
            </small>
            <strong>{wait.length}</strong>
          </div>
          <div>
            <small>
              <Icon name="check" size={14} /> Coming to you
            </small>
            <strong>{rwf(sum(['approved']))}</strong>
          </div>
          <div>
            <small>
              <Icon name="phone" size={14} /> Paid to you
            </small>
            <strong>{rwf(sum(['paid_out']))}</strong>
          </div>
        </div>
      )}

      <h2 className="st">To do{todo.length ? ` (${todo.length})` : ''}</h2>
      {todo.length === 0 && (
        <div className="emptybox small">
          <Icon name="check" size={28} />
          <p>Nothing to do right now.</p>
        </div>
      )}
      {todo.map((b: any) => {
        const c: any = camp(b.campaign_id);
        const acc = !!b.accepted_at;
        return (
          <div className="panel bookcard" key={b.id}>
            <div className="row between">
              <div>
                <strong className="btitle">{c.title}</strong>
                <small className="muted">
                  {artistName(c.artist_id)} · {c.genre || 'Single'}
                  {b.run_date ? ` · On ${niceDay(b.run_date)}` : b.want_date ? ` · Artist wants ${niceDay(b.want_date)}` : ''}
                  {b.due_date ? ` · Due ${niceDay(b.due_date)}` : ''}
                </small>
              </div>
              <div className="row">
                <span className="price">{rwf(b.price)}</span>
                <Pill st={b.status} />
              </div>
            </div>
            <BookingJourney b={b} />
            {songs[c.song_path] && <audio controls src={songs[c.song_path]} />}
            {c.link && (
              <p className="hint">
                Link:{' '}
                <a href={c.link} target="_blank" rel="noopener noreferrer">
                  {c.link}
                </a>
              </p>
            )}
            {b.status === 'booked' && !acc && (
              <div className="actionbox" style={{ marginTop: 14 }}>
                <p>Listen to the song, then accept within 48 hours. If you don&apos;t answer, the booking is cancelled.</p>
                <div className="row">
                  <RpcButton fn="accept_booking" args={{ p_booking: b.id }} label="✓ Accept" small={false} />
                  <RpcButton fn="decline_booking" args={{ p_booking: b.id }} label="Decline" kind="red" confirmText="Decline this booking? The artist gets the money back." />
                </div>
              </div>
            )}
            {b.status === 'booked' && acc && (
              <div style={{ marginTop: 14 }}>
                <RpcForm fn="schedule_booking" args={{ p_booking: b.id }} inline fields={[{ name: 'p_date', label: 'When will it run?', type: 'date', required: true, min: today, defaultValue: b.want_date && b.want_date >= today ? b.want_date : '' }]} submit="Schedule" />
              </div>
            )}
            {b.status === 'scheduled' && (
              <p style={{ marginTop: 14 }}>
                <RpcButton fn="mark_live" args={{ p_booking: b.id }} label="It's live" small={false} />
              </p>
            )}
            {(b.status === 'scheduled' || b.status === 'live') && <ProofForm bookingId={b.id} open={b.status === 'live'} />}
          </div>
        );
      })}

      {wait.length > 0 && <h2 className="st">Waiting for a check</h2>}
      {wait.map((b: any) => {
        const c: any = camp(b.campaign_id);
        return (
          <div className="item" key={b.id}>
            <div className="grow">
              <strong>{c.title}</strong>
              <small>{b.status === 'disputed' ? `The artist reported: “${b.problem}”. We're checking.` : `Proof sent. You get ${rwf(b.price)} once it's approved.`}</small>
            </div>
            <span className="price">{rwf(b.price)}</span>
            <Pill st={b.status} />
            <div className="jwrap">
              <BookingJourney b={b} />
            </div>
            <ProofView p={proofOf(b.id)} urls={media} />
            {b.status === 'disputed' &&
              (replyOf(b.id) ? (
                <p className="tipstate" style={{ flexBasis: '100%' }}>
                  <Icon name="check" size={16} />
                  Your answer was sent. We&apos;ll decide soon.
                </p>
              ) : (
                <ReplyForm bookingId={b.id} />
              ))}
          </div>
        );
      })}

      {done.length > 0 && (
        <details className="donebox">
          <summary>Done ({done.length})</summary>
          {done.map((b: any) => (
            <div className="item" key={b.id}>
              <div className="grow">
                <strong>{camp(b.campaign_id).title}</strong>
                {b.review && <small>“{b.review}”</small>}
              </div>
              {b.rating && <span className="starsdisp">{'★'.repeat(b.rating)}</span>}
              <span className="price">{rwf(b.price)}</span>
              <Pill st={b.status} />
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
