import type { createClient } from './supabase/server';
import { faceUrl } from './data';
import { todayS, buildCals } from './calendar';

// Everything the promoter picker needs: open services, sellers, stats, pictures and calendars.
export async function loadMarket(supabase: ReturnType<typeof createClient>) {
  const [{ data: cats }, { data: settings }] = await Promise.all([
    supabase.from('categories').select('*').order('sort'),
    supabase.from('settings').select('allow_custom,fee_percent,momo_code').eq('id', 1).single(),
  ]);
  const open = (cats || []).filter((c: any) => c.is_open || (c.key === 'other' && settings?.allow_custom)).map((c: any) => c.key);
  const { data: rows } = await supabase
    .from('sellers')
    .select('id,name,category,custom_category,price,included,delivery_days,location,genres,pages,id_checked,profile_id,cal_days,cal_capacity')
    .eq('status', 'verified')
    .in('category', open.length ? open : ['none'])
    .order('price');
  const sellers = rows || [];
  const ids = sellers.map((s: any) => s.id);
  const pids = sellers.map((s: any) => s.profile_id).filter(Boolean);
  const [{ data: stats }, { data: faces }, { data: off }, { data: booked }, { data: packages }] = await Promise.all([
    ids.length ? supabase.from('seller_stats').select('*').in('seller_id', ids) : Promise.resolve({ data: [] as any[] }),
    pids.length ? supabase.from('public_profiles').select('id,photo_path,avatar,use_avatar').in('id', pids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? supabase.from('seller_days_off').select('*').in('seller_id', ids).gte('day', todayS()) : Promise.resolve({ data: [] as any[] }),
    ids.length ? supabase.from('booked_days').select('*').in('seller_id', ids).gte('day', todayS()) : Promise.resolve({ data: [] as any[] }),
    ids.length ? supabase.from('seller_packages').select('*').in('seller_id', ids).order('plays') : Promise.resolve({ data: [] as any[] }),
  ]);
  const pics: Record<string, any> = {};
  for (const s of sellers) {
    const f = (faces || []).find((x: any) => x.id === s.profile_id);
    pics[s.id] = { photo: faceUrl(supabase, f?.photo_path), avatar: f?.avatar || null, useAvatar: !!f?.use_avatar };
  }
  return { sellers, stats: stats || [], packages: packages || [], pics, cals: buildCals(sellers, off || [], booked || []), fee: Number(settings?.fee_percent) || 0, momo: settings?.momo_code || '' };
}
