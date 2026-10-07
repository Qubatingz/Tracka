import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';
import AdminHead from '@/components/AdminHead';
import Nothing from '@/components/Nothing';
import Icon from '@/components/Icon';
import ProofView from '@/components/ProofView';
import RpcButton from '@/components/RpcButton';
import { adminPage } from '@/lib/admin';
import { signedMap } from '@/lib/media';
import { rwf } from '@/lib/util';
import { niceDay } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export default async function AdminProofs() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const [{ data: bks }, { data: late }] = await Promise.all([
    supabase.from('bookings').select('*').in('status', ['proof_submitted', 'disputed']).order('proof_at'),
    supabase.from('admin_late').select('*'),
  ]);
  const all = [...(bks || []), ...(late || [])];
  const bids = all.map((b: any) => b.id);
  const sids = Array.from(new Set(all.map((b: any) => b.seller_id)));
  const cids = Array.from(new Set(all.map((b: any) => b.campaign_id)));
  const [{ data: proofs }, { data: sellers }, { data: camps }] = await Promise.all([
    bids.length ? supabase.from('proofs').select('*').in('booking_id', bids).order('created_at') : Promise.resolve({ data: [] as any[] }),
    sids.length ? supabase.from('sellers').select('id,name,category').in('id', sids) : Promise.resolve({ data: [] as any[] }),
    cids.length ? supabase.from('campaigns').select('id,title').in('id', cids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const media = await signedMap(supabase, 'proofs', (proofs || []).flatMap((p: any) => [p.image_path, p.video_path]));
  const proofOf = (bid: string, kind = 'proof') => (proofs || []).filter((p: any) => p.booking_id === bid && p.kind === kind).pop();
  const nameOf = (sid: string) => (sellers || []).find((s: any) => s.id === sid)?.name || 'Promoter';
  const titleOf = (cid: string) => (camps || []).find((c: any) => c.id === cid)?.title || 'Song';
  const disputes = (bks || []).filter((b: any) => b.status === 'disputed');
  const toCheck = (bks || []).filter((b: any) => b.status === 'proof_submitted');

  const Card = ({ b, mode }: { b: any; mode: 'check' | 'dispute' | 'late' }) => {
    const lateSent = b.due_date && b.proof_at && b.proof_at.slice(0, 10) > b.due_date;
    return (
      <article className="subcard">
        <div className="subtop">
          <div className="grow">
            <strong>{nameOf(b.seller_id)}</strong>
            <small>“{titleOf(b.campaign_id)}”</small>
          </div>
          <span className="price">{rwf(b.price)}</span>
        </div>
        <div className="subfacts">
          <span>
            <Icon name="calendar" size={14} />
            {b.run_date ? `Ran ${niceDay(b.run_date)}${b.plays > 1 ? ` + ${b.plays - 1} more plays` : ''}` : `Due ${niceDay(b.due_date)}`}
          </span>
          {b.proof_at && (
            <span>
              <Icon name="upload" size={14} />
              Sent {niceDay(b.proof_at.slice(0, 10))}
            </span>
          )}
          {mode === 'late' ? <span className="bad">{b.reason === 'no_accept' ? 'Not accepted in 48h' : 'Late · no proof'}</span> : lateSent ? <span className="bad">Sent late</span> : b.proof_at ? <span className="good">On time</span> : null}
        </div>
        {mode === 'dispute' && (
          <>
            <p className="subprob">Artist says: “{b.problem}”</p>
            {proofOf(b.id, 'reply') ? (
              <>
                <p className="subprob reply">The promoter answers:</p>
                <ProofView p={proofOf(b.id, 'reply')} urls={media} />
              </>
            ) : (
              <p className="hint" style={{ margin: 0 }}>
                Waiting for the promoter&apos;s answer.
              </p>
            )}
          </>
        )}
        {mode !== 'late' && <ProofView p={proofOf(b.id)} urls={media} big />}
        <div className="row subbtns">
          {mode === 'check' && (
            <>
              <RpcButton fn="admin_decide" args={{ p_booking: b.id, p_action: 'approve' }} label="✓ Approve" />
              <RpcButton fn="admin_decide" args={{ p_booking: b.id, p_action: 'send_back' }} label="Send back" kind="red" />
            </>
          )}
          {mode === 'dispute' && (
            <>
              <RpcButton fn="admin_decide" args={{ p_booking: b.id, p_action: 'release' }} label="Release to promoter" />
              <RpcButton fn="admin_decide" args={{ p_booking: b.id, p_action: 'refund' }} label="Refund artist" kind="red" confirmText="Refund the artist for this booking?" />
            </>
          )}
          {mode === 'late' && <RpcButton fn="admin_decide" args={{ p_booking: b.id, p_action: 'refund' }} label="Refund artist" kind="red" confirmText="Cancel and refund this booking?" />}
          <Link className="morelink" href={`/p/${b.seller_id}`} style={{ minHeight: 36 }}>
            Promoter
          </Link>
        </div>
      </article>
    );
  };

  return (
    <div className="page">
      <AdminTabs active="/admin/proofs" counts={counts} />
      <AdminHead title="Submissions." sub="Look at the screenshot or video. Approve it, and the promoter can be paid." />
      {disputes.length > 0 && (
        <>
          <h2 className="st" style={{ marginTop: 0 }}>
            Problems reported ({disputes.length})
          </h2>
          <div className="subgrid">
            {disputes.map((b: any) => (
              <Card key={b.id} b={b} mode="dispute" />
            ))}
          </div>
        </>
      )}
      <h2 className="st">To check ({toCheck.length})</h2>
      {toCheck.length ? (
        <div className="subgrid">
          {toCheck.map((b: any) => (
            <Card key={b.id} b={b} mode="check" />
          ))}
        </div>
      ) : (
        <Nothing />
      )}
      {(late || []).length > 0 && (
        <>
          <h2 className="st">Late ({late!.length})</h2>
          <div className="subgrid">
            {late!.map((b: any) => (
              <Card key={b.id} b={b} mode="late" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
