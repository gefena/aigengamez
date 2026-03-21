"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../app/games/[id]/page.module.css";

type Phase = "idle" | "playing" | "over";
type Mode = "kids" | "adult";
type Result = "correct" | "wrong" | null;

interface Puzzle {
  N: number;       // total slices on pizza
  num: number;     // fraction numerator
  D: number;       // fraction denominator
  target: number;  // slices to select (= num * k)
}

const TOTAL_ROUNDS = 8;

function rand(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function genPuzzle(mode: Mode): Puzzle {
  const denoms = mode === "kids" ? [2, 3, 4] : [2, 3, 4, 5, 6];
  const D = denoms[rand(0, denoms.length - 1)];
  const num = rand(1, D - 1);
  // Adult: multiplier makes the pizza have more slices than the denominator
  // (tests equivalent-fraction thinking — "2/3" on a 6-slice pizza = select 4)
  const k = mode === "kids" ? 1 : rand(1, 2);
  return { N: D * k, num, D, target: num * k };
}

function slicePath(cx: number, cy: number, R: number, i: number, n: number): string {
  const a0 = (i * 2 * Math.PI) / n - Math.PI / 2;
  const a1 = ((i + 1) * 2 * Math.PI) / n - Math.PI / 2;
  const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
  const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

// Topping dots scattered within each slice (decorative)
function toppingDots(cx: number, cy: number, R: number, i: number, n: number): { x: number; y: number }[] {
  const midAngle = ((i + 0.5) * 2 * Math.PI) / n - Math.PI / 2;
  const r = R * 0.55;
  return [
    { x: cx + r * Math.cos(midAngle - 0.3), y: cy + r * Math.sin(midAngle - 0.3) },
    { x: cx + r * 0.55 * Math.cos(midAngle + 0.25), y: cy + r * 0.55 * Math.sin(midAngle + 0.25) },
  ];
}

const KF = `
@keyframes fsCorrect { 0%{transform:scale(1)} 40%{transform:scale(1.06)} 100%{transform:scale(1)} }
@keyframes fsWrong   { 0%{} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} 100%{} }
@keyframes popIn     { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
`;

export default function FractionSlicesGame({ title }: { title: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("kids");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [slices, setSlices] = useState<boolean[]>([]);
  const [result, setResult] = useState<Result>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [pizzaAnim, setPizzaAnim] = useState("");

  const loadPuzzle = useCallback((nextRound: number, m: Mode) => {
    if (nextRound >= TOTAL_ROUNDS) { setPhase("over"); return; }
    const p = genPuzzle(m);
    setPuzzle(p);
    setSlices(Array(p.N).fill(false));
    setResult(null);
    setPizzaAnim("");
    setRound(nextRound);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setPhase("playing");
    loadPuzzle(0, mode);
  }, [mode, loadPuzzle]);

  const toggleSlice = useCallback((i: number) => {
    if (result !== null) return;
    setSlices(prev => { const next = [...prev]; next[i] = !next[i]; return next; });
  }, [result]);

  const checkAnswer = useCallback(() => {
    if (!puzzle || result !== null) return;
    const selected = slices.filter(Boolean).length;
    const correct = selected === puzzle.target;
    setResult(correct ? "correct" : "wrong");
    setPizzaAnim(correct ? "correct" : "wrong");
    if (correct) setScore(s => s + 10);
  }, [puzzle, slices, result]);

  useEffect(() => {
    if (result === null) return;
    const t = setTimeout(() => loadPuzzle(round + 1, mode), 1600);
    return () => clearTimeout(t);
  }, [result, round, mode, loadPuzzle]);

  const selected = slices.filter(Boolean).length;
  const cx = 100, cy = 100, R = 88, crustR = 96;

  return (
    <div className={styles.gameInner}>
      <style>{KF}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button key={m} className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { if (phase === "idle") setMode(m); }}>
            {m === "kids" ? "🧒 Kids (½ ⅓ ¼)" : "🧑 Adult (equiv. fractions)"}
          </button>
        ))}
      </div>

      {/* Progress */}
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

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", justifyContent: "center" }}>

        {/* Idle */}
        {phase === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem" }}>🍕</div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 300 }}>
              {mode === "kids"
                ? "A pizza appears sliced into equal pieces. Tap the right number of slices to match the fraction shown!"
                : "The pizza has more slices than the fraction's denominator — you'll need to think about equivalent fractions!"}
            </p>
            <button className={styles.resetBtn} onClick={startGame} style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>🍕 Start!</button>
          </div>
        )}

        {/* Game Over */}
        {phase === "over" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>{score >= 70 ? "🏆" : score >= 40 ? "⭐" : "💪"}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{score} / {TOTAL_ROUNDS * 10}</div>
            <div style={{ color: "var(--text-secondary)" }}>
              {score >= 80 ? "Pizza perfection! 🍕🔥" : score >= 60 ? "Great fraction sense!" : score >= 40 ? "Getting slicier!" : "Keep practicing!"}
            </div>
            <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: "0.5rem" }}>▶ Play Again</button>
          </div>
        )}

        {/* Puzzle */}
        {phase === "playing" && puzzle && (
          <>
            {/* Fraction display */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Shade this fraction of the pizza:</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                <span style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)" }}>{puzzle.num}</span>
                <div style={{ width: 32, height: 3, background: "var(--accent-secondary)", borderRadius: 2 }} />
                <span style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)" }}>{puzzle.D}</span>
              </div>
              {puzzle.N !== puzzle.D && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  (pizza has {puzzle.N} slices)
                </div>
              )}
            </div>

            {/* Pizza SVG */}
            <div style={{
              animation: pizzaAnim === "correct"
                ? "fsCorrect 0.6s ease-out"
                : pizzaAnim === "wrong"
                  ? "fsWrong 0.45s ease-out"
                  : "none",
            }}>
              <svg
                width={200} height={200} viewBox="0 0 200 200"
                style={{ display: "block", filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))", animation: "popIn 0.4s ease-out" }}
              >
                {/* Crust ring */}
                <circle cx={cx} cy={cy} r={crustR} fill="#92400e" />

                {/* Slices */}
                {Array.from({ length: puzzle.N }).map((_, i) => {
                  const isSelected = slices[i];
                  const showCorrect = result === "correct" && isSelected;
                  const showWrong = result === "wrong" && isSelected && selected !== puzzle.target;
                  return (
                    <g key={i} onClick={() => toggleSlice(i)} style={{ cursor: result !== null ? "default" : "pointer" }}>
                      <path
                        d={slicePath(cx, cy, R, i, puzzle.N)}
                        fill={
                          result !== null && i < puzzle.target
                            ? "rgba(52,211,153,0.7)"   // reveal correct on result
                            : isSelected
                              ? showCorrect ? "#16a34a" : showWrong ? "#dc2626" : "#ec4899"
                              : "#f59e0b"
                        }
                        stroke="#78350f"
                        strokeWidth={2}
                        style={{ transition: "fill 0.15s" }}
                      />
                      {/* Topping dots */}
                      {!isSelected && toppingDots(cx, cy, R, i, puzzle.N).map((dot, di) => (
                        <circle key={di} cx={dot.x} cy={dot.y} r={3.5} fill="#dc2626" opacity={0.7} />
                      ))}
                    </g>
                  );
                })}

                {/* Center */}
                <circle cx={cx} cy={cy} r={7} fill="#78350f" />
              </svg>
            </div>

            {/* Selection counter */}
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              {selected} / {puzzle.N} slices selected
              {result === null && selected > 0 && selected !== puzzle.target && (
                <span style={{ color: selected > puzzle.target ? "#f87171" : "var(--text-muted)", marginLeft: 6 }}>
                  {selected > puzzle.target ? "(too many)" : "(too few)"}
                </span>
              )}
            </div>

            {/* Check button */}
            {result === null && (
              <button
                className={styles.resetBtn}
                onClick={checkAnswer}
                disabled={selected === 0}
                style={{ padding: "0.6rem 2rem", opacity: selected === 0 ? 0.4 : 1 }}
              >
                ✓ Check
              </button>
            )}

            {/* Feedback */}
            {result && (
              <div style={{ textAlign: "center", fontWeight: 600, fontSize: "0.92rem", color: result === "correct" ? "#34d399" : "#f87171" }}>
                {result === "correct"
                  ? `✅ Correct! ${puzzle.num}/${puzzle.D}${puzzle.N !== puzzle.D ? ` = ${puzzle.target}/${puzzle.N}` : ""} 🍕`
                  : `❌ ${puzzle.num}/${puzzle.D} = ${puzzle.target} out of ${puzzle.N} slices`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
