"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

const KEYFRAMES = `
@keyframes es-pop {
  0%   { transform: scale(0.85); opacity: 0; }
  70%  { transform: scale(1.06); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes es-shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-8px); }
  75%     { transform: translateX(8px); }
}
`;

type Phase = "idle" | "playing" | "over";
type Mode  = "kids" | "adult";

interface Dot { x: number; y: number }

interface Question {
  type: "visual" | "text";
  text: string;
  answer: string;
  choices: string[];
  dots: Dot[];
  dotR: number;
}

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

function makeDots(count: number): Dot[] {
  const cx = 50, cy = 50, r = 43;
  const spacing = count <= 12 ? 13 : count <= 25 ? 10 : count <= 50 ? 7.5 : 5.5;
  const grid: Dot[] = [];
  for (let gx = cx - r; gx <= cx + r; gx += spacing) {
    for (let gy = cy - r; gy <= cy + r; gy += spacing) {
      if ((gx - cx) ** 2 + (gy - cy) ** 2 < (r - spacing * 0.55) ** 2) {
        grid.push({ x: gx, y: gy });
      }
    }
  }
  const jitter = spacing * 0.4;
  return shuffled(grid).slice(0, count).map(p => ({
    x: p.x + (Math.random() - 0.5) * jitter,
    y: p.y + (Math.random() - 0.5) * jitter,
  }));
}

function dotRadius(count: number): number {
  if (count <= 12) return 4.5;
  if (count <= 25) return 3.5;
  if (count <= 50) return 2.5;
  return 2;
}

function makeVisualWrongs(correct: number, mode: Mode): string[] {
  const spread = mode === "kids"
    ? Math.max(2, Math.round(correct * 0.35))
    : Math.max(6, Math.round(correct * 0.28));
  const seen = new Set([correct]);
  const result: string[] = [];
  while (result.length < 3) {
    const delta = rnd(Math.max(1, Math.round(spread * 0.25)), spread);
    const w = Math.random() < 0.5 ? correct + delta : Math.max(1, correct - delta);
    if (!seen.has(w)) { seen.add(w); result.push(`${w}`); }
  }
  return result;
}

// Real-world estimation bank for adult mode
const WORLD_QS: Array<{ text: string; answer: string; all: string[] }> = [
  { text: "Heartbeats per minute at rest?",                     answer: "72",        all: ["40","72","120","200"] },
  { text: "Bones in the adult human body?",                     answer: "206",       all: ["106","156","206","306"] },
  { text: "Seconds in one hour?",                               answer: "3,600",     all: ["360","3,600","36,000","360,000"] },
  { text: "Days in four years (including one leap year)?",      answer: "1,461",     all: ["365","730","1,461","1,826"] },
  { text: "Miles from Earth to the Moon (roughly)?",            answer: "240,000",   all: ["24,000","240,000","2,400,000","24,000,000"] },
  { text: "Words in a typical novel?",                          answer: "80,000",    all: ["8,000","80,000","800,000","8,000,000"] },
  { text: "Muscles in the human body (approx)?",               answer: "600",       all: ["60","200","600","6,000"] },
  { text: "Top speed of a cheetah in mph?",                     answer: "70",        all: ["30","50","70","120"] },
  { text: "Feet in a mile?",                                    answer: "5,280",     all: ["1,000","5,280","10,000","52,800"] },
  { text: "Calories in a Big Mac (approx)?",                    answer: "550",       all: ["200","350","550","900"] },
  { text: "Height of the Eiffel Tower in feet (approx)?",       answer: "1,063",     all: ["300","650","1,063","3,000"] },
  { text: "Gallons of water in an Olympic swimming pool?",       answer: "660,000",   all: ["6,600","66,000","660,000","6,600,000"] },
  { text: "Words the average person speaks per day?",           answer: "16,000",    all: ["1,600","7,000","16,000","160,000"] },
  { text: "Hairs on a human head (approx)?",                    answer: "100,000",   all: ["10,000","100,000","1,000,000","10,000,000"] },
  { text: "Countries in the United Nations?",                   answer: "193",       all: ["93","133","193","243"] },
];

function makeKidsQuestion(): Question {
  const count = rnd(5, 25);
  const answer = `${count}`;
  const wrongs = makeVisualWrongs(count, "kids");
  return {
    type: "visual",
    text: "About how many dots are in the jar?",
    answer,
    choices: shuffled([answer, ...wrongs]),
    dots: makeDots(count),
    dotR: dotRadius(count),
  };
}

function makeAdultQuestion(): Question {
  if (Math.random() < 0.55) {
    // Visual with more dots
    const count = rnd(18, 80);
    const answer = `${count}`;
    const wrongs = makeVisualWrongs(count, "adult");
    return {
      type: "visual",
      text: "About how many dots are in the jar?",
      answer,
      choices: shuffled([answer, ...wrongs]),
      dots: makeDots(count),
      dotR: dotRadius(count),
    };
  }
  // Real-world knowledge
  const q = WORLD_QS[rnd(0, WORLD_QS.length - 1)];
  return {
    type: "text",
    text: q.text,
    answer: q.answer,
    choices: shuffled(q.all),
    dots: [],
    dotR: 0,
  };
}

const GAME_SEC = 60;
const DOT_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6"];

export default function EstimationStationGame({ title }: { title: string }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [mode, setMode]         = useState<Mode>("kids");
  const [score, setScore]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SEC);
  const [question, setQuestion] = useState<Question>(() => makeKidsQuestion());
  const [flash, setFlash]       = useState<"correct" | "wrong" | null>(null);
  const [showCorrect, setShowCorrect] = useState<string | null>(null);

  const phaseRef  = useRef<Phase>("idle");
  const modeRef   = useRef<Mode>("kids");
  const scoreRef  = useRef(0);
  const streakRef = useRef(0);
  const lockedRef = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // stable dot color per question render
  const dotColorRef = useRef(DOT_COLORS[0]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const nextQ = useCallback(() => {
    lockedRef.current = false;
    dotColorRef.current = DOT_COLORS[rnd(0, DOT_COLORS.length - 1)];
    setShowCorrect(null);
    setFlash(null);
    setQuestion(modeRef.current === "kids" ? makeKidsQuestion() : makeAdultQuestion());
  }, []);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    phaseRef.current  = "playing";
    modeRef.current   = mode;
    scoreRef.current  = 0;
    streakRef.current = 0;
    lockedRef.current = false;
    dotColorRef.current = DOT_COLORS[rnd(0, DOT_COLORS.length - 1)];
    setPhase("playing");
    setScore(0);
    setStreak(0);
    setFlash(null);
    setShowCorrect(null);
    setTimeLeft(GAME_SEC);
    setQuestion(mode === "kids" ? makeKidsQuestion() : makeAdultQuestion());

    const tick = () => {
      setTimeLeft(prev => {
        if (prev <= 1) { phaseRef.current = "over"; setPhase("over"); return 0; }
        timerRef.current = setTimeout(tick, 1000);
        return prev - 1;
      });
    };
    timerRef.current = setTimeout(tick, 1000);
  }, [mode]);

  const handleAnswer = useCallback((choice: string, correctAnswer: string) => {
    if (phaseRef.current !== "playing" || lockedRef.current) return;
    lockedRef.current = true;

    if (choice === correctAnswer) {
      streakRef.current++;
      const bonus = streakRef.current >= 5 ? 2 : streakRef.current >= 3 ? 1 : 0;
      scoreRef.current += 1 + bonus;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setFlash("correct");
      setTimeout(nextQ, 380);
    } else {
      streakRef.current = 0;
      setStreak(0);
      setFlash("wrong");
      setShowCorrect(correctAnswer);
      setTimeout(nextQ, 950);
    }
  }, [nextQ]);

  const dotColor = dotColorRef.current;

  return (
    <div className={styles.gameInner} style={{ padding: "0.75rem", justifyContent: "flex-start", gap: "0.5rem" }}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>🎯 {title}</h2>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { if (phase !== "playing") { setMode(m); setQuestion(m === "kids" ? makeKidsQuestion() : makeAdultQuestion()); } }}
            disabled={phase === "playing"}
          >{m === "kids" ? "👶 Kids" : "🧑 Adult"}</button>
        ))}
      </div>

      {phase === "idle" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
          <div style={{ fontSize: "4rem" }}>🎯</div>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", fontSize: "0.9rem", maxWidth: 280, lineHeight: 1.5 }}>
            {mode === "kids"
              ? "Look at the jar and estimate how many dots are inside! 60 seconds, how many can you guess?"
              : "Estimate dot counts AND real-world quantities! Streak bonuses for 3 and 5 in a row."}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Start! 🎯</button>
        </div>
      )}

      {phase === "playing" && (
        <>
          {/* HUD */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0 0.2rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: timeLeft <= 10 ? "#ef4444" : "var(--text-primary)" }}>
              ⏱ {timeLeft}s
            </span>
            {streak >= 3 && (
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#22c55e" }}>
                🔥 ×{streak}
              </span>
            )}
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fbbf24" }}>
              ⭐ {score}
            </span>
          </div>

          {/* Question card */}
          <div style={{
            background: "var(--bg-secondary)", borderRadius: 16, padding: "0.75rem",
            border: `2px solid ${flash === "correct" ? "#22c55e" : flash === "wrong" ? "#ef4444" : "var(--border-color)"}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
            width: "100%",
            animation: flash === "wrong" ? "es-shake 0.4s ease" : flash === "correct" ? "es-pop 0.15s ease" : undefined,
            transition: "border-color 0.12s",
          }}>
            {question.type === "visual" ? (
              <svg viewBox="0 0 100 100" width="120" height="120" style={{ display: "block" }}>
                {/* Jar outline */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--border-color)" strokeWidth="2" />
                <circle cx="50" cy="50" r="46" fill="var(--bg-tertiary)" opacity="0.5" />
                {/* Dots */}
                {question.dots.map((d, i) => (
                  <circle key={i} cx={d.x} cy={d.y} r={question.dotR} fill={dotColor} />
                ))}
              </svg>
            ) : (
              <div style={{ fontSize: "3rem", marginBottom: "0.25rem" }}>🌍</div>
            )}
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "center", lineHeight: 1.3 }}>
              {question.text}
            </div>
          </div>

          {/* Choices */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", width: "100%" }}>
            {question.choices.map((c, i) => {
              const isHint = showCorrect === c;
              return (
                <button key={i} onClick={() => handleAnswer(c, question.answer)} style={{
                  padding: "0.65rem 0.5rem", borderRadius: 10,
                  border: `2px solid ${isHint ? "#22c55e" : "var(--border-color)"}`,
                  background: isHint ? "#22c55e22" : "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "1.05rem", fontWeight: 700,
                  cursor: showCorrect ? "default" : "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                  onMouseEnter={e => { if (!showCorrect) { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "var(--bg-tertiary)"; } }}
                  onMouseLeave={e => { if (!showCorrect) { e.currentTarget.style.borderColor = isHint ? "#22c55e" : "var(--border-color)"; e.currentTarget.style.background = isHint ? "#22c55e22" : "var(--bg-secondary)"; } }}
                >{c}</button>
              );
            })}
          </div>
        </>
      )}

      {phase === "over" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ fontSize: "3rem" }}>🏁</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Your score:</div>
          <div style={{ fontSize: "4.5rem", fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>{score}</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center" }}>
            {score === 0 ? "Estimation is tricky — keep at it! 🎯"
              : score < 8  ? "Not bad! Try again 🎯"
              : score < 15 ? "Great estimating! 🌟"
              : "Master estimator! 🎯🌟"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
