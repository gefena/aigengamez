"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ─── Types ───────────────────────────────────────────────────────────────────
type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen";
type Sq = { r: number; c: number };
interface BlackPiece { id: number; type: PieceType; r: number; c: number; }
interface PieceAnim  { id: number; fr: number; fc: number; tr: number; tc: number; t: number; }
type Phase = "idle" | "playing" | "over";

// ─── Constants ───────────────────────────────────────────────────────────────
const PIECE_POINTS:  Record<PieceType, number> = { pawn:10, knight:30, bishop:30, rook:50, queen:90 };
const PIECE_PENALTY: Record<PieceType, number> = { pawn:15, knight:25, bishop:25, rook:40,  queen:60 };
const PIECE_GLYPH:   Record<PieceType, string> = { pawn:"♟", knight:"♞", bishop:"♝", rook:"♜", queen:"♛" };
const ALL_TYPES: PieceType[] = ["pawn", "knight", "bishop", "rook", "queen"];
const GAME_DURATION = 60;
const ANIM_SPEED    = 0.14;  // t increment per RAF frame (~8-frame slide)
const GRACE_TURNS   = 5;     // AI turns invincible after teleport

// ─── Board colours ───────────────────────────────────────────────────────────
const SQ_LIGHT    = "#2e2480";  // noticeably lighter than dark
const SQ_DARK     = "#160d46";
const COL_BG      = "#07050f";
const QUEEN_CLR   = "#33ccff";
const QUEEN_GLOW  = "#33ccff";
const ENEMY_CLR   = "#cc2238";
const ENEMY_RING  = "#ff2244";
const ENEMY_BG    = "#2a0810";
const SAFE_DOT    = "rgba(51,255,153,0.9)";
const SAFE_TINT   = "rgba(51,255,153,0.16)";
const RISK_TINT   = "rgba(255,75,30,0.38)";
const RISK_DOT    = "rgba(255,120,50,0.9)";
const SEL_TINT    = "rgba(51,204,255,0.28)";
const THREAT_CLR  = "rgba(255,30,30,0.32)";

// ─── Chess logic ─────────────────────────────────────────────────────────────
function inBoard(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function queenReachable(qr: number, qc: number, blacks: BlackPiece[]): Set<string> {
  const occ = new Set(blacks.map(b => `${b.r},${b.c}`));
  const out = new Set<string>();
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
    let nr = qr+dr, nc = qc+dc;
    while (inBoard(nr, nc)) {
      out.add(`${nr},${nc}`);
      if (occ.has(`${nr},${nc}`)) break;
      nr += dr; nc += dc;
    }
  }
  return out;
}

/** All squares piece can attack. Queen's square acts as a blocker for sliding pieces. */
function pieceAttacks(piece: BlackPiece, blacks: BlackPiece[], queenSq: Sq): Set<string> {
  const occ = new Set([
    ...blacks.filter(b => b.id !== piece.id).map(b => `${b.r},${b.c}`),
    `${queenSq.r},${queenSq.c}`,
  ]);
  const out = new Set<string>();
  const { r, c, type } = piece;

  if (type === "pawn") {
    for (const dc of [-1, 1]) if (inBoard(r+1, c+dc)) out.add(`${r+1},${c+dc}`);
  } else if (type === "knight") {
    for (const [dr, dc] of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]]) {
      if (inBoard(r+dr, c+dc)) out.add(`${r+dr},${c+dc}`);
    }
  } else {
    const dirs =
      type === "bishop" ? [[-1,-1],[-1,1],[1,-1],[1,1]] :
      type === "rook"   ? [[-1,0],[1,0],[0,-1],[0,1]] :
                          [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dr, dc] of dirs) {
      let nr = r+dr, nc = c+dc;
      while (inBoard(nr, nc)) {
        out.add(`${nr},${nc}`);
        if (occ.has(`${nr},${nc}`)) break;
        nr += dr; nc += dc;
      }
    }
  }
  return out;
}

function allAttacked(blacks: BlackPiece[], queenSq: Sq): Set<string> {
  const out = new Set<string>();
  for (const b of blacks) {
    const atk = pieceAttacks(b, blacks, queenSq);
    atk.forEach(sq => out.add(sq));
  }
  return out;
}

function bestBlackMove(piece: BlackPiece, queenPos: Sq, blacks: BlackPiece[]): Sq | null {
  const occ = new Set(blacks.filter(b => b.id !== piece.id).map(b => `${b.r},${b.c}`));
  const { r, c, type } = piece;
  const cands: Sq[] = [];

  if (type === "pawn") {
    if (inBoard(r+1,c) && !occ.has(`${r+1},${c}`) && !(r+1===queenPos.r && c===queenPos.c))
      cands.push({ r:r+1, c });
    for (const dc of [-1,1])
      if (inBoard(r+1,c+dc) && r+1===queenPos.r && c+dc===queenPos.c)
        cands.push({ r:r+1, c:c+dc });
  } else if (type === "knight") {
    for (const [dr,dc] of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]]) {
      const nr=r+dr, nc=c+dc;
      if (inBoard(nr,nc) && !occ.has(`${nr},${nc}`)) cands.push({ r:nr, c:nc });
    }
  } else {
    const dirs =
      type === "bishop" ? [[-1,-1],[-1,1],[1,-1],[1,1]] :
      type === "rook"   ? [[-1,0],[1,0],[0,-1],[0,1]] :
                          [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dr, dc] of dirs) {
      let nr=r+dr, nc=c+dc;
      while (inBoard(nr, nc)) {
        if (occ.has(`${nr},${nc}`)) break;
        cands.push({ r:nr, c:nc });
        if (nr===queenPos.r && nc===queenPos.c) break;
        nr += dr; nc += dc;
      }
    }
  }
  if (!cands.length) return null;
  return cands.sort((a,b) =>
    Math.max(Math.abs(a.r-queenPos.r), Math.abs(a.c-queenPos.c)) -
    Math.max(Math.abs(b.r-queenPos.r), Math.abs(b.c-queenPos.c))
  )[0];
}

/** Picks the piece with a direct attack on the queen first, else the closest one. */
function pickMover(blacks: BlackPiece[], queenPos: Sq): BlackPiece | null {
  if (!blacks.length) return null;
  const scored = blacks.map(b => {
    const attacks = pieceAttacks(b, blacks, queenPos);
    const direct  = attacks.has(`${queenPos.r},${queenPos.c}`);
    const dist    = Math.max(Math.abs(b.r-queenPos.r), Math.abs(b.c-queenPos.c));
    return { b, score: direct ? 0 : dist };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored[0].b;
}

function randomEmpty(exclude: Set<string>, preferFar?: Sq): Sq {
  const opts: Sq[] = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (!exclude.has(`${r},${c}`)) opts.push({r,c});
  if (!opts.length) return { r:0, c:0 };
  if (preferFar) {
    opts.sort((a,b) =>
      Math.max(Math.abs(b.r-preferFar.r), Math.abs(b.c-preferFar.c)) -
      Math.max(Math.abs(a.r-preferFar.r), Math.abs(a.c-preferFar.c))
    );
    const top = opts.slice(0, Math.max(1, Math.floor(opts.length / 2)));
    return top[Math.floor(Math.random() * top.length)];
  }
  return opts[Math.floor(Math.random() * opts.length)];
}

/** Cap on black pieces based on player turns taken — gentle ramp. */
function maxPieces(turns: number): number {
  if (turns < 5)  return 1;
  if (turns < 12) return 2;
  if (turns < 20) return 3;
  return 4;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function drawBoard(
  ctx:            CanvasRenderingContext2D,
  W:              number,
  H:              number,
  queenPos:       Sq,
  blacks:         BlackPiece[],
  anims:          PieceAnim[],
  selected:       boolean,
  validMoves:     Set<string>,
  safeSquares:    Set<string>,
  threatened:     boolean,
  flash:          { r:number; c:number; color:string } | null,
  grace:          number,
  frame:          number,
) {
  // Board sizing — leave left margin for rank labels, bottom margin for file labels
  const margin = Math.min(W, H) * 0.055;
  const sqSz   = (Math.min(W, H) - margin * 2) / 8;
  const bw     = sqSz * 8;
  const bh     = sqSz * 8;
  const ox     = (W - bw) / 2 + margin * 0.5;
  const oy     = (H - bh) / 2 - margin * 0.3;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, W, H);

  // ── Squares ──
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x   = ox + c * sqSz;
      const y   = oy + r * sqSz;
      const key = `${r},${c}`;

      // Base colour
      ctx.fillStyle = (r + c) % 2 === 0 ? SQ_LIGHT : SQ_DARK;
      ctx.fillRect(x, y, sqSz, sqSz);

      // Threat tint on queen square
      if (!selected && threatened && r === queenPos.r && c === queenPos.c) {
        ctx.fillStyle = THREAT_CLR;
        ctx.fillRect(x, y, sqSz, sqSz);
      }

      // Flash
      if (flash && flash.r === r && flash.c === c) {
        ctx.fillStyle = flash.color;
        ctx.fillRect(x, y, sqSz, sqSz);
      }

      if (selected) {
        // Selected queen highlight
        if (r === queenPos.r && c === queenPos.c) {
          ctx.fillStyle = SEL_TINT;
          ctx.fillRect(x, y, sqSz, sqSz);
        }
        // Valid move overlays
        if (validMoves.has(key)) {
          const safe    = safeSquares.has(key);
          const hasBlack = blacks.some(b => b.r === r && b.c === c);
          ctx.fillStyle = safe ? SAFE_TINT : RISK_TINT;
          ctx.fillRect(x, y, sqSz, sqSz);
          if (!hasBlack) {
            ctx.beginPath();
            ctx.arc(x + sqSz/2, y + sqSz/2, sqSz * 0.13, 0, Math.PI * 2);
            ctx.fillStyle = safe ? SAFE_DOT : RISK_DOT;
            ctx.fill();
          }
        }
      }
    }
  }

  // ── Board border ──
  ctx.save();
  ctx.shadowBlur = 18; ctx.shadowColor = "#6d28d9";
  ctx.strokeStyle = "#6d28d9"; ctx.lineWidth = 1.5;
  ctx.strokeRect(ox, oy, bw, bh);
  ctx.restore();

  // ── Rank / file labels ──
  const lblSz = Math.max(9, Math.round(sqSz * 0.24));
  ctx.font = `${lblSz}px monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 8; i++) {
    ctx.fillText(String.fromCharCode(97 + i), ox + i*sqSz + sqSz/2, oy + bh + margin * 0.6);
    ctx.fillText(String(8 - i), ox - margin * 0.55, oy + i*sqSz + sqSz/2);
  }

  // ── Black pieces ──
  for (const bp of blacks) {
    const anim = anims.find(a => a.id === bp.id);
    const cx = anim
      ? lerp(ox + anim.fc*sqSz + sqSz/2, ox + anim.tc*sqSz + sqSz/2, anim.t)
      : ox + bp.c*sqSz + sqSz/2;
    const cy = anim
      ? lerp(oy + anim.fr*sqSz + sqSz/2, oy + anim.tr*sqSz + sqSz/2, anim.t)
      : oy + bp.r*sqSz + sqSz/2;

    // Background disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, sqSz * 0.37, 0, Math.PI * 2);
    ctx.fillStyle = ENEMY_BG;
    ctx.fill();
    ctx.strokeStyle = ENEMY_RING;
    ctx.lineWidth = Math.max(1, sqSz * 0.05);
    ctx.stroke();
    ctx.restore();

    // Glyph
    ctx.save();
    ctx.font = `${Math.round(sqSz * 0.56)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = ENEMY_CLR;
    ctx.fillText(PIECE_GLYPH[bp.type], cx, cy + sqSz * 0.04);
    ctx.restore();
  }

  // ── White queen ──
  {
    const anim = anims.find(a => a.id === -1);
    const cx = anim
      ? lerp(ox + anim.fc*sqSz + sqSz/2, ox + anim.tc*sqSz + sqSz/2, anim.t)
      : ox + queenPos.c*sqSz + sqSz/2;
    const cy = anim
      ? lerp(oy + anim.fr*sqSz + sqSz/2, oy + anim.tr*sqSz + sqSz/2, anim.t)
      : oy + queenPos.r*sqSz + sqSz/2;

    // Grace pulsing outer ring
    if (grace > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(frame * 0.18);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sqSz * 0.48, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,200,0.7)";
      ctx.lineWidth = sqSz * 0.04;
      ctx.globalAlpha = pulse;
      ctx.stroke();
      ctx.restore();
    }

    // Background disc with glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, sqSz * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = "#071a2f";
    ctx.fill();
    ctx.shadowBlur = 16;
    ctx.shadowColor = QUEEN_GLOW;
    ctx.strokeStyle = QUEEN_CLR;
    ctx.lineWidth = Math.max(1.5, sqSz * 0.06);
    ctx.stroke();
    ctx.restore();

    // Glyph
    ctx.save();
    ctx.font = `${Math.round(sqSz * 0.62)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.shadowColor = QUEEN_GLOW;
    ctx.fillText("♛", cx, cy + sqSz * 0.04);
    ctx.restore();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
let _nextId = 1;

export default function QueenGauntletGame({ title }: { title: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef      = useRef({ W: 480, H: 480 });

  const [phase,     setPhase]     = useState<Phase>("idle");
  const [score,     setScore]     = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState(0);

  // Mutable game state (read in RAF, not React renders)
  const queenPos      = useRef<Sq>({ r: 3, c: 3 });
  const blacks        = useRef<BlackPiece[]>([]);
  const selected      = useRef(false);
  const validMoves    = useRef<Set<string>>(new Set());
  const safeSquares   = useRef<Set<string>>(new Set());
  const threatened    = useRef(false);
  const flashRef      = useRef<{ r:number; c:number; color:string; frames:number } | null>(null);
  const animsRef      = useRef<PieceAnim[]>([]);
  const scoreRef      = useRef(0);
  const phaseRef      = useRef<Phase>("idle");
  const animRef       = useRef(0);
  const dirtyRef      = useRef(true);
  const frameRef      = useRef(0);
  const turnsRef      = useRef(0);    // player turns taken (for spawn ramp)
  const graceRef      = useRef(0);    // AI turns of post-teleport grace remaining

  const setScoreSync = useCallback((n: number) => { scoreRef.current = n; setScore(n); }, []);

  // ── Precompute safe squares for current validMoves ──
  const refreshSafeSquares = useCallback(() => {
    const attacked = allAttacked(blacks.current, queenPos.current);
    const safe = new Set<string>();
    validMoves.current.forEach(sq => {
      if (!attacked.has(sq)) {
        safe.add(sq);
      } else {
        // If capturing the piece on that square, recompute without it
        const captured = blacks.current.find(b => `${b.r},${b.c}` === sq);
        if (captured) {
          const remaining = blacks.current.filter(b => b.id !== captured.id);
          const parts = sq.split(",");
          const afterAttacked = allAttacked(remaining, { r: Number(parts[0]), c: Number(parts[1]) });
          if (!afterAttacked.has(sq)) safe.add(sq);
        }
      }
    });
    safeSquares.current = safe;
  }, []);

  // ── RAF render loop ──
  const render = useCallback(() => {
    frameRef.current++;

    // Tick piece animations
    let animating = false;
    animsRef.current = animsRef.current
      .map(a => ({ ...a, t: Math.min(1, a.t + ANIM_SPEED) }))
      .filter(a => { if (a.t < 1) { animating = true; return true; } return false; });
    if (animating) dirtyRef.current = true;

    // Tick flash
    if (flashRef.current) {
      flashRef.current.frames--;
      if (flashRef.current.frames <= 0) flashRef.current = null;
      dirtyRef.current = true;
    }

    // Grace pulses need redraws
    if (graceRef.current > 0) dirtyRef.current = true;

    if (!dirtyRef.current) return;
    dirtyRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { W, H } = sizeRef.current;

    drawBoard(
      ctx, W, H,
      queenPos.current,
      blacks.current,
      animsRef.current,
      selected.current,
      validMoves.current,
      safeSquares.current,
      threatened.current,
      flashRef.current ? { r: flashRef.current.r, c: flashRef.current.c, color: flashRef.current.color } : null,
      graceRef.current,
      frameRef.current,
    );
  }, []);

  useEffect(() => {
    const loop = () => { render(); animRef.current = requestAnimationFrame(loop); };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  // ── ResizeObserver ──
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
      dirtyRef.current = true;
    });
    ro.observe(container);
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

    // Grace period: skip capture check after teleport
    if (graceRef.current > 0) {
      graceRef.current--;
    } else {
      // Check if queen is on an attacked square
      const attacked = allAttacked(bs, qp);
      if (attacked.has(`${qp.r},${qp.c}`)) {
        // Queen captured — penalty + teleport
        const captor   = bs.find(b => pieceAttacks(b, bs, qp).has(`${qp.r},${qp.c}`));
        const penalty  = captor ? PIECE_PENALTY[captor.type] : 20;
        setScoreSync(Math.max(0, scoreRef.current - penalty));
        flashRef.current = { r: qp.r, c: qp.c, color: "rgba(236,72,153,0.8)", frames: 22 };

        const occupied = new Set(bs.map(b => `${b.r},${b.c}`));
        queenPos.current = randomEmpty(occupied, qp);
        selected.current = false;
        validMoves.current = new Set();
        safeSquares.current = new Set();
        graceRef.current   = GRACE_TURNS;
        dirtyRef.current   = true;
        threatened.current = false;
        return;
      }
    }

    // Move the most threatening black piece
    const mover = pickMover(bs, qp);
    if (mover) {
      const dest = bestBlackMove(mover, qp, bs);
      if (dest) {
        // Start animation
        animsRef.current = animsRef.current.filter(a => a.id !== mover.id);
        animsRef.current.push({ id: mover.id, fr: mover.r, fc: mover.c, tr: dest.r, tc: dest.c, t: 0 });
        mover.r = dest.r;
        mover.c = dest.c;
      }
    }

    // Possibly spawn a new piece (ramp-based cap)
    const cap = maxPieces(turnsRef.current);
    if (blacks.current.length < cap) {
      const occupied = new Set([
        ...blacks.current.map(b => `${b.r},${b.c}`),
        `${queenPos.current.r},${queenPos.current.c}`,
      ]);
      const type = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
      // Don't spawn pawns on rows 6-7 (they'd be stuck or immediately threatening)
      const pos = randomEmpty(occupied, queenPos.current);
      const finalType: PieceType = (type === "pawn" && pos.r >= 6) ? "knight" : type;
      blacks.current = [...blacks.current, { id: _nextId++, type: finalType, r: pos.r, c: pos.c }];
    }

    // Update threat indicator
    threatened.current = allAttacked(blacks.current, queenPos.current).has(`${queenPos.current.r},${queenPos.current.c}`);
    dirtyRef.current   = true;
  }, [setScoreSync, refreshSafeSquares]);

  // ── Start game ──
  const startGame = useCallback(() => {
    _nextId = 1;
    queenPos.current    = { r: 3, c: 3 };
    blacks.current      = [];
    selected.current    = false;
    validMoves.current  = new Set();
    safeSquares.current = new Set();
    threatened.current  = false;
    flashRef.current    = null;
    animsRef.current    = [];
    scoreRef.current    = 0;
    phaseRef.current    = "playing";
    turnsRef.current    = 0;
    graceRef.current    = 0;
    dirtyRef.current    = true;
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

    // Block interaction during piece animation
    if (animsRef.current.length > 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx     = (clientX - rect.left) * scaleX;
    const my     = (clientY - rect.top) * scaleY;

    const { W, H } = sizeRef.current;
    const margin = Math.min(W, H) * 0.055;
    const sqSz   = (Math.min(W, H) - margin * 2) / 8;
    const bw     = sqSz * 8;
    const bh     = sqSz * 8;
    const ox     = (W - bw) / 2 + margin * 0.5;
    const oy     = (H - bh) / 2 - margin * 0.3;

    const c = Math.floor((mx - ox) / sqSz);
    const r = Math.floor((my - oy) / sqSz);
    if (!inBoard(r, c)) return;

    const qp = queenPos.current;
    const bs = blacks.current;

    if (!selected.current) {
      if (r === qp.r && c === qp.c) {
        selected.current   = true;
        validMoves.current = queenReachable(qp.r, qp.c, bs);
        refreshSafeSquares();
        dirtyRef.current   = true;
      }
    } else {
      if (r === qp.r && c === qp.c) {
        selected.current    = false;
        validMoves.current  = new Set();
        safeSquares.current = new Set();
        dirtyRef.current    = true;
        return;
      }

      const key = `${r},${c}`;
      if (!validMoves.current.has(key)) {
        selected.current    = false;
        validMoves.current  = new Set();
        safeSquares.current = new Set();
        dirtyRef.current    = true;
        return;
      }

      // Capture if black piece is here
      const captIdx = bs.findIndex(b => b.r === r && b.c === c);
      if (captIdx !== -1) {
        const pts = PIECE_POINTS[bs[captIdx].type];
        setScoreSync(scoreRef.current + pts);
        flashRef.current = { r, c, color: "rgba(51,255,153,0.75)", frames: 16 };
        blacks.current   = bs.filter((_, i) => i !== captIdx);
      }

      // Animate queen move
      animsRef.current = animsRef.current.filter(a => a.id !== -1);
      animsRef.current.push({ id: -1, fr: qp.r, fc: qp.c, tr: r, tc: c, t: 0 });

      queenPos.current    = { r, c };
      selected.current    = false;
      validMoves.current  = new Set();
      safeSquares.current = new Set();
      turnsRef.current++;
      dirtyRef.current    = true;

      // AI responds after animation completes
      const waitForAnim = () => {
        if (animsRef.current.some(a => a.id === -1)) {
          setTimeout(waitForAnim, 16);
        } else {
          doAITurn();
        }
      };
      waitForAnim();
    }
  }, [startGame, doAITurn, refreshSafeSquares, setScoreSync]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = (e: MouseEvent) => handleClick(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchend", onTouch, { passive: false });
    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchend", onTouch);
    };
  }, [handleClick]);

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
      <div
        ref={containerRef}
        style={{ flex: 1, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(109,40,217,0.5)", cursor: "pointer", position: "relative" }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />

        {phase === "idle" && (
          <div onClick={startGame} style={{ position: "absolute", inset: 0, background: "rgba(5,5,20,0.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", cursor: "pointer" }}>
            <span style={{ fontSize: "2.8rem", filter: "drop-shadow(0 0 16px #33ccff)" }}>♛</span>
            <h2 style={{ color: "#33ccff", fontFamily: "monospace", fontSize: "1.4rem", margin: 0, textShadow: "0 0 20px #33ccff" }}>QUEEN'S GAUNTLET</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", textAlign: "center", maxWidth: 280, margin: 0, lineHeight: 1.6 }}>
              Click ♛ to select your queen, then click a square to move.<br/>
              <span style={{ color: "rgba(80,255,150,0.8)" }}>Green dots</span> = safe. <span style={{ color: "rgba(255,120,50,0.9)" }}>Orange dots</span> = danger zone.
            </p>
            <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", justifyContent: "center" }}>
              {ALL_TYPES.map(t => (
                <span key={t} style={{ color: "#f9a8d4", fontSize: "0.78rem" }}>{PIECE_GLYPH[t]} +{PIECE_POINTS[t]}</span>
              ))}
            </div>
            {highScore > 0 && <p style={{ color: "#ffcc00", fontFamily: "monospace", fontSize: "0.9rem", margin: 0 }}>BEST: {highScore}</p>}
            <div style={{ marginTop: "0.5rem", padding: "0.6rem 1.8rem", background: "linear-gradient(135deg,#7c3aed,#ec4899)", borderRadius: "999px", color: "white", fontWeight: 700, fontSize: "0.95rem" }}>
              Tap to Start
            </div>
          </div>
        )}

        {phase === "over" && (
          <div onClick={startGame} style={{ position: "absolute", inset: 0, background: "rgba(5,5,20,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.8rem", cursor: "pointer" }}>
            <h2 style={{ color: "#ec4899", fontFamily: "monospace", fontSize: "1.6rem", margin: 0, textShadow: "0 0 20px #ec4899" }}>TIME'S UP</h2>
            <p style={{ color: "#ffcc00", fontFamily: "monospace", fontSize: "1.3rem", margin: 0 }}>Score: {score}</p>
            {score >= highScore && score > 0 && <p style={{ color: "#33ff99", fontFamily: "monospace", fontSize: "0.9rem", margin: 0 }}>✨ NEW BEST!</p>}
            {score < highScore && <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: "0.85rem", margin: 0 }}>Best: {highScore}</p>}
            <div style={{ marginTop: "0.5rem", padding: "0.6rem 1.8rem", background: "linear-gradient(135deg,#7c3aed,#ec4899)", borderRadius: "999px", color: "white", fontWeight: 700, fontSize: "0.95rem" }}>
              Play Again
            </div>
          </div>
        )}
      </div>

      {/* Piece legend */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", fontSize: "0.75rem" }}>
        {ALL_TYPES.map(t => (
          <span key={t} style={{ color: ENEMY_CLR }}>
            {PIECE_GLYPH[t]}{" "}
            <span style={{ color: "rgba(255,255,255,0.35)" }}>+{PIECE_POINTS[t]} / −{PIECE_PENALTY[t]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
