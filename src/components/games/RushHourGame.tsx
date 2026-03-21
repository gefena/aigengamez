"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import styles from "@/app/page.module.css";

// ── Types ────────────────────────────────────────────────────────────────────
type Dir = "h" | "v";
type Size = 2 | 3;

interface Vehicle {
  id: string;
  dir: Dir;
  size: Size;
  row: number;
  col: number;
}

type Board = Vehicle[];
type Phase = "idle" | "playing" | "solved";

// ── BFS Solver ───────────────────────────────────────────────────────────────
function stateKey(board: Board): string {
  return board.map(v => `${v.id}:${v.row},${v.col}`).sort().join("|");
}

function isSolved(board: Board): boolean {
  const red = board.find(v => v.id === "R")!;
  return red.col + red.size >= 6;
}

function cellsOccupied(v: Vehicle): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < v.size; i++) {
    cells.push(v.dir === "h" ? [v.row, v.col + i] : [v.row + i, v.col]);
  }
  return cells;
}

function occupancyGrid(board: Board, excludeId?: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: 6 }, () => Array(6).fill(false));
  for (const v of board) {
    if (v.id === excludeId) continue;
    for (const [r, c] of cellsOccupied(v)) {
      if (r >= 0 && r < 6 && c >= 0 && c < 6) grid[r][c] = true;
    }
  }
  return grid;
}

function allMoves(board: Board): Board[] {
  const result: Board[] = [];
  for (const v of board) {
    const others = occupancyGrid(board, v.id);
    if (v.dir === "h") {
      for (let delta = -1; v.col + delta >= 0; delta--) {
        if (others[v.row][v.col + delta]) break;
        result.push(board.map(x => x.id === v.id ? { ...v, col: v.col + delta } : x));
      }
      for (let delta = 1; v.col + v.size - 1 + delta < 6; delta++) {
        if (others[v.row][v.col + v.size - 1 + delta]) break;
        result.push(board.map(x => x.id === v.id ? { ...v, col: v.col + delta } : x));
      }
    } else {
      for (let delta = -1; v.row + delta >= 0; delta--) {
        if (others[v.row + delta][v.col]) break;
        result.push(board.map(x => x.id === v.id ? { ...v, row: v.row + delta } : x));
      }
      for (let delta = 1; v.row + v.size - 1 + delta < 6; delta++) {
        if (others[v.row + v.size - 1 + delta][v.col]) break;
        result.push(board.map(x => x.id === v.id ? { ...v, row: v.row + delta } : x));
      }
    }
  }
  return result;
}

function bfsSolve(board: Board): number {
  const visited = new Set<string>();
  const queue: [Board, number][] = [[board, 0]];
  visited.add(stateKey(board));
  while (queue.length > 0) {
    const [cur, depth] = queue.shift()!;
    for (const next of allMoves(cur)) {
      if (isSolved(next)) return depth + 1;
      const key = stateKey(next);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([next, depth + 1]);
      }
    }
  }
  return -1;
}

// ── Puzzles ───────────────────────────────────────────────────────────────────
const PUZZLES: { label: string; board: Board }[] = [
  {
    label: "Beginner",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 1 },
      { id: "A", dir: "v", size: 2, row: 0, col: 3 },
      { id: "B", dir: "h", size: 2, row: 0, col: 4 },
      { id: "C", dir: "v", size: 2, row: 3, col: 3 },
    ],
  },
  {
    label: "Easy",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "v", size: 2, row: 1, col: 3 },
      { id: "B", dir: "h", size: 2, row: 5, col: 3 },
      { id: "C", dir: "h", size: 2, row: 3, col: 2 },
      { id: "D", dir: "v", size: 2, row: 1, col: 2 },
    ],
  },
  {
    label: "Easy",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "v", size: 2, row: 0, col: 2 },
      { id: "B", dir: "h", size: 3, row: 1, col: 3 },
      { id: "C", dir: "v", size: 2, row: 2, col: 3 },
      { id: "D", dir: "v", size: 2, row: 4, col: 2 },
    ],
  },
  {
    label: "Medium",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 1 },
      { id: "A", dir: "v", size: 3, row: 0, col: 3 },
      { id: "B", dir: "h", size: 2, row: 0, col: 4 },
      { id: "C", dir: "v", size: 2, row: 1, col: 0 },
      { id: "D", dir: "h", size: 2, row: 3, col: 0 },
      { id: "E", dir: "v", size: 2, row: 3, col: 4 },
    ],
  },
  {
    label: "Medium",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "v", size: 3, row: 2, col: 2 },
      { id: "B", dir: "v", size: 2, row: 3, col: 5 },
      { id: "C", dir: "h", size: 2, row: 1, col: 4 },
      { id: "D", dir: "h", size: 2, row: 4, col: 3 },
      { id: "E", dir: "v", size: 2, row: 3, col: 1 },
      { id: "F", dir: "v", size: 3, row: 0, col: 3 },
    ],
  },
  {
    label: "Medium",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 1 },
      { id: "A", dir: "v", size: 2, row: 0, col: 0 },
      { id: "B", dir: "v", size: 2, row: 0, col: 3 },
      { id: "C", dir: "h", size: 2, row: 0, col: 4 },
      { id: "D", dir: "v", size: 2, row: 2, col: 4 },
      { id: "E", dir: "h", size: 2, row: 3, col: 2 },
      { id: "F", dir: "v", size: 2, row: 4, col: 0 },
    ],
  },
  {
    label: "Hard",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "v", size: 3, row: 2, col: 2 },
      { id: "B", dir: "h", size: 3, row: 5, col: 1 },
      { id: "C", dir: "h", size: 2, row: 4, col: 4 },
      { id: "D", dir: "v", size: 2, row: 0, col: 0 },
      { id: "E", dir: "v", size: 2, row: 3, col: 0 },
      { id: "F", dir: "v", size: 3, row: 1, col: 5 },
      { id: "G", dir: "h", size: 2, row: 0, col: 2 },
    ],
  },
  {
    label: "Hard",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "v", size: 2, row: 4, col: 3 },
      { id: "B", dir: "h", size: 2, row: 1, col: 2 },
      { id: "C", dir: "h", size: 2, row: 5, col: 4 },
      { id: "D", dir: "v", size: 2, row: 1, col: 5 },
      { id: "E", dir: "v", size: 3, row: 0, col: 4 },
      { id: "F", dir: "v", size: 2, row: 3, col: 0 },
      { id: "G", dir: "v", size: 2, row: 0, col: 1 },
      { id: "H", dir: "v", size: 2, row: 2, col: 3 },
    ],
  },
  {
    label: "Hard",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "v", size: 3, row: 0, col: 2 },
      { id: "B", dir: "h", size: 2, row: 0, col: 3 },
      { id: "C", dir: "v", size: 2, row: 0, col: 5 },
      { id: "D", dir: "h", size: 2, row: 1, col: 3 },
      { id: "E", dir: "v", size: 2, row: 2, col: 4 },
      { id: "F", dir: "h", size: 2, row: 3, col: 0 },
      { id: "G", dir: "v", size: 2, row: 3, col: 3 },
      { id: "H", dir: "h", size: 2, row: 4, col: 1 },
      { id: "I", dir: "v", size: 2, row: 4, col: 4 },
    ],
  },
  {
    label: "Expert",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "h", size: 3, row: 1, col: 2 },
      { id: "B", dir: "v", size: 2, row: 4, col: 2 },
      { id: "C", dir: "v", size: 2, row: 4, col: 0 },
      { id: "D", dir: "v", size: 3, row: 2, col: 3 },
      { id: "E", dir: "h", size: 2, row: 5, col: 4 },
      { id: "F", dir: "v", size: 2, row: 2, col: 2 },
      { id: "G", dir: "h", size: 2, row: 3, col: 4 },
      { id: "H", dir: "h", size: 3, row: 0, col: 2 },
      { id: "I", dir: "v", size: 2, row: 1, col: 5 },
    ],
  },
];

// ── Colors ────────────────────────────────────────────────────────────────────
const VEHICLE_COLORS: Record<string, string> = {
  R: "#ef4444",
  A: "#3b82f6",
  B: "#f59e0b",
  C: "#10b981",
  D: "#8b5cf6",
  E: "#f97316",
  F: "#06b6d4",
  G: "#ec4899",
  H: "#84cc16",
  I: "#6366f1",
  J: "#14b8a6",
  K: "#e879f9",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function canSlide(board: Board, vid: string, delta: number): boolean {
  const v = board.find(x => x.id === vid);
  if (!v) return false;
  const others = occupancyGrid(board, vid);
  if (v.dir === "h") {
    if (delta < 0) {
      for (let d = -1; d >= delta; d--) {
        if (v.col + d < 0 || others[v.row][v.col + d]) return false;
      }
    } else {
      for (let d = 1; d <= delta; d++) {
        if (v.col + v.size - 1 + d >= 6 || others[v.row][v.col + v.size - 1 + d]) return false;
      }
    }
  } else {
    if (delta < 0) {
      for (let d = -1; d >= delta; d--) {
        if (v.row + d < 0 || others[v.row + d][v.col]) return false;
      }
    } else {
      for (let d = 1; d <= delta; d++) {
        if (v.row + v.size - 1 + d >= 6 || others[v.row + v.size - 1 + d][v.col]) return false;
      }
    }
  }
  return true;
}

function slideVehicle(board: Board, vid: string, delta: number): Board {
  return board.map(v => {
    if (v.id !== vid) return v;
    return v.dir === "h" ? { ...v, col: v.col + delta } : { ...v, row: v.row + delta };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RushHourGame({ title }: { title: string }) {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [board, setBoard] = useState<Board>(() => PUZZLES[0].board.map(v => ({ ...v })));
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [moves, setMoves] = useState(0);
  const [minMoves, setMinMoves] = useState<number>(-1);
  const [cellPx, setCellPx] = useState(60);

  // Touch state for swipe detection per vehicle
  const touchStart = useRef<{ x: number; y: number; vid: string } | null>(null);

  useEffect(() => {
    const m = bfsSolve(PUZZLES[puzzleIdx].board);
    setMinMoves(m);
  }, [puzzleIdx]);

  useEffect(() => {
    const update = () => {
      // Use full available width on mobile, cap at 400px
      const w = Math.min(window.innerWidth - 24, 400);
      setCellPx(Math.floor(w / 6));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const boardPx = cellPx * 6;

  const startPuzzle = useCallback((idx: number) => {
    setPuzzleIdx(idx);
    setBoard(PUZZLES[idx].board.map(v => ({ ...v })));
    setSelected(null);
    setMoves(0);
    setPhase("playing");
  }, []);

  const resetPuzzle = useCallback(() => {
    setBoard(PUZZLES[puzzleIdx].board.map(v => ({ ...v })));
    setSelected(null);
    setMoves(0);
    setPhase("playing");
  }, [puzzleIdx]);

  useEffect(() => {
    if (phase === "playing" && isSolved(board)) {
      setPhase("solved");
      setSelected(null);
    }
  }, [board, phase]);

  // Slide by delta steps (±1 or ±max)
  const slide = useCallback((vid: string, delta: number) => {
    if (phase !== "playing") return;
    if (!canSlide(board, vid, delta)) return;
    setBoard(prev => slideVehicle(prev, vid, delta));
    setMoves(m => m + 1);
  }, [board, phase]);

  // Direction pad: slide one step
  const slideOne = useCallback((dir: "left" | "right" | "up" | "down") => {
    if (!selected) return;
    const delta = (dir === "left" || dir === "up") ? -1 : 1;
    slide(selected, delta);
  }, [selected, slide]);

  // Touch handlers — attached to vehicle divs
  function onVehicleTouchStart(e: React.TouchEvent, vid: string) {
    e.stopPropagation();
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, vid };
  }

  function onVehicleTouchEnd(e: React.TouchEvent, vid: string) {
    e.stopPropagation();
    e.preventDefault();
    const ts = touchStart.current;
    touchStart.current = null;
    if (!ts || ts.vid !== vid) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ts.x;
    const dy = t.clientY - ts.y;
    const threshold = 20;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      // Tap — select / deselect
      if (selected === vid) setSelected(null);
      else setSelected(vid);
      return;
    }

    // Swipe — find vehicle and move it
    const v = board.find(x => x.id === vid);
    if (!v || phase !== "playing") return;

    if (v.dir === "h" && Math.abs(dx) > Math.abs(dy)) {
      const delta = dx > 0 ? 1 : -1;
      slide(vid, delta);
      setSelected(vid);
    } else if (v.dir === "v" && Math.abs(dy) > Math.abs(dx)) {
      const delta = dy > 0 ? 1 : -1;
      slide(vid, delta);
      setSelected(vid);
    }
    // Swipe in wrong axis — just select
    else {
      setSelected(vid);
    }
  }

  // Click on empty cell to move selected vehicle there (desktop UX)
  function handleCellClick(row: number, col: number) {
    if (phase !== "playing") return;

    const clicked = board.find(v =>
      cellsOccupied(v).some(([r, c]) => r === row && c === col)
    );

    if (selected) {
      const sv = board.find(v => v.id === selected)!;
      const others = occupancyGrid(board, selected);
      let canMove = false;
      let delta = 0;

      if (sv.dir === "h" && row === sv.row) {
        delta = col - sv.col; // positive = right; might need to check full slide
        // Check if any cells between current and target are blocked
        if (delta !== 0) {
          let ok = true;
          if (delta < 0) {
            for (let d = -1; d >= delta; d--) {
              if (sv.col + d < 0 || others[sv.row][sv.col + d]) { ok = false; break; }
            }
          } else {
            for (let d = 1; d <= delta; d++) {
              if (sv.col + sv.size - 1 + d >= 6 || others[sv.row][sv.col + sv.size - 1 + d]) { ok = false; break; }
            }
            // Adjust: user clicked inside the vehicle range, treat as no-op
            if (col >= sv.col && col < sv.col + sv.size) { ok = false; delta = 0; }
          }
          canMove = ok;
        }
      } else if (sv.dir === "v" && col === sv.col) {
        delta = row - sv.row;
        if (delta !== 0) {
          let ok = true;
          if (delta < 0) {
            for (let d = -1; d >= delta; d--) {
              if (sv.row + d < 0 || others[sv.row + d][sv.col]) { ok = false; break; }
            }
          } else {
            for (let d = 1; d <= delta; d++) {
              if (sv.row + sv.size - 1 + d >= 6 || others[sv.row + sv.size - 1 + d][sv.col]) { ok = false; break; }
            }
            if (row >= sv.row && row < sv.row + sv.size) { ok = false; delta = 0; }
          }
          canMove = ok;
        }
      }

      if (canMove && delta !== 0) {
        setBoard(prev => slideVehicle(prev, selected, delta));
        setMoves(m => m + 1);
        setSelected(null);
        return;
      }

      if (clicked?.id === selected) { setSelected(null); return; }
    }

    if (clicked) setSelected(clicked.id);
    else setSelected(null);
  }

  // Precompute valid cells for highlight
  const validCells = new Set<string>();
  if (selected && phase === "playing") {
    const v = board.find(x => x.id === selected)!;
    const others = occupancyGrid(board, selected);
    if (v.dir === "h") {
      for (let c = v.col - 1; c >= 0; c--) {
        if (others[v.row][c]) break;
        for (let i = 0; i < v.size; i++) validCells.add(`${v.row},${c + i}`);
      }
      for (let c = v.col + 1; c + v.size - 1 < 6; c++) {
        if (others[v.row][c + v.size - 1]) break;
        for (let i = 0; i < v.size; i++) validCells.add(`${v.row},${c + i}`);
      }
    } else {
      for (let r = v.row - 1; r >= 0; r--) {
        if (others[r][v.col]) break;
        for (let i = 0; i < v.size; i++) validCells.add(`${r + i},${v.col}`);
      }
      for (let r = v.row + 1; r + v.size - 1 < 6; r++) {
        if (others[r + v.size - 1][v.col]) break;
        for (let i = 0; i < v.size; i++) validCells.add(`${r + i},${v.col}`);
      }
    }
  }

  const gap = Math.max(2, Math.round(cellPx * 0.04));
  const selVehicle = selected ? board.find(v => v.id === selected) : null;

  return (
    <div className={styles.gameInner} style={{ userSelect: "none", touchAction: "pan-y" }}>
      <h2 className={styles.gameTitle}>{title}</h2>

      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "6px 0" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", maxWidth: 360, lineHeight: 1.5, margin: 0 }}>
            Slide the cars to let the <span style={{ color: "#ef4444", fontWeight: 700 }}>red car 🚗</span> escape through the right exit.
            <br /><span style={{ fontSize: 12 }}>Swipe vehicles or tap to select, then use arrows.</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, width: "100%", maxWidth: 360 }}>
            {PUZZLES.map((p, i) => (
              <button
                key={i}
                onClick={() => startPuzzle(i)}
                style={{
                  padding: "10px 12px", borderRadius: 10,
                  border: "1px solid #334155", background: "#1e293b",
                  color: "#e2e8f0", fontSize: 14, cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 700 }}>Puzzle {i + 1}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>{p.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {(phase === "playing" || phase === "solved") && (
        <>
          {/* Info bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8, maxWidth: boardPx + 24, width: "100%",
          }}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>
              Puzzle {puzzleIdx + 1} · {PUZZLES[puzzleIdx].label}
              {minMoves > 0 && <span style={{ color: "#64748b" }}> · best {minMoves}</span>}
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>
              {moves} move{moves !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Board + exit wrapper */}
          <div style={{ position: "relative", width: boardPx + 24, maxWidth: "100%", flexShrink: 0 }}>
            {/* Board */}
            <div
              style={{
                position: "relative", width: boardPx, height: boardPx,
                background: "#1e293b", border: "3px solid #334155",
                borderRadius: 8, overflow: "hidden",
                touchAction: "none",
              }}
              onClick={e => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const col = Math.floor((e.clientX - rect.left) / cellPx);
                const row = Math.floor((e.clientY - rect.top) / cellPx);
                if (col >= 0 && col < 6 && row >= 0 && row < 6) handleCellClick(row, col);
              }}
            >
              {/* Grid cells */}
              {Array.from({ length: 36 }, (_, i) => {
                const r = Math.floor(i / 6);
                const c = i % 6;
                const isValid = validCells.has(`${r},${c}`);
                const isExit = r === 2 && c === 5;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: c * cellPx, top: r * cellPx,
                      width: cellPx, height: cellPx,
                      background: isValid
                        ? "rgba(99,102,241,0.22)"
                        : isExit ? "rgba(239,68,68,0.10)" : "transparent",
                      border: "1px solid #0f172a",
                      boxSizing: "border-box",
                      pointerEvents: "none",
                    }}
                  />
                );
              })}

              {/* Vehicles */}
              {board.map(v => {
                const isRed = v.id === "R";
                const isSel = v.id === selected;
                const color = VEHICLE_COLORS[v.id] ?? "#6b7280";
                const vw = v.dir === "h" ? v.size * cellPx - gap * 2 : cellPx - gap * 2;
                const vh = v.dir === "v" ? v.size * cellPx - gap * 2 : cellPx - gap * 2;
                return (
                  <div
                    key={v.id}
                    onTouchStart={e => onVehicleTouchStart(e, v.id)}
                    onTouchEnd={e => onVehicleTouchEnd(e, v.id)}
                    onClick={e => {
                      e.stopPropagation();
                      if (phase !== "playing") return;
                      if (selected === v.id) setSelected(null);
                      else setSelected(v.id);
                    }}
                    style={{
                      position: "absolute",
                      left: v.col * cellPx + gap,
                      top: v.row * cellPx + gap,
                      width: vw, height: vh,
                      background: color,
                      borderRadius: 6,
                      cursor: "pointer",
                      border: isSel ? "3px solid #fff" : isRed ? "2px solid #fca5a5" : "2px solid rgba(255,255,255,0.25)",
                      boxSizing: "border-box",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: isRed ? Math.round(cellPx * 0.38) : 11,
                      color: "#fff", fontWeight: 700,
                      transition: "left 0.1s ease, top 0.1s ease",
                      boxShadow: isSel
                        ? `0 0 0 2px ${color}, 0 4px 14px rgba(0,0,0,0.5)`
                        : "0 2px 8px rgba(0,0,0,0.35)",
                      zIndex: isSel ? 10 : 1,
                      touchAction: "none",
                    }}
                  >
                    {isRed ? "🚗" : ""}
                  </div>
                );
              })}

              {/* Solved overlay */}
              {phase === "solved" && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.72)", borderRadius: 6,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 10, zIndex: 20,
                }}>
                  <div style={{ fontSize: 44 }}>🎉</div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>Escaped!</div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    {moves} move{moves !== 1 ? "s" : ""}
                    {minMoves > 0 && moves === minMoves ? " · Perfect! 🌟" : minMoves > 0 ? ` · best: ${minMoves}` : ""}
                  </div>
                </div>
              )}
            </div>

            {/* Exit indicator */}
            <div style={{
              position: "absolute",
              right: 0, top: cellPx * 2,
              width: 24, height: cellPx,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#ef4444", fontSize: 16, fontWeight: 900, pointerEvents: "none",
            }}>▶</div>
          </div>

          {/* Direction pad — visible when a vehicle is selected */}
          <div style={{
            marginTop: 12,
            minHeight: 64,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            {selVehicle && phase === "playing" ? (
              <>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 2 }}>
                  Move {selVehicle.id === "R" ? "🚗 red car" : `car ${selVehicle.id}`}
                  {selVehicle.dir === "h" ? " ← →" : " ↑ ↓"}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {selVehicle.dir === "h" ? (
                    <>
                      <DirButton label="◀" disabled={!canSlide(board, selVehicle.id, -1)} onPress={() => slideOne("left")} />
                      <DirButton label="▶" disabled={!canSlide(board, selVehicle.id, 1)} onPress={() => slideOne("right")} />
                    </>
                  ) : (
                    <>
                      <DirButton label="▲" disabled={!canSlide(board, selVehicle.id, -1)} onPress={() => slideOne("up")} />
                      <DirButton label="▼" disabled={!canSlide(board, selVehicle.id, 1)} onPress={() => slideOne("down")} />
                    </>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      width: 50, height: 50, borderRadius: 10,
                      border: "1px solid #334155", background: "#1e293b",
                      color: "#64748b", fontSize: 18, cursor: "pointer",
                    }}
                  >✕</button>
                </div>
              </>
            ) : phase === "playing" ? (
              <div style={{ color: "#475569", fontSize: 13 }}>
                Tap or swipe a car to move it
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <div style={{
            display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", justifyContent: "center",
            borderTop: "1px solid #1e293b", paddingTop: 14, width: "100%", maxWidth: boardPx + 24,
          }}>
            <button onClick={resetPuzzle} className={styles.resetBtn}>↺ Reset</button>
            {phase === "solved" && (
              <button
                onClick={() => startPuzzle((puzzleIdx + 1) % PUZZLES.length)}
                style={{
                  padding: "10px 22px", borderRadius: 8, border: "none",
                  background: "#3b82f6", color: "#fff", fontWeight: 700,
                  cursor: "pointer", fontSize: 15,
                }}
              >Next →</button>
            )}
            <button
              onClick={() => { setPhase("idle"); setSelected(null); }}
              style={{
                padding: "10px 18px", borderRadius: 8, border: "1px solid #334155",
                background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 15,
              }}
            >All Puzzles</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Direction button ──────────────────────────────────────────────────────────
function DirButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        width: 56, height: 56, borderRadius: 12,
        border: disabled ? "1px solid #1e293b" : "2px solid #3b82f6",
        background: disabled ? "#0f172a" : "linear-gradient(135deg,#1e40af,#2563eb)",
        color: disabled ? "#334155" : "#fff",
        fontSize: 22, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: disabled ? "none" : "0 2px 8px rgba(59,130,246,0.4)",
        transition: "all 0.1s",
      }}
    >{label}</button>
  );
}
