import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import ArtistTabs from '@/components/ArtistTabs';
import { getMe, getSettings } from '@/lib/data';
import { catName, rwf } from '@/lib/util';
import { niceDay } from '@/lib/calendar';
import { fee } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function Receipt({ params }: { params: { id: string } }) {
  const { supabase, profile } = await getMe();
  const { data: c } = await supabase.from('campaigns').select('*').eq('id', params.id).maybeSingle();
  if (!c) notFound();
  const [{ data: bks }, settings] = await Promise.all([supabase.from('bookings').select('*').eq('campaign_id', c.id), getSettings(supabase)]);
  const bookings = bks || [];
  const ids = bookings.map((b: any) => b.id);
  const [{ data: sellers }, { data: tips }] = await Promise.all([
    bookings.length ? supabase.from('sellers').select('id,name,category,custom_category').in('id', bookings.map((b: any) => b.seller_id)) : Promise.resolve({ data: [] as any[] }),
    ids.length ? supabase.from('tips').select('*').in('booking_id', ids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const total = bookings.reduce((t: number, b: any) => t + b.price, 0);
  const f = fee(total, c.fee_percent);
  const back = bookings.filter((b: any) => b.status === 'declined' || b.status === 'refunded').reduce((t: number, b: any) => t + b.price, 0);
  const tipTotal = (tips || []).filter((t: any) => t.status !== 'submitted').reduce((s: number, t: any) => s + t.amount, 0);
  const no = 'TR-' + String(c.id).slice(0, 6).toUpperCase();
  const wa = `Tracka receipt ${no}\n“${c.title}”\nPaid: ${rwf(total + f)}${back ? `\nRefunded: ${rwf(back)}` : ''}\nFinal cost: ${rwf(total + f - back)}`;
  return (
    <div className="page narrow">
      <ArtistTabs active="" />
      <p>
        <Link href={`/artist/c/${c.id}`}>← Back to the tracker</Link>
      </p>
      <article className="rcpt">
        <div className="rtop">
          <strong className="rlogo wordmark">
            Tracka<i>.</i>
          </strong>
          <span className="rlabel">Receipt</span>
        </div>
        <dl className="rmeta">
          <div>
            <dt>Receipt no.</dt>
            <dd>{no}</dd>
          </div>
          <div>
            <dt>Date paid</dt>
            <dd>{c.paid_at ? new Date(c.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd>
          </div>
          <div>
            <dt>Artist</dt>
            <dd>{profile?.display_name || 'Artist'}</dd>
          </div>
          <div>
            <dt>Song</dt>
            <dd>“{c.title}”</dd>
          </div>
          <div>
            <dt>Paid with</dt>
            <dd>MoMo · {c.momo_txn || '—'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{c.status === 'completed' ? 'Complete' : 'In progress'}</dd>
          </div>
        </dl>
        <table className="rtable">
          <thead>
            <tr>
              <th>Promoter</th>
              <th>Status</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b: any) => {
              const s: any = (sellers || []).find((x: any) => x.id === b.seller_id) || { name: 'Promoter', category: 'other' };
              const refunded = b.status === 'declined' || b.status === 'refunded';
              return (
                <tr key={b.id}>
                  <td>
                    {s.name}
                    <small>
                      {catName(s)}
                      {b.run_date ? ' · ' + niceDay(b.run_date) : ''}
                    </small>
                  </td>
                  <td>{refunded ? 'Refunded' : b.status === 'approved' || b.status === 'paid_out' ? 'Delivered ✓' : 'In progress'}</td>
                  <td className="num">{rwf(b.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <dl className="rsum">
          <div>
            <dt>Promoters</dt>
            <dd>{rwf(total)}</dd>
          </div>
          {f > 0 && (
            <div>
              <dt>Service fee ({c.fee_percent}%)</dt>
              <dd>{rwf(f)}</dd>
            </div>
          )}
          <div className="big">
            <dt>Total paid</dt>
            <dd>{rwf(total + f)}</dd>
          </div>
          {back > 0 && (
            <div>
              <dt>Refunded to you</dt>
              <dd>− {rwf(back)}</dd>
            </div>
          )}
          <div className="big">
            <dt>Final cost</dt>
            <dd>{rwf(total + f - back)}</dd>
          </div>
          {tipTotal > 0 && (
            <div>
              <dt>Tips (100% to promoters)</dt>
              <dd>{rwf(tipTotal)}</dd>
            </div>
          )}
        </dl>
        <p className="rfoot">
          Money is held by Tracka until each promoter&apos;s proof is approved. {settings.rdb ? `RDB ${settings.rdb} · ` : ''}
          <Link href="/terms">Terms and conditions</Link>
        </p>
      </article>
      <div className="row" style={{ marginTop: 18 }}>
        <a className="btn btn-wa" href={`https://wa.me/?text=${encodeURIComponent(wa)}`} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={18} />
          Send to WhatsApp
        </a>
      </div>
    </div>
  );
}
