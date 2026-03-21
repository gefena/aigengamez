"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

const ROWS = 6;
const COLS = 7;

type Cell  = 0 | 1 | 2;
type Board = Cell[][];
type Phase = "idle" | "playing" | "over";
type Mode  = "kids" | "easy" | "hard";

const KEYFRAMES = `
@keyframes winPulse {
  0%,100% { transform:scale(1);    filter:brightness(1);   }
  50%      { transform:scale(1.13); filter:brightness(1.6); }
}
@keyframes dropBounce {
  0%   { transform:translateY(-72px); opacity:0; }
  70%  { transform:translateY(4px);   opacity:1; }
  100% { transform:translateY(0);     opacity:1; }
}
`;

// ── Board helpers ─────────────────────────────────────────────────────────────
function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

function dropDisc(board: Board, col: number, player: Cell): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      const next: Board = board.map(row => [...row] as Cell[]);
      next[r][col] = player;
      return next;
    }
  }
  return null;
}

function getDropRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === 0) return r;
  return -1;
}

function checkWin(board: Board, player: Cell): [number, number][] | null {
  const dirs: [number, number][] = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== player) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return null;
}

function isDraw(board: Board): boolean {
  return board[0].every(c => c !== 0);
}

// ── AI: minimax with alpha-beta pruning ───────────────────────────────────────
function scoreWindow(w: Cell[], player: Cell): number {
  const opp: Cell = player === 1 ? 2 : 1;
  const p = w.filter(c => c === player).length;
  const o = w.filter(c => c === opp).length;
  const e = w.filter(c => c === 0).length;
  if (p === 4) return 100;
  if (p === 3 && e === 1) return 5;
  if (p === 2 && e === 2) return 2;
  if (o === 3 && e === 1) return -4;
  return 0;
}

function scoreBoard(board: Board): number {
  const AI: Cell = 2;
  let score = 0;
  for (let r = 0; r < ROWS; r++) if (board[r][3] === AI) score += 3;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], AI);
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c < COLS; c++)
      score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], AI);
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], AI);
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]], AI);
  return score;
}

const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (checkWin(board, 2))              return  100000 + depth;
  if (checkWin(board, 1))              return -(100000 + depth);
  if (isDraw(board) || depth === 0)    return scoreBoard(board);

  if (maximizing) {
    let best = -Infinity;
    for (const c of COL_ORDER) {
      const next = dropDisc(board, c, 2);
      if (!next) continue;
      best  = Math.max(best, minimax(next, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const c of COL_ORDER) {
      const next = dropDisc(board, c, 1);
      if (!next) continue;
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, true));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

function getBestMove(board: Board): number {
  for (const c of COL_ORDER) { const n = dropDisc(board, c, 2); if (n && checkWin(n, 2)) return c; }
  for (const c of COL_ORDER) { const n = dropDisc(board, c, 1); if (n && checkWin(n, 1)) return c; }
  let bestScore = -Infinity, bestCol = 3;
  for (const c of COL_ORDER) {
    const next = dropDisc(board, c, 2);
    if (!next) continue;
    const s = minimax(next, 5, -Infinity, Infinity, false);
    if (s > bestScore) { bestScore = s; bestCol = c; }
  }
  return bestCol;
}

function getEasyMove(board: Board): number {
  // Still take the win
  for (const c of COL_ORDER) { const n = dropDisc(board, c, 2); if (n && checkWin(n, 2)) return c; }
  // Still block an immediate loss
  for (const c of COL_ORDER) { const n = dropDisc(board, c, 1); if (n && checkWin(n, 1)) return c; }
  const validCols = COL_ORDER.filter(c => getDropRow(board, c) !== -1);
  // 45% of the time just pick a random column
  if (Math.random() < 0.45) return validCols[Math.floor(Math.random() * validCols.length)];
  // Otherwise use shallow depth-2 minimax
  let bestScore = -Infinity, bestCol = validCols[0] ?? 3;
  for (const c of validCols) {
    const next = dropDisc(board, c, 2);
    if (!next) continue;
    const s = minimax(next, 2, -Infinity, Infinity, false);
    if (s > bestScore) { bestScore = s; bestCol = c; }
  }
  return bestCol;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FourInARowGame({ title }: { title: string }) {
  const [mode,           setMode]           = useState<Mode>("easy");
  const [phase,          setPhase]          = useState<Phase>("idle");
  const [board,          setBoard]          = useState<Board>(createBoard);
  const [turn,           setTurn]           = useState<1 | 2>(1);
  const [winner,         setWinner]         = useState<1 | 2 | "draw" | null>(null);
  const [winCells,       setWinCells]       = useState<[number, number][]>([]);
  const [aiThinking,     setAiThinking]     = useState(false);
  const [hoverCol,       setHoverCol]       = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(360);
  const [lastCell,       setLastCell]       = useState<[number, number] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef     = useRef<Board>(createBoard());
  const aiThinkRef   = useRef(false);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const updateBoard = useCallback((next: Board) => {
    boardRef.current = next;
    setBoard(next);
  }, []);

  // Apply a disc drop, check win/draw. Returns true if game ended.
  const applyDrop = useCallback((newBoard: Board, player: 1 | 2, row: number, col: number): boolean => {
    setLastCell([row, col]);
    const won = checkWin(newBoard, player);
    if (won)              { updateBoard(newBoard); setWinCells(won); setWinner(player); setPhase("over"); return true; }
    if (isDraw(newBoard)) { updateBoard(newBoard); setWinner("draw"); setPhase("over"); return true; }
    updateBoard(newBoard);
    return false;
  }, [updateBoard]);

  const handleColClick = useCallback((col: number) => {
    if (phase !== "playing" || aiThinkRef.current) return;
    if (mode !== "kids" && turn !== 1) return;
    const player: 1 | 2 = mode !== "kids" ? 1 : turn;
    const row = getDropRow(boardRef.current, col);
    if (row === -1) return;
    const newBoard = dropDisc(boardRef.current, col, player as Cell);
    if (!newBoard) return;
    const over = applyDrop(newBoard, player, row, col);
    if (!over) setTurn(mode !== "kids" ? 2 : (turn === 1 ? 2 : 1));
  }, [phase, mode, turn, applyDrop]);

  // AI turn
  useEffect(() => {
    if (phase !== "playing" || mode === "kids" || turn !== 2) return;
    if (aiThinkRef.current) return;
    aiThinkRef.current = true;
    setAiThinking(true);
    const t = setTimeout(() => {
      const col      = mode === "easy" ? getEasyMove(boardRef.current) : getBestMove(boardRef.current);
      const row      = getDropRow(boardRef.current, col);
      const newBoard = dropDisc(boardRef.current, col, 2 as Cell);
      if (newBoard && row !== -1) {
        const over = applyDrop(newBoard, 2, row, col);
        if (!over) setTurn(1);
      }
      aiThinkRef.current = false;
      setAiThinking(false);
    }, 480);
    return () => clearTimeout(t);
  }, [phase, mode, turn, applyDrop]);

  // Clear drop animation
  useEffect(() => {
    if (!lastCell) return;
    const t = setTimeout(() => setLastCell(null), 400);
    return () => clearTimeout(t);
  }, [lastCell]);

  const clearState = useCallback((nextPhase: Phase) => {
    const fresh = createBoard();
    boardRef.current   = fresh;
    aiThinkRef.current = false;
    setBoard(fresh);
    setPhase(nextPhase);
    setTurn(1);
    setWinner(null);
    setWinCells([]);
    setAiThinking(false);
    setLastCell(null);
    setHoverCol(null);
  }, []);

  const startGame = useCallback(() => clearState("playing"), [clearState]);
  const resetGame = useCallback(() => clearState("idle"),    [clearState]);

  // ── Display values ──────────────────────────────────────────────────────────
  const cellPx = Math.min(74, Math.max(38, Math.floor(containerWidth / COLS) - 6));

  const discGradient = (cell: Cell): string => {
    if (cell === 1) return "radial-gradient(circle at 36% 34%, #fca5a5, #ef4444 55%, #991b1b)";
    if (cell === 2) return "radial-gradient(circle at 36% 34%, #fde68a, #f59e0b 55%, #92400e)";
    return "";
  };

  const p1Label = mode !== "kids" ? "You"    : "Red 🔴";
  const p2Label = mode !== "kids" ? "CPU 🤖" : "Yellow 🟡";
  const p1Color = "#fca5a5";
  const p2Color = "#fde68a";

  const statusText =
    phase === "idle" ? "" :
    phase === "over" ?
      winner === "draw" ? "It's a Draw! 🤝" :
      winner === 1      ? (mode !== "kids" ? "You Win! 🎉" : "Red Wins! 🔴") :
                          (mode !== "kids" ? "CPU Wins! 🤖" : "Yellow Wins! 🟡") :
    aiThinking  ? "CPU is thinking… 🤔" :
    mode !== "kids" ? "Your turn!" :
    turn === 1       ? "Red's turn 🔴" : "Yellow's turn 🟡";

  const statusColor =
    phase === "over" && winner === 1    ? "#86efac" :
    phase === "over" && winner === 2    ? "#fca5a5" :
    phase === "over"                    ? "rgba(255,255,255,0.55)" :
    aiThinking                          ? p2Color : p1Color;

  const canInteract = phase === "playing" && !aiThinking && (mode === "kids" || turn === 1);

  return (
    <div className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Mode selector */}
      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["kids", "easy", "hard"] as Mode[]).map(m => (
          <button key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { setMode(m); resetGame(); }}
          >
            {m === "kids" ? "👥 2-Player" : m === "easy" ? "🐣 Easy AI" : "🤖 Hard AI"}
          </button>
        ))}
      </div>

      {/* ── Idle ── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem", lineHeight: 1.7 }}>
            Drop discs into columns — first to connect <strong>4 in a row</strong> wins!<br />
            Horizontal, vertical, or diagonal.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.83rem", marginBottom: "1.5rem" }}>
            {mode === "kids"
              ? "Pass-and-play — Red 🔴 vs Yellow 🟡"
              : mode === "easy"
              ? "You are Red 🔴 — the CPU makes mistakes. Can you win?"
              : "You are Red 🔴 — beat the full minimax AI. Good luck!"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Start Game</button>
        </div>
      )}

      {/* ── Playing / Over ── */}
      {phase !== "idle" && (
        <>
          {/* Status */}
          <div style={{
            textAlign: "center", fontWeight: 700, fontSize: "0.95rem",
            color: statusColor, minHeight: "1.6rem", marginBottom: "0.35rem",
            transition: "color 0.2s",
          }}>{statusText}</div>

          {/* Turn indicator */}
          {phase === "playing" && (
            <div style={{ display:"flex", justifyContent:"center", gap:"1.25rem", marginBottom:"0.4rem", fontSize:"0.78rem" }}>
              {([1,2] as const).map(p => (
                <div key={p} style={{
                  padding: "0.18rem 0.75rem", borderRadius: 999,
                  background: turn === p && !aiThinking ? `rgba(${p===1?"239,68,68":"245,158,11"},0.18)` : "transparent",
                  color: p === 1 ? p1Color : p2Color,
                  fontWeight: turn === p ? 700 : 400,
                  border: turn === p && !aiThinking ? `1px solid rgba(${p===1?"239,68,68":"245,158,11"},0.35)` : "1px solid transparent",
                  transition: "all 0.2s",
                }}>{p === 1 ? p1Label : p2Label}</div>
              ))}
            </div>
          )}

          {/* Board */}
          <div ref={containerRef} style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>

            {/* Hover arrows */}
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${COLS},${cellPx}px)`, gap:4, marginBottom:3 }}>
              {Array.from({ length: COLS }, (_, c) => {
                const active = canInteract && hoverCol === c && getDropRow(board, c) !== -1;
                return (
                  <div key={c}
                    onClick={() => handleColClick(c)}
                    onMouseEnter={() => setHoverCol(c)}
                    onMouseLeave={() => setHoverCol(null)}
                    style={{
                      width: cellPx, height: Math.round(cellPx * 0.36),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: canInteract && getDropRow(board, c) !== -1 ? "pointer" : "default",
                      fontSize: Math.round(cellPx * 0.3),
                      color: active ? (turn === 1 ? "#ef4444" : "#f59e0b") : "transparent",
                      transition: "color 0.1s",
                    }}
                  >▼</div>
                );
              })}
            </div>

            {/* Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS},${cellPx}px)`,
              gridTemplateRows:    `repeat(${ROWS},${cellPx}px)`,
              gap: 4, padding: 8,
              background: "linear-gradient(160deg,#1e3a8a,#1d4ed8)",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.07)",
            }}>
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isWin = winCells.some(([wr, wc]) => wr === r && wc === c);
                  const landR = canInteract && hoverCol === c ? getDropRow(board, c) : -1;
                  const isPreview = landR === r && cell === 0;
                  const justDropped = lastCell !== null && lastCell[0] === r && lastCell[1] === c && cell !== 0;

                  return (
                    <div key={`${r}-${c}`}
                      onClick={() => handleColClick(c)}
                      onMouseEnter={() => setHoverCol(c)}
                      onMouseLeave={() => setHoverCol(null)}
                      style={{
                        width: cellPx, height: cellPx, borderRadius: "50%",
                        cursor: canInteract && getDropRow(board, c) !== -1 ? "pointer" : "default",
                        background: cell !== 0
                          ? discGradient(cell)
                          : isPreview
                          ? `rgba(${turn===1?"239,68,68":"245,158,11"},0.16)`
                          : "#0f172a",
                        boxShadow: isWin
                          ? "0 0 0 3px #fff, 0 0 20px rgba(255,255,255,0.5)"
                          : cell !== 0
                          ? "inset 0 -3px 6px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.18)"
                          : "inset 0 4px 8px rgba(0,0,0,0.55)",
                        animation: isWin
                          ? "winPulse 0.75s ease-in-out infinite"
                          : justDropped
                          ? "dropBounce 0.35s ease-out"
                          : undefined,
                        transition: cell !== 0 ? undefined : "background 0.1s",
                      }}
                    />
                  );
                })
              )}
            </div>

            {/* Mobile column tap buttons */}
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${COLS},${cellPx}px)`, gap:4, marginTop:5 }}>
              {Array.from({ length: COLS }, (_, c) => {
                const full = getDropRow(board, c) === -1;
                return (
                  <button key={c}
                    onClick={() => handleColClick(c)}
                    disabled={!canInteract || full}
                    style={{
                      width: cellPx, height: 30, borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: hoverCol === c && canInteract && !full
                        ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.5)", fontSize: 13,
                      cursor: canInteract && !full ? "pointer" : "not-allowed",
                    }}
                  >{full ? "✕" : "↓"}</button>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className={styles.gameControls} style={{ marginTop: "0.75rem" }}>
            {phase === "over" && (
              <button className={styles.resetBtn} onClick={startGame}>
                {winner === "draw" || winner === 1 ? "Play Again" : "Rematch! 🔥"}
              </button>
            )}
            <button onClick={resetGame} style={{
              background: "transparent", border: "1px solid var(--border-color)",
              color: "var(--text-secondary)", padding: "0.4rem 1rem",
              borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.82rem",
            }}>New Game</button>
          </div>
        </>
      )}
    </div>
  );
}
