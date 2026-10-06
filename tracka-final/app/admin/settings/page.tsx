import AdminTabs from '@/components/AdminTabs';
import AdminHead from '@/components/AdminHead';
import SettingsForm from '@/components/SettingsForm';
import { adminPage } from '@/lib/admin';
import { getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const [settings, { data: cats }] = await Promise.all([getSettings(supabase), supabase.from('categories').select('*').order('sort')]);
  return (
    <div className="page">
      <AdminTabs active="/admin/settings" counts={counts} />
      <AdminHead title="Settings." />
      <SettingsForm settings={settings} cats={cats || []} />
    </div>
  );
}
