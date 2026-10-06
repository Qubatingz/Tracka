'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import Avatar from './Avatar';
import Calendar from './Calendar';
import WeekStrip from './WeekStrip';
import { createClient } from '@/lib/supabase/client';
import { CH, GENRES, catName, rwf } from '@/lib/util';
import { dayState, nextFree, niceDay, todayS, type SellerCal } from '@/lib/calendar';

type Props = { campaignId: string; bookings: any[]; sellers: any[]; stats: any[]; pics: Record<string, any>; cals: Record<string, SellerCal>; fee: number };

export default function Picker({ campaignId, bookings, sellers, stats, pics, cals, fee }: Props) {
  const router = useRouter();
  const [ch, setCh] = useState('all');
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [max, setMax] = useState(0);
  const [freeOn, setFreeOn] = useState('');
  const [sort, setSort] = useState('price');
  const [open, setOpen] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const booked: Record<string, any> = {};
  for (const b of bookings) booked[b.seller_id] = b;
  const statOf = (id: string) => stats.find((s: any) => s.seller_id === id);
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

  async function run(fn: () => Promise<any>) {
    setBusy(true);
    setErr('');
    const { error } = (await fn()) || {};
    setBusy(false);
    if (error) return setErr(error.message);
    setOpen(null);
    router.refresh();
  }
  const supabase = createClient();
  const add = (sid: string, want: string | null) =>
    run(() => (booked[sid] ? supabase.from('bookings').update({ want_date: want }).eq('id', booked[sid].id) : supabase.from('bookings').insert({ campaign_id: campaignId, seller_id: sid, want_date: want })));
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
  const chosen = date || (s && booked[s.id]?.want_date) || '';

  return (
    <>
      {err && (
        <p className="notice err" role="alert">
          {err}
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
                <button type="button" className="pchead" onClick={() => { setOpen(p.id); setDate(''); }} aria-label={`See ${p.name} and pick a date`}>
                  <Avatar name={p.name} photo={pics[p.id]?.photo} avatar={pics[p.id]?.avatar} useAvatar={pics[p.id]?.useAvatar} category={p.category} size={52} />
                  <span className="grow">
                    <strong>{p.name}</strong>
                    <small>
                      {catName(p)}
                      {p.location ? ' · ' + p.location : ''}
                    </small>
                  </span>
                  <span className="price">{rwf(p.price)}</span>
                </button>
                {p.included && <p className="pinc">{p.included}</p>}
                <div className="pcmeta">
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
                      {bk.want_date ? niceDay(bk.want_date) : 'Date: later'}
                    </span>
                  ) : (
                    <span className="hint">Next free: {nf ? niceDay(nf) : '—'}</span>
                  )}
                  <span className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(p.id); setDate(''); }}>
                      {bk ? 'Change date' : 'Pick date'}
                    </button>
                    {bk ? (
                      <button type="button" className="btn btn-dark btn-sm" aria-pressed="true" disabled={busy} onClick={() => remove(p.id)}>
                        <Icon name="check" size={16} /> Added
                      </button>
                    ) : (
                      <button type="button" className="btn btn-yellow btn-sm" aria-pressed="false" disabled={busy} onClick={() => add(p.id, null)}>
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
                <span className="badge">
                  <Icon name="shield" size={16} />
                  Verified
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
            <h3 className="dh">Pick a date</h3>
            <Calendar cal={cals[s.id]} selected={chosen} onPick={setDate} />
            <div className="dfoot">
              <button type="button" className="btn btn-yellow" disabled={!chosen || busy} onClick={() => add(s.id, chosen)}>
                {chosen ? `${booked[s.id] ? 'Change to' : 'Add for'} ${niceDay(chosen)}` : 'Pick a free day'}
              </button>
              {!booked[s.id] && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => add(s.id, null)}>
                  Add, choose date later
                </button>
              )}
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
