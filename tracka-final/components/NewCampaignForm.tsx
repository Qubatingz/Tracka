'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';
import { uploadFile, ext, myId } from '@/lib/upload';
import { GENRES, isUrl } from '@/lib/util';

export default function NewCampaignForm({ sellerId, wantDate }: { sellerId: string | null; wantDate: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fileName, setFileName] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') || '').trim();
    const link = String(fd.get('link') || '').trim();
    const file = fd.get('file') as File | null;
    if (!title) return setErr('Type the song title.');
    if ((!file || !file.size) && !isUrl(link)) return setErr('Upload your song or paste a link.');
    if (file && file.size > 30 * 1024 * 1024) return setErr('The song file is too big (30 MB max).');
    setBusy(true);
    try {
      const supabase = createClient();
      const uid = await myId();
      const { data: c, error } = await supabase
        .from('campaigns')
        .insert({ artist_id: uid, title: title.slice(0, 120), genre: String(fd.get('genre') || ''), link: link || null })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      if (file && file.size) {
        const path = await uploadFile('songs', `${uid}/${c.id}/v1.${ext(file, 'mp3')}`, file);
        const { error: e2 } = await supabase.from('campaigns').update({ song_path: path }).eq('id', c.id);
        if (e2) throw new Error(e2.message);
      }
      if (sellerId) await supabase.from('bookings').insert({ campaign_id: c.id, seller_id: sellerId, want_date: wantDate });
      router.push(`/artist/c/${c.id}`);
    } catch (x: any) {
      setErr(x.message || 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {err && (
        <p className="notice err" role="alert">
          {err}
        </p>
      )}
      <label className="label">
        Song title
        <input className="input" name="title" required maxLength={120} />
      </label>
      <label className="label">
        Genre
        <select className="input" name="genre" defaultValue="">
          <option value="">Choose</option>
          {GENRES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label className="filepick">
        <span className="flab">Upload your song (MP3, WAV…)</span>
        <input className="vh" type="file" name="file" accept="audio/*" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
        <span className="fbtn">
          <Icon name="note" size={20} />
          Choose a file
        </span>
        <span className={'fname' + (fileName ? ' has' : '')}>{fileName || 'No file chosen'}</span>
      </label>
      <label className="label">
        Or paste a link (optional)
        <input className="input" name="link" type="url" placeholder="https://" />
      </label>
      <p className="privacy">
        <Icon name="shield" size={18} />
        <span>Our team listens to every song before promoters get it, usually within a day.</span>
      </p>
      <div className="row">
        <button className="btn btn-yellow" type="submit" disabled={busy}>
          {busy ? 'Uploading…' : 'Next: pick promoters'}
        </button>
      </div>
    </form>
  );
}
