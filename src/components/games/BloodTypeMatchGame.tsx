"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── CSS animations ──────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes bt-patient-enter {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes bt-correct-glow {
  0%   { box-shadow: 0 0 0 2px #22c55e; }
  50%  { box-shadow: 0 0 0 12px rgba(34,197,94,0.4); }
  100% { box-shadow: 0 0 0 2px #22c55e; }
}
@keyframes bt-agglutinate {
  0%,100% { transform: scale(1) rotate(0deg);    filter: brightness(1); }
  20%     { transform: scale(0.9) rotate(-5deg);  filter: brightness(0.45) sepia(1) saturate(5); }
  40%     { transform: scale(0.92) rotate(4deg);  filter: brightness(0.5) sepia(0.8); }
  60%     { transform: scale(0.9) rotate(-3deg);  filter: brightness(0.45) sepia(1); }
  80%     { transform: scale(0.93) rotate(2deg);  filter: brightness(0.5); }
}
@keyframes bt-score-float {
  0%   { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-52px); }
}
@keyframes bt-combo-pop {
  0%   { transform: scale(0.3); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes bt-fact-slide {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes bt-flash-green {
  0%,100% { background-color: transparent; }
  30%     { background-color: rgba(34,197,94,0.1); }
}
@keyframes bt-flash-red {
  0%,100% { background-color: transparent; }
  30%     { background-color: rgba(239,68,68,0.1); }
}
`;

// ── Types ───────────────────────────────────────────────────────────────────
type BloodType = "O-" | "O+" | "A-" | "A+" | "B-" | "B+" | "AB-" | "AB+";
type KidsType  = "O" | "A" | "B" | "AB";
type Difficulty = "Kids" | "Adult";
type Phase = "idle" | "playing" | "over";

interface Round {
  patientType: string;
  donorOptions: string[];
  correctDonors: string[];
}

interface DonorBag {
  type: string;
  selected: boolean;
  resultState: "neutral" | "correct" | "wrong";
}

interface ScorePopup {
  id: number;
  label: string;
  positive: boolean;
}

// ── Compatibility tables ─────────────────────────────────────────────────────
// What donor types each recipient can safely accept
const ADULT_RECEIVE: Record<BloodType, BloodType[]> = {
  "O-":  ["O-"],
  "O+":  ["O-", "O+"],
  "A-":  ["O-", "A-"],
  "A+":  ["O-", "O+", "A-", "A+"],
  "B-":  ["O-", "B-"],
  "B+":  ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

const KIDS_RECEIVE: Record<KidsType, KidsType[]> = {
  "O":  ["O"],
  "A":  ["O", "A"],
  "B":  ["O", "B"],
  "AB": ["O", "A", "B", "AB"],
};

const ADULT_TYPES: BloodType[] = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const KIDS_TYPES: KidsType[]   = ["O", "A", "B", "AB"];

// ── Helpers ──────────────────────────────────────────────────────────────────
// Replace "-" with unicode minus for display
function displayType(t: string): string {
  return t.replace(/-/g, "\u2212");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// Subtle tinted background per blood type group
function typeColor(t: string): string {
  if (t.startsWith("AB")) return "rgba(109,7,26,0.2)";
  if (t.startsWith("B"))  return "rgba(127,29,29,0.2)";
  if (t.startsWith("A"))  return "rgba(185,28,28,0.2)";
  return "rgba(220,38,38,0.2)"; // O
}

// ── Facts bank ───────────────────────────────────────────────────────────────
const FACT_RULES: {
  check: (patient: string, correct: string[], wrong?: string) => boolean;
  text: string;
}[] = [
  {
    check: (patient) => patient === "O-",
    text: "O\u2212 is the universal donor \u2014 no A, B, or Rh antigens on the red blood cells, so any immune system accepts it safely!",
  },
  {
    check: (patient) => patient === "AB+",
    text: "AB+ is the universal recipient \u2014 they have A, B, and Rh antigens already, so their immune system won\u2019t attack any donor blood.",
  },
  {
    check: (_p, _c, wrong) => wrong !== undefined && wrong.startsWith("AB"),
    text: "AB blood carries both A and B antigens \u2014 most recipients\u2019 immune systems would launch an antibody attack (agglutination) against it!",
  },
  {
    check: (_p, _c, wrong) => wrong !== undefined && wrong.includes("+"),
    text: "Rh\u2212 patients lack the D antigen. Receiving Rh+ blood triggers anti-D antibodies \u2014 harmless first exposure, potentially fatal on re-exposure!",
  },
  {
    check: (patient) => patient === "AB-",
    text: "AB\u2212 patients can receive any Rh\u2212 type (O\u2212, A\u2212, B\u2212, AB\u2212). The Rh factor \u2014 not the ABO group \u2014 is their key constraint.",
  },
  {
    check: (_p, correct) => correct.includes("O-") || correct.includes("O"),
    text: "O\u2212 blood is kept in trauma bays for emergencies \u2014 it\u2019s transfused when there\u2019s no time to test the patient\u2019s type.",
  },
  {
    check: (patient) => patient.includes("+"),
    text: "Rh+ patients have the D antigen on their red blood cells. They can safely receive both Rh+ and Rh\u2212 blood.",
  },
  {
    check: () => true,
    text: "When mismatched blood is transfused, antibodies bind to foreign antigens on donor red blood cells \u2014 causing agglutination (clumping) and potentially fatal blockages.",
  },
];

function getFact(patient: string, correct: string[], wrong?: string): string {
  for (const rule of FACT_RULES) {
    if (rule.check(patient, correct, wrong)) return rule.text;
  }
  return FACT_RULES[FACT_RULES.length - 1].text;
}

// ── Round generator ───────────────────────────────────────────────────────────
function generateRound(difficulty: Difficulty, recentTypes: string[]): Round {
  if (difficulty === "Kids") {
    const pool = KIDS_TYPES.filter(t => !recentTypes.slice(-2).includes(t));
    const patientType: KidsType = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : KIDS_TYPES[Math.floor(Math.random() * KIDS_TYPES.length)];

    const allCompatible = KIDS_RECEIVE[patientType];
    const decoys = KIDS_TYPES.filter(t => !allCompatible.includes(t));

    // Always exactly 1 correct donor for kids
    const correct = allCompatible[Math.floor(Math.random() * allCompatible.length)];
    const donorOptions = shuffle([correct, ...shuffle([...decoys]).slice(0, 3)]);

    return { patientType, donorOptions, correctDonors: [correct] };
  }

  // Adult mode: all 8 types
  const pool = ADULT_TYPES.filter(t => !recentTypes.slice(-2).includes(t));
  const patientType: BloodType = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : ADULT_TYPES[Math.floor(Math.random() * ADULT_TYPES.length)];

  const allCompatible = ADULT_RECEIVE[patientType];
  const decoys = ADULT_TYPES.filter(t => !allCompatible.includes(t));

  // Pick 1–2 correct donors + fill rest with decoys (4 bags total)
  const shuffledCompatible = shuffle([...allCompatible]);
  const numCorrect = allCompatible.length === 1 ? 1 : 1 + Math.floor(Math.random() * 2);
  const correctDonors = shuffledCompatible.slice(0, numCorrect);

  const shuffledDecoys = shuffle([...decoys]);
  const decoysUsed = shuffledDecoys.slice(0, 4 - numCorrect);
  const donorOptions = shuffle([...correctDonors, ...decoysUsed]);

  return { patientType, donorOptions, correctDonors };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BloodTypeMatchGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Kids");
  const [phase, setPhase]           = useState<Phase>("idle");
  const [score, setScore]           = useState(0);
  const [combo, setCombo]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(60);
  const [highScore, setHighScore]   = useState(0);
  const [round, setRound]           = useState<Round | null>(null);
  const [donorBags, setDonorBags]   = useState<DonorBag[]>([]);
  const [factText, setFactText]     = useState("");
  const [showFact, setShowFact]     = useState(false);
  const [flashType, setFlashType]   = useState<"green" | "red" | null>(null);
  const [popups, setPopups]         = useState<ScorePopup[]>([]);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundKey, setRoundKey]     = useState(0);

  // Refs — mutable state read inside closures/timers
  const phaseRef       = useRef<Phase>("idle");
  const comboRef       = useRef(0);
  const scoreRef       = useRef(0);
  const awaitingRef    = useRef(false);
  const difficultyRef  = useRef<Difficulty>("Kids");
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextRoundRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const factHideRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupIdRef     = useRef(0);
  const recentTypesRef = useRef<string[]>([]);

  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  const clearTimers = useCallback(() => {
    if (timerRef.current)     clearTimeout(timerRef.current);
    if (nextRoundRef.current) clearTimeout(nextRoundRef.current);
    if (factHideRef.current)  clearTimeout(factHideRef.current);
  }, []);

  useEffect(() => () => { clearTimers(); }, [clearTimers]);

  // ── startGame ──────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    clearTimers();
    recentTypesRef.current = [];
    comboRef.current = 0;
    scoreRef.current = 0;
    awaitingRef.current = false;
    phaseRef.current = "playing";
    const totalTime = difficultyRef.current === "Kids" ? 60 : 90;
    const firstRound = generateRound(difficultyRef.current, []);
    setPhase("playing");
    setScore(0);
    setCombo(0);
    setTimeLeft(totalTime);
    setRound(firstRound);
    setDonorBags(firstRound.donorOptions.map(t => ({ type: t, selected: false, resultState: "neutral" })));
    setShowFact(false);
    setFactText("");
    setFlashType(null);
    setPopups([]);
    setAwaitingNext(false);
    setCorrectCount(0);
    setRoundKey(k => k + 1);
  }, [clearTimers]);

  // ── resetToIdle ────────────────────────────────────────────────────────────
  const resetToIdle = useCallback(() => {
    clearTimers();
    phaseRef.current = "idle";
    awaitingRef.current = false;
    setPhase("idle");
    setRound(null);
    setDonorBags([]);
    setShowFact(false);
    setFlashType(null);
    setPopups([]);
    setAwaitingNext(false);
  }, [clearTimers]);

  // ── Game countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      phaseRef.current = "over";
      setPhase("over");
      setHighScore(prev => Math.max(prev, scoreRef.current));
      clearTimers();
      return;
    }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    timerRef.current = t;
    return () => clearTimeout(t);
  }, [phase, timeLeft, clearTimers]);

  // ── advanceRound ───────────────────────────────────────────────────────────
  const advanceRound = useCallback((prevPatientType: string) => {
    recentTypesRef.current = [...recentTypesRef.current, prevPatientType].slice(-3);
    const next = generateRound(difficultyRef.current, recentTypesRef.current);
    setRound(next);
    setDonorBags(next.donorOptions.map(t => ({ type: t, selected: false, resultState: "neutral" })));
    setRoundKey(k => k + 1);
    awaitingRef.current = false;
    setAwaitingNext(false);
  }, []);

  // ── evaluateAnswer ─────────────────────────────────────────────────────────
  const evaluateAnswer = useCallback((selectedTypes: string[], currentRound: Round) => {
    if (awaitingRef.current || phaseRef.current !== "playing") return;
    awaitingRef.current = true;
    setAwaitingNext(true);

    const correct = currentRound.correctDonors;
    const allCorrectSelected = correct.every(c => selectedTypes.includes(c));
    const noWrongSelected    = selectedTypes.every(s => correct.includes(s));
    const isCorrect = allCorrectSelected && noWrongSelected && selectedTypes.length > 0;
    const wrongPicked = selectedTypes.find(s => !correct.includes(s));

    // Mark bags: all correct → green, wrong picks → red
    setDonorBags(prev => prev.map(b => ({
      ...b,
      resultState: correct.includes(b.type)
        ? "correct"
        : selectedTypes.includes(b.type) ? "wrong" : "neutral",
    })));

    if (isCorrect) {
      comboRef.current += 1;
      setCombo(comboRef.current);
      const mul = comboRef.current >= 8 ? 3 : comboRef.current >= 4 ? 2 : 1;
      const pts = 20 * mul;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setCorrectCount(c => c + 1);
      const pid = popupIdRef.current++;
      const label = mul > 1 ? `+${pts} \xd7${mul}!` : `+${pts}`;
      setPopups(p => [...p, { id: pid, label, positive: true }]);
      setTimeout(() => setPopups(p => p.filter(x => x.id !== pid)), 950);
      setFlashType("green");
      setTimeout(() => setFlashType(null), 500);
    } else {
      comboRef.current = 0;
      setCombo(0);
      if (difficultyRef.current === "Adult") {
        scoreRef.current = Math.max(0, scoreRef.current - 5);
        setScore(scoreRef.current);
        const pid = popupIdRef.current++;
        setPopups(p => [...p, { id: pid, label: "\u22125", positive: false }]);
        setTimeout(() => setPopups(p => p.filter(x => x.id !== pid)), 950);
      }
      setFlashType("red");
      setTimeout(() => setFlashType(null), 500);
    }

    const fact = getFact(currentRound.patientType, correct, wrongPicked);
    setFactText(fact);
    setShowFact(true);
    if (factHideRef.current) clearTimeout(factHideRef.current);
    factHideRef.current = setTimeout(() => setShowFact(false), 3200);

    nextRoundRef.current = setTimeout(() => {
      if (phaseRef.current === "playing") {
        advanceRound(currentRound.patientType);
      }
    }, 1600);
  }, [advanceRound]);

  // ── Kids: tap a bag → immediate answer ────────────────────────────────────
  const handleKidsBagTap = useCallback((bagType: string) => {
    if (!round || awaitingRef.current || phaseRef.current !== "playing") return;
    evaluateAnswer([bagType], round);
  }, [round, evaluateAnswer]);

  // ── Adult: toggle bag selection ────────────────────────────────────────────
  const handleAdultBagToggle = useCallback((idx: number) => {
    if (awaitingRef.current || phaseRef.current !== "playing") return;
    setDonorBags(prev => prev.map((b, i) => i === idx ? { ...b, selected: !b.selected } : b));
  }, []);

  // ── Adult: Transfuse button ────────────────────────────────────────────────
  const handleTransfuse = useCallback(() => {
    if (!round || awaitingRef.current || phaseRef.current !== "playing") return;
    const selected = donorBags.filter(b => b.selected).map(b => b.type);
    if (selected.length === 0) return;
    evaluateAnswer(selected, round);
  }, [round, donorBags, evaluateAnswer]);

  const handleDiffChange = useCallback((d: Difficulty) => {
    setDifficulty(d);
    resetToIdle();
  }, [resetToIdle]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalTime  = difficulty === "Kids" ? 60 : 90;
  const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "var(--text-primary)";
  const comboMul   = combo >= 8 ? 3 : combo >= 4 ? 2 : 1;
  const anySelected = donorBags.some(b => b.selected);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={styles.gameInner}
      style={{
        animation: flashType === "green"
          ? "bt-flash-green 0.5s ease-out"
          : flashType === "red"
          ? "bt-flash-red 0.5s ease-out"
          : undefined,
      }}
    >
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Difficulty */}
      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["Kids", "Adult"] as Difficulty[]).map(d => (
          <button
            key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => handleDiffChange(d)}
          >
            {d === "Kids" ? "🧒 Kids" : "🔬 Adult"}
          </button>
        ))}
      </div>

      {/* ── IDLE ──────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "2rem 0.5rem" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🩸</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1rem", maxWidth: 360, margin: "0 auto 1rem" }}>
            {difficulty === "Kids"
              ? "A patient needs a blood transfusion — tap the right donor bag! 4 blood types (A, B, AB, O). 60 seconds — go!"
              : "All 8 blood types including Rh factor. Select EVERY compatible donor, then press Transfuse. Wrong picks cost points!"}
          </p>

          {difficulty === "Kids" && (
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
              {KIDS_TYPES.map(t => (
                <div key={t} style={{
                  background: typeColor(t),
                  border: "1px solid rgba(220,38,38,0.35)",
                  borderRadius: 8,
                  padding: "0.4rem 1rem",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                }}>
                  {t}
                </div>
              ))}
            </div>
          )}

          {difficulty === "Adult" && (
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.9, marginBottom: "1rem" }}>
              O\u2212 = universal donor &nbsp;&bull;&nbsp; AB+ = universal recipient<br />
              Rh\u2212 patients can only receive Rh\u2212 blood
            </div>
          )}

          {highScore > 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1rem" }}>
              Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore} pts</strong>
            </div>
          )}
          <button className={styles.resetBtn} onClick={startGame}>Start!</button>
        </div>
      )}

      {/* ── PLAYING ───────────────────────────────────────────────────────── */}
      {phase === "playing" && round && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", width: "100%" }}>

          {/* HUD */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", justifyContent: "center", width: "100%", position: "relative" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: timerColor, fontFamily: "monospace", lineHeight: 1 }}>
                {String(timeLeft).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>sec</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>pts</div>
            </div>
            {combo >= 2 && (
              <div style={{
                background: comboMul >= 3 ? "#ef4444" : comboMul >= 2 ? "#f59e0b" : "var(--accent-primary)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "0.2rem 0.55rem",
                fontWeight: 800,
                fontSize: "0.8rem",
                animation: "bt-combo-pop 0.25s ease-out",
                whiteSpace: "nowrap",
              }}>
                \xd7{comboMul} COMBO!
              </div>
            )}
          </div>

          {/* Timer bar */}
          <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(timeLeft / totalTime) * 100}%`,
              background: timeLeft <= 10 ? "#ef4444" : "var(--accent-primary)",
              transition: "width 1s linear, background 0.3s",
            }} />
          </div>

          {/* Patient card */}
          <div
            key={roundKey}
            style={{
              animation: "bt-patient-enter 0.35s ease-out",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem 2rem",
              textAlign: "center",
              width: "100%",
              maxWidth: 320,
              position: "relative",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>
              🏥 Patient needs
            </div>
            <div style={{ fontSize: "3.5rem", fontWeight: 900, lineHeight: 1, color: "#dc2626", letterSpacing: "-0.02em" }}>
              {displayType(round.patientType)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
              {difficulty === "Adult" ? "Select ALL compatible donors" : "Tap the right blood bag"}
            </div>

            {/* Score popups */}
            {popups.map(p => (
              <div key={p.id} style={{
                position: "absolute",
                top: "35%",
                left: "50%",
                transform: "translateX(-50%)",
                color: p.positive ? "#22c55e" : "#ef4444",
                fontWeight: 800,
                fontSize: "1.3rem",
                pointerEvents: "none",
                animation: "bt-score-float 0.95s ease-out forwards",
                whiteSpace: "nowrap",
                zIndex: 10,
                textShadow: "0 1px 4px rgba(0,0,0,0.7)",
              }}>
                {p.label}
              </div>
            ))}
          </div>

          {/* Donor bags label */}
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {difficulty === "Kids" ? "Choose donor:" : "Choose all compatible donors:"}
          </div>

          {/* Donor bags grid */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center", width: "100%", maxWidth: 360 }}>
            {donorBags.map((bag, idx) => (
              <button
                key={idx}
                disabled={awaitingNext}
                onClick={() => difficulty === "Kids" ? handleKidsBagTap(bag.type) : handleAdultBagToggle(idx)}
                style={{
                  width: "calc(50% - 0.6rem)",
                  minWidth: 100,
                  maxWidth: 160,
                  padding: "1rem 0.5rem",
                  borderRadius: "var(--radius-md)",
                  border: bag.resultState === "correct"
                    ? "2px solid #22c55e"
                    : bag.resultState === "wrong"
                    ? "2px solid #ef4444"
                    : bag.selected
                    ? "2px solid var(--accent-primary)"
                    : "2px solid var(--border-color)",
                  background: bag.resultState === "correct"
                    ? "rgba(34,197,94,0.18)"
                    : bag.resultState === "wrong"
                    ? "rgba(239,68,68,0.18)"
                    : bag.selected
                    ? "rgba(212,160,23,0.12)"
                    : typeColor(bag.type),
                  cursor: awaitingNext ? "default" : "pointer",
                  animation: bag.resultState === "correct"
                    ? "bt-correct-glow 0.5s ease-out"
                    : bag.resultState === "wrong"
                    ? "bt-agglutinate 0.6s ease-out"
                    : undefined,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.2rem",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <span style={{ fontSize: "1.8rem" }}>🩸</span>
                <span style={{ fontSize: "1.3rem", letterSpacing: "-0.02em" }}>{displayType(bag.type)}</span>
                {bag.selected && !awaitingNext && (
                  <span style={{ fontSize: "0.6rem", color: "var(--accent-primary)" }}>✓ selected</span>
                )}
                {bag.resultState === "correct" && (
                  <span style={{ fontSize: "0.6rem", color: "#22c55e" }}>✓ compatible</span>
                )}
                {bag.resultState === "wrong" && (
                  <span style={{ fontSize: "0.6rem", color: "#ef4444" }}>✗ incompatible</span>
                )}
              </button>
            ))}
          </div>

          {/* Transfuse button — adult only */}
          {difficulty === "Adult" && !awaitingNext && (
            <button
              className={styles.resetBtn}
              onClick={handleTransfuse}
              disabled={!anySelected}
              style={{ opacity: anySelected ? 1 : 0.4, marginTop: "0.25rem" }}
            >
              Transfuse →
            </button>
          )}

          {/* Fact banner */}
          {showFact && (
            <div style={{
              animation: "bt-fact-slide 0.3s ease-out",
              background: "rgba(212,160,23,0.07)",
              border: "1px solid rgba(212,160,23,0.22)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              width: "100%",
              maxWidth: 400,
              textAlign: "center",
            }}>
              🔬 {factText}
            </div>
          )}
        </div>
      )}

      {/* ── OVER ──────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ textAlign: "center", padding: "2rem 0.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
            {score > 0 && score >= highScore ? "🏆" : "🩸"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
            {score > 0 && score >= highScore ? "New best score!" : "Time\u2019s up!"}
          </div>
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1, marginBottom: "0.2rem" }}>
            {score}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.2rem" }}>points</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
            {correctCount} correct transfusion{correctCount !== 1 ? "s" : ""}
            {highScore > 0 && score < highScore && (
              <span> &middot; Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore}</strong></span>
            )}
          </div>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
