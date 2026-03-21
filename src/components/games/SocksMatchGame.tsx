"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Types ──────────────────────────────────────────────────────────────────
type Mode = "kids" | "adult";
type Phase = "idle" | "playing" | "won" | "lost";
type Pattern = "solid" | "hstripes" | "dots" | "dstripes";
type CardState = "idle" | "selected" | "matched" | "wrong";

interface SockDef { color: string; accent: string; pattern: Pattern; }
interface SockCard { id: number; pairId: number; def: SockDef; state: CardState; }

// ── Sock definitions ───────────────────────────────────────────────────────
const KIDS_DEFS: SockDef[] = [
  { color: "#ef4444", accent: "#ef4444", pattern: "solid" },
  { color: "#3b82f6", accent: "#3b82f6", pattern: "solid" },
  { color: "#22c55e", accent: "#22c55e", pattern: "solid" },
  { color: "#f59e0b", accent: "#f59e0b", pattern: "solid" },
  { color: "#a855f7", accent: "#a855f7", pattern: "solid" },
  { color: "#ec4899", accent: "#ec4899", pattern: "solid" },
];

// Adult: similar-looking pairs to increase challenge
const ADULT_DEFS: SockDef[] = [
  { color: "#dc2626", accent: "#ffffff", pattern: "hstripes" },  // red/white stripes
  { color: "#ea580c", accent: "#ffffff", pattern: "hstripes" },  // orange/white stripes (similar!)
  { color: "#2563eb", accent: "#fbbf24", pattern: "dots" },      // blue/gold dots
  { color: "#1e3a8a", accent: "#fcd34d", pattern: "dots" },      // navy/yellow dots (similar!)
  { color: "#16a34a", accent: "#ffffff", pattern: "dstripes" },  // green/white diagonal
  { color: "#15803d", accent: "#bbf7d0", pattern: "dstripes" },  // dark green/light (similar!)
  { color: "#7c3aed", accent: "#f9a8d4", pattern: "hstripes" },  // purple/pink stripes
  { color: "#0f172a", accent: "#e2e8f0", pattern: "dots" },      // black/white dots
];

const ADULT_TIME = 90;

// ── Helpers ────────────────────────────────────────────────────────────────
function getBg({ color, accent, pattern }: SockDef): string {
  if (pattern === "solid")    return color;
  if (pattern === "hstripes") return `repeating-linear-gradient(0deg,${color} 0px,${color} 10px,${accent} 10px,${accent} 20px)`;
  if (pattern === "dots")     return `radial-gradient(circle,${accent} 4px,transparent 4px) 8px 8px / 16px 16px,${color}`;
  /* dstripes */               return `repeating-linear-gradient(45deg,${color} 0px,${color} 8px,${accent} 8px,${accent} 16px)`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(defs: SockDef[]): SockCard[] {
  const cards: SockCard[] = [];
  defs.forEach((def, pairId) => {
    cards.push({ id: pairId * 2,     pairId, def, state: "idle" });
    cards.push({ id: pairId * 2 + 1, pairId, def, state: "idle" });
  });
  return shuffle(cards);
}

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

const KEYFRAMES = `
@keyframes smWrong {
  0%,100% { transform: translateX(0) rotate(0deg); }
  25%     { transform: translateX(-6px) rotate(-4deg); }
  75%     { transform: translateX(6px) rotate(4deg); }
}
@keyframes smMatch {
  0%   { opacity: 1; transform: scale(1); }
  60%  { opacity: 0.3; transform: scale(1.25); }
  100% { opacity: 0; transform: scale(0); }
}
@keyframes smPulse {
  0%,100% { box-shadow: 0 0 0 2px #fbbf24, 0 0 12px 2px rgba(251,191,36,0.45); }
  50%     { box-shadow: 0 0 0 3px #f59e0b, 0 0 22px 6px rgba(251,191,36,0.7); }
}
`;

// ── Sock visual ────────────────────────────────────────────────────────────
function Sock({ card, sockW, onClick }: { card: SockCard; sockW: number; onClick: () => void; }) {
  const { def, state } = card;
  const bg = getBg(def);

  const legW = sockW;
  const legH = Math.round(sockW * 1.75);
  const footW = Math.round(sockW * 1.35);
  const footH = Math.round(sockW * 0.52);
  const totalH = legH + Math.round(footH * 0.6);

  const isSelected = state === "selected";
  const isMatched  = state === "matched";
  const isWrong    = state === "wrong";

  const outerStyle: React.CSSProperties = {
    width: footW,
    height: totalH,
    position: "relative",
    cursor: isMatched ? "default" : "pointer",
    animation: isWrong ? "smWrong 0.42s ease" : isMatched ? "smMatch 0.38s ease forwards" : "none",
    userSelect: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    flexShrink: 0,
  };

  const borderCol = isSelected ? "#fbbf24" : isWrong ? "#ef4444" : "rgba(255,255,255,0.13)";
  const legStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    top: 0,
    width: legW,
    height: legH,
    borderRadius: "45% 45% 6px 6px",
    background: bg,
    border: `2px solid ${borderCol}`,
    animation: isSelected ? "smPulse 0.85s ease-in-out infinite" : "none",
    overflow: "hidden",
  };
  const footStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: footW,
    height: footH,
    borderRadius: "6px 6px 6px 50%",
    background: bg,
    border: `2px solid ${borderCol}`,
    animation: isSelected ? "smPulse 0.85s ease-in-out infinite" : "none",
  };

  return (
    <div style={outerStyle} onClick={isMatched ? undefined : onClick}>
      <div style={legStyle}>
        {/* Cuff band */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "20%", background: "rgba(255,255,255,0.22)" }} />
      </div>
      <div style={footStyle} />
    </div>
  );
}

// ── Game component ─────────────────────────────────────────────────────────
export default function SocksMatchGame({ title }: { title: string }) {
  const [mode, setMode] = useState<Mode>("kids");
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<SockCard[]>([]);
  const [matched, setMatched] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ADULT_TIME);
  const [elapsed, setElapsed] = useState(0);
  const [sockW, setSockW] = useState(40);

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<number[]>([]);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const modeRef = useRef<Mode>("kids");

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Watch matched count to detect win
  useEffect(() => {
    if (phase !== "playing") return;
    const total = modeRef.current === "kids" ? KIDS_DEFS.length : ADULT_DEFS.length;
    if (matched >= total) {
      if (timerRef.current) clearInterval(timerRef.current);
      phaseRef.current = "won";
      setPhase("won");
    }
  }, [matched, phase]);

  // Responsive sock size
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth - 16;
      const cols = 4;
      const gap = 10;
      // footW = sockW * 1.35 → sockW = cell / 1.35
      const cellW = Math.floor((w - gap * (cols - 1)) / cols);
      setSockW(Math.max(28, Math.min(Math.floor(cellW / 1.35), 52)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mode]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const defs = modeRef.current === "kids" ? KIDS_DEFS : ADULT_DEFS;
    setCards(buildDeck(defs));
    setMatched(0);
    selectedRef.current = [];
    lockRef.current = false;
    elapsedRef.current = 0;
    setElapsed(0);
    setTimeLeft(ADULT_TIME);
    phaseRef.current = "playing";
    setPhase("playing");

    if (modeRef.current === "adult") {
      let t = ADULT_TIME;
      timerRef.current = setInterval(() => {
        t -= 1;
        setTimeLeft(t);
        if (t <= 0) {
          clearInterval(timerRef.current!);
          if (phaseRef.current === "playing") {
            phaseRef.current = "lost";
            setPhase("lost");
          }
        }
      }, 1000);
    } else {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    }
  }, []);

  const handleClick = useCallback((cardId: number) => {
    if (lockRef.current || phaseRef.current !== "playing") return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.state === "matched" || card.state === "selected") return;

    const newSel = [...selectedRef.current, cardId];
    selectedRef.current = newSel;
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, state: "selected" } : c));

    if (newSel.length < 2) return;

    lockRef.current = true;
    const [id1, id2] = newSel;
    const c1 = cards.find(c => c.id === id1)!;
    const c2 = cards.find(c => c.id === id2)!;

    if (c1.pairId === c2.pairId) {
      // Match!
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          c.id === id1 || c.id === id2 ? { ...c, state: "matched" } : c
        ));
        selectedRef.current = [];
        lockRef.current = false;
        setMatched(m => m + 1);
      }, 320);
    } else {
      // Mismatch
      setCards(prev => prev.map(c =>
        c.id === id1 || c.id === id2 ? { ...c, state: "wrong" } : c
      ));
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          c.id === id1 || c.id === id2 ? { ...c, state: "idle" } : c
        ));
        selectedRef.current = [];
        lockRef.current = false;
      }, 700);
    }
  }, [cards]);

  const totalPairs = mode === "kids" ? KIDS_DEFS.length : ADULT_DEFS.length;

  const switchMode = (m: Mode) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMode(m);
    modeRef.current = m;
    setPhase("idle");
    phaseRef.current = "idle";
    setCards([]);
    setMatched(0);
  };

  return (
    <div ref={containerRef} className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        <button className={`${styles.diffBtn} ${mode === "kids" ? styles.activeDiff : ""}`} onClick={() => switchMode("kids")}>Kids</button>
        <button className={`${styles.diffBtn} ${mode === "adult" ? styles.activeDiff : ""}`} onClick={() => switchMode("adult")}>Adult</button>
      </div>

      {/* HUD */}
      {phase === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "2px 4px 4px", fontSize: "0.82rem", color: "#94a3b8" }}>
          <span>🧦 <strong style={{ color: "#4ade80" }}>{matched}</strong> / {totalPairs} pairs</span>
          {mode === "adult"
            ? <span style={{ color: timeLeft <= 15 ? "#ef4444" : "#94a3b8", fontWeight: timeLeft <= 15 ? 700 : 400 }}>⏱ {fmt(timeLeft)}</span>
            : <span>⏱ {fmt(elapsed)}</span>
          }
        </div>
      )}

      {/* Idle hint */}
      {phase === "idle" && (
        <p style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", margin: "2px 0 4px" }}>
          {mode === "adult" ? "Find matching pairs — some look very similar! 90 seconds." : "Click two matching socks to pair them up!"}
        </p>
      )}

      {/* Sock grid */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", overflowY: "auto" }}>
        {phase !== "idle" && cards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "4px 0" }}>
            {cards.map(card => (
              <Sock key={card.id} card={card} sockW={sockW} onClick={() => handleClick(card.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Result */}
      {phase === "won" && (
        <div style={{ textAlign: "center", padding: "4px 0" }}>
          <span style={{ fontSize: "1rem" }}>🎉 <strong style={{ color: "#4ade80" }}>All paired!</strong></span>
          {mode === "kids" && <span style={{ color: "#64748b", fontSize: "0.8rem" }}> in {fmt(elapsed)}</span>}
          {mode === "adult" && <span style={{ color: "#64748b", fontSize: "0.8rem" }}> with {fmt(timeLeft)} left</span>}
        </div>
      )}
      {phase === "lost" && (
        <div style={{ textAlign: "center", padding: "4px 0" }}>
          <span style={{ fontSize: "1rem" }}>⏰ <strong style={{ color: "#f87171" }}>Time&apos;s up!</strong></span>
          <span style={{ color: "#64748b", fontSize: "0.8rem" }}> Got {matched} / {totalPairs} pairs</span>
        </div>
      )}

      {phase !== "playing" && (
        <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: 6 }}>
          {phase === "idle" ? "▶ Start" : "↺ Play Again"}
        </button>
      )}
    </div>
  );
}
