'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';
import { isUrl, normalizePhone } from '@/lib/util';

// For promoters you met in person: they appear verified right away.
// When they later log in with the same phone number, the page becomes theirs automatically.
export default function AdminAddSeller({ cats }: { cats: { key: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const v = (k: string) => String(fd.get(k) || '').trim();
    const price = parseInt(v('price').replace(/[^0-9]/g, ''), 10);
    const phone = normalizePhone(v('phone'));
    const momo = normalizePhone(v('momo'));
    const idNumber = v('idNumber').replace(/[\s-]/g, '').toUpperCase();
    if (!v('name') || !v('category') || !price) return setMsg({ text: 'Add name, service and price.', err: true });
    if (!phone || !momo) return setMsg({ text: 'Add their phone and MoMo numbers (Rwandan format).', err: true });
    if (v('idType') === 'nid' && idNumber && !/^\d{16}$/.test(idNumber)) return setMsg({ text: 'A National ID number has 16 digits.', err: true });
    if (!fd.get('consent')) return setMsg({ text: 'Only add promoters who agreed to be listed.', err: true });
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: s, error } = await supabase
        .from('sellers')
        .insert({
          name: v('name'), category: v('category'), price, included: v('included'), location: v('location'),
          pages: isUrl(v('page1')) ? [v('page1')] : [], contact_phone: phone.replace('+', ''), status: 'verified',
          verified_at: new Date().toISOString(), added_by_admin: true, id_checked: !!idNumber,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const { error: e2 } = await supabase.from('seller_private').insert({ seller_id: s.id, momo, id_type: idNumber ? v('idType') || 'nid' : null, id_number: idNumber || null });
      if (e2) throw new Error(e2.message);
      form.reset();
      setMsg({ text: `${v('name')} is live on Tracka ✓` });
      router.refresh();
    } catch (x: any) {
      setMsg({ text: x.message, err: true });
    }
    setBusy(false);
  }
  return (
    <details className="addbox">
      <summary>
        <Icon name="users" size={18} /> Add a promoter you signed in person
      </summary>
      <form className="form" onSubmit={submit} style={{ maxWidth: 'none', marginTop: 14 }}>
        {msg && <p className={'notice' + (msg.err ? ' err' : '')}>{msg.text}</p>}
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="label" style={{ flex: '1 1 220px' }}>
            Real name or brand
            <input className="input" name="name" required />
          </label>
          <label className="label" style={{ flex: '1 1 180px' }}>
            What they offer
            <select className="input" name="category" required defaultValue="">
              <option value="">Choose</option>
              {cats.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label" style={{ flex: '1 1 150px' }}>
            Price (RWF)
            <input className="input" name="price" inputMode="numeric" required />
          </label>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="label" style={{ flex: '1 1 200px' }}>
            Their phone (they log in with it)
            <input className="input" name="phone" type="tel" required />
          </label>
          <label className="label" style={{ flex: '1 1 200px' }}>
            MoMo for payouts
            <input className="input" name="momo" type="tel" required />
          </label>
          <label className="label" style={{ flex: '1 1 160px' }}>
            Where
            <input className="input" name="location" placeholder="Kigali" />
          </label>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="label" style={{ flex: '2 1 260px' }}>
            What the price includes
            <input className="input" name="included" />
          </label>
          <label className="label" style={{ flex: '2 1 260px' }}>
            Link to their page
            <input className="input" name="page1" type="url" placeholder="https://" />
          </label>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="label" style={{ flex: '1 1 160px' }}>
            ID type
            <select className="input" name="idType" defaultValue="nid">
              <option value="nid">National ID</option>
              <option value="passport">Passport</option>
            </select>
          </label>
          <label className="label" style={{ flex: '2 1 240px' }}>
            ID number (you saw it in person)
            <input className="input" name="idNumber" inputMode="numeric" />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" name="consent" />
          <span>They agreed to be listed on Tracka with this name and price, and to the Terms and conditions.</span>
        </label>
        <div className="row">
          <button className="btn btn-yellow" type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add and verify'}
          </button>
        </div>
      </form>
    </details>
  );
}
