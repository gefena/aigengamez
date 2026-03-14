"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "@/app/games/[id]/page.module.css";

export default function AICanvasGame({ title }: { title: string }) {
  const [color, setColor] = useState<string>("#ff3366");
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isSymmetryMode, setIsSymmetryMode] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInitialized = useRef<boolean>(false);

  // Effect 1: Initialize canvas ONCE on mount (setting dimensions wipes the canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isInitialized.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isInitialized.current = true;
  }, []);

  // Effect 2: Re-attach event listeners whenever color/brushSize/symmetry change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      const r = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const scaleX = canvas.width / r.width;
      const scaleY = canvas.height / r.height;
      const x = (clientX - r.left) * scaleX;
      const y = (clientY - r.top) * scaleY;

      ctx.strokeStyle = color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = brushSize;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      if (isSymmetryMode) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const points = [
          { x: centerX + (centerX - x), y },
          { x, y: centerY + (centerY - y) },
          { x: centerX + (centerX - x), y: centerY + (centerY - y) }
        ];
        const lastPoints = [
          { x: centerX + (centerX - lastX), y: lastY },
          { x: lastX, y: centerY + (centerY - lastY) },
          { x: centerX + (centerX - lastX), y: centerY + (centerY - lastY) }
        ];
        points.forEach((p, i) => {
          ctx.beginPath();
          ctx.moveTo(lastPoints[i].x, lastPoints[i].y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });
      }

      lastX = x;
      lastY = y;
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      const r = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const scaleX = canvas.width / r.width;
      const scaleY = canvas.height / r.height;
      lastX = (clientX - r.left) * scaleX;
      lastY = (clientY - r.top) * scaleY;
    };

    const stopDraw = () => { isDrawing = false; };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseout', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseout', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [color, brushSize, isSymmetryMode]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const colors = [
    "#ff3366", "#ff6b6b", "#ff9a9e",
    "#ff6b2b", "#ffaa33",
    "#ffcc00", "#f9f871",
    "#33ff99", "#00c896", "#4caf50",
    "#33ccff", "#2196f3", "#1565c0",
    "#9933ff", "#ce93d8", "#7c4dff",
    "#ffffff", "#aaaaaa", "#555555", "#000000",
  ];

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setIsSymmetryMode(!isSymmetryMode)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: isSymmetryMode ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ✨ AI Symmetry {isSymmetryMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginRight: '0.25rem' }}>Color</span>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c, border: color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: color === c ? '0 0 8px rgba(255,255,255,0.6)' : 'none', flexShrink: 0
              }}
            />
          ))}
          <label
            title="Custom colour"
            style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              border: '2px solid transparent', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              boxShadow: !colors.includes(color) ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
              outline: !colors.includes(color) ? '2px solid white' : 'none',
            }}
          >
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
            />
          </label>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginRight: '0.5rem' }}>Size</span>
          {[2, 5, 12, 24].map(size => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              style={{
                width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: brushSize === size ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
              }}
            >
              <div style={{ width: size > 16 ? 16 : size, height: size > 16 ? 16 : size, background: 'white', borderRadius: '50%' }} />
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <button onClick={clearCanvas} style={{ padding: '0.4rem 1rem', background: 'rgba(255,50,50,0.2)', color: '#ff6b6b', border: '1px solid rgba(255,50,50,0.5)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>
          Clear
        </button>
      </div>

      <div style={{ flex: 1, alignSelf: 'stretch', background: 'white', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'crosshair', border: '1px solid var(--border-color)' }}>
        <canvas ref={canvasRef} id="aiCanvas" style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block' }} />
      </div>
    </div>
  );
}
