import Icon from '@/components/Icon';
import Pill from '@/components/Pill';
import SellerTabs from '@/components/SellerTabs';
import SellerHead from '@/components/SellerHead';
import { sellerPage } from '@/lib/seller';
import { rwf } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function SellerMoney() {
  const { supabase, seller, profile, photo } = await sellerPage();
  const [{ data: bks }, { data: priv }] = await Promise.all([
    supabase.from('bookings').select('*').eq('seller_id', seller.id).neq('status', 'pending_payment').order('created_at', { ascending: false }),
    supabase.from('seller_private').select('momo').eq('seller_id', seller.id).maybeSingle(),
  ]);
  const mine = bks || [];
  const ids = mine.map((b: any) => b.id);
  const cids = Array.from(new Set(mine.map((b: any) => b.campaign_id)));
  const [{ data: tips }, { data: camps }] = await Promise.all([
    ids.length ? supabase.from('tips').select('*').in('booking_id', ids).eq('status', 'sent') : Promise.resolve({ data: [] as any[] }),
    cids.length ? supabase.from('campaigns').select('id,title').in('id', cids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const sum = (sts: string[]) => mine.filter((b: any) => sts.includes(b.status)).reduce((t: number, b: any) => t + b.price, 0);
  const tipsIn = (tips || []).reduce((t: number, x: any) => t + x.amount, 0);
  const hist = mine.filter((b: any) => b.status === 'paid_out' || b.status === 'approved');
  const title = (cid: string) => (camps || []).find((c: any) => c.id === cid)?.title || 'Song';
  return (
    <div className="page">
      <SellerTabs active="/seller/money" />
      <SellerHead seller={seller} profile={profile} photo={photo} />
      <div className="money">
        <div>
          <small>Your price</small>
          <strong>{rwf(seller.price)}</strong>
        </div>
        <div>
          <small>Waiting for you</small>
          <strong>{rwf(sum(['booked', 'scheduled', 'live', 'proof_submitted', 'disputed']))}</strong>
        </div>
        <div>
          <small>Coming soon</small>
          <strong>{rwf(sum(['approved']))}</strong>
        </div>
        <div>
          <small>Paid to you</small>
          <strong>{rwf(sum(['paid_out']))}</strong>
        </div>
      </div>
      {tipsIn > 0 && (
        <p className="tipstate" style={{ marginTop: 12 }}>
          <Icon name="star" size={16} />
          Tips from happy artists: {rwf(tipsIn)}
        </p>
      )}
      <p className="hint" style={{ marginTop: 12 }}>
        Payouts go to MoMo {priv?.momo || '—'}. Change it in your Profile.
      </p>
      <h2 className="st">History</h2>
      {hist.length ? (
        hist.map((b: any) => (
          <div className="item" key={b.id}>
            <div className="grow">
              <strong>{title(b.campaign_id)}</strong>
            </div>
            <span className="price">{rwf(b.price)}</span>
            <Pill st={b.status} />
          </div>
        ))
      ) : (
        <p className="sub">No payments yet.</p>
      )}
    </div>
  );
}
