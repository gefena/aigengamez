"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "@/app/games/[id]/page.module.css";

export const STAMP_CATEGORIES: Record<string, string[]> = {
  Animals:  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐙','🦋','🐝'],
  Food:     ['🍕','🍔','🌮','🍣','🍩','🎂','🍦','🍓','🍉','🍋','🥝','🥑','🍟','🧁','🍪'],
  Space:    ['🚀','🌍','🌙','⭐','🌟','💫','☄️','🪐','👽','🛸','🌌','🔭','🌠','🌞','🪨'],
  Fun:      ['🎉','🎈','🎁','🎮','🎨','🎵','🏆','❤️','😂','🤩','🦄','🌈','💎','🔥','✨'],
};

export const BG_COLORS = ['#fff9f0','#f0fff4','#f0f4ff','#fff0f0','#f5f0ff','#fffde7'];

export default function StampPadGame({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [category, setCategory] = useState<string>('Animals');
  const [selectedStamp, setSelectedStamp] = useState<string>('🐶');
  const [bgColor, setBgColor] = useState<string>(BG_COLORS[0]);
  const [stampSize, setStampSize] = useState<number>(48);

  // Size canvas on mount only — bgColor effect handles the initial fill
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = rect.height || 400;
  }, []);

  // Fill background whenever bgColor changes (also runs on mount after sizing)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvas.width === 0) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 600;
      canvas.height = rect.height || 400;
    }
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [bgColor]);

  const placeStamp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    ctx.font = `${stampSize * scaleX}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(selectedStamp, x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  };

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.75rem', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {BG_COLORS.map(c => (
            <button key={c} onClick={() => setBgColor(c)} title="Background colour" style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: bgColor === c ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)', cursor: 'pointer' }} />
          ))}
          <select
            value={stampSize}
            onChange={e => setStampSize(Number(e.target.value))}
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {[32, 48, 72, 96].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
          <button onClick={clearCanvas} style={{ padding: '0.35rem 0.9rem', background: 'rgba(255,50,50,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,50,50,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Clear</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {Object.keys(STAMP_CATEGORIES).map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setSelectedStamp(STAMP_CATEGORIES[cat][0]); }}
            style={{ padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)', border: 'none', background: category === cat ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)', color: category === cat ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >{cat}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        {STAMP_CATEGORIES[category].map(emoji => (
          <button key={emoji} onClick={() => setSelectedStamp(emoji)}
            style={{ fontSize: '1.4rem', padding: '0.2rem 0.3rem', borderRadius: 'var(--radius-sm)', border: selectedStamp === emoji ? '2px solid var(--accent-primary)' : '2px solid transparent', background: selectedStamp === emoji ? 'rgba(255,255,255,0.1)' : 'transparent', cursor: 'pointer', lineHeight: 1 }}
          >{emoji}</button>
        ))}
      </div>

      <div style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <canvas
          ref={canvasRef}
          onClick={placeStamp}
          onTouchStart={placeStamp}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'cell', touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
