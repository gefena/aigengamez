"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ─── Constants ───────────────────────────────────────────────────────────────
const GRAVITY           = 0.6;
const JUMP_FORCE        = 13;
const BAR_CLEARANCE     = 28;
const SLIDE_DURATION    = 55;
const LANE_SLIDE_SPD    = 0.2;
const INITIAL_SPEED     = 0.005;
const SPEED_CAP         = 0.016;
const COLLISION_Z       = 0.09;
const STRIP_COUNT       = 20;
const REF_W             = 800;
const REF_H             = 500;
const INVINCIBLE_FRAMES = 120;
const MAGNET_DURATION   = 360;
const SLOWMO_DURATION   = 240;
const MAGNET_Z          = 0.15;
const MILESTONES        = [100, 250, 500, 1000, 2000, 5000, 10000];

const C = {
  bgTop: '#050511', bgBottom: '#1a1a2e',
  ground0: '#0f0f1e', ground1: '#13132a',
  lane: 'rgba(109,40,217,0.35)',
  player: '#33ccff', playerGlow: '#33ccff',
  pillar: '#ec4899', pillarGlow: '#ec4899',
  bar: '#6d28d9', barGlow: '#a855f7',
  beam: '#ff6b2b', beamGlow: '#ffaa33',
  coin: '#ffcc00', coinGlow: '#ffcc00',
  shield: '#33ff99', shieldGlow: '#33ff99',
  magnet: '#ff9a9e', magnetGlow: '#ff6b6b',
  slowmo: '#ce93d8', slowmoGlow: '#9933ff',
  hud: '#ffffff', hudDim: 'rgba(255,255,255,0.4)',
  heart: '#ec4899', star: '#ffffff',
};

// ─── Audio ───────────────────────────────────────────────────────────────────
let _ac: AudioContext | null = null;

function getAC(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_ac || _ac.state === 'closed') _ac = new AudioContext();
    if (_ac.state === 'suspended') _ac.resume();
    return _ac;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, delay = 0) {
  const ac = getAC(); if (!ac) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime + delay);
    g.gain.setValueAtTime(vol, ac.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
    o.start(ac.currentTime + delay); o.stop(ac.currentTime + delay + dur);
  } catch { /* ignore */ }
}

const SFX = {
  coin:      () => tone(880, 0.08, 'sine', 0.18),
  jump:      () => { tone(260, 0.1, 'sine', 0.15); tone(320, 0.08, 'sine', 0.1, 0.06); },
  slide:     () => tone(160, 0.14, 'sawtooth', 0.1),
  hit:       () => { tone(120, 0.2, 'sawtooth', 0.3); tone(80, 0.3, 'square', 0.2, 0.1); },
  death:     () => { tone(100, 0.35, 'sawtooth', 0.4); tone(60, 0.45, 'square', 0.25, 0.18); },
  powerup:   () => { tone(440, 0.08, 'sine', 0.2); tone(554, 0.08, 'sine', 0.2, 0.09); tone(659, 0.12, 'sine', 0.25, 0.18); },
  milestone: () => { tone(523, 0.08, 'sine', 0.22); tone(659, 0.08, 'sine', 0.22, 0.1); tone(784, 0.15, 'sine', 0.28, 0.2); },
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Phase    = 'idle' | 'running' | 'dead';
type Lane     = 0 | 1 | 2;
type ObsType  = 'pillar' | 'bar' | 'beam';
type PwrType  = 'shield' | 'magnet' | 'slowmo';

interface Player {
  lane: Lane; targetLane: Lane; laneT: number;
  jumpY: number; jumpVY: number; isJumping: boolean;
  isSliding: boolean; slideTimer: number;
}
interface Obstacle { id: number; lane: Lane; z: number; type: ObsType; }
interface Coin     { id: number; lane: Lane; z: number; collected: boolean; justCollected: boolean; }
interface PowerUp  { id: number; lane: Lane; z: number; type: PwrType; }
interface Star     { x: number; y: number; r: number; phase: number; spd: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; decay: number; color: string; r: number; }

interface GS {
  phase: Phase; distance: number; speed: number; score: number; highScore: number;
  lives: number; invincible: number;
  player: Player;
  obstacles: Obstacle[]; coins: Coin[]; powerUps: PowerUp[];
  particles: Particle[]; stars: Star[];
  shieldActive: boolean; magnetTimer: number; slowmoTimer: number;
  spawnTimer: number; coinTimer: number; powerUpTimer: number;
  nextId: number; frameId: number; frame: number;
  shakeFrames: number; shakeIntensity: number;
  milestone: { text: string; frames: number } | null;
  lastMilestone: number;
}

// ─── State helpers ────────────────────────────────────────────────────────────
function makeStars(): Star[] {
  return Array.from({ length: 80 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
    spd: 0.5 + Math.random() * 1.5,
  }));
}

function makeState(highScore = 0): GS {
  return {
    phase: 'idle', distance: 0, speed: INITIAL_SPEED, score: 0, highScore,
    lives: 3, invincible: 0,
    player: { lane: 1, targetLane: 1, laneT: 1, jumpY: 0, jumpVY: 0, isJumping: false, isSliding: false, slideTimer: 0 },
    obstacles: [], coins: [], powerUps: [], particles: [], stars: makeStars(),
    shieldActive: false, magnetTimer: 0, slowmoTimer: 0,
    spawnTimer: 80, coinTimer: 50, powerUpTimer: 220,
    nextId: 0, frameId: 0, frame: 0,
    shakeFrames: 0, shakeIntensity: 0,
    milestone: null, lastMilestone: 0,
  };
}

// ─── Projection ──────────────────────────────────────────────────────────────
function corridorK(W: number, H: number) {
  const t      = Math.min(1, Math.max(0, (W / H - 0.56) / 1.22));
  const vpY    = H * (0.40 - 0.04 * t);
  const hwBot  = W * (0.46 - 0.06 * t);
  const hwTop  = W * 0.03;
  return { vpY, hwBot, hwTop };
}

function proj(lane: Lane, z: number, W: number, H: number, vpY: number, hwBot: number, hwTop: number) {
  const y     = H + (vpY - H) * z;
  const hw    = hwBot + (hwTop - hwBot) * z;
  const x     = W / 2 + ([-1, 0, 1] as const)[lane] * (hw * 2 / 3);
  const ps    = Math.max(0, 1 - z);
  return { x, y, ps, hw };
}

// ─── Actions ─────────────────────────────────────────────────────────────────
function effLane(p: Player): Lane {
  return Math.round(p.lane * (1 - p.laneT) + p.targetLane * p.laneT) as Lane;
}

function shiftLane(gs: GS, dir: -1 | 1) {
  const next = (gs.player.targetLane + dir) as Lane;
  if (next < 0 || next > 2) return;
  gs.player.lane = effLane(gs.player);
  gs.player.targetLane = next;
  gs.player.laneT = 0;
}

function doJump(gs: GS) {
  if (gs.player.isJumping || gs.player.isSliding) return;
  gs.player.isJumping = true; gs.player.jumpVY = JUMP_FORCE;
  SFX.jump();
}

function doSlide(gs: GS) {
  if (gs.player.isJumping || gs.player.isSliding) return;
  gs.player.isSliding = true; gs.player.slideTimer = SLIDE_DURATION;
  SFX.slide();
}

function spawnParticles(gs: GS, x: number, y: number, color: string, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const spd   = 1.5 + Math.random() * 3;
    gs.particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1, life: 1, decay: 0.04 + Math.random() * 0.03, color, r: 2 + Math.random() * 3 });
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────
function update(gs: GS, setScore: (n: number) => void, setPhase: (p: Phase) => void) {
  gs.frame++;
  const effSpeed = gs.slowmoTimer > 0 ? gs.speed * 0.45 : gs.speed;
  gs.distance   += effSpeed;
  gs.speed       = Math.min(SPEED_CAP, INITIAL_SPEED + gs.distance * 0.0000025);

  // Score + high score
  const ns = Math.floor(gs.distance * 10);
  if (ns !== gs.score) {
    gs.score = ns;
    if (gs.score > gs.highScore) {
      gs.highScore = gs.score;
      try { localStorage.setItem('templeHighScore', String(gs.highScore)); } catch { /* ignore */ }
    }
    if (gs.score % 5 === 0) setScore(gs.score);
  }

  // Milestones
  for (const m of MILESTONES) {
    if (gs.distance >= m && gs.lastMilestone < m) {
      gs.lastMilestone = m;
      gs.milestone = { text: `${m}m!`, frames: 100 };
      SFX.milestone(); break;
    }
  }
  if (gs.milestone) { gs.milestone.frames--; if (gs.milestone.frames <= 0) gs.milestone = null; }

  // Timers
  if (gs.magnetTimer  > 0) gs.magnetTimer--;
  if (gs.slowmoTimer  > 0) gs.slowmoTimer--;
  if (gs.invincible   > 0) gs.invincible--;
  if (gs.shakeFrames  > 0) { gs.shakeFrames--; gs.shakeIntensity *= 0.84; }

  // Player movement
  if (gs.player.laneT < 1) gs.player.laneT = Math.min(1, gs.player.laneT + LANE_SLIDE_SPD);
  if (gs.player.isJumping) {
    gs.player.jumpY  += gs.player.jumpVY;
    gs.player.jumpVY -= GRAVITY;
    if (gs.player.jumpY <= 0) { gs.player.jumpY = 0; gs.player.jumpVY = 0; gs.player.isJumping = false; }
  }
  if (gs.player.isSliding) {
    gs.player.slideTimer--;
    if (gs.player.slideTimer <= 0) gs.player.isSliding = false;
  }

  // Advance objects
  for (const o of gs.obstacles) o.z -= effSpeed;
  for (const c of gs.coins)     c.z -= effSpeed;
  for (const p of gs.powerUps)  p.z -= effSpeed;
  gs.obstacles = gs.obstacles.filter(o => o.z > -0.05);
  gs.coins     = gs.coins.filter(c => c.z > -0.05);
  gs.powerUps  = gs.powerUps.filter(p => p.z > -0.05);

  // Particles
  for (const pt of gs.particles) {
    pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.vx *= 0.95; pt.life -= pt.decay;
  }
  gs.particles = gs.particles.filter(pt => pt.life > 0);

  // Spawn obstacles
  gs.spawnTimer--;
  if (gs.spawnTimer <= 0) {
    const lane = Math.floor(Math.random() * 3) as Lane;
    const r    = Math.random();
    const type: ObsType = r < 0.33 ? 'bar' : r < 0.66 ? 'beam' : 'pillar';
    gs.obstacles.push({ id: gs.nextId++, lane, z: 1.0, type });
    if (Math.random() < 0.28) {
      const lane2 = ((lane + 1 + Math.floor(Math.random() * 2)) % 3) as Lane;
      const r2    = Math.random();
      gs.obstacles.push({ id: gs.nextId++, lane: lane2, z: 1.0, type: r2 < 0.4 ? 'bar' : r2 < 0.7 ? 'beam' : 'pillar' });
    }
    gs.spawnTimer = Math.max(40, 90 - gs.distance * 0.01) + Math.floor(Math.random() * 30);
  }

  // Spawn coins
  gs.coinTimer--;
  if (gs.coinTimer <= 0) {
    const lane  = Math.floor(Math.random() * 3) as Lane;
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++)
      gs.coins.push({ id: gs.nextId++, lane, z: 1.0 + i * 0.07, collected: false, justCollected: false });
    gs.coinTimer = 65 + Math.floor(Math.random() * 35);
  }

  // Spawn power-ups
  gs.powerUpTimer--;
  if (gs.powerUpTimer <= 0) {
    const lane  = Math.floor(Math.random() * 3) as Lane;
    const types: PwrType[] = ['shield', 'magnet', 'slowmo'];
    gs.powerUps.push({ id: gs.nextId++, lane, z: 1.0, type: types[Math.floor(Math.random() * 3)] });
    gs.powerUpTimer = 280 + Math.floor(Math.random() * 200);
  }

  // Collision with obstacles
  if (gs.invincible === 0) {
    const pl = effLane(gs.player);
    for (const obs of gs.obstacles) {
      if (obs.z > COLLISION_Z || obs.z < 0 || obs.lane !== pl) continue;
      if (obs.type === 'bar'  && gs.player.jumpY >= BAR_CLEARANCE) continue;
      if (obs.type === 'beam' && gs.player.isSliding) continue;
      // Hit!
      if (gs.shieldActive) {
        gs.shieldActive = false;
        gs.invincible   = INVINCIBLE_FRAMES;
        gs.shakeFrames  = 10; gs.shakeIntensity = 5;
        SFX.hit();
      } else {
        gs.lives--;
        gs.shakeFrames = 20; gs.shakeIntensity = 8;
        SFX.hit();
        if (gs.lives <= 0) {
          gs.phase = 'dead'; setScore(gs.score); setPhase('dead'); SFX.death(); return;
        }
        gs.invincible = INVINCIBLE_FRAMES;
      }
      break;
    }
  }

  // Coin collection
  const pl = effLane(gs.player);
  for (const coin of gs.coins) {
    if (coin.collected) continue;
    const inZone   = coin.z < COLLISION_Z && coin.z > 0;
    const inMagnet = gs.magnetTimer > 0 && coin.z < MAGNET_Z && coin.z > 0;
    const laneDiff = Math.abs(coin.lane - pl);
    if ((inZone && coin.lane === pl) || (inMagnet && laneDiff <= 1)) {
      coin.collected = true; coin.justCollected = true;
      gs.score += 50; setScore(gs.score); SFX.coin();
    }
  }

  // Power-up collection
  for (const pu of gs.powerUps) {
    if (pu.z > COLLISION_Z || pu.z < 0 || pu.lane !== pl) continue;
    gs.powerUps = gs.powerUps.filter(p => p.id !== pu.id);
    if (pu.type === 'shield') gs.shieldActive  = true;
    if (pu.type === 'magnet') gs.magnetTimer   = MAGNET_DURATION;
    if (pu.type === 'slowmo') gs.slowmoTimer   = SLOWMO_DURATION;
    SFX.powerup(); break;
  }
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, gs: GS, W: number, H: number) {
  const scale      = Math.min(W / REF_W, H / REF_H);
  const isPortrait = W / H < 0.9;
  const { vpY, hwBot, hwTop } = corridorK(W, H);
  const p = (lane: Lane, z: number) => proj(lane, z, W, H, vpY, hwBot, hwTop);

  // Screen shake
  ctx.save();
  if (gs.shakeFrames > 0) {
    ctx.translate((Math.random() - 0.5) * gs.shakeIntensity * 2, (Math.random() - 0.5) * gs.shakeIntensity * 2);
  }
  ctx.clearRect(-20, -20, W + 40, H + 40);

  // ── Sky ──
  const sky = ctx.createLinearGradient(0, 0, 0, vpY);
  sky.addColorStop(0, C.bgTop); sky.addColorStop(1, C.bgBottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, vpY);

  // ── Stars ──
  for (const s of gs.stars) {
    const sx  = s.x * W;
    const sy  = s.y * vpY * 0.95;
    const br  = 0.35 + 0.65 * Math.abs(Math.sin(gs.frame * 0.02 * s.spd + s.phase));
    ctx.save(); ctx.globalAlpha = br; ctx.fillStyle = C.star;
    ctx.beginPath(); ctx.arc(sx, sy, s.r * scale, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Ground ──
  ctx.fillStyle = C.ground0; ctx.fillRect(0, vpY, W, H - vpY);

  // ── Scrolling road strips ──
  const scrollOff = gs.distance % (1 / STRIP_COUNT);
  for (let i = 0; i < STRIP_COUNT + 1; i++) {
    const z0 = (i + scrollOff) / STRIP_COUNT;
    const z1 = (i + 1 + scrollOff) / STRIP_COUNT;
    if (z0 > 1) continue;
    const p0L = p(0, z0), p0R = p(2, z0);
    const p1L = p(0, Math.min(z1, 1)), p1R = p(2, Math.min(z1, 1));
    const lw0 = (p0R.x - p0L.x) / 3, lw1 = (p1R.x - p1L.x) / 3;
    ctx.beginPath();
    ctx.moveTo(p0L.x - lw0 * 0.15, p0L.y); ctx.lineTo(p0R.x + lw0 * 0.15, p0R.y);
    ctx.lineTo(p1R.x + lw1 * 0.15, p1R.y); ctx.lineTo(p1L.x - lw1 * 0.15, p1L.y);
    ctx.closePath(); ctx.fillStyle = i % 2 === 0 ? C.ground0 : C.ground1; ctx.fill();
  }

  // ── Lane dividers ──
  ctx.save();
  ctx.strokeStyle = C.lane; ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.setLineDash([8 * scale, 14 * scale]);
  for (let d = 0; d < 4; d++) {
    const bl   = d === 3 ? 2 : d as Lane;
    const side = d === 0 ? -1 : d === 3 ? 1 : 0;
    const near = p(bl, 0.02), far = p(bl, 0.98);
    const wN   = (p(2, 0.02).x - p(0, 0.02).x) / 3;
    const wF   = (p(2, 0.98).x - p(0, 0.98).x) / 3;
    ctx.beginPath();
    ctx.moveTo(near.x + side * wN / 2, near.y); ctx.lineTo(far.x + side * wF / 2, far.y);
    ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore();

  // ── Speed lines ──
  const speedRatio = (gs.speed - INITIAL_SPEED) / (SPEED_CAP - INITIAL_SPEED);
  if (speedRatio > 0.55 && gs.slowmoTimer === 0) {
    const la = (speedRatio - 0.55) * 0.22;
    ctx.save(); ctx.globalAlpha = la; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    const cx = W / 2, cy = H * 0.62;
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14;
      const len   = (50 + Math.random() * 50) * scale * speedRatio;
      const sr    = 28 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * sr, cy + Math.sin(angle) * sr * 0.4);
      ctx.lineTo(cx + Math.cos(angle) * (sr + len), cy + Math.sin(angle) * (sr + len) * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Renderables ──
  type R = { z: number; fn: () => void };
  const rs: R[] = [];

  // Coins
  for (const coin of gs.coins) {
    if (coin.collected || coin.z > 1) continue;
    rs.push({ z: coin.z, fn: () => {
      const q = p(coin.lane, coin.z);
      const r = Math.max(2, 14 * q.ps * scale);
      ctx.save();
      ctx.shadowBlur = 12 * scale; ctx.shadowColor = C.coinGlow;
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fillStyle = C.coin; ctx.fill();
      ctx.beginPath(); ctx.arc(q.x - r * 0.25, q.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,220,0.7)'; ctx.fill();
      ctx.restore();
      if (coin.justCollected) { spawnParticles(gs, q.x, q.y, C.coin, 7); coin.justCollected = false; }
    }});
  }

  // Power-ups
  for (const pu of gs.powerUps) {
    if (pu.z > 1) continue;
    rs.push({ z: pu.z, fn: () => {
      const q    = p(pu.lane, pu.z);
      const sz   = Math.max(4, 18 * q.ps * scale);
      const col  = pu.type === 'shield' ? C.shield : pu.type === 'magnet' ? C.magnet : C.slowmo;
      const glow = pu.type === 'shield' ? C.shieldGlow : pu.type === 'magnet' ? C.magnetGlow : C.slowmoGlow;
      const icon = pu.type === 'shield' ? '🛡' : pu.type === 'magnet' ? '🧲' : '⏱';
      const pulse = 0.7 + 0.3 * Math.sin(gs.frame * 0.1 + pu.id);
      ctx.save();
      ctx.shadowBlur = 16 * scale; ctx.shadowColor = glow;
      ctx.strokeStyle = col; ctx.lineWidth = 2 * scale * pulse;
      ctx.beginPath(); ctx.arc(q.x, q.y, sz * 1.3, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `${Math.round(sz * 1.5)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(icon, q.x, q.y);
      ctx.restore();
    }});
  }

  // Obstacles
  for (const obs of gs.obstacles) {
    if (obs.z > 1) continue;
    rs.push({ z: obs.z, fn: () => {
      const q    = p(obs.lane, obs.z);
      const lw   = (p(2, obs.z).x - p(0, obs.z).x) / 3;
      ctx.save();
      if (obs.type === 'pillar') {
        const w = lw * 0.55, h = 110 * q.ps * scale;
        ctx.shadowBlur = 20 * scale; ctx.shadowColor = C.pillarGlow; ctx.fillStyle = C.pillar;
        ctx.beginPath(); ctx.roundRect(q.x - w / 2, q.y - h, w, h, 4 * q.ps); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.roundRect(q.x - w / 2 + 3 * q.ps, q.y - h + 4 * q.ps, w * 0.25, h * 0.6, 2); ctx.fill();
      } else if (obs.type === 'bar') {
        const w = lw * 0.85, h = 22 * q.ps * scale;
        ctx.shadowBlur = 16 * scale; ctx.shadowColor = C.barGlow; ctx.fillStyle = C.bar;
        ctx.beginPath(); ctx.roundRect(q.x - w / 2, q.y - h, w, h, 3 * q.ps); ctx.fill();
        ctx.fillStyle = 'rgba(168,85,247,0.5)'; ctx.fillRect(q.x - w / 2, q.y - h, w, 3 * q.ps);
      } else {
        // beam — high bar, must slide under
        const w    = lw * 0.9;
        const bBot = 46 * q.ps * scale;
        const bH   = 18 * q.ps * scale;
        const pw   = 5 * q.ps * scale;
        ctx.shadowBlur = 18 * scale; ctx.shadowColor = C.beamGlow; ctx.fillStyle = C.beam;
        ctx.beginPath(); ctx.roundRect(q.x - w / 2, q.y - bBot - bH, w, bH, 3 * q.ps); ctx.fill();
        ctx.fillStyle = 'rgba(255,200,100,0.3)'; ctx.fillRect(q.x - w / 2, q.y - bBot - bH, w, 3 * q.ps);
        ctx.fillStyle = C.beam;
        ctx.fillRect(q.x - w / 2, q.y - bBot - bH, pw, bBot + bH);
        ctx.fillRect(q.x + w / 2 - pw, q.y - bBot - bH, pw, bBot + bH);
      }
      ctx.restore();
    }});
  }

  rs.sort((a, b) => b.z - a.z);
  for (const r of rs) r.fn();

  // ── Particles ──
  ctx.save();
  for (const pt of gs.particles) {
    ctx.globalAlpha = pt.life; ctx.fillStyle = pt.color;
    ctx.shadowBlur = 6; ctx.shadowColor = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // ── Player ──
  {
    const near  = p(gs.player.lane, 0.04);
    const nearT = p(gs.player.targetLane, 0.04);
    const px    = near.x + (nearT.x - near.x) * gs.player.laneT;
    const baseY = near.y;
    const jOff  = gs.player.jumpY * 1.8 * scale;
    const slid  = gs.player.isSliding;
    const pw    = (slid ? 44 : 28) * scale;
    const ph    = (slid ? 22 : 52) * scale;
    const hr    = 10 * scale;
    const vis   = gs.invincible === 0 || gs.frame % 6 < 3;

    if (vis) {
      ctx.save();
      ctx.shadowBlur = 24 * scale; ctx.shadowColor = C.playerGlow; ctx.fillStyle = C.player;
      if (slid) {
        ctx.beginPath(); ctx.roundRect(px - pw / 2, baseY - ph, pw, ph, 5 * scale); ctx.fill();
      } else {
        ctx.beginPath(); ctx.roundRect(px - pw / 2, baseY - ph - jOff, pw, ph, 6 * scale); ctx.fill();
        ctx.beginPath(); ctx.arc(px, baseY - ph - jOff - hr * 1.2, hr, 0, Math.PI * 2); ctx.fill();
        const legPh = (gs.distance * 15) % (Math.PI * 2);
        const legOff = Math.sin(legPh) * 8 * scale;
        ctx.fillStyle = 'rgba(51,204,255,0.6)';
        ctx.fillRect(px - pw / 2 + 2, baseY - jOff, pw / 2 - 2, 10 * scale + legOff);
        ctx.fillRect(px + 2, baseY - jOff, pw / 2 - 2, 10 * scale - legOff);
      }
      ctx.restore();

      // Shield ring
      if (gs.shieldActive) {
        const pulse  = 0.7 + 0.3 * Math.sin(gs.frame * 0.12);
        const shR    = (ph / 2 + hr * 1.5 + 8 * scale);
        const centY  = slid ? baseY - ph / 2 : baseY - ph / 2 - jOff;
        ctx.save();
        ctx.shadowBlur = 12 * scale; ctx.shadowColor = C.shieldGlow;
        ctx.strokeStyle = C.shield; ctx.lineWidth = 3 * scale * pulse; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(px, centY, shR, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.25 - gs.player.jumpY * 0.003);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(px, baseY + 2, pw * 0.6, 5 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Slow-mo tint ──
  if (gs.slowmoTimer > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(150,100,255,${Math.min(0.1, gs.slowmoTimer / SLOWMO_DURATION * 0.1)})`;
    ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  // ── HUD ──
  {
    const pad    = 14 * scale;
    const barW   = Math.round(80 * scale);
    const barH   = Math.round(Math.max(4, 6 * scale));
    const fSc    = Math.max(10, Math.round(22 * scale));
    const fLb    = Math.max(8,  Math.round(11 * scale));
    const fHt    = Math.max(12, Math.round(18 * scale));
    const spR    = (gs.speed - INITIAL_SPEED) / (SPEED_CAP - INITIAL_SPEED);

    ctx.save();
    // Score
    if (isPortrait) {
      ctx.textAlign = 'center';
      ctx.font = `bold ${fSc}px monospace`; ctx.fillStyle = C.hud;
      ctx.shadowBlur = 8 * scale; ctx.shadowColor = C.playerGlow;
      ctx.fillText(`${gs.score}`, W / 2, pad + fSc);
      ctx.font = `${fLb}px monospace`; ctx.fillStyle = C.hudDim; ctx.shadowBlur = 0;
      ctx.fillText('SCORE', W / 2, pad + fSc + fLb + 2);
    } else {
      ctx.textAlign = 'left';
      ctx.font = `bold ${fSc}px monospace`; ctx.fillStyle = C.hud;
      ctx.shadowBlur = 8 * scale; ctx.shadowColor = C.playerGlow;
      ctx.fillText(`${gs.score}`, pad, pad + fSc);
      ctx.font = `${fLb}px monospace`; ctx.fillStyle = C.hudDim; ctx.shadowBlur = 0;
      ctx.fillText('SCORE', pad, pad + fSc + fLb + 2);
    }

    // High score (when not leading)
    if (gs.highScore > 0 && gs.highScore > gs.score) {
      ctx.textAlign = isPortrait ? 'center' : 'left';
      ctx.font = `${fLb}px monospace`; ctx.fillStyle = C.hudDim;
      ctx.fillText(`BEST ${gs.highScore}`, isPortrait ? W / 2 : pad, pad + fSc + fLb * 2 + 6);
    }

    // Lives
    const htY = isPortrait ? pad + 4 : pad + fSc + fLb * 3 + 12;
    const htX = isPortrait ? W - pad - fHt * 3.6 : pad;
    ctx.font = `${fHt}px serif`; ctx.textAlign = 'left';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha  = i < gs.lives ? 1 : 0.2;
      ctx.fillStyle    = C.heart;
      ctx.shadowBlur   = i < gs.lives ? 8 * scale : 0; ctx.shadowColor = C.heart;
      ctx.fillText('♥', htX + i * fHt * 1.25, htY + fHt);
    }
    ctx.globalAlpha = 1;

    // Speed bar (top-right)
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(W - barW - pad, pad, barW, barH, 3); ctx.fill();
    const barColor = gs.slowmoTimer > 0 ? C.slowmo : C.pillar;
    const barGlow  = gs.slowmoTimer > 0 ? C.slowmoGlow : C.pillarGlow;
    ctx.fillStyle = barColor; ctx.shadowBlur = 6 * scale; ctx.shadowColor = barGlow;
    ctx.beginPath(); ctx.roundRect(W - barW - pad, pad, barW * spR, barH, 3); ctx.fill();
    ctx.shadowBlur = 0; ctx.textAlign = 'right'; ctx.font = `${fLb}px monospace`; ctx.fillStyle = C.hudDim;
    ctx.fillText('SPEED', W - pad, pad + barH + fLb + 2);

    // Active power-ups
    let pwOff = pad + barH + fLb + 8;
    if (gs.shieldActive)    { ctx.fillStyle = C.shield; ctx.fillText('🛡 SHIELD', W - pad, pwOff); pwOff += fLb + 4; }
    if (gs.magnetTimer > 0) { ctx.fillStyle = C.magnet; ctx.fillText(`🧲 ${Math.ceil(gs.magnetTimer / 60)}s`, W - pad, pwOff); pwOff += fLb + 4; }
    if (gs.slowmoTimer > 0) { ctx.fillStyle = C.slowmo; ctx.fillText(`⏱ ${Math.ceil(gs.slowmoTimer / 60)}s`, W - pad, pwOff); }

    ctx.restore();
  }

  // ── Milestone ──
  if (gs.milestone) {
    const mT    = gs.milestone.frames / 100;
    const alpha = mT < 0.2 ? mT / 0.2 : mT > 0.8 ? (1 - mT) / 0.2 : 1;
    const fM    = Math.max(18, Math.round(32 * scale));
    ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center';
    ctx.font = `bold ${fM}px monospace`; ctx.fillStyle = C.coin;
    ctx.shadowBlur = 20 * scale; ctx.shadowColor = C.coinGlow;
    ctx.fillText(gs.milestone.text, W / 2, H * 0.22);
    ctx.restore();
  }

  // ── Idle screen ──
  if (gs.phase === 'idle') {
    const lh   = Math.round(28 * scale);
    const fT   = Math.max(16, Math.round(38 * scale));
    const fI   = Math.max(10, Math.round(14 * scale));
    const fC   = Math.max(11, Math.round(17 * scale));
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,17,0.8)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `bold ${fT}px monospace`; ctx.fillStyle = C.player;
    ctx.shadowBlur = 20 * scale; ctx.shadowColor = C.playerGlow;
    ctx.fillText('TEMPLE DASH', W / 2, H / 2 - lh * 2.8);
    ctx.shadowBlur = 0; ctx.font = `${fI}px monospace`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    if (isPortrait) {
      ctx.fillText('← → lanes  ↑ jump  ↓ slide', W / 2, H / 2 - lh * 0.8);
      ctx.fillText('Swipe left / right / up / down', W / 2, H / 2 + lh * 0.2);
    } else {
      ctx.fillText('← → lanes   ↑ jump   ↓ slide   Swipe on mobile', W / 2, H / 2 - lh * 0.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = `${Math.max(9, Math.round(12 * scale))}px monospace`;
    ctx.fillText('🛡 Shield  🧲 Magnet (auto-collect)  ⏱ Slow-Mo', W / 2, H / 2 + lh * (isPortrait ? 1.3 : 0.7));
    if (gs.highScore > 0) {
      ctx.font = `${Math.max(10, Math.round(14 * scale))}px monospace`;
      ctx.fillStyle = C.coin; ctx.shadowBlur = 8; ctx.shadowColor = C.coinGlow;
      ctx.fillText(`Best: ${gs.highScore}`, W / 2, H / 2 + lh * (isPortrait ? 2.3 : 1.5));
    }
    const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 400);
    ctx.globalAlpha = pulse;
    ctx.font = `bold ${fC}px monospace`; ctx.fillStyle = C.coin;
    ctx.shadowBlur = 12 * scale; ctx.shadowColor = C.coinGlow;
    ctx.fillText(isPortrait ? 'Tap to Start' : 'Press SPACE or Tap to Start', W / 2, H / 2 + lh * (isPortrait ? 3.5 : 2.5));
    ctx.restore();
  }

  // ── Game over ──
  if (gs.phase === 'dead') {
    const lh  = Math.round(28 * scale);
    const fO  = Math.max(18, Math.round(42 * scale));
    const fS  = Math.max(14, Math.round(26 * scale));
    const fR  = Math.max(10, Math.round(16 * scale));
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,17,0.86)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `bold ${fO}px monospace`; ctx.fillStyle = C.pillar;
    ctx.shadowBlur = 24 * scale; ctx.shadowColor = C.pillarGlow;
    ctx.fillText('GAME OVER', W / 2, H / 2 - lh * 2);
    ctx.font = `bold ${fS}px monospace`; ctx.fillStyle = C.coin;
    ctx.shadowColor = C.coinGlow;
    ctx.fillText(`Score: ${gs.score}`, W / 2, H / 2 - lh * 0.4);
    if (gs.score > 0 && gs.score >= gs.highScore) {
      ctx.font = `${Math.max(10, Math.round(14 * scale))}px monospace`;
      ctx.fillStyle = C.shield; ctx.shadowColor = C.shieldGlow;
      ctx.fillText('NEW BEST!', W / 2, H / 2 + lh * 0.7);
    } else if (gs.highScore > 0) {
      ctx.font = `${Math.max(10, Math.round(14 * scale))}px monospace`;
      ctx.fillStyle = C.hudDim; ctx.shadowBlur = 0;
      ctx.fillText(`Best: ${gs.highScore}`, W / 2, H / 2 + lh * 0.7);
    }
    ctx.font = `bold ${fR}px monospace`; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 0;
    ctx.fillText(isPortrait ? 'Tap to Restart' : 'Press SPACE or Tap to Restart', W / 2, H / 2 + lh * 2.2);
    ctx.restore();
  }

  ctx.restore(); // end screen shake
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EndlessRunnerGame({ title }: { title: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gsRef        = useRef<GS>(makeState());
  const sizeRef      = useRef({ W: REF_W, H: REF_H });

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const setPhaseRef = useRef(setPhase);
  const setScoreRef = useRef(setScore);
  setPhaseRef.current = setPhase;
  setScoreRef.current = setScore;

  useEffect(() => {
    const canvas    = canvasRef.current!;
    const container = containerRef.current!;
    const ctx       = canvas.getContext('2d')!;

    // Load persisted high score
    try {
      const stored = parseInt(localStorage.getItem('templeHighScore') || '0', 10);
      if (stored > 0) gsRef.current.highScore = stored;
    } catch { /* ignore */ }

    // Initial canvas size
    const ir = canvas.getBoundingClientRect();
    canvas.width = ir.width || REF_W; canvas.height = ir.height || REF_H;
    sizeRef.current = { W: canvas.width, H: canvas.height };

    // RAF loop
    const loop = () => {
      const { W, H } = sizeRef.current;
      const gs = gsRef.current;
      if (gs.phase === 'running') update(gs, setScoreRef.current, setPhaseRef.current);
      draw(ctx, gs, W, H);
      gs.frameId = requestAnimationFrame(loop);
    };
    gsRef.current.frameId = requestAnimationFrame(loop);

    // ResizeObserver
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (!width || !height) return;
      canvas.width = Math.round(width); canvas.height = Math.round(height);
      sizeRef.current = { W: canvas.width, H: canvas.height };
    });
    ro.observe(container);

    const startGame = () => {
      getAC(); // init/resume audio on user gesture
      const hs  = gsRef.current.highScore;
      const fid = gsRef.current.frameId;
      gsRef.current = { ...makeState(hs), phase: 'running', frameId: fid };
      setPhaseRef.current('running'); setScoreRef.current(0);
    };

    // Keyboard
    const onKey = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (gs.phase !== 'running') {
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); startGame(); } return;
      }
      if (e.code === 'ArrowLeft')                      { e.preventDefault(); shiftLane(gs, -1); }
      if (e.code === 'ArrowRight')                     { e.preventDefault(); shiftLane(gs, 1);  }
      if (e.code === 'ArrowUp' || e.code === 'Space')  { e.preventDefault(); doJump(gs);        }
      if (e.code === 'ArrowDown')                      { e.preventDefault(); doSlide(gs);       }
    };
    window.addEventListener('keydown', onKey);

    // Touch
    let tx = 0, ty = 0;
    const onTS = (e: TouchEvent) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const onTE = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      const gs = gsRef.current;
      if (gs.phase !== 'running') { startGame(); return; }
      if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 22) shiftLane(gs, dx > 0 ? 1 : -1); }
      else { if (dy < -22) doJump(gs); if (dy > 22) doSlide(gs); }
    };
    canvas.addEventListener('touchstart', onTS, { passive: true });
    canvas.addEventListener('touchend',   onTE, { passive: true });

    return () => {
      cancelAnimationFrame(gsRef.current.frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('touchstart', onTS);
      canvas.removeEventListener('touchend',   onTE);
    };
  }, []);

  return (
    <div className={styles.gameInner} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.5rem', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className={styles.gameTitle} style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', alignItems: 'center' }}>
          <span>← → lanes</span><span>↑ jump</span><span>↓ slide</span>
          {phase === 'running' && <span style={{ color: '#ffcc00', fontWeight: 700 }}>Score: {score}</span>}
        </div>
      </div>
      <div ref={containerRef} style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(109,40,217,0.4)', cursor: 'pointer' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
      </div>
    </div>
  );
}
