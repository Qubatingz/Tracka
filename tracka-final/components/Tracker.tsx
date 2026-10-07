import Link from 'next/link';
import Icon from './Icon';
import Avatar from './Avatar';
import Pill from './Pill';
import ArtistTabs from './ArtistTabs';
import ProofView from './ProofView';
import RpcButton from './RpcButton';
import RpcForm from './RpcForm';
import RateForm from './RateForm';
import TipForm from './TipForm';
import NewVersionForm from './NewVersionForm';
import RwandaMap from './RwandaMap';
import ResultCard from './ResultCard';
import { CampaignJourney } from './Journey';
import { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/data';
import { signedMap } from '@/lib/media';
import { catName, rwf } from '@/lib/util';
import { bookingDates, niceDays } from '@/lib/calendar';
import { fee } from '@/lib/labels';

const when = (t?: string | null) => (t ? new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const AFTER = (b: any, sts: string[]) => sts.includes(b.status);

export default async function Tracker({ c, bookings }: { c: any; bookings: any[] }) {
  const supabase = createClient();
  const settings = await getSettings(supabase);
  const sids = Array.from(new Set(bookings.map((b) => b.seller_id)));
  const bids = bookings.map((b) => b.id);
  const [{ data: sellers }, { data: proofs }, { data: tips }, { data: me }] = await Promise.all([
    sids.length ? supabase.from('sellers').select('id,name,category,custom_category,location,profile_id') .in('id', sids) : Promise.resolve({ data: [] as any[] }),
    bids.length ? supabase.from('proofs').select('*').in('booking_id', bids).order('created_at') : Promise.resolve({ data: [] as any[] }),
    bids.length ? supabase.from('tips').select('*').in('booking_id', bids) : Promise.resolve({ data: [] as any[] }),
    supabase.from('public_profiles').select('display_name').eq('id', c.artist_id).maybeSingle(),
  ]);
  const media = await signedMap(supabase, 'proofs', (proofs || []).flatMap((p: any) => [p.image_path, p.video_path]));
  const song = c.song_path ? (await supabase.storage.from('songs').createSignedUrl(c.song_path, 3600)).data?.signedUrl : null;
  const sellerOf = (id: string) => (sellers || []).find((s: any) => s.id === id) || { name: 'Promoter', category: 'other' };
  const proofOf = (bid: string) => (proofs || []).filter((p: any) => p.booking_id === bid && p.kind === 'proof').pop();
  const replyOf = (bid: string) => (proofs || []).filter((p: any) => p.booking_id === bid && p.kind === 'reply').pop();
  const tipOf = (bid: string) => (tips || []).find((t: any) => t.booking_id === bid);
  const live = bookings.filter((b) => b.status !== 'declined' && b.status !== 'refunded');
  const done = live.filter((b) => b.status === 'approved' || b.status === 'paid_out').length;
  const total = bookings.reduce((t, b) => t + b.price, 0);
  const f = fee(total, c.fee_percent);
  const released = bookings.filter((b) => b.status === 'paid_out').reduce((t, b) => t + b.price, 0);
  const back = bookings.filter((b) => b.status === 'declined' || b.status === 'refunded').reduce((t, b) => t + b.price, 0);
  const no = 'TR-' + String(c.id).slice(0, 6).toUpperCase();

  let body: React.ReactNode;
  if (c.status === 'payment_submitted') {
    body = (
      <div className="panel-yellow bigstate">
        <Icon name="clock" size={40} />
        <h2>Checking your payment.</h2>
        <p>Transaction {c.momo_txn}. When it&apos;s confirmed, our team listens to your song.</p>
      </div>
    );
  } else if (c.status === 'review') {
    body = (
      <div className="panel-yellow bigstate">
        <Icon name="note" size={40} />
        <h2>We&apos;re listening to your song.</h2>
        <p>Payment confirmed ✓. Our team checks every song before promoters get it, usually within a day. Your money stays held.</p>
      </div>
    );
  } else if (c.status === 'changes') {
    body = (
      <div className="panel-yellow bigstate">
        <h2>Please send a new version.</h2>
        <p>
          <b>Our team says:</b> “{c.fix_reason}”
        </p>
        <NewVersionForm campaignId={c.id} version={(c.song_version || 1) + 1} />
      </div>
    );
  } else {
    body = (
      <div className="tgrid">
        {bookings.map((b) => {
          const p: any = sellerOf(b.seller_id);
          const pn = p.name;
          const cancelled = b.status === 'declined' || b.status === 'refunded';
          const steps: [string, string, string, string | null, boolean][] = [
            ['paid', 'You paid', `${rwf(b.price)} held safely`, c.paid_at, true],
            ['review', 'Tracka approved your song', '', c.reviewed_at, !!c.reviewed_at],
            ['accepted', `${pn} accepted`, '', b.accepted_at, !!b.accepted_at || AFTER(b, ['scheduled', 'live', 'proof_submitted', 'disputed', 'approved', 'paid_out'])],
            [
              'scheduled',
              b.plays > 1 ? 'Dates set' : 'Date set',
              (b.run_dates || []).length || b.run_date ? `Runs ${niceDays(bookingDates(b))}` : bookingDates(b).length ? `You asked for ${niceDays(bookingDates(b))}` : '',
              b.scheduled_at,
              !!b.run_date || AFTER(b, ['live', 'proof_submitted', 'disputed', 'approved', 'paid_out']),
            ],
            ['live', "It's out!", '', b.live_at, AFTER(b, ['live', 'proof_submitted', 'disputed', 'approved', 'paid_out'])],
            ['proof', 'Result arrived', 'Screenshot or video', b.proof_at, AFTER(b, ['proof_submitted', 'disputed', 'approved', 'paid_out'])],
            ['done', 'Done', b.status === 'paid_out' ? `${pn} was paid` : 'Approved · payment going out', b.paid_out_at || b.approved_at, AFTER(b, ['approved', 'paid_out'])],
          ];
          const nowIdx = steps.findIndex((x) => !x[4]);
          const tip = tipOf(b.id);
          return (
            <article className="tcard" key={b.id}>
              <div className="subtop">
                <Avatar name={pn} category={p.category} size={46} />
                <div className="grow">
                  <strong>
                    <Link href={`/p/${b.seller_id}`}>{pn}</Link>
                  </strong>
                  <small>
                    {catName(p)}
                    {p.location ? ' · ' + p.location : ''}
                    {b.plays > 1 ? ` · package of ${b.plays} plays` : ''}
                  </small>
                </div>
                <span className="price">{rwf(b.price)}</span>
              </div>
              <ol className="tl">
                {steps.map((x, i) => {
                  const cls = x[4] ? 'done' : !cancelled && i === nowIdx ? 'now' : '';
                  return (
                    <li key={x[0]} className={cls}>
                      <span className="tldot" aria-hidden="true">
                        {x[4] ? '✓' : ''}
                      </span>
                      <div className="tlbody">
                        <div className="tlhead">
                          <strong>{x[1]}</strong>
                          {x[3] ? <time className="tltime">{when(x[3])}</time> : cls === 'now' ? <span className="tlwait">Waiting…</span> : null}
                        </div>
                        {x[2] && <small>{x[2]}</small>}
                        {x[0] === 'proof' && x[4] && (
                          <>
                            <ProofView p={proofOf(b.id)} urls={media} />
                            {b.status === 'proof_submitted' && (
                              <div className="actionbox">
                                <p>Your money is still held. Happy with the result?</p>
                                <RpcButton fn="approve_result" args={{ p_booking: b.id }} label="✓ Looks good" />
                                <div style={{ marginTop: 10 }}>
                                  <RpcForm fn="report_problem" args={{ p_booking: b.id }} fields={[{ name: 'p_why', label: 'Something wrong? Tell us', placeholder: 'What went wrong?', required: true }]} submit="Report a problem" kind="red" />
                                </div>
                              </div>
                            )}
                            {b.status === 'disputed' && (
                              <>
                                <p className="hint">You reported: “{b.problem}”. We are checking. Your money stays held.</p>
                                {replyOf(b.id) && (
                                  <>
                                    <p className="subprob reply">{pn} answers:</p>
                                    <ProofView p={replyOf(b.id)} urls={media} />
                                  </>
                                )}
                              </>
                            )}
                          </>
                        )}
                        {x[0] === 'done' && x[4] && (
                          <>
                            {b.rating ? (
                              <p className="rated">
                                <span className="starsdisp">{'★'.repeat(b.rating)}</span> You rated {pn}
                              </p>
                            ) : (
                              <RateForm bookingId={b.id} name={pn} />
                            )}
                            {tip ? (
                              <p className="tipstate">
                                <Icon name="star" size={16} />
                                Tip {rwf(tip.amount)} · {tip.status === 'submitted' ? "we're checking it" : tip.status === 'confirmed' ? `on its way to ${pn}` : `delivered to ${pn} ✓`}
                              </p>
                            ) : (
                              <TipForm bookingId={b.id} name={pn} momo={settings.momo_code} />
                            )}
                            <div className="row" style={{ gap: '6px 16px' }}>
                              <Link className="morelink" href={`/artist/c/${c.id}/receipt`}>
                                <Icon name="blog" size={16} /> See your receipt
                              </Link>
                              <Link className="morelink" href={`/artist/new?seller=${b.seller_id}`}>
                                <Icon name="arrow" size={16} /> Book again
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
                {cancelled && (
                  <li className="cancel">
                    <span className="tldot" aria-hidden="true">
                      ✕
                    </span>
                    <div className="tlbody">
                      <div className="tlhead">
                        <strong>{b.status === 'declined' ? `${pn} declined` : 'Cancelled'}</strong>
                        {b.closed_at && <time className="tltime">{when(b.closed_at)}</time>}
                      </div>
                      <small>{b.refund_sent_at ? `Refund of ${rwf(b.price)} sent to your MoMo ✓` : `${rwf(b.price)} comes back to you`}</small>
                    </div>
                  </li>
                )}
              </ol>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="page">
      <ArtistTabs active="" />
      <div className="head">
        <div>
          <p className="sub" style={{ margin: 0 }}>
            {c.genre || 'Single'}
          </p>
          <h1>{c.title}</h1>
        </div>
        <div className="row">
          <Pill st={c.status} />
          {c.status !== 'payment_submitted' && (
            <Link className="btn btn-ghost btn-sm" href={`/artist/c/${c.id}/receipt`}>
              <Icon name="blog" size={16} /> Receipt
            </Link>
          )}
        </div>
      </div>
      {song && <audio controls src={song} />}
      <div className="trackhead panel" style={{ marginTop: 14 }}>
        <CampaignJourney c={c} bookings={bookings} />
        <span className="hint">
          <b>
            {done} of {live.length}
          </b>{' '}
          delivered · we&apos;ll notify you at every step
        </span>
      </div>
      {body}
      {(c.status === 'active' || c.status === 'completed') && (
        <>
          <RwandaMap
            items={bookings.map((b) => {
              const p: any = sellerOf(b.seller_id);
              const st: 'done' | 'coming' | 'off' = b.status === 'declined' || b.status === 'refunded' ? 'off' : AFTER(b, ['live', 'proof_submitted', 'disputed', 'approved', 'paid_out']) ? 'done' : 'coming';
              return { id: b.id, name: p.name, category: p.category, location: p.location, state: st };
            })}
          />
          <ResultCard
            title={c.title}
            artist={me?.display_name || 'An artist'}
            items={bookings
              .filter((b) => b.status !== 'declined' && b.status !== 'refunded')
              .map((b) => {
                const p: any = sellerOf(b.seller_id);
                return { name: p.name, category: p.category, location: p.location, plays: b.plays || 1, done: AFTER(b, ['proof_submitted', 'approved', 'paid_out']) };
              })}
          />
        </>
      )}
      <div className="money" style={{ marginTop: 24 }}>
        <div>
          <small>Paid</small>
          <strong>{rwf(total + f)}</strong>
        </div>
        <div>
          <small>
            <Icon name="lock" size={14} /> Held safely
          </small>
          <strong>{rwf(total - released - back)}</strong>
        </div>
        <div>
          <small>Released to promoters</small>
          <strong>{rwf(released)}</strong>
        </div>
        {back > 0 && (
          <div>
            <small>Back to you</small>
            <strong>{rwf(back)}</strong>
          </div>
        )}
      </div>
      <div className="row" style={{ marginTop: 22 }}>
        <a className="btn btn-wa" href={`https://wa.me/?text=${encodeURIComponent(`My song “${c.title}” is on the road with Tracka!` + (c.link ? ' ' + c.link : ''))}`} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={18} />
          Share on WhatsApp
        </a>
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        Need a refund?{' '}
        {settings.email ? <a href={`mailto:${settings.email}?subject=${encodeURIComponent(`Refund request: ${c.title} (${no})`)}`}>Email us</a> : 'Email us'} and our team will look at it.
      </p>
    </div>
  );
}
