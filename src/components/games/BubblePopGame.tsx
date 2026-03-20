"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── CSS animations ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes bp-pop {
  0%   { transform: translateX(-50%) translateY(-50%) scale(1);   opacity: 1; }
  40%  { transform: translateX(-50%) translateY(-50%) scale(1.65); opacity: 0.8; }
  100% { transform: translateX(-50%) translateY(-50%) scale(2.3);  opacity: 0; }
}
@keyframes bp-escape {
  0%   { opacity: 1; transform: translateX(-50%) translateY(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-50%) scale(0.3) translateY(-24px); }
}
@keyframes bp-ring {
  0%   { transform: translateX(-50%) translateY(-50%) scale(0.8); opacity: 0.85; }
  100% { transform: translateX(-50%) translateY(-50%) scale(2.8); opacity: 0; }
}
@keyframes bp-score-float {
  0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
}
@keyframes bp-screen-shake {
  0%,100% { transform: translate(0,0); }
  20%     { transform: translate(-5px, 2px); }
  40%     { transform: translate(5px, -2px); }
  60%     { transform: translate(-3px, 3px); }
  80%     { transform: translate(3px, -3px); }
}
@keyframes bp-combo-pop {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes bp-star-rotate {
  0%   { filter: hue-rotate(0deg) drop-shadow(0 0 6px gold); }
  100% { filter: hue-rotate(360deg) drop-shadow(0 0 12px gold); }
}
@keyframes bp-frost-pulse {
  0%,100% { opacity: 0.18; }
  50%      { opacity: 0.30; }
}
@keyframes bp-wobble-rise {
  0%   { transform: translateX(-50%) translateY(-50%) scale(1); }
  50%  { transform: translateX(-50%) translateY(-50%) scale(1.05); }
  100% { transform: translateX(-50%) translateY(-50%) scale(1); }
}
`;

// ── Types ──────────────────────────────────────────────────────────────────────
type Difficulty = "Kids" | "Medium" | "Hard";
type Phase = "idle" | "playing" | "over";
type BubbleKind = "normal" | "star" | "bomb" | "freeze";
type BubbleState = "alive" | "popping" | "escaped";

interface Bubble {
  id: number;
  x: number;          // percent, horizontal center (stable column)
  y: number;          // percent, top edge (rises from 108 → -15)
  size: number;       // px diameter
  speed: number;      // % per tick (50 ms)
  driftPhase: number; // random 0–2π, initial sine offset
  driftAmp: number;   // % half-amplitude of wobble
  driftFreq: number;  // radians per tick
  color: string;      // hsl string
  kind: BubbleKind;
  state: BubbleState;
  popKey: number;     // incremented on state change to force anim remount
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  label: string;
  positive: boolean;
}

interface RingEffect {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

interface DiffConfig {
  spawnIntervalMs: number;
  maxSimultaneous: number;
  baseSpeed: number;
  sizeMin: number;
  sizeMax: number;
  driftAmpMin: number;
  driftAmpMax: number;
  driftFreq: number;
  bombRatio: number;
  freezeRatio: number;
  starRatio: number;
  lives: number;
  normalPts: number;
  starPts: number;
  bombPenalty: number;
  bgGradient: string;
}

// ── Configs ────────────────────────────────────────────────────────────────────
const CONFIGS: Record<Difficulty, DiffConfig> = {
  Kids: {
    spawnIntervalMs: 1600,
    maxSimultaneous: 3,
    baseSpeed: 0.7,
    sizeMin: 54, sizeMax: 72,
    driftAmpMin: 1.5, driftAmpMax: 2.5,
    driftFreq: 0.10,
    bombRatio: 0, freezeRatio: 0.08, starRatio: 0.15,
    lives: 5,
    normalPts: 10, starPts: 30, bombPenalty: 0,
    bgGradient: "linear-gradient(180deg, #87ceeb 0%, #c8f0ff 60%, #e0f7fa 100%)",
  },
  Medium: {
    spawnIntervalMs: 950,
    maxSimultaneous: 5,
    baseSpeed: 1.2,
    sizeMin: 40, sizeMax: 64,
    driftAmpMin: 0.9, driftAmpMax: 1.8,
    driftFreq: 0.12,
    bombRatio: 0.12, freezeRatio: 0.08, starRatio: 0.10,
    lives: 3,
    normalPts: 15, starPts: 45, bombPenalty: 20,
    bgGradient: "linear-gradient(180deg, #1a1a4e 0%, #0d3b6e 60%, #0a2040 100%)",
  },
  Hard: {
    spawnIntervalMs: 550,
    maxSimultaneous: 8,
    baseSpeed: 2.0,
    sizeMin: 32, sizeMax: 52,
    driftAmpMin: 0.6, driftAmpMax: 1.4,
    driftFreq: 0.14,
    bombRatio: 0.20, freezeRatio: 0.06, starRatio: 0.08,
    lives: 3,
    normalPts: 20, starPts: 60, bombPenalty: 30,
    bgGradient: "linear-gradient(180deg, #0a0a14 0%, #1a0a2e 60%, #0f0f1e 100%)",
  },
};

const COLORS = [
  "hsl(0,75%,62%)",
  "hsl(30,85%,60%)",
  "hsl(55,88%,55%)",
  "hsl(130,62%,52%)",
  "hsl(195,78%,55%)",
  "hsl(220,74%,60%)",
  "hsl(270,68%,62%)",
  "hsl(320,74%,62%)",
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function pickKind(cfg: DiffConfig): BubbleKind {
  const r = Math.random();
  if (r < cfg.bombRatio) return "bomb";
  if (r < cfg.bombRatio + cfg.freezeRatio) return "freeze";
  if (r < cfg.bombRatio + cfg.freezeRatio + cfg.starRatio) return "star";
  return "normal";
}

function pickColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function effectiveSpeed(base: number, elapsed: number): number {
  const scale = elapsed >= 60 ? 1.6 : elapsed >= 30 ? 1.3 : 1.0;
  return base * scale;
}

function effectiveSpawnMs(base: number, elapsed: number): number {
  return Math.max(base * (1 - Math.min(elapsed / 90, 1) * 0.3), 350);
}

function darken(hsl: string): string {
  // shift lightness down ~15% for gradient edge
  return hsl.replace(/(\d+)%\)$/, (_, l) => `${Math.max(0, Number(l) - 18)}%)`);
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function BubblePopGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Kids");
  const [phase, setPhase]           = useState<Phase>("idle");
  const [bubbles, setBubbles]       = useState<Bubble[]>([]);
  const [score, setScore]           = useState(0);
  const [lives, setLives]           = useState(5);
  const [combo, setCombo]           = useState(0);
  const [highScore, setHighScore]   = useState(0);
  const [popups, setPopups]         = useState<ScorePopup[]>([]);
  const [rings, setRings]           = useState<RingEffect[]>([]);
  const [frozen, setFrozen]         = useState(false);
  const [shaking, setShaking]       = useState(false);

  const bubblesRef     = useRef<Bubble[]>([]);
  const livesRef       = useRef(5);
  const comboRef       = useRef(0);
  const elapsedRef     = useRef(0);
  const tickNumRef     = useRef(0);
  const difficultyRef  = useRef<Difficulty>("Kids");
  const phaseRef       = useRef<Phase>("idle");
  const frozenRef      = useRef(false);
  const freezeTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef      = useRef(0);
  const popupIdRef     = useRef(0);
  const ringIdRef      = useRef(0);
  const fieldRef       = useRef<HTMLDivElement>(null);

  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // ── updateBubbles ─────────────────────────────────────────────────────────
  const updateBubbles = useCallback((updater: (prev: Bubble[]) => Bubble[]) => {
    const next = updater(bubblesRef.current);
    bubblesRef.current = next;
    setBubbles([...next]);
  }, []);

  // ── Main game loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    function moveTick() {
      const cfg = CONFIGS[difficultyRef.current];
      const tick = tickNumRef.current;
      const spd  = effectiveSpeed(cfg.baseSpeed, elapsedRef.current);

      let escaped = false;

      const next = bubblesRef.current.map(b => {
        if (b.state !== "alive") return b;
        const newY = b.y - spd * (frozenRef.current ? 0 : 1);
        if (newY < -15) {
          escaped = true;
          return { ...b, y: newY, state: "escaped" as BubbleState, popKey: b.popKey + 1 };
        }
        return { ...b, y: newY };
      // Remove bubbles well past exit or that finished pop animation (> 400ms old signal)
      }).filter(b => !(b.state === "escaped" && b.y < -30) && !(b.state === "popping" && b.y < -50));

      bubblesRef.current = next;
      setBubbles([...next]);
      tickNumRef.current = tick + 1;

      if (escaped) {
        // Only penalise non-frozen escapes
        if (!frozenRef.current) {
          livesRef.current = Math.max(0, livesRef.current - 1);
          setLives(livesRef.current);
          comboRef.current = 0;
          setCombo(0);
          if (livesRef.current <= 0) {
            phaseRef.current = "over";
            setPhase("over");
            setHighScore(prev => Math.max(prev, score));
            return;
          }
        }
      }

      tickTimer.current = setTimeout(moveTick, 50);
    }

    function spawnTick() {
      const cfg = CONFIGS[difficultyRef.current];
      const elapsed = elapsedRef.current;
      const active = bubblesRef.current.filter(b => b.state === "alive").length;
      const maxSim = cfg.maxSimultaneous + (elapsed >= 30 ? 1 : 0);

      if (active < maxSim) {
        const kind  = pickKind(cfg);
        const color = kind === "freeze" ? "hsl(195,80%,65%)"
                    : kind === "bomb"   ? "hsl(0,0%,30%)"
                    : kind === "star"   ? "hsl(48,100%,55%)"
                    : pickColor();
        const size  = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
        const newB: Bubble = {
          id: nextIdRef.current++,
          x: 8 + Math.random() * 84,
          y: 108,
          size,
          speed: effectiveSpeed(cfg.baseSpeed, elapsed),
          driftPhase: Math.random() * Math.PI * 2,
          driftAmp: cfg.driftAmpMin + Math.random() * (cfg.driftAmpMax - cfg.driftAmpMin),
          driftFreq: cfg.driftFreq,
          color,
          kind,
          state: "alive",
          popKey: 0,
        };
        updateBubbles(prev => [...prev, newB]);
      }

      spawnTimer.current = setTimeout(spawnTick, effectiveSpawnMs(cfg.spawnIntervalMs, elapsed));
    }

    // Countdown (elapsed seconds)
    const countdownTimer = setInterval(() => { elapsedRef.current += 1; }, 1000);

    tickTimer.current  = setTimeout(moveTick, 50);
    spawnTimer.current = setTimeout(spawnTick, 500);

    return () => {
      clearInterval(countdownTimer);
      if (tickTimer.current)  clearTimeout(tickTimer.current);
      if (spawnTimer.current) clearTimeout(spawnTimer.current);
    };
  }, [phase, difficulty, updateBubbles, score]);

  // ── Bubble click handler ──────────────────────────────────────────────────
  const handleBubbleClick = useCallback((id: number) => {
    const b = bubblesRef.current.find(x => x.id === id);
    if (!b || b.state !== "alive") return;

    const cfg = CONFIGS[difficultyRef.current];
    const fieldEl = fieldRef.current;
    const fieldH = fieldEl?.offsetHeight ?? 400;
    const yPx = (b.y / 100) * fieldH; // approx vertical popup pos

    if (b.kind === "bomb") {
      const pts = -cfg.bombPenalty;
      if (pts !== 0) setScore(s => Math.max(0, s + pts));
      comboRef.current = 0;
      setCombo(0);
      setShaking(true);
      setTimeout(() => setShaking(false), 420);
      if (cfg.bombPenalty > 0) {
        const pid = popupIdRef.current++;
        setPopups(p => [...p, { id: pid, x: b.x, y: b.y, label: `−${cfg.bombPenalty}`, positive: false }]);
        setTimeout(() => setPopups(p => p.filter(x => x.id !== pid)), 950);
      }
    } else if (b.kind === "freeze") {
      if (freezeTimer.current) clearTimeout(freezeTimer.current);
      frozenRef.current = true;
      setFrozen(true);
      freezeTimer.current = setTimeout(() => { frozenRef.current = false; setFrozen(false); }, 3000);
      setScore(s => s + 10);
      const pid = popupIdRef.current++;
      setPopups(p => [...p, { id: pid, x: b.x, y: b.y, label: "❄ +10", positive: true }]);
      setTimeout(() => setPopups(p => p.filter(x => x.id !== pid)), 950);
    } else {
      // normal or star
      comboRef.current += 1;
      setCombo(comboRef.current);
      const mul  = comboRef.current >= 10 ? 4 : comboRef.current >= 6 ? 3 : comboRef.current >= 3 ? 2 : 1;
      const base = b.kind === "star" ? cfg.starPts : cfg.normalPts;
      const pts  = base * mul;
      setScore(s => s + pts);
      const label = mul > 1 ? `+${pts} ×${mul}!` : `+${pts}`;
      const pid = popupIdRef.current++;
      setPopups(p => [...p, { id: pid, x: b.x, y: b.y, label, positive: true }]);
      setTimeout(() => setPopups(p => p.filter(x => x.id !== pid)), 950);
      // burst ring
      const rid = ringIdRef.current++;
      setRings(r => [...r, { id: rid, x: b.x, y: b.y, color: b.color, size: b.size }]);
      setTimeout(() => setRings(r => r.filter(x => x.id !== rid)), 420);
      void yPx; // suppress unused warning — yPx used for future enhancements
    }

    updateBubbles(prev => prev.map(x =>
      x.id === id ? { ...x, state: "popping" as BubbleState, popKey: x.popKey + 1 } : x
    ));
    setTimeout(() => {
      updateBubbles(prev => prev.filter(x => x.id !== id));
    }, 380);
  }, [updateBubbles]);

  // ── Game controls ─────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    if (tickTimer.current)  clearTimeout(tickTimer.current);
    if (freezeTimer.current) clearTimeout(freezeTimer.current);
    const cfg = CONFIGS[difficultyRef.current];
    bubblesRef.current = [];
    livesRef.current   = cfg.lives;
    comboRef.current   = 0;
    elapsedRef.current = 0;
    tickNumRef.current = 0;
    frozenRef.current  = false;
    phaseRef.current   = "playing";
    setBubbles([]);
    setScore(0);
    setLives(cfg.lives);
    setCombo(0);
    setPopups([]);
    setRings([]);
    setFrozen(false);
    setShaking(false);
    setPhase("playing");
  }, []);

  const resetGame = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    if (tickTimer.current)  clearTimeout(tickTimer.current);
    if (freezeTimer.current) clearTimeout(freezeTimer.current);
    bubblesRef.current = [];
    phaseRef.current   = "idle";
    frozenRef.current  = false;
    setBubbles([]);
    setScore(0);
    setPopups([]);
    setRings([]);
    setFrozen(false);
    setPhase("idle");
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const cfg      = CONFIGS[difficulty];
  const comboMul = combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1;
  const isNewHigh = phase === "over" && score > 0 && score >= highScore;
  const heartsArr = Array.from({ length: cfg.lives });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Difficulty selector */}
      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Difficulty:</span>
        {(["Kids", "Medium", "Hard"] as Difficulty[]).map(d => (
          <button
            key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => { setDifficulty(d); resetGame(); }}
          >{d}</button>
        ))}
      </div>

      {/* ── IDLE ────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
            {difficulty === "Kids" ? "🫧" : difficulty === "Medium" ? "🌊" : "✨"}
          </div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "0.75rem" }}>
            {difficulty === "Kids"
              ? "Colorful bubbles are floating up — pop them before they escape!"
              : difficulty === "Medium"
              ? "Pop bubbles fast! Avoid 💣 bombs — click them and lose points."
              : "Maximum bubble chaos! Bombs everywhere, tiny targets, blazing speed."}
          </p>
          <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", marginBottom: "1.1rem", flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>🫧 = <strong>+{cfg.normalPts} pts</strong></span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>⭐ = <strong>+{cfg.starPts} pts</strong></span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>❄ = <strong>freeze!</strong></span>
            {cfg.bombRatio > 0 && <span style={{ color: "#ef4444", fontSize: "0.82rem" }}>💣 = <strong>−{cfg.bombPenalty} pts</strong></span>}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
            Bubbles escape → lose a life · {cfg.lives} lives · Combos ×2/×3/×4
          </p>
          {highScore > 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1rem" }}>
              Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore} pts</strong>
            </div>
          )}
          <button className={styles.resetBtn} onClick={startGame}>Start!</button>
        </div>
      )}

      {/* ── PLAYING ─────────────────────────────────────────────────────── */}
      {phase === "playing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>

          {/* HUD */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", position: "relative", width: "100%", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>pts</div>
            </div>
            {/* Lives */}
            <div style={{ display: "flex", gap: "2px", fontSize: "1.15rem" }}>
              {heartsArr.map((_, i) => (
                <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>
              ))}
            </div>
            {frozen && (
              <div style={{ fontSize: "0.85rem", color: "#82d0f5", fontWeight: 700 }}>❄ FROZEN</div>
            )}
            {/* Combo pill */}
            {comboMul > 1 && (
              <div
                key={combo}
                style={{
                  position: "absolute", right: 0,
                  background: comboMul >= 4 ? "#ef4444" : comboMul >= 3 ? "#f59e0b" : "var(--accent-primary)",
                  color: "#fff", borderRadius: "var(--radius-sm)",
                  padding: "0.2rem 0.55rem",
                  fontWeight: 800, fontSize: "0.8rem",
                  animation: "bp-combo-pop 0.25s ease-out",
                  whiteSpace: "nowrap",
                }}
              >
                ×{comboMul} COMBO!
              </div>
            )}
          </div>

          {/* Game field */}
          <div
            ref={fieldRef}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 400,
              height: "clamp(320px, 58vw, 440px)",
              background: cfg.bgGradient,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              overflow: "hidden",
              touchAction: "none",
              userSelect: "none",
              animation: shaking ? "bp-screen-shake 0.42s ease-out" : undefined,
            }}
          >
            {/* Background decoration — Kids: clouds */}
            {difficulty === "Kids" && (
              <>
                <div style={{ position: "absolute", top: "12%", left: "5%",  width: 60, height: 24, background: "rgba(255,255,255,0.55)", borderRadius: 30, pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: "28%", right: "8%", width: 80, height: 28, background: "rgba(255,255,255,0.45)", borderRadius: 30, pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: "55%", left: "12%", width: 50, height: 20, background: "rgba(255,255,255,0.40)", borderRadius: 30, pointerEvents: "none" }} />
              </>
            )}
            {/* Background decoration — Medium/Hard: dots */}
            {difficulty !== "Kids" && [
              { t: "8%",  l: "15%", s: 3 }, { t: "22%", l: "72%", s: 2 },
              { t: "45%", l: "88%", s: 3 }, { t: "60%", l: "30%", s: 2 },
              { t: "78%", l: "58%", s: 3 }, { t: "35%", l: "48%", s: 2 },
            ].map((d, i) => (
              <div key={i} style={{ position: "absolute", top: d.t, left: d.l, width: d.s, height: d.s, borderRadius: "50%", background: "rgba(255,255,255,0.18)", pointerEvents: "none" }} />
            ))}

            {/* Frozen overlay */}
            {frozen && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(130,200,255,0.22)",
                border: "2px solid rgba(130,200,255,0.5)",
                pointerEvents: "none",
                zIndex: 3,
                animation: "bp-frost-pulse 0.8s ease-in-out infinite",
              }} />
            )}

            {/* Bomb shake red overlay */}
            {shaking && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(239,68,68,0.25)",
                pointerEvents: "none",
                zIndex: 4,
              }} />
            )}

            {/* Bubbles */}
            {bubbles.map(b => {
              const tick = tickNumRef.current;
              const xDisplay = b.x + b.driftAmp * Math.sin(b.driftPhase + tick * b.driftFreq);
              const xClamped = Math.max(3, Math.min(97, xDisplay));
              const dark = darken(b.color);
              const isPopping = b.state === "popping";
              const isEscaped = b.state === "escaped";

              return (
                <div
                  key={b.id}
                  onClick={() => handleBubbleClick(b.id)}
                  style={{
                    position: "absolute",
                    left: `${xClamped}%`,
                    top: `${b.y}%`,
                    width: b.size,
                    height: b.size,
                    borderRadius: "50%",
                    transform: "translateX(-50%) translateY(-50%)",
                    background: b.kind === "star"
                      ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7) 0%, hsl(48,100%,62%) 45%, hsl(38,100%,45%) 100%)`
                      : b.kind === "freeze"
                      ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.65) 0%, hsl(195,80%,65%) 45%, hsl(195,80%,45%) 100%)`
                      : b.kind === "bomb"
                      ? `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, hsl(0,0%,28%) 45%, hsl(0,0%,15%) 100%)`
                      : `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, ${b.color} 45%, ${dark} 100%)`,
                    boxShadow: b.kind === "star"
                      ? "inset 0 -4px 8px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.25), 0 0 14px 4px rgba(255,200,0,0.5)"
                      : "inset 0 -4px 8px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.25)",
                    cursor: b.state === "alive" ? "pointer" : "default",
                    pointerEvents: b.state === "alive" ? "auto" : "none",
                    transition: isPopping || isEscaped ? undefined : "left 48ms linear, top 48ms linear",
                    animation: isPopping
                      ? `bp-pop 0.38s ease-out forwards`
                      : isEscaped
                      ? `bp-escape 0.3s ease-in forwards`
                      : b.kind === "star"
                      ? "bp-star-rotate 1.6s linear infinite, bp-wobble-rise 2s ease-in-out infinite"
                      : "bp-wobble-rise 2.5s ease-in-out infinite",
                    zIndex: 2,
                  }}
                >
                  {/* Specular highlight dot */}
                  <div style={{
                    position: "absolute",
                    width: "28%", height: "28%",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.75)",
                    top: "12%", left: "18%",
                    pointerEvents: "none",
                  }} />
                  {/* Emoji for special kinds */}
                  {b.kind === "freeze" && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: b.size * 0.42, pointerEvents: "none", lineHeight: 1 }}>❄</div>
                  )}
                  {b.kind === "bomb" && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: b.size * 0.48, pointerEvents: "none", lineHeight: 1 }}>💣</div>
                  )}
                  {b.kind === "star" && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: b.size * 0.46, pointerEvents: "none", lineHeight: 1 }}>⭐</div>
                  )}
                </div>
              );
            })}

            {/* Burst rings */}
            {rings.map(r => (
              <div
                key={r.id}
                style={{
                  position: "absolute",
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  width: r.size,
                  height: r.size,
                  borderRadius: "50%",
                  border: `3px solid ${r.color}`,
                  transform: "translateX(-50%) translateY(-50%)",
                  pointerEvents: "none",
                  animation: "bp-ring 0.42s ease-out forwards",
                  zIndex: 3,
                }}
              />
            ))}

            {/* Score popups */}
            {popups.map(p => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: "translateX(-50%)",
                  color: p.positive ? "#22c55e" : "#ef4444",
                  fontWeight: 800,
                  fontSize: "1rem",
                  pointerEvents: "none",
                  animation: "bp-score-float 0.95s ease-out forwards",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                }}
              >
                {p.label}
              </div>
            ))}
          </div>

          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textAlign: "center" }}>
            Click or tap bubbles to pop them · ❄ freeze slows all bubbles
            {cfg.bombRatio > 0 ? " · Avoid 💣!" : ""}
          </div>
        </div>
      )}

      {/* ── OVER ────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
            {lives <= 0 ? "💔" : isNewHigh ? "🏆" : "🎉"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
            {lives <= 0 ? "Out of lives!" : isNewHigh ? "New high score!" : "Well played!"}
          </div>
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1, marginBottom: "0.2rem" }}>
            {score}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            points
            {!isNewHigh && highScore > 0 && (
              <span> · Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore}</strong></span>
            )}
          </div>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
