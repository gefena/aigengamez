"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "won";
type Dir = "up" | "down" | "left" | "right";
interface Collectible { r: number; c: number; }
interface Confetti { x: number; y: number; vx: number; vy: number; alpha: number; emoji: string; size: number; }

// ─── Level config ─────────────────────────────────────────────────────────────
const LEVEL_NAMES = ["Rumbling Gut", "Deep Intestine", "Colon Crisis"];
const ROWS = 19; const COLS = 19;
const EXIT_R = ROWS - 2; const EXIT_C = COLS - 2; // (17,17)
const ANIM_FRAMES = 8;

// ─── Maze generator ───────────────────────────────────────────────────────────
// Algorithm:
//   Phase 1 — Biased loop-erased random walk from (1,1) to (EXIT_R,EXIT_C).
//             The walk prefers directions that reduce Manhattan distance to the
//             exit (goal bias), but is otherwise random. Loops in the walk are
//             erased as they form, giving a clean non-self-intersecting path.
//   Phase 2 — Random branches sprout from existing open cells to add dead-ends
//             and make the maze "noisy". Branches prefer carving new wall cells.
//   Phase 3 — Collectibles placed on random open cells away from start/exit.
function generateMaze(
  rows: number, cols: number, difficulty: 1 | 2 | 3,
): { grid: number[][]; collectibles: Collectible[] } {

  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(1));
  const inBounds = (r: number, c: number) => r >= 1 && r <= rows-2 && c >= 1 && c <= cols-2;
  const DIRS: [number, number][] = [[0,1],[0,-1],[1,0],[-1,0]];
  const er = rows - 2, ec = cols - 2;

  // Goal bias: probability weight bonus when moving toward exit.
  // Lower bias → more winding path → harder maze.
  const goalBias = difficulty === 1 ? 0.55 : difficulty === 2 ? 0.38 : 0.22;

  // ── Phase 1: solution path ────────────────────────────────────────────────
  let solutionPath: [number, number][] = [];

  for (let attempt = 0; attempt < 30; attempt++) {
    const path: [number, number][] = [[1, 1]];
    const pathIdx = new Map<string, number>([["1,1", 0]]);
    let reached = false;

    for (let iter = 0; iter < rows * cols * 40; iter++) {
      const [r, c] = path[path.length - 1];
      if (r === er && c === ec) { reached = true; break; }

      // Weighted random direction: goal-approaching dirs get a bonus weight.
      const weights = DIRS.map(([dr, dc]) => {
        if (!inBounds(r+dr, c+dc)) return 0;
        const curDist = Math.abs(er - r)    + Math.abs(ec - c);
        const nxtDist = Math.abs(er - r-dr) + Math.abs(ec - c-dc);
        return 1 + (nxtDist < curDist ? goalBias * 4 : 0);
      });
      const total = weights.reduce((s, w) => s + w, 0);
      if (total === 0) break;

      let rand = Math.random() * total, di = 0;
      for (let i = 0; i < 4; i++) { rand -= weights[i]; if (rand <= 0) { di = i; break; } }
      const [dr, dc] = DIRS[di];
      const nr = r + dr, nc = c + dc;
      const key = `${nr},${nc}`;

      if (pathIdx.has(key)) {
        // Erase the loop back to where nr,nc first appeared
        const li = pathIdx.get(key)!;
        for (let i = li + 1; i < path.length; i++) pathIdx.delete(`${path[i][0]},${path[i][1]}`);
        path.splice(li + 1);
      } else {
        pathIdx.set(key, path.length);
        path.push([nr, nc]);
      }
    }

    if (reached) { solutionPath = path; break; }
  }

  // Fallback: if random walk never converged, carve a minimal L-path
  if (solutionPath.length === 0) {
    for (let r = 1; r <= er; r++) solutionPath.push([r, 1]);
    for (let c = 2; c <= ec; c++) solutionPath.push([er, c]);
  }

  // Carve solution path into grid
  for (const [r, c] of solutionPath) grid[r][c] = 0;

  // ── Phase 2: noise branches ───────────────────────────────────────────────
  const openCells: [number, number][] = solutionPath.slice();
  const numBranches   = difficulty === 1 ? 8  : difficulty === 2 ? 15 : 24;
  const maxBranchLen  = difficulty === 1 ? 7  : difficulty === 2 ? 12 : 18;

  for (let b = 0; b < numBranches; b++) {
    let [r, c] = openCells[Math.floor(Math.random() * openCells.length)];
    const len = 3 + Math.floor(Math.random() * (maxBranchLen - 3));

    for (let step = 0; step < len; step++) {
      // Fisher-Yates shuffle of DIRS
      const dirs: [number,number][] = [[0,1],[0,-1],[1,0],[-1,0]];
      for (let i = 3; i > 0; i--) {
        const j = Math.floor(Math.random() * (i+1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
      // Prefer carving unvisited (wall) cells so branches create real dead-ends
      const wallDirs = dirs.filter(([dr, dc]) => {
        const nr = r+dr, nc = c+dc;
        return inBounds(nr, nc) && grid[nr][nc] === 1;
      });
      const anyDirs = dirs.filter(([dr, dc]) => inBounds(r+dr, c+dc));
      const chosen = wallDirs.length > 0 ? wallDirs : anyDirs;
      if (chosen.length === 0) break;

      const [dr, dc] = chosen[0];
      r += dr; c += dc;
      grid[r][c] = 0;
      openCells.push([r, c]);
    }
  }

  // ── Phase 3: collectibles ─────────────────────────────────────────────────
  const seen = new Set<string>(["1,1", `${er},${ec}`]);
  const candidates: [number, number][] = [];
  for (const [r, c] of openCells) {
    const k = `${r},${c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (Math.abs(r-1) + Math.abs(c-1) > 3 && Math.abs(r-er) + Math.abs(c-ec) > 3) {
      candidates.push([r, c]);
    }
  }
  // Shuffle candidates
  for (let i = candidates.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const collectibles = candidates.slice(0, 5).map(([r, c]) => ({ r, c }));

  return { grid, collectibles };
}

// ─── Colours ─────────────────────────────────────────────────────────────────
const PATH_DARK    = "#2a0d0d";
const PATH_VISITED = "#3d1616";
const PATH_CURRENT = "#4a2020";
const WALL_BASE    = "#c45a6a";
const WALL_HI      = "#e87a8a";
const WALL_SH      = "#8b2535";
const BG_OUTER     = "#1a0808";
const SPARKLE_CLR  = "#ffd700";
const PULSE_PERIOD = 3000;

// ─── Audio ───────────────────────────────────────────────────────────────────
let _ac: AudioContext | null = null;
function getAC(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ac) _ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return _ac;
}
function playStep() {
  const ac = getAC(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.frequency.value = 90 + Math.random() * 30; o.type = "sine";
  g.gain.setValueAtTime(0.08, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.07);
  o.start(); o.stop(ac.currentTime + 0.07);
}
function playBump() {
  const ac = getAC(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.frequency.value = 55; o.type = "sawtooth";
  g.gain.setValueAtTime(0.18, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
  o.start(); o.stop(ac.currentTime + 0.1);
}
function playCollect() {
  const ac = getAC(); if (!ac) return;
  [523, 659, 784].forEach((freq, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.value = freq; o.type = "sine";
    const t = ac.currentTime + i * 0.07;
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t); o.stop(t + 0.1);
  });
}
function playWin() {
  const ac = getAC(); if (!ac) return;
  [261, 329, 392, 523, 659, 784].forEach((freq, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.value = freq; o.type = "sine";
    const t = ac.currentTime + i * 0.1;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t); o.stop(t + 0.18);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOut(t: number) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
function computePulse() {
  return 0.92 + 0.16 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (Date.now() % PULSE_PERIOD) / PULSE_PERIOD));
}
function adjustBrightness(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((n >>  8) & 0xff) * f));
  const b = Math.min(255, Math.round(( n        & 0xff) * f));
  return `rgb(${r},${g},${b})`;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, pulse: number) {
  const r = Math.max(2, sz * 0.28), ins = 1;
  ctx.fillStyle = WALL_SH;
  rrect(ctx, x+ins+2, y+ins+2, sz-ins*2, sz-ins*2, r); ctx.fill();
  ctx.fillStyle = adjustBrightness(WALL_BASE, pulse);
  rrect(ctx, x+ins, y+ins, sz-ins*2, sz-ins*2, r); ctx.fill();
  ctx.save();
  ctx.strokeStyle = adjustBrightness(WALL_HI, pulse);
  ctx.lineWidth = Math.max(1, sz * 0.06);
  ctx.beginPath();
  ctx.moveTo(x+ins+r, y+ins+ctx.lineWidth/2); ctx.lineTo(x+sz-ins-r, y+ins+ctx.lineWidth/2);
  ctx.moveTo(x+ins+ctx.lineWidth/2, y+ins+r); ctx.lineTo(x+ins+ctx.lineWidth/2, y+sz-ins-r);
  ctx.stroke(); ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, visited: boolean, current: boolean) {
  ctx.fillStyle = current ? PATH_CURRENT : visited ? PATH_VISITED : PATH_DARK;
  ctx.fillRect(x, y, sz, sz);
}

function drawPlayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, frame: number) {
  const bob = Math.sin(frame * 0.12) * sz * 0.06;
  ctx.save();
  ctx.font = `${Math.round(sz * 0.72)}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,180,100,0.7)";
  ctx.fillText("💩", cx, cy + bob); ctx.restore();
}

function drawGoal(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, frame: number) {
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06);
  ctx.save();
  ctx.globalAlpha = 0.22 + 0.18 * pulse;
  const grad = ctx.createRadialGradient(cx, cy, sz*0.2, cx, cy, sz*0.9);
  grad.addColorStop(0, "#ffd700"); grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad; ctx.fillRect(cx-sz, cy-sz, sz*2, sz*2);
  ctx.restore();
  ctx.save();
  ctx.font = `${Math.round(sz * 0.78)}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowBlur = 20; ctx.shadowColor = "#ffd700";
  ctx.fillText("🚽", cx, cy); ctx.restore();
  ctx.save();
  ctx.font = `${Math.round(sz * 0.18)}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = SPARKLE_CLR;
  for (let i = 0; i < 6; i++) {
    const angle = (i/6)*Math.PI*2 + frame*0.045;
    ctx.globalAlpha = 0.5 + 0.5*Math.sin(angle + frame*0.1);
    ctx.fillText("✦", cx + Math.cos(angle)*sz*0.72, cy + Math.sin(angle)*sz*0.72);
  }
  ctx.restore();
}

function drawCollectible(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, frame: number) {
  const bob = Math.sin(frame * 0.1 + cx) * sz * 0.06;
  ctx.save();
  ctx.font = `${Math.round(sz * 0.6)}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowBlur = 8; ctx.shadowColor = "#ffe0b2";
  ctx.fillText("🧻", cx, cy + bob); ctx.restore();
}

function drawStartMarker(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number) {
  ctx.save();
  ctx.font = `bold ${Math.max(7, Math.round(sz * 0.28))}px monospace`;
  ctx.fillStyle = "rgba(80,255,150,0.8)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("▶", x + sz/2, y + sz/2); ctx.restore();
}

function drawStartOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, level: number) {
  ctx.save();
  ctx.fillStyle = "rgba(20,4,4,0.9)"; ctx.fillRect(0, 0, W, H);
  const cx = W/2, cy = H/2, s = Math.min(W, H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowBlur = 22; ctx.shadowColor = "#c45a6a";
  ctx.font = `bold ${Math.round(s*0.055)}px monospace`;
  ctx.fillStyle = "#e87a8a";
  ctx.fillText("INTESTINE ESCAPE", cx, cy - s*0.28);
  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(s*0.11)}px serif`;
  ctx.fillText("💩", cx, cy - s*0.14);
  ctx.font = `bold ${Math.round(s*0.042)}px monospace`;
  ctx.fillStyle = "#e87a8a";
  ctx.fillText(`LEVEL ${level}: ${LEVEL_NAMES[level-1].toUpperCase()}`, cx, cy);
  ctx.font = `${Math.round(s*0.034)}px sans-serif`;
  ctx.fillStyle = "rgba(255,200,200,0.65)";
  ctx.fillText("Find 🚽 · collect 🧻 for bonus · new maze each run!", cx, cy + s*0.09);
  ctx.fillText("WASD / Arrows / Swipe / D-pad", cx, cy + s*0.16);
  const bw = Math.min(W*0.5, 200), bh = 40, bx = cx-bw/2, by = cy + s*0.24;
  ctx.shadowBlur = 12; ctx.shadowColor = "#c45a6a";
  ctx.fillStyle = "#c45a6a";
  rrect(ctx, bx, by, bw, bh, 20); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.round(s*0.04)}px monospace`;
  ctx.fillStyle = "#fff";
  ctx.fillText("TAP TO START", cx, by + bh/2);
  ctx.restore();
}

function drawWonOverlay(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  elapsed: number, score: number, level: number, confetti: Confetti[]
) {
  ctx.save();
  ctx.fillStyle = "rgba(10,2,2,0.88)"; ctx.fillRect(0, 0, W, H);
  const cx = W/2, cy = H/2, s = Math.min(W, H);
  for (const c of confetti) {
    ctx.save(); ctx.globalAlpha = c.alpha;
    ctx.font = `${c.size}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(c.emoji, c.x, c.y); ctx.restore();
  }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowBlur = 24; ctx.shadowColor = "#ffd700";
  ctx.font = `${Math.round(s*0.12)}px serif`; ctx.fillText("🚽💨", cx, cy - s*0.22);
  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.round(s*0.06)}px monospace`;
  ctx.fillStyle = "#ffeecc"; ctx.fillText("FREEDOM!", cx, cy - s*0.07);
  const m = Math.floor(elapsed/60), sec = elapsed%60;
  ctx.font = `${Math.round(s*0.036)}px monospace`;
  ctx.fillStyle = "rgba(255,200,180,0.75)";
  ctx.fillText(`Time: ${m}:${String(sec).padStart(2,"0")}  Score: ${score}`, cx, cy + s*0.04);
  const isLast = level >= LEVEL_NAMES.length;
  const bw = Math.min(W*0.52, 210), bh = 40, bx = cx-bw/2, by = cy + s*0.14;
  ctx.shadowBlur = 12; ctx.shadowColor = "#c45a6a";
  ctx.fillStyle = "#c45a6a"; rrect(ctx, bx, by, bw, bh, 20); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.round(s*0.038)}px monospace`;
  ctx.fillStyle = "#fff";
  ctx.fillText(isLast ? "PLAY AGAIN" : "NEXT LEVEL →", cx, by + bh/2);
  ctx.restore();
}

// ─── D-Pad ────────────────────────────────────────────────────────────────────
function DPad({ onMove }: { onMove: (d: Dir) => void }) {
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = (d: Dir) => { onMove(d); iv.current = setInterval(() => onMove(d), 150); };
  const stop  = () => { if (iv.current) { clearInterval(iv.current); iv.current = null; } };
  const btn = (d: Dir, label: string) => (
    <button key={d}
      onPointerDown={e => { e.preventDefault(); start(d); }}
      onPointerUp={stop} onPointerLeave={stop}
      style={{
        width:48, height:48,
        background:"rgba(196,90,106,0.28)", border:"2px solid rgba(232,122,138,0.55)",
        borderRadius:10, color:"#ffcccc", fontSize:20, cursor:"pointer",
        userSelect:"none", WebkitUserSelect:"none" as React.CSSProperties["WebkitUserSelect"],
        touchAction:"none", display:"flex", alignItems:"center", justifyContent:"center",
      }}
    >{label}</button>
  );
  return (
    <div style={{
      position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)",
      display:"grid", gridTemplateColumns:"48px 48px 48px",
      gridTemplateRows:"48px 48px", gap:5, pointerEvents:"auto",
    }}>
      <div/>{btn("up","↑")}<div/>
      {btn("left","←")}{btn("down","↓")}{btn("right","→")}
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

  // Mutable game state
  const phaseRef        = useRef<Phase>("idle");
  const levelRef        = useRef(1);
  const mazeRef         = useRef<number[][]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const playerRef       = useRef({ r: 1, c: 1 });
  const animStateRef    = useRef({ active:false, fromR:1, fromC:1, toR:1, toC:1, t:0 });
  const pendingRef      = useRef<Dir | null>(null);
  const visitedRef      = useRef<Set<string>>(new Set(["1,1"]));
  const collectedRef    = useRef<Set<string>>(new Set());
  const scoreRef        = useRef(0);
  const startTimeRef    = useRef(0);
  const elapsedRef      = useRef(0);
  const confettiRef     = useRef<Confetti[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(1);

  // ── tryMove ────────────────────────────────────────────────────────────────
  const tryMove = useCallback((dir: Dir) => {
    if (phaseRef.current !== "playing") return;
    const as = animStateRef.current;
    if (as.active) { pendingRef.current = dir; return; }
    const { r, c } = playerRef.current;
    const deltas: Record<Dir,[number,number]> = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] };
    const [dr, dc] = deltas[dir];
    const nr = r+dr, nc = c+dc;
    const maze = mazeRef.current;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || maze[nr]?.[nc] === 1) {
      playBump(); return;
    }
    playStep();
    animStateRef.current = { active:true, fromR:r, fromC:c, toR:nr, toC:nc, t:0 };
    dirtyRef.current = true;
  }, []);

  // ── startLevel ─────────────────────────────────────────────────────────────
  const startLevel = useCallback((lv: number) => {
    const diff = (Math.min(lv, 3)) as 1|2|3;
    const { grid, collectibles } = generateMaze(ROWS, COLS, diff);
    mazeRef.current         = grid;
    collectiblesRef.current = collectibles;
    playerRef.current       = { r:1, c:1 };
    animStateRef.current    = { active:false, fromR:1, fromC:1, toR:1, toC:1, t:0 };
    pendingRef.current      = null;
    visitedRef.current      = new Set(["1,1"]);
    collectedRef.current    = new Set();
    confettiRef.current     = [];
    elapsedRef.current      = 0;
    startTimeRef.current    = Date.now();
    phaseRef.current        = "playing";
    levelRef.current        = lv;
    dirtyRef.current        = true;
    setLevel(lv);
    setPhase("playing");
  }, []);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    startLevel(1);
  }, [startLevel]);

  const nextLevel = useCallback(() => {
    if (levelRef.current >= LEVEL_NAMES.length) { startGame(); return; }
    startLevel(levelRef.current + 1);
  }, [startLevel, startGame]);

  // ── ResizeObserver ─────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current; if (!container) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (!width || !height) return;
      const canvas = canvasRef.current; if (!canvas) return;
      canvas.width = Math.round(width); canvas.height = Math.round(height);
      sizeRef.current = { W: canvas.width, H: canvas.height };
      dirtyRef.current = true;
    });
    ro.observe(container);
    const rect = container.getBoundingClientRect();
    const canvas = canvasRef.current!;
    canvas.width = rect.width || 480; canvas.height = rect.height || 480;
    sizeRef.current = { W: canvas.width, H: canvas.height };
    return () => ro.disconnect();
  }, []);

  // ── RAF loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      frameRef.current++;
      const as = animStateRef.current;

      if (as.active) {
        as.t = Math.min(1, as.t + 1/ANIM_FRAMES);
        if (as.t >= 1) {
          as.active = false;
          playerRef.current = { r: as.toR, c: as.toC };
          visitedRef.current.add(`${as.toR},${as.toC}`);

          // Collect toilet paper
          const key = `${as.toR},${as.toC}`;
          if (!collectedRef.current.has(key) &&
              collectiblesRef.current.some(col => col.r === as.toR && col.c === as.toC)) {
            collectedRef.current.add(key);
            scoreRef.current += 10;
            playCollect();
          }

          // Win
          if (as.toR === EXIT_R && as.toC === EXIT_C && phaseRef.current === "playing") {
            phaseRef.current = "won";
            elapsedRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setPhase("won");
            playWin();
            const { W } = sizeRef.current;
            const H2 = sizeRef.current.H;
            confettiRef.current = Array.from({ length: 28 }, () => ({
              x: Math.random() * W, y: -20 - Math.random() * 60,
              vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
              alpha: 1, size: 14 + Math.random() * 12,
              emoji: ["💩","🧻","🚽","✨","💨"][Math.floor(Math.random() * 5)],
            }));
            void H2; // suppress unused warning
          }

          // Flush buffered input
          if (pendingRef.current && phaseRef.current === "playing") {
            const dir = pendingRef.current; pendingRef.current = null;
            const { r, c } = playerRef.current;
            const deltas: Record<Dir,[number,number]> = { up:[-1,0],down:[1,0],left:[0,-1],right:[0,1] };
            const [dr, dc] = deltas[dir];
            const nr = r+dr, nc = c+dc;
            if (nr>=0 && nr<ROWS && nc>=0 && nc<COLS && mazeRef.current[nr]?.[nc] === 0) {
              animStateRef.current = { active:true, fromR:r, fromC:c, toR:nr, toC:nc, t:0 };
            }
          }
        }
        dirtyRef.current = true;
      }

      if (confettiRef.current.length > 0) {
        confettiRef.current = confettiRef.current
          .map(c => ({ ...c, x:c.x+c.vx, y:c.y+c.vy, alpha:c.alpha-0.008 }))
          .filter(c => c.alpha > 0);
        dirtyRef.current = true;
      }

      if (phaseRef.current === "playing") dirtyRef.current = true;
      if (!dirtyRef.current) { animRef.current = requestAnimationFrame(loop); return; }
      dirtyRef.current = false;

      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx)   { animRef.current = requestAnimationFrame(loop); return; }

      const { W, H } = sizeRef.current;
      const maze = mazeRef.current;
      if (maze.length === 0) { animRef.current = requestAnimationFrame(loop); return; }

      const tileSize = Math.max(4, Math.floor(Math.min(W, H) / Math.max(ROWS, COLS)));
      const mazeW = tileSize * COLS, mazeH = tileSize * ROWS;
      const pulse = computePulse();
      const eased = easeInOut(as.t);
      const pxCol = as.active ? lerp(as.fromC, as.toC, eased) : playerRef.current.c;
      const pxRow = as.active ? lerp(as.fromR, as.toR, eased) : playerRef.current.r;
      const playerPixX = pxCol*tileSize + tileSize/2;
      const playerPixY = pxRow*tileSize + tileSize/2;

      // Camera
      let camX: number, camY: number;
      if (mazeW <= W) { camX = Math.floor((W-mazeW)/2); }
      else { camX = Math.round(W/2-playerPixX); camX = Math.min(0, Math.max(W-mazeW, camX)); }
      if (mazeH <= H) { camY = Math.floor((H-mazeH)/2); }
      else { camY = Math.round(H/2-playerPixY); camY = Math.min(0, Math.max(H-mazeH, camY)); }

      ctx.fillStyle = BG_OUTER; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(camX, camY);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c*tileSize, y = r*tileSize;
          if (maze[r][c] === 1) {
            drawWall(ctx, x, y, tileSize, pulse);
          } else {
            const visited = visitedRef.current.has(`${r},${c}`);
            const current = !as.active && playerRef.current.r===r && playerRef.current.c===c;
            drawFloor(ctx, x, y, tileSize, visited, current);
            if (r===1 && c===1) drawStartMarker(ctx, x, y, tileSize);
          }
        }
      }

      // Collectibles
      for (const col of collectiblesRef.current) {
        if (!collectedRef.current.has(`${col.r},${col.c}`)) {
          drawCollectible(ctx, col.c*tileSize+tileSize/2, col.r*tileSize+tileSize/2, tileSize, frameRef.current);
        }
      }

      drawGoal(ctx, EXIT_C*tileSize+tileSize/2, EXIT_R*tileSize+tileSize/2, tileSize, frameRef.current);
      drawPlayer(ctx, pxCol*tileSize+tileSize/2, pxRow*tileSize+tileSize/2, tileSize, frameRef.current);

      ctx.restore();

      // HUD
      if (phaseRef.current === "playing") {
        const live = Math.floor((Date.now()-startTimeRef.current)/1000);
        const m=Math.floor(live/60), s=live%60;
        ctx.save();
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "rgba(232,122,138,0.9)";
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`🧻 ${scoreRef.current}`, 8, 6);
        ctx.textAlign = "right";
        ctx.fillText(`⏱ ${m}:${String(s).padStart(2,"0")}`, W-8, 6);
        ctx.restore();
      }

      // Overlays
      if (phaseRef.current === "idle") drawStartOverlay(ctx, W, H, levelRef.current);
      if (phaseRef.current === "won")  drawWonOverlay(ctx, W, H, elapsedRef.current, scoreRef.current, levelRef.current, confettiRef.current);

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string,Dir> = {
        ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right",
        w:"up", s:"down", a:"left", d:"right", W:"up", S:"down", A:"left", D:"right",
      };
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
      if (phaseRef.current === "idle") { startGame(); return; }
      if (phaseRef.current === "won")  { nextLevel(); return; }
      const dir = map[e.key];
      if (dir) tryMove(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryMove, startGame, nextLevel]);

  // ── Touch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let sx=0, sy=0;
    const onStart = (e: TouchEvent) => { sx=e.changedTouches[0].clientX; sy=e.changedTouches[0].clientY; };
    const onEnd   = (e: TouchEvent) => {
      const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
      if (phaseRef.current === "idle") { startGame(); return; }
      if (phaseRef.current === "won")  { nextLevel(); return; }
      if (Math.abs(dx)<12 && Math.abs(dy)<12) return;
      if (Math.abs(dx) > Math.abs(dy)) tryMove(dx>0?"right":"left");
      else tryMove(dy>0?"down":"up");
    };
    const onClick = () => {
      if (phaseRef.current === "idle") startGame();
      if (phaseRef.current === "won")  nextLevel();
    };
    canvas.addEventListener("touchstart", onStart, { passive:true });
    canvas.addEventListener("touchend",   onEnd,   { passive:true });
    canvas.addEventListener("click",      onClick);
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchend",   onEnd);
      canvas.removeEventListener("click",      onClick);
    };
  }, [tryMove, startGame, nextLevel]);

  return (
    <div
      className={styles.gameInner}
      style={{ padding:0, gap:0, display:"flex", flexDirection:"column", height:"100%", width:"100%", boxSizing:"border-box" }}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.3rem 0.75rem", flexShrink:0 }}>
        <span style={{ color:"#e87a8a", fontWeight:700, fontSize:"0.8rem", fontFamily:"monospace" }}>
          💩 {title}
        </span>
        {phase === "playing" && (
          <span style={{ color:"rgba(232,122,138,0.7)", fontSize:"0.75rem", fontFamily:"monospace" }}>
            Lv{level} · {LEVEL_NAMES[level-1]}
          </span>
        )}
      </div>

      <div ref={containerRef} style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <canvas ref={canvasRef} style={{ width:"100%", height:"100%", display:"block", touchAction:"none" }} />
        {phase === "playing" && <DPad onMove={tryMove} />}
      </div>
    </div>
  );
}
