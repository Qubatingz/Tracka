'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AVC, AVOPT, SLIDERS, normAv, randomAv, avSVG } from '@/lib/avatar';

const ZOOM: Record<string, boolean> = { eyes: true, brows: true, nose: true, mouth: true, facial: true, wear: true };

export default function AvatarMaker({ userId, initial, back }: { userId: string; initial: any; back: string }) {
  const router = useRouter();
  const [d, setD] = useState<any>(() => (initial ? normAv(initial) : randomAv()));
  const [tab, setTab] = useState('face');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setD({ ...d, [k]: v });

  const faces = (k: string, title: string) => (
    <div className="av-row" key={k}>
      <h3>{title}</h3>
      <div className="av-choices">
        {AVOPT[k].map((x: any[]) => (
          <button key={x[0]} type="button" className="av-choice" aria-pressed={d[k] === x[0]} aria-label={x[1]} title={x[1]} onClick={() => set(k, x[0])} dangerouslySetInnerHTML={{ __html: avSVG({ ...d, [k]: x[0] }, false, !!ZOOM[k]) }} />
        ))}
      </div>
    </div>
  );
  const swatch = (k: string, title: string) => (
    <div className="av-row" key={k}>
      <h3>{title}</h3>
      <div className="av-choices">
        {AVC[k].map((x: any[]) => (
          <button key={x[0]} type="button" className="swatch" aria-pressed={d[k] === x[0]} aria-label={x[1]} title={x[1]} style={{ background: x[0] }} onClick={() => set(k, x[0])} />
        ))}
      </div>
    </div>
  );
  const body =
    tab === 'hair'
      ? [faces('hair', 'Style'), swatch('hairColor', 'Color')]
      : tab === 'style'
        ? [faces('headwear', 'On your head'), swatch('accent', 'Bandana, cap and beanie color'), faces('wear', 'Eyewear'), faces('earrings', 'Earrings'), faces('chain', 'Chain'), faces('top', 'Top')]
        : tab === 'colors'
          ? [swatch('shirt', 'Top color'), swatch('bg', 'Background'), faces('frame', 'Frame')]
          : [
              <div className="av-row" key="shape">
                <h3>Shape</h3>
                {SLIDERS.map((s: any[]) => (
                  <label className="slider" key={s[0]}>
                    {s[1]}
                    <input type="range" min={s[2]} max={s[3]} step={s[4]} value={d[s[0]]} onChange={(e) => set(s[0], parseFloat(e.target.value))} />
                  </label>
                ))}
              </div>,
              swatch('skin', 'Skin'),
              faces('eyes', 'Eyes'),
              faces('brows', 'Brows'),
              faces('nose', 'Nose'),
              faces('mouth', 'Mouth'),
              faces('facial', 'Facial hair'),
            ];

  async function save() {
    setBusy(true);
    const { error } = await createClient().from('profiles').update({ avatar: normAv(d), use_avatar: true }).eq('id', userId);
    setBusy(false);
    if (error) return alert(error.message);
    router.push(back);
    router.refresh();
  }

  return (
    <div className="av-wrap">
      <div className="av-preview">
        <span className="avatar bigav" style={{ width: 190, height: 190, ['--ring' as any]: '#1F4D3A' }} dangerouslySetInnerHTML={{ __html: avSVG(d) }} />
        <button className="btn btn-ghost btn-sm" type="button" style={{ width: '100%' }} onClick={() => setD(randomAv())}>
          Surprise me
        </button>
        <button className="btn btn-yellow" type="button" style={{ width: '100%' }} disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save avatar'}
        </button>
        <Link href={back} style={{ fontSize: 15 }}>
          Cancel
        </Link>
      </div>
      <div className="av-opts">
        <div className="seg" role="group" aria-label="Avatar parts">
          {[
            ['face', 'Face'],
            ['hair', 'Hair'],
            ['style', 'Style'],
            ['colors', 'Colors'],
          ].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        {body}
      </div>
    </div>
  );
}
