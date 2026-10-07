import AdminTabs from '@/components/AdminTabs';
import AdminHead from '@/components/AdminHead';
import SettingsForm from '@/components/SettingsForm';
import RpcButton from '@/components/RpcButton';
import { adminPage } from '@/lib/admin';
import { getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const { supabase, ok, counts } = await adminPage();
  if (!ok) return <div className="page"><h1>Admins only.</h1></div>;
  const [settings, { data: cats }, ex] = await Promise.all([
    getSettings(supabase),
    supabase.from('categories').select('*').order('sort'),
    supabase.from('sellers').select('id', { count: 'exact', head: true }).eq('is_example', true),
  ]);
  return (
    <div className="page">
      <AdminTabs active="/admin/settings" counts={counts} />
      <AdminHead title="Settings." />
      {(ex?.count || 0) > 0 && (
        <div className="panel-yellow" style={{ marginBottom: 22 }}>
          <strong>Example data is on ({ex.count} example promoters).</strong>
          <p style={{ margin: '6px 0 12px' }}>They make Tracka look alive for demos. Remove them all before real artists arrive.</p>
          <RpcButton fn="remove_examples" args={{}} label="Remove example data" kind="red" small={false} confirmText="Remove ALL example promoters, artists, songs and bookings? Real data stays. This can't be undone." />
          <p className="hint" style={{ margin: '10px 0 0' }}>
            First time, the button needs one setup step: run <code>supabase/remove-examples-button.sql</code> once in the Supabase SQL Editor.
          </p>
        </div>
      )}
      <SettingsForm settings={settings} cats={cats || []} />
    </div>
  );
}
