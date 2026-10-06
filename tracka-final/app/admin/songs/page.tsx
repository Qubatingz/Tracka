import AdminTabs from '@/components/AdminTabs';
import AdminHead from '@/components/AdminHead';
import Nothing from '@/components/Nothing';
import Icon from '@/components/Icon';
import RpcButton from '@/components/RpcButton';
import RpcForm from '@/components/RpcForm';
import { adminPage } from '@/lib/admin';
import { signedMap } from '@/lib/media';
import { rwf } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function AdminSongs() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const { data: camps } = await supabase.from('campaigns').select('*').eq('status', 'review').order('paid_at');
  const list = camps || [];
  const aids = Array.from(new Set(list.map((c: any) => c.artist_id)));
  const cids = list.map((c: any) => c.id);
  const [{ data: artists }, { data: bks }] = await Promise.all([
    aids.length ? supabase.from('public_profiles').select('id,display_name').in('id', aids) : Promise.resolve({ data: [] as any[] }),
    cids.length ? supabase.from('bookings').select('campaign_id,price').in('campaign_id', cids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const songs = await signedMap(supabase, 'songs', list.map((c: any) => c.song_path));
  return (
    <div className="page">
      <AdminTabs active="/admin/songs" counts={counts} />
      <AdminHead title="Songs." sub="Listen before promoters get it. Is it clean, clear and the artist's own?" />
      {list.length === 0 && <Nothing />}
      <div className="subgrid">
        {list.map((c: any) => {
          const cb = (bks || []).filter((b: any) => b.campaign_id === c.id);
          return (
            <article className="subcard" key={c.id}>
              <div className="subtop">
                <Icon name="note" size={26} />
                <div className="grow">
                  <strong>“{c.title}”</strong>
                  <small>
                    {(artists || []).find((a: any) => a.id === c.artist_id)?.display_name || 'Artist'} · {c.genre || 'Single'}
                    {c.song_version > 1 ? ` · version ${c.song_version}` : ''}
                  </small>
                </div>
                <span className="price">{rwf(cb.reduce((s: number, b: any) => s + b.price, 0))}</span>
              </div>
              {songs[c.song_path] && <audio controls src={songs[c.song_path]} style={{ margin: 0 }} />}
              {c.link && (
                <a className="proofchip" href={c.link} target="_blank" rel="noopener noreferrer">
                  <Icon name="arrow" size={16} />
                  Open the link
                </a>
              )}
              <p className="hint" style={{ margin: 0 }}>
                Goes to {cb.length} {cb.length === 1 ? 'promoter' : 'promoters'}.
              </p>
              <ul className="vcheck" style={{ columns: 1 }}>
                <li>Sound is clear, not broken</li>
                <li>No hate, no attacks on people</li>
                <li>The artist owns it</li>
              </ul>
              <RpcButton fn="admin_approve_song" args={{ p_campaign: c.id }} label="✓ Approve song" />
              <RpcForm fn="admin_request_changes" args={{ p_campaign: c.id }} fields={[{ name: 'p_reason', label: 'Or ask for changes', placeholder: 'What should the artist change?', required: true }]} submit="Ask for changes" kind="red" />
            </article>
          );
        })}
      </div>
    </div>
  );
}
