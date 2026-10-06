'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';
import { GENRES, isUrl, normalizePhone } from '@/lib/util';

export default function SellerProfileForm({ seller, works, momo }: { seller: any; works: any[]; momo: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const pages: string[] = seller.pages || [];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) || '').trim();
    const price = parseInt(v('price').replace(/[^0-9]/g, ''), 10);
    if (!price) return setMsg({ text: 'Add your price.', err: true });
    const newPages = [1, 2, 3, 4].map((i) => v('page' + i)).filter(isUrl);
    if (!newPages.length) return setMsg({ text: 'Keep at least one link to your page.', err: true });
    const newWorks = [1, 2, 3].map((i) => ({ url: v('work' + i), caption: v('work' + i + 'c') })).filter((w) => isUrl(w.url));
    const m = normalizePhone(v('momo'));
    if (!m) return setMsg({ text: 'Check your MoMo number.', err: true });
    const days = parseInt(v('delivery'), 10);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sellers')
        .update({
          price,
          included: v('included'),
          delivery_days: days >= 1 && days <= 60 ? days : null,
          location: v('location'),
          description: v('description').slice(0, 600),
          genres: GENRES.filter((g) => fd.get('g_' + g)),
          pages: newPages,
        })
        .eq('id', seller.id);
      if (error) throw new Error(error.message);
      const { error: e2 } = await supabase.from('seller_private').update({ momo: m, updated_at: new Date().toISOString() }).eq('seller_id', seller.id);
      if (e2) throw new Error(e2.message);
      await supabase.from('seller_works').delete().eq('seller_id', seller.id);
      if (newWorks.length) {
        const { error: e3 } = await supabase.from('seller_works').insert(newWorks.map((w) => ({ ...w, seller_id: seller.id })));
        if (e3) throw new Error(e3.message);
      }
      setMsg({ text: 'Profile saved ✓' });
      router.refresh();
    } catch (x: any) {
      setMsg({ text: x.message, err: true });
    }
    setBusy(false);
  }

  return (
    <form className="form" onSubmit={submit}>
      {msg && (
        <p className={'notice' + (msg.err ? ' err' : '')} role={msg.err ? 'alert' : 'status'}>
          {msg.text}
        </p>
      )}
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <label className="label" style={{ flex: '1 1 160px' }}>
          Price (RWF)
          <input className="input" name="price" inputMode="numeric" defaultValue={seller.price} required />
        </label>
        <label className="label" style={{ flex: '1 1 160px' }}>
          Delivered within (days)
          <input className="input" name="delivery" inputMode="numeric" defaultValue={seller.delivery_days || ''} placeholder="e.g. 3" />
        </label>
      </div>
      <label className="label">
        What does the price include?
        <input className="input" name="included" defaultValue={seller.included} placeholder="e.g. 1 play + 5-minute interview" />
      </label>
      <label className="label">
        MoMo number for payouts (private)
        <input className="input" name="momo" type="tel" defaultValue={momo} required />
      </label>
      <label className="label">
        Where are you?
        <input className="input" name="location" defaultValue={seller.location} placeholder="e.g. Kigali" />
      </label>
      <label className="label">
        Short description
        <textarea className="input" name="description" defaultValue={seller.description} maxLength={600} />
      </label>
      <div className="label">Genres you play</div>
      <div className="tags" role="group" aria-label="Genres">
        {GENRES.map((g) => (
          <label key={g}>
            <input type="checkbox" name={'g_' + g} defaultChecked={(seller.genres || []).includes(g)} />
            <span>{g}</span>
          </label>
        ))}
      </div>
      <fieldset className="fset" style={{ padding: 16 }}>
        <legend>
          <Icon name="blog" size={18} /> Your CV
        </legend>
        <p className="hint" style={{ margin: 0 }}>
          Paste links. Artists see them on your profile.
        </p>
        <div className="label">Your pages: TikTok, YouTube, Instagram, Facebook, website, radio…</div>
        {[1, 2, 3, 4].map((i) => (
          <input key={i} className="input" name={'page' + i} type="url" inputMode="url" defaultValue={pages[i - 1] || ''} placeholder="https://" aria-label={`Link to your page ${i}`} />
        ))}
        <div className="label" style={{ marginTop: 6 }}>
          Videos of your past work
        </div>
        {[1, 2, 3].map((i) => (
          <div className="workrow" key={i}>
            <input className="input" name={'work' + i} type="url" inputMode="url" defaultValue={works[i - 1]?.url || ''} placeholder="Link to a video" aria-label={`Link to video ${i}`} />
            <input className="input" name={'work' + i + 'c'} defaultValue={works[i - 1]?.caption || ''} placeholder="What was it?" aria-label={`About video ${i}`} />
          </div>
        ))}
      </fieldset>
      <div className="row">
        <button className="btn btn-yellow" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
