'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { shrinkImage } from '@/lib/image';
import { uploadFile, myId } from '@/lib/upload';

export default function ReplyForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const note = String(fd.get('note') || '').trim();
    if (!note) return setErr('Write your answer.');
    const shot = fd.get('shot') as File | null;
    setBusy(true);
    setErr('');
    try {
      let image: string | null = null;
      if (shot && shot.size) image = await uploadFile('proofs', `${await myId()}/${bookingId}/reply-${Date.now()}.jpg`, await shrinkImage(shot, 1400));
      const { error } = await createClient().rpc('reply_problem', { p_booking: bookingId, p_note: note, p_image: image });
      if (error) throw new Error(error.message);
      router.refresh();
    } catch (x: any) {
      setErr(x.message);
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit} style={{ flexBasis: '100%', maxWidth: 'none' }}>
      <label className="label">
        Your answer
        <input className="input" name="note" required placeholder="e.g. It played at 8:15am, here is a clearer screenshot" />
      </label>
      <label className="label">
        More proof (optional)
        <input type="file" name="shot" accept="image/*" />
      </label>
      <div className="row">
        <button className="btn btn-yellow btn-sm" type="submit" disabled={busy}>
          Send my answer
        </button>
      </div>
      {err && <small className="rpcerr">{err}</small>}
    </form>
  );
}
