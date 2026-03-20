"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

type Phase = "idle" | "playing" | "over";
type Difficulty = "kids" | "adult";

interface Skunk {
  x: number; y: number;
  angle: number;   // radians — 0 = right
  vx: number; vy: number;
  lives: number;
  invFrames: number;
  cooldown: number;
}

interface Cloud {
  x: number; y: number;
  vx: number; vy: number;
  owner: "player" | "cpu";
  life: number;
  maxLife: number;
}

const MAX_LIVES    = 3;
const TURN_SPD     = 0.046;
const FRICTION     = 0.87;
const PROJ_LIFE    = 110;
const INV_FRAMES   = 80;
const FIRE_CD      = 42;

// Derived from canvas width at runtime:
// SKUNK_R, PROJ_R, MOVE_SPD, PROJ_SPD — computed in loop from canvas.width

function angleDiff(a: number, b: number): number {
  return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}
function hit(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

// ─── Mobile button ────────────────────────────────────────────────────────────
function Btn({ icon, onDown, onUp, size = 46 }: { icon: string; onDown: () => void; onUp: () => void; size?: number }) {
  return (
    <div
      onPointerDown={e => { e.preventDefault(); onDown(); }}
      onPointerUp={e => { e.preventDefault(); onUp(); }}
      onPointerLeave={e => { e.preventDefault(); onUp(); }}
      style={{
        width: size, height: size, borderRadius: size === 46 ? 8 : "50%",
        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, color: "white", userSelect: "none",
        cursor: "pointer", touchAction: "none", flexShrink: 0,
      }}
    >{icon}</div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FartDuelGame({ title: _title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("kids");
  const [phase, setPhase]           = useState<Phase>("idle");
  const [playerLives, setPlayerLives] = useState(MAX_LIVES);
  const [cpuLives, setCpuLives]       = useState(MAX_LIVES);
  const [winner, setWinner]           = useState<"player" | "cpu" | null>(null);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<Skunk>({ x:0,y:0,angle:0,vx:0,vy:0,lives:MAX_LIVES,invFrames:0,cooldown:0 });
  const cpuRef       = useRef<Skunk>({ x:0,y:0,angle:Math.PI,vx:0,vy:0,lives:MAX_LIVES,invFrames:0,cooldown:0 });
  const cloudsRef    = useRef<Cloud[]>([]);
  const keysRef      = useRef<Set<string>>(new Set());
  const rafRef       = useRef(0);
  const phaseRef     = useRef<Phase>("idle");
  const diffRef      = useRef<Difficulty>("kids");
  // CPU wander state
  const cpuWander    = useRef({ angle: 0, timer: 0 });

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { diffRef.current  = difficulty; }, [difficulty]);

  // Resize canvas to fit container
  useEffect(() => {
    const measure = () => {
      const c = canvasRef.current;
      const d = containerRef.current;
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

  const tryFire = useCallback((skunk: Skunk, owner: "player" | "cpu", projR: number, projSpd: number, cd: number) => {
    if (skunk.cooldown > 0) return;
    skunk.cooldown = cd;
    cloudsRef.current.push({
      x: skunk.x + Math.cos(skunk.angle) * (20 + projR),
      y: skunk.y + Math.sin(skunk.angle) * (20 + projR),
      vx: Math.cos(skunk.angle) * projSpd + skunk.vx * 0.25,
      vy: Math.sin(skunk.angle) * projSpd + skunk.vy * 0.25,
      owner, life: PROJ_LIFE, maxLife: PROJ_LIFE,
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
      // Wander: change random angle every ~90 frames
      cpuWander.current.timer--;
      if (cpuWander.current.timer <= 0) {
        cpuWander.current.angle = cpu.angle + (Math.random() - 0.5) * Math.PI * 1.4;
        cpuWander.current.timer = 70 + Math.random() * 50;
      }
      // Blend: 30% track player, 70% wander
      const target = Math.random() < 0.3 ? toPlayer : cpuWander.current.angle;
      const td = angleDiff(cpu.angle, target);
      cpu.angle += Math.sign(td) * 0.022;
      // Slow movement
      if (dist > idealDist * 0.7) {
        cpu.vx += Math.cos(cpu.angle) * MOVE_SPD * 0.08;
        cpu.vy += Math.sin(cpu.angle) * MOVE_SPD * 0.08;
      }
      // Fire occasionally when vaguely aimed
      if (Math.abs(aimDiff) < 0.5) tryFire(cpu, "cpu", PROJ_R, PROJ_SPD, 85);
    } else {
      // Adult: accurate tracking
      cpu.angle += Math.sign(aimDiff) * Math.min(Math.abs(aimDiff), 0.044);
      // Keep ideal distance
      if (dist > idealDist) {
        cpu.vx += Math.cos(cpu.angle) * MOVE_SPD * 0.14;
        cpu.vy += Math.sin(cpu.angle) * MOVE_SPD * 0.14;
      } else if (dist < idealDist * 0.5) {
        cpu.vx -= Math.cos(cpu.angle) * MOVE_SPD * 0.1;
        cpu.vy -= Math.sin(cpu.angle) * MOVE_SPD * 0.1;
      }
      // Fire when aimed
      if (Math.abs(aimDiff) < 0.14) tryFire(cpu, "cpu", PROJ_R, PROJ_SPD, 52);
    }

    // ── Physics ───────────────────────────────────────────────────────────────
    for (const s of [player, cpu]) {
      s.vx *= FRICTION; s.vy *= FRICTION;
      s.x  += s.vx;     s.y  += s.vy;
      if (s.x < SKUNK_R)        { s.x = SKUNK_R;        s.vx *= -0.4; }
      if (s.x > W - SKUNK_R)   { s.x = W - SKUNK_R;    s.vx *= -0.4; }
      if (s.y < SKUNK_R)        { s.y = SKUNK_R;        s.vy *= -0.4; }
      if (s.y > H - SKUNK_R)   { s.y = H - SKUNK_R;    s.vy *= -0.4; }
      if (s.cooldown  > 0) s.cooldown--;
      if (s.invFrames > 0) s.invFrames--;
    }

    // ── Projectiles ───────────────────────────────────────────────────────────
    const next: Cloud[] = [];
    let pHit = false, cHit = false;
    for (const cl of cloudsRef.current) {
      cl.x += cl.vx; cl.y += cl.vy; cl.life--;
      if (cl.life <= 0 || cl.x < -PROJ_R || cl.x > W + PROJ_R || cl.y < -PROJ_R || cl.y > H + PROJ_R) continue;
      if (cl.owner === "cpu"    && player.invFrames === 0 && hit(cl.x, cl.y, PROJ_R, player.x, player.y, SKUNK_R)) { pHit = true; continue; }
      if (cl.owner === "player" && cpu.invFrames    === 0 && hit(cl.x, cl.y, PROJ_R, cpu.x,    cpu.y,    SKUNK_R)) { cHit = true; continue; }
      next.push(cl);
    }
    cloudsRef.current = next;

    if (pHit) {
      player.lives--; player.invFrames = INV_FRAMES; player.vx = player.vy = 0;
      setPlayerLives(player.lives);
      if (player.lives <= 0) { cancelAnimationFrame(rafRef.current); setWinner("cpu");    setPhase("over"); return; }
    }
    if (cHit) {
      cpu.lives--;    cpu.invFrames    = INV_FRAMES; cpu.vx    = cpu.vy    = 0;
      setCpuLives(cpu.lives);
      if (cpu.lives    <= 0) { cancelAnimationFrame(rafRef.current); setWinner("player"); setPhase("over"); return; }
    }

    // ── Draw ──────────────────────────────────────────────────────────────────
    // Background
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, W, H);

    // Arena floor
    const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7);
    grad.addColorStop(0, "#1f2937");
    grad.addColorStop(1, "#111827");
    ctx.fillStyle = grad;
    ctx.fillRect(4, 4, W - 8, H - 8);

    // Border
    ctx.strokeStyle = "rgba(139,92,246,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    // Center line (dashed)
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]);
    ctx.beginPath(); ctx.moveTo(W/2, 6); ctx.lineTo(W/2, H - 6); ctx.stroke();
    ctx.setLineDash([]);

    // Grid dots
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let gx = 40; gx < W - 20; gx += 55)
      for (let gy = 30; gy < H - 10; gy += 50) {
        ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill();
      }

    // Stink clouds
    for (const cl of cloudsRef.current) {
      const alpha = cl.life / cl.maxLife;
      const r = PROJ_R * (0.7 + 0.3 * alpha);
      const grd2 = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, r);
      grd2.addColorStop(0, `rgba(134,239,172,${alpha * 0.85})`);
      grd2.addColorStop(1, `rgba(34,197,94,0)`);
      ctx.fillStyle = grd2;
      ctx.beginPath(); ctx.arc(cl.x, cl.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${Math.round(r * 1.3)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💨", cl.x, cl.y);
      ctx.restore();
    }

    // Draw skunk helper
    const drawSkunk = (s: Skunk, glow: string, label: string) => {
      if (s.invFrames > 0 && Math.floor(s.invFrames / 6) % 2 === 0) return;
      ctx.save();
      ctx.translate(s.x, s.y);
      // Glow
      const g = ctx.createRadialGradient(0, 0, SKUNK_R * 0.4, 0, 0, SKUNK_R * 1.6);
      g.addColorStop(0, glow.replace("1)", "0.35)"));
      g.addColorStop(1, glow.replace("1)", "0)"));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, SKUNK_R * 1.6, 0, Math.PI * 2); ctx.fill();
      // Direction arrow
      ctx.rotate(s.angle);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(SKUNK_R * 0.9, 0);
      ctx.lineTo(-SKUNK_R * 0.45, -SKUNK_R * 0.5);
      ctx.lineTo(-SKUNK_R * 0.45,  SKUNK_R * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      // Emoji (no rotation — looks better upright)
      ctx.save();
      ctx.font = `${Math.round(SKUNK_R * 1.7)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🦨", s.x, s.y);
      ctx.restore();
      // Label
      ctx.fillStyle = glow;
      ctx.font = `bold ${Math.round(10 * scale + 8)}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(label, s.x, s.y - SKUNK_R - 4);
    };

    drawSkunk(player, "rgba(96,165,250,1)",  "YOU");
    drawSkunk(cpu,    "rgba(248,113,113,1)",  "CPU");

    // HUD: lives
    const heartSize = Math.round(13 * scale + 8);
    ctx.font = `${heartSize}px serif`;
    // Player lives (top-left)
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    let hearts = "";
    for (let i = 0; i < MAX_LIVES; i++) hearts += i < player.lives ? "❤️" : "🖤";
    ctx.fillText(hearts, 10, 8);
    // CPU lives (top-right)
    ctx.textAlign = "right";
    hearts = "";
    for (let i = 0; i < MAX_LIVES; i++) hearts += i < cpu.lives ? "❤️" : "🖤";
    ctx.fillText(hearts, W - 10, 8);

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [tryFire]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const c = canvasRef.current;
    if (!c) return;
    const W = c.width, H = c.height;
    playerRef.current = { x: W * 0.18, y: H * 0.5, angle: 0,        vx: 0, vy: 0, lives: MAX_LIVES, invFrames: 0, cooldown: 0 };
    cpuRef.current    = { x: W * 0.82, y: H * 0.5, angle: Math.PI,  vx: 0, vy: 0, lives: MAX_LIVES, invFrames: 0, cooldown: 0 };
    cloudsRef.current = [];
    keysRef.current.clear();
    cpuWander.current = { angle: Math.PI, timer: 0 };
    setPlayerLives(MAX_LIVES);
    setCpuLives(MAX_LIVES);
    setWinner(null);
    setPhase("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const press   = useCallback((k: string) => keysRef.current.add(k), []);
  const release = useCallback((k: string) => keysRef.current.delete(k), []);

  return (
    <div className={styles.gameInner} style={{ padding: 0, justifyContent: "flex-start" }}>
      {/* ── Canvas area ─────────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ width: "100%", position: "relative", flexShrink: 0 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />

        {/* Idle overlay */}
        {phase === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.78)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.75rem", padding: "1rem",
          }}>
            <div style={{ fontSize: "2.5rem" }}>🦨💨🦨</div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: "1.4rem" }}>Skunk Duel</h2>
            <p style={{ color: "rgba(255,255,255,0.65)", textAlign: "center", margin: 0, fontSize: "0.82rem", lineHeight: 1.5 }}>
              Fire stink clouds 💨 at the enemy skunk!<br />
              Arrows / WASD to move • Space to fire
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["kids","adult"] as Difficulty[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{
                  padding: "0.35rem 0.9rem", borderRadius: 999, fontWeight: 700, fontSize: "0.82rem",
                  border: "2px solid", cursor: "pointer",
                  borderColor: difficulty === d ? "#818cf8" : "rgba(255,255,255,0.2)",
                  background: difficulty === d ? "#818cf8" : "transparent", color: "#fff",
                }}>{d === "kids" ? "🧒 Kids" : "💪 Adult"}</button>
              ))}
            </div>
            <button onClick={startGame} style={{
              background: "linear-gradient(135deg,#818cf8,#6366f1)",
              border: "none", color: "#fff", padding: "0.55rem 1.75rem",
              borderRadius: 999, fontWeight: 700, fontSize: "1rem", cursor: "pointer",
            }}>💨 Start Duel!</button>
          </div>
        )}

        {/* Game over overlay */}
        {phase === "over" && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.75rem",
          }}>
            <div style={{ fontSize: "2.5rem" }}>{winner === "player" ? "🏆" : "💀"}</div>
            <h2 style={{ color: "#fff", margin: 0 }}>
              {winner === "player" ? "You Win!" : "CPU Wins!"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", margin: 0, fontSize: "0.88rem" }}>
              {winner === "player" ? "You out-stunk the competition! 💨" : "Better luck next time, stinky! 🦨"}
            </p>
            <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)" }}>
              You: {"❤️".repeat(playerLives)}{"🖤".repeat(Math.max(0, MAX_LIVES - playerLives))}
              {"  "}CPU: {"❤️".repeat(cpuLives)}{"🖤".repeat(Math.max(0, MAX_LIVES - cpuLives))}
            </div>
            <button onClick={startGame} style={{
              background: "linear-gradient(135deg,#818cf8,#6366f1)",
              border: "none", color: "#fff", padding: "0.55rem 1.5rem",
              borderRadius: 999, fontWeight: 700, cursor: "pointer",
            }}>Play Again</button>
          </div>
        )}
      </div>

      {/* ── Mobile controls ──────────────────────────────────────────────── */}
      <div style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.5rem 0.75rem", background: "rgba(0,0,0,0.25)", boxSizing: "border-box", flexShrink: 0,
      }}>
        {/* D-pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,46px)", gridTemplateRows: "repeat(3,46px)", gap: 4 }}>
          <div /><Btn icon="▲" onDown={() => press("ArrowUp")}    onUp={() => release("ArrowUp")} /><div />
          <Btn icon="◄" onDown={() => press("ArrowLeft")}  onUp={() => release("ArrowLeft")} />
          <div />
          <Btn icon="►" onDown={() => press("ArrowRight")} onUp={() => release("ArrowRight")} />
          <div /><Btn icon="▼" onDown={() => press("ArrowDown")}  onUp={() => release("ArrowDown")} /><div />
        </div>

        {/* Lives indicator (center, mobile only reminder) */}
        {phase === "playing" && (
          <div style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            <div style={{ color: "#93c5fd" }}>YOU {"❤️".repeat(playerLives)}{"🖤".repeat(Math.max(0,MAX_LIVES-playerLives))}</div>
            <div style={{ color: "#fca5a5" }}>CPU {"❤️".repeat(cpuLives)}{"🖤".repeat(Math.max(0,MAX_LIVES-cpuLives))}</div>
          </div>
        )}

        {/* Fire button */}
        <Btn icon="💨" onDown={() => press(" ")} onUp={() => release(" ")} size={70} />
      </div>
    </div>
  );
}
