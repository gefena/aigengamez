"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Constants ──────────────────────────────────────────────────────────────
type Mode = "kids" | "adult";
type Phase = "idle" | "playing" | "over";

const COLS = 6;
const ROWS = 10;
const MATCH_N = 3;
const DROP_MS = 260;
const FLASH_MS = 340;

const PALETTES: Record<Mode, string[]> = {
  kids:  ["#ef4444", "#3b82f6", "#facc15"],
  adult: ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7"],
};

// ── Pure helpers ───────────────────────────────────────────────────────────
function emptyGrid(): (string | null)[][] {
  return Array.from({ length: COLS }, () => Array<string | null>(ROWS).fill(null));
}

function randColor(palette: string[]): string {
  return palette[Math.floor(Math.random() * palette.length)];
}

function findMatches(grid: (string | null)[][]): Set<string> {
  const hits = new Set<string>();
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const color = grid[c][r];
      if (!color) { r++; continue; }
      let end = r + 1;
      while (end < ROWS && grid[c][end] === color) end++;
      if (end - r >= MATCH_N) {
        for (let i = r; i < end; i++) hits.add(`${c},${i}`);
      }
      r = end;
    }
  }
  return hits;
}

function clearAndCollapse(grid: (string | null)[][], hits: Set<string>): (string | null)[][] {
  return grid.map((col, c) => {
    const kept = col.filter((_, r) => !hits.has(`${c},${r}`));
    while (kept.length < ROWS) kept.push(null);
    return kept;
  });
}

function isAnyColumnFull(grid: (string | null)[][]): boolean {
  return grid.some(col => col[ROWS - 1] !== null);
}

// ── Canvas drawing ─────────────────────────────────────────────────────────
function drawMarble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  color: string, flashing: boolean,
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = flashing ? 28 : 10;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = flashing ? "#ffffff" : color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x - radius * 0.28, y - radius * 0.3, radius * 0.27, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fill();
  ctx.restore();
}

// ── Component ──────────────────────────────────────────────────────────────
export default function MarbleDropGame({ title }: { title: string }) {
  const [mode, setMode] = useState<Mode>("kids");
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [currentColor, setCurrentColor] = useState("#ef4444");
  const [nextColor, setNextColor] = useState("#3b82f6");
  const [canvasW, setCanvasW] = useState(360);
  const [canvasH, setCanvasH] = useState(480);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mountedRef = useRef(true);
  const rafRef = useRef(0);

  // All mutable game state lives in refs
  const gridRef = useRef<(string | null)[][]>(emptyGrid());
  const phaseRef = useRef<Phase>("idle");
  const scoreRef = useRef(0);
  const currentColorRef = useRef("#ef4444");
  const nextColorRef = useRef("#3b82f6");
  const modeRef = useRef<Mode>("kids");
  const animatingRef = useRef(false);
  const flashRef = useRef<Set<string>>(new Set());
  const fallingRef = useRef<{ col: number; y: number; color: string } | null>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => () => { mountedRef.current = false; cancelAnimationFrame(rafRef.current); }, []);

  // Responsive size
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const availW = containerRef.current.offsetWidth - 8;
      const cellW = Math.floor(Math.min(availW, 420) / COLS);
      const cellH = Math.min(cellW, Math.floor((window.innerHeight * 0.44) / ROWS));
      setCanvasW(cellW * COLS);
      setCanvasH(cellH * ROWS);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const cellW = cw / COLS;
    const cellH = ch / ROWS;
    const radius = Math.min(cellW, cellH) / 2 - 3;

    ctx.fillStyle = "#08081e";
    ctx.fillRect(0, 0, cw, ch);

    // Column lines
    for (let c = 1; c < COLS; c++) {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(c * cellW - 0.5, 0, 1, ch);
    }
    // Row lines (faint)
    for (let r = 1; r < ROWS; r++) {
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.fillRect(0, ch - r * cellH, cw, 1);
    }

    // Grid marbles (row 0 = bottom of canvas)
    const grid = gridRef.current;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const color = grid[c][r];
        if (!color) continue;
        const px = c * cellW + cellW / 2;
        const py = ch - (r + 0.5) * cellH;
        drawMarble(ctx, px, py, radius, color, flashRef.current.has(`${c},${r}`));
      }
    }

    // Falling marble
    const f = fallingRef.current;
    if (f) {
      const px = f.col * cellW + cellW / 2;
      drawMarble(ctx, px, f.y, radius, f.color, false);
    }

    // Game over overlay
    if (phaseRef.current === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, cw, ch);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f1f5f9";
      ctx.font = `bold ${Math.round(cellW * 0.85)}px sans-serif`;
      ctx.fillText("GAME OVER", cw / 2, ch / 2 - cellH * 0.4);
      ctx.font = `${Math.round(cellW * 0.55)}px sans-serif`;
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`Score: ${scoreRef.current}`, cw / 2, ch / 2 + cellH * 0.6);
    }
  }, []);

  // Re-render when canvas size changes
  useEffect(() => { renderFrame(); }, [canvasW, canvasH, renderFrame]);

  // ── Drop logic ─────────────────────────────────────────────────────────────
  const dropMarble = useCallback((col: number) => {
    if (animatingRef.current || phaseRef.current !== "playing") return;
    const grid = gridRef.current;
    if (grid[col][ROWS - 1] !== null) return; // column full

    const landRow = grid[col].indexOf(null);
    const color = currentColorRef.current;

    // Advance colors
    const pal = PALETTES[modeRef.current];
    const nc = randColor(pal);
    currentColorRef.current = nextColorRef.current;
    nextColorRef.current = nc;
    setCurrentColor(currentColorRef.current);
    setNextColor(nc);

    animatingRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellH = canvas.height / ROWS;
    const startY = -22;
    const endY = canvas.height - (landRow + 0.5) * cellH;
    const startTime = performance.now();

    function checkAndClear() {
      if (!mountedRef.current) return;
      const hits = findMatches(gridRef.current);
      if (hits.size === 0) {
        if (isAnyColumnFull(gridRef.current)) {
          phaseRef.current = "over";
          setPhase("over");
        } else {
          animatingRef.current = false;
        }
        renderFrame();
        return;
      }
      flashRef.current = hits;
      renderFrame();
      setTimeout(() => {
        if (!mountedRef.current) return;
        gridRef.current = clearAndCollapse(gridRef.current, hits);
        flashRef.current = new Set();
        scoreRef.current += hits.size * 100;
        setScore(scoreRef.current);
        renderFrame();
        setTimeout(checkAndClear, 140);
      }, FLASH_MS);
    }

    function animate(now: number) {
      const t = Math.min((now - startTime) / DROP_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      fallingRef.current = { col, y: startY + (endY - startY) * eased, color };
      renderFrame();
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fallingRef.current = null;
        const newGrid = gridRef.current.map(c => [...c]);
        newGrid[col][landRow] = color;
        gridRef.current = newGrid;
        checkAndClear();
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [renderFrame]);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    gridRef.current = emptyGrid();
    scoreRef.current = 0;
    flashRef.current = new Set();
    fallingRef.current = null;
    animatingRef.current = false;
    phaseRef.current = "playing";

    const pal = PALETTES[modeRef.current];
    const c1 = randColor(pal);
    const c2 = randColor(pal);
    currentColorRef.current = c1;
    nextColorRef.current = c2;

    setScore(0);
    setCurrentColor(c1);
    setNextColor(c2);
    setPhase("playing");
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    if (col >= 0 && col < COLS) dropMarble(col);
  }, [dropMarble]);

  const switchMode = (m: Mode) => {
    cancelAnimationFrame(rafRef.current);
    animatingRef.current = false;
    fallingRef.current = null;
    flashRef.current = new Set();
    phaseRef.current = "idle";
    modeRef.current = m;
    setMode(m);
    setPhase("idle");
    gridRef.current = emptyGrid();
    setTimeout(() => renderFrame(), 0);
  };

  return (
    <div ref={containerRef} className={styles.gameInner}>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        <button className={`${styles.diffBtn} ${mode === "kids" ? styles.activeDiff : ""}`} onClick={() => switchMode("kids")}>Kids</button>
        <button className={`${styles.diffBtn} ${mode === "adult" ? styles.activeDiff : ""}`} onClick={() => switchMode("adult")}>Adult</button>
      </div>

      {/* Score + current/next preview */}
      {phase === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 4px", width: "100%", maxWidth: canvasW }}>
          <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
            Score: <strong style={{ color: "#e2e8f0" }}>{score}</strong>
          </span>
          <span style={{ color: "#94a3b8", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5 }}>
            Drop:
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: currentColor, display: "inline-block", boxShadow: `0 0 8px ${currentColor}` }} />
          </span>
          <span style={{ color: "#94a3b8", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5 }}>
            Next:
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: nextColor, display: "inline-block", opacity: 0.8 }} />
          </span>
        </div>
      )}

      {/* Idle hint */}
      {phase === "idle" && (
        <p style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", margin: "2px 0" }}>
          Match 3+ same-color marbles in a column to clear them!
        </p>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", gap: 4 }}>
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          style={{ width: canvasW, height: canvasH, borderRadius: 8, cursor: phase === "playing" ? "pointer" : "default", display: "block" }}
          onClick={handleCanvasClick}
        />

        {/* Mobile drop buttons */}
        {phase === "playing" && (
          <div style={{ display: "flex", gap: 3, width: canvasW }}>
            {Array.from({ length: COLS }, (_, i) => (
              <button
                key={i}
                onPointerDown={() => dropMarble(i)}
                style={{
                  flex: 1, padding: "6px 0",
                  background: "rgba(30,41,59,0.85)",
                  border: "1px solid rgba(100,116,139,0.3)",
                  borderRadius: 6, color: "#94a3b8",
                  fontSize: "0.8rem", cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >↓</button>
            ))}
          </div>
        )}
      </div>

      {phase !== "playing" && (
        <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: 8 }}>
          {phase === "idle" ? "▶ Start" : "↺ Play Again"}
        </button>
      )}
    </div>
  );
}
