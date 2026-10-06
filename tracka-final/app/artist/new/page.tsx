import ArtistTabs from '@/components/ArtistTabs';
import NewCampaignForm from '@/components/NewCampaignForm';
import { getMe } from '@/lib/data';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewCampaign({ searchParams }: { searchParams: { seller?: string; date?: string } }) {
  const { supabase, user } = await getMe();
  if (!user) redirect('/login?next=/artist/new');
  let seller: any = null;
  if (searchParams.seller) {
    const { data } = await supabase.from('sellers').select('id,name').eq('id', searchParams.seller).eq('status', 'verified').maybeSingle();
    seller = data;
  }
  return (
    <div className="page narrow">
      <ArtistTabs active="/artist/new" />
      <ol className="stepper" aria-label="Campaign steps">
        <li className="now" aria-current="step">
          <b>1</b>Song
        </li>
        <li>
          <b>2</b>Promoters
        </li>
        <li>
          <b>3</b>Pay
        </li>
      </ol>
      <div className="head">
        <h1>What&apos;s the song?</h1>
      </div>
      {seller && <p className="notice">{seller.name} is waiting for your song.</p>}
      <NewCampaignForm sellerId={seller?.id || null} wantDate={searchParams.date || null} />
    </div>
  );
}
