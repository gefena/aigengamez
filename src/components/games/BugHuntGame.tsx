"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "over";
type Difficulty = "kids" | "adult";

interface Puzzle {
  title: string;
  goal: string;
  lines: string[];
  bugLine: number;
  explanation: string;
}

// ─── Puzzles ──────────────────────────────────────────────────────────────────
const KIDS: Puzzle[] = [
  {
    title: "Count to 5 🔢",
    goal: "Count from 1 to 5 and print each number",
    lines: ["count = 1", "REPEAT 6 TIMES:", "  PRINT count", "  count = count + 1"],
    bugLine: 1,
    explanation: "REPEAT 6 TIMES will count to 6! Change it to REPEAT 5 TIMES.",
  },
  {
    title: "Warm Weather ☀️",
    goal: "Print 'Warm!' if temperature is more than 20",
    lines: ["temperature = 25", "IF temperature < 20:", "  PRINT '☀️ Warm!'", "ELSE:", "  PRINT '🧥 Cold!'"],
    bugLine: 1,
    explanation: "The condition is backwards! < means 'less than'. Use > to check if temp is MORE than 20.",
  },
  {
    title: "Add Numbers ➕",
    goal: "Add 8 and 4 together and print the result",
    lines: ["a = 8", "b = 4", "result = a - b", "PRINT result"],
    bugLine: 2,
    explanation: "We want to ADD, not subtract! Change the minus sign to a plus sign.",
  },
  {
    title: "Say Hello 👋",
    goal: "Say hello to every friend in the list",
    lines: [
      "friends = ['Alice', 'Bob', 'Carol']",
      "FOR EACH friend IN friends:",
      "  PRINT 'Goodbye, ' + friend",
      "END",
    ],
    bugLine: 2,
    explanation: "The code says 'Goodbye' instead of 'Hello'! Change 'Goodbye' to 'Hello'.",
  },
  {
    title: "Double It 🎯",
    goal: "Double the number and store it in 'double'",
    lines: ["number = 7", "double = number + 1", "PRINT double"],
    bugLine: 1,
    explanation: "Adding 1 gives 8, not double! To double a number, use number + number.",
  },
  {
    title: "Find the Biggest 🏆",
    goal: "Store the biggest of a and b in 'biggest'",
    lines: ["a = 10", "b = 15", "biggest = a", "IF b > a:", "  biggest = a", "PRINT biggest"],
    bugLine: 4,
    explanation: "When b > a is true, b is the bigger one! Set biggest = b, not biggest = a.",
  },
  {
    title: "Robot Steps 🤖",
    goal: "Move the robot forward exactly 3 times",
    lines: ["move_forward()", "move_forward()", "turn_left()", "END"],
    bugLine: 2,
    explanation: "The third command turns the robot instead of moving it forward! Change turn_left() to move_forward().",
  },
  {
    title: "Gold Star ⭐",
    goal: "Give a gold star if score is 100 or more",
    lines: ["score = 100", "IF score > 100:", "  PRINT '⭐ Gold star!'", "ELSE:", "  PRINT 'Keep trying!'"],
    bugLine: 1,
    explanation: "score > 100 misses exactly 100! A score of 100 should also earn a star. Use >= 100.",
  },
];

const ADULT: Puzzle[] = [
  {
    title: "Find Maximum",
    goal: "Return the largest number in an array",
    lines: [
      "function findMax(arr) {",
      "  let max = arr[0];",
      "  for (let i = 0; i <= arr.length; i++) {",
      "    if (arr[i] > max) max = arr[i];",
      "  }",
      "  return max;",
      "}",
    ],
    bugLine: 2,
    explanation: "i <= arr.length accesses arr[arr.length] which is undefined. Use i < arr.length.",
  },
  {
    title: "Check Even",
    goal: "Return true if a number is even",
    lines: [
      "function isEven(n) {",
      "  if (n % 2 = 0) {",
      "    return true;",
      "  }",
      "  return false;",
      "}",
    ],
    bugLine: 1,
    explanation: "= is assignment, not comparison. Use === to check if the remainder equals 0.",
  },
  {
    title: "Sum Array",
    goal: "Sum all numbers in an array",
    lines: [
      "function sumArray(arr) {",
      "  let total = 0;",
      "  for (let i = 0; i < arr.length; i++) {",
      "    total = arr[i];",
      "  }",
      "  return total;",
      "}",
    ],
    bugLine: 3,
    explanation: "total = arr[i] replaces total each loop. Use total += arr[i] to accumulate the sum.",
  },
  {
    title: "Reverse String",
    goal: "Return a string with characters in reverse order",
    lines: ["function reverseStr(s) {", "  return s.split('').reverse().join(' ');", "}"],
    bugLine: 1,
    explanation: "join(' ') puts spaces between characters. Use join('') to keep them together.",
  },
  {
    title: "Factorial",
    goal: "Calculate n! recursively",
    lines: [
      "function factorial(n) {",
      "  if (n === 0) return 0;",
      "  return n * factorial(n - 1);",
      "}",
    ],
    bugLine: 1,
    explanation: "The base case 0! = 1, not 0. Returning 0 makes the entire result 0.",
  },
  {
    title: "Filter Duplicates",
    goal: "Return an array with duplicates removed",
    lines: [
      "function removeDups(arr) {",
      "  const seen = [];",
      "  return arr.filter(x => {",
      "    if (seen.includes(x)) return true;",
      "    seen.push(x);",
      "    return false;",
      "  });",
      "}",
    ],
    bugLine: 3,
    explanation: "Logic inverted! If seen.includes(x) is true, it's a duplicate — return false to exclude it.",
  },
  {
    title: "Async Fetch",
    goal: "Fetch JSON data and log the result",
    lines: [
      "async function loadData(url) {",
      "  const res = await fetch(url);",
      "  const data = res.json();",
      "  console.log(data);",
      "}",
    ],
    bugLine: 2,
    explanation: "res.json() returns a Promise. Without await, data is a Promise object, not the parsed JSON.",
  },
  {
    title: "Sort Numbers",
    goal: "Sort numbers in ascending order",
    lines: [
      "const nums = [10, 3, 7, 1, 9];",
      "nums.sort();",
      "console.log(nums);  // expected: [1, 3, 7, 9, 10]",
    ],
    bugLine: 1,
    explanation: "Array.sort() sorts lexicographically by default: [1, 10, 3, 7, 9]. Use .sort((a, b) => a - b) for numbers.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes bh-shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes bh-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
`;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BugHuntGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("kids");
  const [phase, setPhase] = useState<Phase>("idle");
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);

  const difficultyRef = useRef<Difficulty>("kids");
  const phaseRef = useRef<Phase>("idle");
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const timeRef = useRef(60);
  const puzzleIdxRef = useRef(0);
  const puzzlesRef = useRef<Puzzle[]>([]);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const endGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("over");
  }, []);

  const advancePuzzle = useCallback(() => {
    const next = puzzleIdxRef.current + 1;
    if (next >= puzzlesRef.current.length) {
      endGame();
      return;
    }
    puzzleIdxRef.current = next;
    setPuzzleIdx(next);
    setSelected(null);
    setCorrect(null);
    lockedRef.current = false;
  }, [endGame]);

  const tickTimer = useCallback(() => {
    timeRef.current -= 1;
    setTimeLeft(timeRef.current);
    if (timeRef.current <= 0) {
      endGame();
    } else {
      timerRef.current = setTimeout(tickTimer, 1000);
    }
  }, [endGame]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const pool = difficultyRef.current === "kids" ? KIDS : ADULT;
    const shuffled = shuffle(pool);
    puzzlesRef.current = shuffled;
    setPuzzles(shuffled);
    puzzleIdxRef.current = 0;
    setPuzzleIdx(0);
    scoreRef.current = 0;
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    timeRef.current = 60;
    setTimeLeft(60);
    setSelected(null);
    setCorrect(null);
    lockedRef.current = false;
    setPhase("playing");
    if (difficultyRef.current === "adult") {
      timerRef.current = setTimeout(tickTimer, 1000);
    }
  }, [tickTimer]);

  const handleLineClick = useCallback((lineIdx: number) => {
    if (lockedRef.current || phaseRef.current !== "playing") return;
    lockedRef.current = true;

    const puzzle = puzzlesRef.current[puzzleIdxRef.current];
    const isCorrect = lineIdx === puzzle.bugLine;

    setSelected(lineIdx);
    setCorrect(isCorrect);

    if (isCorrect) {
      scoreRef.current += 100;
      setScore(scoreRef.current);
    } else if (difficultyRef.current === "kids") {
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) {
        setTimeout(endGame, 1500);
        return;
      }
    }

    setTimeout(advancePuzzle, 1500);
  }, [advancePuzzle, endGame]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const puzzle = puzzles[puzzleIdx];
  const isAdult = difficulty === "adult";

  return (
    <div className={styles.gameInner} style={{ justifyContent: "flex-start" }}>
      <style>{KEYFRAMES}</style>

      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["kids", "adult"] as Difficulty[]).map(d => (
          <button
            key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => {
              if (phase !== "playing") {
                setDifficulty(d);
                setPhase("idle");
              }
            }}
          >
            {d === "kids" ? "🧒 Kids" : "💻 Adult"}
          </button>
        ))}
      </div>

      {/* ── Idle ─────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1.5rem", padding: "0 1rem" }}>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", maxWidth: 340, margin: 0, lineHeight: 1.5 }}>
            {isAdult
              ? "Spot the bug in each JavaScript snippet before time runs out. 60 seconds, 100 pts per correct find. 🔍"
              : "Look at the pseudocode and tap the line with the mistake. You have 3 lives — good luck! 🐛"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>
            {isAdult ? "🔍 Start Hunt" : "🐛 Start Bug Hunt"}
          </button>
        </div>
      )}

      {/* ── Playing ──────────────────────────────────────────────────────── */}
      {phase === "playing" && puzzle && (
        <>
          {/* HUD */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: "0.35rem",
          }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
              {puzzleIdx + 1} / {puzzles.length}
            </span>
            <span style={{ color: "var(--accent-primary)", fontWeight: 700, fontSize: "0.9rem" }}>
              {score} pts
            </span>
            {isAdult ? (
              <span style={{
                color: timeLeft <= 10 ? "#ef4444" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "color 0.3s",
              }}>
                ⏱ {timeLeft}s
              </span>
            ) : (
              <span style={{ fontSize: "1rem", letterSpacing: "0.1em" }}>
                {"❤️".repeat(lives)}{"🖤".repeat(Math.max(0, 3 - lives))}
              </span>
            )}
          </div>

          {/* Timer bar — adult only */}
          {isAdult && (
            <div style={{
              width: "100%",
              height: 3,
              background: "var(--border-color)",
              borderRadius: 2,
              marginBottom: "0.35rem",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${(timeLeft / 60) * 100}%`,
                background: timeLeft <= 10 ? "#ef4444" : "var(--accent-primary)",
                transition: "width 1s linear, background 0.3s",
                borderRadius: 2,
              }} />
            </div>
          )}

          {/* Puzzle header */}
          <div style={{ width: "100%", marginBottom: "0.4rem" }}>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem" }}>
              {puzzle.title}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              🎯 {puzzle.goal}
            </div>
          </div>

          {/* Code block — flex: 1 playfield */}
          <div style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            overflowY: "auto",
            background: "#0d1117",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
            fontSize: isAdult ? "0.8rem" : "0.88rem",
            marginBottom: "0.4rem",
          }}>
            {puzzle.lines.map((line, i) => {
              let rowBg = "transparent";
              let rowColor = "#e6edf3";
              let anim = "none";

              if (selected !== null) {
                if (i === puzzle.bugLine) {
                  rowBg = "rgba(34,197,94,0.18)";
                  rowColor = "#86efac";
                }
                if (i === selected && !correct) {
                  rowBg = "rgba(239,68,68,0.18)";
                  rowColor = "#fca5a5";
                  anim = "bh-shake 0.4s ease";
                }
                if (i === selected && correct) {
                  anim = "bh-pop 0.3s ease";
                }
              }

              return (
                <div
                  key={i}
                  onClick={() => handleLineClick(i)}
                  onMouseEnter={e => {
                    if (selected === null)
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={e => {
                    if (selected === null)
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.45rem 0.75rem",
                    cursor: selected !== null ? "default" : "pointer",
                    background: rowBg,
                    color: rowColor,
                    animation: anim,
                    userSelect: "none",
                    borderBottom: i < puzzle.lines.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{
                    color: "#6e7681",
                    marginRight: "0.75rem",
                    minWidth: "1.4rem",
                    textAlign: "right",
                    fontSize: "0.75em",
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ whiteSpace: "pre", flex: 1 }}>{line}</span>
                  {selected !== null && i === puzzle.bugLine && (
                    <span style={{ color: "#86efac", fontSize: "0.72rem", marginLeft: "0.5rem", flexShrink: 0 }}>
                      ← bug
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feedback */}
          <div style={{
            minHeight: "2.4rem",
            width: "100%",
            fontSize: "0.82rem",
            color: correct === true ? "#86efac" : correct === false ? "#fca5a5" : "transparent",
            textAlign: "center",
            lineHeight: 1.4,
            padding: "0 0.25rem",
          }}>
            {correct === true && `✅ ${puzzle.explanation}`}
            {correct === false && `❌ ${puzzle.explanation}`}
            {correct === null && "."}
          </div>
        </>
      )}

      {/* ── Game Over ────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          marginTop: "1.5rem",
          textAlign: "center",
          padding: "0 1rem",
        }}>
          <div style={{ fontSize: "3rem" }}>🐛</div>
          <h3 style={{ color: "var(--text-primary)", margin: 0 }}>Bug Hunt Complete!</h3>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent-primary)" }}>
            {score} pts
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
            {score >= 700
              ? "🏆 Expert debugger! You're a bug-slaying machine!"
              : score >= 400
              ? "🔍 Great work! Keep hunting those bugs!"
              : "💪 Nice start! Every bug caught makes you a better coder!"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
