"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "won";
type Dir = "up" | "down" | "left" | "right";

// ─── Maze ────────────────────────────────────────────────────────────────────
// 19×19 — 0 = path, 1 = wall. Entrance (1,1), Exit (17,17).
const MAZE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
  [1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,1], // 1  entrance (1,1), dead-end right
  [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1], // 2
  [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1], // 3
  [1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,0,1,0,1], // 4  hook left col3-9
  [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1], // 5
  [1,1,1,0,1,0,1,1,1,1,1,0,0,0,0,0,1,1,1], // 6  path rises col11→col15
  [1,1,1,0,0,0,1,0,0,1,1,0,1,1,1,0,1,1,1], // 7  dead-end arm col7-8
  [1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1], // 8
  [1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1], // 9  major crossing + branch left
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1], // 10
  [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1], // 11 hook left col9-15
  [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1], // 12
  [1,1,1,1,1,1,1,1,1,0,0,0,1,0,0,1,1,1,1], // 13 dead-end arm col13-14
  [1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1], // 14
  [1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1], // 15 right leg col11-15
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1], // 16
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1], // 17 exit (17,17)
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 18
];
const ROWS = 19;
const COLS = 19;
const EXIT_R = 17;
const EXIT_C = 17;
const ANIM_FRAMES = 8;

// ─── Colours ─────────────────────────────────────────────────────────────────
const PATH_DARK    = "#2a0d0d";
const PATH_VISITED = "#3d1616";
const PATH_CURRENT = "#4a2020";
const WALL_BASE    = "#c45a6a";
const WALL_HI      = "#e87a8a";
const WALL_SH      = "#8b2535";
const BG_OUTER     = "#1a0808";
const SPARKLE_CLR  = "#ffd700";
const PULSE_PERIOD = 3000; // ms

// ─── Helpers ─────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOut(t: number) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
function computePulse() {
  return 0.92 + 0.16 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (Date.now() % PULSE_PERIOD) / PULSE_PERIOD));
}

// ─── Drawing ─────────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawWallCell(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, pulse: number) {
  const r = Math.max(2, sz * 0.28);
  const inset = 1;
  // Shadow
  ctx.fillStyle = WALL_SH;
  roundRect(ctx, x + inset + 2, y + inset + 2, sz - inset * 2, sz - inset * 2, r);
  ctx.fill();
  // Base (pulsed)
  const br = pulse;
  const base = adjustBrightness(WALL_BASE, br);
  ctx.fillStyle = base;
  roundRect(ctx, x + inset, y + inset, sz - inset * 2, sz - inset * 2, r);
  ctx.fill();
  // Highlight — top & left edges only
  ctx.save();
  ctx.strokeStyle = adjustBrightness(WALL_HI, br);
  ctx.lineWidth = Math.max(1, sz * 0.06);
  ctx.beginPath();
  // top edge
  ctx.moveTo(x + inset + r, y + inset + ctx.lineWidth / 2);
  ctx.lineTo(x + sz - inset - r, y + inset + ctx.lineWidth / 2);
  // left edge
  ctx.moveTo(x + inset + ctx.lineWidth / 2, y + inset + r);
  ctx.lineTo(x + inset + ctx.lineWidth / 2, y + sz - inset - r);
  ctx.stroke();
  ctx.restore();
}

function adjustBrightness(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((n >>  8) & 0xff) * factor));
  const b = Math.min(255, Math.round(( n        & 0xff) * factor));
  return `rgb(${r},${g},${b})`;
}

function drawFloorCell(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, visited: boolean, current: boolean) {
  ctx.fillStyle = current ? PATH_CURRENT : visited ? PATH_VISITED : PATH_DARK;
  ctx.fillRect(x, y, sz, sz);
}

function drawPlayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, frame: number) {
  const bob = Math.sin(frame * 0.12) * sz * 0.06;
  const fontSize = Math.round(sz * 0.72);
  ctx.save();
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // subtle glow
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(255,180,100,0.7)";
  ctx.fillText("💩", cx, cy + bob);
  ctx.restore();
}

function drawGoal(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, frame: number) {
  const fontSize = Math.round(sz * 0.78);
  ctx.save();
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffd700";
  ctx.fillText("🚽", cx, cy);
  ctx.restore();

  // Orbiting sparkles
  const count = 6;
  const orbitR = sz * 0.72;
  ctx.save();
  ctx.fillStyle = SPARKLE_CLR;
  ctx.font = `${Math.round(sz * 0.18)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + frame * 0.045;
    const sx = cx + Math.cos(angle) * orbitR;
    const sy = cy + Math.sin(angle) * orbitR;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(angle + frame * 0.1);
    ctx.fillText("✦", sx, sy);
  }
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, W: number, elapsed: number) {
  const secs = elapsed;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const timeStr = `${m}:${String(s).padStart(2, "0")}`;
  ctx.save();
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "rgba(255,180,180,0.85)";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(`⏱ ${timeStr}`, W - 10, 8);
  ctx.restore();
}

function drawStartOverlay(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  ctx.fillStyle = "rgba(20,4,4,0.88)";
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;

  ctx.font = `bold ${Math.round(Math.min(W, H) * 0.055)}px monospace`;
  ctx.fillStyle = "#e87a8a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#c45a6a";
  ctx.fillText("INTESTINE ESCAPE", cx, cy - Math.min(W, H) * 0.22);

  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(Math.min(W, H) * 0.13)}px serif`;
  ctx.fillText("💩", cx, cy - Math.min(W, H) * 0.08);

  ctx.font = `${Math.round(Math.min(W, H) * 0.038)}px sans-serif`;
  ctx.fillStyle = "rgba(255,200,200,0.7)";
  ctx.fillText("Find the toilet 🚽 before it's too late!", cx, cy + Math.min(W, H) * 0.07);
  ctx.fillText("WASD / Arrows / Swipe / D-pad", cx, cy + Math.min(W, H) * 0.14);

  // Start button
  const bw = Math.min(W * 0.5, 200), bh = 42;
  const bx = cx - bw / 2, by = cy + Math.min(W, H) * 0.22;
  const br = 21;
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#c45a6a";
  ctx.fillStyle = "#c45a6a";
  roundRect(ctx, bx, by, bw, bh, br);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.round(Math.min(W, H) * 0.042)}px monospace`;
  ctx.fillStyle = "#fff";
  ctx.fillText("TAP TO START", cx, by + bh / 2);

  ctx.restore();
}

function drawWonOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, elapsed: number) {
  ctx.save();
  ctx.fillStyle = "rgba(10,2,2,0.92)";
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const s = Math.min(W, H);

  ctx.font = `${Math.round(s * 0.13)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#ffd700";
  ctx.fillText("🚽💨", cx, cy - s * 0.2);

  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.round(s * 0.065)}px monospace`;
  ctx.fillStyle = "#ffeecc";
  ctx.fillText("FREEDOM!", cx, cy - s * 0.05);

  const m = Math.floor(elapsed / 60), sec = elapsed % 60;
  ctx.font = `${Math.round(s * 0.038)}px monospace`;
  ctx.fillStyle = "rgba(255,200,180,0.7)";
  ctx.fillText(`Escaped in ${m}:${String(sec).padStart(2, "0")} 🎉`, cx, cy + s * 0.07);

  // Play again button
  const bw = Math.min(W * 0.5, 200), bh = 42;
  const bx = cx - bw / 2, by = cy + s * 0.18;
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#c45a6a";
  ctx.fillStyle = "#c45a6a";
  roundRect(ctx, bx, by, bw, bh, 21);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.round(s * 0.042)}px monospace`;
  ctx.fillStyle = "#fff";
  ctx.fillText("PLAY AGAIN", cx, by + bh / 2);

  ctx.restore();
}

// ─── D-Pad ────────────────────────────────────────────────────────────────────
function DPad({ onMove }: { onMove: (dir: Dir) => void }) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRepeat = (dir: Dir) => {
    onMove(dir);
    intervalRef.current = setInterval(() => onMove(dir), 160);
  };
  const stopRepeat = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const btn = (dir: Dir, label: string) => (
    <button
      key={dir}
      onPointerDown={e => { e.preventDefault(); startRepeat(dir); }}
      onPointerUp={stopRepeat}
      onPointerLeave={stopRepeat}
      style={{
        width: 50, height: 50,
        background: "rgba(196,90,106,0.22)",
        border: "2px solid rgba(196,90,106,0.55)",
        borderRadius: 10,
        color: "#ffcccc",
        fontSize: 22,
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none" as React.CSSProperties["WebkitUserSelect"],
        touchAction: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >{label}</button>
  );

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "50px 50px 50px",
      gridTemplateRows: "50px 50px",
      gap: 6,
      justifyContent: "center",
      padding: "8px 0 10px",
      flexShrink: 0,
    }}>
      <div />{btn("up", "↑")}<div />
      {btn("left", "←")}{btn("down", "↓")}{btn("right", "→")}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MazeGame({ title }: { title: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef      = useRef({ W: 480, H: 480 });
  const animRef      = useRef(0);
  const dirtyRef     = useRef(true);
  const frameRef     = useRef(0);

  const phaseRef     = useRef<Phase>("idle");
  const playerRef    = useRef({ r: 1, c: 1 });
  const animStateRef = useRef({ active: false, fromR: 1, fromC: 1, toR: 1, toC: 1, t: 0 });
  const pendingRef   = useRef<Dir | null>(null);
  const visitedRef   = useRef<Set<string>>(new Set(["1,1"]));
  const startTimeRef = useRef(0);
  const elapsedRef   = useRef(0);

  const [phase,   setPhase]   = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);

  // ── tryMove ────────────────────────────────────────────────────────────────
  const tryMove = useCallback((dir: Dir) => {
    if (phaseRef.current !== "playing") return;
    const as = animStateRef.current;
    if (as.active) { pendingRef.current = dir; return; }
    const { r, c } = playerRef.current;
    const deltas: Record<Dir, [number, number]> = {
      up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
    };
    const [dr, dc] = deltas[dir];
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || MAZE[nr][nc] === 1) return;
    animStateRef.current = { active: true, fromR: r, fromC: c, toR: nr, toC: nc, t: 0 };
    dirtyRef.current = true;
  }, []);

  // ── startGame ──────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    playerRef.current    = { r: 1, c: 1 };
    animStateRef.current = { active: false, fromR: 1, fromC: 1, toR: 1, toC: 1, t: 0 };
    pendingRef.current   = null;
    visitedRef.current   = new Set(["1,1"]);
    elapsedRef.current   = 0;
    startTimeRef.current = Date.now();
    phaseRef.current     = "playing";
    dirtyRef.current     = true;
    setElapsed(0);
    setPhase("playing");
  }, []);

  // ── ResizeObserver ─────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (!width || !height) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = Math.round(width);
      canvas.height = Math.round(height);
      sizeRef.current = { W: canvas.width, H: canvas.height };
      dirtyRef.current = true;
    });
    ro.observe(container);
    const rect = container.getBoundingClientRect();
    const canvas = canvasRef.current!;
    canvas.width  = rect.width  || 480;
    canvas.height = rect.height || 480;
    sizeRef.current = { W: canvas.width, H: canvas.height };
    return () => ro.disconnect();
  }, []);

  // ── RAF loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      frameRef.current++;

      // Tick player animation
      const as = animStateRef.current;
      if (as.active) {
        as.t = Math.min(1, as.t + 1 / ANIM_FRAMES);
        if (as.t >= 1) {
          as.active = false;
          playerRef.current = { r: as.toR, c: as.toC };
          visitedRef.current.add(`${as.toR},${as.toC}`);
          // Win check
          if (as.toR === EXIT_R && as.toC === EXIT_C && phaseRef.current === "playing") {
            phaseRef.current = "won";
            elapsedRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setElapsed(elapsedRef.current);
            setPhase("won");
          }
          // Flush buffered input
          if (pendingRef.current && phaseRef.current === "playing") {
            const dir = pendingRef.current;
            pendingRef.current = null;
            // Inline move to avoid stale closure
            const { r, c } = playerRef.current;
            const deltas: Record<Dir, [number, number]> = {
              up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
            };
            const [dr, dc] = deltas[dir];
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && MAZE[nr][nc] === 0) {
              animStateRef.current = { active: true, fromR: r, fromC: c, toR: nr, toC: nc, t: 0 };
            }
          }
        }
        dirtyRef.current = true;
      }

      // Peristalsis always needs redraws while playing
      if (phaseRef.current === "playing") dirtyRef.current = true;

      if (!dirtyRef.current) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }
      dirtyRef.current = false;

      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx)   { animRef.current = requestAnimationFrame(loop); return; }

      const { W, H } = sizeRef.current;
      const tileSize = Math.max(4, Math.floor(Math.min(W, H) / Math.max(ROWS, COLS)));
      const mazeW = tileSize * COLS;
      const mazeH = tileSize * ROWS;
      const pulse = computePulse();

      // Player interpolated pixel position (in maze-local coords)
      const eased = easeInOut(as.t);
      const pxCol = as.active ? lerp(as.fromC, as.toC, eased) : playerRef.current.c;
      const pxRow = as.active ? lerp(as.fromR, as.toR, eased) : playerRef.current.r;
      const playerPixX = pxCol * tileSize + tileSize / 2;
      const playerPixY = pxRow * tileSize + tileSize / 2;

      // Camera: center on player, clamp so we never show outside the maze
      let camX: number, camY: number;
      if (mazeW <= W) {
        camX = Math.floor((W - mazeW) / 2);
      } else {
        camX = Math.round(W / 2 - playerPixX);
        camX = Math.min(0, Math.max(W - mazeW, camX));
      }
      if (mazeH <= H) {
        camY = Math.floor((H - mazeH) / 2);
      } else {
        camY = Math.round(H / 2 - playerPixY);
        camY = Math.min(0, Math.max(H - mazeH, camY));
      }

      // Background
      ctx.fillStyle = BG_OUTER;
      ctx.fillRect(0, 0, W, H);

      // Draw maze
      ctx.save();
      ctx.translate(camX, camY);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * tileSize;
          const y = r * tileSize;
          if (MAZE[r][c] === 1) {
            drawWallCell(ctx, x, y, tileSize, pulse);
          } else {
            const visited = visitedRef.current.has(`${r},${c}`);
            const current = !as.active && playerRef.current.r === r && playerRef.current.c === c;
            drawFloorCell(ctx, x, y, tileSize, visited, current);
          }
        }
      }

      // Goal
      const goalPX = EXIT_C * tileSize + tileSize / 2;
      const goalPY = EXIT_R * tileSize + tileSize / 2;
      drawGoal(ctx, goalPX, goalPY, tileSize, frameRef.current);

      // Player
      const drawPX = pxCol * tileSize + tileSize / 2;
      const drawPY = pxRow * tileSize + tileSize / 2;
      drawPlayer(ctx, drawPX, drawPY, tileSize, frameRef.current);

      ctx.restore();

      // HUD (screen space)
      if (phaseRef.current === "playing") {
        const live = Math.floor((Date.now() - startTimeRef.current) / 1000);
        drawHUD(ctx, W, live);
      }

      // Overlays
      if (phaseRef.current === "idle") drawStartOverlay(ctx, W, H);
      if (phaseRef.current === "won")  drawWonOverlay(ctx, W, H, elapsedRef.current);

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
        W: "up", S: "down", A: "left", D: "right",
      };
      const dir = map[e.key];
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
      if (phaseRef.current !== "playing") { startGame(); return; }
      if (dir) tryMove(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryMove, startGame]);

  // ── Touch / click ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sx = 0, sy = 0;
    const onTouchStart = (e: TouchEvent) => {
      sx = e.changedTouches[0].clientX;
      sy = e.changedTouches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        if (phaseRef.current !== "playing") { startGame(); return; }
        return;
      }
      if (phaseRef.current !== "playing") { startGame(); return; }
      if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? "right" : "left");
      else tryMove(dy > 0 ? "down" : "up");
    };
    const onClick = () => {
      if (phaseRef.current !== "playing") startGame();
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: true });
    canvas.addEventListener("click",      onClick);
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend",   onTouchEnd);
      canvas.removeEventListener("click",      onClick);
    };
  }, [tryMove, startGame]);

  return (
    <div
      className={styles.gameInner}
      style={{ padding: 0, gap: 0, display: "flex", flexDirection: "column", height: "100%", width: "100%", boxSizing: "border-box" }}
    >
      {/* Minimal HUD strip */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.4rem 0.8rem", flexShrink: 0,
      }}>
        <span style={{ color: "#e87a8a", fontWeight: 700, fontSize: "0.85rem", fontFamily: "monospace" }}>
          💩 {title}
        </span>
        {phase === "playing" && (
          <span style={{ color: "#ffcccc", fontFamily: "monospace", fontSize: "0.85rem" }}>
            ⏱ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: "relative", overflow: "hidden", cursor: "default" }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        />
      </div>

      {/* D-pad — only on touch/mobile */}
      {phase === "playing" && <DPad onMove={tryMove} />}
    </div>
  );
}
