'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from './Calendar';
import { createClient } from '@/lib/supabase/client';
import { WDN, weekday, type SellerCal } from '@/lib/calendar';

export default function SellerCalendar({ sellerId, cal }: { sellerId: string; cal: SellerCal }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const supabase = createClient();
  async function saveSeller(patch: any) {
    const { error } = await supabase.from('sellers').update(patch).eq('id', sellerId);
    if (error) return setMsg(error.message);
    router.refresh();
  }
  async function toggleDay(i: number) {
    const days = cal.cal_days.includes(i) ? cal.cal_days.filter((d) => d !== i) : [...cal.cal_days, i].sort();
    await saveSeller({ cal_days: days });
  }
  async function toggle(ds: string) {
    setMsg('');
    if (cal.booked?.[ds]) return setMsg('This day has bookings. It stays open.');
    if (cal.off.includes(ds)) {
      const { error } = await supabase.from('seller_days_off').delete().eq('seller_id', sellerId).eq('day', ds);
      if (error) return setMsg(error.message);
    } else {
      if (!cal.cal_days.includes(weekday(ds))) return setMsg(`You don't work on ${WDN[weekday(ds)]}s. Change it in "Days you work".`);
      const { error } = await supabase.from('seller_days_off').insert({ seller_id: sellerId, day: ds });
      if (error) return setMsg(error.message);
    }
    router.refresh();
  }
  return (
    <>
      {msg && (
        <p className="notice err" role="alert">
          {msg}
        </p>
      )}
      <Calendar cal={cal} manage onToggle={toggle} bookedLabel />
      <div className="side" style={{ marginTop: 16 }}>
        <small>Days you work</small>
        <div className="wdays" role="group" aria-label="Days you work">
          {WDN.map((w, i) => (
            <button key={w} type="button" aria-pressed={cal.cal_days.includes(i)} onClick={() => toggleDay(i)}>
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="side" style={{ marginTop: 12 }}>
        <label className="label" style={{ color: 'inherit' }}>
          Songs you can do per day
          <select className="input" value={cal.cal_capacity} onChange={(e) => saveSeller({ cal_capacity: Number(e.target.value) })}>
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
