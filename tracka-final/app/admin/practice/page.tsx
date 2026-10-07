import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';
import AdminHead from '@/components/AdminHead';
import Nothing from '@/components/Nothing';
import Icon from '@/components/Icon';
import Pill from '@/components/Pill';
import RpcButton from '@/components/RpcButton';
import { adminPage } from '@/lib/admin';
import { rwf } from '@/lib/util';
import { bookingDates, niceDays } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

const NEXT: Record<string, string> = { booked_new: 'Accept', booked: 'Set the dates', scheduled: "It's live", live: 'Send proof' };

export default async function AdminPractice() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const { data: ex } = await supabase.from('sellers').select('id,name,category').eq('is_example', true);
  const ids = (ex || []).map((s: any) => s.id);
  const { data: bks } = ids.length
    ? await supabase.from('bookings').select('*').in('seller_id', ids).in('status', ['booked', 'scheduled', 'live']).order('created_at')
    : { data: [] as any[] };
  const list = bks || [];
  const cids = Array.from(new Set(list.map((b: any) => b.campaign_id)));
  const { data: camps } = cids.length ? await supabase.from('campaigns').select('id,title,artist_id,created_at').in('id', cids) : { data: [] as any[] };
  const aids = Array.from(new Set((camps || []).map((c: any) => c.artist_id)));
  const { data: artists } = aids.length ? await supabase.from('public_profiles').select('id,display_name').in('id', aids) : { data: [] as any[] };
  const { data: exArtists } = aids.length ? await supabase.from('profiles').select('id,is_example').in('id', aids) : { data: [] as any[] };
  const isExampleArtist = (aid: string) => !!(exArtists || []).find((p: any) => p.id === aid)?.is_example;
  const sellerName = (sid: string) => (ex || []).find((s: any) => s.id === sid)?.name || 'Example promoter';
  const sellerCat = (sid: string) => (ex || []).find((s: any) => s.id === sid)?.category || 'other';
  // real accounts' practice campaigns first (that's what you're testing), then the example artists' ones
  const order = (camps || []).slice().sort((a: any, b: any) => Number(isExampleArtist(a.artist_id)) - Number(isExampleArtist(b.artist_id)) || (a.created_at < b.created_at ? 1 : -1));
  return (
    <div className="page">
      <AdminTabs active="/admin/practice" counts={counts} />
      <AdminHead title="Practice." sub="Example promoters have no real person behind them, so you play their part here. One tap = one step on their road." />
      {order.length === 0 && <Nothing text="No practice bookings waiting. Book an example promoter as an artist to try the road." />}
      {order.map((c: any) => {
        const rows = list.filter((b: any) => b.campaign_id === c.id);
        const mine = !isExampleArtist(c.artist_id);
        return (
          <section key={c.id} className="panel" style={{ marginBottom: 16 }}>
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <div>
                <strong style={{ fontSize: 20 }}>“{c.title}”</strong>
                <small className="muted" style={{ display: 'block' }}>
                  {(artists || []).find((a: any) => a.id === c.artist_id)?.display_name || 'Artist'}
                  {mine ? ' · your test account' : ' · example artist'}
                </small>
              </div>
              <RpcButton fn="admin_practice_all" args={{ p_campaign: c.id }} label={`Move all ${rows.length} one step`} />
            </div>
            {rows.map((b: any) => {
              const key = b.status === 'booked' && !b.accepted_at ? 'booked_new' : b.status;
              return (
                <div className="item" key={b.id} style={{ marginTop: 10 }}>
                  <Icon name={sellerCat(b.seller_id)} size={20} />
                  <div className="grow">
                    <strong>
                      {sellerName(b.seller_id)} <span className="extag">Example</span>
                    </strong>
                    <small>
                      {rwf(b.price)}
                      {b.plays > 1 ? ` · ${b.plays} plays` : ''}
                      {bookingDates(b).length ? ` · ${niceDays(bookingDates(b))}` : ''}
                    </small>
                  </div>
                  <Pill st={b.status} />
                  <RpcButton fn="admin_practice_step" args={{ p_booking: b.id }} label={`Next: ${NEXT[key] || 'step'}`} />
                </div>
              );
            })}
            <p className="hint" style={{ margin: '10px 0 0' }}>
              After the proof, approve it as the artist (or in <Link href="/admin/proofs">Submissions</Link>), then mark it paid in <Link href="/admin/payouts">Payouts</Link>. No real money moves.
            </p>
          </section>
        );
      })}
    </div>
  );
}
