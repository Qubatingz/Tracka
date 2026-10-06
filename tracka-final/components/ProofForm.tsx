'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';
import { shrinkImage } from '@/lib/image';
import { uploadFile, ext, myId } from '@/lib/upload';
import { isUrl } from '@/lib/util';

export default function ProofForm({ bookingId, open }: { bookingId: string; open?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [names, setNames] = useState<{ shot: string; video: string }>({ shot: '', video: '' });
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const shot = fd.get('shot') as File | null;
    const video = fd.get('video') as File | null;
    const link = String(fd.get('link') || '').trim();
    if ((!shot || !shot.size) && (!video || !video.size) && !isUrl(link)) return setErr('Add a screenshot, a video or a link to the post.');
    if (video && video.size > 100 * 1024 * 1024) return setErr('The video is too big (100 MB max).');
    setBusy(true);
    setErr('');
    try {
      const uid = await myId();
      let image: string | null = null;
      let vid: string | null = null;
      if (shot && shot.size) image = await uploadFile('proofs', `${uid}/${bookingId}/shot-${Date.now()}.jpg`, await shrinkImage(shot, 1400));
      if (video && video.size) vid = await uploadFile('proofs', `${uid}/${bookingId}/video-${Date.now()}.${ext(video, 'mp4')}`, video);
      const { error } = await createClient().rpc('submit_proof', { p_booking: bookingId, p_image: image, p_video: vid, p_link: link, p_note: String(fd.get('note') || '') });
      if (error) throw new Error(error.message);
      router.refresh();
    } catch (x: any) {
      setErr(x.message);
      setBusy(false);
    }
  }
  const pick = (name: 'shot' | 'video', label: string, accept: string, icon: string) => (
    <label className="filepick">
      <span className="flab">{label}</span>
      <input className="vh" type="file" name={name} accept={accept} onChange={(e) => setNames({ ...names, [name]: e.target.files?.[0]?.name || '' })} />
      <span className="fbtn">
        <Icon name={icon} size={20} />
        Choose a file
      </span>
      <span className={'fname' + (names[name] ? ' has' : '')}>{names[name] || 'No file chosen'}</span>
    </label>
  );
  return (
    <details className="proofbox" open={open}>
      <summary>Send proof</summary>
      <form className="form" onSubmit={submit} style={{ marginTop: 12 }}>
        <p className="hint" style={{ margin: 0 }}>
          Send a screenshot, a video, or both. Clear proof = paid faster.
        </p>
        <div className="proofpick">
          {pick('shot', 'Screenshot', 'image/*', 'upload')}
          {pick('video', 'Video', 'video/*', 'youtube')}
        </div>
        <label className="label">
          Link to the post (optional)
          <input className="input" name="link" type="url" placeholder="https://" />
        </label>
        <label className="label">
          Note (optional)
          <input className="input" name="note" placeholder="e.g. Played at 8:15am" />
        </label>
        <div className="row">
          <button className="btn btn-yellow" type="submit" disabled={busy}>
            {busy ? 'Uploading…' : 'Send proof'}
          </button>
        </div>
        {err && <small className="rpcerr">{err}</small>}
      </form>
    </details>
  );
}
