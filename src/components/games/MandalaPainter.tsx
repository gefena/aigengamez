"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

type Tool = "draw" | "dot" | "ring" | "diamond" | "petal";
type BrushSize = "s" | "m" | "l";

const BRUSH_PX: Record<BrushSize, number> = { s: 3, m: 8, l: 16 };
const STAMP_PX: Record<BrushSize, number> = { s: 6, m: 12, l: 20 };
const SEG_OPTIONS = [8, 12, 16];

const COLORS = [
  "#e63946","#f4a261","#e9c46a","#2a9d8f",
  "#457b9d","#7c3aed","#ec4899","#15803d",
  "#c2410c","#1e3a5f","#a16207","#1e293b",
];

const BG = "#faf7f0"; // warm cream

const TOOLS: { id: Tool; label: string }[] = [
  { id: "draw",    label: "✏️" },
  { id: "dot",     label: "●" },
  { id: "ring",    label: "○" },
  { id: "diamond", label: "◆" },
  { id: "petal",   label: "🌸" },
];

// ── Canvas drawing helpers ─────────────────────────────────────────────────
function drawShape(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  outAngle: number, // radians, direction pointing away from center
  tool: Tool, size: number, color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (tool === "dot") {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  } else if (tool === "ring") {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, size * 0.35);
    ctx.stroke();
  } else if (tool === "diamond") {
    ctx.rotate(outAngle);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.55, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.55, 0);
    ctx.closePath();
    ctx.fill();
  } else if (tool === "petal") {
    ctx.rotate(outAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.38, size, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function placeStamp(
  ctx: CanvasRenderingContext2D,
  clickX: number, clickY: number,
  segments: number, size: number, color: string, tool: Tool,
) {
  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;
  const dx = clickX - cx;
  const dy = clickY - cy;
  const dist = Math.hypot(dx, dy);

  for (let i = 0; i < segments; i++) {
    const a = (i * Math.PI * 2) / segments;
    const cos = Math.cos(a), sin = Math.sin(a);

    const rx = cx + dx * cos - dy * sin;
    const ry = cy + dx * sin + dy * cos;
    drawShape(ctx, rx, ry, Math.atan2(ry - cy, rx - cx), tool, size, color);

    if (dist > 2) {
      const mrx = cx + (-dx) * cos - dy * sin;
      const mry = cy + (-dx) * sin + dy * cos;
      drawShape(ctx, mrx, mry, Math.atan2(mry - cy, mrx - cx), tool, size, color);
    }
  }
}

function drawMirroredStroke(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  segments: number, brushPx: number, color: string,
) {
  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;
  const dx0 = x0 - cx, dy0 = y0 - cy;
  const dx1 = x1 - cx, dy1 = y1 - cy;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = brushPx;
  ctx.strokeStyle = color;

  for (let i = 0; i < segments; i++) {
    const a = (i * Math.PI * 2) / segments;
    const cos = Math.cos(a), sin = Math.sin(a);

    ctx.beginPath();
    ctx.moveTo(cx + dx0 * cos - dy0 * sin, cy + dx0 * sin + dy0 * cos);
    ctx.lineTo(cx + dx1 * cos - dy1 * sin, cy + dx1 * sin + dy1 * cos);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + (-dx0) * cos - dy0 * sin, cy + (-dx0) * sin + dy0 * cos);
    ctx.lineTo(cx + (-dx1) * cos - dy1 * sin, cy + (-dx1) * sin + dy1 * cos);
    ctx.stroke();
  }
}

function drawGuides(ctx: CanvasRenderingContext2D, segments: number) {
  const cx = ctx.canvas.width / 2;
  const cy = ctx.canvas.height / 2;
  const r = Math.min(cx, cy) - 4;

  ctx.save();
  ctx.strokeStyle = "rgba(120,100,80,0.12)";
  ctx.lineWidth = 1;

  // Concentric rings at 25%, 50%, 75%, 100%
  [0.25, 0.5, 0.75, 1].forEach(frac => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Radial lines
  for (let i = 0; i < segments; i++) {
    const a = (i * Math.PI * 2) / segments;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }

  // Center dot
  ctx.fillStyle = "rgba(120,100,80,0.2)";
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Component ──────────────────────────────────────────────────────────────
export default function MandalaPainter({ title }: { title: string }) {
  const [tool, setTool] = useState<Tool>("draw");
  const [brush, setBrush] = useState<BrushSize>("m");
  const [color, setColor] = useState("#7c3aed");
  const [segments, setSegments] = useState(12);
  const [showGuides, setShowGuides] = useState(true);
  const [canvasSize, setCanvasSize] = useState(360);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const toolRef = useRef(tool);
  const brushRef = useRef(BRUSH_PX[brush]);
  const stampRef = useRef(STAMP_PX[brush]);
  const colorRef = useRef(color);
  const segRef = useRef(segments);
  const guidesRef = useRef(showGuides);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { brushRef.current = BRUSH_PX[brush]; stampRef.current = STAMP_PX[brush]; }, [brush]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { segRef.current = segments; }, [segments]);
  useEffect(() => { guidesRef.current = showGuides; }, [showGuides]);

  // Responsive size
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth - 8;
      const h = window.innerHeight * 0.46;
      setCanvasSize(Math.floor(Math.min(w, h, 500)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (guidesRef.current) drawGuides(ctx, segRef.current);
  }, []);

  // Redraw guides overlay whenever segments or showGuides changes
  useEffect(() => { clearCanvas(); }, [canvasSize, segments, showGuides, clearCanvas]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    if (toolRef.current === "draw") {
      isDrawing.current = true;
      lastPos.current = pos;
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      placeStamp(ctx, pos.x, pos.y, segRef.current, stampRef.current, colorRef.current, toolRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (toolRef.current !== "draw" || !isDrawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    drawMirroredStroke(ctx, lastPos.current.x, lastPos.current.y, pos.x, pos.y, segRef.current, brushRef.current, colorRef.current);
    lastPos.current = pos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "mandala.png";
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  return (
    <div ref={containerRef} className={styles.gameInner}>
      <h2 className={styles.gameTitle}>{title}</h2>

      {/* Tools */}
      <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap", padding: "2px 0 4px" }}>
        {TOOLS.map(t => (
          <button key={t.id} className={`${styles.diffBtn} ${tool === t.id ? styles.activeDiff : ""}`}
            onClick={() => setTool(t.id)} style={{ minWidth: 38, fontSize: "1rem" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          style={{ width: canvasSize, height: canvasSize, borderRadius: 12, cursor: tool === "draw" ? "crosshair" : "cell", touchAction: "none", display: "block", border: "1px solid rgba(120,100,80,0.15)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      {/* Colors */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", padding: "5px 4px 2px" }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} style={{
            width: 24, height: 24, borderRadius: "50%", background: c, padding: 0, flexShrink: 0,
            border: color === c ? "3px solid #1e293b" : "2px solid rgba(30,41,59,0.18)",
            cursor: "pointer",
          }} />
        ))}
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(30,41,59,0.18)", cursor: "pointer", padding: 0, background: "none", flexShrink: 0 }} />
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap", padding: "4px 4px 6px", alignItems: "center" }}>
        {(["s","m","l"] as BrushSize[]).map(sz => (
          <button key={sz} className={`${styles.diffBtn} ${brush === sz ? styles.activeDiff : ""}`}
            onClick={() => setBrush(sz)} style={{ minWidth: 34 }}>{sz.toUpperCase()}</button>
        ))}
        {SEG_OPTIONS.map(n => (
          <button key={n} className={`${styles.diffBtn} ${segments === n ? styles.activeDiff : ""}`}
            onClick={() => setSegments(n)} style={{ minWidth: 34 }}>{n}✦</button>
        ))}
        <button className={`${styles.diffBtn} ${showGuides ? styles.activeDiff : ""}`}
          onClick={() => setShowGuides(g => !g)}>Grid</button>
        <button className={styles.resetBtn} onClick={clearCanvas}>Clear</button>
        <button className={styles.diffBtn} onClick={handleSave}>💾</button>
      </div>
    </div>
  );
}
