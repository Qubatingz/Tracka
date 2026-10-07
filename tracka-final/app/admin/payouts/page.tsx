import AdminTabs from '@/components/AdminTabs';
import AdminHead from '@/components/AdminHead';
import Nothing from '@/components/Nothing';
import Icon from '@/components/Icon';
import RpcForm from '@/components/RpcForm';
import RpcButton from '@/components/RpcButton';
import { adminPage } from '@/lib/admin';
import { rwf } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function AdminPayouts() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const [{ data: outs }, { data: tipouts }, { data: refunds }] = await Promise.all([
    supabase.from('bookings').select('*').eq('status', 'approved').order('approved_at'),
    supabase.from('tips').select('*').eq('status', 'confirmed').order('confirmed_at'),
    supabase.from('bookings').select('*').in('status', ['declined', 'refunded']).is('refund_sent_at', null).order('closed_at'),
  ]);
  const tipBids = (tipouts || []).map((t: any) => t.booking_id);
  const { data: tipBks } = tipBids.length ? await supabase.from('bookings').select('id,seller_id,campaign_id').in('id', tipBids) : { data: [] as any[] };
  const all = [...(outs || []), ...(refunds || []), ...(tipBks || [])];
  const sids = Array.from(new Set(all.map((b: any) => b.seller_id)));
  const cids = Array.from(new Set(all.map((b: any) => b.campaign_id)));
  const [{ data: sellers }, { data: priv }, { data: camps }] = await Promise.all([
    sids.length ? supabase.from('sellers').select('id,name,is_example').in('id', sids) : Promise.resolve({ data: [] as any[] }),
    sids.length ? supabase.from('seller_private').select('seller_id,momo').in('seller_id', sids) : Promise.resolve({ data: [] as any[] }),
    cids.length ? supabase.from('campaigns').select('id,title,pay_phone').in('id', cids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const name = (sid: string) => (sellers || []).find((s: any) => s.id === sid)?.name || 'Promoter';
  const ex = (sid: string) => !!(sellers || []).find((s: any) => s.id === sid)?.is_example;
  const momo = (sid: string) => (priv || []).find((p: any) => p.seller_id === sid)?.momo || '—';
  const camp = (cid: string) => (camps || []).find((c: any) => c.id === cid) || ({} as any);
  const refField = [{ name: 'p_ref', label: 'MoMo transaction ID (optional)', placeholder: 'From your MoMo SMS' }];
  return (
    <div className="page">
      <AdminTabs active="/admin/payouts" counts={counts} />
      <AdminHead title="Payouts." sub="Send the money on MoMo first, then tap “I sent it”." />
      <h2 className="st" style={{ marginTop: 0 }}>
        Promoters to pay ({(outs || []).length})
      </h2>
      {(outs || []).length === 0 && <Nothing />}
      {(outs || []).map((b: any) => (
        <div className="item payrow" key={b.id}>
          <div className="grow">
            <strong>
              {rwf(b.price)} → {name(b.seller_id)}
            </strong>
            <small>For “{camp(b.campaign_id).title}” · approved proof</small>
            {ex(b.seller_id) ? (
              <span className="momo">🧪 Practice: nothing to send</span>
            ) : (
              <span className="momo">
                <Icon name="phone" size={16} />
                MoMo {momo(b.seller_id)}
              </span>
            )}
          </div>
          {ex(b.seller_id) ? (
            <RpcButton fn="admin_mark_paid" args={{ p_booking: b.id, p_ref: 'PRACTICE' }} label="✓ Mark practice paid" />
          ) : (
            <RpcForm fn="admin_mark_paid" args={{ p_booking: b.id }} fields={refField} submit="✓ I sent it" inline />
          )}
        </div>
      ))}
      {(tipouts || []).length > 0 && <h2 className="st">Tips to send (100% to the promoter)</h2>}
      {(tipouts || []).map((t: any) => {
        const b = (tipBks || []).find((x: any) => x.id === t.booking_id) || ({} as any);
        return (
          <div className="item payrow" key={t.id}>
            <div className="grow">
              <strong>
                Tip {rwf(t.amount)} → {name(b.seller_id)}
              </strong>
              <span className="momo">
                <Icon name="phone" size={16} />
                MoMo {momo(b.seller_id)}
              </span>
            </div>
            <RpcForm fn="admin_tip" args={{ p_tip: t.id, p_action: 'sent' }} fields={refField} submit="✓ I sent it" inline />
          </div>
        );
      })}
      <h2 className="st">Refunds ({(refunds || []).length})</h2>
      {(refunds || []).length === 0 && <p className="sub">None.</p>}
      {(refunds || []).map((b: any) => (
        <div className="item payrow" key={b.id}>
          <div className="grow">
            <strong>Refund {rwf(b.price)} → artist</strong>
            <small>
              {name(b.seller_id)} · “{camp(b.campaign_id).title}”
            </small>
            {ex(b.seller_id) ? (
              <span className="momo">🧪 Practice: nothing to send</span>
            ) : (
              <span className="momo">
                <Icon name="phone" size={16} />
                MoMo {camp(b.campaign_id).pay_phone || '—'}
              </span>
            )}
          </div>
          {ex(b.seller_id) ? (
            <RpcButton fn="admin_mark_refund_sent" args={{ p_booking: b.id, p_ref: 'PRACTICE' }} label="✓ Mark practice done" />
          ) : (
            <RpcForm fn="admin_mark_refund_sent" args={{ p_booking: b.id }} fields={refField} submit="✓ I sent it" inline />
          )}
        </div>
      ))}
    </div>
  );
}
