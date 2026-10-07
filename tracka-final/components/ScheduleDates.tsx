'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { todayS } from '@/lib/calendar';

// The promoter confirms the date of every play (filled in with what the artist asked for).
export default function ScheduleDates({ bookingId, plays, wanted }: { bookingId: string; plays: number; wanted: string[] }) {
  const router = useRouter();
  const today = todayS();
  const start = wanted.filter((d) => d >= today);
  const [dates, setDates] = useState<string[]>(Array.from({ length: plays }, (_, i) => start[i] || ''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (i: number, v: string) => setDates((cur) => cur.map((d, j) => (j === i ? v : d)));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (dates.some((d) => !d)) return setErr(plays === 1 ? 'Pick the date.' : `Pick all ${plays} dates.`);
    if (new Set(dates).size < dates.length) return setErr('Each play needs a different day.');
    setBusy(true);
    setErr('');
    const { error } = await createClient().rpc('schedule_booking_dates', { p_booking: bookingId, p_dates: dates });
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }
  return (
    <form className="form" onSubmit={save} style={{ maxWidth: 'none', marginTop: 14 }}>
      <div className="label" style={{ marginBottom: -4 }}>
        {plays === 1 ? 'When will it run?' : `When will the ${plays} plays run?`}
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        {dates.map((d, i) => (
          <label key={i} className="label" style={{ flex: '1 1 150px' }}>
            {plays > 1 ? `Play ${i + 1}` : 'Date'}
            <input className="input" type="date" min={today} value={d} required onChange={(e) => set(i, e.target.value)} />
          </label>
        ))}
      </div>
      <div className="row">
        <button className="btn btn-yellow btn-sm" type="submit" disabled={busy}>
          {busy ? '…' : plays === 1 ? 'Schedule' : 'Schedule all'}
        </button>
      </div>
      {err && (
        <small className="rpcerr" role="alert">
          {err}
        </small>
      )}
    </form>
  );
}
