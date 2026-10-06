import SellerTabs from '@/components/SellerTabs';
import SellerHead from '@/components/SellerHead';
import SellerCalendar from '@/components/SellerCalendar';
import { sellerPage } from '@/lib/seller';
import { buildCals, todayS, niceDay } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export default async function SellerCal() {
  const { supabase, seller, profile, photo } = await sellerPage();
  const [{ data: off }, { data: booked }, { data: up }] = await Promise.all([
    supabase.from('seller_days_off').select('*').eq('seller_id', seller.id).gte('day', todayS()),
    supabase.from('booked_days').select('*').eq('seller_id', seller.id).gte('day', todayS()),
    supabase.from('bookings').select('id,run_date,want_date,status,campaign_id').eq('seller_id', seller.id).not('status', 'in', '(declined,refunded,pending_payment)'),
  ]);
  const cal = buildCals([seller], off || [], booked || [])[seller.id];
  const cids = Array.from(new Set((up || []).map((b: any) => b.campaign_id)));
  const { data: camps } = cids.length ? await supabase.from('campaigns').select('id,title').in('id', cids) : { data: [] as any[] };
  const coming = (up || [])
    .map((b: any) => ({ ...b, day: b.run_date || b.want_date }))
    .filter((b: any) => b.day && b.day >= todayS())
    .sort((a: any, b: any) => (a.day < b.day ? -1 : 1));
  return (
    <div className="page">
      <SellerTabs active="/seller/calendar" />
      <SellerHead seller={seller} profile={profile} photo={photo} />
      <div className="profgrid">
        <div>
          <h2 className="st" style={{ marginTop: 0 }}>
            Your calendar
          </h2>
          <p className="sub" style={{ margin: '0 0 14px' }}>
            Tap a day to close or open it. Artists can only pick days you are free.
          </p>
          <SellerCalendar sellerId={seller.id} cal={cal} />
        </div>
        <aside>
          <div className="side">
            <small>Coming up</small>
            {coming.length ? (
              coming.map((b: any) => (
                <p key={b.id} style={{ margin: '8px 0 0' }}>
                  <b>{niceDay(b.day)}</b> · {(camps || []).find((c: any) => c.id === b.campaign_id)?.title || 'Song'}
                  {!b.run_date && <span className="hint"> (wanted)</span>}
                </p>
              ))
            ) : (
              <p>No dates yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
