import SellerTabs from '@/components/SellerTabs';
import SellerHead from '@/components/SellerHead';
import SellerProfileForm from '@/components/SellerProfileForm';
import ProfileSettingsForm from '@/components/ProfileSettingsForm';
import { sellerPage } from '@/lib/seller';

export const dynamic = 'force-dynamic';

export default async function SellerProfile() {
  const { supabase, seller, profile, photo } = await sellerPage();
  const [{ data: works }, { data: priv }, { data: packs }] = await Promise.all([
    supabase.from('seller_works').select('*').eq('seller_id', seller.id).order('created_at'),
    supabase.from('seller_private').select('momo,id_type,id_number').eq('seller_id', seller.id).maybeSingle(),
    supabase.from('seller_packages').select('*').eq('seller_id', seller.id).order('plays'),
  ]);
  const missing = [
    !photo && !profile?.avatar ? 'photo or avatar' : '',
    !seller.description ? 'description' : '',
    !(seller.genres || []).length ? 'genres' : '',
    !seller.delivery_days ? 'delivery days' : '',
    !(works || []).length ? 'videos of past work' : '',
  ].filter(Boolean);
  const pct = Math.round(((5 - missing.length) / 5) * 100);
  return (
    <div className="page narrow">
      <SellerTabs active="/seller/profile" />
      <SellerHead seller={seller} profile={profile} photo={photo} />
      <div className="panel" style={{ margin: '6px 0 20px' }}>
        <div className="row between">
          <strong>Profile {pct}% done</strong>
          <span className="hint">{missing.length ? 'Add: ' + missing.join(', ') : 'Full profiles get booked more ✓'}</span>
        </div>
        <div className="meter">
          <span style={{ width: pct + '%' }} />
        </div>
      </div>
      <SellerProfileForm seller={seller} works={works || []} momo={priv?.momo || ''} packages={packs || []} />
      <h2 className="st">Picture and notifications</h2>
      <ProfileSettingsForm profile={profile} photoUrl={photo} back="/seller/profile" hideName />
      {priv?.id_number && (
        <p className="privacy" style={{ marginTop: 20 }}>
          <span>
            <b>{seller.id_checked ? 'ID checked ✓' : 'ID sent, waiting for a check'}</b> · {priv.id_type === 'passport' ? 'Passport' : 'National ID'} •••• {String(priv.id_number).slice(-4)}. Only the Tracka team can see it.
          </span>
        </p>
      )}
    </div>
  );
}
