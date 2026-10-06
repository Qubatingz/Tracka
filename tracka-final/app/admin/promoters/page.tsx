import Link from 'next/link';
import Icon from '@/components/Icon';
import AdminTabs from '@/components/AdminTabs';
import { adminPage } from '@/lib/admin';
import { catName, rwf, platformOf } from '@/lib/util';
import { setSellerStatus } from '../actions';
import AdminAddSeller from '@/components/AdminAddSeller';

export const dynamic = 'force-dynamic';

function StatusButton({ id, status, label, kind }: { id: string; status: string; label: string; kind: 'yellow' | 'red' | 'ghost' }) {
  return (
    <form action={setSellerStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`btn btn-${kind} btn-sm`} type="submit">
        {label}
      </button>
    </form>
  );
}

export default async function AdminPromoters() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const [{ data: sellers }, { data: cats }] = await Promise.all([
    supabase.from('sellers').select('*').order('created_at', { ascending: false }),
    supabase.from('categories').select('key,name,is_open').order('sort'),
  ]);
  const all = sellers || [];
  const pending = all.filter((s: any) => s.status === 'pending');
  const verified = all.filter((s: any) => s.status === 'verified');
  const suspended = all.filter((s: any) => s.status === 'suspended');
  const { data: priv } = pending.length ? await supabase.from('seller_private').select('*').in('seller_id', pending.map((s: any) => s.id)) : { data: [] as any[] };
  const privOf = (id: string) => (priv || []).find((p: any) => p.seller_id === id) || {};
  const idUrls: Record<string, string> = {};
  for (const p of priv || []) {
    if (p.id_image_path) {
      const { data } = await supabase.storage.from('ids').createSignedUrl(p.id_image_path, 3600);
      if (data?.signedUrl) idUrls[p.seller_id] = data.signedUrl;
    }
  }

  return (
    <div className="page">
      <AdminTabs active="/admin/promoters" counts={counts} />
      <div className="head">
        <div>
          <h1>Promoters.</h1>
          <p className="sub">Check their ID and their page, then verify.</p>
        </div>
      </div>

      <AdminAddSeller cats={(cats || []).filter((c: any) => c.is_open && c.key !== 'other')} />
      <h2 className="st" style={{ marginTop: 0 }}>
        Waiting ({pending.length})
      </h2>
      {pending.length === 0 && (
        <div className="emptybox small">
          <Icon name="check" size={28} />
          <p>Nothing waiting.</p>
        </div>
      )}
      {pending.map((s: any) => {
        const p: any = privOf(s.id);
        return (
          <article className="vcard" key={s.id}>
            <div className="subtop">
              <div className="grow">
                <strong>{s.name}</strong>
                <small>
                  {catName(s)} · {rwf(s.price)} · MoMo {p.momo || '—'}
                </small>
              </div>
            </div>
            <div className="vgrid">
              <div>
                <small className="vlab">Their page</small>
                <p>
                  {(s.pages || []).map((u: string) => {
                    const f = platformOf(u);
                    return (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                        <Icon name={f.icon} size={14} /> {f.name} {f.handle}
                      </a>
                    );
                  })}
                </p>
              </div>
              <div>
                <small className="vlab">
                  <Icon name="lock" size={13} /> ID (private)
                </small>
                <p>
                  {p.id_type === 'passport' ? 'Passport' : 'National ID'} <span className="idnum">{p.id_number || '—'}</span>
                </p>
                {idUrls[s.id] && (
                  <a href={idUrls[s.id]} target="_blank" rel="noopener noreferrer">
                    <img src={idUrls[s.id]} alt="ID photo" style={{ maxWidth: 220, borderRadius: 12, display: 'block' }} />
                  </a>
                )}
              </div>
            </div>
            <ul className="vcheck">
              <li>The ID photo is clear and real</li>
              <li>The name fits the person</li>
              <li>The page is really theirs</li>
              <li>The price makes sense</li>
            </ul>
            <div className="row">
              <Link className="morelink" href={`/p/${s.id}`} style={{ minHeight: 40 }}>
                Open profile
              </Link>
              <span className="spacer" />
              <StatusButton id={s.id} status="verified" label="✓ Verify" kind="yellow" />
              <StatusButton id={s.id} status="rejected" label="Reject" kind="red" />
            </div>
          </article>
        );
      })}

      <h2 className="st">Verified ({verified.length})</h2>
      {verified.map((s: any) => (
        <div className="item" key={s.id}>
          <div className="grow">
            <strong>
              <Link href={`/p/${s.id}`}>{s.name}</Link>
            </strong>
            <small>{catName(s)}</small>
          </div>
          <span className="price">{rwf(s.price)}</span>
          <StatusButton id={s.id} status="suspended" label="Suspend" kind="red" />
        </div>
      ))}
      {verified.length === 0 && <p className="sub">None yet.</p>}

      {suspended.length > 0 && (
        <>
          <h2 className="st">Suspended ({suspended.length})</h2>
          {suspended.map((s: any) => (
            <div className="item" key={s.id}>
              <div className="grow">
                <strong>{s.name}</strong>
                <small>Hidden from artists</small>
              </div>
              <StatusButton id={s.id} status="verified" label="Bring back" kind="ghost" />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
