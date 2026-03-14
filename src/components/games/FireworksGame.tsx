"use client";

import React, { useEffect, useRef } from "react";
import styles from "@/app/games/[id]/page.module.css";

type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; color: string; radius: number; };

export default function FireworksGame({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = rect.height || 400;
    const ctx = canvas.getContext('2d')!;

    const FIREWORK_COLORS = [
      '#ff3366','#ff6b2b','#ffcc00','#33ff99','#33ccff','#9933ff','#ff9a9e','#f9f871','#ce93d8'
    ];

    const spawnBurst = (x: number, y: number) => {
      const count = 60 + Math.floor(Math.random() * 40);
      const baseColor = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 5;
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: Math.random() < 0.2 ? FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)] : baseColor,
          radius: 2 + Math.random() * 3,
        });
      }
    };

    const getCoords = (e: MouseEvent | TouchEvent, r: DOMRect) => {
      const scaleX = canvas.width / r.width;
      const scaleY = canvas.height / r.height;
      if ('touches' in e) {
        return { x: (e.touches[0].clientX - r.left) * scaleX, y: (e.touches[0].clientY - r.top) * scaleY };
      }
      return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
    };

    const loop = () => {
      ctx.fillStyle = 'rgba(10,10,20,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0.02);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07;
        p.vx *= 0.98;
        p.alpha -= 0.018;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(loop);
    };

    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    animRef.current = requestAnimationFrame(loop);

    const handleDown = (e: MouseEvent | TouchEvent) => {
      isDragging.current = true;
      const r = canvas.getBoundingClientRect();
      const { x, y } = getCoords(e, r);
      spawnBurst(x, y);
    };
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      if (Math.random() < 0.3) {
        const r = canvas.getBoundingClientRect();
        const { x, y } = getCoords(e, r);
        spawnBurst(x, y);
      }
    };
    const handleUp = () => { isDragging.current = false; };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('touchstart', handleDown, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleUp);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('touchstart', handleDown);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleUp);
    };
  }, []);

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.75rem', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click or drag to launch 🎆</span>
      </div>
      <div style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair', touchAction: 'none' }} />
      </div>
    </div>
  );
}
