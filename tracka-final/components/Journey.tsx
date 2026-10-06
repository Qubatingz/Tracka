import Icon from './Icon';

// The animated road: a gold note slides to the current step.
export default function Journey({ steps, at, now }: { steps: string[]; at: number; now?: string }) {
  const n = steps.length;
  const fin = at >= n;
  const pos = fin ? 100 : n > 1 ? (Math.max(0, at) / (n - 1)) * 100 : 0;
  return (
    <div className={'journey' + (fin ? ' fin' : '')} role="img" aria-label={fin ? 'Finished' : `Step ${at + 1} of ${n}: ${steps[at]}`}>
      <div className="jtrack">
        <span className="jfill" style={{ ['--p' as any]: pos + '%' }} />
        <span className="jcar" style={{ ['--p' as any]: pos + '%' }}>
          <Icon name={fin ? 'check' : 'note'} size={15} sw={2.4} />
        </span>
      </div>
      <ol className="jstops" aria-hidden="true">
        {steps.map((x, i) => (
          <li key={x} className={fin || i < at ? 'done' : i === at ? 'now' : ''} style={{ ['--x' as any]: (n > 1 ? (i / (n - 1)) * 100 : 0) + '%' }}>
            <span className="jdot" />
            <small>{x}</small>
          </li>
        ))}
      </ol>
      {now && <p className="jnow">{now}</p>}
    </div>
  );
}

export const A_STEPS = ['Paid', 'Song checked', 'Promoters on it', "It's out", 'Results in', 'Done'];
const A_NOW = ["We're checking your payment", 'Tracka is listening to your song', 'Your promoters are getting ready', 'Your song is out there! 🎶', 'Results are coming in. Take a look', 'Paying your promoters'];

export function campaignAt(c: any, bookings: any[]) {
  if (c.status === 'draft') return -1;
  if (c.status === 'payment_submitted') return 0;
  if (c.status === 'review' || c.status === 'changes') return 1;
  if (c.status === 'completed') return 6;
  const live = bookings.filter((b) => b.status !== 'declined' && b.status !== 'refunded');
  const has = (sts: string[]) => live.some((b) => sts.includes(b.status));
  if (live.length && live.every((b) => b.status === 'approved' || b.status === 'paid_out')) return 5;
  if (has(['proof_submitted', 'disputed', 'approved', 'paid_out'])) return 4;
  if (has(['live'])) return 3;
  return 2;
}

export function CampaignJourney({ c, bookings }: { c: any; bookings: any[] }) {
  const at = campaignAt(c, bookings);
  if (at < 0) return <p className="jnow">Not paid yet. Finish it to start the road.</p>;
  return <Journey steps={A_STEPS} at={at} now={at >= 6 ? 'All done 🎉' : c.status === 'changes' ? 'We need a new version of your song' : A_NOW[at]} />;
}

export const P_STEPS = ['New booking', 'Accepted', 'Date set', "It's out", 'Proof sent', 'Paid'];
const P_NOW = ['', 'Accept it within 48 hours', 'Pick the date it will run', 'Play or post the song', 'Send your proof', "Waiting for approval, then you're paid"];

export function bookingAt(b: any) {
  const acc = !!b.accepted_at;
  const map: Record<string, number> = { booked: acc ? 2 : 1, scheduled: 3, live: 4, proof_submitted: 5, disputed: 5, approved: 5, paid_out: 6 };
  return map[b.status] ?? 0;
}

export function BookingJourney({ b }: { b: any }) {
  const at = bookingAt(b);
  return <Journey steps={P_STEPS} at={at} now={b.status === 'disputed' ? "Problem reported. We're checking" : at >= 6 ? 'Paid ✓' : P_NOW[at]} />;
}
