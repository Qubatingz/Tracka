// Calendar rules (same as the demo). 0 = Monday … 6 = Sunday.
export const WDN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const pad2 = (n: number) => (n < 10 ? '0' : '') + n;
export const ymd = (d: Date) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
export const pdate = (s: string) => {
  const a = String(s).split('-');
  return new Date(+a[0], +a[1] - 1, +a[2]);
};
export const todayS = () => ymd(new Date());
export const weekday = (ds: string) => (pdate(ds).getDay() + 6) % 7;

export type SellerCal = { id: string; cal_days: number[]; cal_capacity: number; off: string[]; booked: Record<string, number> };
export type DayState = 'past' | 'off' | 'full' | 'free';

export function dayState(c: SellerCal, ds: string): DayState {
  if (ds < todayS()) return 'past';
  if ((c.off || []).includes(ds) || !(c.cal_days || []).includes(weekday(ds))) return 'off';
  return (c.booked?.[ds] || 0) >= (c.cal_capacity || 2) ? 'full' : 'free';
}

export function nextFree(c: SellerCal): string {
  const d = new Date();
  for (let i = 0; i < 90; i++) {
    const s = ymd(d);
    if (dayState(c, s) === 'free') return s;
    d.setDate(d.getDate() + 1);
  }
  return '';
}

export function niceDay(ds: string) {
  if (!ds) return '';
  const d = pdate(ds);
  return WDN[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MON[d.getMonth()].slice(0, 3);
}

// Build calendars for many sellers from database rows.
export function buildCals(sellers: any[], daysOff: any[], booked: any[]): Record<string, SellerCal> {
  const out: Record<string, SellerCal> = {};
  for (const s of sellers) out[s.id] = { id: s.id, cal_days: s.cal_days || [0, 1, 2, 3, 4, 5], cal_capacity: s.cal_capacity || 2, off: [], booked: {} };
  for (const o of daysOff || []) if (out[o.seller_id]) out[o.seller_id].off.push(o.day);
  for (const b of booked || []) if (out[b.seller_id]) out[b.seller_id].booked[b.day] = Number(b.n) || 0;
  return out;
}

// Every date of a booking: the promoter's dates once set, otherwise the artist's wish.
export function bookingDates(b: any): string[] {
  const run = (b?.run_dates || []).filter(Boolean);
  if (run.length) return run;
  const want = (b?.want_dates || []).filter(Boolean);
  if (want.length) return want;
  const one = b?.run_date || b?.want_date;
  return one ? [one] : [];
}

export const niceDays = (ds: string[]) => ds.map(niceDay).join(', ');
