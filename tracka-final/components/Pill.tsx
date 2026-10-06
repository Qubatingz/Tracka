import { BL, CL, TONE } from '@/lib/labels';

export default function Pill({ st, label }: { st: string; label?: string }) {
  return <span className={'pill ' + (TONE[st] || 'p-muted')}>{label || BL[st] || CL[st] || st}</span>;
}
