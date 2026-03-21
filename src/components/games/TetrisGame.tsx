"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../../app/games/[id]/page.module.css";

type Phase = "idle" | "playing" | "over";
type Mode = "kids" | "adult";

const COLS = 10;
const ROWS = 20;

type Cell = string | null; // null = empty, "#rrggbb" = filled, ends with "44" = ghost
type Board = Cell[][];
type Shape = boolean[][];

const PIECE_DEFS: { shape: Shape; color: string }[] = [
  { shape: [[true, true, true, true]], color: "#22d3ee" },                          // I
  { shape: [[true, true], [true, true]], color: "#fbbf24" },                        // O
  { shape: [[false, true, false], [true, true, true]], color: "#a855f7" },          // T
  { shape: [[true, false], [true, false], [true, true]], color: "#3b82f6" },        // J
  { shape: [[false, true], [false, true], [true, true]], color: "#f97316" },        // L
  { shape: [[false, true, true], [true, true, false]], color: "#4ade80" },          // S
  { shape: [[true, true, false], [false, true, true]], color: "#f43f5e" },          // Z
];
const KIDS_IDX = [0, 1, 2, 4]; // I, O, T, L only
const SCORE_TBL = [0, 100, 300, 500, 800];

function rotCW(s: Shape): Shape {
  const R = s.length, C = s[0].length;
  return Array.from({ length: C }, (_, c) =>
    Array.from({ length: R }, (_, r) => s[R - 1 - r][c])
  );
}

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

interface Piece { shape: Shape; color: string; x: number; y: number; }

function spawnPiece(mode: Mode): Piece {
  const pool = mode === "kids" ? KIDS_IDX : PIECE_DEFS.map((_, i) => i);
  const def = PIECE_DEFS[pool[Math.floor(Math.random() * pool.length)]];
  return { shape: def.shape, color: def.color, x: Math.floor((COLS - def.shape[0].length) / 2), y: 0 };
}

function fits(board: Board, p: Piece, dx = 0, dy = 0, shape: Shape = p.shape): boolean {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = p.y + dy + r, nc = p.x + dx + c;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc]) return false;
    }
  return true;
}

function lockPiece(board: Board, p: Piece): Board {
  const b = board.map(r => [...r]);
  for (let r = 0; r < p.shape.length; r++)
    for (let c = 0; c < p.shape[r].length; c++)
      if (p.shape[r][c]) b[p.y + r][p.x + c] = p.color;
  return b;
}

function sweepLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter(row => row.some(c => !c));
  const cleared = ROWS - kept.length;
  return { board: [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...kept], cleared };
}

function dropMs(level: number, mode: Mode) {
  return Math.max(80, (mode === "kids" ? 850 : 520) - level * (mode === "kids" ? 55 : 48));
}

const KF = `
@keyframes bdPopIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
@keyframes bdFlash { 0%{opacity:1} 50%{opacity:0.3} 100%{opacity:1} }
`;

const NEXT_SIZE = 4;

export default function TetrisGame({ title }: { title: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("kids");
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [, setTick] = useState(0);
  const [cellPx, setCellPx] = useState(22);

  const boardRef = useRef<Board>(emptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const nextRef = useRef<Piece | null>(null);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const modeRef = useRef<Mode>("kids");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const bump = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const maxByW = Math.floor((w - 92) / COLS); // 92 = sidebar + gap
      const maxByH = Math.floor((window.innerHeight * 0.60) / ROWS);
      setCellPx(Math.max(14, Math.min(26, maxByW, maxByH)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const doLock = useCallback((p: Piece, extraScore = 0) => {
    const board = lockPiece(boardRef.current, p);
    const { board: swept, cleared } = sweepLines(board);
    boardRef.current = swept;
    scoreRef.current += SCORE_TBL[cleared] * (levelRef.current + 1) + extraScore;
    if (cleared) {
      linesRef.current += cleared;
      levelRef.current = Math.floor(linesRef.current / 10);
    }
    setScore(scoreRef.current);
    setLines(linesRef.current);
    setLevel(levelRef.current);
  }, []);

  const doSpawn = useCallback((): boolean => {
    const p = nextRef.current ?? spawnPiece(modeRef.current);
    nextRef.current = spawnPiece(modeRef.current);
    if (!fits(boardRef.current, p)) {
      phaseRef.current = "over";
      setPhase("over");
      if (timerRef.current) clearTimeout(timerRef.current);
      return false;
    }
    pieceRef.current = p;
    bump();
    return true;
  }, [bump]);

  const scheduleDrop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      const p = pieceRef.current;
      if (!p) { doSpawn(); return; }
      if (fits(boardRef.current, p, 0, 1)) {
        pieceRef.current = { ...p, y: p.y + 1 };
        bump();
        scheduleDrop();
      } else {
        pieceRef.current = null;
        doLock(p);
        if (doSpawn()) scheduleDrop();
      }
    }, dropMs(levelRef.current, modeRef.current));
  }, [bump, doSpawn, doLock]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    boardRef.current = emptyBoard();
    scoreRef.current = 0; linesRef.current = 0; levelRef.current = 0;
    modeRef.current = mode;
    phaseRef.current = "playing";
    setScore(0); setLines(0); setLevel(0);
    setPhase("playing");
    nextRef.current = spawnPiece(mode);
    if (doSpawn()) scheduleDrop();
  }, [mode, doSpawn, scheduleDrop]);

  const moveH = useCallback((dx: number) => {
    const p = pieceRef.current;
    if (!p || phaseRef.current !== "playing") return;
    if (fits(boardRef.current, p, dx, 0)) { pieceRef.current = { ...p, x: p.x + dx }; bump(); }
  }, [bump]);

  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || phaseRef.current !== "playing") return;
    if (fits(boardRef.current, p, 0, 1)) { pieceRef.current = { ...p, y: p.y + 1 }; bump(); scheduleDrop(); }
  }, [bump, scheduleDrop]);

  const rotate = useCallback(() => {
    const p = pieceRef.current;
    if (!p || phaseRef.current !== "playing") return;
    const rot = rotCW(p.shape);
    for (const dx of [0, 1, -1, 2, -2]) {
      if (fits(boardRef.current, { ...p, x: p.x + dx }, 0, 0, rot)) {
        pieceRef.current = { ...p, shape: rot, x: p.x + dx };
        bump(); return;
      }
    }
  }, [bump]);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || phaseRef.current !== "playing") return;
    let dy = 0;
    while (fits(boardRef.current, p, 0, dy + 1)) dy++;
    const dropped = { ...p, y: p.y + dy };
    pieceRef.current = null;
    bump();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doLock(dropped, dy * 2);
      if (doSpawn()) scheduleDrop();
    }, 0);
  }, [bump, doLock, doSpawn, scheduleDrop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      switch (e.key) {
        case "ArrowLeft":  e.preventDefault(); moveH(-1); break;
        case "ArrowRight": e.preventDefault(); moveH(1); break;
        case "ArrowDown":  e.preventDefault(); softDrop(); break;
        case "ArrowUp": case "x": case "X": e.preventDefault(); rotate(); break;
        case " ": e.preventDefault(); hardDrop(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveH, softDrop, rotate, hardDrop]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Build display: board + ghost + piece
  const display: Cell[][] = boardRef.current.map(r => [...r]);
  const cp = pieceRef.current;
  if (cp && phase === "playing") {
    let gy = cp.y;
    while (fits(boardRef.current, { ...cp, y: gy + 1 })) gy++;
    for (let r = 0; r < cp.shape.length; r++)
      for (let c = 0; c < cp.shape[r].length; c++)
        if (cp.shape[r][c]) {
          const nr = gy + r, nc = cp.x + c;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !display[nr][nc])
            display[nr][nc] = cp.color + "44";
        }
    for (let r = 0; r < cp.shape.length; r++)
      for (let c = 0; c < cp.shape[r].length; c++)
        if (cp.shape[r][c]) {
          const nr = cp.y + r, nc = cp.x + c;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) display[nr][nc] = cp.color;
        }
  }

  // Next piece preview
  const nextGrid: Cell[][] = Array.from({ length: NEXT_SIZE }, () => Array(NEXT_SIZE).fill(null));
  const np = nextRef.current;
  if (np) {
    const or = Math.floor((NEXT_SIZE - np.shape.length) / 2);
    const oc = Math.floor((NEXT_SIZE - np.shape[0].length) / 2);
    for (let r = 0; r < np.shape.length; r++)
      for (let c = 0; c < np.shape[r].length; c++)
        if (np.shape[r][c]) nextGrid[or + r][oc + c] = np.color;
  }

  const sc = Math.max(12, Math.floor(cellPx * 0.62)); // sidebar cell px

  const btnSt: React.CSSProperties = {
    padding: "0.5rem", fontSize: "1.15rem",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8, color: "var(--text-primary)",
    cursor: "pointer", userSelect: "none",
    WebkitUserSelect: "none", touchAction: "manipulation",
    flex: 1, textAlign: "center" as const,
  };

  return (
    <div className={styles.gameInner} ref={containerRef}>
      <style>{KF}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { if (phase !== "playing") setMode(m); }}>
            {m === "kids" ? "🧒 Kids (slower)" : "🧑 Adult (full speed)"}
          </button>
        ))}
      </div>

      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", padding: "1.5rem", textAlign: "center", animation: "bdPopIn 0.3s ease-out" }}>
          <div style={{ fontSize: "3rem" }}>🧩</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 300 }}>
            {mode === "kids"
              ? "Fit the falling blocks! ← → to move, ↑ to rotate. Slower pace with friendly piece shapes."
              : "Classic block drop! ← → to move, ↑ or X to rotate, ↓ to soft drop, Space to hard drop. Speed increases every 10 lines!"}
          </p>
          <button className={styles.resetBtn} onClick={startGame} style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>🧩 Start!</button>
        </div>
      )}

      {phase === "over" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem", textAlign: "center", animation: "bdPopIn 0.3s ease-out" }}>
          <div style={{ fontSize: "3rem" }}>{score >= 3000 ? "🏆" : score >= 1000 ? "⭐" : "💪"}</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{score.toLocaleString()} pts</div>
          <div style={{ color: "var(--text-secondary)" }}>{lines} lines · Level {level}</div>
          <div style={{ color: "var(--text-secondary)" }}>
            {score >= 5000 ? "Block drop master! 🔥" : score >= 2000 ? "Excellent stacking!" : score >= 800 ? "Nice run!" : "Keep practicing!"}
          </div>
          <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: "0.5rem" }}>▶ Play Again</button>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "flex-start" }}>
            {/* Board */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`,
              gap: 1,
              background: "rgba(255,255,255,0.05)",
              border: "2px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              padding: 2,
              flexShrink: 0,
            }}>
              {display.map((row, r) => row.map((cell, c) => {
                const isGhost = cell?.endsWith("44");
                const isReal = cell && !isGhost;
                return (
                  <div key={`${r}-${c}`} style={{
                    width: cellPx, height: cellPx,
                    background: cell ?? "rgba(255,255,255,0.025)",
                    borderRadius: 2,
                    border: isReal
                      ? `1px solid ${cell}99`
                      : isGhost ? `1px solid ${cell}` : "1px solid rgba(255,255,255,0.04)",
                    boxShadow: isReal
                      ? `inset 0 ${Math.round(cellPx / 5)}px 0 rgba(255,255,255,0.35), inset 0 -${Math.round(cellPx / 5)}px 0 rgba(0,0,0,0.3)`
                      : "none",
                  }} />
                );
              }))}
            </div>

            {/* Sidebar: stats + touch controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 80 }}>
              {/* Next piece */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.06em" }}>NEXT</div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${NEXT_SIZE}, ${sc}px)`, gap: 1, margin: "0 auto", width: "fit-content" }}>
                  {nextGrid.map((row, r) => row.map((cell, c) => (
                    <div key={`n${r}-${c}`} style={{
                      width: sc, height: sc,
                      background: cell ?? "transparent",
                      borderRadius: 2,
                      boxShadow: cell ? "inset 0 2px 0 rgba(255,255,255,0.3)" : "none",
                    }} />
                  )))}
                </div>
              </div>

              {/* Stats */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0.4rem 0.6rem", fontSize: "0.68rem" }}>
                <div style={{ color: "var(--text-muted)", letterSpacing: "0.06em" }}>SCORE</div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: 6 }}>{score.toLocaleString()}</div>
                <div style={{ color: "var(--text-muted)", letterSpacing: "0.06em" }}>LINES</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{lines}</div>
                <div style={{ color: "var(--text-muted)", letterSpacing: "0.06em" }}>LEVEL</div>
                <div style={{ fontWeight: 700 }}>{level}</div>
              </div>

              {/* Touch D-pad — always visible, fills remaining sidebar space */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <div style={{ display: "flex" }}>
                  <button onPointerDown={rotate} style={btnSt}>↺</button>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onPointerDown={() => moveH(-1)} style={btnSt}>◀</button>
                  <button onPointerDown={softDrop} style={btnSt}>▼</button>
                  <button onPointerDown={() => moveH(1)} style={btnSt}>▶</button>
                </div>
                <div style={{ display: "flex" }}>
                  <button onPointerDown={hardDrop} style={{ ...btnSt, background: "rgba(139,92,246,0.3)", border: "1px solid rgba(139,92,246,0.5)" }}>⬇</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
