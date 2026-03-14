"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ─── Constants ───────────────────────────────────────────────────────────────
const GRAVITY = 0.6;
const JUMP_FORCE = 13;
const BAR_CLEARANCE = 28;       // jumpY must exceed this to clear a bar
const LANE_SLIDE_SPEED = 0.2;
const INITIAL_SPEED = 0.005;
const SPEED_CAP = 0.016;
const COLLISION_Z = 0.09;       // depth band for collision checks
const STRIP_COUNT = 20;         // ground strips for scrolling effect

// Neon palette (hardcoded — canvas can't read CSS vars)
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
    phase:      'idle',
    distance:   0,
    speed:      INITIAL_SPEED,
    score:      0,
    player: {
      lane: 1, targetLane: 1, laneT: 1,
      jumpY: 0, jumpVY: 0, isJumping: false,
    },
    obstacles:  [],
    coins:      [],
    spawnTimer: 80,
    coinTimer:  50,
    nextId:     0,
    frameId:    0,
  };
}

function project(lane: Lane, z: number, W: number, H: number) {
  const vpY = H * 0.36;
  const screenY = H + (vpY - H) * z;
  const halfWBottom = W * 0.40;
  const halfWTop    = W * 0.03;
  const halfW = halfWBottom + (halfWTop - halfWBottom) * z;
  const laneOffsets: [number, number, number] = [-1, 0, 1];
  const laneX = W / 2 + laneOffsets[lane] * (halfW * 2 / 3);
  const scale = Math.max(0, 1 - z);
  return { x: laneX, y: screenY, scale };
}

function effectiveLane(p: Player): Lane {
  const raw = p.lane * (1 - p.laneT) + p.targetLane * p.laneT;
  return Math.round(raw) as Lane;
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

// ─── Update ──────────────────────────────────────────────────────────────────
function update(
  gs: GS,
  setScore: (n: number) => void,
  setPhase: (p: Phase) => void,
) {
  // Speed ramp
  gs.distance += gs.speed;
  gs.speed = Math.min(SPEED_CAP, INITIAL_SPEED + gs.distance * 0.0000025);

  // Score
  const newScore = Math.floor(gs.distance * 10);
  if (newScore !== gs.score) {
    gs.score = newScore;
    if (gs.score % 5 === 0) setScore(gs.score);  // throttle React updates
  }

  // Lane slide
  if (gs.player.laneT < 1) {
    gs.player.laneT = Math.min(1, gs.player.laneT + LANE_SLIDE_SPEED);
  }

  // Jump physics
  if (gs.player.isJumping) {
    gs.player.jumpY  += gs.player.jumpVY;
    gs.player.jumpVY -= GRAVITY;
    if (gs.player.jumpY <= 0) {
      gs.player.jumpY     = 0;
      gs.player.jumpVY    = 0;
      gs.player.isJumping = false;
    }
  }

  // Advance objects
  for (const o of gs.obstacles) o.z -= gs.speed;
  for (const c of gs.coins)     c.z -= gs.speed;

  // Remove passed objects
  gs.obstacles = gs.obstacles.filter(o => o.z > -0.05);
  gs.coins     = gs.coins.filter(c => c.z > -0.05);

  // Spawn obstacles
  gs.spawnTimer--;
  if (gs.spawnTimer <= 0) {
    const lane  = (Math.floor(Math.random() * 3)) as Lane;
    const type  = Math.random() < 0.45 ? 'bar' : 'pillar';
    gs.obstacles.push({ id: gs.nextId++, lane, z: 1.0, type });
    // Occasionally add a second obstacle in a different lane
    if (Math.random() < 0.3) {
      const lane2 = ((lane + 1 + Math.floor(Math.random() * 2)) % 3) as Lane;
      gs.obstacles.push({ id: gs.nextId++, lane: lane2, z: 1.0, type: Math.random() < 0.4 ? 'bar' : 'pillar' });
    }
    const baseInterval = Math.max(45, 90 - gs.distance * 0.01);
    gs.spawnTimer = baseInterval + Math.floor(Math.random() * 30);
  }

  // Spawn coins
  gs.coinTimer--;
  if (gs.coinTimer <= 0) {
    const lane = (Math.floor(Math.random() * 3)) as Lane;
    // Spawn 3–5 coins in a row
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      gs.coins.push({ id: gs.nextId++, lane, z: 1.0 + i * 0.07, collected: false });
    }
    gs.coinTimer = 70 + Math.floor(Math.random() * 40);
  }

  // Collision detection
  const pLane = effectiveLane(gs.player);
  for (const obs of gs.obstacles) {
    if (obs.z > COLLISION_Z || obs.z < 0) continue;
    if (obs.lane !== pLane) continue;
    if (obs.type === 'bar' && gs.player.jumpY >= BAR_CLEARANCE) continue;
    // Hit!
    gs.phase = 'dead';
    setScore(gs.score);
    setPhase('dead');
    return;
  }

  // Coin collection
  for (const coin of gs.coins) {
    if (coin.collected) continue;
    if (coin.z > COLLISION_Z || coin.z < 0) continue;
    if (coin.lane !== pLane) continue;
    coin.collected = true;
    gs.score += 50;
    setScore(gs.score);
  }
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, gs: GS, W: number, H: number) {
  ctx.clearRect(0, 0, W, H);

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.36);
  sky.addColorStop(0, C.bgTop);
  sky.addColorStop(1, C.bgBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.36);

  // Ground fill below horizon
  ctx.fillStyle = C.ground0;
  ctx.fillRect(0, H * 0.36, W, H);

  // ── Road strips (scrolling) ──
  const scrollOffset = gs.distance % (1 / STRIP_COUNT);
  for (let i = 0; i < STRIP_COUNT + 1; i++) {
    const z0 = (i + scrollOffset) / STRIP_COUNT;
    const z1 = (i + 1 + scrollOffset) / STRIP_COUNT;
    if (z0 > 1) continue;
    const p0L = project(0, z0, W, H);
    const p0R = project(2, z0, W, H);
    const p1L = project(0, Math.min(z1, 1), W, H);
    const p1R = project(2, Math.min(z1, 1), W, H);
    const laneW0 = (p0R.x - p0L.x) / 3;
    const laneW1 = (p1R.x - p1L.x) / 3;

    ctx.beginPath();
    ctx.moveTo(p0L.x - laneW0 * 0.15, p0L.y);
    ctx.lineTo(p0R.x + laneW0 * 0.15, p0R.y);
    ctx.lineTo(p1R.x + laneW1 * 0.15, p1R.y);
    ctx.lineTo(p1L.x - laneW1 * 0.15, p1L.y);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? C.ground0 : C.ground1;
    ctx.fill();
  }

  // ── Lane dividers ──
  ctx.save();
  for (let lane = 0; lane < 4; lane++) {
    const pNear = project(lane === 3 ? 2 : lane as Lane, 0.02, W, H);
    const pFar  = project(lane === 3 ? 2 : lane as Lane, 0.98, W, H);
    const offNear = lane === 0 ? -1 : lane === 3 ? 1 : 0;
    const offFar  = offNear;
    const wNear = (project(2, 0.02, W, H).x - project(0, 0.02, W, H).x) / 3;
    const wFar  = (project(2, 0.98, W, H).x - project(0, 0.98, W, H).x) / 3;

    ctx.beginPath();
    ctx.moveTo(pNear.x + offNear * (wNear / 2), pNear.y);
    ctx.lineTo(pFar.x  + offFar  * (wFar  / 2), pFar.y);
    ctx.strokeStyle = C.lane;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 14]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // ── Collect renderable objects, sort far→near ──
  type Renderable = { z: number; draw: () => void };
  const renderables: Renderable[] = [];

  // Coins
  for (const coin of gs.coins) {
    if (coin.collected || coin.z > 1) continue;
    renderables.push({
      z: coin.z,
      draw: () => {
        const p = project(coin.lane, coin.z, W, H);
        const r = Math.max(3, 14 * p.scale);
        ctx.save();
        ctx.shadowBlur  = 12;
        ctx.shadowColor = C.coinGlow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = C.coin;
        ctx.fill();
        // Inner shine
        ctx.beginPath();
        ctx.arc(p.x - r * 0.25, p.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,220,0.7)';
        ctx.fill();
        ctx.restore();
      },
    });
  }

  // Obstacles
  for (const obs of gs.obstacles) {
    if (obs.z > 1) continue;
    renderables.push({
      z: obs.z,
      draw: () => {
        const p    = project(obs.lane, obs.z, W, H);
        const laneW = (project(2, obs.z, W, H).x - project(0, obs.z, W, H).x) / 3;

        ctx.save();
        if (obs.type === 'pillar') {
          const w = laneW * 0.55;
          const h = 110 * p.scale;
          ctx.shadowBlur  = 20;
          ctx.shadowColor = C.pillarGlow;
          ctx.fillStyle   = C.pillar;
          ctx.beginPath();
          ctx.roundRect(p.x - w / 2, p.y - h, w, h, 4 * p.scale);
          ctx.fill();
          // Highlight stripe
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.roundRect(p.x - w / 2 + 3 * p.scale, p.y - h + 4 * p.scale, w * 0.25, h * 0.6, 2);
          ctx.fill();
        } else {
          // bar — wide, low, must jump over
          const w = laneW * 0.85;
          const h = 22 * p.scale;
          ctx.shadowBlur  = 16;
          ctx.shadowColor = C.barGlow;
          ctx.fillStyle   = C.bar;
          ctx.beginPath();
          ctx.roundRect(p.x - w / 2, p.y - h, w, h, 3 * p.scale);
          ctx.fill();
          ctx.fillStyle = 'rgba(168,85,247,0.5)';
          ctx.fillRect(p.x - w / 2, p.y - h, w, 3 * p.scale);
        }
        ctx.restore();
      },
    });
  }

  // Sort far → near (painter's algorithm)
  renderables.sort((a, b) => b.z - a.z);
  for (const r of renderables) r.draw();

  // ── Player ──
  {
    const p     = project(gs.player.lane, 0.04, W, H);
    const tLane = project(gs.player.targetLane, 0.04, W, H);
    const px    = p.x + (tLane.x - p.x) * gs.player.laneT;
    const baseY = p.y;
    const jumpOffset = gs.player.jumpY * 1.8;

    const pw = 28;
    const ph = 52;

    ctx.save();
    ctx.shadowBlur  = 24;
    ctx.shadowColor = C.playerGlow;

    // Body
    ctx.fillStyle = C.player;
    ctx.beginPath();
    ctx.roundRect(px - pw / 2, baseY - ph - jumpOffset, pw, ph, 6);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(px, baseY - ph - jumpOffset - 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Legs (simple animation based on distance)
    const legPhase = (gs.distance * 15) % (Math.PI * 2);
    const legOff   = Math.sin(legPhase) * 8;
    ctx.fillStyle = 'rgba(51,204,255,0.6)';
    ctx.fillRect(px - pw / 2 + 2, baseY - jumpOffset, pw / 2 - 2, 10 + legOff);
    ctx.fillRect(px + 2,           baseY - jumpOffset, pw / 2 - 2, 10 - legOff);

    ctx.restore();

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.25 - gs.player.jumpY * 0.003;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(px, baseY + 2, pw * 0.6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── HUD ──
  ctx.save();
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = C.hud;
  ctx.shadowBlur  = 8;
  ctx.shadowColor = C.playerGlow;
  ctx.fillText(`${gs.score}`, 20, 36);

  ctx.font = '12px monospace';
  ctx.fillStyle = C.hudDim;
  ctx.fillText('SCORE', 20, 52);

  // Speed bar
  const speedRatio = (gs.speed - INITIAL_SPEED) / (SPEED_CAP - INITIAL_SPEED);
  const barW = 100;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.roundRect(W - barW - 20, 20, barW, 8, 4);
  ctx.fill();
  ctx.fillStyle = C.pillar;
  ctx.shadowColor = C.pillarGlow;
  ctx.shadowBlur = 6;
  ctx.roundRect(W - barW - 20, 20, barW * speedRatio, 8, 4);
  ctx.fill();
  ctx.fillStyle = C.hudDim;
  ctx.shadowBlur = 0;
  ctx.font = '11px monospace';
  ctx.fillText('SPEED', W - barW - 20, 44);
  ctx.restore();

  // ── Idle screen ──
  if (gs.phase === 'idle') {
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,17,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = C.player;
    ctx.shadowBlur  = 20;
    ctx.shadowColor = C.playerGlow;
    ctx.fillText('TEMPLE DASH', W / 2, H / 2 - 60);

    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText('← → to switch lanes     ↑ / Space to jump', W / 2, H / 2);
    ctx.fillText('Swipe on mobile', W / 2, H / 2 + 28);

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = C.coin;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = C.coinGlow;
    const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 400);
    ctx.globalAlpha = pulse;
    ctx.fillText('Press SPACE or Tap to Start', W / 2, H / 2 + 80);
    ctx.restore();
  }

  // ── Game over screen ──
  if (gs.phase === 'dead') {
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,17,0.82)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = C.pillar;
    ctx.shadowBlur  = 24;
    ctx.shadowColor = C.pillarGlow;
    ctx.fillText('GAME OVER', W / 2, H / 2 - 60);

    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = C.coin;
    ctx.shadowColor = C.coinGlow;
    ctx.fillText(`Score: ${gs.score}`, W / 2, H / 2);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText('Press SPACE or Tap to Restart', W / 2, H / 2 + 60);
    ctx.restore();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EndlessRunnerGame({ title }: { title: string }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const gsRef      = useRef<GS>(makeState());
  const [phase, setPhase]       = useState<Phase>('idle');
  const [score, setScore]       = useState(0);

  // Keep setters stable in the RAF closure via refs
  const setPhaseRef = useRef(setPhase);
  const setScoreRef = useRef(setScore);
  setPhaseRef.current = setPhase;
  setScoreRef.current = setScore;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    canvas.width  = rect.width  || 700;
    canvas.height = rect.height || 420;
    const ctx = canvas.getContext('2d')!;
    const W   = canvas.width;
    const H   = canvas.height;

    const loop = () => {
      const gs = gsRef.current;
      if (gs.phase === 'running') {
        update(gs, setScoreRef.current, setPhaseRef.current);
      }
      draw(ctx, gs, W, H);
      gs.frameId = requestAnimationFrame(loop);
    };
    gsRef.current.frameId = requestAnimationFrame(loop);

    // ── Keyboard ──
    const onKey = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (gs.phase !== 'running') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          gsRef.current       = makeState();
          gsRef.current.phase = 'running';
          setPhaseRef.current('running');
          setScoreRef.current(0);
        }
        return;
      }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); shiftLane(gs, -1); }
      if (e.code === 'ArrowRight') { e.preventDefault(); shiftLane(gs, 1);  }
      if (e.code === 'ArrowUp' || e.code === 'Space') { e.preventDefault(); doJump(gs); }
    };
    window.addEventListener('keydown', onKey);

    // ── Touch ──
    let touchX = 0;
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      const gs = gsRef.current;

      if (gs.phase !== 'running') {
        gsRef.current       = makeState();
        gsRef.current.phase = 'running';
        setPhaseRef.current('running');
        setScoreRef.current(0);
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 25) shiftLane(gs, dx > 0 ? 1 : -1);
      } else {
        if (dy < -25) doJump(gs);
      }
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      cancelAnimationFrame(gsRef.current.frameId);
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

      {/* Canvas */}
      <div style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(109,40,217,0.4)', cursor: 'pointer' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
