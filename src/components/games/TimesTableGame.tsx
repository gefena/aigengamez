"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../app/games/[id]/page.module.css";

type Phase = "idle" | "playing" | "over";
type Mode = "kids" | "adult";
type ChestState = "closed" | "correct" | "wrong" | "reveal";

interface Question {
  a: number;
  b: number;
  answer: number;
  choices: number[];
}

const TOTAL_ROUNDS = 10;
const ADULT_SECS = 10;

function rand(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function genQuestion(mode: Mode): Question {
  const max = mode === "kids" ? 9 : 12;
  const a = rand(2, max);
  const b = rand(2, max);
  const answer = a * b;

  const wrongs = new Set<number>();
  const candidates = [
    (a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1),
    answer + rand(1, 5), answer - rand(1, 5), answer + rand(6, 12), answer - rand(6, 12),
    (a + 1) * (b + 1), Math.abs(answer - rand(2, 8)),
  ];
  for (const c of candidates) {
    if (c > 0 && c !== answer && !wrongs.has(c)) wrongs.add(c);
    if (wrongs.size >= 8) break;
  }
  while (wrongs.size < 8) {
    const w = rand(4, max * max);
    if (w !== answer) wrongs.add(w);
  }

  return { a, b, answer, choices: shuffle([answer, ...Array.from(wrongs).slice(0, 8)]) };
}

const KF = `
@keyframes chestOpen  { 0%{transform:scale(1)} 30%{transform:scale(1.25) rotate(-5deg)} 60%{transform:scale(1.1) rotate(3deg)} 100%{transform:scale(1)} }
@keyframes chestWrong { 0%{} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} 100%{} }
@keyframes coinBurst  { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(-30px) scale(1.5)} }
@keyframes ttPopIn    { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
@keyframes timerPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
`;

function Chest({ value, state, onClick }: { value: number; state: ChestState; onClick: () => void }) {
  const bg =
    state === "correct" ? "linear-gradient(135deg,#f59e0b,#d97706)" :
    state === "wrong"   ? "linear-gradient(135deg,#ef4444,#dc2626)" :
    state === "reveal"  ? "linear-gradient(135deg,#34d399,#059669)" :
                          "linear-gradient(135deg,#78350f,#92400e)";

  const anim =
    state === "correct" ? "chestOpen 0.5s ease-out" :
    state === "wrong"   ? "chestWrong 0.4s ease-out" :
    state === "reveal"  ? "chestOpen 0.4s ease-out" : "none";

  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        border: `2px solid ${state === "closed" ? "#f59e0b" : "transparent"}`,
        borderRadius: 10,
        padding: "0.6rem 0.3rem",
        textAlign: "center",
        cursor: state === "closed" ? "pointer" : "default",
        animation: anim,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        minHeight: 64,
        boxShadow: state === "closed" ? "0 4px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.1)" : "0 2px 8px rgba(0,0,0,0.3)",
        transition: "background 0.2s",
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Chest lid decoration */}
      {state === "closed" && (
        <div style={{ width: "70%", height: 3, background: "#f59e0b", borderRadius: 2, marginBottom: 2, opacity: 0.8 }} />
      )}
      <div style={{ fontSize: state === "closed" ? "1.05rem" : "1.3rem", fontWeight: 800, color: "#fff" }}>
        {state === "correct" ? "💰" : state === "wrong" ? "💨" : state === "reveal" ? "✅" : value}
      </div>
      {(state === "correct" || state === "reveal") && (
        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>{value}</div>
      )}
      {/* Clasp */}
      {state === "closed" && (
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", border: "2px solid #92400e", position: "absolute", bottom: 6 }} />
      )}
    </div>
  );
}

export default function TimesTableGame({ title }: { title: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("kids");
  const [question, setQuestion] = useState<Question | null>(null);
  const [chestStates, setChestStates] = useState<ChestState[]>(Array(9).fill("closed"));
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ADULT_SECS);
  const [timerKey, setTimerKey] = useState(0);

  const loadQuestion = useCallback((nextRound: number, m: Mode) => {
    if (nextRound >= TOTAL_ROUNDS) { setPhase("over"); return; }
    const q = genQuestion(m);
    setQuestion(q);
    setChestStates(Array(9).fill("closed"));
    setResult(null);
    setRound(nextRound);
    setTimeLeft(ADULT_SECS);
    setTimerKey(k => k + 1);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setPhase("playing");
    loadQuestion(0, mode);
  }, [mode, loadQuestion]);

  // Adult timer
  useEffect(() => {
    if (phase !== "playing" || mode === "kids" || result !== null || !question) return;
    if (timeLeft <= 0) {
      // Time's up — reveal correct and mark wrong
      const answerIdx = question.choices.indexOf(question.answer);
      setChestStates(prev => prev.map((s, i) => i === answerIdx ? "reveal" : s));
      setResult("wrong");
      setStreak(0);
      return;
    }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey, timeLeft, phase, mode, result]);

  const handleChest = useCallback((idx: number) => {
    if (!question || result !== null || chestStates[idx] !== "closed") return;
    const chosen = question.choices[idx];
    const correct = chosen === question.answer;

    if (correct) {
      setChestStates(prev => prev.map((s, i) => i === idx ? "correct" : s));
      setResult("correct");
      setScore(s => s + (streak >= 2 ? 15 : 10));
      setStreak(st => st + 1);
    } else {
      const answerIdx = question.choices.indexOf(question.answer);
      setChestStates(prev => prev.map((s, i) =>
        i === idx ? "wrong" : i === answerIdx ? "reveal" : s
      ));
      setResult("wrong");
      setStreak(0);
    }
  }, [question, result, chestStates, streak]);

  useEffect(() => {
    if (result === null) return;
    const t = setTimeout(() => loadQuestion(round + 1, mode), 1500);
    return () => clearTimeout(t);
  }, [result, round, mode, loadQuestion]);

  const streakLabel = streak >= 5 ? "🔥🔥 ON FIRE!" : streak >= 3 ? "🔥 Hot streak!" : streak >= 2 ? "⚡ Combo!" : "";
  const timerPct = (timeLeft / ADULT_SECS) * 100;

  return (
    <div className={styles.gameInner}>
      <style>{KF}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button key={m} className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { if (phase !== "playing") setMode(m); }}>
            {m === "kids" ? "🧒 Kids (×2–×9)" : "🧑 Adult (×2–×12, timed)"}
          </button>
        ))}
      </div>

      {/* Stats */}
      {phase === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.88rem", padding: "0.3rem 0.6rem", background: "rgba(255,255,255,0.04)", borderRadius: 8, marginBottom: 4 }}>
          <span style={{ color: "var(--text-secondary)" }}>Round {round + 1}/{TOTAL_ROUNDS}</span>
          <span style={{ fontWeight: 700 }}>⭐ {score}</span>
          {streakLabel && <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.8rem" }}>{streakLabel}</span>}
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < round ? "#34d399" : i === round ? "#f59e0b" : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "0.6rem", justifyContent: "center" }}>

        {/* Idle */}
        {phase === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>🏴‍☠️</div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 300 }}>
              {mode === "kids"
                ? "A pirate hid treasure in 9 chests! Tap the chest that holds the correct multiplication answer. Beware the decoys!"
                : "Nine chests, one correct answer — and only 10 seconds per round! Build your streak for bonus points."}
            </p>
            <button className={styles.resetBtn} onClick={startGame} style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>🏴‍☠️ Start!</button>
          </div>
        )}

        {/* Game Over */}
        {phase === "over" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>{score >= 120 ? "🏆" : score >= 80 ? "⭐" : "💪"}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{score} / {TOTAL_ROUNDS * 10}</div>
            <div style={{ color: "var(--text-secondary)" }}>
              {score >= 140 ? "Times table master! 🔥" : score >= 100 ? "Great work, pirate!" : score >= 70 ? "Getting warmer!" : "X marks the spot — keep going!"}
            </div>
            <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: "0.5rem" }}>▶ Play Again</button>
          </div>
        )}

        {/* Playing */}
        {phase === "playing" && question && (
          <>
            {/* Adult timer bar */}
            {mode === "adult" && (
              <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${timerPct}%`,
                  background: timeLeft <= 3 ? "#ef4444" : timeLeft <= 6 ? "#f59e0b" : "#34d399",
                  borderRadius: 3,
                  transition: "width 1s linear, background 0.3s",
                  animation: timeLeft <= 3 ? "timerPulse 0.5s infinite" : "none",
                }} />
              </div>
            )}

            {/* Question */}
            <div style={{ textAlign: "center", padding: "0.5rem", background: "rgba(255,255,255,0.04)", borderRadius: 12, animation: "ttPopIn 0.3s ease-out" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>🏴‍☠️ Find the treasure chest that holds:</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "0.04em" }}>
                {question.a} × {question.b} = <span style={{ color: "#f59e0b" }}>?</span>
              </div>
              {mode === "adult" && result === null && (
                <div style={{ fontSize: "0.75rem", color: timeLeft <= 3 ? "#ef4444" : "var(--text-muted)", marginTop: 4, animation: timeLeft <= 3 ? "timerPulse 0.5s infinite" : "none" }}>
                  {timeLeft}s remaining
                </div>
              )}
            </div>

            {/* Chest grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", animation: "ttPopIn 0.35s ease-out" }}>
              {question.choices.map((val, i) => (
                <Chest key={`${round}-${i}`} value={val} state={chestStates[i]} onClick={() => handleChest(i)} />
              ))}
            </div>

            {/* Feedback */}
            {result && (
              <div style={{ textAlign: "center", fontWeight: 600, fontSize: "0.92rem", color: result === "correct" ? "#34d399" : "#f87171" }}>
                {result === "correct"
                  ? `✅ ${question.a} × ${question.b} = ${question.answer}! ${streak >= 3 ? "🔥" : ""}`
                  : `❌ ${question.a} × ${question.b} = ${question.answer}`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
