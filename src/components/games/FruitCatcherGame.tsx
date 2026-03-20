"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── CSS animations ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes fc-fall-hit {
  0%   { transform: translateX(-50%) scale(1);   opacity: 1; filter: brightness(1); }
  30%  { transform: translateX(-50%) scale(1.7); opacity: 1; filter: brightness(3); }
  100% { transform: translateX(-50%) scale(0);   opacity: 0; filter: brightness(1); }
}
@keyframes fc-fall-miss {
  0%   { opacity: 1; }
  100% { opacity: 0; transform: translateY(20px); }
}
@keyframes fc-basket-wobble {
  0%   { transform: translateX(-50%) scaleY(1);   }
  30%  { transform: translateX(-50%) scaleY(0.55); }
  60%  { transform: translateX(-50%) scaleY(1.2);  }
  100% { transform: translateX(-50%) scaleY(1);   }
}
@keyframes fc-score-float {
  0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-55px); }
}
@keyframes fc-screen-shake {
  0%,100% { transform: translate(0,0); }
  20%     { transform: translate(-5px, 2px); }
  40%     { transform: translate(5px, -2px); }
  60%     { transform: translate(-3px, 3px); }
  80%     { transform: translate(3px, -3px); }
}
@keyframes fc-combo-pop {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes fc-life-pop {
  0%   { transform: scale(1);   }
  40%  { transform: scale(1.6); }
  100% { transform: scale(1);   }
}
@keyframes fc-bonus-glow {
  0%,100% { filter: drop-shadow(0 0 4px gold); }
  50%      { filter: drop-shadow(0 0 14px gold); }
}
`;

// ── Types ──────────────────────────────────────────────────────────────────────
type Difficulty = "Kids" | "Medium" | "Hard";
type Phase = "idle" | "playing" | "over";
type ItemKind = "fruit" | "bonus" | "bomb" | "rotten";

interface FallingItem {
  id: number;
  emoji: string;
  kind: ItemKind;
  x: number;       // percent, horizontal center
  top: number;     // percent, top edge
  speed: number;   // percent per tick (50 ms)
  caught: boolean;
  missed: boolean;
}

interface ScorePopup {
  id: number;
  x: number;       // percent horizontal
  y: number;       // percent vertical (approx catch position)
  label: string;
  positive: boolean;
}

interface DiffConfig {
  spawnIntervalMs: number;
  maxSimultaneous: number;
  bombRatio: number;
  rottenRatio: number;
  bonusRatio: number;
  baseFallSpeed: number;   // % per tick (50 ms)
  liveCount: number;
  missPenalty: number;
  basketStepPct: number;
  normalPts: number;
  bonusPts: number;
  bombPenalty: number;
  rottenPenalty: number;
  bgGradient: string;
  groundColor: string;
}

// ── Configs ────────────────────────────────────────────────────────────────────
const CONFIGS: Record<Difficulty, DiffConfig> = {
  Kids: {
    spawnIntervalMs: 1800,
    maxSimultaneous: 2,
    bombRatio: 0,
    rottenRatio: 0,
    bonusRatio: 0.08,
    baseFallSpeed: 1.4,
    liveCount: 5,
    missPenalty: 0,
    basketStepPct: 10,
    normalPts: 10,
    bonusPts: 25,
    bombPenalty: 0,
    rottenPenalty: 0,
    bgGradient: "linear-gradient(180deg, #87ceeb 0%, #b8f0a0 100%)",
    groundColor: "#5a8a3a",
  },
  Medium: {
    spawnIntervalMs: 1100,
    maxSimultaneous: 3,
    bombRatio: 0.15,
    rottenRatio: 0.10,
    bonusRatio: 0.10,
    baseFallSpeed: 2.0,
    liveCount: 3,
    missPenalty: 0,
    basketStepPct: 8,
    normalPts: 15,
    bonusPts: 35,
    bombPenalty: 20,
    rottenPenalty: 10,
    bgGradient: "linear-gradient(180deg, #ff7e5f 0%, #feb47b 60%, #b8f0a0 100%)",
    groundColor: "#4a7a2a",
  },
  Hard: {
    spawnIntervalMs: 650,
    maxSimultaneous: 5,
    bombRatio: 0.22,
    rottenRatio: 0.15,
    bonusRatio: 0.08,
    baseFallSpeed: 2.8,
    liveCount: 3,
    missPenalty: 2,
    basketStepPct: 8,
    normalPts: 20,
    bonusPts: 50,
    bombPenalty: 30,
    rottenPenalty: 15,
    bgGradient: "linear-gradient(180deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
    groundColor: "#0f3460",
  },
};

const FRUITS  = ["🍎","🍊","🍋","🍇","🍓","🍑","🍍","🥝","🍒","🫐","🍌","🍉"];
const BONUS   = ["⭐","🌟","💎"];
const BOMBS   = ["💣","🧨"];
const ROTTEN  = ["🤢","🦠","💀"];

// ── Module-level helpers ───────────────────────────────────────────────────────
function pickItem(cfg: DiffConfig): { emoji: string; kind: ItemKind } {
  const r = Math.random();
  if (r < cfg.bombRatio)                         return { emoji: BOMBS[Math.floor(Math.random() * BOMBS.length)],   kind: "bomb"   };
  if (r < cfg.bombRatio + cfg.rottenRatio)        return { emoji: ROTTEN[Math.floor(Math.random() * ROTTEN.length)], kind: "rotten" };
  if (r < cfg.bombRatio + cfg.rottenRatio + cfg.bonusRatio) return { emoji: BONUS[Math.floor(Math.random() * BONUS.length)],   kind: "bonus"  };
  return { emoji: FRUITS[Math.floor(Math.random() * FRUITS.length)], kind: "fruit" };
}

function effectiveSpeed(base: number, elapsed: number): number {
  return base * (1 + Math.min(elapsed / 60, 1) * 0.5);
}

function effectiveSpawnMs(base: number, elapsed: number): number {
  return Math.max(base * (1 - Math.min(elapsed / 60, 1) * 0.4), 380);
}

function effectiveMaxSim(base: number, elapsed: number): number {
  return base + (elapsed >= 20 ? 1 : 0) + (elapsed >= 40 ? 1 : 0);
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function FruitCatcherGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Kids");
  const [phase, setPhase]           = useState<Phase>("idle");
  const [items, setItems]           = useState<FallingItem[]>([]);
  const [score, setScore]           = useState(0);
  const [lives, setLives]           = useState(3);
  const [timeLeft, setTimeLeft]     = useState(60);
  const [combo, setCombo]           = useState(0);
  const [highScore, setHighScore]   = useState(0);
  const [basketX, setBasketX]       = useState(50);
  const [shaking, setShaking]       = useState(false);
  const [popups, setPopups]         = useState<ScorePopup[]>([]);
  const [catchKey, setCatchKey]     = useState(0); // forces basket wobble remount

  // Refs — mutable, read inside closures without stale issues
  const itemsRef      = useRef<FallingItem[]>([]);
  const basketXRef    = useRef(50);
  const livesRef      = useRef(3);
  const comboRef      = useRef(0);
  const elapsedRef    = useRef(0);
  const difficultyRef = useRef<Difficulty>("Kids");
  const phaseRef      = useRef<Phase>("idle");
  const spawnTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef     = useRef(0);
  const popupIdRef    = useRef(0);
  const dragStartX    = useRef<number | null>(null);
  const fieldRef      = useRef<HTMLDivElement>(null);

  // Keep difficulty ref in sync
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // ── updateItems — ref + state synced atomically ───────────────────────────
  const updateItems = useCallback((updater: (prev: FallingItem[]) => FallingItem[]) => {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    setItems([...next]);
  }, []);

  // ── Spawn + tick loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    // Move tick: runs every 50 ms
    function moveTick() {
      const cfg = CONFIGS[difficultyRef.current];
      const elapsed = elapsedRef.current;
      const speed = effectiveSpeed(cfg.baseFallSpeed, elapsed);

      // Basket collision zone: items are "caught" when top is between 76–84%
      const CATCH_TOP = 76;
      const CATCH_BOT = 86;
      const BASKET_HALF = 10; // % half-width of basket
      const ITEM_HALF   = 5;  // % half-width of item

      const newPopups: ScorePopup[] = [];
      let liveLost = false;
      let comboChanged = false;

      const next = itemsRef.current
        .map(item => {
          if (item.caught || item.missed) return item;
          const newTop = item.top + speed;

          // Check catch zone
          if (newTop >= CATCH_TOP && newTop <= CATCH_BOT) {
            const bx = basketXRef.current;
            const il = item.x - ITEM_HALF;
            const ir = item.x + ITEM_HALF;
            const bl = bx - BASKET_HALF;
            const br = bx + BASKET_HALF;
            if (ir >= bl && il <= br) {
              // Caught!
              let pts = 0;
              let label = "";
              if (item.kind === "bomb") {
                pts = -cfg.bombPenalty;
                label = cfg.bombPenalty > 0 ? `−${cfg.bombPenalty}` : "💥";
                livesRef.current = Math.max(0, livesRef.current - 1);
                setLives(livesRef.current);
                liveLost = true;
                comboRef.current = 0;
                setCombo(0);
                comboChanged = true;
              } else if (item.kind === "rotten") {
                pts = -cfg.rottenPenalty;
                label = cfg.rottenPenalty > 0 ? `−${cfg.rottenPenalty}` : "🤢";
                comboRef.current = 0;
                setCombo(0);
                comboChanged = true;
              } else {
                comboRef.current += 1;
                setCombo(comboRef.current);
                comboChanged = true;
                const mul = comboRef.current >= 10 ? 4 : comboRef.current >= 6 ? 3 : comboRef.current >= 3 ? 2 : 1;
                const base = item.kind === "bonus" ? cfg.bonusPts : cfg.normalPts;
                pts = base * mul;
                label = mul > 1 ? `+${pts} ×${mul}!` : `+${pts}`;
              }
              if (pts !== 0) setScore(s => Math.max(0, s + pts));
              const pid = popupIdRef.current++;
              newPopups.push({ id: pid, x: item.x, y: CATCH_TOP, label, positive: pts >= 0 });
              setTimeout(() => setPopups(p => p.filter(x => x.id !== pid)), 950);
              setCatchKey(k => k + 1);
              return { ...item, top: newTop, caught: true };
            }
          }

          // Missed ground
          if (newTop > 100) {
            if (item.kind === "fruit" || item.kind === "bonus") {
              if (cfg.missPenalty > 0) setScore(s => Math.max(0, s - cfg.missPenalty));
              if (!comboChanged) { comboRef.current = 0; setCombo(0); }
            }
            return { ...item, top: newTop, missed: true };
          }

          return { ...item, top: newTop };
        })
        // Remove items that finished their exit animation
        .filter(item => !(item.missed && item.top > 108));

      itemsRef.current = next;
      setItems([...next]);

      if (newPopups.length > 0) setPopups(p => [...p, ...newPopups]);
      if (liveLost) {
        setShaking(true);
        setTimeout(() => setShaking(false), 420);
        if (livesRef.current <= 0) {
          phaseRef.current = "over";
          setPhase("over");
          setHighScore(prev => Math.max(prev, score));
          return; // don't reschedule
        }
      }

      tickTimer.current = setTimeout(moveTick, 50);
    }

    // Spawn loop
    function spawnTick() {
      const cfg = CONFIGS[difficultyRef.current];
      const elapsed = elapsedRef.current;
      const activeCount = itemsRef.current.filter(i => !i.caught && !i.missed).length;
      const maxSim = effectiveMaxSim(cfg.maxSimultaneous, elapsed);

      if (activeCount < maxSim) {
        const { emoji, kind } = pickItem(cfg);
        const newItem: FallingItem = {
          id: nextIdRef.current++,
          emoji, kind,
          x: 8 + Math.random() * 84, // keep away from edges
          top: -8,
          speed: effectiveSpeed(cfg.baseFallSpeed, elapsed),
          caught: false,
          missed: false,
        };
        updateItems(prev => [...prev, newItem]);
      }

      spawnTimer.current = setTimeout(spawnTick, effectiveSpawnMs(cfg.spawnIntervalMs, elapsed));
    }

    tickTimer.current = setTimeout(moveTick, 50);
    spawnTimer.current = setTimeout(spawnTick, 600);

    return () => {
      if (tickTimer.current) clearTimeout(tickTimer.current);
      if (spawnTimer.current) clearTimeout(spawnTimer.current);
    };
  }, [phase, difficulty, updateItems, score]);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      setPhase("over");
      setHighScore(prev => Math.max(prev, score));
      return;
    }
    const t = setTimeout(() => {
      setTimeLeft(tl => tl - 1);
      elapsedRef.current += 1;
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, score]);

  // ── Keyboard input ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const cfg = CONFIGS[difficulty];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        basketXRef.current = Math.max(8, basketXRef.current - cfg.basketStepPct);
        setBasketX(basketXRef.current);
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        basketXRef.current = Math.min(92, basketXRef.current + cfg.basketStepPct);
        setBasketX(basketXRef.current);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, difficulty]);

  // ── Game controls ─────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    if (tickTimer.current) clearTimeout(tickTimer.current);
    const cfg = CONFIGS[difficultyRef.current];
    itemsRef.current = [];
    elapsedRef.current = 0;
    comboRef.current = 0;
    livesRef.current = cfg.liveCount;
    basketXRef.current = 50;
    phaseRef.current = "playing";
    setItems([]);
    setScore(0);
    setLives(cfg.liveCount);
    setTimeLeft(60);
    setCombo(0);
    setBasketX(50);
    setPopups([]);
    setShaking(false);
    setPhase("playing");
  }, []);

  const resetGame = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    if (tickTimer.current) clearTimeout(tickTimer.current);
    itemsRef.current = [];
    phaseRef.current = "idle";
    setItems([]);
    setScore(0);
    setTimeLeft(60);
    setCombo(0);
    setPopups([]);
    setPhase("idle");
  }, []);

  // ── Pointer drag (touch + mouse) ──────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null || phase !== "playing") return;
    const fieldWidth = fieldRef.current?.offsetWidth ?? 400;
    const deltaPct = ((e.clientX - dragStartX.current) / fieldWidth) * 100;
    dragStartX.current = e.clientX;
    basketXRef.current = Math.max(8, Math.min(92, basketXRef.current + deltaPct));
    setBasketX(basketXRef.current);
  };
  const onPointerEnd = () => { dragStartX.current = null; };

  // ── Derived ───────────────────────────────────────────────────────────────
  const cfg         = CONFIGS[difficulty];
  const comboMul    = combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1;
  const timerColor  = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "var(--text-primary)";
  const isNewHigh   = phase === "over" && score > 0 && score >= highScore;
  const heartsArr   = Array.from({ length: cfg.liveCount });

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
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🧺</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "0.75rem" }}>
            {difficulty === "Kids"
              ? "Catch all the yummy fruits in your basket! Use arrow keys or drag."
              : difficulty === "Medium"
              ? "Catch fruits, dodge bombs 💣 and rotten items 🤢 — watch your lives!"
              : "High speed chaos! Fruits fall fast — one wrong catch costs dearly."}
          </p>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>🍎 = <strong>+{cfg.normalPts} pts</strong></span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>⭐ = <strong>+{cfg.bonusPts} pts</strong></span>
            {cfg.bombRatio > 0 && <span style={{ color: "#ef4444", fontSize: "0.82rem" }}>💣 = <strong>−{cfg.bombPenalty} pts + life</strong></span>}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
            ← → arrows, WASD, or drag to move · {cfg.liveCount} lives
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
              <div style={{ fontSize: "2.1rem", fontWeight: 800, color: timerColor, fontFamily: "monospace", lineHeight: 1 }}>
                {String(timeLeft).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>sec</div>
            </div>
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
            {/* Combo pill */}
            {comboMul > 1 && (
              <div style={{
                position: "absolute", right: 0,
                background: comboMul >= 4 ? "#ef4444" : comboMul >= 3 ? "#f59e0b" : "var(--accent-primary)",
                color: "#fff", borderRadius: "var(--radius-sm)",
                padding: "0.2rem 0.55rem",
                fontWeight: 800, fontSize: "0.8rem",
                animation: "fc-combo-pop 0.25s ease-out",
                whiteSpace: "nowrap",
              }}>
                ×{comboMul} COMBO!
              </div>
            )}
          </div>

          {/* Game field */}
          <div
            ref={fieldRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerLeave={onPointerEnd}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 400,
              height: "clamp(300px, 55vw, 420px)",
              background: cfg.bgGradient,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              overflow: "hidden",
              touchAction: "none",
              userSelect: "none",
              animation: shaking ? "fc-screen-shake 0.42s ease-out" : undefined,
              cursor: "none",
            }}
          >
            {/* Ground stripe */}
            <div style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              height: "14%",
              background: cfg.groundColor,
              borderTop: "2px solid rgba(0,0,0,0.2)",
            }} />

            {/* Red flash on bomb hit */}
            {shaking && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(239,68,68,0.25)",
                pointerEvents: "none",
                zIndex: 5,
              }} />
            )}

            {/* Falling items */}
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: `${item.x}%`,
                  top: `${item.top}%`,
                  transform: "translateX(-50%)",
                  fontSize: "clamp(1.6rem, 5vw, 2.1rem)",
                  lineHeight: 1,
                  pointerEvents: "none",
                  transition: item.caught || item.missed ? undefined : "top 48ms linear",
                  animation: item.caught
                    ? "fc-fall-hit 0.35s ease-out forwards"
                    : item.missed
                    ? "fc-fall-miss 0.4s ease-out forwards"
                    : item.kind === "bonus"
                    ? "fc-bonus-glow 0.8s ease-in-out infinite"
                    : undefined,
                }}
              >
                {item.emoji}
              </div>
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
                  animation: "fc-score-float 0.95s ease-out forwards",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                }}
              >
                {p.label}
              </div>
            ))}

            {/* Basket */}
            <div
              key={catchKey}
              style={{
                position: "absolute",
                bottom: "12%",
                left: `${basketX}%`,
                transform: "translateX(-50%)",
                fontSize: "clamp(2rem, 7vw, 2.8rem)",
                lineHeight: 1,
                pointerEvents: "none",
                transition: "left 60ms linear",
                animation: catchKey > 0 ? "fc-basket-wobble 0.3s ease-out" : undefined,
                zIndex: 4,
                filter: comboMul >= 3 ? "drop-shadow(0 0 8px gold)" : undefined,
              }}
            >
              🧺
            </div>
          </div>

          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textAlign: "center" }}>
            ← → arrows, WASD, or drag to move the basket
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
            {lives <= 0 ? "Out of lives!" : isNewHigh ? "New high score!" : "Time's up!"}
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
