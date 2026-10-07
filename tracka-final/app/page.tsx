import Link from 'next/link';
import Icon from '@/components/Icon';
import SellerCard from '@/components/SellerCard';
import MusicButton from '@/components/MusicButton';
import HotList from '@/components/HotList';
import { createClient } from '@/lib/supabase/server';
import { getSettings, faceUrl } from '@/lib/data';
import { RING, CH, rwf } from '@/lib/util';

export const dynamic = 'force-dynamic';

const CHANS = ['radio', 'tv', 'tiktok', 'youtube', 'blog', 'influencer', 'dj'];

export default async function Home() {
  const supabase = createClient();
  const settings = await getSettings(supabase);
  const { data: cats } = await supabase.from('categories').select('key,is_open');
  const open = (cats || []).filter((c: any) => c.is_open).map((c: any) => c.key);
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id,name,category,custom_category,price,included,delivery_days,location,pages,id_checked,profile_id')
    .eq('status', 'verified')
    .in('category', open.length ? open : ['none'])
    .order('price')
    .limit(3);
  const list = sellers || [];
  const ids = list.map((s: any) => s.profile_id).filter(Boolean);
  const { data: faces } = ids.length ? await supabase.from('public_profiles').select('id,photo_path').in('id', ids) : { data: [] as any[] };
  const photoOf = (pid: string) => faceUrl(supabase, (faces || []).find((f: any) => f.id === pid)?.photo_path);
  const { data: hotRows } = await supabase.rpc('trending_songs', { p_days: 7, p_limit: 5 });
  const hot = (hotRows || []).map((h: any) => ({ ...h, photo: faceUrl(supabase, h.photo_path) }));
  const minPrice = list.length ? list[0].price : 0;
  const fee = Number(settings.fee_percent) || 0;
  const step = 360 / CHANS.length;
  const fmsg = settings.founder_msg || "Artists shouldn't have to guess who to pay, or if it worked. So I built Tracka.";
  const fname = settings.founder_name || 'Jimmy';
  const wa = String(settings.whatsapp || '').replace(/[^0-9]/g, '');

  return (
    <>
      <section className="hero">
        <div className="hero-in">
          <p className="kicker hk">Kigali · 2026</p>
          <h1 className="scripth">
            <span>Get your</span> <span>song</span> <span>heard.</span>
          </h1>
          <div className="herofoot">
            <div>
              <p className="lead">Nobody gets paid until it&apos;s done.</p>
              <p className="heresub">Radio, TV, TikTok, YouTube, blogs, DJs. One payment.</p>
              {minPrice > 0 && (
                <p className="anchor">
                  Campaigns from {rwf(minPrice)} · {fee ? `fee ${fee}%` : 'no hidden fees'}
                </p>
              )}
            </div>
            <div className="ctas">
              <Link className="btn btn-yellow" href="/artist/new">
                Start a campaign
              </Link>
              <Link className="btn btn-ghost" href="/marketplace">
                See promoters
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band-in">
          <p className="kicker">N° 01</p>
          <h2 className="sech">One song. Every channel.</h2>
          <div className="twocol">
            <div className="orbit" role="img" aria-label="One song, sent to radio, TV, TikTok, YouTube, blogs, influencers and DJs">
              <svg className="orbitlines" viewBox="0 0 400 400" aria-hidden="true">
                <circle cx="200" cy="200" r="160" className="ringline" />
              </svg>
              <div className="ring">
                <svg viewBox="0 0 400 400" aria-hidden="true">
                  {CHANS.map((k, i) => {
                    const a = ((i * step - 90) * Math.PI) / 180;
                    return <line key={k} className="spoke" x1="200" y1="200" x2={(200 + Math.cos(a) * 160).toFixed(1)} y2={(200 + Math.sin(a) * 160).toFixed(1)} />;
                  })}
                </svg>
                {CHANS.map((k, i) => {
                  const a = ((i * step - 90) * Math.PI) / 180;
                  return (
                    <div key={k} className="node" style={{ left: `${(50 + Math.cos(a) * 40).toFixed(2)}%`, top: `${(50 + Math.sin(a) * 40).toFixed(2)}%` }}>
                      <div className="nodein">
                        <span className="bub" style={{ ['--c' as any]: RING[k] }}>
                          <Icon name={k} size={26} />
                        </span>
                        <small>{CH[k]}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="disc">
                <div className="discart">
                  <div className="sun" />
                  <div className="hill h1" />
                  <div className="hill h2" />
                  <div className="hill h3" />
                </div>
                <div className="eq" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <MusicButton />
              </div>
              <span className="disclabel">Your song</span>
            </div>
            <div className="calc">
              <p className="kicker dark">How it works</p>
              <ol className="hsteps" style={{ gap: 8 }}>
                {['Add your song', 'Pick promoters and dates', 'Pay once. Track it.'].map((t, i) => (
                  <li key={t} className="hstep" style={{ padding: '12px 14px' }}>
                    <span className="hnum">{i + 1}</span>
                    <div>
                      <h3 style={{ margin: 0 }}>{t}</h3>
                    </div>
                  </li>
                ))}
              </ol>
              <p style={{ marginTop: 14 }}>
                <Link className="morelink" href="/how">
                  The full guide <Icon name="arrow" size={18} />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <HotList songs={hot} />

      <section className="band">
        <div className="band-in">
          <p className="kicker">N° 02</p>
          <h2 className="sech">Your money waits for the proof.</h2>
          <div className="flow">
            <div className="fnode">
              <Icon name="note" size={30} />
              <strong>You pay</strong>
            </div>
            <span className="farrow" aria-hidden="true">
              <Icon name="arrow" size={26} />
            </span>
            <div className="fnode vault">
              <Icon name="lock" size={30} />
              <strong>We hold it</strong>
            </div>
            <span className="farrow" aria-hidden="true">
              <Icon name="arrow" size={26} />
            </span>
            <div className="fnode">
              <Icon name="check" size={30} />
              <strong>Paid after proof</strong>
            </div>
          </div>
          <p className="guarantee">
            <Icon name="shield" size={20} /> No proof? Money back.
          </p>
        </div>
      </section>

      {list.length > 0 && (
        <section className="band">
          <div className="band-in">
            <p className="kicker">N° 03</p>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <h2 className="sech" style={{ margin: 0 }}>
                Meet the promoters.
              </h2>
              <Link className="morelink" href="/marketplace">
                See all <Icon name="arrow" size={18} />
              </Link>
            </div>
            <div className="grid" style={{ marginTop: 26 }}>
              {list.map((s: any) => (
                <SellerCard key={s.id} s={s} photo={photoOf(s.profile_id)} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="band">
        <div className="band-in">
          <p className="kicker">N° {list.length ? '04' : '03'}</p>
          <h2 className="sech">Made in Kigali.</h2>
          <div className="founder">
            <div className="fwho">
              <span className="fav" aria-hidden="true">
                {fname.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{fname}</strong>
                <small className="muted" style={{ display: 'block' }}>
                  Founder
                </small>
              </div>
            </div>
            <blockquote className="fquote">“{fmsg}”</blockquote>
          </div>
          <div className="contactrow">
            {wa && (
              <a className="btn btn-wa" href={`https://wa.me/${wa}?text=${encodeURIComponent('Hello Tracka!')}`} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={18} />
                Chat on WhatsApp
              </a>
            )}
            {settings.phone && (
              <a className="btn btn-ghost" href={`tel:${String(settings.phone).replace(/[^0-9+]/g, '')}`}>
                Call {settings.phone}
              </a>
            )}
            {settings.email && (
              <a className="btn btn-ghost" href={`mailto:${settings.email}`}>
                {settings.email}
              </a>
            )}
          </div>
          {settings.rdb && (
            <p className="reg">
              <Icon name="shield" size={16} /> Registered in Rwanda · RDB {settings.rdb}
            </p>
          )}
        </div>
      </section>

      <section className="band endband">
        <div className="band-in twocol">
          <h2 className="sech" style={{ margin: 0 }}>
            Promoter? Get booked.
          </h2>
          <div className="row">
            <Link className="btn btn-yellow" href="/sell">
              Join as a promoter
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
