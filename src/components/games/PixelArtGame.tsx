"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
  const [cellPx, setCellPx] = useState(12);

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isPainting = useRef(false);
  const activeColorRef = useRef(activeColor);
  const isEraserRef = useRef(isEraser);

  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);
  useEffect(() => { isEraserRef.current = isEraser; }, [isEraser]);

  // Responsive cell size: fit grid into available width and 45% viewport height
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth - 8;
      const maxByW = Math.floor(w / GRID);
      const maxByH = Math.floor((window.innerHeight * 0.45) / GRID);
      setCellPx(Math.max(4, Math.min(maxByW, maxByH, 20)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const paintCell = useCallback((idx: number) => {
    setPixels(prev => {
      const next = [...prev];
      next[idx] = isEraserRef.current ? '#ffffff' : activeColorRef.current;
      return next;
    });
  }, []);

  const getCellIndex = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cellPx);
    const row = Math.floor((e.clientY - rect.top) / cellPx);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return -1;
    return row * GRID + col;
  }, [cellPx]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isPainting.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const idx = getCellIndex(e);
    if (idx >= 0) paintCell(idx);
  }, [getCellIndex, paintCell]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPainting.current) return;
    const idx = getCellIndex(e);
    if (idx >= 0) paintCell(idx);
  }, [getCellIndex, paintCell]);

  const onPointerUp = useCallback(() => { isPainting.current = false; }, []);

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

  const gridSize = cellPx * GRID;

  return (
    <div ref={containerRef} className={styles.gameInner} style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.5rem', boxSizing: 'border-box' }}>
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

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center' }}>
        {PIXEL_PALETTE.map(c => (
          <button key={c} onClick={() => { setActiveColor(c); setIsEraser(false); }}
            style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: (!isEraser && activeColor === c) ? '3px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: (!isEraser && activeColor === c) ? '0 0 8px rgba(255,255,255,0.6)' : 'none', flexShrink: 0 }}
          />
        ))}
        <label title="Custom" style={{ width: 24, height: 24, borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', border: '2px solid transparent', cursor: 'pointer', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="color" value={activeColor} onChange={e => { setActiveColor(e.target.value); setIsEraser(false); }} style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
        </label>
      </div>

      {/* Grid — pointer events on container so drag-painting works on touch */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID}, ${cellPx}px)`,
            width: gridSize,
            height: gridSize,
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            overflow: 'hidden',
            userSelect: 'none',
            touchAction: 'none',
            cursor: 'crosshair',
            flexShrink: 0,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {pixels.map((c, i) => (
            <div
              key={i}
              style={{ width: cellPx, height: cellPx, backgroundColor: c, borderRight: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
