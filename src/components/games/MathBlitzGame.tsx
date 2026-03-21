"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../../app/games/[id]/page.module.css";

type Phase = "idle" | "countdown" | "playing" | "over";
type Mode = "kids" | "adult";

interface Card {
  id: number;
  expr: string;
  displayAnswer: number;
  isTrue: boolean;
  lane: 0 | 1 | 2;
  y: number;
  popped: boolean;
  flash: "correct" | "wrong" | null;
}

const TICK_MS = 50;
const GAME_SECS = 60;
const SPAWN_MS = 2100;
const LANE_LEFT = ["2%", "36%", "68%"];
const LANE_BG = [
  "linear-gradient(135deg,#4338ca,#7c3aed)",
  "linear-gradient(135deg,#0e7490,#0891b2)",
  "linear-gradient(135deg,#be185d,#db2777)",
];

function rand(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function makeCard(mode: Mode, id: number): Card {
  const ops = mode === "kids" ? ["+", "−"] : ["+", "−", "×", "÷"];
  const op = ops[rand(0, ops.length - 1)];
  let expr: string, answer: number;

  if (op === "+") {
    const a = rand(1, mode === "kids" ? 12 : 25);
    const b = rand(1, mode === "kids" ? 12 : 25);
    expr = `${a} + ${b}`; answer = a + b;
  } else if (op === "−") {
    const a = rand(mode === "kids" ? 2 : 5, mode === "kids" ? 20 : 30);
    const b = rand(1, a);
    expr = `${a} − ${b}`; answer = a - b;
  } else if (op === "×") {
    const a = rand(2, 12), b = rand(2, 12);
    expr = `${a} × ${b}`; answer = a * b;
  } else {
    const d = rand(2, 10), q = rand(2, 12);
    expr = `${d * q} ÷ ${d}`; answer = q;
  }

  const isTrue = Math.random() > 0.4;
  const offset = rand(1, mode === "kids" ? 3 : 6) * (Math.random() > 0.5 ? 1 : -1);
  const wrong = answer + offset !== answer ? answer + offset : answer + (offset > 0 ? -1 : 1);
  const displayAnswer = isTrue ? answer : wrong;

  return { id, expr, displayAnswer, isTrue, lane: rand(0, 2) as 0 | 1 | 2, y: -16, popped: false, flash: null };
}

const KF = `
@keyframes mbCorrect { 0%{transform:scale(1)} 40%{transform:scale(1.2)} 100%{transform:scale(0.4);opacity:0} }
@keyframes mbWrong   { 0%{} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} 100%{transform:translateX(0);opacity:0} }
@keyframes mbCount   { from{transform:scale(2.2);opacity:0} to{transform:scale(1);opacity:1} }
`;

export default function MathBlitzGame({ title }: { title: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("kids");
  const [cards, setCards] = useState<Card[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECS);
  const [countdown, setCountdown] = useState(3);

  const phaseRef = useRef<Phase>("idle");
  const cardsRef = useRef<Card[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const idRef = useRef(0);
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopFrame = useCallback(() => {
    if (frameRef.current) { clearTimeout(frameRef.current); frameRef.current = null; }
  }, []);

  const tick = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const speed = 0.9 + Math.min(scoreRef.current * 0.005, 0.8);
    let lifeLost = false;

    const next = cardsRef.current
      .map(c => {
        if (c.popped) return c;
        const ny = c.y + speed;
        if (ny > 104 && c.isTrue) lifeLost = true;
        return { ...c, y: ny };
      })
      .filter(c => c.y < 115);

    if (lifeLost) {
      const nl = Math.max(0, livesRef.current - 1);
      livesRef.current = nl;
      setLives(nl);
      comboRef.current = 0;
      setCombo(0);
      if (nl === 0) {
        phaseRef.current = "over";
        setPhase("over");
        cardsRef.current = [];
        setCards([]);
        return;
      }
    }

    cardsRef.current = next;
    setCards([...next]);
    frameRef.current = setTimeout(tick, TICK_MS);
  }, []);

  // Countdown → Playing
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      phaseRef.current = "playing";
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game loop + spawn + timer
  useEffect(() => {
    if (phase !== "playing") return;

    frameRef.current = setTimeout(tick, TICK_MS);

    const spawnInterval = setInterval(() => {
      if (phaseRef.current !== "playing") return;
      const card = makeCard(mode, idRef.current++);
      cardsRef.current = [...cardsRef.current, card];
    }, SPAWN_MS);

    let elapsed = 0;
    const timerInterval = setInterval(() => {
      elapsed++;
      const remaining = GAME_SECS - elapsed;
      setTimeLeft(remaining);
      if (remaining <= 0 && phaseRef.current === "playing") {
        phaseRef.current = "over";
        setPhase("over");
        cardsRef.current = [];
        setCards([]);
      }
    }, 1000);

    return () => {
      stopFrame();
      clearInterval(spawnInterval);
      clearInterval(timerInterval);
    };
  }, [phase, mode, tick, stopFrame]);

  const startGame = useCallback(() => {
    stopFrame();
    cardsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    idRef.current = 0;
    setCards([]);
    setScore(0);
    setLives(3);
    setCombo(0);
    setTimeLeft(GAME_SECS);
    setCountdown(3);
    phaseRef.current = "countdown";
    setPhase("countdown");
  }, [stopFrame]);

  const clickCard = useCallback((id: number) => {
    if (phaseRef.current !== "playing") return;
    const card = cardsRef.current.find(c => c.id === id);
    if (!card || card.popped) return;

    if (card.isTrue) {
      comboRef.current++;
      scoreRef.current += 10 * Math.min(comboRef.current, 4);
      setScore(scoreRef.current);
      setCombo(comboRef.current);
    } else {
      comboRef.current = 0;
      setCombo(0);
      const nl = Math.max(0, livesRef.current - 1);
      livesRef.current = nl;
      setLives(nl);
    }

    cardsRef.current = cardsRef.current.map(c =>
      c.id === id ? { ...c, popped: true, flash: card.isTrue ? "correct" : "wrong" } : c
    );
    setCards([...cardsRef.current]);
  }, []);

  useEffect(() => () => stopFrame(), [stopFrame]);

  const comboTag = combo >= 4 ? "🔥 MAX" : combo === 3 ? "🔥 ×3" : combo === 2 ? "×2" : "";

  return (
    <div className={styles.gameInner}>
      <style>{KF}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button
            key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { if (phase === "idle") setMode(m); }}
          >
            {m === "kids" ? "🧒 Kids  ＋ −" : "🧑 Adult  × ÷"}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {phase !== "idle" && (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: 8, fontSize: "0.88rem", marginBottom: 4, flexWrap: "wrap" }}>
          <span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span>
          <span style={{ fontWeight: 700 }}>⭐ {score}</span>
          {comboTag && <span style={{ color: "#f59e0b", fontWeight: 700 }}>{comboTag}</span>}
          <span style={{ color: timeLeft <= 10 ? "#ef4444" : "var(--text-secondary)" }}>⏱ {timeLeft}s</span>
        </div>
      )}

      {/* Play area */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Idle */}
        {phase === "idle" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>🧮</div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 300 }}>
              {mode === "kids"
                ? "Equations fall from above! Tap the ones that are TRUE. Missing a correct one costs a ❤️!"
                : "Fast math! Tap TRUE equations — all 4 operations. Speed ramps up as your score climbs!"}
            </p>
            <button className={styles.resetBtn} onClick={startGame} style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>🚀 Start!</button>
          </div>
        )}

        {/* Countdown */}
        {phase === "countdown" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", zIndex: 20, borderRadius: 12 }}>
            <span key={countdown} style={{ fontSize: "6rem", fontWeight: 900, animation: "mbCount 0.85s ease-out" }}>
              {countdown > 0 ? countdown : "GO!"}
            </span>
          </div>
        )}

        {/* Game Over */}
        {phase === "over" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.9rem", background: "rgba(0,0,0,0.65)", borderRadius: 12, zIndex: 20 }}>
            <div style={{ fontSize: "3rem" }}>{score >= 150 ? "🏆" : score >= 70 ? "⭐" : "💪"}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{score} pts</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              {score >= 200 ? "Unbelievable! 🔥" : score >= 120 ? "Math genius!" : score >= 60 ? "Nice work!" : "Keep practicing!"}
            </div>
            <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: "0.5rem" }}>▶ Play Again</button>
          </div>
        )}

        {/* Falling cards */}
        {cards.filter(c => c.y > -18).map(card => (
          <div
            key={card.id}
            onClick={() => clickCard(card.id)}
            style={{
              position: "absolute",
              left: LANE_LEFT[card.lane],
              top: `${card.y}%`,
              width: "30%",
              background: card.flash === "correct"
                ? "rgba(34,197,94,0.9)"
                : card.flash === "wrong"
                  ? "rgba(239,68,68,0.9)"
                  : LANE_BG[card.lane],
              borderRadius: 10,
              padding: "0.5rem 0.25rem",
              cursor: card.popped ? "default" : "pointer",
              userSelect: "none",
              textAlign: "center",
              boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
              animation: card.flash === "correct"
                ? "mbCorrect 0.42s ease-out forwards"
                : card.flash === "wrong"
                  ? "mbWrong 0.42s ease-out forwards"
                  : "none",
              zIndex: 2,
            }}
          >
            <div style={{ fontSize: "0.7rem", opacity: 0.85, letterSpacing: "0.02em" }}>{card.expr}</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>= {card.displayAnswer}</div>
          </div>
        ))}

        {/* Danger zone */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#ef4444,#f97316,#ef4444)", borderRadius: "0 0 12px 12px" }} />
      </div>
    </div>
  );
}
