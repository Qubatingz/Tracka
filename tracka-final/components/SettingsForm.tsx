'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';

export default function SettingsForm({ settings: s, cats }: { settings: any; cats: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) || '').trim();
    const lines = (k: string) => v(k).split(/\n+/).map((x) => x.trim()).filter(Boolean);
    const fee = Math.min(50, Math.max(0, parseFloat(v('fee_percent')) || 0));
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('settings')
        .update({
          momo_code: v('momo_code'), fee_percent: fee, whatsapp: v('whatsapp'), phone: v('phone'), email: v('email'), rdb: v('rdb'), company: v('company'),
          founder_name: v('founder_name') || 'Jimmy', founder_msg: v('founder_msg'), allow_custom: !!fd.get('allow_custom'),
          rules_artist: lines('rules_artist'), rules_seller: lines('rules_seller'), updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
      if (error) throw new Error(error.message);
      for (const c of cats) {
        if (c.key === 'other') continue;
        const open = !!fd.get('cat_' + c.key);
        if (open !== c.is_open) {
          const { error: e2 } = await supabase.from('categories').update({ is_open: open }).eq('key', c.key);
          if (e2) throw new Error(e2.message);
        }
      }
      setMsg({ text: 'Settings saved ✓' });
      router.refresh();
    } catch (x: any) {
      setMsg({ text: x.message, err: true });
    }
    setBusy(false);
  }
  const field = (name: string, label: string, props: any = {}) => (
    <label className="label" style={{ flex: '1 1 220px' }}>
      {label}
      <input className="input" name={name} defaultValue={s[name] ?? ''} {...props} />
    </label>
  );
  const group = (grp: string, title: string) => (
    <div>
      <small className="vlab">{title}</small>
      <div className="row">
        {cats
          .filter((c) => c.grp === grp && c.key !== 'other')
          .map((c) => (
            <label className="tipchip" key={c.key}>
              <input type="checkbox" name={'cat_' + c.key} defaultChecked={c.is_open} />
              <span>
                <Icon name={c.key} size={16} /> {c.name}
              </span>
            </label>
          ))}
      </div>
    </div>
  );
  return (
    <form className="form" onSubmit={submit} style={{ maxWidth: 'none' }}>
      {msg && (
        <p className={'notice' + (msg.err ? ' err' : '')} role={msg.err ? 'alert' : 'status'}>
          {msg.text}
        </p>
      )}
      <div className="row" style={{ alignItems: 'flex-end' }}>
        {field('momo_code', 'Your MoMo Pay code')}
        {field('fee_percent', 'Your fee (%)', { inputMode: 'decimal' })}
      </div>
      <h2 className="st">Services on Tracka</h2>
      <div className="svcgrid">
        {group('promotion', 'Promotion')}
        {group('creative', 'Creatives (later)')}
        <label className="check">
          <input type="checkbox" name="allow_custom" defaultChecked={!!s.allow_custom} />
          <span>Let sellers name their own service (“Something else”)</span>
        </label>
      </div>
      <h2 className="st">Contact and trust</h2>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        {field('whatsapp', 'WhatsApp number', { placeholder: '2507XXXXXXXX' })}
        {field('phone', 'Phone')}
        {field('email', 'Email', { type: 'email' })}
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        {field('company', 'Company legal name', { placeholder: 'e.g. Tracka Ltd' })}
        {field('rdb', 'RDB registration number')}
        {field('founder_name', 'Founder name')}
      </div>
      <label className="label">
        Founder message (leave empty for the default)
        <textarea className="input" name="founder_msg" defaultValue={s.founder_msg || ''} />
      </label>
      <h2 className="st">Terms: rules (one per line)</h2>
      <label className="label">
        For promoters
        <textarea className="input" name="rules_seller" rows={9} style={{ minHeight: 220 }} defaultValue={(s.rules_seller || []).join('\n')} />
      </label>
      <label className="label">
        For artists
        <textarea className="input" name="rules_artist" rows={6} style={{ minHeight: 160 }} defaultValue={(s.rules_artist || []).join('\n')} />
      </label>
      <div className="row">
        <button className="btn btn-yellow" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
