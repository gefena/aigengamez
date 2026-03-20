"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

type Phase = "idle" | "playing" | "over";
type Difficulty = "kids" | "adult";
type GateType = "AND" | "OR" | "XOR" | "NOT" | "NAND" | "NOR";

function applyGate(gate: GateType, inputs: number[]): number {
  switch (gate) {
    case "AND":  return inputs.every(x => x === 1) ? 1 : 0;
    case "OR":   return inputs.some(x => x === 1) ? 1 : 0;
    case "XOR":  return inputs.reduce((a, b) => a ^ b, 0);
    case "NOT":  return inputs[0] === 1 ? 0 : 1;
    case "NAND": return inputs.every(x => x === 1) ? 0 : 1;
    case "NOR":  return inputs.some(x => x === 1) ? 0 : 1;
  }
}

// ─── Kids puzzles: show gate + inputs, answer ON or OFF ──────────────────────
interface KidsPuzzle {
  gate: GateType;
  inputs: { label: string; value: number }[];
  explanation: string;
}

const KIDS_PUZZLES: KidsPuzzle[] = [
  { gate: "AND", inputs: [{ label: "A", value: 1 }, { label: "B", value: 1 }],
    explanation: "AND gate: output is ON only when ALL inputs are ON. Both are ON → 💡 ON!" },
  { gate: "AND", inputs: [{ label: "A", value: 1 }, { label: "B", value: 0 }],
    explanation: "AND gate: output is ON only when ALL inputs are ON. B is OFF → ⬛ OFF." },
  { gate: "OR",  inputs: [{ label: "A", value: 0 }, { label: "B", value: 1 }],
    explanation: "OR gate: output is ON when AT LEAST ONE input is ON. B is ON → 💡 ON!" },
  { gate: "OR",  inputs: [{ label: "A", value: 0 }, { label: "B", value: 0 }],
    explanation: "OR gate: output is ON when at least one input is ON. Both OFF → ⬛ OFF." },
  { gate: "NOT", inputs: [{ label: "A", value: 1 }],
    explanation: "NOT gate: it FLIPS the input! A is ON → output is ⬛ OFF." },
  { gate: "NOT", inputs: [{ label: "A", value: 0 }],
    explanation: "NOT gate: it FLIPS the input! A is OFF → output is 💡 ON!" },
  { gate: "XOR", inputs: [{ label: "A", value: 1 }, { label: "B", value: 0 }],
    explanation: "XOR gate: ON when inputs are DIFFERENT. A≠B → 💡 ON!" },
  { gate: "XOR", inputs: [{ label: "A", value: 1 }, { label: "B", value: 1 }],
    explanation: "XOR gate: ON when inputs are DIFFERENT. Both same → ⬛ OFF." },
];

// ─── Adult puzzles: test rows → pick the matching gate ───────────────────────
interface TestRow { inputs: number[]; output: number; }
interface AdultPuzzle {
  title: string;
  inputLabels: string[];
  rows: TestRow[];
  answer: GateType;
  palette: GateType[];
  explanation: string;
}

const ADULT_PUZZLES: AdultPuzzle[] = [
  { title: "Mystery Gate #1", inputLabels: ["A","B"],
    rows: [{ inputs:[1,1], output:1 }, { inputs:[1,0], output:0 }],
    answer: "AND", palette: ["AND","OR","XOR","NAND"],
    explanation: "AND: output is 1 only when ALL inputs are 1." },
  { title: "Mystery Gate #2", inputLabels: ["A","B"],
    rows: [{ inputs:[0,1], output:1 }, { inputs:[0,0], output:0 }, { inputs:[1,1], output:1 }],
    answer: "OR", palette: ["AND","OR","XOR","NOR"],
    explanation: "OR: output is 1 when AT LEAST ONE input is 1." },
  { title: "Mystery Gate #3", inputLabels: ["A","B"],
    rows: [{ inputs:[1,0], output:1 }, { inputs:[1,1], output:0 }, { inputs:[0,0], output:0 }],
    answer: "XOR", palette: ["AND","OR","XOR"],
    explanation: "XOR (Exclusive OR): output is 1 only when inputs are DIFFERENT." },
  { title: "Mystery Gate #4", inputLabels: ["A"],
    rows: [{ inputs:[1], output:0 }, { inputs:[0], output:1 }],
    answer: "NOT", palette: ["NOT","AND","OR"],
    explanation: "NOT: inverts the input. 1→0, 0→1." },
  { title: "Mystery Gate #5", inputLabels: ["A","B"],
    rows: [{ inputs:[1,1], output:0 }, { inputs:[0,0], output:1 }],
    answer: "NAND", palette: ["AND","OR","NAND","XOR"],
    explanation: "NAND (NOT AND): output is 0 only when ALL inputs are 1." },
  { title: "Mystery Gate #6", inputLabels: ["A","B"],
    rows: [{ inputs:[0,0], output:1 }, { inputs:[0,1], output:0 }],
    answer: "NOR", palette: ["OR","NOR","NAND","AND"],
    explanation: "NOR (NOT OR): output is 1 only when ALL inputs are 0." },
  { title: "Mystery Gate #7", inputLabels: ["A","B"],
    rows: [{ inputs:[0,1], output:0 }, { inputs:[1,1], output:1 }, { inputs:[0,0], output:0 }],
    answer: "AND", palette: ["AND","OR","XOR","NAND","NOR"],
    explanation: "AND again — it's the only gate giving 0 for (0,1) but 1 for (1,1)." },
  { title: "Mystery Gate #8", inputLabels: ["A","B"],
    rows: [{ inputs:[0,0], output:1 }, { inputs:[1,0], output:0 }, { inputs:[1,1], output:0 }],
    answer: "NOR", palette: ["AND","OR","NAND","NOR","XOR"],
    explanation: "NOR: the only gate that outputs 1 exclusively when ALL inputs are 0." },
];

const GATE_COLOR: Record<GateType, string> = {
  AND: "#3b82f6", OR: "#22c55e", XOR: "#a855f7",
  NOT: "#f97316", NAND: "#ef4444", NOR: "#ec4899",
};

const KEYFRAMES = `
@keyframes lg-shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}
@keyframes lg-pop { 0% { transform: scale(1); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes lg-glow { 0%,100% { filter: drop-shadow(0 0 6px rgba(251,191,36,.5)); } 50% { filter: drop-shadow(0 0 18px rgba(251,191,36,1)); } }
`;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function GateChip({ gate }: { gate: GateType }) {
  return (
    <div style={{
      padding: "0.35rem 0.7rem", borderRadius: 6, fontWeight: 800, fontSize: "0.8rem",
      background: `${GATE_COLOR[gate]}22`, border: `2px solid ${GATE_COLOR[gate]}`,
      color: GATE_COLOR[gate], letterSpacing: "0.04em", flexShrink: 0,
    }}>{gate}</div>
  );
}

function SignalBadge({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>{label}</span>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", fontWeight: 800, fontSize: "0.85rem",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: value === 1 ? "#3b82f6" : "var(--bg-primary)",
        border: `2px solid ${value === 1 ? "#3b82f6" : "var(--border-color)"}`,
        color: value === 1 ? "white" : "var(--text-secondary)",
      }}>{value}</div>
    </div>
  );
}

function Arrow({ lit }: { lit?: boolean }) {
  return (
    <div style={{
      fontSize: "1.2rem", color: lit ? "#fbbf24" : "var(--border-color)",
      transition: "color 0.3s", userSelect: "none", flexShrink: 0,
    }}>→</div>
  );
}

function Lamp({ on }: { on: boolean }) {
  return (
    <div style={{
      fontSize: "1.8rem", flexShrink: 0,
      animation: on ? "lg-glow 1.2s ease-in-out infinite" : "none",
    }}>{on ? "💡" : "⬛"}</div>
  );
}

export default function LogicGatesGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("kids");
  const [phase, setPhase] = useState<Phase>("idle");

  // Kids state
  const [kPuzzles, setKPuzzles] = useState<KidsPuzzle[]>([]);
  const [kIdx, setKIdx] = useState(0);
  const [kAnswer, setKAnswer] = useState<"on" | "off" | null>(null);
  const [kCorrect, setKCorrect] = useState<boolean | null>(null);
  const [kLives, setKLives] = useState(3);
  const [kScore, setKScore] = useState(0);

  // Adult state
  const [aPuzzles, setAPuzzles] = useState<AdultPuzzle[]>([]);
  const [aIdx, setAIdx] = useState(0);
  const [aSelected, setASelected] = useState<GateType | null>(null);
  const [aCorrect, setACorrect] = useState<boolean | null>(null);
  const [aLives, setALives] = useState(3);
  const [aScore, setAScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);

  const diffRef = useRef<Difficulty>("kids");
  const phaseRef = useRef<Phase>("idle");
  const kIdxRef = useRef(0);
  const kPuzzlesRef = useRef<KidsPuzzle[]>([]);
  const kLivesRef = useRef(3);
  const kScoreRef = useRef(0);
  const aIdxRef = useRef(0);
  const aPuzzlesRef = useRef<AdultPuzzle[]>([]);
  const aLivesRef = useRef(3);
  const aScoreRef = useRef(0);
  const timeRef = useRef(90);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const endGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("over");
  }, []);

  const tickTimer = useCallback(() => {
    timeRef.current -= 1;
    setTimeLeft(timeRef.current);
    if (timeRef.current <= 0) endGame();
    else timerRef.current = setTimeout(tickTimer, 1000);
  }, [endGame]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    lockedRef.current = false;
    if (diffRef.current === "kids") {
      const p = shuffle(KIDS_PUZZLES);
      kPuzzlesRef.current = p; setKPuzzles(p);
      kIdxRef.current = 0; setKIdx(0);
      kLivesRef.current = 3; setKLives(3);
      kScoreRef.current = 0; setKScore(0);
      setKAnswer(null); setKCorrect(null);
    } else {
      const p = shuffle(ADULT_PUZZLES);
      aPuzzlesRef.current = p; setAPuzzles(p);
      aIdxRef.current = 0; setAIdx(0);
      aLivesRef.current = 3; setALives(3);
      aScoreRef.current = 0; setAScore(0);
      timeRef.current = 90; setTimeLeft(90);
      setASelected(null); setACorrect(null);
      timerRef.current = setTimeout(tickTimer, 1000);
    }
    setPhase("playing");
  }, [tickTimer]);

  const advanceKids = useCallback(() => {
    const next = kIdxRef.current + 1;
    if (next >= kPuzzlesRef.current.length) { endGame(); return; }
    kIdxRef.current = next; setKIdx(next);
    setKAnswer(null); setKCorrect(null);
    lockedRef.current = false;
  }, [endGame]);

  const advanceAdult = useCallback(() => {
    const next = aIdxRef.current + 1;
    if (next >= aPuzzlesRef.current.length) { endGame(); return; }
    aIdxRef.current = next; setAIdx(next);
    setASelected(null); setACorrect(null);
    lockedRef.current = false;
  }, [endGame]);

  const handleKidsAnswer = useCallback((answer: "on" | "off") => {
    if (lockedRef.current || phaseRef.current !== "playing") return;
    lockedRef.current = true;
    const p = kPuzzlesRef.current[kIdxRef.current];
    const output = applyGate(p.gate, p.inputs.map(i => i.value));
    const correct = (answer === "on") === (output === 1);
    setKAnswer(answer); setKCorrect(correct);
    if (correct) { kScoreRef.current += 100; setKScore(kScoreRef.current); }
    else {
      kLivesRef.current -= 1; setKLives(kLivesRef.current);
      if (kLivesRef.current <= 0) { setTimeout(endGame, 1600); return; }
    }
    setTimeout(advanceKids, 1600);
  }, [advanceKids, endGame]);

  const handleGateSelect = useCallback((gate: GateType) => {
    if (lockedRef.current || phaseRef.current !== "playing") return;
    lockedRef.current = true;
    const p = aPuzzlesRef.current[aIdxRef.current];
    const correct = gate === p.answer;
    setASelected(gate); setACorrect(correct);
    if (correct) { aScoreRef.current += 100; setAScore(aScoreRef.current); }
    else {
      aLivesRef.current -= 1; setALives(aLivesRef.current);
      if (aLivesRef.current <= 0) { setTimeout(endGame, 1600); return; }
    }
    setTimeout(advanceAdult, 1600);
  }, [advanceAdult, endGame]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const kPuzzle = kPuzzles[kIdx];
  const aPuzzle = aPuzzles[aIdx];
  const finalScore = difficulty === "kids" ? kScore : aScore;

  return (
    <div className={styles.gameInner} style={{ justifyContent: "flex-start" }}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["kids", "adult"] as Difficulty[]).map(d => (
          <button key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => { if (phase !== "playing") { setDifficulty(d); setPhase("idle"); } }}
          >{d === "kids" ? "🧒 Kids" : "💡 Adult"}</button>
        ))}
      </div>

      {/* ── Idle ─────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1.5rem", padding: "0 1rem" }}>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center" }}>
            {(["AND","OR","XOR","NOT","NAND","NOR"] as GateType[]).map(g => <GateChip key={g} gate={g} />)}
          </div>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", maxWidth: 340, margin: 0, lineHeight: 1.5 }}>
            {difficulty === "kids"
              ? "Look at the gate and the inputs — will the lamp be ON or OFF? Learn AND, OR, NOT, and XOR gates! 💡"
              : "Each puzzle shows test cases. Identify which mystery gate satisfies ALL of them. 90 seconds, 100 pts each!"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>
            {difficulty === "kids" ? "💡 Start!" : "🔬 Start Hunt"}
          </button>
        </div>
      )}

      {/* ── Kids Playing ─────────────────────────────────────────────────── */}
      {phase === "playing" && difficulty === "kids" && kPuzzle && (() => {
        const output = applyGate(kPuzzle.gate, kPuzzle.inputs.map(i => i.value));
        const revealed = kAnswer !== null;
        return (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{kIdx + 1} / {kPuzzles.length}</span>
              <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>{kScore} pts</span>
              <span style={{ fontSize: "1rem" }}>{"❤️".repeat(kLives)}{"🖤".repeat(Math.max(0, 3 - kLives))}</span>
            </div>

            {/* Circuit — flex:1 playfield */}
            <div style={{
              flex: 1, minHeight: 0, width: "100%",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "1.25rem", background: "var(--bg-primary)", borderRadius: 12,
              border: "1px solid var(--border-color)", padding: "1rem", marginBottom: "0.5rem",
              animation: kCorrect === false ? "lg-shake 0.4s ease" : kCorrect === true ? "lg-pop 0.3s ease" : "none",
            }}>
              {/* Gate label */}
              <div style={{ fontWeight: 700, color: GATE_COLOR[kPuzzle.gate], fontSize: "0.9rem", letterSpacing: "0.05em" }}>
                {kPuzzle.gate} gate
              </div>

              {/* Circuit row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {/* Inputs */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {kPuzzle.inputs.map((inp, i) => <SignalBadge key={i} label={inp.label} value={inp.value} />)}
                </div>
                <Arrow lit={kPuzzle.inputs.some(i => i.value === 1)} />
                <GateChip gate={kPuzzle.gate} />
                <Arrow lit={revealed && output === 1} />
                <Lamp on={revealed && output === 1} />
              </div>

              {/* Explanation */}
              <div style={{
                minHeight: "2.5rem", fontSize: "0.82rem", textAlign: "center", lineHeight: 1.4,
                color: kCorrect === true ? "#86efac" : kCorrect === false ? "#fca5a5" : "transparent",
                padding: "0 0.5rem",
              }}>
                {kCorrect !== null ? kPuzzle.explanation : "."}
              </div>
            </div>

            {/* Answer buttons */}
            <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
              {(["on", "off"] as const).map(ans => (
                <button key={ans} onClick={() => handleKidsAnswer(ans)} disabled={kAnswer !== null}
                  style={{
                    flex: 1, padding: "0.75rem", borderRadius: 8, fontWeight: 700, fontSize: "1rem",
                    cursor: kAnswer !== null ? "default" : "pointer", transition: "all 0.15s",
                    border: "2px solid",
                    borderColor: kAnswer === ans ? (kCorrect ? "#22c55e" : "#ef4444") : "var(--border-color)",
                    background: kAnswer === ans ? (kCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)") : "var(--bg-secondary)",
                    color: "var(--text-primary)",
                  }}>
                  {ans === "on" ? "💡 ON" : "⬛ OFF"}
                </button>
              ))}
            </div>
          </>
        );
      })()}

      {/* ── Adult Playing ─────────────────────────────────────────────────── */}
      {phase === "playing" && difficulty === "adult" && aPuzzle && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "0.35rem" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{aIdx + 1} / {aPuzzles.length}</span>
            <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>{aScore} pts</span>
            <span style={{ color: timeLeft <= 15 ? "#ef4444" : "var(--text-secondary)", fontWeight: 600, fontSize: "0.9rem" }}>⏱ {timeLeft}s</span>
          </div>

          {/* Timer bar */}
          <div style={{ width: "100%", height: 3, background: "var(--border-color)", borderRadius: 2, marginBottom: "0.4rem", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2,
              width: `${(timeLeft / 90) * 100}%`,
              background: timeLeft <= 15 ? "#ef4444" : "var(--accent-primary)",
              transition: "width 1s linear, background 0.3s",
            }} />
          </div>

          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem", marginBottom: "0.4rem", width: "100%" }}>
            {aPuzzle.title}
          </div>

          {/* Main area — flex:1 */}
          <div style={{
            flex: 1, minHeight: 0, width: "100%", overflowY: "auto",
            display: "flex", flexDirection: "column", gap: "0.75rem",
            background: "var(--bg-primary)", borderRadius: 12,
            border: "1px solid var(--border-color)", padding: "0.75rem",
            marginBottom: "0.5rem",
            animation: aCorrect === false ? "lg-shake 0.4s ease" : "none",
          }}>
            {/* Circuit diagram */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {aPuzzle.inputLabels.map((lbl, i) => (
                  <div key={i} style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>{lbl}</div>
                ))}
              </div>
              <Arrow />
              {/* Mystery gate slot */}
              <div style={{
                width: 60, height: 40, borderRadius: 6, fontWeight: 800, fontSize: "0.82rem",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                border: "2px dashed",
                borderColor: aSelected ? (aCorrect ? "#22c55e" : "#ef4444") : "var(--accent-primary)",
                background: aSelected ? (aCorrect ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)") : "transparent",
                color: aSelected ? (aCorrect ? "#86efac" : "#fca5a5") : "var(--accent-primary)",
                transition: "all 0.3s",
              }}>
                {aSelected ?? "?"}
              </div>
              <Arrow lit={aSelected === aPuzzle.answer} />
              <Lamp on={aSelected === aPuzzle.answer} />
            </div>

            {/* Test rows */}
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Must satisfy all cases:
              </div>
              {aPuzzle.rows.map((row, ri) => {
                const rowResult = aSelected ? applyGate(aSelected, row.inputs) : null;
                const rowMatch = rowResult === row.output;
                return (
                  <div key={ri} style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.3rem 0.5rem", borderRadius: 6, marginBottom: 4,
                    background: aSelected ? (rowMatch ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)") : "var(--bg-secondary)",
                    fontFamily: "monospace", fontSize: "0.82rem",
                  }}>
                    {aPuzzle.inputLabels.map((lbl, i) => (
                      <span key={i} style={{ fontWeight: 700, color: "var(--text-primary)" }}>{lbl}={row.inputs[i]}</span>
                    ))}
                    <span style={{ color: "var(--text-secondary)", margin: "0 2px" }}>→</span>
                    <span style={{ fontWeight: 700, color: row.output === 1 ? "#fbbf24" : "var(--text-secondary)" }}>
                      {row.output === 1 ? "💡 1" : "⬛ 0"}
                    </span>
                    {aSelected && <span style={{ marginLeft: "auto" }}>{rowMatch ? "✅" : "❌"}</span>}
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {aCorrect !== null && (
              <div style={{ fontSize: "0.8rem", lineHeight: 1.4, color: aCorrect ? "#86efac" : "#fca5a5" }}>
                {aCorrect ? `✅ ${aPuzzle.explanation}` : `❌ ${aPuzzle.explanation}`}
              </div>
            )}
          </div>

          {/* Gate palette */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", marginBottom: "0.35rem" }}>
            {aPuzzle.palette.map(gate => (
              <button key={gate} onClick={() => handleGateSelect(gate)} disabled={aSelected !== null}
                style={{
                  padding: "0.35rem 0.8rem", borderRadius: 6, fontWeight: 800, fontSize: "0.82rem",
                  cursor: aSelected !== null ? "default" : "pointer", transition: "all 0.15s",
                  border: "2px solid",
                  borderColor: aSelected === gate ? (aCorrect ? "#22c55e" : "#ef4444") : GATE_COLOR[gate],
                  background: aSelected === gate
                    ? (aCorrect ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)")
                    : `${GATE_COLOR[gate]}22`,
                  color: aSelected === gate ? (aCorrect ? "#86efac" : "#fca5a5") : GATE_COLOR[gate],
                }}>{gate}</button>
            ))}
          </div>

          <div style={{ textAlign: "center", fontSize: "0.9rem" }}>
            {"❤️".repeat(aLives)}{"🖤".repeat(Math.max(0, 3 - aLives))}
          </div>
        </>
      )}

      {/* ── Game Over ────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1.5rem", textAlign: "center", padding: "0 1rem" }}>
          <div style={{ fontSize: "3rem" }}>💡</div>
          <h3 style={{ color: "var(--text-primary)", margin: 0 }}>Circuit Complete!</h3>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent-primary)" }}>{finalScore} pts</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
            {finalScore >= 700 ? "🏆 Boolean master! You know your gates!"
              : finalScore >= 400 ? "⚡ Great work! Logic is clicking!"
              : "💪 Keep at it — every gate learned brings you closer to thinking like a computer!"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
