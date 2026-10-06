'use client';
import { useEffect, useRef, useState } from 'react';

// Plays the Tracka theme only when pressed. The circle and bubbles jump on every kick drum.
export default function MusicButton() {
  const [on, setOn] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const raf = useRef(0);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    audio.current?.pause();
    document.body.classList.remove('music-on');
    document.documentElement.style.setProperty('--beat', '0');
  }, []);

  function pulse() {
    const an = analyser.current;
    if (!an || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const data = new Uint8Array(an.frequencyBinCount);
    let avg = 0;
    let peak = 0.05;
    const loop = () => {
      an.getByteFrequencyData(data);
      const e = (data[1] + data[2] + data[3] + data[4]) / 4 / 255;
      avg = avg ? avg * 0.9 + e * 0.1 : e;
      peak = Math.max(peak * 0.995, e, 0.05);
      const v = Math.min(1, Math.max(0, ((e - avg) / Math.max(0.03, peak - avg)) * 1.8));
      document.documentElement.style.setProperty('--beat', v.toFixed(3));
      raf.current = requestAnimationFrame(loop);
    };
    loop();
  }

  async function toggle() {
    if (on) {
      audio.current?.pause();
      cancelAnimationFrame(raf.current);
      document.documentElement.style.setProperty('--beat', '0');
      document.body.classList.remove('music-on');
      setOn(false);
      return;
    }
    try {
      if (!audio.current) {
        audio.current = new Audio('/tracka-theme.mp3');
        audio.current.loop = true;
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) {
          ctx.current = new AC();
          const src = ctx.current.createMediaElementSource(audio.current);
          analyser.current = ctx.current.createAnalyser();
          analyser.current.fftSize = 512;
          analyser.current.smoothingTimeConstant = 0.5;
          src.connect(analyser.current);
          analyser.current.connect(ctx.current.destination);
        }
      }
      if (ctx.current?.state === 'suspended') await ctx.current.resume();
      await audio.current.play();
      document.body.classList.add('music-on');
      setOn(true);
      pulse();
    } catch {
      setOn(false);
    }
  }

  return (
    <button className="play" type="button" aria-label={on ? 'Pause music' : 'Play music'} onClick={toggle}>
      <svg className="tri" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: 4 }}>
        <path d="M7 4.5v15l13-7.5z" />
      </svg>
      <svg className="pause" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6 4h4v16H6z M14 4h4v16h-4z" />
      </svg>
    </button>
  );
}
