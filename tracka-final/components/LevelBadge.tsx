import Icon from './Icon';
import { LEVELS, levelOf, badgesOf } from '@/lib/levels';
import type { Stats } from '@/lib/util';

// 🌱 New · ⭐ Rising · 🏆 Top Promoter
export default function LevelBadge({ st, big = false }: { st?: Partial<Stats> | null; big?: boolean }) {
  const lv = levelOf(st);
  const L = LEVELS[lv];
  return (
    <span className={`lvl lvl-${lv}${big ? ' big' : ''}`} title={L.text}>
      <span aria-hidden="true">{L.emoji}</span>
      {L.name}
    </span>
  );
}

export function Badges({ s, st, hasPackages = false, max = 4 }: { s: any; st?: Partial<Stats> | null; hasPackages?: boolean; max?: number }) {
  const list = badgesOf(s, st, hasPackages).slice(0, max);
  if (!list.length) return null;
  return (
    <span className="bdgs">
      {list.map((b) => (
        <span key={b.key} className={`bdg bdg-${b.key}`}>
          <Icon name={b.icon} size={13} />
          {b.label}
        </span>
      ))}
    </span>
  );
}
