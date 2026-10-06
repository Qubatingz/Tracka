import { RING, initials } from '@/lib/util';
import { avSVG } from '@/lib/avatar';

type Props = { name: string; photo?: string | null; avatar?: any; useAvatar?: boolean; category?: string; size?: number };

export default function Avatar({ name, photo, avatar, useAvatar, category = 'other', size = 56 }: Props) {
  const ring = RING[category] || '#C99A3B';
  const showAv = !!avatar && (useAvatar || !photo);
  const style: any = { ['--ring']: ring, width: size, height: size, fontSize: Math.round(size * 0.36), background: ring };
  if (showAv) return <span className="avatar" aria-hidden="true" style={style} dangerouslySetInnerHTML={{ __html: avSVG(avatar) }} />;
  return (
    <span className="avatar" aria-hidden="true" style={style}>
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </span>
  );
}
