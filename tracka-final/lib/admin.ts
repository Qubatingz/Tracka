import { getMe } from './data';

export async function adminPage() {
  const me = await getMe();
  if (!me.profile?.is_admin) return { ...me, ok: false, counts: {} as Record<string, number> };
  const s = me.supabase;
  const head = { count: 'exact' as const, head: true };
  const [a, b, c, d, e, f, g, h, i, j] = await Promise.all([
    s.from('sellers').select('id', head).eq('status', 'pending'),
    s.from('campaigns').select('id', head).eq('status', 'payment_submitted'),
    s.from('tips').select('id', head).eq('status', 'submitted'),
    s.from('campaigns').select('id', head).eq('status', 'review'),
    s.from('bookings').select('id', head).in('status', ['proof_submitted', 'disputed']),
    s.from('admin_late').select('id', head),
    s.from('bookings').select('id', head).eq('status', 'approved'),
    s.from('tips').select('id', head).eq('status', 'confirmed'),
    s.from('bookings').select('id', head).in('status', ['declined', 'refunded']).is('refund_sent_at', null),
    s.from('bookings').select('id,sellers!inner(id)', head).eq('sellers.is_example', true).in('status', ['booked', 'scheduled', 'live']),
  ]);
  const counts: Record<string, number> = {
    '/admin/promoters': a.count || 0,
    '/admin/payments': (b.count || 0) + (c.count || 0),
    '/admin/songs': d.count || 0,
    '/admin/proofs': (e.count || 0) + (f.count || 0),
    '/admin/payouts': (g.count || 0) + (h.count || 0) + (i.count || 0),
    '/admin/practice': j.count || 0,
  };
  return { ...me, ok: true, counts };
}
