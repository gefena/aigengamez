"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
type Dir    = 0 | 1 | 2 | 3;          // right=0, down=1, left=2, up=3
type TileC  = "red" | "blue" | "yellow";
type Color  = TileC | "empty" | "wall";
type Act    = "fwd" | "left" | "right" | "back";
type Phase  = "idle" | "running" | "won" | "over";
type Mode   = "kids" | "adult";

interface Cell  { tile: TileC | null; grass: boolean; }
interface Mower { x: number; y: number; dir: Dir; }
type Prog = Record<Color, Act>;

// ── Constants ─────────────────────────────────────────────────────────────────
const KDIM = 6; const KSTEPS = 25;
const ADIM = 8; const ASTEPS = 35;
const DX   = [1, 0, -1,  0];
const DY   = [0, 1,  0, -1];

const TILE_BG:  Record<TileC, string> = { red:"#fca5a5", blue:"#93c5fd", yellow:"#fde68a" };
const TILE_DIM: Record<TileC, string> = { red:"#fecdd3", blue:"#bfdbfe", yellow:"#fef08a" };
const TILE_DOT: Record<TileC, string> = { red:"#dc2626", blue:"#2563eb", yellow:"#d97706" };
const TILE_BORDER: Record<TileC, string> = { red:"#ef4444", blue:"#3b82f6", yellow:"#f59e0b" };

const ACT_LABELS: Record<Act, string> = {
  fwd:   "→ Go Forward",
  left:  "↺ Turn Left + Go",
  right: "↻ Turn Right + Go",
  back:  "↩ U-Turn + Go",
};

// Mower body rotation in degrees
const MOW_DEG = [0, 90, 180, 270];

// ── CSS Keyframes ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes bladeSpin { to { transform: rotate(360deg); } }
@keyframes mowPop { 0%{opacity:0.8;transform:scale(1.25)} 100%{opacity:1;transform:scale(1)} }
@keyframes grassSway {
  0%,100% { transform: rotate(-4deg) translateX(0); }
  50%      { transform: rotate(4deg) translateX(1px); }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function applyAct(dir: Dir, act: Act): Dir {
  if (act === "fwd")   return dir;
  if (act === "left")  return ((dir + 3) % 4) as Dir;
  if (act === "right") return ((dir + 1) % 4) as Dir;
  return ((dir + 2) % 4) as Dir;
}

function doStep(m: Mower, prog: Prog, grid: Cell[][], dim: number): Mower {
  const col: Color = grid[m.y][m.x].tile ?? "empty";
  let d  = applyAct(m.dir, prog[col]);
  let nx = m.x + DX[d], ny = m.y + DY[d];
  if (nx < 0 || nx >= dim || ny < 0 || ny >= dim) {
    d  = applyAct(d, prog["wall"]);
    nx = m.x + DX[d]; ny = m.y + DY[d];
    if (nx < 0 || nx >= dim || ny < 0 || ny >= dim) return { ...m, dir: d };
  }
  return { x: nx, y: ny, dir: d };
}

function countGrass(grid: Cell[][]): number {
  return grid.reduce((s, row) => s + row.filter(c => c.grass).length, 0);
}

function genLevel(mode: Mode): { grid: Cell[][], start: Mower, maxSteps: number } {
  const dim    = mode === "kids" ? KDIM  : ADIM;
  const maxS   = mode === "kids" ? KSTEPS : ASTEPS;
  const tiles: TileC[] = mode === "kids" ? ["red","blue"] : ["red","blue","yellow"];
  const acts: Act[]    = ["fwd","left","right","back"];

  const grid: Cell[][] = Array.from({ length: dim }, () =>
    Array.from({ length: dim }, () => ({ tile: null as TileC | null, grass: false }))
  );

  const sx = Math.floor(dim / 2) - 1;
  const sy = Math.floor(dim / 2);
  const start: Mower = { x: sx, y: sy, dir: 0 };

  const n = mode === "kids" ? 4 : 5;
  for (const tc of tiles) {
    let placed = 0, tries = 0;
    while (placed < n && tries < 300) {
      const x = Math.floor(Math.random() * dim);
      const y = Math.floor(Math.random() * dim);
      if (grid[y][x].tile !== null || (x === sx && y === sy)) { tries++; continue; }
      grid[y][x].tile = tc;
      placed++; tries++;
    }
  }

  const prog: Prog = {
    red:    acts[Math.floor(Math.random() * 4)],
    blue:   acts[Math.floor(Math.random() * 4)],
    yellow: acts[Math.floor(Math.random() * 4)],
    empty:  acts[Math.floor(Math.random() * 4)],
    wall:   acts[Math.floor(Math.random() * 4)],
  };

  const vis: boolean[][] = Array.from({ length: dim }, () => Array(dim).fill(false));
  let m: Mower = { ...start };
  vis[m.y][m.x] = true;
  for (let i = 0; i < maxS; i++) {
    m = doStep(m, prog, grid, dim);
    vis[m.y][m.x] = true;
  }

  for (let y = 0; y < dim; y++)
    for (let x = 0; x < dim; x++)
      if (vis[y][x] && !(x === sx && y === sy))
        grid[y][x].grass = true;

  return { grid, start, maxSteps: maxS };
}

// ── Mower SVG ─────────────────────────────────────────────────────────────────
function MowerSprite({ dir, running, cellPx }: { dir: Dir; running: boolean; cellPx: number }) {
  const size = Math.round(cellPx * 0.78);
  const blade = Math.round(size * 0.28);
  return (
    <div style={{
      width: size, height: size,
      transform: `rotate(${MOW_DEG[dir]}deg)`,
      transition: "transform 0.12s",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start",
      position: "relative", flexShrink: 0,
    }}>
      {/* Body */}
      <div style={{
        width: "100%", height: "100%",
        background: "linear-gradient(160deg, #16a34a 0%, #15803d 55%, #166534 100%)",
        borderRadius: Math.round(size * 0.18),
        border: "2px solid #14532d",
        boxShadow: "0 3px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
        position: "relative",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Handlebar stripe at back */}
        <div style={{
          position: "absolute", bottom: 0, left: "15%", right: "15%", height: "22%",
          background: "#ca8a04",
          borderRadius: "0 0 4px 4px",
          border: "1px solid #92400e",
        }} />
        {/* Blade/engine circle */}
        <div style={{
          width: blade, height: blade,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #d1fae5, #6ee7b7)",
          border: "2px solid #059669",
          boxShadow: "0 0 6px rgba(16,185,129,0.6)",
          animation: running ? `bladeSpin 0.45s linear infinite` : "none",
          zIndex: 1,
        }} />
        {/* Front arrow indicator */}
        <div style={{
          position: "absolute", top: 3, left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: `${Math.round(size*0.12)}px solid transparent`,
          borderRight: `${Math.round(size*0.12)}px solid transparent`,
          borderBottom: `${Math.round(size*0.14)}px solid rgba(255,255,255,0.75)`,
        }} />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
const EMPTY_GRID: Cell[][] = Array.from({ length: KDIM }, () =>
  Array.from({ length: KDIM }, () => ({ tile: null as TileC | null, grass: false }))
);
const INIT_MOWER: Mower = { x: 2, y: 3, dir: 0 };
const INIT_PROG:  Prog  = { red:"fwd", blue:"left", yellow:"right", empty:"fwd", wall:"right" };

export default function LawnMowerGame({ title }: { title: string }) {
  const [mode,           setMode]           = useState<Mode>("kids");
  const [phase,          setPhase]          = useState<Phase>("idle");
  const [grid,           setGrid]           = useState<Cell[][]>(EMPTY_GRID);
  const [mower,          setMower]          = useState<Mower>(INIT_MOWER);
  const [stepsLeft,      setStepsLeft]      = useState(KSTEPS);
  const [grassCount,     setGrassCount]     = useState(0);
  const [totalGrass,     setTotalGrass]     = useState(0);
  const [program,        setProgram]        = useState<Prog>(INIT_PROG);
  const [containerWidth, setContainerWidth] = useState(360);

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef      = useRef<Cell[][]>(EMPTY_GRID);
  const origGridRef  = useRef<Cell[][]>(EMPTY_GRID);
  const mowerRef     = useRef<Mower>(INIT_MOWER);
  const startRef     = useRef<Mower>(INIT_MOWER);
  const programRef   = useRef<Prog>(INIT_PROG);
  const stepsRef     = useRef(KSTEPS);
  const maxStepsRef  = useRef(KSTEPS);
  const phaseRef     = useRef<Phase>("idle");
  const dimRef       = useRef(KDIM);
  const animRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const loadLevel = useCallback((m: Mode) => {
    if (animRef.current) { clearTimeout(animRef.current); animRef.current = null; }
    const { grid: g, start, maxSteps } = genLevel(m);
    const dim = m === "kids" ? KDIM : ADIM;
    const gc  = countGrass(g);
    origGridRef.current = g.map(r => r.map(c => ({ ...c })));
    gridRef.current     = g.map(r => r.map(c => ({ ...c })));
    mowerRef.current    = { ...start };
    startRef.current    = { ...start };
    stepsRef.current    = maxSteps;
    maxStepsRef.current = maxSteps;
    dimRef.current      = dim;
    phaseRef.current    = "idle";
    setGrid(g);
    setMower({ ...start });
    setStepsLeft(maxSteps);
    setGrassCount(gc);
    setTotalGrass(gc);
    setPhase("idle");
  }, []);

  useEffect(() => { loadLevel("kids"); }, [loadLevel]);

  const resetLevel = useCallback(() => {
    if (animRef.current) { clearTimeout(animRef.current); animRef.current = null; }
    const fresh = origGridRef.current.map(r => r.map(c => ({ ...c })));
    const gc = countGrass(fresh);
    gridRef.current  = fresh;
    mowerRef.current = { ...startRef.current };
    stepsRef.current = maxStepsRef.current;
    phaseRef.current = "idle";
    setGrid(fresh);
    setMower({ ...startRef.current });
    setStepsLeft(maxStepsRef.current);
    setGrassCount(gc);
    setPhase("idle");
  }, []);

  const tick = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const dim    = dimRef.current;
    const nMow   = doStep(mowerRef.current, programRef.current, gridRef.current, dim);
    const nGrid  = gridRef.current.map(r => r.map(c => ({ ...c })));
    nGrid[nMow.y][nMow.x].grass = false;
    mowerRef.current = nMow;
    gridRef.current  = nGrid;
    stepsRef.current--;
    const gc = countGrass(nGrid);
    setMower({ ...nMow });
    setGrid(nGrid);
    setGrassCount(gc);
    setStepsLeft(stepsRef.current);
    if (gc === 0)              { phaseRef.current = "won";  setPhase("won");  return; }
    if (stepsRef.current <= 0) { phaseRef.current = "over"; setPhase("over"); return; }
    animRef.current = setTimeout(tick, 155);
  }, []);

  const runProgram = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    phaseRef.current = "running";
    setPhase("running");
    animRef.current = setTimeout(tick, 80);
  }, [tick]);

  const stepOnce = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    const dim   = dimRef.current;
    const nMow  = doStep(mowerRef.current, programRef.current, gridRef.current, dim);
    const nGrid = gridRef.current.map(r => r.map(c => ({ ...c })));
    nGrid[nMow.y][nMow.x].grass = false;
    mowerRef.current = nMow;
    gridRef.current  = nGrid;
    stepsRef.current--;
    const gc = countGrass(nGrid);
    setMower({ ...nMow });
    setGrid(nGrid);
    setGrassCount(gc);
    setStepsLeft(stepsRef.current);
    if (gc === 0)                   { phaseRef.current = "won";  setPhase("won");  }
    else if (stepsRef.current <= 0) { phaseRef.current = "over"; setPhase("over"); }
  }, []);

  const handleProgChange = useCallback((key: Color, val: Act) => {
    if (phaseRef.current === "running") return;
    const next = { ...programRef.current, [key]: val };
    programRef.current = next;
    setProgram(next);
  }, []);

  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current); }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const dim    = mode === "kids" ? KDIM : ADIM;
  const cellPx = Math.min(56, Math.max(32, Math.floor((containerWidth - 16) / dim) - 3));
  const pct    = totalGrass > 0 ? Math.round((1 - grassCount / totalGrass) * 100) : 100;
  const isRun  = phase === "running";
  const isDone = phase === "won" || phase === "over";

  const conds: { key: Color; label: string; accent: string; bg: string }[] = mode === "kids"
    ? [
        { key: "red",   label: "🔴 On Red",   accent: "#ef4444", bg: "#fca5a515" },
        { key: "blue",  label: "🔵 On Blue",  accent: "#3b82f6", bg: "#93c5fd15" },
        { key: "empty", label: "🌿 On Grass", accent: "#16a34a", bg: "#16a34a12" },
        { key: "wall",  label: "🧱 Hit Wall", accent: "#d97706", bg: "#d9770612" },
      ]
    : [
        { key: "red",    label: "🔴 On Red",    accent: "#ef4444", bg: "#fca5a515" },
        { key: "blue",   label: "🔵 On Blue",   accent: "#3b82f6", bg: "#93c5fd15" },
        { key: "yellow", label: "🟡 On Yellow", accent: "#f59e0b", bg: "#fde68a15" },
        { key: "empty",  label: "🌿 On Grass",  accent: "#16a34a", bg: "#16a34a12" },
        { key: "wall",   label: "🧱 Hit Wall",  accent: "#d97706", bg: "#d9770612" },
      ];

  return (
    <div className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Mode selector */}
      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["kids","adult"] as Mode[]).map(m => (
          <button key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { setMode(m); loadLevel(m); }}
          >{m === "kids" ? "🧒 Kids (6×6)" : "💪 Adult (8×8)"}</button>
        ))}
      </div>

      {/* Status bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 12px",
        background: "linear-gradient(135deg, #14532d22, #15803d18)",
        border: "1px solid #16a34a40",
        borderRadius: 8, fontSize: "0.82rem", marginBottom: 8,
      }}>
        <span style={{
          fontWeight: 700,
          color: phase === "won" ? "#22c55e" : phase === "over" ? "#f87171" : "#86efac",
          minWidth: 110,
        }}>
          {phase === "won"  ? "🎉 All mowed!"
         : phase === "over" ? "❌ Out of steps"
         : `🌿 ${grassCount} remaining`}
        </span>
        {/* Progress bar */}
        <div style={{ flex: 1, height: 8, background: "#0f2d1a", borderRadius: 4, overflow: "hidden", border: "1px solid #166534" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: pct === 100
              ? "linear-gradient(90deg,#22c55e,#4ade80)"
              : "linear-gradient(90deg,#16a34a,#86efac)",
            transition: "width 0.15s",
            borderRadius: 4,
            boxShadow: pct === 100 ? "0 0 8px #22c55e80" : "none",
          }} />
        </div>
        <span style={{ color: "#86efac", fontWeight: 600, minWidth: 36 }}>{pct}%</span>
        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>⏱ {stepsLeft}</span>
      </div>

      {/* Grid + Program */}
      <div ref={containerRef} style={{ width: "100%" }}>
        <div style={{
          display: "flex",
          flexDirection: containerWidth >= 520 ? "row" : "column",
          gap: 10, alignItems: "flex-start",
        }}>

          {/* ── Grid ── */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${dim},${cellPx}px)`,
              gridTemplateRows:    `repeat(${dim},${cellPx}px)`,
              gap: 3, padding: 6,
              background: "#78350f",     /* wood frame */
              borderRadius: 12,
              boxShadow: "0 6px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
              border: "2px solid #92400e",
            }}>
              {grid.map((row, y) =>
                row.map((cell, x) => {
                  const isMow = mower.x === x && mower.y === y;
                  // Mowed stripes: alternating light greens
                  const stripe = (x + y) % 2 === 0 ? "#bbf7d0" : "#a7f3d0";
                  const bg =
                    cell.tile
                      ? (cell.grass ? TILE_BG[cell.tile] : TILE_DIM[cell.tile])
                      : cell.grass ? "#15803d" : stripe;
                  const leftBorderColor = cell.tile && !cell.grass ? TILE_BORDER[cell.tile] : "transparent";
                  return (
                    <div key={`${x}-${y}`} style={{
                      width: cellPx, height: cellPx,
                      background: bg,
                      position: "relative",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.18s",
                      borderRadius: 3,
                      borderLeft: `3px solid ${leftBorderColor}`,
                      boxSizing: "border-box",
                    }}>
                      {/* Un-mowed grass blades */}
                      {cell.grass && !isMow && (
                        <span style={{
                          fontSize: Math.round(cellPx * 0.52),
                          lineHeight: 1,
                          userSelect: "none",
                          animation: !isRun ? "grassSway 2.2s ease-in-out infinite" : "none",
                          display: "inline-block",
                          transformOrigin: "50% 100%",
                        }}>🌿</span>
                      )}
                      {/* Tile dot (top-right corner) */}
                      {cell.tile && (
                        <span style={{
                          position: "absolute", top: 2, right: 2,
                          width: Math.max(5, Math.round(cellPx * 0.22)),
                          height: Math.max(5, Math.round(cellPx * 0.22)),
                          borderRadius: "50%",
                          background: TILE_DOT[cell.tile],
                          border: "1.5px solid rgba(255,255,255,0.5)",
                          boxShadow: `0 0 4px ${TILE_DOT[cell.tile]}80`,
                        }} />
                      )}
                      {/* Mower sprite */}
                      {isMow && (
                        <MowerSprite dir={mower.dir} running={isRun} cellPx={cellPx} />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Legend */}
            <div style={{
              display: "flex", gap: 8, marginTop: 6,
              fontSize: "0.68rem", color: "#94a3b8", flexWrap: "wrap",
              paddingLeft: 2,
            }}>
              <span style={{ color: "#4ade80" }}>🟩 Mowed</span>
              <span style={{ color: "#16a34a" }}>🌿 Grass</span>
              {conds.filter(c => c.key !== "empty").map(c => (
                <span key={c.key} style={{ color: c.accent }}>{c.label}</span>
              ))}
            </div>
          </div>

          {/* ── Program editor ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "0.7rem", color: "#86efac", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 6, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                background: "#14532d", border: "1px solid #16a34a40",
                borderRadius: 4, padding: "1px 6px",
              }}>If…</span>
              <span style={{ color: "#475569" }}>→</span>
              <span style={{
                background: "#1e293b", border: "1px solid #334155",
                borderRadius: 4, padding: "1px 6px",
              }}>Do…</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {conds.map(({ key, label, accent, bg }) => (
                <div key={key} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: bg,
                  borderRadius: 7,
                  padding: "5px 8px",
                  border: `1px solid ${accent}35`,
                }}>
                  <span style={{
                    fontSize: "0.74rem", fontWeight: 700, color: accent,
                    minWidth: 84, flexShrink: 0,
                  }}>{label}</span>
                  <select
                    value={program[key]}
                    onChange={e => handleProgChange(key, e.target.value as Act)}
                    disabled={isRun}
                    style={{
                      flex: 1,
                      background: "#0f172a",
                      color: "#e2e8f0",
                      border: `1px solid ${accent}50`,
                      borderRadius: 5,
                      padding: "4px 6px",
                      fontSize: "0.74rem",
                      cursor: isRun ? "not-allowed" : "pointer",
                      outline: "none",
                    }}
                  >
                    {(["fwd","left","right","back"] as Act[]).map(a => (
                      <option key={a} value={a}>{ACT_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Hint / result message */}
            <div style={{
              marginTop: 8, padding: "7px 10px",
              background: phase === "won"  ? "#14532d40"
                        : phase === "over" ? "#7f1d1d30"
                        : "#0f172a",
              border: `1px solid ${phase === "won" ? "#16a34a50" : phase === "over" ? "#ef444440" : "#1e293b"}`,
              borderRadius: 7,
              fontSize: "0.72rem",
              color: phase === "won" ? "#4ade80" : phase === "over" ? "#fca5a5" : "#94a3b8",
              lineHeight: 1.6,
            }}>
              {phase === "won"  ? "🎉 Perfect program! Hit New Level to try again." :
               phase === "over" ? "💡 Adjust your rules so the mower reaches all the grass." :
               "💡 Pick an action for each tile type. The mower loops your rules until done or out of steps."}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.gameControls} style={{ marginTop: 8 }}>
        {!isDone && (
          <>
            <button
              onClick={isRun ? undefined : runProgram}
              style={{
                background: isRun
                  ? "linear-gradient(135deg,#166534,#14532d)"
                  : "linear-gradient(135deg,#16a34a,#15803d)",
                color: "#fff", fontWeight: 700,
                border: "none", borderRadius: 8,
                padding: "8px 20px", fontSize: "0.88rem",
                cursor: isRun ? "not-allowed" : "pointer",
                opacity: isRun ? 0.7 : 1,
                boxShadow: isRun ? "none" : "0 2px 10px #16a34a60",
                transition: "all 0.15s",
              }}
            >{isRun ? "⏳ Running…" : "▶ Run"}</button>
            {!isRun && (
              <button onClick={stepOnce} style={{
                background: "transparent",
                border: "1px solid #16a34a60",
                color: "#4ade80",
                padding: "8px 14px", borderRadius: 8,
                cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
              }}>⏭ Step</button>
            )}
            {!isRun && (
              <button onClick={resetLevel} style={{
                background: "transparent",
                border: "1px solid #334155",
                color: "#64748b",
                padding: "8px 12px", borderRadius: 8,
                cursor: "pointer", fontSize: "0.82rem",
              }}>↩ Reset</button>
            )}
          </>
        )}
        {phase === "won"  && (
          <button
            onClick={() => loadLevel(mode)}
            style={{
              background: "linear-gradient(135deg,#16a34a,#15803d)",
              color: "#fff", fontWeight: 700, border: "none", borderRadius: 8,
              padding: "8px 20px", fontSize: "0.88rem", cursor: "pointer",
              boxShadow: "0 2px 10px #16a34a60",
            }}
          >🌿 New Level</button>
        )}
        {phase === "over" && (
          <button
            onClick={resetLevel}
            style={{
              background: "linear-gradient(135deg,#b45309,#92400e)",
              color: "#fff", fontWeight: 700, border: "none", borderRadius: 8,
              padding: "8px 20px", fontSize: "0.88rem", cursor: "pointer",
            }}
          >↩ Try Again</button>
        )}
        <button onClick={() => loadLevel(mode)} style={{
          background: "transparent",
          border: "1px solid #334155",
          color: "#64748b",
          padding: "8px 14px", borderRadius: 8,
          cursor: "pointer", fontSize: "0.82rem",
        }}>🔄 New Level</button>
      </div>
    </div>
  );
}
