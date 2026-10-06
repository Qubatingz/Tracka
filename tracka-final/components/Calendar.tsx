'use client';
import { useState } from 'react';
import { MON, WDN, pad2, todayS, dayState, niceDay, type SellerCal } from '@/lib/calendar';

// Month calendar. pick = artists choose a free day. manage = sellers open/close days.
export default function Calendar({ cal, selected, onPick, manage, onToggle, bookedLabel }: { cal: SellerCal; selected?: string; onPick?: (ds: string) => void; manage?: boolean; onToggle?: (ds: string) => void; bookedLabel?: boolean }) {
  const nowM = todayS().slice(0, 7);
  const [base, setBase] = useState(selected ? selected.slice(0, 7) : nowM);
  const y = +base.slice(0, 4);
  const m = +base.slice(5, 7) - 1;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const move = (dir: number) => {
    const d = new Date(y, m + dir, 1);
    setBase(d.getFullYear() + '-' + pad2(d.getMonth() + 1));
  };
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<span key={'e' + i} className="cd empty" aria-hidden="true" />);
  for (let dd = 1; dd <= days; dd++) {
    const ds = `${y}-${pad2(m + 1)}-${pad2(dd)}`;
    const st = dayState(cal, ds);
    const booked = cal.booked?.[ds] || 0;
    const label = `${niceDay(ds)}: ${{ free: 'free', full: 'fully booked', off: 'not working', past: 'past' }[st]}${booked && bookedLabel ? `, ${booked} booked` : ''}`;
    const cls = `cd ${st}${selected === ds ? ' sel' : ''}${ds === todayS() ? ' today' : ''}${booked && bookedLabel ? ' hasb' : ''}`;
    const clickable = manage ? st !== 'past' : !!onPick && st === 'free';
    cells.push(
      clickable ? (
        <button key={ds} type="button" className={cls} aria-label={label} aria-pressed={selected === ds} onClick={() => (manage ? onToggle?.(ds) : onPick?.(ds))}>
          {dd}
        </button>
      ) : (
        <span key={ds} className={cls} role="img" aria-label={label}>
          {dd}
        </span>
      )
    );
  }
  return (
    <div className="cal">
      <div className="calhead">
        <button type="button" className="calnav" aria-label="Previous month" disabled={base <= nowM} onClick={() => move(-1)}>
          ‹
        </button>
        <strong>
          {MON[m]} {y}
        </strong>
        <button type="button" className="calnav" aria-label="Next month" onClick={() => move(1)}>
          ›
        </button>
      </div>
      <div className="calgrid">
        {WDN.map((w) => (
          <span key={w} className="cw" aria-hidden="true">
            {w.slice(0, 2)}
          </span>
        ))}
        {cells}
      </div>
      <div className="calkey">
        <span>
          <i className="k free" />
          Free
        </span>
        <span>
          <i className="k full" />
          Full
        </span>
        <span>
          <i className="k off" />
          Not working
        </span>
        {bookedLabel && (
          <span>
            <i className="k hasbk" />
            Has bookings
          </span>
        )}
      </div>
    </div>
  );
}
