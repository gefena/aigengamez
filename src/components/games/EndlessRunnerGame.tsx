"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ─── Constants ───────────────────────────────────────────────────────────────
const GRAVITY        = 0.6;
const JUMP_FORCE     = 13;
const BAR_CLEARANCE  = 28;    // jumpY (abstract units) must exceed this to clear a bar
const LANE_SLIDE_SPD = 0.2;
const INITIAL_SPEED  = 0.005;
const SPEED_CAP      = 0.016;
const COLLISION_Z    = 0.09;  // depth band for hit detection (normalised, screen-size-independent)
const STRIP_COUNT    = 20;
const REF_W          = 800;   // reference resolution for scale factor
const REF_H          = 500;

// Neon palette (hardcoded — canvas cannot read CSS variables)
const C = {
  bgTop:      '#050511',
  bgBottom:   '#1a1a2e',
  ground0:    '#0f0f1e',
  ground1:    '#13132a',
  lane:       'rgba(109,40,217,0.35)',
  player:     '#33ccff',
  playerGlow: '#33ccff',
  pillar:     '#ec4899',
  pillarGlow: '#ec4899',
  bar:        '#6d28d9',
  barGlow:    '#a855f7',
  coin:       '#ffcc00',
  coinGlow:   '#ffcc00',
  hud:        '#ffffff',
  hudDim:     'rgba(255,255,255,0.4)',
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'running' | 'dead';
type Lane  = 0 | 1 | 2;

interface Player {
  lane:       Lane;
  targetLane: Lane;
  laneT:      number;
  jumpY:      number;
  jumpVY:     number;
  isJumping:  boolean;
}

interface Obstacle {
  id:   number;
  lane: Lane;
  z:    number;
  type: 'pillar' | 'bar';
}

interface Coin {
  id:        number;
  lane:      Lane;
  z:         number;
  collected: boolean;
}

interface GS {
  phase:      Phase;
  distance:   number;
  speed:      number;
  score:      number;
  player:     Player;
  obstacles:  Obstacle[];
  coins:      Coin[];
  spawnTimer: number;
  coinTimer:  number;
  nextId:     number;
  frameId:    number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeState(): GS {
  return {
    phase: 'idle', distance: 0, speed: INITIAL_SPEED, score: 0,
    player: { lane: 1, targetLane: 1, laneT: 1, jumpY: 0, jumpVY: 0, isJumping: false },
    obstacles: [], coins: [],
    spawnTimer: 80, coinTimer: 50, nextId: 0, frameId: 0,
  };
}

// Corridor constants vary with aspect ratio — computed once per draw() call
// and passed in so project() doesn't recompute them on every call.
function corridorConstants(W: number, H: number) {
  const aspect   = W / H;
  // Interpolation factor: 0 = portrait (9:16 ≈ 0.56), 1 = landscape (16:9 ≈ 1.78)
  const t        = Math.min(1, Math.max(0, (aspect - 0.56) / (1.78 - 0.56)));
  const vpY      = H * (0.40 - 0.04 * t);          // portrait: 0.40H, landscape: 0.36H
  const halfWBot = W * (0.46 - 0.06 * t);          // portrait: 0.46W, landscape: 0.40W
  const halfWTop = W * 0.03;
  return { vpY, halfWBot, halfWTop };
}

function proj(lane: Lane, z: number, W: number, H: number, vpY: number, halfWBot: number, halfWTop: number) {
  const screenY = H + (vpY - H) * z;
  const halfW   = halfWBot + (halfWTop - halfWBot) * z;
  const offsets: [number, number, number] = [-1, 0, 1];
  const laneX   = W / 2 + offsets[lane] * (halfW * 2 / 3);
  const pScale  = Math.max(0, 1 - z);
  return { x: laneX, y: screenY, pScale, halfW };
}

function effectiveLane(p: Player): Lane {
  return Math.round(p.lane * (1 - p.laneT) + p.targetLane * p.laneT) as Lane;
}

function shiftLane(gs: GS, dir: -1 | 1) {
  const next = (gs.player.targetLane + dir) as Lane;
  if (next < 0 || next > 2) return;
  gs.player.lane       = effectiveLane(gs.player);
  gs.player.targetLane = next;
  gs.player.laneT      = 0;
}

function doJump(gs: GS) {
  if (gs.player.isJumping) return;
  gs.player.isJumping = true;
  gs.player.jumpVY    = JUMP_FORCE;
}

// ─── Update (no pixel values — all normalised) ────────────────────────────────
function update(gs: GS, setScore: (n: number) => void, setPhase: (p: Phase) => void) {
  gs.distance += gs.speed;
  gs.speed     = Math.min(SPEED_CAP, INITIAL_SPEED + gs.distance * 0.0000025);

  const newScore = Math.floor(gs.distance * 10);
  if (newScore !== gs.score) {
    gs.score = newScore;
    if (gs.score % 5 === 0) setScore(gs.score);
  }

  if (gs.player.laneT < 1) gs.player.laneT = Math.min(1, gs.player.laneT + LANE_SLIDE_SPD);

  if (gs.player.isJumping) {
    gs.player.jumpY  += gs.player.jumpVY;
    gs.player.jumpVY -= GRAVITY;
    if (gs.player.jumpY <= 0) {
      gs.player.jumpY = 0; gs.player.jumpVY = 0; gs.player.isJumping = false;
    }
  }

  for (const o of gs.obstacles) o.z -= gs.speed;
  for (const c of gs.coins)     c.z -= gs.speed;
  gs.obstacles = gs.obstacles.filter(o => o.z > -0.05);
  gs.coins     = gs.coins.filter(c => c.z > -0.05);

  // Spawn obstacles
  gs.spawnTimer--;
  if (gs.spawnTimer <= 0) {
    const lane = Math.floor(Math.random() * 3) as Lane;
    const type = Math.random() < 0.45 ? 'bar' : 'pillar';
    gs.obstacles.push({ id: gs.nextId++, lane, z: 1.0, type });
    if (Math.random() < 0.3) {
      const lane2 = ((lane + 1 + Math.floor(Math.random() * 2)) % 3) as Lane;
      gs.obstacles.push({ id: gs.nextId++, lane: lane2, z: 1.0, type: Math.random() < 0.4 ? 'bar' : 'pillar' });
    }
    gs.spawnTimer = Math.max(45, 90 - gs.distance * 0.01) + Math.floor(Math.random() * 30);
  }

  // Spawn coins
  gs.coinTimer--;
  if (gs.coinTimer <= 0) {
    const lane  = Math.floor(Math.random() * 3) as Lane;
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++)
      gs.coins.push({ id: gs.nextId++, lane, z: 1.0 + i * 0.07, collected: false });
    gs.coinTimer = 70 + Math.floor(Math.random() * 40);
  }

  // Collisions
  const pLane = effectiveLane(gs.player);
  for (const obs of gs.obstacles) {
    if (obs.z > COLLISION_Z || obs.z < 0) continue;
    if (obs.lane !== pLane) continue;
    if (obs.type === 'bar' && gs.player.jumpY >= BAR_CLEARANCE) continue;
    gs.phase = 'dead'; setScore(gs.score); setPhase('dead'); return;
  }
  for (const coin of gs.coins) {
    if (coin.collected || coin.z > COLLISION_Z || coin.z < 0 || coin.lane !== pLane) continue;
    coin.collected = true; gs.score += 50; setScore(gs.score);
  }
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, gs: GS, W: number, H: number) {
  // ── Scale factor: 1.0 at reference 800×500, proportionally smaller/larger ──
  const scale     = Math.min(W / REF_W, H / REF_H);
  const isPortrait = W / H < 0.9;

  // ── Corridor constants (aspect-ratio-aware) ──
  const { vpY, halfWBot, halfWTop } = corridorConstants(W, H);
  const p = (lane: Lane, z: number) => proj(lane, z, W, H, vpY, halfWBot, halfWTop);

  ctx.clearRect(0, 0, W, H);

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, vpY);
  sky.addColorStop(0, C.bgTop);
  sky.addColorStop(1, C.bgBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, vpY);

  // Ground
  ctx.fillStyle = C.ground0;
  ctx.fillRect(0, vpY, W, H - vpY);

  // ── Scrolling road strips ──
  const scrollOff = gs.distance % (1 / STRIP_COUNT);
  for (let i = 0; i < STRIP_COUNT + 1; i++) {
    const z0 = (i + scrollOff) / STRIP_COUNT;
    const z1 = (i + 1 + scrollOff) / STRIP_COUNT;
    if (z0 > 1) continue;
    const p0L = p(0, z0); const p0R = p(2, z0);
    const p1L = p(0, Math.min(z1, 1)); const p1R = p(2, Math.min(z1, 1));
    const lw0 = (p0R.x - p0L.x) / 3;
    const lw1 = (p1R.x - p1L.x) / 3;
    ctx.beginPath();
    ctx.moveTo(p0L.x - lw0 * 0.15, p0L.y);
    ctx.lineTo(p0R.x + lw0 * 0.15, p0R.y);
    ctx.lineTo(p1R.x + lw1 * 0.15, p1R.y);
    ctx.lineTo(p1L.x - lw1 * 0.15, p1L.y);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? C.ground0 : C.ground1;
    ctx.fill();
  }

  // ── Lane dividers ──
  ctx.save();
  ctx.strokeStyle = C.lane;
  ctx.lineWidth   = Math.max(1, 1.5 * scale);
  ctx.setLineDash([8 * scale, 14 * scale]);
  for (let d = 0; d < 4; d++) {
    const baseLane = d === 3 ? 2 : d as Lane;
    const side     = d === 0 ? -1 : d === 3 ? 1 : 0;
    const near = p(baseLane, 0.02); const far = p(baseLane, 0.98);
    const wNear = (p(2, 0.02).x - p(0, 0.02).x) / 3;
    const wFar  = (p(2, 0.98).x - p(0, 0.98).x) / 3;
    ctx.beginPath();
    ctx.moveTo(near.x + side * wNear / 2, near.y);
    ctx.lineTo(far.x  + side * wFar  / 2, far.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // ── Collect + sort renderables (painter's algorithm) ──
  type R = { z: number; draw: () => void };
  const renderables: R[] = [];

  for (const coin of gs.coins) {
    if (coin.collected || coin.z > 1) continue;
    renderables.push({ z: coin.z, draw: () => {
      const q = p(coin.lane, coin.z);
      const r = Math.max(2, 14 * q.pScale * scale);
      ctx.save();
      ctx.shadowBlur = 12 * scale; ctx.shadowColor = C.coinGlow;
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
      ctx.fillStyle = C.coin; ctx.fill();
      ctx.beginPath(); ctx.arc(q.x - r * 0.25, q.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,220,0.7)'; ctx.fill();
      ctx.restore();
    }});
  }

  for (const obs of gs.obstacles) {
    if (obs.z > 1) continue;
    renderables.push({ z: obs.z, draw: () => {
      const q     = p(obs.lane, obs.z);
      const laneW = (p(2, obs.z).x - p(0, obs.z).x) / 3;
      ctx.save();
      if (obs.type === 'pillar') {
        const w = laneW * 0.55;
        const h = 110 * q.pScale * scale;
        ctx.shadowBlur = 20 * scale; ctx.shadowColor = C.pillarGlow;
        ctx.fillStyle  = C.pillar;
        ctx.beginPath(); ctx.roundRect(q.x - w / 2, q.y - h, w, h, 4 * q.pScale); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.roundRect(q.x - w / 2 + 3 * q.pScale, q.y - h + 4 * q.pScale, w * 0.25, h * 0.6, 2); ctx.fill();
      } else {
        const w = laneW * 0.85;
        const h = 22 * q.pScale * scale;
        ctx.shadowBlur = 16 * scale; ctx.shadowColor = C.barGlow;
        ctx.fillStyle  = C.bar;
        ctx.beginPath(); ctx.roundRect(q.x - w / 2, q.y - h, w, h, 3 * q.pScale); ctx.fill();
        ctx.fillStyle = 'rgba(168,85,247,0.5)';
        ctx.fillRect(q.x - w / 2, q.y - h, w, 3 * q.pScale);
      }
      ctx.restore();
    }});
  }

  renderables.sort((a, b) => b.z - a.z);
  for (const r of renderables) r.draw();

  // ── Player ──
  {
    const near  = p(gs.player.lane, 0.04);
    const nearT = p(gs.player.targetLane, 0.04);
    const px    = near.x + (nearT.x - near.x) * gs.player.laneT;
    const baseY = near.y;
    const jumpOffset = gs.player.jumpY * 1.8 * scale;  // visual only — collision uses abstract jumpY

    const pw = 28 * scale;
    const ph = 52 * scale;
    const hr = 10 * scale;  // head radius

    ctx.save();
    ctx.shadowBlur = 24 * scale; ctx.shadowColor = C.playerGlow;
    ctx.fillStyle  = C.player;

    // Body
    ctx.beginPath(); ctx.roundRect(px - pw / 2, baseY - ph - jumpOffset, pw, ph, 6 * scale); ctx.fill();
    // Head
    ctx.beginPath(); ctx.arc(px, baseY - ph - jumpOffset - hr * 1.2, hr, 0, Math.PI * 2); ctx.fill();
    // Legs
    const legPhase = (gs.distance * 15) % (Math.PI * 2);
    const legOff   = Math.sin(legPhase) * 8 * scale;
    ctx.fillStyle = 'rgba(51,204,255,0.6)';
    ctx.fillRect(px - pw / 2 + 2, baseY - jumpOffset, pw / 2 - 2, 10 * scale + legOff);
    ctx.fillRect(px + 2,           baseY - jumpOffset, pw / 2 - 2, 10 * scale - legOff);
    ctx.restore();

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.25 - gs.player.jumpY * 0.003);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(px, baseY + 2, pw * 0.6, 5 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── HUD ──
  {
    const pad    = 14 * scale;
    const barW   = Math.round(80 * scale);
    const barH   = Math.round(Math.max(4, 6 * scale));
    const fScore = Math.max(10, Math.round(22 * scale));
    const fLabel = Math.max(8,  Math.round(11 * scale));

    const speedRatio = (gs.speed - INITIAL_SPEED) / (SPEED_CAP - INITIAL_SPEED);

    ctx.save();
    ctx.shadowBlur  = 8 * scale;
    ctx.shadowColor = C.playerGlow;

    if (isPortrait) {
      // Score centred at top
      ctx.textAlign  = 'center';
      ctx.font       = `bold ${fScore}px monospace`;
      ctx.fillStyle  = C.hud;
      ctx.fillText(`${gs.score}`, W / 2, pad + fScore);

      ctx.font      = `${fLabel}px monospace`;
      ctx.fillStyle = C.hudDim;
      ctx.shadowBlur = 0;
      ctx.fillText('SCORE', W / 2, pad + fScore + fLabel + 2);

      // Speed bar — top right
      ctx.shadowBlur = 0;
      ctx.fillStyle  = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.roundRect(W - barW - pad, pad, barW, barH, 3); ctx.fill();
      ctx.fillStyle  = C.pillar;
      ctx.shadowBlur = 6 * scale; ctx.shadowColor = C.pillarGlow;
      ctx.beginPath(); ctx.roundRect(W - barW - pad, pad, barW * speedRatio, barH, 3); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.textAlign  = 'right';
      ctx.font       = `${fLabel}px monospace`;
      ctx.fillStyle  = C.hudDim;
      ctx.fillText('SPEED', W - pad, pad + barH + fLabel + 2);
    } else {
      // Score top-left
      ctx.textAlign  = 'left';
      ctx.font       = `bold ${fScore}px monospace`;
      ctx.fillStyle  = C.hud;
      ctx.fillText(`${gs.score}`, pad, pad + fScore);

      ctx.font      = `${fLabel}px monospace`;
      ctx.fillStyle = C.hudDim;
      ctx.shadowBlur = 0;
      ctx.fillText('SCORE', pad, pad + fScore + fLabel + 2);

      // Speed bar — top right
      ctx.fillStyle  = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.roundRect(W - barW - pad, pad, barW, barH, 3); ctx.fill();
      ctx.fillStyle  = C.pillar;
      ctx.shadowBlur = 6 * scale; ctx.shadowColor = C.pillarGlow;
      ctx.beginPath(); ctx.roundRect(W - barW - pad, pad, barW * speedRatio, barH, 3); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.textAlign  = 'left';
      ctx.font       = `${fLabel}px monospace`;
      ctx.fillStyle  = C.hudDim;
      ctx.fillText('SPEED', W - barW - pad, pad + barH + fLabel + 2);
    }
    ctx.restore();
  }

  // ── Idle screen ──
  if (gs.phase === 'idle') {
    const lineH  = Math.round(28 * scale);
    const fTitle = Math.max(16, Math.round(38 * scale));
    const fInstr = Math.max(10, Math.round(16 * scale));
    const fCta   = Math.max(11, Math.round(18 * scale));

    ctx.save();
    ctx.fillStyle = 'rgba(5,5,17,0.78)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign   = 'center';
    ctx.font        = `bold ${fTitle}px monospace`;
    ctx.fillStyle   = C.player;
    ctx.shadowBlur  = 20 * scale;
    ctx.shadowColor = C.playerGlow;
    ctx.fillText('TEMPLE DASH', W / 2, H / 2 - lineH * 2.5);

    ctx.shadowBlur = 0;
    ctx.font       = `${fInstr}px monospace`;
    ctx.fillStyle  = 'rgba(255,255,255,0.7)';

    if (isPortrait) {
      ctx.fillText('← → switch lanes', W / 2, H / 2 - lineH * 0.5);
      ctx.fillText('↑ / Swipe up to jump', W / 2, H / 2 + lineH * 0.5);
      ctx.fillText('Tap to start', W / 2, H / 2 + lineH * 1.5);
    } else {
      ctx.fillText('← → switch lanes     ↑ / Space to jump', W / 2, H / 2 - lineH * 0.5);
      ctx.fillText('Swipe on mobile', W / 2, H / 2 + lineH * 0.5);
    }

    const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 400);
    ctx.globalAlpha = pulse;
    ctx.font        = `bold ${fCta}px monospace`;
    ctx.fillStyle   = C.coin;
    ctx.shadowBlur  = 12 * scale;
    ctx.shadowColor = C.coinGlow;
    ctx.fillText(
      isPortrait ? 'Tap to Start' : 'Press SPACE or Tap to Start',
      W / 2, H / 2 + lineH * (isPortrait ? 3 : 2),
    );
    ctx.restore();
  }

  // ── Game over screen ──
  if (gs.phase === 'dead') {
    const lineH  = Math.round(28 * scale);
    const fOver  = Math.max(18, Math.round(42 * scale));
    const fScore = Math.max(14, Math.round(26 * scale));
    const fRestart = Math.max(10, Math.round(16 * scale));

    ctx.save();
    ctx.fillStyle = 'rgba(5,5,17,0.82)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign   = 'center';
    ctx.font        = `bold ${fOver}px monospace`;
    ctx.fillStyle   = C.pillar;
    ctx.shadowBlur  = 24 * scale;
    ctx.shadowColor = C.pillarGlow;
    ctx.fillText('GAME OVER', W / 2, H / 2 - lineH * 1.5);

    ctx.font        = `bold ${fScore}px monospace`;
    ctx.fillStyle   = C.coin;
    ctx.shadowColor = C.coinGlow;
    ctx.fillText(`Score: ${gs.score}`, W / 2, H / 2 + lineH * 0.2);

    ctx.font       = `bold ${fRestart}px monospace`;
    ctx.fillStyle  = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText(
      isPortrait ? 'Tap to Restart' : 'Press SPACE or Tap to Restart',
      W / 2, H / 2 + lineH * 2,
    );
    ctx.restore();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EndlessRunnerGame({ title }: { title: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gsRef        = useRef<GS>(makeState());
  const sizeRef      = useRef({ W: REF_W, H: REF_H });   // live canvas dimensions for RAF

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);

  // Keep setters stable across renders without re-running the effect
  const setPhaseRef = useRef(setPhase);
  const setScoreRef = useRef(setScore);
  setPhaseRef.current = setPhase;
  setScoreRef.current = setScore;

  useEffect(() => {
    const canvas    = canvasRef.current!;
    const container = containerRef.current!;
    const ctx       = canvas.getContext('2d')!;

    // Initial size
    const initRect   = canvas.getBoundingClientRect();
    canvas.width     = initRect.width  || REF_W;
    canvas.height    = initRect.height || REF_H;
    sizeRef.current  = { W: canvas.width, H: canvas.height };

    // RAF loop — reads W/H from sizeRef every frame so resizes take effect immediately
    const loop = () => {
      const { W, H } = sizeRef.current;
      const gs = gsRef.current;
      if (gs.phase === 'running') update(gs, setScoreRef.current, setPhaseRef.current);
      draw(ctx, gs, W, H);
      gs.frameId = requestAnimationFrame(loop);
    };
    gsRef.current.frameId = requestAnimationFrame(loop);

    // ResizeObserver — updates the canvas buffer and sizeRef without touching game state
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      const W = Math.round(width);
      const H = Math.round(height);
      canvas.width  = W;
      canvas.height = H;
      sizeRef.current = { W, H };
    });
    ro.observe(container);

    // Keyboard
    const onKey = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (gs.phase !== 'running') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          gsRef.current = { ...makeState(), phase: 'running', frameId: gs.frameId };
          setPhaseRef.current('running');
          setScoreRef.current(0);
        }
        return;
      }
      if (e.code === 'ArrowLeft')                        { e.preventDefault(); shiftLane(gs, -1); }
      if (e.code === 'ArrowRight')                       { e.preventDefault(); shiftLane(gs, 1);  }
      if (e.code === 'ArrowUp' || e.code === 'Space')    { e.preventDefault(); doJump(gs); }
    };
    window.addEventListener('keydown', onKey);

    // Touch
    let touchX = 0; let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      const gs = gsRef.current;
      if (gs.phase !== 'running') {
        gsRef.current = { ...makeState(), phase: 'running', frameId: gs.frameId };
        setPhaseRef.current('running');
        setScoreRef.current(0);
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 25) shiftLane(gs, dx > 0 ? 1 : -1); }
      else                             { if (dy < -25) doJump(gs); }
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      cancelAnimationFrame(gsRef.current.frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  return (
    <div
      className={styles.gameInner}
      style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.5rem', boxSizing: 'border-box' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', alignItems: 'center' }}>
          <span>← → lanes</span>
          <span>↑ jump</span>
          {phase === 'running' && (
            <span style={{ color: '#ffcc00', fontWeight: 700 }}>Score: {score}</span>
          )}
        </div>
      </div>

      {/* Canvas wrapper — observed by ResizeObserver */}
      <div
        ref={containerRef}
        style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(109,40,217,0.4)', cursor: 'pointer' }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
