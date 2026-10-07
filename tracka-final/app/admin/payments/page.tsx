import Icon from '@/components/Icon';
import AdminTabs from '@/components/AdminTabs';
import AdminHead from '@/components/AdminHead';
import Nothing from '@/components/Nothing';
import RpcButton from '@/components/RpcButton';
import { adminPage } from '@/lib/admin';
import { rwf } from '@/lib/util';
import { fee } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function AdminPayments() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const [{ data: camps }, { data: tips }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('status', 'payment_submitted').order('created_at'),
    supabase.from('tips').select('*').eq('status', 'submitted').order('created_at'),
  ]);
  const cids = (camps || []).map((c: any) => c.id);
  const { data: bks } = cids.length ? await supabase.from('bookings').select('campaign_id,price,seller_id').in('campaign_id', cids) : { data: [] as any[] };
  const { data: exS } = await supabase.from('sellers').select('id').eq('is_example', true);
  const exIds = new Set((exS || []).map((s: any) => s.id));
  const isPractice = (cid: string) => (bks || []).some((b: any) => b.campaign_id === cid && exIds.has(b.seller_id));
  return (
    <div className="page">
      <AdminTabs active="/admin/payments" counts={counts} />
      <AdminHead title="Payments." sub="Check your MoMo messages: same transaction ID, same amount." />
      {(camps || []).length === 0 && <Nothing />}
      {(camps || []).map((c: any) => {
        const t = (bks || []).filter((b: any) => b.campaign_id === c.id).reduce((s: number, b: any) => s + b.price, 0);
        return (
          <div className="item" key={c.id}>
            <div className="grow">
              <strong>“{c.title}”</strong>
              <small>
                {isPractice(c.id) ? '🧪 Practice: no money to check' : `Expect ${rwf(t + fee(t, c.fee_percent))} · Txn ${c.momo_txn} · from ${c.pay_phone}`}
              </small>
            </div>
            <RpcButton fn="admin_confirm_payment" args={{ p_campaign: c.id }} label={isPractice(c.id) ? 'Confirm practice' : 'Money received'} />
            <RpcButton fn="admin_reject_payment" args={{ p_campaign: c.id }} label="Not found" kind="red" confirmText="Send this payment back to the artist?" />
          </div>
        );
      })}
      {(tips || []).length > 0 && <h2 className="st">Tips to check</h2>}
      {(tips || []).map((t: any) => (
        <div className="item" key={t.id}>
          <Icon name="star" size={20} />
          <div className="grow">
            <strong>Tip {rwf(t.amount)}</strong>
            <small>Txn {t.momo_txn}</small>
          </div>
          <RpcButton fn="admin_tip" args={{ p_tip: t.id, p_action: 'confirm' }} label="Money received" />
          <RpcButton fn="admin_tip" args={{ p_tip: t.id, p_action: 'reject' }} label="Not found" kind="red" />
        </div>
      ))}
    </div>
  );
}
