"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen";
type Sq = { r: number; c: number };

interface BlackPiece {
  id: number;
  type: PieceType;
  r: number;
  c: number;
}

type Phase = "idle" | "playing" | "over";

// ─── Constants ────────────────────────────────────────────────────────────────
const PIECE_POINTS: Record<PieceType, number> = {
  pawn: 10, knight: 30, bishop: 30, rook: 50, queen: 90,
};
const PIECE_PENALTY: Record<PieceType, number> = {
  pawn: 15, knight: 25, bishop: 25, rook: 40, queen: 60,
};
const PIECE_GLYPH: Record<PieceType, string> = {
  pawn: "♟", knight: "♞", bishop: "♝", rook: "♜", queen: "♛",
};
const ALL_TYPES: PieceType[] = ["pawn", "knight", "bishop", "rook", "queen"];
const GAME_DURATION = 60;

// ─── Chess logic helpers ──────────────────────────────────────────────────────
function inBoard(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

/** Returns all squares reachable by the white queen from (r,c), given black piece positions. */
function queenReachable(r: number, c: number, blacks: BlackPiece[]): Set<string> {
  const occupied = new Set(blacks.map(b => `${b.r},${b.c}`));
  const moves = new Set<string>();
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (inBoard(nr, nc)) {
      moves.add(`${nr},${nc}`);
      if (occupied.has(`${nr},${nc}`)) break; // blocked (can capture but not pass)
      nr += dr; nc += dc;
    }
  }
  return moves;
}

/** Returns squares a black piece threatens (can move to, including queen's square). */
function blackThreatensSq(piece: BlackPiece, target: Sq, queenPos: Sq, blacks: BlackPiece[]): boolean {
  const occupied = new Set(blacks.filter(b => b.id !== piece.id).map(b => `${b.r},${b.c}`));
  const { r, c, type } = piece;
  const { r: tr, c: tc } = target;

  if (type === "pawn") {
    // Black pawns move down (increasing r), attack diagonally
    return tr === r + 1 && Math.abs(tc - c) === 1;
  }
  if (type === "knight") {
    const dr = Math.abs(tr - r), dc = Math.abs(tc - c);
    return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
  }
  if (type === "bishop") {
    if (Math.abs(tr - r) !== Math.abs(tc - c)) return false;
    const sr = tr > r ? 1 : -1, sc = tc > c ? 1 : -1;
    for (let i = 1; i < Math.abs(tr - r); i++) {
      if (occupied.has(`${r + sr*i},${c + sc*i}`) || `${r+sr*i},${c+sc*i}` === `${queenPos.r},${queenPos.c}`) return false;
    }
    return true;
  }
  if (type === "rook") {
    if (tr !== r && tc !== c) return false;
    const sr = tr === r ? 0 : tr > r ? 1 : -1;
    const sc = tc === c ? 0 : tc > c ? 1 : -1;
    const steps = Math.max(Math.abs(tr - r), Math.abs(tc - c));
    for (let i = 1; i < steps; i++) {
      const sq = `${r+sr*i},${c+sc*i}`;
      if (occupied.has(sq) || sq === `${queenPos.r},${queenPos.c}`) return false;
    }
    return true;
  }
  if (type === "queen") {
    const dr = tr - r, dc = tc - c;
    const straight = dr === 0 || dc === 0;
    const diag = Math.abs(dr) === Math.abs(dc);
    if (!straight && !diag) return false;
    const sr = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    const sc = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    for (let i = 1; i < steps; i++) {
      const sq = `${r+sr*i},${c+sc*i}`;
      if (occupied.has(sq) || sq === `${queenPos.r},${queenPos.c}`) return false;
    }
    return true;
  }
  return false;
}

/** One legal move for a black piece toward the queen (greedy). */
function bestBlackMove(piece: BlackPiece, queenPos: Sq, blacks: BlackPiece[]): Sq | null {
  const occupied = new Set(blacks.filter(b => b.id !== piece.id).map(b => `${b.r},${b.c}`));
  const { r, c, type } = piece;
  const candidates: Sq[] = [];

  if (type === "pawn") {
    // Move forward
    if (inBoard(r+1, c) && !occupied.has(`${r+1},${c}`) && !(r+1 === queenPos.r && c === queenPos.c))
      candidates.push({ r: r+1, c });
    // Capture diagonally
    for (const dc of [-1, 1]) {
      if (inBoard(r+1, c+dc) && (r+1 === queenPos.r && c+dc === queenPos.c))
        candidates.push({ r: r+1, c: c+dc });
    }
  } else if (type === "knight") {
    for (const [dr, dc] of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]]) {
      const nr = r+dr, nc = c+dc;
      if (inBoard(nr, nc) && !occupied.has(`${nr},${nc}`)) candidates.push({ r: nr, c: nc });
    }
  } else if (type === "bishop") {
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr = r+dr, nc = c+dc;
      while (inBoard(nr, nc)) {
        const isQueen = nr === queenPos.r && nc === queenPos.c;
        if (occupied.has(`${nr},${nc}`)) break;
        candidates.push({ r: nr, c: nc });
        if (isQueen) break;
        nr += dr; nc += dc;
      }
    }
  } else if (type === "rook") {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nr = r+dr, nc = c+dc;
      while (inBoard(nr, nc)) {
        const isQueen = nr === queenPos.r && nc === queenPos.c;
        if (occupied.has(`${nr},${nc}`)) break;
        candidates.push({ r: nr, c: nc });
        if (isQueen) break;
        nr += dr; nc += dc;
      }
    }
  } else if (type === "queen") {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr = r+dr, nc = c+dc;
      while (inBoard(nr, nc)) {
        const isQueen = nr === queenPos.r && nc === queenPos.c;
        if (occupied.has(`${nr},${nc}`)) break;
        candidates.push({ r: nr, c: nc });
        if (isQueen) break;
        nr += dr; nc += dc;
      }
    }
  }

  if (candidates.length === 0) return null;
  // Prefer moves closer to the queen (Manhattan + Chebyshev mix)
  return candidates.sort((a, b) =>
    Math.max(Math.abs(a.r - queenPos.r), Math.abs(a.c - queenPos.c)) -
    Math.max(Math.abs(b.r - queenPos.r), Math.abs(b.c - queenPos.c))
  )[0];
}

/** Random empty square for queen respawn or new piece, away from queen if possible. */
function randomEmpty(exclude: Set<string>, preferFar?: Sq): Sq {
  const options: Sq[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (!exclude.has(`${r},${c}`)) options.push({ r, c });
  if (options.length === 0) return { r: 0, c: 0 };
  if (preferFar) {
    options.sort((a, b) =>
      Math.max(Math.abs(b.r - preferFar.r), Math.abs(b.c - preferFar.c)) -
      Math.max(Math.abs(a.r - preferFar.r), Math.abs(a.c - preferFar.c))
    );
    // pick randomly from top half (farther squares)
    const top = options.slice(0, Math.max(1, Math.floor(options.length / 2)));
    return top[Math.floor(Math.random() * top.length)];
  }
  return options[Math.floor(Math.random() * options.length)];
}

// ─── Rendering ───────────────────────────────────────────────────────────────
const LIGHT = "#1e1b4b";
const DARK  = "#13103a";
const QUEEN_COLOR  = "#33ccff";
const VALID_COLOR  = "rgba(51,255,153,0.35)";
const THREAT_COLOR = "rgba(236,72,153,0.25)";
const SELECTED_COLOR = "rgba(51,204,255,0.3)";

function drawBoard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  queenPos: Sq,
  blacks: BlackPiece[],
  selected: boolean,
  validMoves: Set<string>,
  threatened: boolean,
  flash: { r: number; c: number; color: string } | null,
) {
  const sq = Math.min(W, H) / 8;
  const ox = (W - sq * 8) / 2;
  const oy = (H - sq * 8) / 2;

  ctx.clearRect(0, 0, W, H);

  // background
  ctx.fillStyle = "#0a0818";
  ctx.fillRect(0, 0, W, H);

  // squares
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = ox + c * sq, y = oy + r * sq;
      ctx.fillStyle = (r + c) % 2 === 0 ? LIGHT : DARK;
      ctx.fillRect(x, y, sq, sq);

      // selection highlight
      if (selected && r === queenPos.r && c === queenPos.c) {
        ctx.fillStyle = SELECTED_COLOR;
        ctx.fillRect(x, y, sq, sq);
      }
      // valid move dots
      if (selected && validMoves.has(`${r},${c}`)) {
        ctx.fillStyle = VALID_COLOR;
        ctx.fillRect(x, y, sq, sq);
        // dot
        ctx.beginPath();
        const blackHere = blacks.some(b => b.r === r && b.c === c);
        if (!blackHere) {
          ctx.arc(x + sq/2, y + sq/2, sq * 0.14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(51,255,153,0.7)";
          ctx.fill();
        }
      }
      // threat tint when queen is threatened
      if (threatened && !selected) {
        const inDanger = blacks.some(b => blackThreatensSq(b, queenPos, queenPos, blacks) &&
          r === queenPos.r && c === queenPos.c);
        if (inDanger) {
          ctx.fillStyle = THREAT_COLOR;
          ctx.fillRect(x, y, sq, sq);
        }
      }
      // capture flash
      if (flash && flash.r === r && flash.c === c) {
        ctx.fillStyle = flash.color;
        ctx.fillRect(x, y, sq, sq);
      }
    }
  }

  // board border glow
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#6d28d9";
  ctx.strokeStyle = "#6d28d9";
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, sq * 8, sq * 8);
  ctx.restore();

  // black pieces
  for (const bp of blacks) {
    const x = ox + bp.c * sq + sq / 2;
    const y = oy + bp.r * sq + sq / 2;
    const fs = Math.round(sq * 0.56);
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ec4899";
    ctx.font = `${fs}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f9a8d4";
    ctx.fillText(PIECE_GLYPH[bp.type], x, y + sq * 0.04);
    ctx.restore();
  }

  // white queen
  {
    const x = ox + queenPos.c * sq + sq / 2;
    const y = oy + queenPos.r * sq + sq / 2;
    const fs = Math.round(sq * 0.6);
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = QUEEN_COLOR;
    ctx.font = `${fs}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("♛", x, y + sq * 0.04);
    ctx.restore();
  }

  // rank/file labels
  ctx.font = `${Math.round(sq * 0.22)}px monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 8; i++) {
    ctx.fillText(String.fromCharCode(97 + i), ox + i * sq + sq / 2, oy + 8 * sq + sq * 0.35);
    ctx.fillText(String(8 - i), ox - sq * 0.35, oy + i * sq + sq / 2);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
let _nextId = 1;

export default function QueenGauntletGame({ title }: { title: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef      = useRef({ W: 480, H: 480 });

  const [phase,     setPhase]     = useState<Phase>("idle");
  const [score,     setScore]     = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState(0);

  // game state kept in refs for canvas loop
  const queenPos  = useRef<Sq>({ r: 3, c: 3 });
  const blacks    = useRef<BlackPiece[]>([]);
  const selected  = useRef(false);
  const validMoves= useRef<Set<string>>(new Set());
  const threatened= useRef(false);
  const flashRef  = useRef<{ r: number; c: number; color: string; frames: number } | null>(null);
  const scoreRef  = useRef(0);
  const phaseRef  = useRef<Phase>("idle");
  const animRef   = useRef(0);

  // sync refs with state setters
  const setScoreSync = (n: number) => { scoreRef.current = n; setScore(n); };

  // ── Rendered frame ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { W, H } = sizeRef.current;

    const flash = flashRef.current;
    drawBoard(ctx, W, H, queenPos.current, blacks.current, selected.current, validMoves.current, threatened.current, flash ? { r: flash.r, c: flash.c, color: flash.color } : null);

    if (flash) {
      flash.frames--;
      if (flash.frames <= 0) flashRef.current = null;
    }
  }, []);

  // ── RAF loop ──
  useEffect(() => {
    const loop = () => { render(); animRef.current = requestAnimationFrame(loop); };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  // ── Resize observer ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (!width || !height) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      sizeRef.current = { W: canvas.width, H: canvas.height };
    });
    ro.observe(container);
    // initial size
    const rect = container.getBoundingClientRect();
    const canvas = canvasRef.current!;
    canvas.width = rect.width || 480;
    canvas.height = rect.height || 480;
    sizeRef.current = { W: canvas.width, H: canvas.height };
    return () => ro.disconnect();
  }, []);

  // ── Load high score ──
  useEffect(() => {
    try {
      const s = parseInt(localStorage.getItem("queenGauntletHS") || "0", 10);
      if (s > 0) setHighScore(s);
    } catch { /* ignore */ }
  }, []);

  // ── Timer ──
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          const finalScore = scoreRef.current;
          phaseRef.current = "over";
          setPhase("over");
          setHighScore(prev => {
            const hs = Math.max(prev, finalScore);
            try { localStorage.setItem("queenGauntletHS", String(hs)); } catch { /* ignore */ }
            return hs;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── AI turn ──
  const doAITurn = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    const qp = queenPos.current;
    const bs = blacks.current;

    // 1. Check if any piece can capture the queen
    const captor = bs.find(b => blackThreatensSq(b, qp, qp, bs));
    if (captor) {
      // Queen gets eaten → penalty, queen teleports
      const penalty = PIECE_PENALTY[captor.type];
      const newScore = Math.max(0, scoreRef.current - penalty);
      setScoreSync(newScore);
      flashRef.current = { r: qp.r, c: qp.c, color: "rgba(236,72,153,0.7)", frames: 18 };

      // Teleport queen to random empty square
      const occupied = new Set([...bs.map(b => `${b.r},${b.c}`)]);
      const newPos = randomEmpty(occupied);
      queenPos.current = newPos;
      selected.current = false;
      validMoves.current = new Set();
      threatened.current = false;

      // Check if queen is now threatened
      threatened.current = bs.some(b => blackThreatensSq(b, queenPos.current, queenPos.current, bs));
    } else {
      // 2. Move one piece closer to queen (pick the one with best capture potential, else random)
      if (bs.length > 0) {
        const mover = bs[Math.floor(Math.random() * bs.length)];
        const dest = bestBlackMove(mover, qp, bs);
        if (dest) {
          mover.r = dest.r;
          mover.c = dest.c;
        }
      }
    }

    // 3. Possibly spawn new piece (if < 4)
    if (blacks.current.length < 4) {
      const occupied = new Set([...blacks.current.map(b => `${b.r},${b.c}`), `${queenPos.current.r},${queenPos.current.c}`]);
      const type = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
      const pos = randomEmpty(occupied, queenPos.current);
      blacks.current = [...blacks.current, { id: _nextId++, type, r: pos.r, c: pos.c }];
    }

    // Update threat indicator
    threatened.current = blacks.current.some(b => blackThreatensSq(b, queenPos.current, queenPos.current, blacks.current));
  }, []);

  // ── Start game ──
  const startGame = useCallback(() => {
    _nextId = 1;
    queenPos.current = { r: 3, c: 3 };
    blacks.current = [];
    selected.current = false;
    validMoves.current = new Set();
    threatened.current = false;
    flashRef.current = null;
    scoreRef.current = 0;
    phaseRef.current = "playing";
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setPhase("playing");
  }, []);

  // ── Click / tap handler ──
  const handleClick = useCallback((clientX: number, clientY: number) => {
    if (phaseRef.current === "idle" || phaseRef.current === "over") {
      startGame();
      return;
    }
    if (phaseRef.current !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    const { W, H } = sizeRef.current;
    const sq = Math.min(W, H) / 8;
    const ox = (W - sq * 8) / 2;
    const oy = (H - sq * 8) / 2;

    const c = Math.floor((mx - ox) / sq);
    const r = Math.floor((my - oy) / sq);
    if (!inBoard(r, c)) return;

    const qp = queenPos.current;
    const bs = blacks.current;

    if (!selected.current) {
      // Select queen
      if (r === qp.r && c === qp.c) {
        selected.current = true;
        validMoves.current = queenReachable(qp.r, qp.c, bs);
      }
    } else {
      // Deselect if clicking queen again
      if (r === qp.r && c === qp.c) {
        selected.current = false;
        validMoves.current = new Set();
        return;
      }

      const key = `${r},${c}`;
      if (!validMoves.current.has(key)) {
        // Clicked invalid square — deselect
        selected.current = false;
        validMoves.current = new Set();
        return;
      }

      // Check if capturing a black piece
      const captIdx = bs.findIndex(b => b.r === r && b.c === c);
      if (captIdx !== -1) {
        const piece = bs[captIdx];
        const pts = PIECE_POINTS[piece.type];
        setScoreSync(scoreRef.current + pts);
        flashRef.current = { r, c, color: "rgba(51,255,153,0.7)", frames: 14 };
        blacks.current = bs.filter((_, i) => i !== captIdx);
      }

      // Move queen
      queenPos.current = { r, c };
      selected.current = false;
      validMoves.current = new Set();

      // AI responds
      doAITurn();
    }
  }, [startGame, doAITurn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = (e: MouseEvent) => handleClick(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => { e.preventDefault(); handleClick(e.touches[0].clientX, e.touches[0].clientY); };
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchend", onTouch, { passive: false });
    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchend", onTouch);
    };
  }, [handleClick]);

  // ─────────────────────────────────────────────────────────────────────────
  const timerColor = timeLeft <= 10 ? "#ec4899" : timeLeft <= 20 ? "#ffaa33" : "#33ccff";

  return (
    <div className={styles.gameInner} style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", width: "100%", gap: "0.6rem", boxSizing: "border-box" }}>
      {/* HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 className={styles.gameTitle} style={{ margin: 0, fontSize: "1rem" }}>{title}</h3>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.9rem" }}>
          {phase === "playing" && (
            <>
              <span style={{ fontWeight: 700, color: timerColor, fontFamily: "monospace", fontSize: "1.1rem" }}>
                ⏱ {timeLeft}s
              </span>
              <span style={{ fontWeight: 700, color: "#ffcc00", fontFamily: "monospace" }}>
                ★ {score}
              </span>
            </>
          )}
          {phase !== "playing" && highScore > 0 && (
            <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: "0.8rem" }}>
              BEST {highScore}
            </span>
          )}
        </div>
      </div>

      {/* Board */}
      <div ref={containerRef} style={{ flex: 1, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(109,40,217,0.5)", cursor: "pointer", position: "relative" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />

        {/* Overlay screens */}
        {phase === "idle" && (
          <div onClick={startGame} style={{ position: "absolute", inset: 0, background: "rgba(5,5,20,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", cursor: "pointer" }}>
            <span style={{ fontSize: "2.5rem" }}>♛</span>
            <h2 style={{ color: "#33ccff", fontFamily: "monospace", fontSize: "1.4rem", margin: 0, textShadow: "0 0 20px #33ccff" }}>QUEEN'S GAUNTLET</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", textAlign: "center", maxWidth: 260, margin: 0 }}>
              Click the ♛ queen to select, then click to move or capture.<br/>
              Earn points capturing black pieces. Avoid getting caught!
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
              {ALL_TYPES.map(t => (
                <span key={t} style={{ color: "#f9a8d4", fontSize: "0.78rem" }}>{PIECE_GLYPH[t]} +{PIECE_POINTS[t]}</span>
              ))}
            </div>
            {highScore > 0 && <p style={{ color: "#ffcc00", fontFamily: "monospace", fontSize: "0.9rem", margin: 0 }}>BEST: {highScore}</p>}
            <div style={{ marginTop: "0.5rem", padding: "0.6rem 1.8rem", background: "linear-gradient(135deg,#7c3aed,#ec4899)", borderRadius: "999px", color: "white", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
              Tap to Start
            </div>
          </div>
        )}
        {phase === "over" && (
          <div onClick={startGame} style={{ position: "absolute", inset: 0, background: "rgba(5,5,20,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.8rem", cursor: "pointer" }}>
            <h2 style={{ color: "#ec4899", fontFamily: "monospace", fontSize: "1.6rem", margin: 0, textShadow: "0 0 20px #ec4899" }}>GAME OVER</h2>
            <p style={{ color: "#ffcc00", fontFamily: "monospace", fontSize: "1.3rem", margin: 0 }}>Score: {score}</p>
            {score >= highScore && score > 0 && <p style={{ color: "#33ff99", fontFamily: "monospace", fontSize: "0.9rem", margin: 0 }}>✨ NEW BEST!</p>}
            {score < highScore && <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: "0.85rem", margin: 0 }}>Best: {highScore}</p>}
            <div style={{ marginTop: "0.5rem", padding: "0.6rem 1.8rem", background: "linear-gradient(135deg,#7c3aed,#ec4899)", borderRadius: "999px", color: "white", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
              Tap to Restart
            </div>
          </div>
        )}
      </div>

      {/* Piece legend */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
        {ALL_TYPES.map(t => (
          <span key={t} style={{ color: "#f9a8d4" }}>{PIECE_GLYPH[t]} <span style={{ color: "rgba(255,255,255,0.35)" }}>+{PIECE_POINTS[t]} / −{PIECE_PENALTY[t]}</span></span>
        ))}
      </div>
    </div>
  );
}
