'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import Avatar from './Avatar';
import Calendar from './Calendar';
import WeekStrip from './WeekStrip';
import LevelBadge from './LevelBadge';
import { createClient } from '@/lib/supabase/client';
import { CH, GENRES, catName, rwf } from '@/lib/util';
import { bookingDates, dayState, nextFree, niceDay, niceDays, todayS, type SellerCal } from '@/lib/calendar';

type Props = { campaignId: string; bookings: any[]; sellers: any[]; stats: any[]; packages?: any[]; pics: Record<string, any>; cals: Record<string, SellerCal>; fee: number };

export default function Picker({ campaignId, bookings, sellers, stats, packages = [], pics, cals, fee }: Props) {
  const router = useRouter();
  const [ch, setCh] = useState('all');
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [max, setMax] = useState(0);
  const [freeOn, setFreeOn] = useState('');
  const [sort, setSort] = useState('price');
  const [open, setOpen] = useState<string | null>(null);
  const [pkg, setPkg] = useState(''); // '' = one play at the normal price
  const [dates, setDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const booked: Record<string, any> = {};
  for (const b of bookings) booked[b.seller_id] = b;
  const statOf = (id: string) => stats.find((s: any) => s.seller_id === id);
  const isEx = (id: string) => !!sellers.find((s: any) => s.id === id)?.is_example;
  const practice = bookings.some((b: any) => isEx(b.seller_id));
  const real = bookings.some((b: any) => !isEx(b.seller_id));
  // example and real promoters never mix in one campaign
  const blockedFor = (p: any) =>
    booked[p.id] ? '' : p.is_example && real ? 'Example promoters are for practice. Start a new campaign to try them.' : !p.is_example && practice ? 'This is a practice campaign. Start a new campaign to book real promoters.' : '';
  const packsOf = (id: string) => packages.filter((x: any) => x.seller_id === id).sort((a: any, b: any) => a.plays - b.plays);
  const openSeller = (id: string) => {
    const bk = booked[id];
    setOpen(id);
    setPkg(bk?.package_id || '');
    setDates(bk ? (bk.want_dates?.length ? bk.want_dates : bk.want_date ? [bk.want_date] : []) : []);
    setErr('');
  };
  const chips = Object.keys(CH).filter((k) => sellers.some((s) => s.category === k));

  const list = useMemo(() => {
    const out = sellers.filter((s) => {
      if (ch !== 'all' && s.category !== ch) return false;
      if (genre && !(s.genres || []).includes(genre)) return false;
      if (max && s.price > max) return false;
      if (freeOn && dayState(cals[s.id], freeOn) !== 'free') return false;
      if (q) {
        const hay = [s.name, s.location, catName(s), ...(s.genres || [])].join(' ').toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const rate = (s: any) => Number(statOf(s.id)?.avg_rating) || 0;
    return out.sort((a, b) => (sort === 'price-high' ? b.price - a.price : sort === 'rating' ? rate(b) - rate(a) : sort === 'fast' ? (a.delivery_days || 99) - (b.delivery_days || 99) : a.price - b.price));
  }, [sellers, ch, genre, max, freeOn, q, sort, stats]);

  async function run(fn: () => PromiseLike<any>) {
    setBusy(true);
    setErr('');
    const { error } = (await fn()) || {};
    setBusy(false);
    if (error) return setErr(error.message);
    setOpen(null);
    router.refresh();
  }
  const supabase = createClient();
  // The database copies the real price and number of plays from the promoter.
  const add = (sid: string, packageId: string | null, want: string[]) => {
    const row = { package_id: packageId || null, want_dates: [...want].sort(), want_date: [...want].sort()[0] || null };
    return run(() => (booked[sid] ? supabase.from('bookings').update(row).eq('id', booked[sid].id) : supabase.from('bookings').insert({ campaign_id: campaignId, seller_id: sid, ...row })));
  };
  const remove = (sid: string) => run(() => supabase.from('bookings').delete().eq('id', booked[sid].id));
  const delDraft = () => {
    if (!window.confirm('Delete this draft?')) return;
    run(async () => {
      const r = await supabase.from('campaigns').delete().eq('id', campaignId);
      if (!r.error) router.push('/artist');
      return r;
    });
  };

  const total = bookings.reduce((t, b) => t + b.price, 0);
  const totalFee = Math.round((total * fee) / 100);
  const s = open ? sellers.find((x) => x.id === open) : null;
  const sPacks = s ? packsOf(s.id) : [];
  const pick = sPacks.find((x: any) => x.id === pkg);
  const need = pick ? pick.plays : 1;
  const shown = dates.slice(0, need);
  const toggleDay = (ds: string) =>
    setDates((cur) => {
      const now = cur.slice(0, need);
      if (now.includes(ds)) return now.filter((d) => d !== ds);
      if (need === 1) return [ds];
      return now.length < need ? [...now, ds].sort() : [...now.slice(0, need - 1), ds].sort();
    });
  const choosePkg = (id: string) => {
    setPkg(id);
    const n = id ? sPacks.find((x: any) => x.id === id)?.plays || 1 : 1;
    setDates((cur) => cur.slice(0, n));
  };
  const left = need - shown.length;
  const mainLabel = shown.length === 0 ? '' : left > 0 ? `${booked[s?.id || ''] ? 'Save' : 'Add'} with ${shown.length} of ${need} dates` : `${booked[s?.id || ''] ? 'Save' : 'Add'} · ${need === 1 ? niceDay(shown[0]) : `${need} dates`}`;

  return (
    <>
      {err && (
        <p className="notice err" role="alert">
          {err}
        </p>
      )}
      {practice && (
        <p className="practicebar">
          <b>🧪 Practice campaign</b> You picked example promoters: no money, and you&apos;ll see the whole road. Real promoters need a new campaign.
        </p>
      )}
      <div className="filters">
        <label className="searchbox">
          <Icon name="eye" size={18} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: name, service, city or genre" aria-label="Search promoters" />
        </label>
        <div className="row" role="group" aria-label="What kind of promoter">
          {['all', ...chips].map((k) => (
            <button key={k} type="button" className="fchip" aria-pressed={ch === k} onClick={() => setCh(k)}>
              {k === 'all' ? 'All' : (
                <>
                  <Icon name={k} size={16} /> {CH[k]}
                </>
              )}
            </button>
          ))}
        </div>
        <div className="row frow" style={{ display: 'flex' }}>
          <label className="flabel">
            Genre
            <select className="fsel" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">Any genre</option>
              {GENRES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="flabel">
            Budget
            <select className="fsel" value={max} onChange={(e) => setMax(Number(e.target.value))}>
              <option value={0}>Any price</option>
              {[15000, 25000, 50000, 100000].map((v) => (
                <option key={v} value={v}>
                  Up to {rwf(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="flabel">
            Free on
            <input type="date" className="fsel" min={todayS()} value={freeOn} onChange={(e) => setFreeOn(e.target.value)} />
          </label>
          <label className="flabel">
            Sort
            <select className="fsel" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="price">Lowest price</option>
              <option value="price-high">Highest price</option>
              <option value="rating">Best rated</option>
              <option value="fast">Fastest</option>
            </select>
          </label>
        </div>
        <p className="fcount">
          {list.length} {list.length === 1 ? 'promoter matches' : 'promoters match'}
        </p>
      </div>

      {sellers.length === 0 ? (
        <div className="emptybox">
          <Icon name="users" size={34} />
          <p>No verified promoters yet. The first ones are coming soon!</p>
        </div>
      ) : (
        <div className="grid">
          {list.map((p) => {
            const bk = booked[p.id];
            const st = statOf(p.id);
            const nf = nextFree(cals[p.id]);
            return (
              <div key={p.id} className={'pickcard' + (bk ? ' on' : '')}>
                <button type="button" className="pchead" onClick={() => openSeller(p.id)} aria-label={`See ${p.name} and pick dates`}>
                  <Avatar name={p.name} photo={pics[p.id]?.photo} avatar={pics[p.id]?.avatar} useAvatar={pics[p.id]?.useAvatar} category={p.category} size={52} />
                  <span className="grow">
                    <strong>{p.name}</strong>
                    {p.is_example && <span className="extag">Example</span>}
                    <small>
                      {catName(p)}
                      {p.location ? ' · ' + p.location : ''}
                    </small>
                  </span>
                  <span className="price">{rwf(bk ? bk.price : p.price)}</span>
                </button>
                {p.included && <p className="pinc">{p.included}</p>}
                <div className="pcmeta">
                  <LevelBadge st={st} />
                  {packsOf(p.id).length > 0 && (
                    <span className="hint">
                      <Icon name="tag" size={14} /> Packages from {rwf(packsOf(p.id)[0].price)}
                    </span>
                  )}
                  {st?.avg_rating ? <span className="starsdisp">{'★'.repeat(Math.round(st.avg_rating))}</span> : <span className="hint">New</span>}
                  {p.delivery_days && (
                    <span className="hint">
                      <Icon name="clock" size={14} /> {p.delivery_days} days
                    </span>
                  )}
                  {(p.genres || []).length > 0 && <span className="hint">{p.genres.slice(0, 2).join(' · ')}</span>}
                </div>
                <WeekStrip cal={cals[p.id]} />
                <div className="row between">
                  {bk ? (
                    <span className="datechip">
                      <Icon name="clock" size={14} />
                      {bk.plays > 1 ? `${bk.plays} plays · ` : ''}
                      {bookingDates(bk).length ? niceDays(bookingDates(bk)) : bk.plays > 1 ? 'dates later' : 'Date: later'}
                    </span>
                  ) : (
                    <span className="hint">Next free: {nf ? niceDay(nf) : '—'}</span>
                  )}
                  <span className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openSeller(p.id)}>
                      {bk ? 'Change' : packsOf(p.id).length ? 'Pick dates' : 'Pick date'}
                    </button>
                    {bk ? (
                      <button type="button" className="btn btn-dark btn-sm" aria-pressed="true" disabled={busy} onClick={() => remove(p.id)}>
                        <Icon name="check" size={16} /> Added
                      </button>
                    ) : blockedFor(p) ? (
                      <span className="btn btn-ghost btn-sm" aria-disabled="true" title={blockedFor(p)} style={{ opacity: 0.6 }}>
                        {p.is_example ? 'Practice only' : 'Real only'}
                      </span>
                    ) : (
                      <button type="button" className="btn btn-yellow btn-sm" aria-pressed="false" disabled={busy} onClick={() => add(p.id, null, [])}>
                        Add
                      </button>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: 22 }}>
        <button type="button" className="linkbtn" onClick={delDraft}>
          Delete this draft
        </button>
      </p>
      <div className="sumbar">
        <div>
          <strong>{bookings.length ? `${bookings.length} ${bookings.length === 1 ? 'promoter' : 'promoters'}` : 'No promoters yet'}</strong>
          <span>{bookings.length ? `${rwf(total + totalFee)}${totalFee ? ' incl. fee' : ''}` : 'Tap Add on a promoter'}</span>
        </div>
        {bookings.length ? (
          <Link className="btn btn-yellow" href={`/artist/c/${campaignId}/pay`}>
            Next: pay
          </Link>
        ) : (
          <span className="btn btn-yellow" aria-disabled="true" style={{ opacity: 0.45 }}>
            Next: pay
          </span>
        )}
      </div>

      {s && (
        <div id="drawer">
          <div className="dback" onClick={() => setOpen(null)} />
          <aside className="dpanel" role="dialog" aria-modal="true" aria-label={s.name}>
            <button type="button" className="dclose" aria-label="Close" onClick={() => setOpen(null)}>
              ×
            </button>
            <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
              <Avatar name={s.name} photo={pics[s.id]?.photo} avatar={pics[s.id]?.avatar} useAvatar={pics[s.id]?.useAvatar} category={s.category} size={64} />
              <div className="grow">
                <strong className="dname">{s.name}</strong>
                <small className="muted">
                  {catName(s)}
                  {s.location ? ' · ' + s.location : ''}
                </small>
                <span className="row" style={{ gap: 8, marginTop: 4 }}>
                  <span className="badge">
                    <Icon name="shield" size={16} />
                    Verified
                  </span>
                  <LevelBadge st={statOf(s.id)} />
                </span>
              </div>
            </div>
            <div className="dstats">
              <div>
                <small>Price</small>
                <strong>{rwf(s.price)}</strong>
              </div>
              <div>
                <small>Delivers in</small>
                <strong>{s.delivery_days ? `${s.delivery_days} days` : '—'}</strong>
              </div>
              <div>
                <small>Rating</small>
                <strong>{statOf(s.id)?.avg_rating ? `${Number(statOf(s.id).avg_rating).toFixed(1)} ★` : 'New'}</strong>
              </div>
            </div>
            {s.included && (
              <p className="dinc">
                <Icon name="check" size={16} />
                <span>{s.included}</span>
              </p>
            )}
            {sPacks.length > 0 && (
              <>
                <h3 className="dh">How many plays?</h3>
                <div className="packs" role="radiogroup" aria-label="How many plays">
                  <button type="button" role="radio" aria-checked={!pkg} className="pack" onClick={() => choosePkg('')}>
                    <b>1 play</b>
                    <span>{rwf(s.price)}</span>
                  </button>
                  {sPacks.map((x: any) => (
                    <button key={x.id} type="button" role="radio" aria-checked={pkg === x.id} className="pack" onClick={() => choosePkg(x.id)}>
                      <b>{x.plays} plays</b>
                      <span>{rwf(x.price)}</span>
                      {x.note && <small>{x.note}</small>}
                      {x.price < s.price * x.plays && <em>Save {rwf(s.price * x.plays - x.price)}</em>}
                    </button>
                  ))}
                </div>
              </>
            )}
            <h3 className="dh">{need === 1 ? 'Pick a date' : `Pick ${need} dates`}</h3>
            {need > 1 && <p className="hint" style={{ margin: '-4px 0 10px' }}>Tap free days. Tap again to remove one.</p>}
            <Calendar cal={cals[s.id]} selectedMany={shown} onPick={toggleDay} />
            {need > 1 && (
              <div className="datepills" aria-live="polite">
                {Array.from({ length: need }).map((_, i) =>
                  shown[i] ? (
                    <button key={i} type="button" className="datepill on" onClick={() => toggleDay(shown[i])} aria-label={`Remove ${niceDay(shown[i])}`}>
                      {niceDay(shown[i])} ×
                    </button>
                  ) : (
                    <span key={i} className="datepill">
                      Date {i + 1}
                    </span>
                  )
                )}
              </div>
            )}
            {s.is_example && <p className="exnote">🧪 Example promoter: booking it makes a <b>practice campaign</b>. No real play and no money; you see every step of the road.</p>}
            {blockedFor(s) && <p className="notice err">{blockedFor(s)}</p>}
            <div className="dfoot">
              <button type="button" className="btn btn-yellow" disabled={!shown.length || busy || !!blockedFor(s)} onClick={() => add(s.id, pkg || null, shown)}>
                {mainLabel || (need === 1 ? 'Pick a free day' : `Pick ${need} free days`)}
              </button>
              {!shown.length && !blockedFor(s) && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => add(s.id, pkg || null, [])}>
                  {booked[s.id] ? 'Save, choose dates later' : need === 1 ? 'Add, choose date later' : 'Add, choose dates later'}
                </button>
              )}
              {left > 0 && shown.length > 0 && <small className="hint">The promoter will confirm the {left === 1 ? 'last date' : `last ${left} dates`}.</small>}
              <Link href={`/p/${s.id}`} className="morelink" target="_blank">
                Full profile <Icon name="arrow" size={16} />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
