"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

const KEYFRAMES = `
@keyframes spin-cw  { to { transform: rotate(360deg); } }
@keyframes spin-ccw { to { transform: rotate(-360deg); } }
`;

type Phase = "idle" | "playing" | "over";
type Diff  = "kids" | "adult";
type Dir   = "cw" | "ccw";

interface GearDef { teeth: number; color: string; }
interface Puzzle  { gears: GearDef[]; driverRpm: number; dir: Dir; outputRpm: number; }
interface Choice  { dir: Dir; rpm: number; }

// ── Geometry ──────────────────────────────────────────────────────────────────
const SC = 1.8;
function outerR(t: number) { return t * SC + 5; }
function innerR(t: number) { return outerR(t) * 0.70; }
function hubR(t: number)   { return outerR(t) * 0.24; }

function gearPath(teeth: number): string {
  const R = outerR(teeth), r = innerR(teeth), h = hubR(teeth), n = teeth;
  const pt = (rad: number, ang: number) =>
    `${(rad * Math.cos(ang)).toFixed(2)},${(rad * Math.sin(ang)).toFixed(2)}`;
  let d = "";
  for (let i = 0; i < n; i++) {
    const base = (i / n) * 2 * Math.PI;
    const a0 = base - (0.50 / n) * 2 * Math.PI;
    const a1 = base - (0.26 / n) * 2 * Math.PI;
    const a2 = base - (0.18 / n) * 2 * Math.PI;
    const a3 = base + (0.18 / n) * 2 * Math.PI;
    const a4 = base + (0.26 / n) * 2 * Math.PI;
    if (i === 0) d += `M${pt(r, a0)}`;
    else d += ` L${pt(r, a0)}`;
    d += ` L${pt(r, a1)} L${pt(R, a2)} L${pt(R, a3)} L${pt(r, a4)}`;
  }
  d += " Z";
  const hf = h.toFixed(2);
  d += ` M${hf},0 A${hf},${hf},0,1,0,-${hf},0 A${hf},${hf},0,1,0,${hf},0 Z`;
  return d;
}

function computeLayout(gears: GearDef[]) {
  const pad = 12;
  let cx = pad + outerR(gears[0].teeth);
  const cxs: number[] = [];
  for (let i = 0; i < gears.length; i++) {
    cxs.push(cx);
    if (i < gears.length - 1) cx += outerR(gears[i].teeth) + outerR(gears[i + 1].teeth) - 2;
  }
  const maxOR = Math.max(...gears.map(g => outerR(g.teeth)));
  const width  = cxs[cxs.length - 1] + outerR(gears[gears.length - 1].teeth) + pad;
  const height = maxOR * 2 + pad * 2 + 22; // extra for labels below
  return { cxs, cy: maxOR + pad, width, height };
}

// ── Puzzle bank ───────────────────────────────────────────────────────────────
const C = ["#7c3aed", "#ec4899", "#0ea5e9", "#f59e0b", "#22c55e"];

const KIDS_PUZZLES: Puzzle[] = [
  { gears:[{teeth:12,color:C[0]},{teeth:24,color:C[1]}],                      driverRpm:60, dir:"ccw", outputRpm:30  },
  { gears:[{teeth:24,color:C[2]},{teeth:12,color:C[3]}],                      driverRpm:60, dir:"ccw", outputRpm:120 },
  { gears:[{teeth:16,color:C[0]},{teeth:16,color:C[4]}],                      driverRpm:60, dir:"ccw", outputRpm:60  },
  { gears:[{teeth:8, color:C[1]},{teeth:24,color:C[2]}],                      driverRpm:60, dir:"ccw", outputRpm:20  },
  { gears:[{teeth:16,color:C[0]},{teeth:8, color:C[3]},{teeth:16,color:C[2]}],driverRpm:60, dir:"cw",  outputRpm:60  },
  { gears:[{teeth:12,color:C[4]},{teeth:24,color:C[1]},{teeth:12,color:C[0]}],driverRpm:60, dir:"cw",  outputRpm:60  },
  { gears:[{teeth:8, color:C[2]},{teeth:16,color:C[3]},{teeth:24,color:C[4]}],driverRpm:60, dir:"cw",  outputRpm:20  },
  { gears:[{teeth:24,color:C[0]},{teeth:8, color:C[1]},{teeth:16,color:C[2]}],driverRpm:60, dir:"cw",  outputRpm:90  },
];

const ADULT_PUZZLES: Puzzle[] = [
  { gears:[{teeth:10,color:C[0]},{teeth:20,color:C[1]},{teeth:40,color:C[2]}],                                  driverRpm:120, dir:"cw",  outputRpm:30  },
  { gears:[{teeth:40,color:C[3]},{teeth:20,color:C[4]},{teeth:10,color:C[0]}],                                  driverRpm:60,  dir:"cw",  outputRpm:240 },
  { gears:[{teeth:12,color:C[1]},{teeth:8, color:C[2]},{teeth:24,color:C[3]}],                                  driverRpm:60,  dir:"cw",  outputRpm:30  },
  { gears:[{teeth:24,color:C[4]},{teeth:8, color:C[0]},{teeth:12,color:C[1]}],                                  driverRpm:60,  dir:"cw",  outputRpm:120 },
  { gears:[{teeth:10,color:C[0]},{teeth:20,color:C[1]},{teeth:40,color:C[2]},{teeth:20,color:C[3]}],            driverRpm:120, dir:"ccw", outputRpm:60  },
  { gears:[{teeth:40,color:C[4]},{teeth:20,color:C[0]},{teeth:10,color:C[1]},{teeth:20,color:C[2]}],            driverRpm:60,  dir:"ccw", outputRpm:120 },
  { gears:[{teeth:12,color:C[3]},{teeth:24,color:C[4]},{teeth:8, color:C[0]},{teeth:16,color:C[1]}],            driverRpm:80,  dir:"ccw", outputRpm:60  },
  { gears:[{teeth:20,color:C[2]},{teeth:10,color:C[3]},{teeth:30,color:C[4]},{teeth:15,color:C[0]}],            driverRpm:60,  dir:"ccw", outputRpm:80  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeChoices(dir: Dir, outputRpm: number, driverRpm: number): Choice[] {
  const opp: Dir = dir === "cw" ? "ccw" : "cw";
  const wrongs = [driverRpm, outputRpm * 2, Math.round(outputRpm * 1.5)];
  const uw = wrongs.filter((r, i, a) => r !== outputRpm && a.indexOf(r) === i);
  const wr1 = uw[0] ?? outputRpm + 30;
  const wr2 = (uw[1] !== undefined && uw[1] !== wr1) ? uw[1] : wr1 + 30;
  return shuffled<Choice>([
    { dir, rpm: outputRpm },
    { dir: opp, rpm: outputRpm },
    { dir, rpm: wr1 },
    { dir: opp, rpm: wr2 },
  ]);
}

const BASE_DUR = 3.5;
function animDur(puzzle: Puzzle, gi: number) {
  return BASE_DUR * puzzle.gears[gi].teeth / puzzle.gears[0].teeth;
}
function gearDir(_: Puzzle, gi: number): Dir { return gi % 2 === 0 ? "cw" : "ccw"; }

const GAME_SEC = 60;

// ── Component ─────────────────────────────────────────────────────────────────
export default function GearTrainGame({ title }: { title: string }) {
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [diff,         setDiff]         = useState<Diff>("kids");
  const [score,        setScore]        = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [timeLeft,     setTimeLeft]     = useState(GAME_SEC);
  const [puzzle,       setPuzzle]       = useState<Puzzle>(KIDS_PUZZLES[0]);
  const [flash,        setFlash]        = useState<"ok" | "bad" | null>(null);
  const [adultChoices, setAdultChoices] = useState<Choice[]>([]);

  const phaseRef  = useRef<Phase>("idle");
  const diffRef   = useRef<Diff>("kids");
  const scoreRef  = useRef(0);
  const streakRef = useRef(0);
  const lockedRef = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poolRef   = useRef<Puzzle[]>([]);
  const pidxRef   = useRef(0);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const nextQ = useCallback(() => {
    lockedRef.current = false;
    setFlash(null);
    pidxRef.current = (pidxRef.current + 1) % poolRef.current.length;
    const p = poolRef.current[pidxRef.current];
    setPuzzle(p);
    if (diffRef.current === "adult") setAdultChoices(makeChoices(p.dir, p.outputRpm, p.driverRpm));
  }, []);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const d = diff;
    const pool = shuffled(d === "kids" ? KIDS_PUZZLES : ADULT_PUZZLES);
    poolRef.current = pool;
    pidxRef.current = 0;
    phaseRef.current = "playing";
    diffRef.current  = d;
    scoreRef.current  = 0;
    streakRef.current = 0;
    lockedRef.current = false;
    const first = pool[0];
    setPhase("playing");
    setScore(0);
    setStreak(0);
    setTimeLeft(GAME_SEC);
    setFlash(null);
    setPuzzle(first);
    if (d === "adult") setAdultChoices(makeChoices(first.dir, first.outputRpm, first.driverRpm));
    const tick = () => {
      setTimeLeft(prev => {
        if (prev <= 1) { phaseRef.current = "over"; setPhase("over"); return 0; }
        timerRef.current = setTimeout(tick, 1000);
        return prev - 1;
      });
    };
    timerRef.current = setTimeout(tick, 1000);
  }, [diff]);

  const handleAnswer = useCallback((correct: boolean) => {
    if (phaseRef.current !== "playing" || lockedRef.current) return;
    lockedRef.current = true;
    if (correct) {
      streakRef.current++;
      const bonus = streakRef.current >= 5 ? 2 : streakRef.current >= 3 ? 1 : 0;
      scoreRef.current += 1 + bonus;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setFlash("ok");
    } else {
      streakRef.current = 0;
      setStreak(0);
      setFlash("bad");
    }
    setTimeout(nextQ, 700);
  }, [nextQ]);

  const layout = computeLayout(puzzle.gears);
  const borderColor = flash === "ok" ? "#22c55e" : flash === "bad" ? "#ef4444" : "var(--border-color)";

  return (
    <div className={styles.gameInner} style={{ padding: "0.75rem", justifyContent: "flex-start", gap: "0.5rem" }}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>⚙️ {title}</h2>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["kids", "adult"] as Diff[]).map(d => (
          <button key={d}
            className={`${styles.diffBtn} ${diff === d ? styles.activeDiff : ""}`}
            onClick={() => { if (phase !== "playing") setDiff(d); }}
            disabled={phase === "playing"}
          >{d === "kids" ? "👶 Kids" : "🧑 Adult"}</button>
        ))}
      </div>

      {phase === "idle" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
          <div style={{ fontSize: "4rem" }}>⚙️</div>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", fontSize: "0.9rem", maxWidth: 280, lineHeight: 1.5 }}>
            {diff === "kids"
              ? "The DRIVER gear always spins clockwise ↻. Which way does the last gear turn?"
              : "Trace the gear chain: figure out the output direction AND speed in RPM. 60 seconds!"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Start! ⚙️</button>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "0 0.2rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: timeLeft <= 10 ? "#ef4444" : "var(--text-primary)" }}>⏱ {timeLeft}s</span>
            {streak >= 3 && <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "0.85rem" }}>🔥 ×{streak}</span>}
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fbbf24" }}>⭐ {score}</span>
          </div>

          {/* Gear SVG playfield */}
          <div style={{
            flex: 1, minHeight: 0, overflow: "hidden", width: "100%",
            border: `2px solid ${borderColor}`, borderRadius: 16,
            background: "var(--bg-secondary)", display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "border-color 0.15s",
          }}>
            <svg
              viewBox={`0 0 ${layout.width.toFixed(1)} ${layout.height.toFixed(1)}`}
              width="100%" height="100%"
              preserveAspectRatio="xMidYMid meet"
              style={{ display: "block" }}
            >
              {puzzle.gears.map((g, i) => {
                const cx = layout.cxs[i];
                const cy = layout.cy;
                const dir = gearDir(puzzle, i);
                const dur = animDur(puzzle, i);
                const isDriver = i === 0;
                const isOutput = i === puzzle.gears.length - 1;
                const or = outerR(g.teeth);
                return (
                  <g key={i} transform={`translate(${cx.toFixed(1)},${cy.toFixed(1)})`}>
                    {/* Rotating gear */}
                    <g style={{
                      animation: `${dir === "cw" ? "spin-cw" : "spin-ccw"} ${dur.toFixed(2)}s linear infinite`,
                      transformOrigin: "50% 50%",
                      transformBox: "fill-box",
                    } as React.CSSProperties}>
                      <path d={gearPath(g.teeth)} fill={g.color} fillRule="evenodd" opacity={0.88} />
                      <circle r={hubR(g.teeth) * 0.55} fill="#0f0f1a" />
                    </g>
                    {/* Static labels below gear */}
                    <text
                      y={or + 11} textAnchor="middle"
                      fill={isDriver ? "#7c3aed" : isOutput ? "#ec4899" : "var(--text-secondary)"}
                      fontSize="9" fontWeight="700"
                    >
                      {isDriver ? "DRIVER ↻" : isOutput ? "OUTPUT" : `Gear ${i + 1}`}
                    </text>
                    {diff === "adult" && (
                      <text y={or + 21} textAnchor="middle" fill="var(--text-secondary)" fontSize="8">
                        {g.teeth}T
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {diff === "adult" && (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Driver speed: <strong style={{ color: "var(--text-primary)" }}>{puzzle.driverRpm} RPM</strong>
            </div>
          )}

          <div style={{ textAlign: "center", color: "var(--text-primary)", fontWeight: 700, fontSize: "0.95rem" }}>
            {diff === "kids"
              ? "Which way does the OUTPUT gear spin?"
              : "What is the output direction and RPM?"}
          </div>

          {diff === "kids" ? (
            <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
              {(["cw", "ccw"] as Dir[]).map(d => (
                <button key={d}
                  onClick={() => handleAnswer(d === puzzle.dir)}
                  style={{
                    flex: 1, padding: "0.75rem", borderRadius: 12,
                    border: "2px solid var(--border-color)",
                    background: "var(--bg-secondary)", color: "var(--text-primary)",
                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {d === "cw" ? "↻ Clockwise" : "↺ Counter-CW"}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", width: "100%" }}>
              {adultChoices.map((c, i) => (
                <button key={i}
                  onClick={() => handleAnswer(c.dir === puzzle.dir && c.rpm === puzzle.outputRpm)}
                  style={{
                    padding: "0.65rem 0.4rem", borderRadius: 10,
                    border: "2px solid var(--border-color)",
                    background: "var(--bg-secondary)", color: "var(--text-primary)",
                    fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", lineHeight: 1.3,
                  }}
                >
                  {c.dir === "cw" ? "↻ CW" : "↺ CCW"}<br />{c.rpm} RPM
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {phase === "over" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ fontSize: "3rem" }}>🏁</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Your score:</div>
          <div style={{ fontSize: "4.5rem", fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>{score}</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center" }}>
            {score === 0  ? "Gear logic takes practice — try again! ⚙️"
              : score < 5  ? "Good start! ⚙️"
              : score < 10 ? "Getting the hang of it! 🌟"
              : "Gear master! ⚙️🌟"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
