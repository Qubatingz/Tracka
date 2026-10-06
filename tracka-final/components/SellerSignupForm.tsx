'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';
import { shrinkImage } from '@/lib/image';
import { isUrl, normalizePhone } from '@/lib/util';

type Cat = { key: string; name: string };

export default function SellerSignupForm({ cats, allowCustom, rules }: { cats: Cat[]; allowCustom: boolean; rules: string[] }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) || '').trim();
    const category = v('category');
    const price = parseInt(v('price').replace(/[^0-9]/g, ''), 10);
    const idType = v('idType') || 'nid';
    const idNumber = v('idNumber').replace(/[\s-]/g, '').toUpperCase();
    const file = fd.get('idImg') as File | null;
    if (!category) return setErr('Pick what you offer.');
    if (category === 'other' && !v('customCat')) return setErr('Name your service, for example "Street art".');
    if (v('name').length < 2) return setErr('Add your name or brand.');
    if (!isUrl(v('page1'))) return setErr('Paste a link to your page (TikTok, YouTube, Instagram, website…).');
    if (!price || price < 1) return setErr('Add your price in RWF.');
    if (!normalizePhone(v('momo'))) return setErr('Add the MoMo number where you want to be paid.');
    if (idType === 'nid' && !/^\d{16}$/.test(idNumber)) return setErr('A Rwandan National ID number has 16 digits.');
    if (idType === 'passport' && !/^[A-Z0-9]{6,12}$/.test(idNumber)) return setErr('Check the passport number.');
    if (!file || !file.size) return setErr('Add a photo of your ID.');
    if (!fd.get('terms')) return setErr('Please agree to the Terms and conditions.');

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in again.');
      const small = await shrinkImage(file, 1600);
      const idPath = `${user.id}/id-${Date.now()}.jpg`;
      const up = await supabase.storage.from('ids').upload(idPath, small, { contentType: small.type, upsert: false });
      if (up.error) throw new Error('ID photo upload failed: ' + up.error.message);
      const { data: seller, error: e1 } = await supabase
        .from('sellers')
        .insert({
          profile_id: user.id,
          contact_phone: user.phone || null,
          name: v('name'),
          category,
          custom_category: category === 'other' ? v('customCat').slice(0, 30) : null,
          price,
          included: v('included'),
          pages: [v('page1')],
        })
        .select('id')
        .single();
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await supabase.from('seller_private').insert({
        seller_id: seller.id,
        momo: normalizePhone(v('momo')),
        id_type: idType,
        id_number: idNumber,
        id_image_path: idPath,
      });
      if (e2) throw new Error(e2.message);
      router.push('/seller');
      router.refresh();
    } catch (x: any) {
      setErr(x.message || 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} style={{ maxWidth: 720 }}>
      {err && (
        <p className="notice err" role="alert">
          {err}
        </p>
      )}
      <fieldset className="fset">
        <legend>
          <b>1</b> You
        </legend>
        <div className="label" id="ch-l">
          What do you offer?
        </div>
        <div className="row" role="radiogroup" aria-labelledby="ch-l">
          {cats.map((c) => (
            <label className="tipchip" key={c.key}>
              <input type="radio" name="category" value={c.key} required />
              <span>
                <Icon name={c.key} size={16} /> {c.name}
              </span>
            </label>
          ))}
          {allowCustom && (
            <label className="tipchip">
              <input type="radio" name="category" value="other" />
              <span>
                <Icon name="other" size={16} /> Something else
              </span>
            </label>
          )}
        </div>
        {allowCustom ? (
          <label className="label">
            Something else? Name your service
            <input className="input" name="customCat" maxLength={30} placeholder="e.g. Street art, Choreography" />
          </label>
        ) : (
          <p className="hint" style={{ margin: 0 }}>
            More services (designers, clothing brands, video makers…) are coming soon.
          </p>
        )}
        <label className="label">
          Name or brand
          <input className="input" name="name" required maxLength={60} />
        </label>
        <label className="label">
          Link to your page
          <input className="input" name="page1" type="url" inputMode="url" placeholder="https://www.tiktok.com/@yourname" required />
        </label>
      </fieldset>

      <fieldset className="fset">
        <legend>
          <b>2</b> Your price
        </legend>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="label" style={{ flex: '1 1 150px' }}>
            Price (RWF)
            <input className="input" name="price" inputMode="numeric" required />
          </label>
          <label className="label" style={{ flex: '1 1 200px' }}>
            MoMo for payouts
            <input className="input" name="momo" type="tel" inputMode="tel" required />
          </label>
        </div>
        <label className="label">
          What does it include? (optional)
          <input className="input" name="included" placeholder="e.g. 1 play + interview" />
        </label>
      </fieldset>

      <fieldset className="fset">
        <legend>
          <b>3</b> Your ID
        </legend>
        <p className="privacy">
          <Icon name="lock" size={18} />
          <span>
            <b>Private.</b> Only the Tracka team sees it. Never shown on a profile.
          </span>
        </p>
        <div className="row" role="radiogroup" aria-label="Type of ID">
          <label className="tipchip">
            <input type="radio" name="idType" value="nid" defaultChecked />
            <span>National ID</span>
          </label>
          <label className="tipchip">
            <input type="radio" name="idType" value="passport" />
            <span>Passport</span>
          </label>
        </div>
        <label className="label">
          ID number
          <input className="input" name="idNumber" inputMode="numeric" autoComplete="off" placeholder="16 digits" required />
        </label>
        <label className="filepick">
          <span className="flab">Photo of the ID</span>
          <input className="vh" type="file" name="idImg" accept="image/*" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
          <span className="fbtn">
            <Icon name="user" size={20} />
            Choose a file
          </span>
          <span className={'fname' + (fileName ? ' has' : '')}>{fileName || 'No file chosen'}</span>
        </label>
      </fieldset>

      <details className="termsmini">
        <summary>Read the promoter terms</summary>
        <ol className="rules">
          {rules.map((r) => (
            <li key={r} style={{ fontSize: 15 }}>
              {r}
            </li>
          ))}
        </ol>
      </details>
      <label className="check">
        <input type="checkbox" name="terms" required />
        <span>
          I agree to the <a href="/terms" target="_blank" rel="noopener">Terms and conditions</a>.
        </span>
      </label>
      <p className="hint">Photo, videos of your work, genres and your calendar come later, in your dashboard.</p>
      <div className="row">
        <button className="btn btn-yellow" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Join'}
        </button>
      </div>
    </form>
  );
}
