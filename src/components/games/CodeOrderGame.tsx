"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

const KEYFRAMES = `
@keyframes co-robot-step {
  0%,100% { transform: scale(1) rotate(var(--robot-rot)); }
  50%      { transform: scale(1.18) rotate(var(--robot-rot)); }
}
@keyframes co-block-fail {
  0%,100% { background: #4a1a1a; border-color: #e53935; }
  50%      { background: #7a2020; border-color: #ff5252; }
}
@keyframes co-goal-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb,99,102,241),0.5); }
  50%      { box-shadow: 0 0 0 8px rgba(var(--accent-rgb,99,102,241),0); }
}
@keyframes co-win {
  0%   { transform: scale(1) rotate(var(--robot-rot)); }
  30%  { transform: scale(1.6) rotate(calc(var(--robot-rot) + 20deg)); }
  60%  { transform: scale(1.3) rotate(calc(var(--robot-rot) - 15deg)); }
  100% { transform: scale(1) rotate(var(--robot-rot)); }
}
@keyframes co-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes co-star-pop {
  0%   { transform: scale(0); opacity: 0; }
  70%  { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
`;

// ── Types ──────────────────────────────────────────────────────────────────────
type Difficulty = "Kids" | "Adult";
type Phase = "idle" | "playing" | "over";
type Dir = "N" | "E" | "S" | "W";
type BlockKind = "forward" | "turnLeft" | "turnRight" | "repeat2" | "repeat3" | "repeat4";
type RunState = "idle" | "running" | "won" | "crashed";

interface Block { id: string; kind: BlockKind }

interface Puzzle {
  id: number;
  concept: string;
  grid: number[][];   // 0=floor 1=wall
  startR: number; startC: number; startDir: Dir;
  goalR: number; goalC: number;
  palette: BlockKind[];   // what's available (may include decoys)
  solution: BlockKind[];  // minimum/correct sequence
  minTokens: number;      // tokens for 3 stars
}

// ── Direction helpers ──────────────────────────────────────────────────────────
const DIR_ROT: Record<Dir, number> = { N: -90, E: 0, S: 90, W: 180 };
const TURN_LEFT:  Record<Dir, Dir> = { N: "W", W: "S", S: "E", E: "N" };
const TURN_RIGHT: Record<Dir, Dir> = { N: "E", E: "S", S: "W", W: "N" };
const DELTA: Record<Dir, [number,number]> = { N: [-1,0], E: [0,1], S: [1,0], W: [0,-1] };

function expandBlocks(blocks: Block[]): Array<"F"|"L"|"R"> {
  const out: Array<"F"|"L"|"R"> = [];
  for (const b of blocks) {
    if (b.kind === "forward")   { out.push("F"); }
    else if (b.kind === "turnLeft")  { out.push("L"); }
    else if (b.kind === "turnRight") { out.push("R"); }
    else if (b.kind === "repeat2") { out.push("F","F"); }
    else if (b.kind === "repeat3") { out.push("F","F","F"); }
    else if (b.kind === "repeat4") { out.push("F","F","F","F"); }
  }
  return out;
}

// ── Block display ──────────────────────────────────────────────────────────────
const BLOCK_LABEL: Record<BlockKind, string> = {
  forward:  "▶ Forward",
  turnLeft: "↺ Turn Left",
  turnRight:"↻ Turn Right",
  repeat2:  "🔁 ×2",
  repeat3:  "🔁 ×3",
  repeat4:  "🔁 ×4",
};
const BLOCK_COLOR: Record<BlockKind, string> = {
  forward:  "#3b82f6",
  turnLeft: "#f59e0b",
  turnRight:"#f59e0b",
  repeat2:  "#8b5cf6",
  repeat3:  "#8b5cf6",
  repeat4:  "#8b5cf6",
};

// ── Puzzle banks ───────────────────────────────────────────────────────────────
const KIDS_PUZZLES: Puzzle[] = [
  {
    id: 1, concept: "Sequences: put commands in order",
    grid: [[0,0,0,0],[1,1,1,1],[1,1,1,1],[1,1,1,1]],
    startR:0, startC:0, startDir:"E", goalR:0, goalC:3,
    palette: ["forward","forward","forward","forward"],
    solution: ["forward","forward","forward"],
    minTokens: 3,
  },
  {
    id: 2, concept: "Turns: direction matters",
    grid: [[0,1,1,1],[0,1,1,1],[0,0,0,0],[1,1,1,0]],
    startR:0, startC:0, startDir:"E", goalR:3, goalC:3,
    palette: ["forward","forward","forward","turnRight","turnLeft"],
    solution: ["turnRight","forward","forward","turnRight","forward"],
    minTokens: 5,
  },
  {
    id: 3, concept: "Turn once, then go straight",
    grid: [[0,0,0,0,1],[1,1,1,0,1],[1,1,1,0,1],[1,1,1,0,0]],
    startR:0, startC:0, startDir:"E", goalR:3, goalC:4,
    palette: ["forward","forward","forward","turnRight","forward","forward"],
    solution: ["forward","forward","forward","turnRight","forward","forward","forward"],
    minTokens: 7,
  },
  {
    id: 4, concept: "Plan ahead: two turns needed",
    grid: [[0,0,1,1],[1,0,1,1],[1,0,0,0],[1,1,1,0]],
    startR:0, startC:0, startDir:"E", goalR:3, goalC:3,
    palette: ["forward","turnRight","forward","forward","forward","turnRight","turnLeft"],
    solution: ["turnRight","forward","forward","turnRight","forward","forward","forward"],
    minTokens: 7,
  },
  {
    id: 5, concept: "Decoys: not all blocks are needed",
    grid: [[0,0,0,1,1],[1,1,0,1,1],[1,1,0,0,0],[1,1,1,1,1]],
    startR:0, startC:0, startDir:"E", goalR:2, goalC:4,
    palette: ["forward","forward","turnRight","forward","forward","turnLeft","turnRight"],
    solution: ["forward","forward","turnRight","forward","forward","turnRight","forward","forward"],
    minTokens: 8,
  },
  {
    id: 6, concept: "U-turn: turn twice in the same direction",
    grid: [[0,0,0,0,0],[1,1,1,1,0],[0,0,0,0,0],[0,1,1,1,1]],
    startR:0, startC:0, startDir:"E", goalR:2, goalC:0,
    palette: ["forward","forward","forward","forward","turnRight","turnRight","turnLeft"],
    solution: ["forward","forward","forward","forward","turnRight","turnRight","forward","forward","forward","forward"],
    minTokens: 10,
  },
  {
    id: 7, concept: "Zigzag path",
    grid: [[0,0,1,1,1],[1,0,0,1,1],[1,1,0,0,1],[1,1,1,0,0]],
    startR:0, startC:0, startDir:"E", goalR:3, goalC:4,
    palette: ["forward","turnRight","forward","forward","turnRight","forward","forward","turnLeft"],
    solution: ["forward","turnRight","forward","forward","turnRight","forward","forward","turnRight","forward","forward"],
    minTokens: 10,
  },
  {
    id: 8, concept: "Longer journey: stay focused",
    grid: [
      [0,0,0,0,0],
      [1,1,1,1,0],
      [0,0,0,1,0],
      [0,1,1,1,0],
      [0,0,0,0,0],
    ],
    startR:0, startC:0, startDir:"E", goalR:4, goalC:4,
    palette: ["forward","forward","forward","forward","forward","turnRight","turnRight","turnRight","turnLeft","turnLeft"],
    solution: ["forward","forward","forward","forward","turnRight","forward","forward","forward","turnRight","forward","forward","forward","forward","turnRight","forward"],
    minTokens: 15,
  },
];

const ADULT_PUZZLES: Puzzle[] = [
  {
    id: 101, concept: "Find the path: one decoy block per type",
    grid: [[0,0,0,1,1],[1,1,0,1,1],[1,1,0,0,0],[1,1,1,1,0]],
    startR:0, startC:0, startDir:"E", goalR:3, goalC:4,
    palette: ["forward","forward","forward","turnRight","turnRight","turnLeft","forward"],
    solution: ["forward","forward","turnRight","forward","forward","turnRight","forward"],
    minTokens: 7,
  },
  {
    id: 102, concept: "Repeat ×3: compress repeated forward steps",
    grid: [[0,0,0,0,0,0],[1,1,1,1,1,1],[1,1,1,1,1,1]],
    startR:0, startC:0, startDir:"E", goalR:0, goalC:5,
    palette: ["forward","forward","forward","forward","forward","repeat3","forward"],
    solution: ["repeat3","forward","forward"],
    minTokens: 3,
  },
  {
    id: 103, concept: "Repeat ×2: two steps then a turn, twice",
    grid: [[0,0,1,1],[1,0,1,1],[1,0,0,0],[1,1,1,0]],
    startR:0, startC:0, startDir:"E", goalR:3, goalC:3,
    palette: ["repeat2","forward","turnRight","forward","forward","turnLeft","turnRight"],
    solution: ["turnRight","repeat2","forward","turnRight","repeat2","forward"],
    minTokens: 6,
  },
  {
    id: 104, concept: "Repeat ×4: long corridor, use the loop",
    grid: [[0,0,0,0,0,1],[1,1,1,1,0,1],[1,1,1,1,0,1],[1,1,1,1,0,0]],
    startR:0, startC:0, startDir:"E", goalR:3, goalC:5,
    palette: ["forward","forward","forward","forward","repeat4","turnRight","turnLeft"],
    solution: ["repeat4","turnRight","repeat4","turnRight","forward"],
    minTokens: 5,
  },
  {
    id: 105, concept: "Crowded palette: many decoys",
    grid: [
      [0,0,0,1,1],
      [1,1,0,1,1],
      [1,1,0,0,1],
      [1,1,1,0,0],
    ],
    startR:0, startC:0, startDir:"E", goalR:3, goalC:4,
    palette: ["forward","forward","forward","turnRight","turnRight","turnLeft","turnLeft","repeat2","repeat3"],
    solution: ["forward","forward","turnRight","forward","forward","turnRight","forward","forward"],
    minTokens: 8,
  },
  {
    id: 106, concept: "Spiral: recognise the repeating unit",
    grid: [
      [0,0,0,0,0],
      [1,1,1,1,0],
      [0,0,0,1,0],
      [0,1,0,1,0],
      [0,0,0,1,0],
    ],
    startR:0, startC:0, startDir:"E", goalR:4, goalC:0,
    palette: ["forward","forward","forward","forward","turnRight","turnRight","repeat3","repeat4","turnLeft"],
    solution: ["repeat4","turnRight","forward","forward","forward","turnRight","forward","forward","turnRight","forward","turnRight","forward","forward"],
    minTokens: 13,
  },
  {
    id: 107, concept: "Efficient route: stars only for optimal",
    grid: [
      [0,0,0,0,1],
      [1,1,1,0,1],
      [1,0,0,0,1],
      [1,0,1,1,1],
      [1,0,0,0,0],
    ],
    startR:0, startC:0, startDir:"E", goalR:4, goalC:4,
    palette: ["forward","forward","forward","forward","forward","turnRight","turnRight","turnRight","turnLeft","repeat2"],
    solution: ["repeat2","forward","turnRight","repeat2","forward","turnRight","forward","forward","turnRight","repeat2","forward"],
    minTokens: 11,
  },
  {
    id: 108, concept: "Master: repeat blocks and tight turns",
    grid: [
      [0,0,0,1,1,1],
      [1,1,0,1,1,1],
      [1,1,0,0,0,1],
      [1,1,1,1,0,1],
      [1,0,0,0,0,1],
      [1,0,1,1,1,1],
    ],
    startR:0, startC:0, startDir:"E", goalR:4, goalC:1,
    palette: ["forward","forward","forward","forward","turnRight","turnRight","turnRight","turnLeft","repeat2","repeat3"],
    solution: ["forward","forward","turnRight","repeat3","forward","turnRight","repeat3","forward","turnRight","forward"],
    minTokens: 10,
  },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function CodeOrderGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Kids");
  const [phase, setPhase]           = useState<Phase>("idle");
  const [puzzleIdx, setPuzzleIdx]   = useState(0);
  const [program, setProgram]       = useState<Block[]>([]);
  const [robotR, setRobotR]         = useState(0);
  const [robotC, setRobotC]         = useState(0);
  const [robotDir, setRobotDir]     = useState<Dir>("E");
  const [runState, setRunState]     = useState<RunState>("idle");
  const [failBlock, setFailBlock]   = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const [stars, setStars]           = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [showHint, setShowHint]     = useState(false);
  const [hintLevel, setHintLevel]   = useState(0);
  const [containerWidth, setContainerWidth] = useState(400);

  const runTimers    = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextIdRef    = useRef(0);
  const diffRef      = useRef<Difficulty>("Kids");
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width for responsive grid
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const puzzles = difficulty === "Kids" ? KIDS_PUZZLES : ADULT_PUZZLES;
  const puzzle  = phase === "playing" ? puzzles[puzzleIdx] : null;

  // ── Clear run timers ───────────────────────────────────────────────────────
  const clearRun = useCallback(() => {
    runTimers.current.forEach(clearTimeout);
    runTimers.current = [];
  }, []);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    clearRun();
    const p = (diffRef.current === "Kids" ? KIDS_PUZZLES : ADULT_PUZZLES)[0];
    setRobotR(p.startR); setRobotC(p.startC); setRobotDir(p.startDir);
    setProgram([]); setRunState("idle"); setFailBlock(null);
    attemptsRef.current = 0; setStars(0); setTotalStars(0);
    setShowHint(false); setHintLevel(0);
    setPuzzleIdx(0);
    setPhase("playing");
  }, [clearRun]);

  const loadPuzzle = useCallback((idx: number, diff: Difficulty) => {
    const pool = diff === "Kids" ? KIDS_PUZZLES : ADULT_PUZZLES;
    if (idx >= pool.length) { setPhase("over"); return; }
    const p = pool[idx];
    clearRun();
    setRobotR(p.startR); setRobotC(p.startC); setRobotDir(p.startDir);
    setProgram([]); setRunState("idle"); setFailBlock(null);
    attemptsRef.current = 0; setShowHint(false); setHintLevel(0);
    setPuzzleIdx(idx);
  }, [clearRun]);

  const resetPuzzle = useCallback(() => {
    if (!puzzle) return;
    clearRun();
    setRobotR(puzzle.startR); setRobotC(puzzle.startC); setRobotDir(puzzle.startDir);
    setProgram([]); setRunState("idle"); setFailBlock(null);
  }, [puzzle, clearRun]);

  // ── Program editing ────────────────────────────────────────────────────────
  const addBlock = (kind: BlockKind) => {
    if (runState === "running") return;
    const id = `b${nextIdRef.current++}`;
    setProgram(p => [...p, { id, kind }]);
    setRunState("idle"); setFailBlock(null);
  };

  const removeBlock = (id: string) => {
    if (runState === "running") return;
    setProgram(p => p.filter(b => b.id !== id));
    setRunState("idle"); setFailBlock(null);
  };

  const clearProgram = () => {
    if (runState === "running") return;
    setProgram([]); setRunState("idle"); setFailBlock(null);
  };

  // ── Run program ────────────────────────────────────────────────────────────
  const runProgram = useCallback(() => {
    if (!puzzle || runState === "running" || program.length === 0) return;
    clearRun();
    const moves = expandBlocks(program);
    let r = puzzle.startR, c = puzzle.startC, dir: Dir = puzzle.startDir;
    setRobotR(r); setRobotC(c); setRobotDir(dir);
    setRunState("running"); setFailBlock(null);

    const STEP_MS = 380;
    let crashed = false;

    moves.forEach((mv, i) => {
      const t = setTimeout(() => {
        if (mv === "L") { dir = TURN_LEFT[dir]; setRobotDir(dir); return; }
        if (mv === "R") { dir = TURN_RIGHT[dir]; setRobotDir(dir); return; }
        // Forward
        const [dr, dc] = DELTA[dir];
        const nr = r + dr, nc = c + dc;
        const grid = puzzle.grid;
        const outOfBounds = nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length;
        const isWall = !outOfBounds && grid[nr][nc] === 1;
        if (outOfBounds || isWall) {
          crashed = true;
          // find the program block responsible
          let flat = 0;
          let fid: string | null = null;
          for (const b of program) {
            const cnt = b.kind === "forward" ? 1 : b.kind === "turnLeft" || b.kind === "turnRight" ? 1
              : b.kind === "repeat2" ? 2 : b.kind === "repeat3" ? 3 : 4;
            if (flat + cnt > i) { fid = b.id; break; }
            flat += cnt;
          }
          setFailBlock(fid);
          setRunState("crashed");
          attemptsRef.current += 1;
          if (attemptsRef.current >= 2) setShowHint(true);
          return;
        }
        r = nr; c = nc;
        setRobotR(r); setRobotC(c);

        // Check win
        if (r === puzzle.goalR && c === puzzle.goalC && !crashed) {
          const earnedStars = program.length <= puzzle.minTokens ? 3 : program.length <= puzzle.minTokens + 2 ? 2 : 1;
          setStars(earnedStars);
          setTotalStars(ts => ts + earnedStars);
          setRunState("won");
        }
      }, STEP_MS * (i + 1));
      runTimers.current.push(t);
    });

    // If all moves done without reaching goal
    const finalT = setTimeout(() => {
      if (!crashed) setRunState(prev => prev === "running" ? "crashed" : prev);
    }, STEP_MS * (moves.length + 1));
    runTimers.current.push(finalT);
  }, [puzzle, program, runState, clearRun]);

  // ── Hint system ────────────────────────────────────────────────────────────
  const handleHint = () => {
    if (!puzzle) return;
    const next = Math.min(hintLevel + 1, puzzle.solution.length);
    setHintLevel(next);
    const hinted = puzzle.solution.slice(0, next).map(k => ({ id: `h${nextIdRef.current++}`, kind: k }));
    setProgram(hinted);
    setRunState("idle"); setFailBlock(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const gridRows  = puzzle?.grid.length ?? 0;
  const gridCols  = puzzle?.grid[0]?.length ?? 0;
  // Cap grid height so it never exceeds ~45% of viewport height on mobile
  const maxCellByWidth  = gridCols > 0
    ? Math.floor((containerWidth - 24 - (gridCols - 1) * 2) / gridCols)
    : 62;
  const maxCellByHeight = gridRows > 0
    ? Math.floor((Math.min(window?.innerHeight ?? 800, 800) * 0.42) / gridRows)
    : 62;
  const maxCell   = difficulty === "Kids" ? 60 : 50;
  const cellPx    = Math.min(maxCell, maxCellByWidth, maxCellByHeight);
  const robotRot  = DIR_ROT[robotDir];

  // Palette: count available per kind
  const paletteKinds = puzzle
    ? puzzle.palette.filter((k, i, a) => a.indexOf(k) === i)
    : [];

  return (
    <div className={styles.gameInner} ref={containerRef}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Difficulty selector */}
      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["Kids","Adult"] as Difficulty[]).map(d => (
          <button key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => { setDifficulty(d); setPhase("idle"); clearRun(); }}
          >{d}</button>
        ))}
      </div>

      {/* ── IDLE ────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "2rem 0", animation: "co-fade-in 0.3s ease-out" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🤖</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "0.75rem" }}>
            {difficulty === "Kids"
              ? "Arrange the command blocks in the right order to guide the robot to the star! Hit Run to watch it go."
              : "Build the most efficient program to navigate the robot. Use Repeat blocks for bonus stars!"}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
            {difficulty === "Kids"
              ? "8 puzzles · Click blocks to add/remove · Hint available after 2 wrong runs"
              : "8 puzzles · Repeat blocks compress steps · Fewer tokens = more stars ⭐"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Start!</button>
        </div>
      )}

      {/* ── PLAYING ─────────────────────────────────────────────────────── */}
      {phase === "playing" && puzzle && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", animation: "co-fade-in 0.3s ease-out", width: "100%" }}>

          {/* HUD */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Puzzle <strong style={{ color: "var(--text-primary)" }}>{puzzleIdx + 1}</strong> / {puzzles.length}
              </div>
              <div style={{ display: "flex", gap: "2px" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} style={{ fontSize: "1rem", opacity: runState === "won" && i < stars ? 1 : 0.2 }}>⭐</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
              {puzzle.concept}
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: `repeat(${gridCols}, ${cellPx}px)`,
              gridTemplateRows: `repeat(${gridRows}, ${cellPx}px)`,
              gap: 2,
              background: "var(--bg-primary)",
              borderRadius: "var(--radius-sm)",
              padding: 4,
              border: "1px solid var(--border-color)",
            }}>
              {puzzle.grid.flatMap((row, r) =>
                row.map((cell, c) => {
                  const isGoal = r === puzzle.goalR && c === puzzle.goalC;
                  const isRobot = r === robotR && c === robotC;
                  return (
                    <div key={`${r}-${c}`} style={{
                      width: cellPx, height: cellPx,
                      background: cell === 1 ? "var(--bg-primary)" : "var(--bg-secondary)",
                      borderRadius: 4,
                      border: cell === 1 ? "1px solid var(--border-color)" : "1px solid transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: cellPx * 0.5,
                      position: "relative",
                      boxShadow: isGoal ? "0 0 0 3px var(--accent-primary)" : undefined,
                      animation: isGoal ? "co-goal-pulse 1.5s ease-in-out infinite" : undefined,
                    }}>
                      {cell === 1 && <span style={{ opacity: 0.4, fontSize: cellPx * 0.45 }}>🧱</span>}
                      {isGoal && !isRobot && <span>⭐</span>}
                      {isRobot && (
                        <span style={{
                          display: "inline-block",
                          // @ts-expect-error css custom property
                          "--robot-rot": `${robotRot}deg`,
                          transform: `rotate(${robotRot}deg)`,
                          animation: runState === "won"
                            ? "co-win 0.6s ease-out"
                            : runState === "running"
                            ? "co-robot-step 0.38s ease-in-out"
                            : undefined,
                          fontSize: cellPx * 0.55,
                          transition: "transform 0.2s ease",
                        }}>🤖</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Status */}
          {runState === "crashed" && (
            <div style={{ textAlign: "center", color: "#ef4444", fontWeight: 700, fontSize: "0.9rem" }}>
              💥 Crashed! Check the highlighted block and try again.
            </div>
          )}
          {runState === "won" && (
            <div style={{ textAlign: "center", animation: "co-fade-in 0.3s ease-out" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#22c55e", marginBottom: "0.25rem" }}>
                ✓ Solved!{" "}
                {Array.from({ length: stars }).map((_, i) => (
                  <span key={i} style={{ animation: `co-star-pop 0.4s ${i * 0.12}s ease-out both` }}>⭐</span>
                ))}
              </div>
              {stars < 3 && <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Try using fewer blocks for 3 stars!</div>}
              <button
                className={styles.resetBtn}
                style={{ marginTop: "0.75rem" }}
                onClick={() => { setStars(0); loadPuzzle(puzzleIdx + 1, difficulty); }}
              >
                {puzzleIdx + 1 < puzzles.length ? "Next Puzzle →" : "See Results"}
              </button>
            </div>
          )}

          {/* Hint */}
          {showHint && runState !== "won" && (
            <div style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-highlight)",
              borderRadius: "var(--radius-sm)", padding: "0.6rem 0.85rem",
              fontSize: "0.8rem", color: "var(--text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
            }}>
              <span>
                {hintLevel === 0
                  ? "Need a hint? Reveal the first block."
                  : `Showing first ${hintLevel} block${hintLevel > 1 ? "s" : ""}.`}
              </span>
              <button onClick={handleHint} style={{
                background: "var(--accent-primary)", color: "#fff",
                border: "none", borderRadius: "var(--radius-sm)",
                padding: "0.25rem 0.65rem", fontSize: "0.78rem", cursor: "pointer",
              }}>
                {hintLevel >= puzzle.solution.length ? "Full solution shown" : "Show hint"}
              </button>
            </div>
          )}

          {/* Program area */}
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
              Your Program ({program.length} block{program.length !== 1 ? "s" : ""})
            </div>
            <div style={{
              minHeight: 52, display: "flex", flexWrap: "wrap", gap: "0.4rem",
              background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)", padding: "0.6rem",
            }}>
              {program.length === 0 && (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", alignSelf: "center" }}>
                  Click blocks below to build your program…
                </span>
              )}
              {program.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => removeBlock(b.id)}
                  title="Tap to remove"
                  style={{
                    background: failBlock === b.id ? undefined : BLOCK_COLOR[b.kind],
                    border: `2px solid ${failBlock === b.id ? "#e53935" : BLOCK_COLOR[b.kind]}`,
                    borderRadius: "var(--radius-sm)",
                    color: "#fff", fontWeight: 700, fontSize: "0.82rem",
                    padding: "0.4rem 0.7rem",
                    minHeight: 40,
                    cursor: "pointer",
                    animation: failBlock === b.id ? "co-block-fail 0.5s ease-in-out infinite" : undefined,
                    opacity: runState === "running" ? 0.8 : 1,
                  }}
                >
                  <span style={{ fontSize: "0.65rem", opacity: 0.7, marginRight: 2 }}>{idx + 1}.</span>
                  {BLOCK_LABEL[b.kind]}
                </button>
              ))}
            </div>
          </div>

          {/* Palette */}
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
              Available Blocks
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {paletteKinds.map(kind => (
                <button
                  key={kind}
                  onClick={() => addBlock(kind)}
                  disabled={runState === "running"}
                  style={{
                    background: BLOCK_COLOR[kind],
                    border: `2px solid ${BLOCK_COLOR[kind]}`,
                    borderRadius: "var(--radius-sm)",
                    color: "#fff", fontWeight: 700, fontSize: "0.85rem",
                    padding: "0.45rem 0.85rem",
                    minHeight: 44,
                    cursor: runState === "running" ? "default" : "pointer",
                    opacity: runState === "running" ? 0.6 : 1,
                  }}
                >
                  {BLOCK_LABEL[kind]}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className={styles.resetBtn}
              onClick={runProgram}
              disabled={program.length === 0 || runState === "running" || runState === "won"}
              style={{ opacity: program.length === 0 || runState === "running" || runState === "won" ? 0.5 : 1 }}
            >
              ▶ Run
            </button>
            <button onClick={resetPuzzle} style={{
              background: "transparent", border: "1px solid var(--border-color)",
              color: "var(--text-secondary)", padding: "0.55rem 1rem",
              borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.85rem",
              minHeight: 44,
            }}>
              ↺ Reset
            </button>
            {program.length > 0 && (
              <button onClick={clearProgram} style={{
                background: "transparent", border: "1px solid var(--border-color)",
                color: "var(--text-secondary)", padding: "0.55rem 1rem",
                borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.85rem",
                minHeight: 44,
              }}>
                🗑 Clear
              </button>
            )}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
            Tap a block in your program to remove it · Tap Available Blocks to add
          </div>
        </div>
      )}

      {/* ── OVER ────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ textAlign: "center", padding: "2rem 0", animation: "co-fade-in 0.3s ease-out" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
            {totalStars >= puzzles.length * 3 ? "🏆" : totalStars >= puzzles.length * 2 ? "🎉" : "🤖"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            {totalStars >= puzzles.length * 3 ? "Perfect! All 3-star solutions!" : "All puzzles complete!"}
          </div>
          <div style={{ fontSize: "3rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1, marginBottom: "0.2rem" }}>
            {totalStars} ⭐
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            out of {puzzles.length * 3} stars
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
            <button onClick={() => setPhase("idle")} style={{
              background: "transparent", border: "1px solid var(--border-color)",
              color: "var(--text-secondary)", padding: "0.5rem 1.25rem",
              borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.85rem",
            }}>Change Mode</button>
          </div>
        </div>
      )}
    </div>
  );
}
