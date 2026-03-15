"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";

// ---- Types ----
type WallType = "tree" | "bush" | "flower" | "water" | "rock";

interface LevelConfig {
  rows: number;
  cols: number;
  name: string;
  collectCount: number;
}

// ---- Constants ----
const TILE = 32;
const PLAYER_EMOJI = "🦊";
const GOAL_EMOJI = "🏕️";
const COLLECT_EMOJI = "🍄";

const LEVELS: LevelConfig[] = [
  { rows: 15, cols: 15, name: "Meadow Path",       collectCount: 3 },
  { rows: 21, cols: 21, name: "Forest Labyrinth",  collectCount: 5 },
  { rows: 27, cols: 27, name: "Ancient Grove",      collectCount: 7 },
];

// ---- Prim's Algorithm Maze Generator ----
// Cells at odd (r,c) coordinates are rooms; even coords are walls between rooms.
function generatePrimsMaze(rows: number, cols: number): {
  open: boolean[][];
  wallTypes: (WallType | null)[][];
} {
  const open: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const visited = new Set<string>();
  const frontier: Array<{ cell: [number, number]; from: [number, number] }> = [];

  const key = (r: number, c: number) => `${r},${c}`;
  const inBounds = (r: number, c: number) => r >= 1 && r < rows - 1 && c >= 1 && c < cols - 1;

  const addFrontier = (r: number, c: number) => {
    const dirs: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && nr % 2 === 1 && nc % 2 === 1 && !visited.has(key(nr, nc))) {
        frontier.push({ cell: [nr, nc], from: [r, c] });
      }
    }
  };

  // Start from top-left room
  open[1][1] = true;
  visited.add(key(1, 1));
  addFrontier(1, 1);

  while (frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const { cell: [cr, cc], from: [fr, fc] } = frontier[idx];
    frontier.splice(idx, 1);
    if (visited.has(key(cr, cc))) continue;

    // Carve room and passage between it and its frontier parent
    open[cr][cc] = true;
    open[(cr + fr) >> 1][(cc + fc) >> 1] = true;
    visited.add(key(cr, cc));
    addFrontier(cr, cc);
  }

  // Assign stable wall types at generation time
  const WALL_OPTS: WallType[] = ["tree", "tree", "tree", "bush", "bush", "flower", "water", "rock"];
  const wallTypes: (WallType | null)[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      open[r][c] ? null : WALL_OPTS[Math.floor(Math.random() * WALL_OPTS.length)]
    )
  );

  return { open, wallTypes };
}

function placeCollectibles(
  open: boolean[][],
  count: number,
  sr: number, sc: number,
  er: number, ec: number
): [number, number][] {
  const rows = open.length, cols = open[0].length;
  const pool: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!open[r][c]) continue;
      if (Math.abs(r - sr) + Math.abs(c - sc) <= 3) continue;
      if (Math.abs(r - er) + Math.abs(c - ec) <= 3) continue;
      pool.push([r, c]);
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

// ---- Audio ----
function getAudio(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ref.current) {
    try { ref.current = new AudioContext(); } catch { return null; }
  }
  return ref.current;
}

function beep(ac: AudioContext, freq: number, type: OscillatorType, dur: number, vol: number, delay = 0) {
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = ac.currentTime + delay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  } catch { /* ignore */ }
}

// ---- Canvas Drawing ----
function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Trunk
  ctx.fillStyle = "#7d5a2d";
  ctx.fillRect(x + s * 0.35, y + s * 0.58, s * 0.3, s * 0.42);
  // Canopy layers
  ctx.fillStyle = "#2d6a4f";
  ctx.beginPath(); ctx.arc(x + s * 0.5, y + s * 0.42, s * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#40916c";
  ctx.beginPath(); ctx.arc(x + s * 0.35, y + s * 0.52, s * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + s * 0.65, y + s * 0.5, s * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#52b788";
  ctx.beginPath(); ctx.arc(x + s * 0.5, y + s * 0.3, s * 0.22, 0, Math.PI * 2); ctx.fill();
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "#52b788";
  ctx.beginPath(); ctx.arc(x + s * 0.27, y + s * 0.64, s * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#74c69d";
  ctx.beginPath(); ctx.arc(x + s * 0.5, y + s * 0.57, s * 0.31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#52b788";
  ctx.beginPath(); ctx.arc(x + s * 0.73, y + s * 0.64, s * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#95d5b2";
  ctx.beginPath(); ctx.arc(x + s * 0.5, y + s * 0.5, s * 0.18, 0, Math.PI * 2); ctx.fill();
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, tick: number) {
  const cx = x + s * 0.5;
  const cy = y + s * 0.56;
  const sway = Math.sin(tick * 0.04 + x * 0.1 + y * 0.07) * 1.5;
  // Stem
  ctx.strokeStyle = "#52b788"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + sway * 0.4, cy + s * 0.3);
  ctx.lineTo(cx + sway, cy - s * 0.08);
  ctx.stroke();
  // Petals
  const COLORS = ["#f72585", "#ff9f1c", "#e040fb", "#06d6a0"];
  ctx.fillStyle = COLORS[Math.floor((x * 3 + y * 7) % COLORS.length)];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(
      cx + sway + Math.cos(a) * s * 0.21,
      cy - s * 0.08 + Math.sin(a) * s * 0.21,
      s * 0.13, s * 0.08, a, 0, Math.PI * 2
    );
    ctx.fill();
  }
  // Centre
  ctx.fillStyle = "#ffd166";
  ctx.beginPath(); ctx.arc(cx + sway, cy - s * 0.08, s * 0.1, 0, Math.PI * 2); ctx.fill();
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, tick: number) {
  ctx.fillStyle = "#48cae4";
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const wy = y + s * 0.25 + i * s * 0.22 + Math.sin(tick * 0.06 + i * 1.5) * 2.5;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, wy);
    ctx.quadraticCurveTo(x + s * 0.5, wy - 5, x + s * 0.9, wy);
    ctx.stroke();
  }
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "#adb5bd";
  ctx.beginPath(); ctx.ellipse(x + s * 0.5, y + s * 0.62, s * 0.4, s * 0.27, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ced4da";
  ctx.beginPath(); ctx.ellipse(x + s * 0.4, y + s * 0.53, s * 0.2, s * 0.14, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x + s * 0.5, y + s * 0.62, s * 0.4, s * 0.27, 0, 0, Math.PI * 2); ctx.stroke();
}

// ---- Component ----
export default function NatureMazeGame({ title }: { title: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable game state (no re-renders on change)
  const openRef       = useRef<boolean[][]>([]);
  const wallTypesRef  = useRef<(WallType | null)[][]>([]);
  const playerRef     = useRef<[number, number]>([1, 1]);
  const exitRef       = useRef<[number, number]>([1, 1]);
  const collectRef    = useRef<[number, number][]>([]);
  const collectedRef  = useRef<Set<string>>(new Set());
  const visitedRef    = useRef<Set<string>>(new Set());
  const animRef       = useRef<{ from: [number, number]; to: [number, number]; t: number } | null>(null);
  const pendingRef    = useRef<[number, number] | null>(null);
  const sizeRef       = useRef({ W: 0, H: 0 });
  const rafRef        = useRef(0);
  const tickRef       = useRef(0);
  const audioRef      = useRef<AudioContext | null>(null);
  const confettiRef   = useRef<{ x: number; y: number; vx: number; vy: number; emoji: string; life: number }[]>([]);
  const levelRef      = useRef(1);
  const scoreRef      = useRef(0);
  const wonRef        = useRef(false);
  const collectedCountRef = useRef(0);

  // UI state (triggers re-render for HUD / overlay)
  const [level,     setLevel]     = useState(1);
  const [score,     setScore]     = useState(0);
  const [collected, setCollected] = useState(0);
  const [gamePhase, setGamePhase] = useState<"playing" | "won">("playing");

  const startLevel = useCallback((lvl: number) => {
    const cfg = LEVELS[lvl - 1];
    const { open, wallTypes } = generatePrimsMaze(cfg.rows, cfg.cols);
    const exitR = cfg.rows - 2;
    const exitC = cfg.cols - 2;

    openRef.current      = open;
    wallTypesRef.current = wallTypes;
    playerRef.current    = [1, 1];
    exitRef.current      = [exitR, exitC];
    collectRef.current   = placeCollectibles(open, cfg.collectCount, 1, 1, exitR, exitC);
    collectedRef.current = new Set();
    visitedRef.current   = new Set(["1,1"]);
    animRef.current      = null;
    pendingRef.current   = null;
    confettiRef.current  = [];
    wonRef.current       = false;
    levelRef.current     = lvl;
    collectedCountRef.current = 0;

    setLevel(lvl);
    setCollected(0);
    setGamePhase("playing");
  }, []);

  const tryMove = useCallback((dr: number, dc: number) => {
    if (wonRef.current) return;
    if (animRef.current) { pendingRef.current = [dr, dc]; return; }
    const [pr, pc] = playerRef.current;
    const nr = pr + dr, nc = pc + dc;
    const open = openRef.current;
    if (nr < 0 || nr >= open.length || nc < 0 || nc >= (open[0]?.length ?? 0)) return;
    if (!open[nr][nc]) {
      const ac = getAudio(audioRef);
      if (ac) beep(ac, 80, "sawtooth", 0.08, 0.08);
      return;
    }
    animRef.current = { from: [pr, pc], to: [nr, nc], t: 0 };
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const MAP: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
        W: [-1, 0], S: [1, 0], A: [0, -1], D: [0, 1],
      };
      const dir = MAP[e.key];
      if (dir) { e.preventDefault(); tryMove(dir[0], dir[1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryMove]);

  // Touch swipe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd   = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) tryMove(0, dx > 0 ? 1 : -1);
      else tryMove(dy > 0 ? 1 : -1, 0);
    };
    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchend",   onEnd);
    };
  }, [tryMove]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        sizeRef.current = { W: width, H: height };
        const canvas = canvasRef.current;
        if (canvas) { canvas.width = width; canvas.height = height; }
      }
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // RAF game loop
  useEffect(() => {
    startLevel(1);

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      tickRef.current++;
      const tick = tickRef.current;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { W, H } = sizeRef.current;
      if (W === 0 || H === 0) return;
      const open = openRef.current;
      if (!open.length) return;
      const ROWS = open.length, COLS = open[0].length;

      // --- Animation ---
      let drawR = playerRef.current[0];
      let drawC = playerRef.current[1];

      if (animRef.current) {
        animRef.current.t = Math.min(1, animRef.current.t + 0.18);
        const ease = animRef.current.t * (2 - animRef.current.t); // ease-out quad
        drawR = animRef.current.from[0] + (animRef.current.to[0] - animRef.current.from[0]) * ease;
        drawC = animRef.current.from[1] + (animRef.current.to[1] - animRef.current.from[1]) * ease;

        if (animRef.current.t >= 1) {
          playerRef.current = animRef.current.to;
          animRef.current   = null;
          const [pr, pc]    = playerRef.current;
          visitedRef.current.add(`${pr},${pc}`);

          // Collect mushroom
          const ck = `${pr},${pc}`;
          if (!collectedRef.current.has(ck) && collectRef.current.some(([cr, cc]) => cr === pr && cc === pc)) {
            collectedRef.current.add(ck);
            collectedCountRef.current++;
            scoreRef.current += 10;
            setScore(scoreRef.current);
            setCollected(collectedCountRef.current);
            const ac = getAudio(audioRef);
            if (ac) {
              beep(ac, 523, "sine", 0.12, 0.1,       0);
              beep(ac, 659, "sine", 0.12, 0.1,    0.11);
              beep(ac, 784, "sine", 0.15, 0.1,    0.22);
            }
          }

          // Soft step
          const ac = getAudio(audioRef);
          if (ac) {
            const STEPS = [330, 370, 392, 415];
            beep(ac, STEPS[tick % STEPS.length], "sine", 0.07, 0.05);
          }

          // Check win
          const [er, ec] = exitRef.current;
          if (pr === er && pc === ec && !wonRef.current) {
            wonRef.current = true;
            scoreRef.current += 50;
            setScore(scoreRef.current);
            setGamePhase("won");

            const emojis = ["🍄", "🦊", "🌿", "🌸", "✨", "🏕️", "🌲"];
            confettiRef.current = Array.from({ length: 28 }, () => ({
              x:     W / 2 + (Math.random() - 0.5) * 140,
              y:     H / 2 + (Math.random() - 0.5) * 80,
              vx:    (Math.random() - 0.5) * 7,
              vy:    -Math.random() * 9 - 2,
              emoji: emojis[Math.floor(Math.random() * emojis.length)],
              life:  140,
            }));

            const wac = getAudio(audioRef);
            if (wac) {
              [392, 440, 494, 523, 587, 659, 784].forEach((f, i) =>
                beep(wac, f, "sine", 0.4, 0.13, i * 0.13)
              );
            }
          }

          // Process buffered move
          if (pendingRef.current && !wonRef.current) {
            tryMove(pendingRef.current[0], pendingRef.current[1]);
            pendingRef.current = null;
          }
        }
      }

      // --- Camera ---
      const camX = Math.max(0, Math.min(drawC * TILE - W / 2 + TILE / 2, COLS * TILE - W));
      const camY = Math.max(0, Math.min(drawR * TILE - H / 2 + TILE / 2, ROWS * TILE - H));

      // --- Background ---
      ctx.fillStyle = "#d8f3dc";
      ctx.fillRect(0, 0, W, H);

      // --- Tiles (only visible) ---
      const tsc = Math.max(0, Math.floor(camX / TILE) - 1);
      const tec = Math.min(COLS - 1, Math.ceil((camX + W) / TILE) + 1);
      const tsr = Math.max(0, Math.floor(camY / TILE) - 1);
      const ter = Math.min(ROWS - 1, Math.ceil((camY + H) / TILE) + 1);

      for (let r = tsr; r <= ter; r++) {
        for (let c = tsc; c <= tec; c++) {
          const x = Math.round(c * TILE - camX);
          const y = Math.round(r * TILE - camY);

          if (open[r][c]) {
            ctx.fillStyle = visitedRef.current.has(`${r},${c}`) ? "#b7e4c7" : "#95d5b2";
            ctx.fillRect(x, y, TILE, TILE);
          } else {
            ctx.fillStyle = "#52b788";
            ctx.fillRect(x, y, TILE, TILE);
            ctx.save();
            ctx.beginPath(); ctx.rect(x, y, TILE, TILE); ctx.clip();
            switch (wallTypesRef.current[r]?.[c] ?? "tree") {
              case "tree":   drawTree(ctx, x, y, TILE); break;
              case "bush":   drawBush(ctx, x, y, TILE); break;
              case "flower": drawFlower(ctx, x, y, TILE, tick); break;
              case "water":  drawWater(ctx, x, y, TILE, tick); break;
              case "rock":   drawRock(ctx, x, y, TILE); break;
            }
            ctx.restore();
          }
        }
      }

      // --- Exit glow + emoji ---
      const [exitR, exitC] = exitRef.current;
      const exX = Math.round(exitC * TILE - camX);
      const exY = Math.round(exitR * TILE - camY);
      if (exX > -TILE * 2 && exX < W + TILE && exY > -TILE * 2 && exY < H + TILE) {
        const glowA = 0.25 + Math.sin(tick * 0.05) * 0.15;
        const grad  = ctx.createRadialGradient(exX + TILE / 2, exY + TILE / 2, 2, exX + TILE / 2, exY + TILE / 2, TILE);
        grad.addColorStop(0, `rgba(80,230,100,${glowA})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(exX - TILE / 2, exY - TILE / 2, TILE * 2, TILE * 2);
        ctx.font = `${TILE * 0.82}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(GOAL_EMOJI, exX + TILE / 2, exY + TILE / 2);
      }

      // --- Collectibles ---
      ctx.font = `${TILE * 0.68}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const [cr, cc] of collectRef.current) {
        if (collectedRef.current.has(`${cr},${cc}`)) continue;
        const cx = Math.round(cc * TILE - camX + TILE / 2);
        const cy = Math.round(cr * TILE - camY + TILE / 2 + Math.sin(tick * 0.07 + cr + cc) * 2);
        if (cx > -TILE && cx < W + TILE && cy > -TILE && cy < H + TILE) {
          ctx.fillText(COLLECT_EMOJI, cx, cy);
        }
      }

      // --- Player ---
      ctx.font = `${TILE * 0.84}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(
        PLAYER_EMOJI,
        Math.round(drawC * TILE - camX + TILE / 2),
        Math.round(drawR * TILE - camY + TILE / 2)
      );

      // --- Confetti ---
      if (confettiRef.current.length > 0) {
        ctx.font = "18px serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        confettiRef.current = confettiRef.current.filter(p => p.life > 0);
        for (const p of confettiRef.current) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life--;
          ctx.globalAlpha = Math.min(1, p.life / 40);
          ctx.fillText(p.emoji, p.x, p.y);
        }
        ctx.globalAlpha = 1;
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [startLevel, tryMove]);

  const handleNext = () => {
    const next = levelRef.current < 3 ? levelRef.current + 1 : 1;
    if (next === 1) { scoreRef.current = 0; setScore(0); }
    startLevel(next);
  };

  const cfg = LEVELS[level - 1];

  const dpadBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 8,
    color: "#d8f3dc",
    fontSize: "1.1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "none",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#1a3a2a" }}>
      {/* HUD */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "5px 14px", background: "rgba(0,0,0,0.45)", flexShrink: 0,
        fontSize: "0.78rem", color: "#d8f3dc", gap: 8,
      }}>
        <span>🌿 {title} · {level}/3 — {cfg.name}</span>
        <span>🍄 {collected}/{cfg.collectCount} &nbsp;⭐ {score}</span>
      </div>

      {/* Game area */}
      <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

        {/* D-pad overlay */}
        <div style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          display: "grid",
          gridTemplateAreas: `". up ." "left . right" ". down ."`,
          gridTemplateColumns: "44px 44px 44px",
          gridTemplateRows: "44px 44px 44px",
          gap: 3, userSelect: "none",
        }}>
          <button style={{ ...dpadBtnStyle, gridArea: "up"    }} onPointerDown={e => { e.preventDefault(); tryMove(-1,  0); }}>▲</button>
          <button style={{ ...dpadBtnStyle, gridArea: "left"  }} onPointerDown={e => { e.preventDefault(); tryMove( 0, -1); }}>◀</button>
          <button style={{ ...dpadBtnStyle, gridArea: "right" }} onPointerDown={e => { e.preventDefault(); tryMove( 0,  1); }}>▶</button>
          <button style={{ ...dpadBtnStyle, gridArea: "down"  }} onPointerDown={e => { e.preventDefault(); tryMove( 1,  0); }}>▼</button>
        </div>

        {/* Win overlay */}
        {gamePhase === "won" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(10,40,20,0.85)", backdropFilter: "blur(4px)",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: 8 }}>🏕️</div>
            <div style={{ fontSize: "1.4rem", color: "#d8f3dc", fontWeight: 700, marginBottom: 6 }}>
              {level < 3 ? "Level Complete!" : "You Explored the Grove!"}
            </div>
            <div style={{ color: "#95d5b2", marginBottom: 20, fontSize: "0.95rem" }}>Score: {score}</div>
            <button
              onClick={handleNext}
              style={{
                background: "#40916c", border: "none", color: "white",
                padding: "10px 28px", borderRadius: 24, fontWeight: 700,
                fontSize: "1rem", cursor: "pointer",
              }}
            >
              {level < 3 ? "Next Level →" : "Play Again"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
