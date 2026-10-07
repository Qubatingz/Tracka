import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import LevelBadge, { Badges } from '@/components/LevelBadge';
import { createClient } from '@/lib/supabase/server';
import { faceUrl } from '@/lib/data';
import { catName, rwf, platformOf, isTrusted, niceDate, type Stats } from '@/lib/util';
import { LEVELS, levelOf } from '@/lib/levels';

export const dynamic = 'force-dynamic';

export default async function SellerProfile({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: s } = await supabase.from('sellers').select('*').eq('id', params.id).maybeSingle();
  if (!s) notFound();
  const [{ data: st }, { data: works }, { data: reviews }, { data: face }, { data: packs }] = await Promise.all([
    supabase.from('seller_stats').select('*').eq('seller_id', s.id).maybeSingle(),
    supabase.from('seller_works').select('*').eq('seller_id', s.id).order('created_at'),
    supabase.from('seller_reviews').select('*').eq('seller_id', s.id).order('rated_at', { ascending: false }),
    s.profile_id ? supabase.from('public_profiles').select('photo_path').eq('id', s.profile_id).maybeSingle() : Promise.resolve({ data: null as any }),
    supabase.from('seller_packages').select('*').eq('seller_id', s.id).order('plays'),
  ]);
  const stats = st as Stats | null;
  const trusted = isTrusted(stats || undefined, s.id_checked);
  const ck = (ok: boolean, txt: string) => (
    <li className={ok ? 'ok' : ''} key={txt}>
      {ok ? '✓ ' : '· '}
      {txt}
    </li>
  );
  const jobs = stats?.jobs_done || 0;

  return (
    <div className="page">
      <div className="profhead">
        <Avatar name={s.name} photo={faceUrl(supabase, face?.photo_path)} category={s.category} size={120} />
        <div className="grow">
          <p className="sub" style={{ margin: 0 }}>
            {catName(s)}
            {s.location ? ' · ' + s.location : ''}
          </p>
          <h1>{s.name}</h1>
          {s.is_example && <p className="exnote">Example promoter, just to show how Tracka works. Can&apos;t be booked.</p>}
          <div className="row" style={{ gap: '8px 14px' }}>
            {s.status === 'verified' ? (
              <span className="badge">
                <Icon name="shield" size={18} />
                Verified
              </span>
            ) : (
              <span className="pill p-yellow">Waiting for verification</span>
            )}
            {s.status === 'verified' && s.id_checked && (
              <span className="badge">
                <Icon name="user" size={18} />
                ID checked
              </span>
            )}
            {trusted && (
              <span className="trustbadge">
                <Icon name="shield" size={14} />
                Trusted
              </span>
            )}
            <LevelBadge st={stats} big />
          </div>
          <div style={{ marginTop: 8 }}>
            <Badges s={s} st={stats} hasPackages={(packs || []).length > 0} />
          </div>
        </div>
        {s.status === 'verified' && !s.is_example && (
          <Link className="btn btn-yellow" href={`/artist/new?seller=${s.id}`}>
            Book {s.name}
          </Link>
        )}
      </div>

      <div className="stats">
        <div>
          <small>Price</small>
          <strong>{rwf(s.price)}</strong>
        </div>
        <div>
          <small>Delivers in</small>
          <strong>{s.delivery_days ? `${s.delivery_days} ${s.delivery_days === 1 ? 'day' : 'days'}` : '—'}</strong>
        </div>
        <div>
          <small>Rating</small>
          <strong>{stats?.avg_rating ? `${Number(stats.avg_rating).toFixed(1)} ★` : 'New'}</strong>
        </div>
        <div>
          <small>Jobs done</small>
          <strong>{jobs}</strong>
        </div>
      </div>

      <div className="profgrid">
        <div>
          {s.included && (
            <div className="panel-yellow">
              <small>What you get</small>
              <p style={{ fontSize: 22, margin: '4px 0 0' }}>{s.included}</p>
            </div>
          )}
          {(packs || []).length > 0 && (
            <>
              <h2 className="st">Packages</h2>
              <div className="pkglist">
                <div className="pkgline">
                  <div className="grow">
                    <b>1 play</b>
                    <small>{s.included || 'One play or post'}</small>
                  </div>
                  <span className="price">{rwf(s.price)}</span>
                </div>
                {packs!.map((x: any) => (
                  <div className="pkgline" key={x.id}>
                    <div className="grow">
                      <b>{x.plays} plays</b>
                      <small>
                        {x.note || `${x.plays} dates you choose`}
                        {x.price < s.price * x.plays ? ` · save ${rwf(s.price * x.plays - x.price)}` : ''}
                      </small>
                    </div>
                    <span className="price">{rwf(x.price)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {s.description && (
            <>
              <h2 className="st">About</h2>
              <p style={{ margin: 0 }}>{s.description}</p>
            </>
          )}
          {(s.pages || []).length > 0 && (
            <>
              <h2 className="st">Find them on</h2>
              <div className="pagechips">
                {s.pages.map((u: string) => {
                  const f = platformOf(u);
                  return (
                    <a key={u} className={`pagechip pf-${f.key}`} href={u} target="_blank" rel="noopener noreferrer">
                      <Icon name={f.icon} size={20} />
                      <span>
                        <b>{f.name}</b>
                        {f.handle && <small>{f.handle}</small>}
                      </span>
                      <Icon name="arrow" size={14} />
                    </a>
                  );
                })}
              </div>
            </>
          )}
          {(works || []).length > 0 && (
            <>
              <h2 className="st">Past work</h2>
              <div className="workcards">
                {works!.map((w: any) => {
                  const f = platformOf(w.url);
                  return (
                    <a key={w.id} className={`workcard pf-${f.key}`} href={w.url} target="_blank" rel="noopener noreferrer">
                      <span className="wthumb">
                        <Icon name="play" size={40} sw={1.6} />
                        <span className="wplat">
                          <Icon name={f.icon} size={13} />
                          {f.name}
                        </span>
                      </span>
                      <span className="wbody">
                        <strong>{w.caption || `Video on ${f.name}`}</strong>
                        <small>{f.handle || `Opens on ${f.name}`}</small>
                      </span>
                      <span className="wgo">
                        Watch <Icon name="arrow" size={14} />
                      </span>
                    </a>
                  );
                })}
              </div>
            </>
          )}
          <h2 className="st">Reviews</h2>
          {(reviews || []).length ? (
            reviews!.map((r: any, i: number) => (
              <div className="item" key={i}>
                <Avatar name={r.artist_name || 'Artist'} photo={faceUrl(supabase, r.photo_path)} size={40} />
                <div className="grow">
                  <strong className="starsdisp">{'★'.repeat(r.rating)}</strong>
                  <small>
                    {r.artist_name || 'An artist'} · for “{r.title}” · {niceDate(r.rated_at)}
                  </small>
                  {r.review && <p style={{ margin: '6px 0 0' }}>{r.review}</p>}
                </div>
              </div>
            ))
          ) : (
            <p className="sub">No reviews yet.</p>
          )}
        </div>
        <aside>
          <div className="side trustside">
            {trusted ? (
              <span className="trustbadge big">
                <Icon name="shield" size={16} />
                Trusted promoter
              </span>
            ) : (
              <small>Trust</small>
            )}
            <ul className="trustlist">
              {ck(!!s.id_checked, 'ID checked')}
              {ck(jobs >= 3, `${jobs} ${jobs === 1 ? 'job' : 'jobs'} done`)}
              {ck((stats?.on_time_pct ?? 0) >= 90, stats?.on_time_pct == null ? 'On time: no jobs yet' : `${stats.on_time_pct}% on time`)}
              {ck((stats?.avg_rating ?? 0) >= 4.5, stats?.avg_rating ? `${Number(stats.avg_rating).toFixed(1)}★ from ${stats.reviews} reviews` : 'No reviews yet')}
              {ck((stats?.lost_problems ?? 0) === 0, stats?.lost_problems ? `${stats.lost_problems} problem(s) refunded` : 'No refunded problems')}
            </ul>
            {!trusted && <p className="hint">Trusted = ID checked, 3+ jobs, 90% on time, 4.5★ or more, no refunded problems.</p>}
          </div>
          <div className="side">
            <small>Levels</small>
            {(['new', 'rising', 'top'] as const).map((k) => (
              <p key={k} style={{ margin: '8px 0 0', fontWeight: levelOf(stats) === k ? 700 : 400 }}>
                {LEVELS[k].emoji} {LEVELS[k].name}
                <span className="hint"> · {LEVELS[k].text}</span>
              </p>
            ))}
          </div>
          {(s.genres || []).length > 0 && (
            <div className="side">
              <small>Plays</small>
              <div className="tagrow">
                {s.genres.map((g: string) => (
                  <span className="tag" key={g}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="side">
            <Icon name="lock" size={20} />
            <p>Your money is held until you see their proof.</p>
          </div>
        </aside>
      </div>
      <p style={{ marginTop: 36 }}>
        <Link href="/marketplace">← All promoters</Link>
      </p>
    </div>
  );
}
