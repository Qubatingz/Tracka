import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Icon from '@/components/Icon';
import ArtistTabs from '@/components/ArtistTabs';
import PayForm from '@/components/PayForm';
import { getMe, getSettings } from '@/lib/data';
import { catName, rwf } from '@/lib/util';
import { niceDay } from '@/lib/calendar';
import { fee } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function Pay({ params }: { params: { id: string } }) {
  const { supabase } = await getMe();
  const { data: c } = await supabase.from('campaigns').select('*').eq('id', params.id).maybeSingle();
  if (!c) notFound();
  if (c.status !== 'draft') redirect(`/artist/c/${c.id}`);
  const [{ data: bks }, settings] = await Promise.all([supabase.from('bookings').select('*').eq('campaign_id', c.id), getSettings(supabase)]);
  const bookings = bks || [];
  if (!bookings.length) redirect(`/artist/c/${c.id}`);
  const { data: sellers } = await supabase.from('sellers').select('id,name,category,custom_category').in('id', bookings.map((b: any) => b.seller_id));
  const total = bookings.reduce((t: number, b: any) => t + b.price, 0);
  const f = fee(total, settings.fee_percent);
  return (
    <div className="page narrow">
      <ArtistTabs active="" />
      <ol className="stepper" aria-label="Campaign steps">
        <li className="done">
          <b>✓</b>Song
        </li>
        <li className="done">
          <b>✓</b>Promoters
        </li>
        <li className="now" aria-current="step">
          <b>3</b>Pay
        </li>
      </ol>
      <div className="head">
        <h1>One payment.</h1>
      </div>
      <div className="receipt">
        <div className="row between">
          <strong>“{c.title}”</strong>
          <small>{c.genre || 'Single'}</small>
        </div>
        <ul>
          {bookings.map((b: any) => {
            const s: any = (sellers || []).find((x: any) => x.id === b.seller_id) || { name: 'Promoter', category: 'other' };
            return (
              <li key={b.id}>
                <span>
                  <Icon name={s.category} size={18} />
                  {s.name}
                  {b.want_date && <small> · {niceDay(b.want_date)}</small>}
                </span>
                <span>{rwf(b.price)}</span>
              </li>
            );
          })}
        </ul>
        {f > 0 && (
          <div className="row between">
            <span>Service fee ({settings.fee_percent}%)</span>
            <span>{rwf(f)}</span>
          </div>
        )}
        <div className="row between rtotal">
          <strong>Total</strong>
          <strong>{rwf(total + f)}</strong>
        </div>
      </div>
      <div className="shield">
        <Icon name="shield" size={28} />
        <div>
          <strong>Protected payment</strong>
          We hold your money. Each promoter is paid only after you see proof. No proof by the due date? You get it back.
        </div>
      </div>
      <h2 className="st">Pay with MoMo</h2>
      <p style={{ margin: '0 0 14px' }}>
        Pay <b>{rwf(total + f)}</b> to MoMo Pay code <b>{settings.momo_code || '(not set yet)'}</b>, then fill this in:
      </p>
      <PayForm campaignId={c.id} />
      <p className="hint" style={{ marginTop: 14 }}>
        By paying you agree to the <Link href="/terms">Terms and conditions</Link>. Changed your mind later? Email us: a refund is only possible if the seller hasn&apos;t played or posted yet. If a promoter declines or misses the due date, you always get that part back.
      </p>
      <p>
        <Link href={`/artist/c/${c.id}`}>← Back to promoters</Link>
      </p>
    </div>
  );
}
