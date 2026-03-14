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
const GRID_LINES        = 18;   // horizontal grid lines across floor
const REF_W             = 800;
const REF_H             = 500;
const INVINCIBLE_FRAMES = 120;
const MAGNET_DURATION   = 360;
const SLOWMO_DURATION   = 240;
const MAGNET_Z          = 0.15;
const MILESTONES        = [100, 250, 500, 1000, 2000, 5000, 10000];
const TRAIL_LEN         = 6;    // ghost frames for player trail
const SHOOT_INTERVAL    = 280;  // frames between shooting stars
const SPEED_LINE_COUNT  = 16;

const C = {
  bgTop: '#020210', bgMid: '#0a0520', bgBottom: '#160930',
  ground0: '#0b0b1f', ground1: '#10102a',
  gridLine: 'rgba(120,50,230,0.55)',
  wallLeft: '#0d0820', wallRight: '#0d0820',
  wallTrimL: 'rgba(109,40,217,0.8)', wallTrimR: 'rgba(109,40,217,0.8)',
  archFill: '#1a1030', archTrim: 'rgba(140,70,240,0.6)',
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
  shootStar: '#aaddff',
  silhouette: 'rgba(14,6,35,0.9)',
  vignette: 'rgba(0,0,0,0.55)',
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
  wasJumping: boolean; // for landing detection
  isSliding: boolean; slideTimer: number;
}
interface Obstacle { id: number; lane: Lane; z: number; type: ObsType; }
interface Coin     { id: number; lane: Lane; z: number; collected: boolean; justCollected: boolean; }
interface PowerUp  { id: number; lane: Lane; z: number; type: PwrType; }
interface Star     { x: number; y: number; r: number; phase: number; spd: number; }
interface ShootStar { x: number; y: number; vx: number; vy: number; life: number; len: number; }
interface SpeedLine { angle: number; len: number; phase: number; }
interface TrailPos  { x: number; y: number; w: number; h: number; r: number; }
interface Particle  { x: number; y: number; vx: number; vy: number; life: number; decay: number; color: string; r: number; }
interface SilLayer  { spd: number; offset: number; peaks: number[]; }

interface GS {
  phase: Phase; distance: number; speed: number; score: number; highScore: number;
  lives: number; invincible: number;
  player: Player;
  trail: TrailPos[];
  obstacles: Obstacle[]; coins: Coin[]; powerUps: PowerUp[];
  particles: Particle[]; stars: Star[];
  shootStars: ShootStar[]; shootTimer: number;
  speedLines: SpeedLine[];
  silLayers: SilLayer[];
  shieldActive: boolean; magnetTimer: number; slowmoTimer: number;
  spawnTimer: number; coinTimer: number; powerUpTimer: number;
  nextId: number; frameId: number; frame: number;
  shakeFrames: number; shakeIntensity: number;
  milestone: { text: string; frames: number } | null;
  lastMilestone: number;
  hitFlash: number;       // frames of red flash remaining
  pwrFlash: { color: string; frames: number } | null; // power-up collect flash
}

// ─── State helpers ────────────────────────────────────────────────────────────
function makeStars(): Star[] {
  return Array.from({ length: 90 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.4 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    spd: 0.4 + Math.random() * 1.6,
  }));
}

function makeSpeedLines(): SpeedLine[] {
  return Array.from({ length: SPEED_LINE_COUNT }, (_, i) => ({
    angle: (Math.PI * 2 * i) / SPEED_LINE_COUNT + (Math.random() - 0.5) * 0.15,
    len: 40 + Math.random() * 80,
    phase: Math.random() * Math.PI * 2,
  }));
}

function makeSilLayers(): SilLayer[] {
  // Two parallax silhouette layers: far (slow), near (faster)
  return [
    { spd: 0.00018, offset: 0, peaks: makePeaks(12, 0.12, 0.38) },
    { spd: 0.00035, offset: 0, peaks: makePeaks(8, 0.22, 0.48) },
  ];
}

function makePeaks(count: number, minH: number, maxH: number): number[] {
  return Array.from({ length: count + 2 }, () => minH + Math.random() * (maxH - minH));
}

function makeState(highScore = 0): GS {
  return {
    phase: 'idle', distance: 0, speed: INITIAL_SPEED, score: 0, highScore,
    lives: 3, invincible: 0,
    player: { lane: 1, targetLane: 1, laneT: 1, jumpY: 0, jumpVY: 0, isJumping: false, wasJumping: false, isSliding: false, slideTimer: 0 },
    trail: [],
    obstacles: [], coins: [], powerUps: [], particles: [], stars: makeStars(),
    shootStars: [], shootTimer: SHOOT_INTERVAL,
    speedLines: makeSpeedLines(),
    silLayers: makeSilLayers(),
    shieldActive: false, magnetTimer: 0, slowmoTimer: 0,
    spawnTimer: 80, coinTimer: 50, powerUpTimer: 220,
    nextId: 0, frameId: 0, frame: 0,
    shakeFrames: 0, shakeIntensity: 0,
    milestone: null, lastMilestone: 0,
    hitFlash: 0, pwrFlash: null,
  };
}

// ─── Projection ──────────────────────────────────────────────────────────────
function corridorK(W: number, H: number) {
  const t     = Math.min(1, Math.max(0, (W / H - 0.56) / 1.22));
  const vpY   = H * (0.40 - 0.04 * t);
  const hwBot = W * (0.46 - 0.06 * t);
  const hwTop = W * 0.03;
  return { vpY, hwBot, hwTop };
}

function proj(lane: Lane, z: number, W: number, H: number, vpY: number, hwBot: number, hwTop: number) {
  const y  = H + (vpY - H) * z;
  const hw = hwBot + (hwTop - hwBot) * z;
  const x  = W / 2 + ([-1, 0, 1] as const)[lane] * (hw * 2 / 3);
  const ps = Math.max(0, 1 - z);
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
    gs.particles.push({
      x, y,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1,
      life: 1, decay: 0.04 + Math.random() * 0.03,
      color, r: 2 + Math.random() * 3,
    });
  }
}

function spawnConfetti(gs: GS, x: number, y: number) {
  const colors = ['#ffcc00','#33ccff','#ec4899','#33ff99','#a855f7','#ff6b2b','#ffffff'];
  for (let i = 0; i < 55; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 2 + Math.random() * 5;
    gs.particles.push({
      x: x + (Math.random() - 0.5) * 80,
      y: y + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 2,
      life: 1, decay: 0.02 + Math.random() * 0.025,
      color: colors[Math.floor(Math.random() * colors.length)],
      r: 2.5 + Math.random() * 4,
    });
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
  if (gs.hitFlash     > 0) gs.hitFlash--;
  if (gs.pwrFlash) { gs.pwrFlash.frames--; if (gs.pwrFlash.frames <= 0) gs.pwrFlash = null; }

  // Shooting stars
  gs.shootTimer--;
  if (gs.shootTimer <= 0) {
    gs.shootStars.push({
      x: Math.random(),
      y: 0.05 + Math.random() * 0.55,
      vx: -(0.004 + Math.random() * 0.006),
      vy: 0.001 + Math.random() * 0.003,
      life: 1, len: 0.06 + Math.random() * 0.1,
    });
    gs.shootTimer = SHOOT_INTERVAL + Math.floor(Math.random() * 180);
  }
  for (const s of gs.shootStars) { s.x += s.vx; s.y += s.vy; s.life -= 0.018; }
  gs.shootStars = gs.shootStars.filter(s => s.life > 0 && s.x > -0.2);

  // Speed lines — slowly drift angle+len for variety
  for (const sl of gs.speedLines) {
    sl.phase += 0.04;
    sl.len = Math.max(30, Math.min(160, sl.len + (Math.random() - 0.5) * 4));
  }

  // Parallax silhouette layers
  for (const lay of gs.silLayers) {
    lay.offset = (lay.offset + lay.spd * effSpeed * 1000) % 1;
  }

  // Player movement
  if (gs.player.laneT < 1) gs.player.laneT = Math.min(1, gs.player.laneT + LANE_SLIDE_SPD);

  gs.player.wasJumping = gs.player.isJumping;
  if (gs.player.isJumping) {
    gs.player.jumpY  += gs.player.jumpVY;
    gs.player.jumpVY -= GRAVITY;
    if (gs.player.jumpY <= 0) {
      gs.player.jumpY  = 0; gs.player.jumpVY = 0; gs.player.isJumping = false;
    }
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
      if (gs.shieldActive) {
        gs.shieldActive = false;
        gs.invincible   = INVINCIBLE_FRAMES;
        gs.shakeFrames  = 10; gs.shakeIntensity = 5;
        gs.hitFlash     = 4;
        SFX.hit();
      } else {
        gs.lives--;
        gs.shakeFrames = 20; gs.shakeIntensity = 8;
        gs.hitFlash    = 6;
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
    const flashColor = pu.type === 'shield' ? 'rgba(51,255,153,0.18)' :
                       pu.type === 'magnet' ? 'rgba(255,100,100,0.18)' :
                                              'rgba(180,100,255,0.18)';
    gs.pwrFlash = { color: flashColor, frames: 8 };
    SFX.powerup(); break;
  }
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawArch(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  // Temple arch silhouette at vanishing point
  const aw = 52 * scale, ah = 68 * scale;
  const pilW = 10 * scale, pilH = ah * 0.65;

  ctx.save();
  ctx.fillStyle = C.archFill;
  ctx.shadowBlur = 14 * scale;
  ctx.shadowColor = C.archTrim;

  // Left pillar
  ctx.fillRect(cx - aw / 2 - pilW, cy - pilH, pilW, pilH);
  // Right pillar
  ctx.fillRect(cx + aw / 2, cy - pilH, pilW, pilH);
  // Arch top (semicircle)
  ctx.beginPath();
  ctx.arc(cx, cy - pilH, aw / 2 + pilW / 2, Math.PI, 0);
  ctx.lineTo(cx + aw / 2 + pilW, cy - pilH);
  ctx.lineTo(cx - aw / 2 - pilW, cy - pilH);
  ctx.closePath();
  ctx.fill();

  // Trim
  ctx.strokeStyle = C.archTrim;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy - pilH, aw / 2 + pilW / 2, Math.PI, 0);
  ctx.stroke();
  ctx.strokeRect(cx - aw / 2 - pilW, cy - pilH, pilW, pilH);
  ctx.strokeRect(cx + aw / 2, cy - pilH, pilW, pilH);

  ctx.restore();
}

function drawSilLayer(
  ctx: CanvasRenderingContext2D,
  W: number, vpY: number,
  layer: SilLayer, alpha: number, yBase: number,
) {
  const peaks = layer.peaks;
  const count = peaks.length;
  const segW  = W / (count - 2);
  const off   = layer.offset * segW;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = C.silhouette;
  ctx.beginPath();
  ctx.moveTo(-off - segW, vpY);

  for (let i = 0; i < count; i++) {
    const x = -off + (i - 1) * segW;
    const h = peaks[i % peaks.length] * vpY;
    // Simple temple silhouette: flat top with occasional spire
    const mid = x + segW / 2;
    ctx.lineTo(x, vpY * yBase);
    ctx.lineTo(x + segW * 0.15, vpY * yBase - h * 0.6);
    ctx.lineTo(mid - segW * 0.04, vpY * yBase - h);
    ctx.lineTo(mid, vpY * yBase - h - h * 0.25); // spire tip
    ctx.lineTo(mid + segW * 0.04, vpY * yBase - h);
    ctx.lineTo(x + segW * 0.85, vpY * yBase - h * 0.6);
    ctx.lineTo(x + segW, vpY * yBase);
  }

  ctx.lineTo(W + segW, vpY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, gs: GS, W: number, H: number) {
  const scale      = Math.min(W / REF_W, H / REF_H);
  const isPortrait = W / H < 0.9;
  const { vpY, hwBot, hwTop } = corridorK(W, H);
  const p = (lane: Lane, z: number) => proj(lane, z, W, H, vpY, hwBot, hwTop);
  const speedRatio = (gs.speed - INITIAL_SPEED) / (SPEED_CAP - INITIAL_SPEED);

  // Screen shake
  ctx.save();
  if (gs.shakeFrames > 0) {
    ctx.translate(
      (Math.random() - 0.5) * gs.shakeIntensity * 2,
      (Math.random() - 0.5) * gs.shakeIntensity * 2,
    );
  }
  ctx.clearRect(-20, -20, W + 40, H + 40);

  // ── Sky gradient ──
  const sky = ctx.createLinearGradient(0, 0, 0, vpY);
  sky.addColorStop(0, C.bgTop);
  sky.addColorStop(0.55, C.bgMid);
  sky.addColorStop(1, C.bgBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, vpY + 2);

  // ── Parallax silhouette layers ──
  drawSilLayer(ctx, W, vpY, gs.silLayers[0], 0.45, 0.88);
  drawSilLayer(ctx, W, vpY, gs.silLayers[1], 0.6, 0.96);

  // ── Stars ──
  for (const s of gs.stars) {
    const sx = s.x * W;
    const sy = s.y * vpY * 0.92;
    const br = 0.3 + 0.7 * Math.abs(Math.sin(gs.frame * 0.02 * s.spd + s.phase));
    ctx.save(); ctx.globalAlpha = br * 0.85; ctx.fillStyle = C.star;
    ctx.beginPath(); ctx.arc(sx, sy, s.r * scale, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Shooting stars ──
  for (const ss of gs.shootStars) {
    ctx.save();
    ctx.globalAlpha = ss.life * 0.85;
    ctx.strokeStyle = C.shootStar;
    ctx.lineWidth   = 1.2 * scale;
    ctx.shadowBlur  = 4 * scale;
    ctx.shadowColor = C.shootStar;
    ctx.beginPath();
    ctx.moveTo(ss.x * W, ss.y * vpY);
    ctx.lineTo((ss.x + ss.vx * 18) * W, (ss.y + ss.vy * 18) * vpY);
    ctx.stroke();
    ctx.restore();
  }

  // ── Ground fill ──
  ctx.fillStyle = C.ground0;
  ctx.fillRect(0, vpY, W, H - vpY);

  // ── Side walls ──
  {
    const nearL = p(0, 0.01), farL = p(0, 0.99);
    const nearR = p(2, 0.01), farR = p(2, 0.99);
    const lw0   = (nearR.x - nearL.x) / 3;
    const lw1   = (farR.x - farL.x) / 3;
    const wallH = (H - vpY) * 0.65; // how tall the wall extends above ground

    // Left wall
    ctx.save();
    ctx.fillStyle = C.wallLeft;
    ctx.beginPath();
    ctx.moveTo(0, vpY);
    ctx.lineTo(nearL.x - lw0 * 0.15, nearL.y);
    ctx.lineTo(farL.x - lw1 * 0.15, farL.y);
    ctx.lineTo(W / 2, vpY);
    ctx.closePath();
    ctx.fill();
    // Left wall trim
    ctx.strokeStyle = C.wallTrimL;
    ctx.lineWidth   = Math.max(1, 2.5 * scale);
    ctx.shadowBlur  = 10 * scale;
    ctx.shadowColor = C.wallTrimL;
    ctx.beginPath();
    ctx.moveTo(nearL.x - lw0 * 0.15, nearL.y - wallH * nearL.ps);
    ctx.lineTo(farL.x - lw1 * 0.15, farL.y - wallH * farL.ps);
    ctx.stroke();
    ctx.restore();

    // Right wall
    ctx.save();
    ctx.fillStyle = C.wallRight;
    ctx.beginPath();
    ctx.moveTo(W, vpY);
    ctx.lineTo(nearR.x + lw0 * 0.15, nearR.y);
    ctx.lineTo(farR.x + lw1 * 0.15, farR.y);
    ctx.lineTo(W / 2, vpY);
    ctx.closePath();
    ctx.fill();
    // Right wall trim
    ctx.strokeStyle = C.wallTrimR;
    ctx.lineWidth   = Math.max(1, 2.5 * scale);
    ctx.shadowBlur  = 10 * scale;
    ctx.shadowColor = C.wallTrimR;
    ctx.beginPath();
    ctx.moveTo(nearR.x + lw0 * 0.15, nearR.y - wallH * nearR.ps);
    ctx.lineTo(farR.x + lw1 * 0.15, farR.y - wallH * farR.ps);
    ctx.stroke();
    ctx.restore();
  }

  // ── Temple arch at vanishing point ──
  drawArch(ctx, W / 2, vpY + 2, scale);

  // ── Neon grid floor ──
  {
    ctx.save();
    ctx.shadowBlur = 6 * scale;
    ctx.shadowColor = C.gridLine;
    ctx.strokeStyle = C.gridLine;

    // Horizontal grid lines (z-bands)
    for (let i = 1; i <= GRID_LINES; i++) {
      const z = i / GRID_LINES;
      const pL = p(0, z), pR = p(2, z);
      const lw = (pR.x - pL.x) / 3;
      const alpha = 0.3 + z * 0.55;
      ctx.globalAlpha = alpha;
      ctx.lineWidth   = Math.max(0.5, 1.0 * z * scale);
      ctx.beginPath();
      ctx.moveTo(pL.x - lw * 0.15, pL.y);
      ctx.lineTo(pR.x + lw * 0.15, pR.y);
      ctx.stroke();
    }

    // Vertical grid lines (lane edges running to VP)
    ctx.globalAlpha = 0.6;
    ctx.lineWidth   = Math.max(0.5, 1.2 * scale);
    const edgeZs = [0.01, 0.99];
    // Left edge, between-lane-0-1, between-lane-1-2, right edge
    const laneEdges = [-1, -1/3, 1/3, 1] as const;
    for (const frac of laneEdges) {
      const nearX = W / 2 + frac * (p(0, 0.01).hw * 2);
      const farX  = W / 2 + frac * (p(0, 0.99).hw * 2);
      const nearY = p(0, edgeZs[0]).y;
      const farY  = p(0, edgeZs[1]).y;
      ctx.beginPath();
      ctx.moveTo(nearX, nearY);
      ctx.lineTo(farX, farY);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Speed lines ──
  if (speedRatio > 0.45 && gs.slowmoTimer === 0) {
    const la = Math.min(0.28, (speedRatio - 0.45) * 0.4);
    ctx.save();
    ctx.globalAlpha = la;
    ctx.strokeStyle = 'rgba(200,180,255,0.8)';
    const cx = W / 2, cy = vpY + (H - vpY) * 0.35;
    for (const sl of gs.speedLines) {
      const effLen = sl.len * scale * (0.7 + 0.3 * Math.sin(sl.phase));
      const sr = 22 * scale;
      ctx.lineWidth = 0.8 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(sl.angle) * sr, cy + Math.sin(sl.angle) * sr * 0.4);
      ctx.lineTo(cx + Math.cos(sl.angle) * (sr + effLen), cy + Math.sin(sl.angle) * (sr + effLen) * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Renderables (painter's algorithm) ──
  type R = { z: number; fn: () => void };
  const rs: R[] = [];

  // Coins
  for (const coin of gs.coins) {
    if (coin.collected || coin.z > 1) continue;
    rs.push({ z: coin.z, fn: () => {
      const q    = p(coin.lane, coin.z);
      const r    = Math.max(2, 14 * q.ps * scale);
      // Spin: oscillate x-radius to simulate rotation
      const spin = Math.abs(Math.cos(gs.frame * 0.14 + coin.id * 0.9));
      const rx   = r * (0.15 + 0.85 * spin);
      // Proximity glow
      const proxGlow = 8 + (1 - coin.z) * 18;
      ctx.save();
      ctx.shadowBlur  = proxGlow * scale;
      ctx.shadowColor = C.coinGlow;
      ctx.fillStyle   = C.coin;
      ctx.beginPath();
      ctx.ellipse(q.x, q.y, rx, r, 0, 0, Math.PI * 2);
      ctx.fill();
      if (spin > 0.3) {
        ctx.beginPath();
        ctx.ellipse(q.x - rx * 0.28, q.y - r * 0.28, rx * 0.3, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,220,0.65)';
        ctx.fill();
      }
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
      // Proximity glow
      const proxGlow = 10 + (1 - pu.z) * 24;
      ctx.save();
      ctx.shadowBlur = proxGlow * scale; ctx.shadowColor = glow;
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
      const q   = p(obs.lane, obs.z);
      const lw  = (p(2, obs.z).x - p(0, obs.z).x) / 3;
      // Proximity glow — gets dramatically stronger as obstacle approaches
      const proxFactor = Math.pow(Math.max(0, 1 - obs.z / 0.7), 1.8);
      ctx.save();
      if (obs.type === 'pillar') {
        const w = lw * 0.55, h = 110 * q.ps * scale;
        ctx.shadowBlur = (14 + proxFactor * 28) * scale;
        ctx.shadowColor = C.pillarGlow; ctx.fillStyle = C.pillar;
        ctx.beginPath(); ctx.roundRect(q.x - w / 2, q.y - h, w, h, 4 * q.ps); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.roundRect(q.x - w / 2 + 3 * q.ps, q.y - h + 4 * q.ps, w * 0.25, h * 0.6, 2); ctx.fill();
      } else if (obs.type === 'bar') {
        const w = lw * 0.85, h = 22 * q.ps * scale;
        ctx.shadowBlur = (10 + proxFactor * 22) * scale;
        ctx.shadowColor = C.barGlow; ctx.fillStyle = C.bar;
        ctx.beginPath(); ctx.roundRect(q.x - w / 2, q.y - h, w, h, 3 * q.ps); ctx.fill();
        ctx.fillStyle = 'rgba(168,85,247,0.5)'; ctx.fillRect(q.x - w / 2, q.y - h, w, 3 * q.ps);
      } else {
        // beam — high bar, must slide under
        const w    = lw * 0.9;
        const bBot = 46 * q.ps * scale;
        const bH   = 18 * q.ps * scale;
        const pw   = 5 * q.ps * scale;
        ctx.shadowBlur = (12 + proxFactor * 24) * scale;
        ctx.shadowColor = C.beamGlow; ctx.fillStyle = C.beam;
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

  // ── Player trail ──
  for (let i = 0; i < gs.trail.length; i++) {
    const t   = gs.trail[i];
    const age = (i + 1) / (gs.trail.length + 1);
    ctx.save();
    ctx.globalAlpha = (1 - age) * 0.35;
    ctx.fillStyle   = C.player;
    ctx.shadowBlur  = 10 * scale;
    ctx.shadowColor = C.playerGlow;
    ctx.beginPath();
    ctx.roundRect(t.x - t.w / 2, t.y - t.h, t.w, t.h, t.r);
    ctx.fill();
    ctx.restore();
  }

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

    // Record trail
    if (gs.phase === 'running' && gs.frame % 2 === 0) {
      gs.trail.unshift({ x: px, y: baseY - jOff, w: pw, h: ph, r: slid ? 5 * scale : 6 * scale });
      if (gs.trail.length > TRAIL_LEN) gs.trail.pop();
    }

    // Landing puff
    if (gs.player.wasJumping && !gs.player.isJumping) {
      spawnParticles(gs, px, baseY, 'rgba(100,180,255,0.7)', 6);
    }

    if (vis) {
      ctx.save();
      ctx.shadowBlur = 24 * scale; ctx.shadowColor = C.playerGlow; ctx.fillStyle = C.player;
      if (slid) {
        ctx.beginPath(); ctx.roundRect(px - pw / 2, baseY - ph, pw, ph, 5 * scale); ctx.fill();
      } else {
        ctx.beginPath(); ctx.roundRect(px - pw / 2, baseY - ph - jOff, pw, ph, 6 * scale); ctx.fill();
        ctx.beginPath(); ctx.arc(px, baseY - ph - jOff - hr * 1.2, hr, 0, Math.PI * 2); ctx.fill();
        const legPh  = (gs.distance * 15) % (Math.PI * 2);
        const legOff = Math.sin(legPh) * 8 * scale;
        ctx.fillStyle = 'rgba(51,204,255,0.6)';
        ctx.fillRect(px - pw / 2 + 2, baseY - jOff, pw / 2 - 2, 10 * scale + legOff);
        ctx.fillRect(px + 2, baseY - jOff, pw / 2 - 2, 10 * scale - legOff);
      }
      ctx.restore();

      // Shield ring
      if (gs.shieldActive) {
        const pulse = 0.7 + 0.3 * Math.sin(gs.frame * 0.12);
        const shR   = (ph / 2 + hr * 1.5 + 8 * scale);
        const centY = slid ? baseY - ph / 2 : baseY - ph / 2 - jOff;
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

  // ── Magnet beam visual ──
  if (gs.magnetTimer > 0) {
    const near  = p(gs.player.lane, 0.04);
    const nearT = p(gs.player.targetLane, 0.04);
    const px    = near.x + (nearT.x - near.x) * gs.player.laneT;
    const py    = near.y - 26 * scale;
    ctx.save();
    ctx.strokeStyle = C.magnet;
    ctx.lineWidth   = 1.5 * scale;
    ctx.setLineDash([4 * scale, 6 * scale]);
    for (const coin of gs.coins) {
      if (coin.collected || coin.z > MAGNET_Z || coin.z < 0) continue;
      const q = p(coin.lane, coin.z);
      if (Math.abs(coin.lane - effLane(gs.player)) > 1) continue;
      ctx.globalAlpha = Math.min(0.55, gs.magnetTimer / 80);
      ctx.shadowBlur  = 4 * scale;
      ctx.shadowColor = C.magnetGlow;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.restore();
  }

  // ── Color temperature shift at high speed ──
  if (speedRatio > 0.65 && gs.slowmoTimer === 0) {
    const heat = Math.min(0.12, (speedRatio - 0.65) * 0.35);
    ctx.save();
    ctx.fillStyle = `rgba(255,80,0,${heat})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── Slow-mo tint ──
  if (gs.slowmoTimer > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(150,100,255,${Math.min(0.1, gs.slowmoTimer / SLOWMO_DURATION * 0.1)})`;
    ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  // ── Hit flash ──
  if (gs.hitFlash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255,30,30,${gs.hitFlash * 0.06})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── Power-up collection flash ──
  if (gs.pwrFlash) {
    ctx.save();
    ctx.fillStyle = gs.pwrFlash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── Vignette ──
  {
    const vgR = Math.max(W, H) * 0.85;
    const vg  = ctx.createRadialGradient(W / 2, H / 2, vgR * 0.35, W / 2, H / 2, vgR);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, C.vignette);
    ctx.save();
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── HUD ──
  {
    const pad  = 14 * scale;
    const barW = Math.round(80 * scale);
    const barH = Math.round(Math.max(4, 6 * scale));
    const fSc  = Math.max(10, Math.round(22 * scale));
    const fLb  = Math.max(8,  Math.round(11 * scale));
    const fHt  = Math.max(12, Math.round(18 * scale));
    const spR  = speedRatio;

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

    // High score
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
    ctx.fillStyle  = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(W - barW - pad, pad, barW, barH, 3); ctx.fill();
    const barColor = gs.slowmoTimer > 0 ? C.slowmo : C.pillar;
    const barGlow  = gs.slowmoTimer > 0 ? C.slowmoGlow : C.pillarGlow;
    ctx.fillStyle  = barColor; ctx.shadowBlur = 6 * scale; ctx.shadowColor = barGlow;
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
    // Confetti spawned once (when frames == 99)
    if (gs.milestone.frames === 99) spawnConfetti(gs, W / 2, H * 0.22);
  }

  // ── Idle screen ──
  if (gs.phase === 'idle') {
    const lh = Math.round(28 * scale);
    const fT = Math.max(16, Math.round(38 * scale));
    const fI = Math.max(10, Math.round(14 * scale));
    const fC = Math.max(11, Math.round(17 * scale));
    ctx.save();
    ctx.fillStyle = 'rgba(2,2,16,0.82)'; ctx.fillRect(0, 0, W, H);
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
    const lh = Math.round(28 * scale);
    const fO = Math.max(18, Math.round(42 * scale));
    const fS = Math.max(14, Math.round(26 * scale));
    const fR = Math.max(10, Math.round(16 * scale));
    ctx.save();
    ctx.fillStyle = 'rgba(2,2,16,0.88)'; ctx.fillRect(0, 0, W, H);
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
      getAC();
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
      if (e.code === 'ArrowLeft')                     { e.preventDefault(); shiftLane(gs, -1); }
      if (e.code === 'ArrowRight')                    { e.preventDefault(); shiftLane(gs, 1);  }
      if (e.code === 'ArrowUp' || e.code === 'Space') { e.preventDefault(); doJump(gs);        }
      if (e.code === 'ArrowDown')                     { e.preventDefault(); doSlide(gs);       }
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
