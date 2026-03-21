"use client";
import React, { useState, useCallback, useEffect } from "react";
import styles from "@/app/page.module.css";

// ── Types ────────────────────────────────────────────────────────────────────
type Dir = "h" | "v";
type Size = 2 | 3;

interface Vehicle {
  id: string;
  dir: Dir;
  size: Size;
  row: number; // top-left row
  col: number; // top-left col
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
      // slide left
      for (let delta = -1; v.col + delta >= 0; delta--) {
        if (others[v.row][v.col + delta]) break;
        result.push(board.map(x => x.id === v.id ? { ...v, col: v.col + delta } : x));
      }
      // slide right
      for (let delta = 1; v.col + v.size - 1 + delta < 6; delta++) {
        if (others[v.row][v.col + v.size - 1 + delta]) break;
        result.push(board.map(x => x.id === v.id ? { ...v, col: v.col + delta } : x));
      }
    } else {
      // slide up
      for (let delta = -1; v.row + delta >= 0; delta--) {
        if (others[v.row + delta][v.col]) break;
        result.push(board.map(x => x.id === v.id ? { ...v, row: v.row + delta } : x));
      }
      // slide down
      for (let delta = 1; v.row + v.size - 1 + delta < 6; delta++) {
        if (others[v.row + v.size - 1 + delta][v.col]) break;
        result.push(board.map(x => x.id === v.id ? { ...v, row: v.row + delta } : x));
      }
    }
  }
  return result;
}

function bfsSolve(board: Board): number {
  // Returns minimum moves to solve, or -1 if unsolvable
  const visited = new Set<string>();
  const queue: [Board, number][] = [[board, 0]];
  visited.add(stateKey(board));
  while (queue.length > 0) {
    const [cur, depth] = queue.shift()!;
    if (depth > 25) continue; // skip deep states
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

// ── Hand-coded Puzzles ───────────────────────────────────────────────────────
// R = red car (horizontal, size 2, row 2)
// Difficulty: easy = ~5 moves, medium = ~10 moves, hard = ~15+ moves

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
      { id: "A", dir: "v", size: 3, row: 0, col: 2 },
      { id: "B", dir: "h", size: 2, row: 0, col: 3 },
      { id: "C", dir: "v", size: 2, row: 3, col: 2 },
      { id: "D", dir: "h", size: 2, row: 5, col: 3 },
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
      { id: "A", dir: "v", size: 2, row: 0, col: 2 },
      { id: "B", dir: "h", size: 2, row: 1, col: 3 },
      { id: "C", dir: "v", size: 3, row: 0, col: 5 },
      { id: "D", dir: "h", size: 2, row: 2, col: 3 },
      { id: "E", dir: "v", size: 2, row: 4, col: 2 },
      { id: "F", dir: "h", size: 2, row: 4, col: 3 },
    ],
  },
  {
    label: "Medium",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 1 },
      { id: "A", dir: "v", size: 2, row: 0, col: 0 },
      { id: "B", dir: "v", size: 2, row: 0, col: 3 },
      { id: "C", dir: "h", size: 3, row: 0, col: 3 },
      { id: "D", dir: "v", size: 2, row: 2, col: 4 },
      { id: "E", dir: "h", size: 2, row: 3, col: 2 },
      { id: "F", dir: "v", size: 2, row: 4, col: 0 },
    ],
  },
  {
    label: "Hard",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "v", size: 2, row: 0, col: 2 },
      { id: "B", dir: "h", size: 2, row: 0, col: 3 },
      { id: "C", dir: "v", size: 3, row: 0, col: 5 },
      { id: "D", dir: "v", size: 2, row: 1, col: 0 },
      { id: "E", dir: "h", size: 2, row: 2, col: 3 },
      { id: "F", dir: "v", size: 2, row: 3, col: 2 },
      { id: "G", dir: "h", size: 3, row: 3, col: 3 },
      { id: "H", dir: "v", size: 2, row: 4, col: 0 },
    ],
  },
  {
    label: "Hard",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 1 },
      { id: "A", dir: "v", size: 2, row: 0, col: 0 },
      { id: "B", dir: "h", size: 2, row: 0, col: 1 },
      { id: "C", dir: "v", size: 3, row: 0, col: 3 },
      { id: "D", dir: "h", size: 2, row: 1, col: 4 },
      { id: "E", dir: "v", size: 2, row: 2, col: 4 },
      { id: "F", dir: "v", size: 2, row: 2, col: 5 },
      { id: "G", dir: "h", size: 2, row: 3, col: 0 },
      { id: "H", dir: "v", size: 2, row: 4, col: 3 },
      { id: "I", dir: "h", size: 2, row: 5, col: 1 },
    ],
  },
  {
    label: "Hard",
    board: [
      { id: "R", dir: "h", size: 2, row: 2, col: 0 },
      { id: "A", dir: "v", size: 3, row: 0, col: 2 },
      { id: "B", dir: "h", size: 2, row: 0, col: 3 },
      { id: "C", dir: "v", size: 2, row: 0, col: 5 },
      { id: "D", dir: "h", size: 3, row: 1, col: 3 },
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
      { id: "A", dir: "v", size: 2, row: 0, col: 0 },
      { id: "B", dir: "h", size: 3, row: 0, col: 1 },
      { id: "C", dir: "v", size: 3, row: 0, col: 4 },
      { id: "D", dir: "v", size: 2, row: 1, col: 2 },
      { id: "E", dir: "h", size: 2, row: 2, col: 3 },
      { id: "F", dir: "v", size: 2, row: 2, col: 5 },
      { id: "G", dir: "h", size: 2, row: 3, col: 0 },
      { id: "H", dir: "v", size: 3, row: 3, col: 2 },
      { id: "I", dir: "h", size: 2, row: 4, col: 3 },
      { id: "J", dir: "v", size: 2, row: 4, col: 5 },
      { id: "K", dir: "h", size: 2, row: 5, col: 0 },
    ],
  },
];

// ── Colors ───────────────────────────────────────────────────────────────────
const VEHICLE_COLORS: Record<string, string> = {
  R: "#ef4444", // red car — always this
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function RushHourGame({ title }: { title: string }) {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [board, setBoard] = useState<Board>(() =>
    PUZZLES[0].board.map(v => ({ ...v }))
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [moves, setMoves] = useState(0);
  const [minMoves, setMinMoves] = useState<number>(-1);
  const [cellPx, setCellPx] = useState(72);

  // Compute min moves for current puzzle
  useEffect(() => {
    const m = bfsSolve(PUZZLES[puzzleIdx].board);
    setMinMoves(m);
  }, [puzzleIdx]);

  // Responsive cell size
  useEffect(() => {
    const update = () => {
      const w = Math.min(window.innerWidth - 32, 480);
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

  // Check win after board update
  useEffect(() => {
    if (phase === "playing" && isSolved(board)) {
      setPhase("solved");
      setSelected(null);
    }
  }, [board, phase]);

  // Valid slide positions for selected vehicle
  function getValidPositions(vid: string): number[] {
    const v = board.find(x => x.id === vid);
    if (!v) return [];
    const others = occupancyGrid(board, vid);
    const positions: number[] = [];
    if (v.dir === "h") {
      // left
      for (let c = v.col - 1; c >= 0; c--) {
        if (others[v.row][c]) break;
        positions.push(c);
      }
      // right
      for (let c = v.col + 1; c + v.size - 1 < 6; c++) {
        if (others[v.row][c + v.size - 1]) break;
        positions.push(c);
      }
    } else {
      // up
      for (let r = v.row - 1; r >= 0; r--) {
        if (others[r][v.col]) break;
        positions.push(r);
      }
      // down
      for (let r = v.row + 1; r + v.size - 1 < 6; r++) {
        if (others[r + v.size - 1][v.col]) break;
        positions.push(r);
      }
    }
    return positions;
  }

  function handleCellClick(row: number, col: number) {
    if (phase !== "playing") return;

    // Clicked on a vehicle?
    const clicked = board.find(v =>
      cellsOccupied(v).some(([r, c]) => r === row && c === col)
    );

    if (selected) {
      const selVehicle = board.find(v => v.id === selected)!;
      const validPositions = getValidPositions(selected);

      // Clicked on a valid target position?
      const targetPos = selVehicle.dir === "h" ? col : row;
      // Normalize: we need to find if this cell is within a valid col/row range
      const isValid = validPositions.includes(targetPos);

      if (isValid) {
        // Move the vehicle so its leading edge is at targetPos or trailing?
        // We snap to the clicked col/row
        const newBoard = board.map(v => {
          if (v.id !== selected) return v;
          return v.dir === "h" ? { ...v, col: targetPos } : { ...v, row: targetPos };
        });
        setBoard(newBoard);
        setMoves(m => m + 1);
        setSelected(null);
        return;
      }

      // Clicked on same vehicle → deselect
      if (clicked?.id === selected) {
        setSelected(null);
        return;
      }
    }

    if (clicked) {
      setSelected(clicked.id);
    } else {
      setSelected(null);
    }
  }

  // Compute valid target cells for highlight
  const validCells = new Set<string>();
  if (selected && phase === "playing") {
    const v = board.find(x => x.id === selected)!;
    for (const pos of getValidPositions(selected)) {
      for (let i = 0; i < v.size; i++) {
        if (v.dir === "h") validCells.add(`${v.row},${pos + i}`);
        else validCells.add(`${pos + i},${v.col}`);
      }
    }
  }

  const gap = Math.max(2, Math.round(cellPx * 0.04));

  return (
    <div className={styles.gameInner} style={{ userSelect: "none" }}>
      <h2 className={styles.gameTitle}>{title}</h2>

      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0" }}>
          <p style={{ color: "#94a3b8", fontSize: 15, textAlign: "center", maxWidth: 380 }}>
            Slide the cars to let the <span style={{ color: "#ef4444", fontWeight: 700 }}>red car</span> escape through the right exit!
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, width: "100%", maxWidth: 380 }}>
            {PUZZLES.map((p, i) => (
              <button
                key={i}
                onClick={() => startPuzzle(i)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #334155",
                  background: "#1e293b",
                  color: "#e2e8f0",
                  fontSize: 14,
                  cursor: "pointer",
                  textAlign: "left",
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, maxWidth: boardPx, width: "100%" }}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>
              Puzzle {puzzleIdx + 1} · {PUZZLES[puzzleIdx].label}
              {minMoves > 0 && <span style={{ color: "#64748b" }}> · min {minMoves}</span>}
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>
              Moves: {moves}
            </div>
          </div>

          {/* Board */}
          <div style={{ position: "relative", width: boardPx, height: boardPx, flexShrink: 0 }}>
            {/* Grid background */}
            <div
              style={{
                position: "absolute", inset: 0,
                display: "grid",
                gridTemplateColumns: `repeat(6, ${cellPx}px)`,
                gridTemplateRows: `repeat(6, ${cellPx}px)`,
                background: "#1e293b",
                border: "3px solid #334155",
                borderRadius: 8,
                overflow: "hidden",
              }}
              onClick={e => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const col = Math.floor((e.clientX - rect.left) / cellPx);
                const row = Math.floor((e.clientY - rect.top) / cellPx);
                if (col >= 0 && col < 6 && row >= 0 && row < 6) handleCellClick(row, col);
              }}
            >
              {Array.from({ length: 36 }, (_, i) => {
                const r = Math.floor(i / 6);
                const c = i % 6;
                const isValid = validCells.has(`${r},${c}`);
                const isExit = r === 2 && c === 5;
                return (
                  <div
                    key={i}
                    style={{
                      background: isValid ? "rgba(99,102,241,0.18)" : isExit ? "rgba(239,68,68,0.12)" : "transparent",
                      border: "1px solid #0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                );
              })}
            </div>

            {/* Exit arrow */}
            <div style={{
              position: "absolute",
              right: -22,
              top: cellPx * 2,
              height: cellPx,
              display: "flex",
              alignItems: "center",
              color: "#ef4444",
              fontSize: 18,
              fontWeight: 900,
              pointerEvents: "none",
            }}>▶</div>

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
                    width: vw,
                    height: vh,
                    background: color,
                    borderRadius: 6,
                    cursor: "pointer",
                    border: isSel ? "3px solid #fff" : isRed ? "2px solid #fca5a5" : "2px solid rgba(255,255,255,0.2)",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isRed ? 20 : 12,
                    color: "#fff",
                    fontWeight: 700,
                    transition: "left 0.12s ease, top 0.12s ease, border 0.1s",
                    boxShadow: isSel ? `0 0 0 2px ${color}, 0 4px 12px rgba(0,0,0,0.4)` : "0 2px 8px rgba(0,0,0,0.3)",
                    zIndex: isSel ? 10 : 1,
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
                background: "rgba(0,0,0,0.7)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                zIndex: 20,
              }}>
                <div style={{ fontSize: 48 }}>🎉</div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>Escaped!</div>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>
                  {moves} move{moves !== 1 ? "s" : ""}
                  {minMoves > 0 && moves === minMoves ? " · Perfect! 🌟" : minMoves > 0 ? ` · Best: ${minMoves}` : ""}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={resetPuzzle}
              className={styles.resetBtn}
            >
              ↺ Reset
            </button>
            {phase === "solved" ? (
              <button
                onClick={() => startPuzzle((puzzleIdx + 1) % PUZZLES.length)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#3b82f6",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Next Puzzle →
              </button>
            ) : null}
            <button
              onClick={() => { setPhase("idle"); setSelected(null); }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              All Puzzles
            </button>
          </div>
        </>
      )}
    </div>
  );
}
