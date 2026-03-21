"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

const KEYFRAMES = `
@keyframes ss-pop {
  0%   { transform: scale(0.85); opacity: 0; }
  70%  { transform: scale(1.06); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes ss-shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-8px); }
  75%     { transform: translateX(8px); }
}
`;

type Phase = "idle" | "playing" | "over";
type Mode = "kids" | "adult";

interface Question {
  text: string;
  answer: string;
  choices: string[];
  svgContent: React.ReactNode;
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

function polyPts(sides: number, cx: number, cy: number, r: number, rot = -Math.PI / 2): string {
  return Array.from({ length: sides }, (_, i) => {
    const a = rot + (2 * Math.PI * i) / sides;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function makeWrongs(correct: number, count: number): string[] {
  const seen = new Set([correct]);
  const result: string[] = [];
  while (result.length < count) {
    const delta = rnd(1, Math.max(3, Math.round(correct * 0.4)));
    const w = Math.random() < 0.5 ? correct + delta : Math.max(0, correct - delta);
    if (!seen.has(w)) { seen.add(w); result.push(`${w}`); }
  }
  return result;
}

// ── Basic shapes ────────────────────────────────────────────────────────────
type ShapeId = "circle" | "triangle" | "square" | "rectangle" | "pentagon" | "hexagon" | "diamond" | "octagon";

const SHAPE_INFO: Record<ShapeId, { sides: number; name: string; svg: React.ReactNode }> = {
  circle:    { sides: 0, name: "Circle",    svg: <circle cx="50" cy="50" r="42" fill="#6366f1" /> },
  triangle:  { sides: 3, name: "Triangle",  svg: <polygon points={polyPts(3, 50, 55, 42)} fill="#ec4899" /> },
  square:    { sides: 4, name: "Square",    svg: <rect x="8" y="8" width="84" height="84" fill="#14b8a6" rx="3" /> },
  rectangle: { sides: 4, name: "Rectangle", svg: <rect x="4" y="22" width="92" height="56" fill="#f59e0b" rx="3" /> },
  pentagon:  { sides: 5, name: "Pentagon",  svg: <polygon points={polyPts(5, 50, 54, 42)} fill="#10b981" /> },
  hexagon:   { sides: 6, name: "Hexagon",   svg: <polygon points={polyPts(6, 50, 50, 42, 0)} fill="#8b5cf6" /> },
  diamond:   { sides: 4, name: "Diamond",   svg: <polygon points="50,6 94,50 50,94 6,50" fill="#ef4444" /> },
  octagon:   { sides: 8, name: "Octagon",   svg: <polygon points={polyPts(8, 50, 50, 42)} fill="#0ea5e9" /> },
};

const SHAPE_IDS = Object.keys(SHAPE_INFO) as ShapeId[];
const ALL_SIDES = [0, 3, 4, 5, 6, 7, 8];

// ── Kids questions ──────────────────────────────────────────────────────────
function makeKidsQuestion(): Question {
  const id = SHAPE_IDS[rnd(0, SHAPE_IDS.length - 1)];
  const { svg, sides, name } = SHAPE_INFO[id];
  const qType = rnd(0, 2);

  if (qType === 0) {
    const answer = `${sides}`;
    const wrongs = shuffled(ALL_SIDES.filter(s => s !== sides)).slice(0, 3).map(s => `${s}`);
    return { text: "How many sides does this shape have?", answer, choices: shuffled([answer, ...wrongs]), svgContent: svg };
  }

  if (qType === 1) {
    const answer = name;
    const wrongs = shuffled(SHAPE_IDS.filter(i => i !== id).map(i => SHAPE_INFO[i].name)).slice(0, 3);
    return { text: "What is this shape called?", answer, choices: shuffled([answer, ...wrongs]), svgContent: svg };
  }

  // corners
  const answer = `${sides}`;
  const wrongs = shuffled(ALL_SIDES.filter(s => s !== sides)).slice(0, 3).map(s => `${s}`);
  return { text: "How many corners does this shape have?", answer, choices: shuffled([answer, ...wrongs]), svgContent: svg };
}

// ── Adult knowledge bank ────────────────────────────────────────────────────
const KNOWLEDGE: Array<{ text: string; answer: string; all: string[]; shapeId: ShapeId }> = [
  { text: "Sum of angles in a triangle?",                   answer: "180°",      all: ["90°","180°","270°","360°"],              shapeId: "triangle"  },
  { text: "Sum of angles in a quadrilateral?",              answer: "360°",      all: ["180°","270°","360°","540°"],             shapeId: "square"    },
  { text: "Each angle in an equilateral triangle?",         answer: "60°",       all: ["45°","60°","90°","120°"],               shapeId: "triangle"  },
  { text: "Lines of symmetry in a square?",                 answer: "4",         all: ["2","4","6","8"],                        shapeId: "square"    },
  { text: "Lines of symmetry in an equilateral triangle?",  answer: "3",         all: ["1","2","3","4"],                        shapeId: "triangle"  },
  { text: "Lines of symmetry in a regular hexagon?",        answer: "6",         all: ["4","5","6","7"],                        shapeId: "hexagon"   },
  { text: "A parallelogram with all sides equal is a ___?", answer: "Rhombus",   all: ["Square","Rhombus","Trapezoid","Rectangle"], shapeId: "diamond" },
  { text: "A triangle with 2 equal sides is ___?",          answer: "Isosceles", all: ["Scalene","Isosceles","Equilateral","Right"], shapeId: "triangle" },
  { text: "A shape with 8 sides is called a ___?",          answer: "Octagon",   all: ["Hexagon","Heptagon","Octagon","Nonagon"], shapeId: "octagon" },
  { text: "How many diagonals does a rectangle have?",      answer: "2",         all: ["1","2","3","4"],                        shapeId: "rectangle" },
  { text: "Sum of angles in a pentagon?",                   answer: "540°",      all: ["360°","450°","540°","720°"],            shapeId: "pentagon"  },
  { text: "Sum of angles in a hexagon?",                    answer: "720°",      all: ["540°","720°","900°","1080°"],           shapeId: "hexagon"   },
];

function makeAdultQuestion(): Question {
  if (Math.random() < 0.6) {
    // Calculation question
    const type = rnd(0, 2);

    if (type === 0) {
      // Rectangle: area or perimeter
      const w = rnd(3, 15);
      const h = rnd(3, 15);
      const askArea = Math.random() < 0.6;
      const correct = askArea ? w * h : 2 * (w + h);
      const answer = `${correct}`;
      const wrongs = makeWrongs(correct, 3);
      const svgContent = (
        <g>
          <rect x="4" y="22" width="92" height="56" fill="#f59e0b" opacity="0.85" rx="3" />
          <text x="50" y="16" textAnchor="middle" fill="#fef3c7" fontSize="10" fontWeight="bold">{w}</text>
          <text x="99" y="54" textAnchor="end" fill="#fef3c7" fontSize="10" fontWeight="bold">{h}</text>
        </g>
      );
      return {
        text: askArea ? `Area of this rectangle (${w} × ${h})?` : `Perimeter of this rectangle (${w} × ${h})?`,
        answer, choices: shuffled([answer, ...wrongs]), svgContent,
      };
    }

    if (type === 1) {
      // Square: area or perimeter
      const s = rnd(3, 12);
      const askArea = Math.random() < 0.5;
      const correct = askArea ? s * s : 4 * s;
      const answer = `${correct}`;
      const wrongs = makeWrongs(correct, 3);
      const svgContent = (
        <g>
          <rect x="8" y="8" width="84" height="84" fill="#14b8a6" opacity="0.85" rx="3" />
          <text x="50" y="5" textAnchor="middle" fill="#ccfbf1" fontSize="10" fontWeight="bold">{s}</text>
        </g>
      );
      return {
        text: askArea ? `Area of a square with side ${s}?` : `Perimeter of a square with side ${s}?`,
        answer, choices: shuffled([answer, ...wrongs]), svgContent,
      };
    }

    // Triangle: ½ × base × height
    const base = rnd(4, 14);
    const h = rnd(4, 14);
    const correct = Math.floor((base * h) / 2);
    const answer = `${correct}`;
    const wrongs = makeWrongs(correct, 3);
    const svgContent = (
      <g>
        <polygon points={polyPts(3, 50, 56, 40)} fill="#ec4899" opacity="0.85" />
        <text x="50" y="100" textAnchor="middle" fill="#fce7f3" fontSize="9" fontWeight="bold">base {base}</text>
        <text x="2" y="60" textAnchor="start" fill="#fce7f3" fontSize="9" fontWeight="bold">h {h}</text>
      </g>
    );
    return {
      text: `Area of triangle: base ${base}, height ${h}?`,
      answer, choices: shuffled([answer, ...wrongs]), svgContent,
    };
  }

  // Knowledge question
  const q = KNOWLEDGE[rnd(0, KNOWLEDGE.length - 1)];
  return {
    text: q.text,
    answer: q.answer,
    choices: shuffled(q.all),
    svgContent: SHAPE_INFO[q.shapeId].svg,
  };
}

const GAME_SEC = 60;

export default function ShapeSorterGame({ title }: { title: string }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [mode, setMode]         = useState<Mode>("kids");
  const [score, setScore]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SEC);
  const [question, setQuestion] = useState<Question>(() => makeKidsQuestion());
  const [flash, setFlash]       = useState<"correct" | "wrong" | null>(null);
  const [showCorrect, setShowCorrect] = useState<string | null>(null);

  const phaseRef     = useRef<Phase>("idle");
  const modeRef      = useRef<Mode>("kids");
  const scoreRef     = useRef(0);
  const streakRef    = useRef(0);
  const lockedRef    = useRef(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const nextQ = useCallback(() => {
    lockedRef.current = false;
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
      const bonus = streakRef.current >= 6 ? 2 : streakRef.current >= 3 ? 1 : 0;
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

  const bonusMult = streak >= 6 ? "+2" : streak >= 3 ? "+1" : null;

  return (
    <div className={styles.gameInner} style={{ padding: "0.75rem", justifyContent: "flex-start", gap: "0.5rem" }}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>🔷 {title}</h2>

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
          <div style={{ fontSize: "3.5rem" }}>🔷🔶🔵</div>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", fontSize: "0.9rem", maxWidth: 280, lineHeight: 1.5 }}>
            {mode === "kids"
              ? "Name shapes and count their sides! 60 seconds — how many can you get right?"
              : "Shapes, area & perimeter! 60 seconds — earn bonus points for 3 and 6 in a row!"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Start! 🔷</button>
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
                🔥 ×{streak} {bonusMult && `(${bonusMult})`}
              </span>
            )}
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fbbf24" }}>
              ⭐ {score}
            </span>
          </div>

          {/* Shape + Question */}
          <div style={{
            background: "var(--bg-secondary)", borderRadius: 16, padding: "0.75rem",
            border: `2px solid ${flash === "correct" ? "#22c55e" : flash === "wrong" ? "#ef4444" : "var(--border-color)"}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
            width: "100%",
            animation: flash === "wrong" ? "ss-shake 0.4s ease" : flash === "correct" ? "ss-pop 0.15s ease" : undefined,
            transition: "border-color 0.12s",
          }}>
            <svg viewBox="0 0 100 100" width="110" height="110" style={{ display: "block" }}>
              {question.svgContent}
            </svg>
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
            {score === 0 ? "Keep practicing! You'll get it 🔷"
              : score < 8  ? "Good start! Try again 🔷"
              : score < 15 ? "Great shape skills! 🌟"
              : "Geometry genius! 🔷🔶🔵"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
