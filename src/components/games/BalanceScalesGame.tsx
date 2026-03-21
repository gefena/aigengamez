"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../app/games/[id]/page.module.css";

type Phase = "idle" | "playing" | "over";
type Mode = "kids" | "adult";
type Result = "correct" | "wrong" | null;

interface Puzzle {
  mystery: number;
  nBoxes: number;
  extrasLeft: number[];
  rightWeights: number[];
  choices: number[];
}

const TOTAL_ROUNDS = 8;

function rand(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeWeights(total: number): number[] {
  if (total <= 8) return [total];
  const n = rand(2, 3);
  const parts: number[] = [];
  let rem = total;
  for (let i = 0; i < n - 1; i++) {
    const chunk = rand(1, rem - (n - 1 - i));
    parts.push(chunk);
    rem -= chunk;
  }
  parts.push(rem);
  return parts;
}

function genPuzzle(mode: Mode): Puzzle {
  let mystery: number, nBoxes: number, extrasLeft: number[];

  if (mode === "kids") {
    mystery = rand(1, 15);
    nBoxes = 1;
    const n = rand(0, 2);
    extrasLeft = Array.from({ length: n }, () => rand(1, 5));
  } else {
    mystery = rand(2, 10);
    nBoxes = rand(2, 4);
    extrasLeft = Math.random() > 0.45 ? [rand(1, 8)] : [];
  }

  const rightTotal = nBoxes * mystery + extrasLeft.reduce((a, b) => a + b, 0);
  const rightWeights = makeWeights(rightTotal);

  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const offset = rand(1, 5) * (Math.random() > 0.5 ? 1 : -1);
    const w = mystery + offset;
    if (w > 0 && w !== mystery) wrongs.add(w);
  }

  return {
    mystery, nBoxes, extrasLeft, rightWeights,
    choices: shuffle([mystery, ...Array.from(wrongs)]),
  };
}

function weightColor(w: number): string {
  if (w <= 3) return "#60a5fa";
  if (w <= 7) return "#34d399";
  if (w <= 12) return "#f59e0b";
  return "#f87171";
}

const KF = `
@keyframes scCorrect { 0%{transform:rotate(0)} 20%{transform:rotate(-6deg)} 50%{transform:rotate(5deg)} 75%{transform:rotate(-3deg)} 100%{transform:rotate(0)} }
@keyframes scWrong   { 0%{transform:rotate(0)} 25%{transform:rotate(-12deg)} 75%{transform:rotate(12deg)} 100%{transform:rotate(0)} }
@keyframes popIn     { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
`;

function WeightBlocks({ weights }: { weights: number[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 3 }}>
      {weights.map((w, i) => (
        <div key={i} style={{ background: weightColor(w), borderRadius: 6, padding: "4px 10px", fontSize: "0.8rem", fontWeight: 700, color: "#fff", minWidth: 40, textAlign: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", animation: "popIn 0.3s ease-out" }}>
          {w}kg
        </div>
      ))}
    </div>
  );
}

function MysteryBoxes({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ width: 38, height: 38, background: "linear-gradient(135deg,#7c3aed,#a855f7)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", fontWeight: 900, color: "#fff", boxShadow: "0 2px 8px rgba(109,40,217,0.5)", animation: "popIn 0.3s ease-out" }}>
          ?
        </div>
      ))}
    </div>
  );
}

export default function BalanceScalesGame({ title }: { title: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("kids");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [beamAnim, setBeamAnim] = useState("");

  const loadPuzzle = useCallback((nextRound: number, m: Mode) => {
    if (nextRound >= TOTAL_ROUNDS) { setPhase("over"); return; }
    setPuzzle(genPuzzle(m));
    setResult(null);
    setSelected(null);
    setBeamAnim("");
    setRound(nextRound);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setPhase("playing");
    loadPuzzle(0, mode);
  }, [mode, loadPuzzle]);

  const handleAnswer = useCallback((choice: number) => {
    if (result !== null || !puzzle) return;
    setSelected(choice);
    const correct = choice === puzzle.mystery;
    setResult(correct ? "correct" : "wrong");
    setBeamAnim(correct ? "correct" : "wrong");
    if (correct) setScore(s => s + 10);
  }, [result, puzzle]);

  // Advance after showing result
  useEffect(() => {
    if (result === null) return;
    const t = setTimeout(() => loadPuzzle(round + 1, mode), 1400);
    return () => clearTimeout(t);
  }, [result, round, mode, loadPuzzle]);

  if (!puzzle && phase === "playing") return null;

  const rightTotal = puzzle ? puzzle.rightWeights.reduce((a, b) => a + b, 0) : 0;

  const eqLeft = puzzle
    ? puzzle.nBoxes > 1
      ? `${puzzle.nBoxes}×? ${puzzle.extrasLeft.length ? `+ ${puzzle.extrasLeft.join("+")}` : ""}`
      : `? ${puzzle.extrasLeft.length ? `+ ${puzzle.extrasLeft.join("+")}` : ""}`
    : "";

  return (
    <div className={styles.gameInner}>
      <style>{KF}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button key={m} className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { if (phase !== "playing") setMode(m); }}>
            {m === "kids" ? "🧒 Kids" : "🧑 Adult (algebra)"}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {phase === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.88rem", padding: "0.3rem 0.6rem", background: "rgba(255,255,255,0.04)", borderRadius: 8, marginBottom: 4 }}>
          <span style={{ color: "var(--text-secondary)" }}>Round {round + 1}/{TOTAL_ROUNDS}</span>
          <span style={{ fontWeight: 700 }}>⭐ {score}</span>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < round ? "#34d399" : i === round ? "#f59e0b" : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "0.75rem", justifyContent: "center" }}>

        {/* Idle */}
        {phase === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem" }}>⚖️</div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 300 }}>
              {mode === "kids"
                ? "The scale is balanced! Find the weight of the mystery box 📦."
                : "Multiple mystery boxes — all the same weight. Solve for the unknown like an algebra problem!"}
            </p>
            <button className={styles.resetBtn} onClick={startGame} style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>⚖️ Start!</button>
          </div>
        )}

        {/* Game Over */}
        {phase === "over" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>{score >= 70 ? "🏆" : score >= 40 ? "⭐" : "💪"}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{score} / {TOTAL_ROUNDS * 10}</div>
            <div style={{ color: "var(--text-secondary)" }}>
              {score >= 80 ? "Perfect balance! 🔥" : score >= 60 ? "Great algebra thinking!" : score >= 40 ? "Getting there!" : "Keep practicing!"}
            </div>
            <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: "0.5rem" }}>▶ Play Again</button>
          </div>
        )}

        {/* Puzzle */}
        {phase === "playing" && puzzle && (
          <>
            {/* Scale visual */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", padding: "1rem 0.75rem 0.6rem" }}>
              {/* Equation hint */}
              <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 8 }}>
                {eqLeft} = {rightTotal}
              </div>

              {/* Pans */}
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", minHeight: 90, marginBottom: 6 }}>
                {/* Left — mystery side */}
                <div style={{ width: "42%", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <MysteryBoxes n={puzzle.nBoxes} />
                  {puzzle.extrasLeft.length > 0 && <WeightBlocks weights={puzzle.extrasLeft} />}
                  <div style={{ width: "88%", height: 5, background: "rgba(255,255,255,0.3)", borderRadius: "0 0 6px 6px" }} />
                </div>

                {/* Pivot */}
                <span style={{ fontSize: "1.6rem", opacity: 0.6, paddingBottom: 4 }}>⚖️</span>

                {/* Right — known weights */}
                <div style={{ width: "42%", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <WeightBlocks weights={puzzle.rightWeights} />
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{rightTotal}kg total</div>
                  <div style={{ width: "88%", height: 5, background: "rgba(255,255,255,0.3)", borderRadius: "0 0 6px 6px" }} />
                </div>
              </div>

              {/* Beam */}
              <div style={{ padding: "0 1rem" }}>
                <div style={{
                  height: 7, borderRadius: 4,
                  background: "linear-gradient(90deg,rgba(255,255,255,0.2),rgba(255,255,255,0.6),rgba(255,255,255,0.2))",
                  transformOrigin: "center",
                  animation: beamAnim === "correct" ? "scCorrect 0.65s ease-out" : beamAnim === "wrong" ? "scWrong 0.5s ease-out" : "none",
                }} />
              </div>
            </div>

            {/* Question */}
            <div style={{ textAlign: "center", fontWeight: 600, fontSize: "0.95rem" }}>
              {puzzle.nBoxes > 1
                ? `All ${puzzle.nBoxes} boxes weigh the same. How much is each one?`
                : `How much does the mystery box weigh?`}
            </div>

            {/* Choices */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              {puzzle.choices.map(c => {
                const isCorrect = result !== null && c === puzzle.mystery;
                const isWrong = selected === c && result === "wrong";
                return (
                  <button key={c} onClick={() => handleAnswer(c)} disabled={result !== null}
                    style={{
                      padding: "0.65rem", borderRadius: 10, fontWeight: 700, fontSize: "1.1rem", cursor: result !== null ? "default" : "pointer",
                      border: `2px solid ${isCorrect ? "#34d399" : isWrong ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                      background: isCorrect ? "rgba(52,211,153,0.2)" : isWrong ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                      color: "var(--text-primary)", transition: "all 0.15s",
                    }}>
                    {c} kg
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {result && (
              <div style={{ textAlign: "center", fontWeight: 600, fontSize: "0.92rem", color: result === "correct" ? "#34d399" : "#f87171" }}>
                {result === "correct"
                  ? `✅ Correct! ${puzzle.nBoxes > 1 ? `${puzzle.nBoxes} × ${puzzle.mystery}${puzzle.extrasLeft.length ? ` + ${puzzle.extrasLeft.join("+")}` : ""} = ${rightTotal}` : `Box = ${puzzle.mystery}kg`}`
                  : `❌ The answer was ${puzzle.mystery}kg`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
