"use client";

import React, { useState, useRef } from "react";
import styles from "@/app/games/[id]/page.module.css";

export const GRID = 32;

export const PIXEL_PALETTE = [
  '#000000','#ffffff','#ff3366','#ff6b6b','#ff9a9e','#ff6b2b','#ffaa33','#ffcc00',
  '#f9f871','#33ff99','#00c896','#4caf50','#33ccff','#2196f3','#1565c0',
  '#9933ff','#ce93d8','#7c4dff','#aaaaaa','#555555',
];

export default function PixelArtGame({ title }: { title: string }) {
  const [pixels, setPixels] = useState<string[]>(() => Array(GRID * GRID).fill('#ffffff'));
  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const isPainting = useRef<boolean>(false);

  const paint = (idx: number) => {
    setPixels(prev => {
      const next = [...prev];
      next[idx] = isEraser ? '#ffffff' : activeColor;
      return next;
    });
  };

  const downloadImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = GRID;
    canvas.height = GRID;
    const ctx = canvas.getContext('2d')!;
    pixels.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i % GRID, Math.floor(i / GRID), 1, 1);
    });
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const cellSize = `${100 / GRID}%`;

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.75rem', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setIsEraser(!isEraser)}
            style={{ padding: '0.35rem 0.9rem', borderRadius: 'var(--radius-full)', border: 'none', background: isEraser ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >🧹 {isEraser ? 'Eraser ON' : 'Eraser'}</button>
          <button onClick={() => setPixels(Array(GRID * GRID).fill('#ffffff'))}
            style={{ padding: '0.35rem 0.9rem', background: 'rgba(255,50,50,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,50,50,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Clear</button>
          <button onClick={downloadImage}
            style={{ padding: '0.35rem 0.9rem', background: 'rgba(30,200,100,0.15)', color: '#33ff99', border: '1px solid rgba(30,200,100,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>↓ Save</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center' }}>
        {PIXEL_PALETTE.map(c => (
          <button key={c} onClick={() => { setActiveColor(c); setIsEraser(false); }}
            style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: (!isEraser && activeColor === c) ? '3px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: (!isEraser && activeColor === c) ? '0 0 8px rgba(255,255,255,0.6)' : 'none', flexShrink: 0 }}
          />
        ))}
        <label title="Custom" style={{ width: 26, height: 26, borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', border: '2px solid transparent', cursor: 'pointer', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="color" value={activeColor} onChange={e => { setActiveColor(e.target.value); setIsEraser(false); }} style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
        </label>
      </div>

      <div
        style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${GRID}, ${cellSize})`, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
        onMouseLeave={() => { isPainting.current = false; }}
      >
        {pixels.map((c, i) => (
          <div
            key={i}
            style={{ backgroundColor: c, aspectRatio: '1', borderRight: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'crosshair' }}
            onMouseDown={() => { isPainting.current = true; paint(i); }}
            onMouseUp={() => { isPainting.current = false; }}
            onMouseEnter={() => { if (isPainting.current) paint(i); }}
            onTouchStart={(e) => { e.preventDefault(); isPainting.current = true; paint(i); }}
            onTouchEnd={() => { isPainting.current = false; }}
          />
        ))}
      </div>
    </div>
  );
}
