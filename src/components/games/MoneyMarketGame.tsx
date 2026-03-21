"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

const KEYFRAMES = `
@keyframes mm-pop {
  0%   { transform: scale(0.85); opacity: 0; }
  70%  { transform: scale(1.06); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes mm-shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-8px); }
  75%     { transform: translateX(8px); }
}
`;

type Phase     = "idle" | "playing" | "over";
type Mode      = "kids" | "adult";
type CoinType  = "penny" | "nickel" | "dime" | "quarter";

interface Coin { type: CoinType }

interface Question {
  kind: "count" | "change";
  text: string;
  answer: string;
  choices: string[];
  coins: Coin[];
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

// ── Money helpers ────────────────────────────────────────────────────────────
const COIN_VALUE: Record<CoinType, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };

function formatMoney(cents: number): string {
  if (cents < 100) return `${cents}¢`;
  const d = Math.floor(cents / 100);
  const r = cents % 100;
  return `$${d}.${r.toString().padStart(2, "0")}`;
}

function moneyWrongs(correctCents: number): string[] {
  const seen = new Set([correctCents]);
  const result: string[] = [];
  const spread = Math.max(30, Math.round(correctCents * 0.28));
  let attempts = 0;
  while (result.length < 3 && attempts < 60) {
    attempts++;
    const delta = Math.round(rnd(5, spread) / 5) * 5;
    const w = Math.random() < 0.5 ? correctCents + delta : Math.max(5, correctCents - delta);
    if (!seen.has(w) && w > 0) { seen.add(w); result.push(formatMoney(w)); }
  }
  // Safety fallback — guaranteed unique values
  const fallbacks = [5, 10, 15, 25, 50, 75, 100, 125];
  for (const f of fallbacks) {
    if (result.length >= 3) break;
    if (!seen.has(f)) { seen.add(f); result.push(formatMoney(f)); }
  }
  return result.slice(0, 3);
}

// ── Question factories ───────────────────────────────────────────────────────
const KIDS_POOL:  CoinType[] = ["penny", "penny", "nickel", "nickel", "dime", "dime", "quarter"];
const ADULT_POOL: CoinType[] = ["penny", "nickel", "dime", "dime", "quarter", "quarter", "quarter"];

function makeCountQuestion(mode: Mode): Question {
  const pool  = mode === "kids" ? KIDS_POOL : ADULT_POOL;
  const count = mode === "kids" ? rnd(2, 5) : rnd(3, 7);
  const coins: Coin[] = Array.from({ length: count }, () => ({
    type: pool[Math.floor(Math.random() * pool.length)],
  }));
  const total  = coins.reduce((s, c) => s + COIN_VALUE[c.type], 0);
  const answer = formatMoney(total);
  return {
    kind: "count",
    text: "How much money is shown?",
    answer,
    choices: shuffled([answer, ...moneyWrongs(total)]),
    coins,
  };
}

function makeChangeQuestion(): Question {
  const priceCents = rnd(50, 1950);
  const payOpts    = [500, 1000, 2000].filter(p => p > priceCents);
  const paidCents  = payOpts[rnd(0, payOpts.length - 1)];
  const change     = paidCents - priceCents;
  const answer     = formatMoney(change);
  return {
    kind: "change",
    text: `You pay ${formatMoney(paidCents)} for something that costs ${formatMoney(priceCents)}. Change?`,
    answer,
    choices: shuffled([answer, ...moneyWrongs(change)]),
    coins: [],
  };
}

function makeQuestion(mode: Mode): Question {
  if (mode === "kids") return makeCountQuestion("kids");
  return Math.random() < 0.6 ? makeCountQuestion("adult") : makeChangeQuestion();
}

// ── Coin SVG styles ──────────────────────────────────────────────────────────
const COIN_STYLE: Record<CoinType, { r: number; fill: string; ring: string; textFill: string; fs: number }> = {
  penny:   { r: 13, fill: "#d97706", ring: "#78350f", textFill: "#fef3c7", fs: 7.5 },
  nickel:  { r: 14, fill: "#9ca3af", ring: "#374151", textFill: "#f9fafb", fs: 7.5 },
  dime:    { r: 11, fill: "#d1d5db", ring: "#6b7280", textFill: "#1f2937", fs:   6 },
  quarter: { r: 16, fill: "#e5e7eb", ring: "#6b7280", textFill: "#1f2937", fs:   8 },
};
const COIN_LABEL: Record<CoinType, string> = {
  penny: "1¢", nickel: "5¢", dime: "10¢", quarter: "25¢",
};

function coinLayout(coins: Coin[]): { cx: number; cy: number; type: CoinType }[] {
  const count = coins.length;
  const spacing = 42;
  const result: { cx: number; cy: number; type: CoinType }[] = [];

  for (let i = 0; i < count; i++) {
    const row     = Math.floor(i / 4);
    const col     = i % 4;
    const rows    = Math.ceil(count / 4);
    const rowSize = row === rows - 1 ? count - row * 4 : Math.min(4, count);
    const startX  = 100 - ((rowSize - 1) * spacing) / 2;
    const cy      = rows === 1 ? 55 : row === 0 ? 32 : 78;
    result.push({ cx: startX + col * spacing, cy, type: coins[i].type });
  }
  return result;
}

const GAME_SEC = 60;

export default function MoneyMarketGame({ title }: { title: string }) {
  const [phase, setPhase]             = useState<Phase>("idle");
  const [mode, setMode]               = useState<Mode>("kids");
  const [score, setScore]             = useState(0);
  const [streak, setStreak]           = useState(0);
  const [timeLeft, setTimeLeft]       = useState(GAME_SEC);
  const [question, setQuestion]       = useState<Question>(() => makeQuestion("kids"));
  const [flash, setFlash]             = useState<"correct" | "wrong" | null>(null);
  const [showCorrect, setShowCorrect] = useState<string | null>(null);

  const phaseRef  = useRef<Phase>("idle");
  const modeRef   = useRef<Mode>("kids");
  const scoreRef  = useRef(0);
  const streakRef = useRef(0);
  const lockedRef = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const nextQ = useCallback(() => {
    lockedRef.current = false;
    setShowCorrect(null);
    setFlash(null);
    setQuestion(makeQuestion(modeRef.current));
  }, []);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    phaseRef.current  = "playing";
    modeRef.current   = mode;
    scoreRef.current  = 0;
    streakRef.current = 0;
    lockedRef.current = false;
    setPhase("playing");
    setScore(0);
    setStreak(0);
    setFlash(null);
    setShowCorrect(null);
    setTimeLeft(GAME_SEC);
    setQuestion(makeQuestion(mode));

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
      setTimeout(nextQ, 400);
    } else {
      streakRef.current = 0;
      setStreak(0);
      setFlash("wrong");
      setShowCorrect(correctAnswer);
      setTimeout(nextQ, 950);
    }
  }, [nextQ]);

  const layout = coinLayout(question.coins);

  return (
    <div className={styles.gameInner} style={{ padding: "0.75rem", justifyContent: "flex-start", gap: "0.5rem" }}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>💰 {title}</h2>

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
          <div style={{ fontSize: "4rem" }}>💰</div>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", fontSize: "0.9rem", maxWidth: 280, lineHeight: 1.5 }}>
            {mode === "kids"
              ? "Add up the coins — pennies, nickels, dimes, and quarters! 60 seconds!"
              : "Count coins AND make change! Pay with $5, $10, or $20 and figure out what you get back."}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Start! 💰</button>
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
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#22c55e" }}>🔥 ×{streak}</span>
            )}
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fbbf24" }}>⭐ {score}</span>
          </div>

          {/* Question card */}
          <div style={{
            background: "var(--bg-secondary)", borderRadius: 16, padding: "0.75rem",
            border: `2px solid ${flash === "correct" ? "#22c55e" : flash === "wrong" ? "#ef4444" : "var(--border-color)"}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
            width: "100%",
            animation: flash === "wrong" ? "mm-shake 0.4s ease" : flash === "correct" ? "mm-pop 0.15s ease" : undefined,
            transition: "border-color 0.12s",
          }}>
            {question.kind === "count" ? (
              <svg viewBox="0 0 200 110" width="200" height="110" style={{ display: "block", overflow: "visible" }}>
                {layout.map((p, i) => {
                  const s = COIN_STYLE[p.type];
                  return (
                    <g key={i}>
                      <circle cx={p.cx} cy={p.cy} r={s.r + 2} fill={s.ring} />
                      <circle cx={p.cx} cy={p.cy} r={s.r} fill={s.fill} />
                      <text x={p.cx} y={p.cy + 3.5} textAnchor="middle" fill={s.textFill} fontSize={s.fs} fontWeight="bold">
                        {COIN_LABEL[p.type]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div style={{ fontSize: "2.5rem" }}>🏪</div>
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
                  fontSize: "1.1rem", fontWeight: 700,
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
            {score === 0 ? "Money math takes practice — keep going! 💰"
              : score < 8  ? "Good start! Try again 💰"
              : score < 15 ? "Nice counting skills! 🌟"
              : "Money master! 💰🌟"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
