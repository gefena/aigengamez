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
const DARR = ["→", "↓", "←", "↑"];

const TILE_BG:  Record<TileC, string> = { red:"#fca5a5", blue:"#93c5fd", yellow:"#fde68a" };
const TILE_DIM: Record<TileC, string> = { red:"#fecdd3", blue:"#bfdbfe", yellow:"#fef08a" };
const TILE_DOT: Record<TileC, string> = { red:"#ef4444", blue:"#3b82f6", yellow:"#f59e0b" };

const ACT_LABELS: Record<Act, string> = {
  fwd:   "→ Go Forward",
  left:  "↺ Turn Left + Go",
  right: "↻ Turn Right + Go",
  back:  "↩ U-Turn + Go",
};

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
    // Apply wall rule then try again
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

  // Place colored tiles randomly (skip start)
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

  // Random solution program
  const prog: Prog = {
    red:    acts[Math.floor(Math.random() * 4)],
    blue:   acts[Math.floor(Math.random() * 4)],
    yellow: acts[Math.floor(Math.random() * 4)],
    empty:  acts[Math.floor(Math.random() * 4)],
    wall:   acts[Math.floor(Math.random() * 4)],
  };

  // Simulate to find visited cells
  const vis: boolean[][] = Array.from({ length: dim }, () => Array(dim).fill(false));
  let m: Mower = { ...start };
  vis[m.y][m.x] = true;
  for (let i = 0; i < maxS; i++) {
    m = doStep(m, prog, grid, dim);
    vis[m.y][m.x] = true;
  }

  // Place grass on visited cells (not the start cell)
  for (let y = 0; y < dim; y++)
    for (let x = 0; x < dim; x++)
      if (vis[y][x] && !(x === sx && y === sy))
        grid[y][x].grass = true;

  return { grid, start, maxSteps: maxS };
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

  // Generate first level after hydration
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

  // Animation tick — reads all state from refs, empty deps
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
    if (gc === 0)              { phaseRef.current = "won";  setPhase("won");  }
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

  const conds: { key: Color; label: string; accent: string }[] = mode === "kids"
    ? [
        { key: "red",   label: "🔴 On Red",   accent: "#ef4444" },
        { key: "blue",  label: "🔵 On Blue",  accent: "#3b82f6" },
        { key: "empty", label: "⬜ Empty",     accent: "#94a3b8" },
        { key: "wall",  label: "🧱 Hit Wall", accent: "#a16207" },
      ]
    : [
        { key: "red",    label: "🔴 On Red",    accent: "#ef4444" },
        { key: "blue",   label: "🔵 On Blue",   accent: "#3b82f6" },
        { key: "yellow", label: "🟡 On Yellow", accent: "#f59e0b" },
        { key: "empty",  label: "⬜ Empty",      accent: "#94a3b8" },
        { key: "wall",   label: "🧱 Hit Wall",  accent: "#a16207" },
      ];

  return (
    <div className={styles.gameInner}>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Mode */}
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
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.3rem 0.6rem", background: "var(--bg-secondary)",
        borderRadius: "var(--radius-sm)", fontSize: "0.8rem",
        color: "var(--text-secondary)", marginBottom: "0.5rem", gap: "0.5rem",
      }}>
        <span style={{ color: grassCount === 0 ? "#22c55e" : "inherit" }}>
          {phase === "won"  ? "🎉 All mowed!"  :
           phase === "over" ? "❌ Out of steps!" :
           `🌿 ${grassCount} left`}
        </span>
        <div style={{ display:"flex", alignItems:"center", gap: 6, flex: 1, justifyContent:"center" }}>
          <div style={{
            height: 6, flex: 1, maxWidth: 80,
            background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: pct === 100 ? "#22c55e" : "#f59e0b",
              transition: "width 0.15s", borderRadius: 3,
            }} />
          </div>
          <span>{pct}%</span>
        </div>
        <span>⏱ {stepsLeft} steps</span>
      </div>

      {/* Grid + Program */}
      <div ref={containerRef} style={{ width: "100%" }}>
        <div style={{
          display: "flex",
          flexDirection: containerWidth >= 520 ? "row" : "column",
          gap: "0.65rem", alignItems: "flex-start",
        }}>

          {/* ── Grid ── */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${dim},${cellPx}px)`,
              gridTemplateRows:    `repeat(${dim},${cellPx}px)`,
              gap: 2, padding: 3,
              background: "var(--border-highlight)",
              borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}>
              {grid.map((row, y) =>
                row.map((cell, x) => {
                  const isMow = mower.x === x && mower.y === y;
                  const bg =
                    cell.tile  ? (cell.grass ? TILE_BG[cell.tile]  : TILE_DIM[cell.tile])
                               : cell.grass  ? "#15803d" : "#0f172a";
                  return (
                    <div key={`${x}-${y}`} style={{
                      width: cellPx, height: cellPx,
                      background: bg,
                      position: "relative",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.12s",
                      borderRadius: 3,
                    }}>
                      {/* Grass blades */}
                      {cell.grass && !isMow && (
                        <span style={{ fontSize: Math.round(cellPx * 0.46), lineHeight: 1, userSelect:"none" }}>🌿</span>
                      )}
                      {/* Tile color dot (corner marker) */}
                      {cell.tile && (
                        <span style={{
                          position: "absolute", top: 2, right: 2,
                          width: Math.max(5, Math.round(cellPx * 0.2)),
                          height: Math.max(5, Math.round(cellPx * 0.2)),
                          borderRadius: "50%",
                          background: TILE_DOT[cell.tile],
                          border: "1px solid rgba(0,0,0,0.25)",
                          flexShrink: 0,
                        }} />
                      )}
                      {/* Mower */}
                      {isMow && (
                        <div style={{
                          width: Math.round(cellPx * 0.72),
                          height: Math.round(cellPx * 0.72),
                          borderRadius: "50%",
                          background: "linear-gradient(135deg,#06b6d4,#0284c7)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: Math.round(cellPx * 0.32),
                          fontWeight: 900, color: "#fff",
                          boxShadow: "0 0 10px rgba(6,182,212,0.7)",
                          position: "relative", zIndex: 2,
                        }}>
                          {DARR[mower.dir]}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Legend */}
            <div style={{
              display: "flex", gap: "0.6rem", marginTop: "0.4rem",
              fontSize: "0.68rem", color: "var(--text-secondary)", flexWrap: "wrap",
            }}>
              <span>🟦 Mower</span>
              <span style={{ color:"#15803d" }}>🌿 Grass</span>
              {conds.filter(c => c.key !== "empty").map(c => (
                <span key={c.key} style={{ color: c.accent }}>{c.label}</span>
              ))}
            </div>
          </div>

          {/* ── Program editor ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.45rem",
            }}>
              If … do …
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
              {conds.map(({ key, label, accent }) => (
                <div key={key} style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.32rem 0.5rem",
                  border: `1px solid ${accent}28`,
                }}>
                  <span style={{
                    fontSize: "0.76rem", fontWeight: 700, color: accent,
                    minWidth: 80, flexShrink: 0,
                  }}>{label}</span>
                  <select
                    value={program[key]}
                    onChange={e => handleProgChange(key, e.target.value as Act)}
                    disabled={isRun}
                    style={{
                      flex: 1, background: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.22rem 0.35rem",
                      fontSize: "0.76rem",
                      cursor: isRun ? "not-allowed" : "pointer",
                    }}
                  >
                    {(["fwd","left","right","back"] as Act[]).map(a => (
                      <option key={a} value={a}>{ACT_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Hint */}
            <div style={{
              marginTop: "0.55rem", padding: "0.4rem 0.6rem",
              background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)",
              fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.6,
            }}>
              {phase === "won"  ? "🎉 Perfect program! Try a new level." :
               phase === "over" ? "💡 Adjust your program so the mower reaches all the grass." :
               "💡 Pick an action for each tile type. The mower loops your program until done or out of steps."}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.gameControls} style={{ marginTop:"0.6rem" }}>
        {!isDone && (
          <>
            <button
              className={styles.resetBtn}
              onClick={isRun ? undefined : runProgram}
              style={{ opacity: isRun ? 0.55 : 1, cursor: isRun ? "not-allowed" : "pointer" }}
            >{isRun ? "⏳ Running…" : "▶ Run"}</button>
            {!isRun && (
              <button onClick={stepOnce} style={{
                background:"transparent", border:"1px solid var(--border-highlight)",
                color:"var(--accent-primary)", padding:"0.4rem 1rem",
                borderRadius:"var(--radius-sm)", cursor:"pointer", fontSize:"0.82rem",
              }}>⏭ Step</button>
            )}
            {!isRun && (
              <button onClick={resetLevel} style={{
                background:"transparent", border:"1px solid var(--border-color)",
                color:"var(--text-secondary)", padding:"0.4rem 0.75rem",
                borderRadius:"var(--radius-sm)", cursor:"pointer", fontSize:"0.82rem",
              }}>↩ Reset</button>
            )}
          </>
        )}
        {phase === "won"  && <button className={styles.resetBtn} onClick={() => loadLevel(mode)}>🌿 New Level</button>}
        {phase === "over" && <button className={styles.resetBtn} onClick={resetLevel}>↩ Try Again</button>}
        <button onClick={() => loadLevel(mode)} style={{
          background:"transparent", border:"1px solid var(--border-color)",
          color:"var(--text-secondary)", padding:"0.4rem 1rem",
          borderRadius:"var(--radius-sm)", cursor:"pointer", fontSize:"0.82rem",
        }}>🔄 New Level</button>
      </div>
    </div>
  );
}
