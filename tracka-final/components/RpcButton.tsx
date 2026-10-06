'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// A button that runs one step of the road in the database (accept, approve, pay…).
export default function RpcButton({ fn, args, label, kind = 'yellow', confirmText, small = true }: { fn: string; args: Record<string, any>; label: string; kind?: string; confirmText?: string; small?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setErr('');
    const { error } = await createClient().rpc(fn, args);
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }
  return (
    <span className="rpcwrap">
      <button type="button" className={`btn btn-${kind}${small ? ' btn-sm' : ''}`} disabled={busy} onClick={go}>
        {busy ? '…' : label}
      </button>
      {err && <small className="rpcerr" role="alert">{err}</small>}
    </span>
  );
}
