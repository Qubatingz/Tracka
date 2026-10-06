'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/util';

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const p = normalizePhone(phone);
    if (!p) return setErr('Type a Rwandan number, like 0788 123 456.');
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({ phone: p });
    setBusy(false);
    if (error) return setErr("We couldn't send the code: " + error.message);
    setSentTo(p);
  }

  async function checkCode(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!/^\d{6}$/.test(code.trim())) return setErr('The code has 6 numbers.');
    setBusy(true);
    const { error } = await createClient().auth.verifyOtp({ phone: sentTo!, token: code.trim(), type: 'sms' });
    setBusy(false);
    if (error) return setErr('That code is wrong or expired. Try again.');
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="form">
      {err && (
        <p className="notice err" role="alert">
          {err}
        </p>
      )}
      {!sentTo ? (
        <form className="form" onSubmit={sendCode}>
          <label className="label">
            Your phone number
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0788 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <div className="row">
            <button className="btn btn-yellow" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send me a code'}
            </button>
          </div>
          <p className="demohint">Testing? Use 0788 000 001 and the code 123456.</p>
        </form>
      ) : (
        <form className="form" onSubmit={checkCode}>
          <p className="sub" style={{ margin: 0 }}>
            We sent a 6-number code to <b>{sentTo}</b>.
          </p>
          <label className="label">
            Code
            <input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
          <div className="row">
            <button className="btn btn-yellow" type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Log in'}
            </button>
            <button className="linkbtn" type="button" onClick={() => { setSentTo(null); setCode(''); }}>
              Use another number
            </button>
          </div>
        </form>
      )}
      <p className="hint">
        By logging in you agree to the <a href="/terms">Terms and conditions</a>.
      </p>
    </div>
  );
}
