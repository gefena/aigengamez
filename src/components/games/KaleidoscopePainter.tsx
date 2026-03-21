"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

type Mode = "kids" | "adult";
type BrushSize = "s" | "m" | "l";

const COLORS = [
  "#ff4d4d", "#ff9900", "#ffff00", "#33cc33",
  "#3399ff", "#cc66ff", "#ff69b4", "#ffffff",
  "#00ffee", "#ff6633", "#aa44ff", "#ffcc00",
];
const BRUSH_PX: Record<BrushSize, number> = { s: 3, m: 8, l: 16 };
const SEGMENT_OPTIONS = [4, 6, 8, 12];

export default function KaleidoscopePainter({ title }: { title: string }) {
  const [mode, setMode] = useState<Mode>("kids");
  const [color, setColor] = useState("#ff4d4d");
  const [brush, setBrush] = useState<BrushSize>("m");
  const [segments, setSegments] = useState(4);
  const [glow, setGlow] = useState(false);
  const [canvasSize, setCanvasSize] = useState(360);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Mutable refs so draw callbacks never go stale
  const colorRef = useRef(color);
  const brushRef = useRef(BRUSH_PX[brush]);
  const segRef = useRef(segments);
  const glowRef = useRef(glow);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushRef.current = BRUSH_PX[brush]; }, [brush]);
  useEffect(() => { segRef.current = segments; }, [segments]);
  useEffect(() => { glowRef.current = glow; }, [glow]);

  // Reset to defaults when mode changes
  useEffect(() => {
    setSegments(mode === "kids" ? 4 : 8);
    setGlow(false);
  }, [mode]);

  // Responsive canvas size
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const h = window.innerHeight * 0.56;
      setCanvasSize(Math.floor(Math.min(w - 8, h, 520)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const drawGuides = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 1;
    const n = segRef.current;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#08081a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGuides();
  }, [drawGuides]);

  // Re-init when size or symmetry changes
  useEffect(() => { clearCanvas(); }, [canvasSize, segments, clearCanvas]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawMirrored = useCallback((
    ctx: CanvasRenderingContext2D,
    x0: number, y0: number,
    x1: number, y1: number,
  ) => {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;
    const dx0 = x0 - cx, dy0 = y0 - cy;
    const dx1 = x1 - cx, dy1 = y1 - cy;
    const n = segRef.current;

    ctx.globalCompositeOperation = glowRef.current ? "lighter" : "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushRef.current;
    ctx.strokeStyle = colorRef.current;

    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n;
      const cos = Math.cos(a), sin = Math.sin(a);

      // Normal rotation
      ctx.beginPath();
      ctx.moveTo(cx + dx0 * cos - dy0 * sin, cy + dx0 * sin + dy0 * cos);
      ctx.lineTo(cx + dx1 * cos - dy1 * sin, cy + dx1 * sin + dy1 * cos);
      ctx.stroke();

      // Mirror (flip x before rotating)
      ctx.beginPath();
      ctx.moveTo(cx + (-dx0) * cos - dy0 * sin, cy + (-dx0) * sin + dy0 * cos);
      ctx.lineTo(cx + (-dx1) * cos - dy1 * sin, cy + (-dx1) * sin + dy1 * cos);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    lastPos.current = getPos(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    drawMirrored(ctx, lastPos.current.x, lastPos.current.y, pos.x, pos.y);
    lastPos.current = pos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMirrored]);

  const onPointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "kaleidoscope.png";
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  return (
    <div ref={containerRef} className={styles.gameInner}>
      <h2 className={styles.gameTitle}>{title}</h2>

      {/* Mode */}
      <div className={styles.difficultySelector}>
        <button className={`${styles.diffBtn} ${mode === "kids" ? styles.activeDiff : ""}`} onClick={() => setMode("kids")}>Kids</button>
        <button className={`${styles.diffBtn} ${mode === "adult" ? styles.activeDiff : ""}`} onClick={() => setMode("adult")}>Adult</button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          style={{ width: canvasSize, height: canvasSize, borderRadius: 14, cursor: "crosshair", touchAction: "none", display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      {/* Color palette */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: "6px 4px 2px" }}>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 26, height: 26, borderRadius: "50%", background: c, padding: 0,
              border: color === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.18)",
              cursor: "pointer", flexShrink: 0,
            }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.18)", cursor: "pointer", padding: 0, background: "none", flexShrink: 0 }}
          title="Custom color"
        />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "center", padding: "6px 4px 8px" }}>
        {(["s", "m", "l"] as BrushSize[]).map(sz => (
          <button key={sz} className={`${styles.diffBtn} ${brush === sz ? styles.activeDiff : ""}`} onClick={() => setBrush(sz)} style={{ minWidth: 34 }}>
            {sz.toUpperCase()}
          </button>
        ))}

        {mode === "adult" && SEGMENT_OPTIONS.map(n => (
          <button key={n} className={`${styles.diffBtn} ${segments === n ? styles.activeDiff : ""}`} onClick={() => setSegments(n)} style={{ minWidth: 34 }}>
            {n}✦
          </button>
        ))}

        {mode === "adult" && (
          <button className={`${styles.diffBtn} ${glow ? styles.activeDiff : ""}`} onClick={() => setGlow(g => !g)}>
            ✨ Glow
          </button>
        )}

        <button className={styles.resetBtn} onClick={clearCanvas}>Clear</button>
        <button className={styles.diffBtn} onClick={handleSave}>💾</button>
      </div>
    </div>
  );
}
