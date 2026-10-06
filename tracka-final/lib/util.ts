// Small helpers shared by many pages.
export const CH: Record<string, string> = {
  radio: 'Radio', tv: 'TV', tiktok: 'TikTok', youtube: 'YouTube', blog: 'Blog', influencer: 'Influencer', dj: 'DJ',
  merch: 'Merch & clothing', design: 'Design', video: 'Video', photo: 'Photo', other: 'Other',
};
export const RING: Record<string, string> = {
  radio: '#E2B957', tv: '#9CC3A8', tiktok: '#F2C6A0', youtube: '#E39A7B', blog: '#F3D98B', influencer: '#BFDCC8', dj: '#D9B48F',
  merch: '#E7C9B5', design: '#C9D9C4', video: '#E0B8A8', photo: '#D8CDB0', other: '#E2D3B4',
};
export const GENRES = ['Afrobeat', 'Gospel', 'Hip hop', 'R&B', 'Amapiano', 'Other'];

export const rwf = (n: number | null | undefined) => 'RWF ' + Number(n || 0).toLocaleString('en-US');

export function catName(s: { category: string; custom_category?: string | null }) {
  return s.category === 'other' && s.custom_category ? s.custom_category : CH[s.category] || 'Other';
}

export function initials(name: string) {
  return (name || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function isUrl(u: string) {
  return /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(String(u || '').trim());
}

// "0788 123 456", "788123456", "+250788123456" → "+250788123456"
export function normalizePhone(input: string): string | null {
  const d = String(input || '').replace(/[^0-9]/g, '');
  if (d.length === 12 && d.startsWith('250')) return '+' + d;
  if (d.length === 10 && d.startsWith('0')) return '+250' + d.slice(1);
  if (d.length === 9 && d.startsWith('7')) return '+250' + d;
  return null;
}

export function niceDate(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export type Stats = { seller_id: string; jobs_done: number; avg_rating: number | null; reviews: number; on_time_pct: number | null; lost_problems: number };

// Same rules as the Terms: ID checked, 3+ jobs, 90% on time, 4.5★ or more, no refunded problems.
export function isTrusted(st: Stats | undefined, idChecked: boolean) {
  if (!st || !idChecked) return false;
  return st.jobs_done >= 3 && (st.on_time_pct ?? 0) >= 90 && (st.avg_rating == null || st.avg_rating >= 4.5) && st.lost_problems === 0;
}

export function platformOf(u: string): { key: string; name: string; icon: string; handle: string } {
  let host = '';
  let path: string[] = [];
  try {
    const x = new URL(u);
    host = x.hostname.replace(/^(www|m|vm|web)\./, '');
    path = x.pathname.split('/').filter(Boolean);
  } catch {
    return { key: 'web', name: 'Link', icon: 'globe', handle: '' };
  }
  const at = path[0] && path[0].startsWith('@') ? path[0] : '';
  if (/(^|\.)tiktok\.com$/.test(host)) return { key: 'tiktok', name: 'TikTok', icon: 'tiktok', handle: at };
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return { key: 'youtube', name: 'YouTube', icon: 'youtube', handle: at };
  if (/(^|\.)instagram\.com$/.test(host))
    return { key: 'instagram', name: 'Instagram', icon: 'insta', handle: path[0] && !['p', 'reel', 'reels', 'stories', 'tv'].includes(path[0]) ? '@' + path[0] : '' };
  if (/(^|\.)facebook\.com$|^fb\.watch$/.test(host))
    return { key: 'facebook', name: 'Facebook', icon: 'facebook', handle: path[0] && !['watch', 'share', 'reel', 'videos', 'groups'].includes(path[0]) ? path[0] : '' };
  if (/^x\.com$|(^|\.)twitter\.com$/.test(host)) return { key: 'x', name: 'X', icon: 'xlogo', handle: path[0] ? '@' + path[0] : '' };
  if (/audiomack|boomplay|spotify|soundcloud|music\.apple/.test(host)) return { key: 'music', name: host.split('.')[0].replace(/^\w/, (c) => c.toUpperCase()), icon: 'note', handle: '' };
  return { key: 'web', name: host || 'Website', icon: 'globe', handle: '' };
}
