"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

type Phase = "idle" | "countdown" | "playing" | "over";
type Difficulty = "kids" | "adult";

interface Skunk {
  x: number; y: number;
  angle: number;
  vx: number; vy: number;
  lives: number; invFrames: number; cooldown: number;
}
interface Cloud {
  x: number; y: number; vx: number; vy: number;
  owner: "player" | "cpu";
  life: number; maxLife: number;
  trail: Array<{ x: number; y: number }>;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  cr: number; cg: number; cb: number; size: number;
}
interface FloatText {
  x: number; y: number; vy: number;
  text: string; color: string;
  life: number; maxLife: number;
}

const MAX_LIVES  = 3;
const TURN_SPD   = 0.046;
const FRICTION   = 0.87;
const PROJ_LIFE  = 130;
const INV_FRAMES = 80;
const FIRE_CD    = 42;
const MAX_TRAIL  = 8;

// Fixed star field (module-level, never re-created)
const STARS = Array.from({ length: 48 }, (_, i) => ({
  nx: ((i * 137.508) % 1000) / 1000,
  ny: ((i * 73.141)  % 1000) / 1000,
  s:  0.4 + (i % 4) * 0.22,
  ph: i * 0.71,
}));

function angleDiff(a: number, b: number) {
  return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}
function circHit(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

// ── Mobile button ─────────────────────────────────────────────────────────────
function Btn({ icon, onDown, onUp, size = 46, label }: {
  icon: string; onDown: () => void; onUp: () => void; size?: number; label?: string;
}) {
  const isFireBtn = size > 50;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div
        onPointerDown={e => { e.preventDefault(); onDown(); }}
        onPointerUp={e =>   { e.preventDefault(); onUp();   }}
        onPointerLeave={e => { e.preventDefault(); onUp();  }}
        style={{
          width: size, height: size,
          borderRadius: isFireBtn ? "50%" : 8,
          background: isFireBtn
            ? "linear-gradient(135deg,rgba(134,239,172,0.22),rgba(74,222,128,0.08))"
            : "rgba(255,255,255,0.07)",
          border: isFireBtn
            ? "2px solid rgba(134,239,172,0.35)"
            : "1px solid rgba(255,255,255,0.13)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.38, color: "white",
          userSelect: "none", cursor: "pointer", touchAction: "none", flexShrink: 0,
        }}
      >{icon}</div>
      {label && (
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.32)", letterSpacing: "0.06em" }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FartDuelGame({ title: _title }: { title: string }) {
  const [difficulty,   setDifficulty]   = useState<Difficulty>("kids");
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [playerLives,  setPlayerLives]  = useState(MAX_LIVES);
  const [cpuLives,     setCpuLives]     = useState(MAX_LIVES);
  const [winner,       setWinner]       = useState<"player" | "cpu" | null>(null);
  const [playerScore,  setPlayerScore]  = useState(0);
  const [cpuScore,     setCpuScore]     = useState(0);
  const [countdown,    setCountdown]    = useState(3);

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const playerRef     = useRef<Skunk>({ x:0,y:0,angle:0,      vx:0,vy:0,lives:MAX_LIVES,invFrames:0,cooldown:0 });
  const cpuRef        = useRef<Skunk>({ x:0,y:0,angle:Math.PI,vx:0,vy:0,lives:MAX_LIVES,invFrames:0,cooldown:0 });
  const cloudsRef     = useRef<Cloud[]>([]);
  const particlesRef  = useRef<Particle[]>([]);
  const floatTextsRef = useRef<FloatText[]>([]);
  const keysRef       = useRef<Set<string>>(new Set());
  const rafRef        = useRef(0);
  const phaseRef      = useRef<Phase>("idle");
  const diffRef       = useRef<Difficulty>("kids");
  const frameRef      = useRef(0);
  const shakeRef      = useRef(0);
  const flashRef      = useRef(0);
  const cpuWander     = useRef({ angle: 0, timer: 0 });

  useEffect(() => { phaseRef.current = phase;      }, [phase]);
  useEffect(() => { diffRef.current  = difficulty; }, [difficulty]);

  // Canvas resize
  useEffect(() => {
    const measure = () => {
      const c = canvasRef.current, d = containerRef.current;
      if (!c || !d) return;
      c.width  = d.offsetWidth;
      c.height = Math.round(d.offsetWidth * 0.6);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Keyboard
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if ([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  const tryFire = useCallback((skunk: Skunk, owner: "player"|"cpu", projR: number, projSpd: number, cd: number) => {
    if (skunk.cooldown > 0) return;
    skunk.cooldown = cd;
    cloudsRef.current.push({
      x: skunk.x + Math.cos(skunk.angle) * (20 + projR),
      y: skunk.y + Math.sin(skunk.angle) * (20 + projR),
      vx: Math.cos(skunk.angle) * projSpd + skunk.vx * 0.25,
      vy: Math.sin(skunk.angle) * projSpd + skunk.vy * 0.25,
      owner, life: PROJ_LIFE, maxLife: PROJ_LIFE, trail: [],
    });
  }, []);

  const gameLoop = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const W = canvas.width, H = canvas.height;
    const scale    = W / 480;
    const SKUNK_R  = Math.max(14, Math.round(18 * scale));
    const PROJ_R   = Math.max(10, Math.round(13 * scale));
    const MOVE_SPD = 2.4 * scale;
    const PROJ_SPD = 5.0 * scale;
    const diff     = diffRef.current;
    const frame    = frameRef.current++;

    const player = playerRef.current;
    const cpu    = cpuRef.current;
    const keys   = keysRef.current;

    // ── Player input ──────────────────────────────────────────────────────────
    if (keys.has("ArrowLeft")  || keys.has("a") || keys.has("A")) player.angle -= TURN_SPD;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) player.angle += TURN_SPD;
    if (keys.has("ArrowUp")    || keys.has("w") || keys.has("W")) {
      player.vx += Math.cos(player.angle) * MOVE_SPD * 0.2;
      player.vy += Math.sin(player.angle) * MOVE_SPD * 0.2;
    }
    if (keys.has("ArrowDown")  || keys.has("s") || keys.has("S")) {
      player.vx -= Math.cos(player.angle) * MOVE_SPD * 0.1;
      player.vy -= Math.sin(player.angle) * MOVE_SPD * 0.1;
    }
    if (keys.has(" ") || keys.has("f") || keys.has("F")) {
      tryFire(player, "player", PROJ_R, PROJ_SPD, FIRE_CD);
    }

    // ── CPU AI ────────────────────────────────────────────────────────────────
    const toPlayer  = Math.atan2(player.y - cpu.y, player.x - cpu.x);
    const aimDiff   = angleDiff(cpu.angle, toPlayer);
    const dist      = Math.hypot(player.x - cpu.x, player.y - cpu.y);
    const idealDist = W * 0.35;

    if (diff === "kids") {
      cpuWander.current.timer--;
      if (cpuWander.current.timer <= 0) {
        cpuWander.current.angle = cpu.angle + (Math.random() - 0.5) * Math.PI * 1.4;
        cpuWander.current.timer = 70 + Math.random() * 50;
      }
      const target = Math.random() < 0.3 ? toPlayer : cpuWander.current.angle;
      const td = angleDiff(cpu.angle, target);
      cpu.angle += Math.sign(td) * 0.022;
      if (dist > idealDist * 0.7) {
        cpu.vx += Math.cos(cpu.angle) * MOVE_SPD * 0.08;
        cpu.vy += Math.sin(cpu.angle) * MOVE_SPD * 0.08;
      }
      if (Math.abs(aimDiff) < 0.5) tryFire(cpu, "cpu", PROJ_R, PROJ_SPD, 85);
    } else {
      cpu.angle += Math.sign(aimDiff) * Math.min(Math.abs(aimDiff), 0.044);
      if (dist > idealDist) {
        cpu.vx += Math.cos(cpu.angle) * MOVE_SPD * 0.14;
        cpu.vy += Math.sin(cpu.angle) * MOVE_SPD * 0.14;
      } else if (dist < idealDist * 0.5) {
        cpu.vx -= Math.cos(cpu.angle) * MOVE_SPD * 0.1;
        cpu.vy -= Math.sin(cpu.angle) * MOVE_SPD * 0.1;
      }
      if (Math.abs(aimDiff) < 0.14) tryFire(cpu, "cpu", PROJ_R, PROJ_SPD, 52);
    }

    // ── Physics ───────────────────────────────────────────────────────────────
    for (const s of [player, cpu]) {
      s.vx *= FRICTION; s.vy *= FRICTION;
      s.x  += s.vx;     s.y  += s.vy;
      if (s.x < SKUNK_R)       { s.x = SKUNK_R;       s.vx *= -0.4; }
      if (s.x > W - SKUNK_R)  { s.x = W - SKUNK_R;   s.vx *= -0.4; }
      if (s.y < SKUNK_R)       { s.y = SKUNK_R;       s.vy *= -0.4; }
      if (s.y > H - SKUNK_R)  { s.y = H - SKUNK_R;   s.vy *= -0.4; }
      if (s.cooldown  > 0) s.cooldown--;
      if (s.invFrames > 0) s.invFrames--;
    }

    // ── Projectiles + collision ───────────────────────────────────────────────
    const nextClouds: Cloud[] = [];
    let pHit = false, cHit = false;
    for (const cl of cloudsRef.current) {
      cl.trail.unshift({ x: cl.x, y: cl.y });
      if (cl.trail.length > MAX_TRAIL) cl.trail.pop();
      cl.x += cl.vx; cl.y += cl.vy; cl.life--;
      if (cl.life <= 0 || cl.x < -PROJ_R*2 || cl.x > W+PROJ_R*2 || cl.y < -PROJ_R*2 || cl.y > H+PROJ_R*2) continue;
      if (cl.owner === "cpu"    && player.invFrames === 0 && circHit(cl.x,cl.y,PROJ_R,player.x,player.y,SKUNK_R)) { pHit = true; continue; }
      if (cl.owner === "player" && cpu.invFrames    === 0 && circHit(cl.x,cl.y,PROJ_R,cpu.x,   cpu.y,   SKUNK_R)) { cHit = true; continue; }
      nextClouds.push(cl);
    }
    cloudsRef.current = nextClouds;

    // Hit effects helper
    const splat = (x: number, y: number, cr: number, cg: number, cb: number) => {
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 5;
        particlesRef.current.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
          life: 22 + Math.random()*28, maxLife: 50, cr, cg, cb, size: 2.5 + Math.random()*5 });
      }
    };

    if (pHit) {
      player.lives--; player.invFrames = INV_FRAMES; player.vx = player.vy = 0;
      shakeRef.current = 14; flashRef.current = 12;
      splat(player.x, player.y, 248, 113, 113);
      floatTextsRef.current.push({ x: player.x, y: player.y - SKUNK_R*2.5,
        text: "STUNK! 💨", color: "#fca5a5", life: 60, maxLife: 60, vy: -1.4 });
      setPlayerLives(player.lives);
      if (player.lives <= 0) {
        cancelAnimationFrame(rafRef.current);
        setCpuScore(s => s + 1);
        setWinner("cpu"); setPhase("over"); phaseRef.current = "over"; return;
      }
    }
    if (cHit) {
      cpu.lives--; cpu.invFrames = INV_FRAMES; cpu.vx = cpu.vy = 0;
      splat(cpu.x, cpu.y, 134, 239, 172);
      floatTextsRef.current.push({ x: cpu.x, y: cpu.y - SKUNK_R*2.5,
        text: "GOT 'EM! 🎯", color: "#86efac", life: 60, maxLife: 60, vy: -1.4 });
      setCpuLives(cpu.lives);
      if (cpu.lives <= 0) {
        cancelAnimationFrame(rafRef.current);
        setPlayerScore(s => s + 1);
        setWinner("player"); setPhase("over"); phaseRef.current = "over"; return;
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // DRAW
    // ════════════════════════════════════════════════════════════════════════════
    ctx.save();

    // Screen shake
    if (shakeRef.current > 0) {
      const intensity = shakeRef.current / 14;
      ctx.translate((Math.random()-0.5)*9*intensity, (Math.random()-0.5)*9*intensity);
      shakeRef.current--;
    }

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = "#0a0d14";
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const st of STARS) {
      const blink = 0.4 + 0.28 * Math.sin(frame * 0.014 + st.ph);
      ctx.globalAlpha = blink * 0.75;
      ctx.fillStyle   = "#ffffff";
      ctx.beginPath(); ctx.arc(st.nx * W, st.ny * H, st.s, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Arena floor ───────────────────────────────────────────────────────────
    const aX = W/2, aY = H/2;
    const aRX = W*0.44, aRY = H*0.42;
    const floorG = ctx.createRadialGradient(aX, aY, 0, aX, aY, aRX);
    floorG.addColorStop(0,   "rgba(22,38,20,0.96)");
    floorG.addColorStop(0.7, "rgba(12,22,11,0.96)");
    floorG.addColorStop(1,   "rgba(5,10,5,0)");
    ctx.fillStyle = floorG;
    ctx.beginPath(); ctx.ellipse(aX, aY, aRX*1.1, aRY*1.1, 0, 0, Math.PI*2); ctx.fill();

    // Subtle dirt ring marks
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.ellipse(aX, aY, aRX*0.55, aRY*0.55, 0, 0, Math.PI*2); ctx.stroke();

    // Animated glow border
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.035);
    ctx.shadowBlur   = 12 + pulse*14;
    ctx.shadowColor  = `rgba(167,139,250,${0.45 + pulse*0.3})`;
    ctx.strokeStyle  = `rgba(167,139,250,${0.38 + pulse*0.32})`;
    ctx.lineWidth    = 2.5;
    ctx.beginPath(); ctx.ellipse(aX, aY, aRX, aRY, 0, 0, Math.PI*2); ctx.stroke();
    ctx.shadowBlur   = 0;

    // Center divider
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([7, 9]);
    ctx.beginPath(); ctx.moveTo(W/2, aY-aRY*0.9); ctx.lineTo(W/2, aY+aRY*0.9); ctx.stroke();
    ctx.setLineDash([]);

    // ── Particles ─────────────────────────────────────────────────────────────
    const nextP: Particle[] = [];
    for (const p of particlesRef.current) {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.90; p.vy *= 0.90;
      p.life--;
      if (p.life <= 0) continue;
      const pa = p.life / p.maxLife;
      ctx.globalAlpha = pa * 0.92;
      ctx.fillStyle   = `rgb(${p.cr},${p.cg},${p.cb})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*(0.3+pa*0.7), 0, Math.PI*2); ctx.fill();
      nextP.push(p);
    }
    particlesRef.current = nextP;
    ctx.globalAlpha = 1;

    // ── Stink clouds ──────────────────────────────────────────────────────────
    for (const cl of cloudsRef.current) {
      const alpha    = cl.life / cl.maxLife;
      const isPlayer = cl.owner === "player";

      // Trail
      for (let ti = 0; ti < cl.trail.length; ti++) {
        const t  = cl.trail[ti];
        const ta = alpha * (1 - ti/cl.trail.length) * 0.32;
        const tr = PROJ_R * 0.5 * (1 - ti/cl.trail.length);
        if (tr < 1) continue;
        ctx.globalAlpha = ta;
        ctx.fillStyle   = isPlayer ? "#60a5fa" : "#f87171";
        ctx.beginPath(); ctx.arc(t.x, t.y, tr, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Main body
      const r      = PROJ_R * (0.85 + 0.45 * alpha);
      const wobble = Math.sin(frame*0.13 + cl.x*0.08) * r * 0.09;
      const grd    = ctx.createRadialGradient(cl.x, cl.y+wobble, 0, cl.x, cl.y, r);
      if (isPlayer) {
        grd.addColorStop(0,   `rgba(147,197,253,${alpha*0.92})`);
        grd.addColorStop(0.55,`rgba(59,130,246,${alpha*0.7})`);
        grd.addColorStop(1,   `rgba(30,64,175,0)`);
      } else {
        grd.addColorStop(0,   `rgba(252,165,165,${alpha*0.92})`);
        grd.addColorStop(0.55,`rgba(239,68,68,${alpha*0.7})`);
        grd.addColorStop(1,   `rgba(127,29,29,0)`);
      }
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cl.x, cl.y, r, 0, Math.PI*2); ctx.fill();

      // Emoji overlay
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.font = `${Math.round(r*1.35)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💨", cl.x, cl.y);
      ctx.restore();
    }

    // ── Red flash ─────────────────────────────────────────────────────────────
    ctx.restore(); // un-shake before full-screen effects

    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(220,38,38,${(flashRef.current/12)*0.2})`;
      ctx.fillRect(0, 0, W, H);
      flashRef.current--;
    }

    ctx.save(); // re-save (no shake) for remaining draws

    // ── Skunks ────────────────────────────────────────────────────────────────
    const drawSkunk = (s: Skunk, cr: number, cg: number, cb: number, label: string) => {
      if (s.invFrames > 0 && Math.floor(s.invFrames/5) % 2 === 0) return;

      // Outer glow
      ctx.save();
      ctx.translate(s.x, s.y);
      const g = ctx.createRadialGradient(0,0,SKUNK_R*0.3, 0,0,SKUNK_R*2.0);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},0.38)`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, SKUNK_R*2.0, 0, Math.PI*2); ctx.fill();

      // Facing chevron
      ctx.rotate(s.angle);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.82)`;
      ctx.beginPath();
      ctx.moveTo(SKUNK_R*1.05,  0);
      ctx.lineTo(-SKUNK_R*0.4, -SKUNK_R*0.46);
      ctx.lineTo(-SKUNK_R*0.4,  SKUNK_R*0.46);
      ctx.closePath(); ctx.fill();
      ctx.restore();

      // Emoji with gentle bob
      const bob = Math.sin(frame*0.07 + s.x*0.01) * 1.8;
      ctx.save();
      ctx.font = `${Math.round(SKUNK_R*1.8)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🦨", s.x, s.y + bob);
      ctx.restore();

      // Name label
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.font = `bold ${Math.round(9*scale+7)}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 3;
      ctx.fillText(label, s.x, s.y - SKUNK_R - 4);
      ctx.shadowBlur = 0;
    };

    drawSkunk(player, 96,  165, 250, "YOU");
    drawSkunk(cpu,    248, 113, 113, "CPU");

    // ── Floating hit text ─────────────────────────────────────────────────────
    const nextFT: FloatText[] = [];
    for (const ft of floatTextsRef.current) {
      ft.y += ft.vy; ft.life--;
      if (ft.life <= 0) continue;
      const fa = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.min(1, fa * 2.5);
      ctx.fillStyle   = ft.color;
      ctx.font = `bold ${Math.round(10*scale+8)}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 5;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
      nextFT.push(ft);
    }
    floatTextsRef.current = nextFT;

    // ── HUD ───────────────────────────────────────────────────────────────────
    const hSz = Math.round(12*scale + 8);
    ctx.font = `${hSz}px serif`;

    ctx.textAlign = "left"; ctx.textBaseline = "top";
    let hearts = "";
    for (let i = 0; i < MAX_LIVES; i++) hearts += i < player.lives ? "❤️" : "🖤";
    ctx.fillText(hearts, 10, 8);

    ctx.textAlign = "right";
    hearts = "";
    for (let i = 0; i < MAX_LIVES; i++) hearts += i < cpu.lives ? "❤️" : "🖤";
    ctx.fillText(hearts, W-10, 8);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `bold ${Math.round(9*scale+6)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("VS", W/2, 10);

    ctx.restore();

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [tryFire]);

  // Countdown → playing
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      const t = setTimeout(() => {
        phaseRef.current = "playing";
        setPhase("playing");
        rafRef.current = requestAnimationFrame(gameLoop);
      }, 750);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 900);
    return () => clearTimeout(t);
  }, [phase, countdown, gameLoop]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const c = canvasRef.current;
    if (!c) return;
    const W = c.width, H = c.height;
    playerRef.current     = { x:W*0.18, y:H*0.5, angle:0,       vx:0,vy:0,lives:MAX_LIVES,invFrames:0,cooldown:0 };
    cpuRef.current        = { x:W*0.82, y:H*0.5, angle:Math.PI, vx:0,vy:0,lives:MAX_LIVES,invFrames:0,cooldown:0 };
    cloudsRef.current     = [];
    particlesRef.current  = [];
    floatTextsRef.current = [];
    keysRef.current.clear();
    cpuWander.current     = { angle: Math.PI, timer: 0 };
    frameRef.current      = 0;
    shakeRef.current      = 0;
    flashRef.current      = 0;
    setPlayerLives(MAX_LIVES);
    setCpuLives(MAX_LIVES);
    setWinner(null);
    setCountdown(3);
    setPhase("countdown");
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const press   = useCallback((k: string) => keysRef.current.add(k),    []);
  const release = useCallback((k: string) => keysRef.current.delete(k), []);

  const cdLabel = countdown > 0 ? `${countdown}` : "FIGHT!";

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner} style={{ padding: 0, justifyContent: "flex-start" }}>

      {/* Canvas + overlays */}
      <div ref={containerRef} style={{ width: "100%", position: "relative", flexShrink: 0 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />

        {/* ── Idle ── */}
        {phase === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg,rgba(10,13,20,0.93),rgba(28,16,46,0.93))",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.65rem", padding: "1.25rem",
          }}>
            <div style={{ fontSize: "2.6rem" }}>🦨💨🦨</div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: "1.45rem", fontWeight: 900, letterSpacing: "-0.01em" }}>
              Skunk Duel
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", margin: 0,
              fontSize: "0.8rem", lineHeight: 1.65, maxWidth: 270 }}>
              Fire stink clouds at the enemy skunk!<br />
              <span style={{ color: "#93c5fd" }}>Your clouds are blue 💨</span>
              {" — dodge the "}
              <span style={{ color: "#fca5a5" }}>red ones!</span>
            </p>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["kids","adult"] as Difficulty[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{
                  padding: "0.35rem 0.9rem", borderRadius: 999, fontWeight: 700, fontSize: "0.82rem",
                  border: "2px solid", cursor: "pointer",
                  borderColor: difficulty === d ? "#a78bfa" : "rgba(255,255,255,0.16)",
                  background:  difficulty === d ? "rgba(167,139,250,0.18)" : "transparent",
                  color:       difficulty === d ? "#c4b5fd" : "rgba(255,255,255,0.55)",
                  transition:  "all 0.15s",
                }}>{d === "kids" ? "🧒 Kids" : "💪 Adult"}</button>
              ))}
            </div>

            {(playerScore > 0 || cpuScore > 0) && (
              <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", textAlign: "center" }}>
                Score — You <strong style={{ color: "#93c5fd" }}>{playerScore}</strong>
                {" : "}
                <strong style={{ color: "#fca5a5" }}>{cpuScore}</strong> CPU
              </div>
            )}

            <button onClick={startGame} style={{
              background: "linear-gradient(135deg,#818cf8,#6366f1)",
              border: "none", color: "#fff", padding: "0.6rem 2rem",
              borderRadius: 999, fontWeight: 800, fontSize: "1rem", cursor: "pointer",
              boxShadow: "0 0 22px rgba(129,140,248,0.45)", letterSpacing: "0.01em",
            }}>💨 Start Duel!</button>

            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.28)", textAlign: "center" }}>
              Arrows / WASD to move • Space / F to fire
            </div>
          </div>
        )}

        {/* ── Countdown ── */}
        {phase === "countdown" && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.4rem",
          }}>
            <div style={{
              fontSize: countdown > 0 ? "6rem" : "3.2rem",
              fontWeight: 900,
              color: countdown > 0 ? "#fff" : "#86efac",
              textShadow: countdown > 0
                ? "0 0 40px rgba(167,139,250,0.9)"
                : "0 0 40px rgba(134,239,172,0.9)",
              lineHeight: 1, letterSpacing: countdown === 0 ? "-0.02em" : "0",
              transition: "font-size 0.15s, color 0.15s",
            }}>
              {cdLabel}
            </div>
            {countdown > 0 && (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Get ready…</div>
            )}
          </div>
        )}

        {/* ── Game over ── */}
        {phase === "over" && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg,rgba(0,0,0,0.9),rgba(20,10,38,0.9))",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.6rem",
          }}>
            <div style={{ fontSize: "3rem" }}>{winner === "player" ? "🏆" : "💀"}</div>
            <h2 style={{
              margin: 0, fontSize: "1.5rem", fontWeight: 900,
              color: winner === "player" ? "#86efac" : "#fca5a5",
            }}>
              {winner === "player" ? "You Win! 🎉" : "CPU Wins!"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", margin: 0, fontSize: "0.82rem" }}>
              {winner === "player" ? "You out-stunk the competition! 💨" : "Better luck next time, stinky! 🦨"}
            </p>
            <div style={{
              display: "flex", gap: "1.5rem", fontSize: "0.9rem",
              background: "rgba(255,255,255,0.06)", borderRadius: 12,
              padding: "0.45rem 1.25rem", color: "rgba(255,255,255,0.55)",
            }}>
              <span>You: {"❤️".repeat(playerLives)}{"🖤".repeat(Math.max(0,MAX_LIVES-playerLives))}</span>
              <span>CPU: {"❤️".repeat(cpuLives)}{"🖤".repeat(Math.max(0,MAX_LIVES-cpuLives))}</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)" }}>
              Overall — You <strong style={{ color: "#93c5fd" }}>{playerScore}</strong>
              {" : "}
              <strong style={{ color: "#fca5a5" }}>{cpuScore}</strong> CPU
            </div>
            <button onClick={startGame} style={{
              background: "linear-gradient(135deg,#818cf8,#6366f1)",
              border: "none", color: "#fff", padding: "0.55rem 1.75rem",
              borderRadius: 999, fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
              boxShadow: "0 0 18px rgba(129,140,248,0.4)",
            }}>
              {winner === "player" ? "Play Again" : "Rematch! 🔥"}
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile controls ─────────────────────────────────────────────────── */}
      <div style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.5rem 1rem", background: "rgba(0,0,0,0.32)",
        borderTop: "1px solid rgba(255,255,255,0.055)",
        boxSizing: "border-box", flexShrink: 0,
      }}>
        {/* D-pad */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,46px)", gridTemplateRows:"repeat(3,46px)", gap:4 }}>
          <div /><Btn icon="▲" onDown={() => press("ArrowUp")}    onUp={() => release("ArrowUp")}    /><div />
          <Btn      icon="◄" onDown={() => press("ArrowLeft")}  onUp={() => release("ArrowLeft")}  />
          <div />
          <Btn      icon="►" onDown={() => press("ArrowRight")} onUp={() => release("ArrowRight")} />
          <div /><Btn icon="▼" onDown={() => press("ArrowDown")}  onUp={() => release("ArrowDown")}  /><div />
        </div>

        {/* Lives (mobile) */}
        {phase === "playing" && (
          <div style={{ textAlign:"center", fontSize:"0.72rem", lineHeight:1.8 }}>
            <div style={{ color:"#93c5fd", fontWeight:700 }}>
              YOU {"❤️".repeat(playerLives)}{"🖤".repeat(Math.max(0,MAX_LIVES-playerLives))}
            </div>
            <div style={{ color:"#fca5a5", fontWeight:700 }}>
              CPU {"❤️".repeat(cpuLives)}{"🖤".repeat(Math.max(0,MAX_LIVES-cpuLives))}
            </div>
          </div>
        )}
        {phase !== "playing" && <div />}

        {/* Fire */}
        <Btn icon="💨" onDown={() => press(" ")} onUp={() => release(" ")} size={70} label="FIRE!" />
      </div>
    </div>
  );
}
