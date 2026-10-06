'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RateForm({ bookingId, name }: { bookingId: string; name: string }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const stars = parseInt(String(fd.get('stars') || '0'), 10);
    if (!stars) return setErr('Pick 1 to 5 stars.');
    setBusy(true);
    const { error } = await createClient().rpc('rate_booking', { p_booking: bookingId, p_stars: stars, p_review: String(fd.get('review') || '') });
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }
  return (
    <form className="rateform" onSubmit={submit}>
      <p>How was {name}?</p>
      <fieldset className="stars">
        <legend className="sr-only">Rate {name}</legend>
        {[5, 4, 3, 2, 1].map((n) => (
          <span key={n} style={{ display: 'contents' }}>
            <input type="radio" id={`s-${bookingId}-${n}`} name="stars" value={n} aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} />
            <label htmlFor={`s-${bookingId}-${n}`}>★</label>
          </span>
        ))}
      </fieldset>
      <div className="row">
        <input className="input" name="review" placeholder="Tell other artists (optional)" style={{ flex: '1 1 200px', minHeight: 46 }} aria-label="Your review" />
        <button className="btn btn-yellow btn-sm" type="submit" disabled={busy}>
          Rate
        </button>
      </div>
      {err && <small className="rpcerr">{err}</small>}
    </form>
  );
}
