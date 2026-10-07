import Link from 'next/link';
import Icon from '@/components/Icon';
import AdminTabs from '@/components/AdminTabs';
import { adminPage } from '@/lib/admin';
import { rwf } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const [{ data: allBks }, { data: money }, { data: exS }] = await Promise.all([
    supabase.from('bookings').select('price,status,campaign_id,seller_id'),
    supabase.from('money_events').select('kind,amount'),
    supabase.from('sellers').select('id').eq('is_example', true),
  ]);
  // practice bookings (example promoters) are not real money
  const exIds = new Set((exS || []).map((s: any) => s.id));
  const bks = (allBks || []).filter((b: any) => !exIds.has(b.seller_id));
  const { data: camps } = await supabase.from('campaigns').select('id,status,fee_percent');
  const sumB = (sts: string[]) => (bks || []).filter((b: any) => sts.includes(b.status)).reduce((t: number, b: any) => t + b.price, 0);
  const inReview = (bks || [])
    .filter((b: any) => b.status === 'pending_payment' && ['review', 'changes'].includes((camps || []).find((c: any) => c.id === b.campaign_id)?.status))
    .reduce((t: number, b: any) => t + b.price, 0);
  const paidIn = (money || []).filter((m: any) => m.kind === 'artist_payment').reduce((t: number, m: any) => t + m.amount, 0);
  const promoters = (money || []).filter((m: any) => ['seller_payout'].includes(m.kind)).reduce((t: number, m: any) => t + m.amount, 0);
  const fees = (camps || [])
    .filter((c: any) => ['active', 'completed', 'review', 'changes'].includes(c.status))
    .reduce((t: number, c: any) => t + Math.round(((bks || []).filter((b: any) => b.campaign_id === c.id).reduce((s: number, b: any) => s + b.price, 0) * (Number(c.fee_percent) || 0)) / 100), 0);
  const cards: [string, string, string][] = [
    ['/admin/promoters', 'users', 'Promoters to verify'],
    ['/admin/payments', 'phone', 'Payments to confirm'],
    ['/admin/songs', 'note', 'Songs to listen to'],
    ['/admin/proofs', 'eye', 'Submissions to check'],
    ['/admin/payouts', 'check', 'Payouts and refunds'],
    ['/admin/practice', 'star', 'Practice steps to play'],
  ];
  const total = Object.values(counts).reduce((t, n) => t + n, 0);
  return (
    <div className="page">
      <AdminTabs active="/admin" counts={counts} />
      <div className="head">
        <div>
          <h1>Control room.</h1>
          <p className="sub">{total ? `${total} things need you.` : 'All clear. Nothing waiting.'}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn btn-ghost btn-sm" type="submit">
            Log out
          </button>
        </form>
      </div>
      <div className="stats" style={{ marginBottom: 22 }}>
        <div>
          <small>
            <Icon name="lock" size={14} /> Held now
          </small>
          <strong>{rwf(sumB(['booked', 'scheduled', 'live', 'proof_submitted', 'disputed', 'approved']) + inReview)}</strong>
        </div>
        <div>
          <small>
            <Icon name="clock" size={14} /> To pay promoters
          </small>
          <strong>{rwf(sumB(['approved']))}</strong>
        </div>
        <div>
          <small>
            <Icon name="check" size={14} /> Paid out
          </small>
          <strong>{rwf(promoters)}</strong>
        </div>
        <div>
          <small>
            <Icon name="tag" size={14} /> Your fees
          </small>
          <strong>{rwf(fees)}</strong>
        </div>
      </div>
      <div className="qgrid">
        {cards.map(([href, icon, label]) => (
          <Link key={href} className={'qcard' + (counts[href] ? ' hot' : '')} href={href}>
            <Icon name={icon} size={28} />
            <strong>{counts[href] || 0}</strong>
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 18 }}>
        Total paid in by artists so far: {rwf(paidIn)}. Practice bookings with example promoters are never counted here.
      </p>
    </div>
  );
}
