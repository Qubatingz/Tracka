import type { Stats } from './util';

// Promoter levels, earned from finished jobs, stars and being on time.
export type LevelKey = 'new' | 'rising' | 'top';
export const LEVELS: Record<LevelKey, { name: string; emoji: string; text: string }> = {
  new: { name: 'New', emoji: '🌱', text: 'Just started on Tracka' },
  rising: { name: 'Rising', emoji: '⭐', text: '3+ finished jobs with good stars' },
  top: { name: 'Top Promoter', emoji: '🏆', text: '10+ jobs, 4.5★ or more, 90% on time' },
};

const nums = (st?: Partial<Stats> | null) => ({
  jobs: Number(st?.jobs_done) || 0,
  rating: st?.avg_rating == null ? null : Number(st.avg_rating),
  reviews: Number(st?.reviews) || 0,
  onTime: st?.on_time_pct == null ? 0 : Number(st.on_time_pct),
});

export function levelOf(st?: Partial<Stats> | null): LevelKey {
  const { jobs, rating, onTime } = nums(st);
  if (jobs >= 10 && (rating == null || rating >= 4.5) && onTime >= 90) return 'top';
  if (jobs >= 3 && (rating == null || rating >= 4)) return 'rising';
  return 'new';
}

// What is still missing for the next level, in plain words.
export function nextLevel(st?: Partial<Stats> | null): { to: LevelKey; todo: string[]; pct: number } | null {
  const { jobs, rating, onTime } = nums(st);
  const lv = levelOf(st);
  const jobsLeft = (n: number) => `${n} more finished ${n === 1 ? 'job' : 'jobs'}`;
  if (lv === 'top') return null;
  if (lv === 'new') {
    const todo = [jobs < 3 ? jobsLeft(3 - jobs) : '', rating != null && rating < 4 ? 'an average of 4★ or more' : ''].filter(Boolean);
    return { to: 'rising', todo, pct: Math.round(Math.min(jobs / 3, 1) * (rating != null && rating < 4 ? 80 : 100)) };
  }
  const okRating = rating == null || rating >= 4.5;
  const okTime = onTime >= 90;
  const todo = [jobs < 10 ? jobsLeft(10 - jobs) : '', okRating ? '' : 'keep 4.5★ or more', okTime ? '' : 'deliver 90% on time'].filter(Boolean);
  return { to: 'top', todo, pct: Math.round((Math.min(jobs / 10, 1) * 60) + (okRating ? 20 : 0) + (okTime ? 20 : 0)) };
}

export type Badge = { key: string; label: string; icon: string };

export function badgesOf(s: any, st?: Partial<Stats> | null, hasPackages = false): Badge[] {
  const { jobs, rating, reviews, onTime } = nums(st);
  const out: Badge[] = [];
  if (jobs >= 3 && onTime >= 95) out.push({ key: 'ontime', label: 'Always on time', icon: 'clock' });
  if (reviews >= 3 && rating != null && rating >= 4.8) out.push({ key: 'loved', label: 'Artists love them', icon: 'star' });
  if (s?.delivery_days && s.delivery_days <= 2) out.push({ key: 'fast', label: 'Fast delivery', icon: 'arrow' });
  if (jobs >= 25) out.push({ key: 'busy', label: 'In demand', icon: 'users' });
  if (hasPackages) out.push({ key: 'pack', label: 'Has packages', icon: 'tag' });
  return out;
}
