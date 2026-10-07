'use client';
import { useState } from 'react';
import Icon from './Icon';
import { CH, RING } from '@/lib/util';

export type CardItem = { name: string; category: string; location?: string | null; plays: number; done: boolean };

const GREEN = '#1F4D3A';
const GOLD = '#C99A3B';
const CREAM = '#F4EDE0';
const INK = '#14281F';
const SERIF = '"DM Serif Display", Georgia, serif';
const SANS = 'Outfit, "Helvetica Neue", Arial, sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > max && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Draws a 1080×1350 picture (Instagram / WhatsApp status size) of the campaign result.
export async function drawResultCard(title: string, artist: string, items: CardItem[], host: string): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([document.fonts.load(`96px ${SERIF}`), document.fonts.load(`600 40px Outfit`), document.fonts.load(`400 40px Outfit`)]);
  } catch {
    /* fonts are a bonus */
  }
  const W = 1080;
  const H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  // woven canvas background
  c.fillStyle = CREAM;
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.05;
  c.fillStyle = INK;
  for (let y = 0; y < H; y += 6) c.fillRect(0, y, W, 1);
  for (let x = 0; x < W; x += 6) c.fillRect(x, 0, 1, H);
  c.globalAlpha = 1;
  // stripe
  c.fillStyle = GREEN;
  c.fillRect(0, 0, W, 22);
  c.fillStyle = GOLD;
  c.fillRect(0, 22, W, 8);
  // wordmark
  c.fillStyle = INK;
  c.font = `700 40px ${SANS}`;
  c.fillText('Tracka', 80, 110);
  c.fillStyle = GOLD;
  c.fillText('.', 80 + c.measureText('Tracka').width, 110);
  c.fillStyle = '#44564C';
  c.font = `600 22px ${SANS}`;
  c.fillText('CAMPAIGN RESULTS', 80, 146);
  // song circle: sun + hills
  const cx = 850;
  const cy = 250;
  const r = 150;
  c.save();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#F6E7C4';
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.fillStyle = '#E2B957';
  c.beginPath();
  c.arc(cx + 30, cy - 30, 52, 0, Math.PI * 2);
  c.fill();
  const hill = (col: string, x: number, y: number, rr: number) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, rr, 0, Math.PI * 2);
    c.fill();
  };
  hill('#9CC3A8', cx - 80, cy + 190, 170);
  hill('#2E6B50', cx + 110, cy + 210, 170);
  hill(GREEN, cx - 10, cy + 260, 170);
  c.restore();
  c.strokeStyle = GREEN;
  c.lineWidth = 8;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.stroke();
  // title
  let size = 96;
  c.font = `${size}px ${SERIF}`;
  let lines = wrap(c, `“${title}”`, 600);
  while (lines.length > 3 && size > 56) {
    size -= 8;
    c.font = `${size}px ${SERIF}`;
    lines = wrap(c, `“${title}”`, 600);
  }
  lines = lines.slice(0, 3);
  c.fillStyle = INK;
  let y = 250;
  for (const l of lines) {
    c.fillText(l, 80, y);
    y += size * 1.05;
  }
  c.fillStyle = '#44564C';
  c.font = `400 40px ${SANS}`;
  c.fillText(`by ${artist}`, 80, y + 6);
  // the big number
  const done = items.filter((i) => i.done);
  const plays = done.reduce((t, i) => t + (i.plays || 1), 0);
  const top = Math.max(y + 90, 470);
  c.fillStyle = GOLD;
  c.font = `200px ${SERIF}`;
  const big = String(plays);
  c.fillText(big, 72, top + 160);
  const bw = c.measureText(big).width;
  c.fillStyle = INK;
  c.font = `600 44px ${SANS}`;
  c.fillText(plays === 1 ? 'play' : 'plays', 100 + bw, top + 90);
  c.fillStyle = '#44564C';
  c.font = `400 34px ${SANS}`;
  c.fillText(`with ${done.length} ${done.length === 1 ? 'promoter' : 'promoters'}, proof for every one`, 100 + bw, top + 140);
  // channel chips
  const counts: Record<string, number> = {};
  for (const i of done) counts[i.category] = (counts[i.category] || 0) + 1;
  let x = 80;
  let cy2 = top + 230;
  c.font = `600 28px ${SANS}`;
  for (const [k, n] of Object.entries(counts)) {
    const label = `${n} ${CH[k] || 'Other'}`;
    const w = c.measureText(label).width + 44;
    if (x + w > W - 80) {
      x = 80;
      cy2 += 60;
    }
    c.fillStyle = RING[k] || '#E2D3B4';
    c.beginPath();
    c.roundRect(x, cy2 - 34, w, 48, 24);
    c.fill();
    c.fillStyle = INK;
    c.fillText(label, x + 22, cy2);
    x += w + 12;
  }
  // list of promoters
  let ly = cy2 + 80;
  const rows = done.slice(0, 6);
  let shown = 0;
  for (const i of rows) {
    const room = H - 160 - (ly + 40); // space left above the footer
    if (room < (done.length - shown > 1 ? 40 : 0)) break;
    c.fillStyle = RING[i.category] || '#E2D3B4';
    c.beginPath();
    c.arc(100, ly - 12, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = GREEN;
    c.font = `700 26px ${SANS}`;
    c.fillText('✓', 90, ly - 2);
    c.fillStyle = INK;
    c.font = `600 34px ${SANS}`;
    c.fillText(i.name.length > 28 ? i.name.slice(0, 27) + '…' : i.name, 136, ly);
    c.fillStyle = '#44564C';
    c.font = `400 28px ${SANS}`;
    const meta = [CH[i.category] || 'Promoter', i.location, i.plays > 1 ? `${i.plays} plays` : ''].filter(Boolean).join(' · ');
    c.fillText(meta, 136, ly + 36);
    ly += 80;
    shown++;
  }
  if (done.length > shown) {
    c.fillStyle = '#44564C';
    c.font = `600 28px ${SANS}`;
    c.fillText(`+ ${done.length - shown} more`, 136, ly - 2);
  }
  // footer
  c.fillStyle = GREEN;
  c.fillRect(0, H - 150, W, 150);
  c.fillStyle = GOLD;
  c.fillRect(0, H - 150, W, 6);
  c.fillStyle = '#FFFBF4';
  c.font = `44px ${SERIF}`;
  c.fillText('Nobody gets paid until it’s done.', 80, H - 70);
  c.fillStyle = '#F3D98B';
  c.font = `600 26px ${SANS}`;
  const h = host || 'Tracka';
  c.fillText(h, W - 80 - c.measureText(h).width, H - 70);
  return cv;
}

export default function ResultCard({ title, artist, items }: { title: string; artist: string; items: CardItem[] }) {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const done = items.filter((i) => i.done);
  if (!done.length) return null;
  const name = `tracka-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'result'}.png`;
  async function make() {
    setBusy(true);
    setMsg('');
    try {
      const cv = await drawResultCard(title, artist, items, window.location.host);
      const blob: Blob | null = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Could not make the picture');
      if (url) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(blob));
      setFile(new File([blob], name, { type: 'image/png' }));
    } catch (e: any) {
      setMsg(e.message || 'Something went wrong');
    }
    setBusy(false);
  }
  async function share() {
    if (!file) return;
    const text = `My song “${title}” played with ${done.length} ${done.length === 1 ? 'promoter' : 'promoters'} on Tracka 🎶`;
    try {
      if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], text });
    } catch {
      return;
    }
    setMsg('Sharing is not available here. Download the picture and post it.');
  }
  return (
    <section className="rcard" aria-label="Your result card">
      <h2 className="st">Show the world 🎉</h2>
      <p className="hint" style={{ margin: 0 }}>
        Make a picture of your results for Instagram, WhatsApp status or TikTok.
      </p>
      {url && <img className="rprev" src={url} alt={`Result card for ${title}`} width={1080} height={1350} />}
      <div className="row" style={{ marginTop: 12 }}>
        {!url ? (
          <button type="button" className="btn btn-yellow" onClick={make} disabled={busy}>
            <Icon name="star" size={18} /> {busy ? 'Drawing…' : 'Make my result card'}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-yellow" onClick={share}>
              <Icon name="arrow" size={18} /> Share
            </button>
            <a className="btn btn-ghost" href={url} download={name}>
              <Icon name="upload" size={18} /> Download
            </a>
            <button type="button" className="linkbtn" onClick={make}>
              Redraw
            </button>
          </>
        )}
      </div>
      {msg && (
        <p className="hint" role="status">
          {msg}
        </p>
      )}
    </section>
  );
}
