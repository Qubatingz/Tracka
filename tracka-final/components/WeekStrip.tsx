import { WDN, ymd, dayState, type SellerCal } from '@/lib/calendar';

export default function WeekStrip({ cal }: { cal: SellerCal }) {
  const d = new Date();
  const items = [];
  let free = 0;
  for (let i = 0; i < 7; i++) {
    const s = ymd(d);
    const st = dayState(cal, s);
    if (st === 'free') free++;
    items.push(
      <span key={s} className={'wsd ' + st}>
        <small>{WDN[(d.getDay() + 6) % 7].slice(0, 2)}</small>
        {d.getDate()}
      </span>
    );
    d.setDate(d.getDate() + 1);
  }
  return (
    <div className="wstrip" role="img" aria-label={`Free on ${free} of the next 7 days`}>
      {items}
    </div>
  );
}
