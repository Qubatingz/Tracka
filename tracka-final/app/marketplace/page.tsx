import Link from 'next/link';
import Icon from '@/components/Icon';
import SellerCard from '@/components/SellerCard';
import { createClient } from '@/lib/supabase/server';
import { faceUrl } from '@/lib/data';
import { CH, catName, type Stats } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function Marketplace({ searchParams }: { searchParams: { cat?: string; q?: string } }) {
  const supabase = createClient();
  const cat = searchParams.cat || '';
  const q = (searchParams.q || '').trim().toLowerCase();
  const [{ data: cats }, { data: settings }] = await Promise.all([
    supabase.from('categories').select('*').order('sort'),
    supabase.from('settings').select('allow_custom').eq('id', 1).single(),
  ]);
  const open = (cats || []).filter((c: any) => c.is_open || (c.key === 'other' && settings?.allow_custom)).map((c: any) => c.key);
  const { data: rows } = await supabase
    .from('sellers')
    .select('id,name,category,custom_category,price,included,delivery_days,location,genres,pages,id_checked,profile_id,is_example')
    .eq('status', 'verified')
    .in('category', open.length ? open : ['none'])
    .order('price');
  const all = rows || [];
  const chips = open.filter((k: string) => all.some((s: any) => s.category === k));
  const list = all.filter((s: any) => {
    if (cat && s.category !== cat) return false;
    if (!q) return true;
    const hay = [s.name, s.location, catName(s), ...(s.genres || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
  const ids = list.map((s: any) => s.id);
  const pids = list.map((s: any) => s.profile_id).filter(Boolean);
  const [{ data: stats }, { data: faces }] = await Promise.all([
    ids.length ? supabase.from('seller_stats').select('*').in('seller_id', ids) : Promise.resolve({ data: [] as any[] }),
    pids.length ? supabase.from('public_profiles').select('id,photo_path').in('id', pids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const statOf = (id: string) => (stats || []).find((x: Stats) => x.seller_id === id) as Stats | undefined;
  const photoOf = (pid: string) => faceUrl(supabase, (faces || []).find((f: any) => f.id === pid)?.photo_path);
  const href = (k: string) => `/marketplace?${new URLSearchParams({ ...(k ? { cat: k } : {}), ...(q ? { q } : {}) }).toString()}`;

  return (
    <div className="page">
      <div className="head">
        <div>
          <h1>The marketplace.</h1>
          <p className="sub">Promoters and DJs. Real prices. Checked by us.</p>
        </div>
        <Link className="btn btn-yellow" href="/artist/new">
          Start a campaign
        </Link>
      </div>
      <div className="filters">
        <form className="searchbox" action="/marketplace" method="get">
          <Icon name="eye" size={18} />
          {cat && <input type="hidden" name="cat" value={cat} />}
          <input type="search" name="q" defaultValue={searchParams.q || ''} placeholder="Search: name, service, city or genre" aria-label="Search promoters" />
        </form>
        <div className="row" role="group" aria-label="What kind of promoter">
          <Link className="fchip" href={href('')} aria-current={!cat ? 'true' : undefined} style={!cat ? { background: '#1F4D3A', color: '#FFFBF4', borderColor: '#1F4D3A' } : undefined}>
            All
          </Link>
          {chips.map((k: string) => (
            <Link key={k} className="fchip" href={href(k)} style={cat === k ? { background: '#1F4D3A', color: '#FFFBF4', borderColor: '#1F4D3A' } : undefined}>
              <Icon name={k} size={16} /> {CH[k]}
            </Link>
          ))}
        </div>
        <p className="fcount">
          {list.length} {list.length === 1 ? 'promoter matches' : 'promoters match'}
          {(cat || q) && (
            <>
              {' · '}
              <Link href="/marketplace">Clear filters</Link>
            </>
          )}
        </p>
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((s: any) => (
            <SellerCard key={s.id} s={s} st={statOf(s.id)} photo={photoOf(s.profile_id)} />
          ))}
        </div>
      ) : (
        <div className="emptybox">
          <Icon name="users" size={34} />
          <p>{all.length ? 'No promoter matches these filters.' : 'No verified promoters yet. The first ones are coming soon!'}</p>
        </div>
      )}
    </div>
  );
}
