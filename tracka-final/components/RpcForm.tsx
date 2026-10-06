'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Field = { name: string; label: string; type?: string; placeholder?: string; required?: boolean; number?: boolean; min?: string; defaultValue?: string };

// A small form that runs one step of the road with what the person typed.
export default function RpcForm({ fn, args = {}, fields, submit, kind = 'yellow', inline = false }: { fn: string; args?: Record<string, any>; fields: Field[]; submit: string; kind?: string; inline?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params: Record<string, any> = { ...args };
    for (const f of fields) {
      const v = String(fd.get(f.name) || '').trim();
      params[f.name] = f.number ? parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 : v;
    }
    setBusy(true);
    setErr('');
    const { error } = await createClient().rpc(fn, params);
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }
  return (
    <form className={inline ? 'row' : 'form'} onSubmit={onSubmit} style={inline ? { alignItems: 'flex-end' } : { maxWidth: 'none' }}>
      {fields.map((f) => (
        <label key={f.name} className="label" style={inline ? { flex: '1 1 200px' } : undefined}>
          {f.label}
          <input className="input" name={f.name} type={f.type || 'text'} placeholder={f.placeholder} required={f.required} min={f.min} defaultValue={f.defaultValue} inputMode={f.number ? 'numeric' : undefined} />
        </label>
      ))}
      <div className="row">
        <button className={`btn btn-${kind} btn-sm`} type="submit" disabled={busy}>
          {busy ? '…' : submit}
        </button>
      </div>
      {err && <small className="rpcerr" role="alert">{err}</small>}
    </form>
  );
}
