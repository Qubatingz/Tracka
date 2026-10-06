'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/util';

export default function PayForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const txn = String(fd.get('txn') || '').trim();
    const phone = normalizePhone(String(fd.get('phone') || ''));
    if (!txn) return setErr('Type the transaction ID from your MoMo SMS.');
    if (!phone) return setErr('Type the phone number you paid from, like 0788 123 456.');
    setBusy(true);
    setErr('');
    const { error } = await createClient().rpc('submit_payment', { p_campaign: campaignId, p_txn: txn, p_phone: phone });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push(`/artist/c/${campaignId}`);
    router.refresh();
  }
  return (
    <form className="form" onSubmit={submit}>
      {err && (
        <p className="notice err" role="alert">
          {err}
        </p>
      )}
      <label className="label">
        Transaction ID (from the SMS)
        <input className="input" name="txn" required />
      </label>
      <label className="label">
        Phone you paid from
        <input className="input" name="phone" type="tel" inputMode="tel" required placeholder="07X XXX XXXX" />
      </label>
      <div className="row">
        <button className="btn btn-yellow" type="submit" disabled={busy}>
          {busy ? 'Sending…' : "I've paid"}
        </button>
      </div>
    </form>
  );
}
