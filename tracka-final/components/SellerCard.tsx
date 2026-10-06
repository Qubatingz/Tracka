import Link from 'next/link';
import Avatar from './Avatar';
import Icon from './Icon';
import { catName, rwf, platformOf, isTrusted, type Stats } from '@/lib/util';

export default function SellerCard({ s, st, photo }: { s: any; st?: Stats; photo?: string | null }) {
  const seen = new Set<string>();
  const icons = (s.pages || []).map((u: string) => platformOf(u)).filter((f: any) => (seen.has(f.key) ? false : (seen.add(f.key), true)));
  return (
    <Link className="pcard" href={`/p/${s.id}`}>
      <div className="row" style={{ gap: 14 }}>
        <Avatar name={s.name} photo={photo} category={s.category} size={54} />
        <div className="grow">
          <h3>{s.name}</h3>
          {isTrusted(st, s.id_checked) && (
            <span className="trustbadge">
              <Icon name="shield" size={14} />
              Trusted
            </span>
          )}
          <small className="muted">
            {catName(s)}
            {s.location ? ' · ' + s.location : ''}
          </small>
        </div>
      </div>
      {icons.length > 0 && (
        <p className="progline">
          <span className="picons">
            {icons.map((f: any) => (
              <span key={f.key} title={f.name}>
                <Icon name={f.icon} size={15} />
              </span>
            ))}
          </span>
        </p>
      )}
      {s.included && <p className="pinc">{s.included}</p>}
      <div className="pmeta">
        <span className="price">{rwf(s.price)}</span>
        {st && st.avg_rating ? <span className="starsdisp">{'★'.repeat(Math.round(st.avg_rating))}</span> : <span className="hint">New</span>}
      </div>
      {s.delivery_days && (
        <span className="hint">
          <Icon name="clock" size={14} /> Delivers in {s.delivery_days} {s.delivery_days === 1 ? 'day' : 'days'}
        </span>
      )}
    </Link>
  );
}
