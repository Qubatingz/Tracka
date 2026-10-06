import ArtistTabs from '@/components/ArtistTabs';
import ProfileSettingsForm from '@/components/ProfileSettingsForm';
import { getMe, faceUrl } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ArtistSettings() {
  const { supabase, profile } = await getMe();
  return (
    <div className="page narrow">
      <ArtistTabs active="/artist/settings" />
      <div className="head">
        <div>
          <h1>Settings.</h1>
          <p className="sub">How we reach you, and your picture.</p>
        </div>
      </div>
      <ProfileSettingsForm profile={profile} photoUrl={faceUrl(supabase, profile?.photo_path)} back="/artist" />
    </div>
  );
}
