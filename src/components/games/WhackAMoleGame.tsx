"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── CSS animations ────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes wam-popup {
  0%   { transform: translateX(-50%) translateY(115%); opacity: 0; }
  15%  { transform: translateX(-50%) translateY(-10%); opacity: 1; }
  80%  { transform: translateX(-50%) translateY(-10%); opacity: 1; }
  100% { transform: translateX(-50%) translateY(115%); opacity: 0; }
}
@keyframes wam-whack {
  0%   { transform: translateX(-50%) translateY(-10%) scale(1);   filter: brightness(1); }
  25%  { transform: translateX(-50%) translateY(-35%) scale(1.5); filter: brightness(3); }
  100% { transform: translateX(-50%) translateY(115%) scale(0.2); filter: brightness(1); opacity: 0; }
}
@keyframes wam-float {
  0%   { transform: translateX(-50%) translateY(0);     opacity: 1; }
  100% { transform: translateX(-50%) translateY(-65px); opacity: 0; }
}
@keyframes wam-crater-shake {
  0%,100% { transform: rotate(0deg) translate(0,0); }
  20%     { transform: rotate(-3deg) translate(-5px, 0); }
  40%     { transform: rotate(3deg)  translate(5px, 0); }
  60%     { transform: rotate(-2deg) translate(-3px, 0); }
  80%     { transform: rotate(2deg)  translate(3px, 0); }
}
@keyframes wam-screen-shake {
  0%,100% { transform: translate(0, 0); }
  20%     { transform: translate(-4px, 2px); }
  40%     { transform: translate(4px, -2px); }
  60%     { transform: translate(-2px, 3px); }
  80%     { transform: translate(2px, -3px); }
}
@keyframes wam-combo-pop {
  0%   { transform: translateX(-50%) scale(0.4); opacity: 0; }
  60%  { transform: translateX(-50%) scale(1.2); opacity: 1; }
  100% { transform: translateX(-50%) scale(1);   opacity: 1; }
}
@keyframes wam-bonus-pulse {
  0%, 100% { box-shadow: 0 6px 0 #000, inset 0 -4px 8px rgba(0,0,0,0.5), 0 0 12px 4px gold; }
  50%      { box-shadow: 0 6px 0 #000, inset 0 -4px 8px rgba(0,0,0,0.5), 0 0 28px 10px gold; }
}
`;

// ── Types ─────────────────────────────────────────────────────────────────────
type Difficulty = "Kids" | "Medium" | "Hard";
type Phase = "idle" | "playing" | "over";
type CharKind = "normal" | "bonus" | "decoy";

interface HoleState {
  id: number;
  active: boolean;
  kind: CharKind;
  whacked: boolean;
  missed: boolean;
  spawnCount: number; // increments each spawn to force React to remount the char element
  popMs: number;      // visibility window in ms (drives animation duration)
}

interface ScorePopup {
  id: number;
  holeId: number;
  label: string;
  positive: boolean;
}

interface DiffConfig {
  minPopMs: number;
  maxPopMs: number;
  spawnIntervalMs: number;
  maxSimultaneous: number;
  decoyChance: number;
  bonusChance: number;
  normalPts: number;
  bonusPts: number;
  decoyPenalty: number;
  missPenalty: number;
  normalEmojis: string[];
  bonusEmoji: string;
  decoyEmoji: string;
  craterBg: string;
  groundBg: string;
}

// ── Configs ───────────────────────────────────────────────────────────────────
const CONFIGS: Record<Difficulty, DiffConfig> = {
  Kids: {
    minPopMs: 1800, maxPopMs: 2600,
    spawnIntervalMs: 2000,
    maxSimultaneous: 1,
    decoyChance: 0, bonusChance: 0.08,
    normalPts: 10, bonusPts: 25, decoyPenalty: 0, missPenalty: 0,
    normalEmojis: ["🐰","🐸","🐹","🦊","🐼","🐨","🐭","🦝"],
    bonusEmoji: "⭐",
    decoyEmoji: "",
    craterBg: "radial-gradient(ellipse at 50% 60%, #3a2a10 0%, #1e1408 100%)",
    groundBg: "radial-gradient(ellipse at top, #1e3d12 0%, #0e200a 100%)",
  },
  Medium: {
    minPopMs: 1100, maxPopMs: 1700,
    spawnIntervalMs: 1350,
    maxSimultaneous: 2,
    decoyChance: 0.14, bonusChance: 0.10,
    normalPts: 15, bonusPts: 35, decoyPenalty: 10, missPenalty: 0,
    normalEmojis: ["👽"],
    bonusEmoji: "🛸",
    decoyEmoji: "🤖",
    craterBg: "radial-gradient(ellipse at 50% 60%, #1a0a2e 0%, #0a0514 100%)",
    groundBg: "radial-gradient(ellipse at top, #0d0d2e 0%, #050510 100%)",
  },
  Hard: {
    minPopMs: 580, maxPopMs: 920,
    spawnIntervalMs: 820,
    maxSimultaneous: 3,
    decoyChance: 0.24, bonusChance: 0.12,
    normalPts: 20, bonusPts: 50, decoyPenalty: 20, missPenalty: 2,
    normalEmojis: ["👾"],
    bonusEmoji: "☄️",
    decoyEmoji: "👮",
    craterBg: "radial-gradient(ellipse at 50% 60%, #1a0a2e 0%, #0a0514 100%)",
    groundBg: "radial-gradient(ellipse at top, #0d0d2e 0%, #050510 100%)",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeHoles(): HoleState[] {
  return Array.from({ length: 9 }, (_, i) => ({
    id: i, active: false, kind: "normal" as CharKind,
    whacked: false, missed: false, spawnCount: 0, popMs: 2000,
  }));
}

function pickKind(cfg: DiffConfig): CharKind {
  const r = Math.random();
  if (r < cfg.bonusChance) return "bonus";
  if (r < cfg.bonusChance + cfg.decoyChance) return "decoy";
  return "normal";
}

function getEmoji(hole: HoleState, cfg: DiffConfig): string {
  if (hole.kind === "bonus") return cfg.bonusEmoji;
  if (hole.kind === "decoy") return cfg.decoyEmoji;
  return cfg.normalEmojis[hole.id % cfg.normalEmojis.length];
}

function spawnInterval(base: number, elapsed: number): number {
  return Math.max(base * (1 - Math.min(elapsed / 60, 1) * 0.42), 340);
}

function popDuration(min: number, max: number, elapsed: number, kind: CharKind): number {
  const shrink = 1 - Math.min(elapsed / 60, 1) * 0.38;
  const bonus  = kind === "bonus" ? 0.6 : 1;
  return Math.max((min + Math.random() * (max - min)) * shrink * bonus, 420);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WhackAMoleGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Kids");
  const [phase, setPhase]           = useState<Phase>("idle");
  const [holes, setHoles]           = useState<HoleState[]>(makeHoles());
  const [score, setScore]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(60);
  const [popups, setPopups]         = useState<ScorePopup[]>([]);
  const [combo, setCombo]           = useState(0);
  const [highScore, setHighScore]   = useState(0);
  const [shaking, setShaking]       = useState(false);

  // ── Refs (mutable, don't trigger renders) ────────────────────────────────
  const holesRef      = useRef<HoleState[]>(makeHoles());
  const holeTimers    = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const spawnTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupIdRef    = useRef(0);
  const elapsedRef    = useRef(0);
  const comboRef      = useRef(0);
  const difficultyRef = useRef<Difficulty>("Kids");

  // keep refs in sync with state
  useEffect(() => { comboRef.current = combo; },         [combo]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // ── updateHoles — single source of truth ────────────────────────────────
  const updateHoles = useCallback((updater: (h: HoleState[]) => HoleState[]) => {
    const next = updater(holesRef.current);
    holesRef.current = next;
    setHoles([...next]);
  }, []);

  // ── Spawn loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    function hideHole(id: number) {
      const c = CONFIGS[difficultyRef.current];
      updateHoles(prev => prev.map(h =>
        h.id === id && h.active && !h.whacked
          ? { ...h, active: false, missed: true }
          : h
      ));
      if (c.missPenalty > 0) setScore(s => Math.max(0, s - c.missPenalty));
      setCombo(0);
      comboRef.current = 0;
      setTimeout(() => {
        updateHoles(prev => prev.map(h => h.id === id ? { ...h, missed: false } : h));
      }, 520);
    }

    function spawnTick() {
      const c    = CONFIGS[difficultyRef.current];
      const now  = elapsedRef.current;
      const inactive    = holesRef.current.filter(h => !h.active && !h.whacked);
      const activeCount = holesRef.current.filter(h => h.active).length;
      // allow +1 simultaneous after 25s
      const maxSim = c.maxSimultaneous + (now >= 25 ? 1 : 0);

      if (inactive.length > 0 && activeCount < maxSim) {
        const target  = inactive[Math.floor(Math.random() * inactive.length)];
        const kind    = pickKind(c);
        const popMs   = popDuration(c.minPopMs, c.maxPopMs, now, kind);

        updateHoles(prev => prev.map(h =>
          h.id === target.id
            ? { ...h, active: true, kind, whacked: false, missed: false,
                spawnCount: h.spawnCount + 1, popMs }
            : h
        ));

        holeTimers.current[target.id] = setTimeout(() => hideHole(target.id), popMs);
      }

      spawnTimer.current = setTimeout(spawnTick, spawnInterval(c.spawnIntervalMs, elapsedRef.current));
    }

    spawnTimer.current = setTimeout(spawnTick, 700);

    return () => {
      if (spawnTimer.current) clearTimeout(spawnTimer.current);
      Object.values(holeTimers.current).forEach(clearTimeout);
      holeTimers.current = {};
    };
  }, [phase, difficulty, updateHoles]);

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

  // ── Whack handler ─────────────────────────────────────────────────────────
  const handleWhack = useCallback((id: number) => {
    const hole = holesRef.current.find(h => h.id === id);
    if (!hole?.active || hole.whacked) return;

    if (holeTimers.current[id]) {
      clearTimeout(holeTimers.current[id]);
      delete holeTimers.current[id];
    }

    const cfg  = CONFIGS[difficultyRef.current];
    let pts    = 0;
    let label  = "";
    let newCombo = comboRef.current;

    if (hole.kind === "decoy") {
      pts = -cfg.decoyPenalty;
      label = `${pts}`;
      newCombo = 0;
      setCombo(0);
      comboRef.current = 0;
    } else {
      newCombo += 1;
      comboRef.current = newCombo;
      setCombo(newCombo);
      const mul  = newCombo >= 9 ? 4 : newCombo >= 6 ? 3 : newCombo >= 3 ? 2 : 1;
      const base = hole.kind === "bonus" ? cfg.bonusPts : cfg.normalPts;
      pts   = base * mul;
      label = mul > 1 ? `+${pts} ×${mul}!` : `+${pts}`;
    }

    setScore(s => Math.max(0, s + pts));

    // floating score popup
    const pid = popupIdRef.current++;
    setPopups(p => [...p, { id: pid, holeId: id, label, positive: pts > 0 }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id !== pid)), 950);

    // screen shake on bonus
    if (hole.kind === "bonus") {
      setShaking(true);
      setTimeout(() => setShaking(false), 380);
    }

    // whack animation then clear
    updateHoles(prev => prev.map(h =>
      h.id === id ? { ...h, whacked: true } : h
    ));
    setTimeout(() => {
      updateHoles(prev => prev.map(h =>
        h.id === id ? { ...h, active: false, whacked: false } : h
      ));
    }, 400);
  }, [updateHoles]);

  // ── Game controls ─────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    Object.values(holeTimers.current).forEach(clearTimeout);
    holeTimers.current = {};
    const fresh = makeHoles();
    holesRef.current = fresh;
    elapsedRef.current = 0;
    comboRef.current = 0;
    setHoles(fresh);
    setScore(0);
    setTimeLeft(60);
    setCombo(0);
    setPopups([]);
    setShaking(false);
    setPhase("playing");
  }, []);

  const resetGame = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    Object.values(holeTimers.current).forEach(clearTimeout);
    holeTimers.current = {};
    const fresh = makeHoles();
    holesRef.current = fresh;
    elapsedRef.current = 0;
    comboRef.current = 0;
    setHoles(fresh);
    setScore(0);
    setTimeLeft(60);
    setCombo(0);
    setPopups([]);
    setPhase("idle");
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const cfg            = CONFIGS[difficulty];
  const comboMul       = combo >= 9 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1;
  const timerColor     = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "var(--text-primary)";
  const isNewHighScore = phase === "over" && score >= highScore && highScore > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Difficulty:</span>
        {(["Kids","Medium","Hard"] as Difficulty[]).map(d => (
          <button
            key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => { setDifficulty(d); resetGame(); }}
          >{d}</button>
        ))}
      </div>

      {/* ── IDLE ──────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
            {difficulty === "Kids" ? "🐰" : difficulty === "Medium" ? "👽" : "👾"}
          </div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "0.75rem" }}>
            {difficulty === "Kids"
              ? "Cute animals are hiding in holes — tap them before they disappear!"
              : difficulty === "Medium"
              ? "Aliens are invading! Whack the 👽 — but avoid the 🤖 or lose points!"
              : "Maximum invasion! Hit 👾 as fast as you can — avoid the 👮 decoys!"}
          </p>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
              {cfg.normalEmojis[0]} = <strong>+{cfg.normalPts} pts</strong>
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
              {cfg.bonusEmoji} = <strong>+{cfg.bonusPts} pts</strong>
            </span>
            {cfg.decoyEmoji && (
              <span style={{ color: "#ef4444", fontSize: "0.82rem" }}>
                {cfg.decoyEmoji} = <strong>−{cfg.decoyPenalty} pts</strong>
              </span>
            )}
          </div>
          {highScore > 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1rem" }}>
              Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore} pts</strong>
            </div>
          )}
          <button className={styles.resetBtn} onClick={startGame}>Start!</button>
        </div>
      )}

      {/* ── PLAYING ───────────────────────────────────────────────────────── */}
      {phase === "playing" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
          animation: shaking ? "wam-screen-shake 0.38s ease-out" : undefined,
        }}>

          {/* HUD */}
          <div style={{ display: "flex", gap: "2rem", alignItems: "center", position: "relative", width: "100%", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: timerColor, fontFamily: "monospace", lineHeight: 1 }}>
                {String(timeLeft).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>sec</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>pts</div>
            </div>
            {/* Combo pill */}
            {comboMul > 1 && (
              <div style={{
                position: "absolute", right: 0, top: "50%",
                transform: "translateY(-50%)",
                background: comboMul >= 4 ? "#ef4444" : comboMul >= 3 ? "#f59e0b" : "var(--accent-primary)",
                color: "#fff", borderRadius: "var(--radius-sm)",
                padding: "0.25rem 0.6rem",
                fontWeight: 800, fontSize: "0.85rem",
                animation: "wam-combo-pop 0.25s ease-out",
                whiteSpace: "nowrap",
              }}>
                ×{comboMul} COMBO!
              </div>
            )}
          </div>

          {/* Game grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(0.5rem, 2vw, 0.9rem)",
            width: "100%", maxWidth: 390,
            background: cfg.groundBg,
            borderRadius: "var(--radius-md)",
            padding: "1.1rem",
            border: "1px solid var(--border-color)",
          }}>
            {holes.map(hole => {
              const isBonus = hole.active && hole.kind === "bonus";
              const isDecoy = hole.active && hole.kind === "decoy";
              const showChar = hole.active || hole.whacked;

              return (
                // Outer wrapper: square + relative for popup positioning
                <div key={hole.id} style={{ position: "relative", paddingBottom: "100%" }}>

                  {/* Crater circle — overflow:hidden clips the character */}
                  <div
                    onClick={() => handleWhack(hole.id)}
                    style={{
                      position: "absolute", inset: 0,
                      borderRadius: "50%",
                      background: cfg.craterBg,
                      boxShadow: isBonus
                        ? "0 5px 0 #000, inset 0 -4px 10px rgba(0,0,0,0.6)"
                        : isDecoy
                        ? "0 5px 0 #000, inset 0 -4px 10px rgba(0,0,0,0.6), 0 0 14px 5px rgba(239,68,68,0.7)"
                        : "0 5px 0 #000, inset 0 -4px 10px rgba(0,0,0,0.6)",
                      animation: isBonus
                        ? "wam-bonus-pulse 0.9s ease-in-out infinite"
                        : hole.missed
                        ? "wam-crater-shake 0.45s ease-out"
                        : undefined,
                      cursor: showChar && !hole.whacked ? "pointer" : "default",
                      userSelect: "none",
                      overflow: "hidden",
                      transition: "box-shadow 0.12s",
                    }}
                  >
                    {/* Character */}
                    {showChar && (
                      <div
                        key={`c-${hole.id}-${hole.spawnCount}`}
                        style={{
                          position: "absolute",
                          bottom: "12%", left: "50%",
                          fontSize: "clamp(1.7rem, 6vw, 2.4rem)",
                          lineHeight: 1,
                          pointerEvents: "none",
                          animation: hole.whacked
                            ? "wam-whack 0.4s ease-out forwards"
                            : `wam-popup ${hole.popMs}ms ease-in-out forwards`,
                          filter: isBonus
                            ? "drop-shadow(0 0 6px gold)"
                            : isDecoy
                            ? "drop-shadow(0 0 5px #ef4444)"
                            : undefined,
                        }}
                      >
                        {getEmoji(hole, cfg)}
                      </div>
                    )}

                    {/* "miss!" text inside crater */}
                    {hole.missed && (
                      <div style={{
                        position: "absolute",
                        bottom: "35%", left: "50%",
                        color: "#ef4444", fontWeight: 800, fontSize: "0.65rem",
                        animation: "wam-float 0.5s ease-out forwards",
                        pointerEvents: "none", whiteSpace: "nowrap",
                      }}>
                        miss!
                      </div>
                    )}
                  </div>

                  {/* Score popups — OUTSIDE overflow:hidden so they float above the crater */}
                  {popups.filter(p => p.holeId === hole.id).map(p => (
                    <div key={p.id} style={{
                      position: "absolute",
                      bottom: "90%", left: "50%",
                      color: p.positive ? "#22c55e" : "#ef4444",
                      fontWeight: 800, fontSize: "0.95rem",
                      animation: "wam-float 0.95s ease-out forwards",
                      pointerEvents: "none", whiteSpace: "nowrap",
                      zIndex: 10,
                    }}>
                      {p.label}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textAlign: "center" }}>
            {cfg.decoyEmoji
              ? `Hit ${cfg.normalEmojis[0]} · Bonus ${cfg.bonusEmoji} = +${cfg.bonusPts} · Avoid ${cfg.decoyEmoji} = −${cfg.decoyPenalty} · Combo streak for ×2/×3/×4!`
              : `Hit ${cfg.normalEmojis[0]} · Bonus ${cfg.bonusEmoji} = +${cfg.bonusPts} pts · Keep your combo going for ×2, ×3, ×4!`}
          </div>
        </div>
      )}

      {/* ── OVER ──────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
            {isNewHighScore ? "🏆" : score > 0 ? "🎮" : "😅"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
            {isNewHighScore ? "New high score!" : "Time's up!"}
          </div>
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1, marginBottom: "0.2rem" }}>
            {score}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            points
            {!isNewHighScore && highScore > 0 && (
              <span> · Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore}</strong></span>
            )}
          </div>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
