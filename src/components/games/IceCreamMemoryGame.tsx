"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../app/games/[id]/page.module.css";

type Phase = "idle" | "memorize" | "rebuild" | "result" | "over";
type Mode = "kids" | "adult";

interface ScoopColor {
  id: string;
  emoji: string;
  bg: string;
  border: string;
}

const ALL_COLORS: ScoopColor[] = [
  { id: "pink",   emoji: "🍓", bg: "#f9a8d4", border: "#ec4899" },
  { id: "choc",   emoji: "🍫", bg: "#92400e", border: "#a16207" },
  { id: "van",    emoji: "🍦", bg: "#fde68a", border: "#f59e0b" },
  { id: "mint",   emoji: "🍃", bg: "#6ee7b7", border: "#10b981" },
  { id: "blue",   emoji: "🫐", bg: "#93c5fd", border: "#3b82f6" },
  { id: "mango",  emoji: "🥭", bg: "#fb923c", border: "#ea580c" },
  { id: "grape",  emoji: "🍇", bg: "#c084fc", border: "#9333ea" },
  { id: "lemon",  emoji: "🍋", bg: "#fef08a", border: "#ca8a04" },
];

const CONFIG = {
  kids:  { scoops: 3, colors: ALL_COLORS.slice(0, 5), memorizeSecs: 3, rebuildSecs: 30 },
  adult: { scoops: 5, colors: ALL_COLORS,              memorizeSecs: 2, rebuildSecs: 15 },
};

const ROUNDS = 5;

function randPick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const KF = `
@keyframes icWobble  { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-4deg)} 75%{transform:rotate(4deg)} }
@keyframes icPop     { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes icShake   { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
@keyframes icFadeIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
`;

interface ConeProps {
  scoops: (ScoopColor | null)[];
  showResult?: boolean;
  original?: ScoopColor[];
  label?: string;
  wobble?: boolean;
}

function Cone({ scoops, showResult, original, label, wobble }: ConeProps) {
  const filled = scoops.filter(Boolean);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {label && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>}

      {/* Scoops — render top-to-bottom (reverse of array order) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: wobble ? "icWobble 0.5s ease-out" : "none" }}>
        {[...scoops].reverse().map((scoop, revIdx) => {
          const origIdx = scoops.length - 1 - revIdx;
          const isCorrect = showResult && original && original[origIdx]?.id === scoop?.id;
          const isWrong   = showResult && original && scoop && original[origIdx]?.id !== scoop?.id;
          return (
            <div
              key={revIdx}
              style={{
                width: 66,
                height: 54,
                borderRadius: "50%",
                background: scoop ? scoop.bg : "rgba(255,255,255,0.08)",
                border: `3px solid ${scoop ? scoop.border : "rgba(255,255,255,0.15)"}`,
                marginBottom: revIdx < scoops.length - 1 ? -14 : 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                boxShadow: scoop ? "0 -3px 8px rgba(0,0,0,0.25)" : "none",
                position: "relative",
                zIndex: revIdx,
                transition: "background 0.2s",
                animation: scoop && !showResult ? `icPop 0.25s ease-out` : "none",
                outline: showResult ? `3px solid ${isCorrect ? "#34d399" : isWrong ? "#ef4444" : "transparent"}` : "none",
                outlineOffset: 2,
              }}
            >
              {scoop ? scoop.emoji : ""}
              {showResult && scoop && (
                <span style={{ position: "absolute", top: -8, right: -6, fontSize: "0.85rem" }}>
                  {isCorrect ? "✅" : "❌"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Cone */}
      <div style={{
        width: 0, height: 0,
        borderLeft: "36px solid transparent",
        borderRight: "36px solid transparent",
        borderTop: `${filled.length > 0 ? 70 : 60}px solid #d97706`,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
        position: "relative",
        zIndex: 0,
      }}>
        {/* Waffle lines */}
      </div>
      <div style={{ width: 6, height: 14, background: "#d97706", borderRadius: "0 0 4px 4px", marginTop: -2 }} />
    </div>
  );
}

export default function IceCreamMemoryGame({ title }: { title: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("kids");
  const [original, setOriginal] = useState<ScoopColor[]>([]);
  const [playerStack, setPlayerStack] = useState<ScoopColor[]>([]);
  const [memorizeLeft, setMemorizeLeft] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [round, setRound] = useState(0);
  const [wobble, setWobble] = useState(false);

  const cfg = CONFIG[mode];

  const startRound = useCallback((nextRound: number, m: Mode) => {
    const c = CONFIG[m];
    const scoops = randPick(c.colors, c.scoops);
    setOriginal(scoops);
    setPlayerStack([]);
    setMemorizeLeft(c.memorizeSecs);
    setRound(nextRound);
    setPhase("memorize");
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setRoundScore(0);
    startRound(0, mode);
  }, [mode, startRound]);

  // Memorize countdown
  useEffect(() => {
    if (phase !== "memorize") return;
    if (memorizeLeft <= 0) {
      setPhase("rebuild");
      setTimeLeft(cfg.rebuildSecs);
      return;
    }
    const t = setTimeout(() => setMemorizeLeft(m => m - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, memorizeLeft, cfg.rebuildSecs]);

  // Rebuild timer
  useEffect(() => {
    if (phase !== "rebuild") return;
    if (timeLeft <= 0) {
      setPhase("result");
      return;
    }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // Auto-check when player places all scoops
  useEffect(() => {
    if (phase !== "rebuild" || playerStack.length < cfg.scoops) return;
    setPhase("result");
  }, [phase, playerStack.length, cfg.scoops]);

  // Calculate score when entering result phase
  useEffect(() => {
    if (phase !== "result") return;
    const correct = playerStack.filter((s, i) => s?.id === original[i]?.id).length;
    const pts = Math.round((correct / cfg.scoops) * 10);
    setRoundScore(pts);
    setScore(s => s + pts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const addScoop = useCallback((color: ScoopColor) => {
    if (phase !== "rebuild" || playerStack.length >= cfg.scoops) return;
    setPlayerStack(prev => [...prev, color]);
    setWobble(true);
    setTimeout(() => setWobble(false), 500);
  }, [phase, playerStack.length, cfg.scoops]);

  const removeScoop = useCallback(() => {
    if (phase !== "rebuild") return;
    setPlayerStack(prev => prev.slice(0, -1));
  }, [phase]);

  const nextRound = useCallback(() => {
    if (round + 1 >= ROUNDS) {
      setPhase("over");
    } else {
      startRound(round + 1, mode);
    }
  }, [round, mode, startRound]);

  const timerPct = (timeLeft / cfg.rebuildSecs) * 100;
  const totalScore = score;
  const maxScore = ROUNDS * 10;

  return (
    <div className={styles.gameInner}>
      <style>{KF}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button key={m} className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { if (phase !== "playing") setMode(m); }}>
            {m === "kids" ? `🧒 Kids (${CONFIG.kids.scoops} scoops · 30s)` : `🧑 Adult (${CONFIG.adult.scoops} scoops · 15s)`}
          </button>
        ))}
      </div>

      {/* Progress */}
      {phase !== "idle" && phase !== "over" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.88rem", padding: "0.3rem 0.6rem", background: "rgba(255,255,255,0.04)", borderRadius: 8, marginBottom: 4 }}>
          <span style={{ color: "var(--text-secondary)" }}>Round {round + 1}/{ROUNDS}</span>
          <span style={{ fontWeight: 700 }}>⭐ {totalScore}</span>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: ROUNDS }).map((_, i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i < round ? "#34d399" : i === round ? "#f59e0b" : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", justifyContent: "center" }}>

        {/* Idle */}
        {phase === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>🍦</div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 300 }}>
              {mode === "kids"
                ? "Study the ice cream for 3 seconds, then rebuild it from memory! You have 30 seconds."
                : "You get just 2 seconds to memorize 5 scoops — then rebuild it in 15 seconds. Go!"}
            </p>
            <button className={styles.resetBtn} onClick={startGame} style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>🍦 Start!</button>
          </div>
        )}

        {/* Memorize phase */}
        {phase === "memorize" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", animation: "icFadeIn 0.3s ease-out" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f59e0b" }}>
              👀 Memorize! — {memorizeLeft}s
            </div>
            <Cone scoops={original} />
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Remember the order of scoops!
            </div>
          </div>
        )}

        {/* Rebuild phase */}
        {phase === "rebuild" && (
          <>
            {/* Timer bar */}
            <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${timerPct}%`,
                background: timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#34d399",
                borderRadius: 3, transition: "width 1s linear, background 0.3s",
              }} />
            </div>

            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: timeLeft <= 5 ? "#ef4444" : "var(--text-secondary)" }}>
              ⏱ {timeLeft}s — rebuild the ice cream!
            </div>

            {/* Player's cone */}
            <Cone
              scoops={[
                ...playerStack,
                ...Array(cfg.scoops - playerStack.length).fill(null),
              ]}
              wobble={wobble}
            />

            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {playerStack.length}/{cfg.scoops} scoops placed
            </div>

            {/* Color palette */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", maxWidth: 320 }}>
              {cfg.colors.map(color => (
                <button
                  key={color.id}
                  onClick={() => addScoop(color)}
                  disabled={playerStack.length >= cfg.scoops}
                  style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: color.bg, border: `3px solid ${color.border}`,
                    fontSize: "1.3rem", cursor: "pointer",
                    boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
                    transition: "transform 0.1s",
                    opacity: playerStack.length >= cfg.scoops ? 0.4 : 1,
                  }}
                  title={color.emoji}
                >
                  {color.emoji}
                </button>
              ))}
            </div>

            {/* Undo */}
            {playerStack.length > 0 && (
              <button className={styles.resetBtn} onClick={removeScoop} style={{ padding: "0.4rem 1.2rem", fontSize: "0.85rem" }}>
                ↩ Undo
              </button>
            )}
          </>
        )}

        {/* Result phase */}
        {phase === "result" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", animation: "icFadeIn 0.3s ease-out", width: "100%" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: roundScore === 10 ? "#34d399" : roundScore >= 5 ? "#f59e0b" : "#f87171" }}>
              {roundScore === 10 ? "🎉 Perfect!" : roundScore >= 7 ? "⭐ Great!" : roundScore >= 4 ? "👍 Not bad!" : "💪 Keep practicing!"}
              {" "}+{roundScore} pts
            </div>

            {/* Side-by-side comparison */}
            <div style={{ display: "flex", gap: "2rem", justifyContent: "center", alignItems: "flex-end" }}>
              <Cone scoops={original} showResult={false} label="🎯 Original" />
              <Cone
                scoops={[
                  ...playerStack,
                  ...Array(cfg.scoops - playerStack.length).fill(null),
                ]}
                showResult original={original}
                label="Your answer"
              />
            </div>

            <button className={styles.resetBtn} onClick={nextRound} style={{ padding: "0.65rem 2rem" }}>
              {round + 1 >= ROUNDS ? "See Results" : "Next Round →"}
            </button>
          </div>
        )}

        {/* Over */}
        {phase === "over" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>{totalScore >= 40 ? "🏆" : totalScore >= 25 ? "⭐" : "💪"}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{totalScore} / {maxScore}</div>
            <div style={{ color: "var(--text-secondary)" }}>
              {totalScore >= 48 ? "Photographic memory! 🍦🔥" : totalScore >= 35 ? "Excellent memory!" : totalScore >= 20 ? "Nice recall!" : "Keep training that brain!"}
            </div>
            <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: "0.5rem" }}>▶ Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
