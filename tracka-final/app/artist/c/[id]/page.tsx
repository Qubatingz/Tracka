import { notFound } from 'next/navigation';
import ArtistTabs from '@/components/ArtistTabs';
import Picker from '@/components/Picker';
import Tracker from '@/components/Tracker';
import { getMe } from '@/lib/data';
import { loadMarket } from '@/lib/market';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const { supabase } = await getMe();
  const { data: c } = await supabase.from('campaigns').select('*').eq('id', params.id).maybeSingle();
  if (!c) notFound();
  const { data: bks } = await supabase.from('bookings').select('*').eq('campaign_id', c.id).order('created_at');
  if (c.status === 'draft') {
    const m = await loadMarket(supabase);
    return (
      <div className="page">
        <ArtistTabs active="" />
        <ol className="stepper" aria-label="Campaign steps">
          <li className="done">
            <b>✓</b>Song
          </li>
          <li className="now" aria-current="step">
            <b>2</b>Promoters
          </li>
          <li>
            <b>3</b>Pay
          </li>
        </ol>
        <div className="head">
          <div>
            <p className="sub" style={{ margin: 0 }}>
              “{c.title}”
            </p>
            <h1>Pick your promoters.</h1>
            <p className="sub">Tap a promoter to see their calendar, packages and dates.</p>
          </div>
        </div>
        <Picker campaignId={c.id} bookings={bks || []} sellers={m.sellers} stats={m.stats} packages={m.packages} pics={m.pics} cals={m.cals} fee={m.fee} />
      </div>
    );
  }
  return <Tracker c={c} bookings={bks || []} />;
}
