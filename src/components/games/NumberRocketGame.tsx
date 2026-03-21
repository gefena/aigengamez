"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

const KEYFRAMES = `
@keyframes nr-launch {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  20%  { transform: translateY(-10px) scale(1.1); opacity: 1; }
  100% { transform: translateY(-380px) scale(0.2); opacity: 0; }
}
@keyframes nr-pop {
  0%   { transform: scale(0.85); opacity: 0; }
  70%  { transform: scale(1.06); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes nr-shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-8px); }
  75%     { transform: translateX(8px); }
}
@keyframes nr-flame {
  0%,100% { transform: scaleY(1) scaleX(1); }
  50%     { transform: scaleY(1.3) scaleX(0.8); }
}
`;

type Phase = "idle" | "playing" | "over";
type Mode = "kids" | "adult";

interface Question {
  text: string;
  answer: number;
  choices: number[];
}

const GAME_SEC = 60;
const FUEL_MAX: Record<Mode, number> = { kids: 5, adult: 7 };

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuestion(mode: Mode): Question {
  const ops = mode === "kids" ? ["+", "-"] : ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number, b: number, answer: number, text: string;

  if (op === "+") {
    a = rnd(1, mode === "kids" ? 20 : 50);
    b = rnd(1, mode === "kids" ? 20 : 50);
    answer = a + b;
    text = `${a} + ${b}`;
  } else if (op === "-") {
    a = rnd(5, mode === "kids" ? 25 : 60);
    b = rnd(1, a);
    answer = a - b;
    text = `${a} − ${b}`;
  } else if (op === "×") {
    a = rnd(2, 12);
    b = rnd(2, 12);
    answer = a * b;
    text = `${a} × ${b}`;
  } else {
    b = rnd(2, 10);
    answer = rnd(2, 12);
    a = b * answer;
    text = `${a} ÷ ${b}`;
  }

  const wrongs: number[] = [];
  const seen = new Set<number>([answer]);
  while (wrongs.length < 3) {
    const delta = rnd(1, mode === "kids" ? 8 : 15);
    const w = Math.random() < 0.5 ? answer + delta : Math.max(1, answer - delta);
    if (!seen.has(w)) { seen.add(w); wrongs.push(w); }
  }

  return { text: `${text} = ?`, answer, choices: shuffled([answer, ...wrongs]) };
}

export default function NumberRocketGame({ title }: { title: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("kids");
  const [score, setScore] = useState(0);
  const [fuel, setFuel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SEC);
  const [question, setQuestion] = useState<Question>(() => makeQuestion("kids"));
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [launching, setLaunching] = useState(false);

  const phaseRef   = useRef<Phase>("idle");
  const modeRef    = useRef<Mode>("kids");
  const fuelRef    = useRef(0);
  const scoreRef   = useRef(0);
  const launchRef  = useRef(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const nextQ = useCallback(() => setQuestion(makeQuestion(modeRef.current)), []);

  const doLaunch = useCallback(() => {
    launchRef.current = true;
    setLaunching(true);
    setTimeout(() => {
      scoreRef.current++;
      setScore(scoreRef.current);
      fuelRef.current = 0;
      setFuel(0);
      launchRef.current = false;
      setLaunching(false);
      setQuestion(makeQuestion(modeRef.current));
    }, 900);
  }, []);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    phaseRef.current = "playing";
    modeRef.current = mode;
    fuelRef.current = 0;
    scoreRef.current = 0;
    launchRef.current = false;
    setPhase("playing");
    setScore(0);
    setFuel(0);
    setFlash(null);
    setLaunching(false);
    setQuestion(makeQuestion(mode));
    setTimeLeft(GAME_SEC);

    const tick = () => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          phaseRef.current = "over";
          setPhase("over");
          return 0;
        }
        timerRef.current = setTimeout(tick, 1000);
        return prev - 1;
      });
    };
    timerRef.current = setTimeout(tick, 1000);
  }, [mode]);

  const handleAnswer = useCallback((choice: number) => {
    if (phaseRef.current !== "playing" || launchRef.current) return;

    if (choice === question.answer) {
      const newFuel = fuelRef.current + 1;
      const max = FUEL_MAX[modeRef.current];
      fuelRef.current = newFuel;
      setFuel(newFuel);
      setFlash("correct");
      setTimeout(() => setFlash(null), 280);
      if (newFuel >= max) {
        doLaunch();
      } else {
        nextQ();
      }
    } else {
      setFlash("wrong");
      if (modeRef.current === "adult") {
        fuelRef.current = Math.max(0, fuelRef.current - 1);
        setFuel(fuelRef.current);
      }
      setTimeout(() => setFlash(null), 480);
    }
  }, [question.answer, doLaunch, nextQ]);

  const fuelMax = FUEL_MAX[mode];
  const fuelPct = Math.min(100, (fuel / fuelMax) * 100);
  const fuelColor = fuelPct >= 80 ? "#22c55e" : fuelPct >= 50 ? "#f59e0b" : "#3b82f6";

  return (
    <div className={styles.gameInner} style={{ padding: "0.75rem", justifyContent: "flex-start", gap: "0.6rem" }}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>🚀 {title}</h2>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { if (phase !== "playing") { setMode(m); setQuestion(makeQuestion(m)); } }}
            disabled={phase === "playing"}
          >{m === "kids" ? "👶 Kids" : "🧑 Adult"}</button>
        ))}
      </div>

      {phase === "idle" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
          <div style={{ fontSize: "5rem" }}>🚀</div>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", fontSize: "0.9rem", maxWidth: 280, lineHeight: 1.5 }}>
            {mode === "kids"
              ? "Answer + and − questions to fill the fuel tank and launch your rocket! 60 seconds, as many launches as you can."
              : "All 4 operations. Wrong answers drain fuel. How many rockets can you launch in 60 seconds?"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Launch! 🚀</button>
        </div>
      )}

      {phase === "playing" && (
        <>
          {/* HUD */}
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "0 0.2rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.2rem", color: timeLeft <= 10 ? "#ef4444" : "var(--text-primary)" }}>
              ⏱ {timeLeft}s
            </span>
            <span style={{ fontWeight: 700, fontSize: "1.2rem", color: "#fbbf24" }}>
              🚀 × {score}
            </span>
          </div>

          {/* Question card */}
          <div style={{
            background: "var(--bg-secondary)", borderRadius: 14, padding: "0.9rem 1rem",
            border: `2px solid ${flash === "correct" ? "#22c55e" : flash === "wrong" ? "#ef4444" : "var(--border-color)"}`,
            textAlign: "center", width: "100%",
            animation: flash === "wrong" ? "nr-shake 0.4s ease" : "nr-pop 0.18s ease",
            transition: "border-color 0.12s",
          }}>
            <div style={{ fontSize: "1.7rem", fontWeight: 800, letterSpacing: 2, color: "var(--text-primary)" }}>
              {question.text}
            </div>
          </div>

          {/* Choices */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", width: "100%" }}>
            {question.choices.map((c, i) => (
              <button key={i} onClick={() => handleAnswer(c)} style={{
                padding: "0.7rem 0.5rem", borderRadius: 10,
                border: "2px solid var(--border-color)",
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                fontSize: "1.25rem", fontWeight: 700, cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.background = "var(--bg-secondary)"; }}
              >{c}</button>
            ))}
          </div>

          {/* Fuel gauge */}
          <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>⛽ FUEL</span>
            <div style={{ flex: 1, height: 20, background: "var(--bg-tertiary)", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div style={{
                height: "100%", width: `${fuelPct}%`, background: fuelColor,
                borderRadius: 10, transition: "width 0.2s ease, background 0.3s",
              }} />
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", minWidth: 36, textAlign: "right" }}>
              {fuel}/{fuelMax}
            </span>
          </div>

          {/* Rocket */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, marginTop: "0.25rem" }}>
            <div style={{
              fontSize: "3.5rem", lineHeight: 1,
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.4))",
              animation: launching ? "nr-launch 0.9s ease-in forwards" : undefined,
            }}>🚀</div>
            <div style={{
              fontSize: "1.5rem", marginTop: -6,
              animation: "nr-flame 0.55s ease-in-out infinite",
              opacity: fuel > 0 ? 1 : 0.25,
              transition: "opacity 0.3s",
            }}>🔥</div>
          </div>
        </>
      )}

      {phase === "over" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ fontSize: "3rem" }}>🏁</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Rockets launched:</div>
          <div style={{ fontSize: "4.5rem", fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>{score}</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center" }}>
            {score === 0 ? "Keep practicing! You can do it 💪"
              : score < 3 ? "Nice start! Try again 🚀"
              : score < 6 ? "Great job! 🌟"
              : "Incredible! You're a math rocket! 🚀🚀🚀"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
