import Icon from './Icon';
import { CH } from '@/lib/util';
import { BOX, ONLINE, OUTLINE, placeOf } from '@/lib/places';

export type MapItem = { id: string; name: string; category: string; location?: string | null; state: 'done' | 'coming' | 'off' };

const W = 430;
const H = Math.round((W * (BOX.n - BOX.s)) / (BOX.w1 - BOX.w0));
const xy = (lon: number, lat: number): [number, number] => [((lon - BOX.w0) / (BOX.w1 - BOX.w0)) * W, ((BOX.n - lat) / (BOX.n - BOX.s)) * H];
const LAND = OUTLINE.map(([lo, la], i) => `${i ? 'L' : 'M'}${xy(lo, la).map((v) => v.toFixed(1)).join(' ')}`).join(' ') + ' Z';

// Where the song plays: radio, TV and DJs on a map of Rwanda; TikTok, YouTube, blogs and influencers online.
export default function RwandaMap({ items, title = 'Where your song plays' }: { items: MapItem[]; title?: string }) {
  const live = items.filter((x) => x.state !== 'off');
  const online = live.filter((x) => ONLINE.includes(x.category));
  const local = live.filter((x) => !ONLINE.includes(x.category));
  const groups: Record<string, { place: string; at: [number, number]; list: MapItem[] }> = {};
  const nowhere: MapItem[] = [];
  for (const it of local) {
    const p = placeOf(it.location);
    if (!p) {
      nowhere.push(it);
      continue;
    }
    (groups[p.group] ||= { place: p.group, at: xy(p.lon, p.lat), list: [] }).list.push(it);
  }
  const played = live.filter((x) => x.state === 'done').length;
  if (!live.length) return null;
  return (
    <section className="panel mapbox" aria-label={title}>
      <div className="row between" style={{ alignItems: 'baseline' }}>
        <h2 className="st" style={{ margin: 0 }}>
          {title}
        </h2>
        <span className="hint">
          <b>{played}</b> of {live.length} played
        </span>
      </div>
      <div className="mapgrid">
        <svg className="rwmap" viewBox={`-10 -10 ${W + 20} ${H + 20}`} role="img" aria-label={`Map of Rwanda with ${local.length} promoters`}>
          <path d={LAND} className="land" />
          <text x={xy(29.0, -1.98)[0]} y={xy(29.0, -1.98)[1]} className="lake" transform={`rotate(-62 ${xy(29.0, -1.98).join(' ')})`}>
            Lake Kivu
          </text>
          {Object.values(groups).map((g) => {
            const n = g.list.length;
            const doneHere = g.list.filter((x) => x.state === 'done').length;
            return (
              <g key={g.place}>
                {g.list.map((it, i) => {
                  const a = (i / Math.max(n, 1)) * Math.PI * 2;
                  const r = n > 1 ? 9 + Math.min(n, 8) : 0;
                  const cx = g.at[0] + Math.cos(a) * r;
                  const cy = g.at[1] + Math.sin(a) * r;
                  return (
                    <g key={it.id} className={`pin ${it.state}`}>
                      {it.state === 'done' && <circle cx={cx} cy={cy} r={13} className="halo" />}
                      <circle cx={cx} cy={cy} r={7} className="dot">
                        <title>{`${it.name} · ${CH[it.category] || 'Promoter'} · ${it.state === 'done' ? 'played' : 'coming'}`}</title>
                      </circle>
                    </g>
                  );
                })}
                <text x={g.at[0] + (n > 1 ? 13 + Math.min(n, 8) + 8 : 12)} y={g.at[1] + 4} className="plabel">
                  {g.place}
                  {n > 1 ? ` · ${doneHere}/${n}` : ''}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="mapside">
          <p className="mapkey">
            <span>
              <i className="k done" /> Played
            </span>
            <span>
              <i className="k coming" /> Coming
            </span>
          </p>
          {local.map((it) => (
            <p key={it.id} className={`mapline ${it.state}`}>
              <Icon name={it.category} size={16} />
              <span className="grow">
                <b>{it.name}</b>
                <small>{placeOf(it.location)?.name || it.location || 'Rwanda'}</small>
              </span>
              <span className="mstate">{it.state === 'done' ? '✓' : '…'}</span>
            </p>
          ))}
          {online.length > 0 && (
            <>
              <small className="vlab">Online, everywhere</small>
              {online.map((it) => (
                <p key={it.id} className={`mapline ${it.state}`}>
                  <Icon name={it.category} size={16} />
                  <span className="grow">
                    <b>{it.name}</b>
                    <small>{CH[it.category]}</small>
                  </span>
                  <span className="mstate">{it.state === 'done' ? '✓' : '…'}</span>
                </p>
              ))}
            </>
          )}
          {nowhere.length > 0 && <p className="hint">{nowhere.length} more without a town on their profile.</p>}
        </div>
      </div>
    </section>
  );
}
