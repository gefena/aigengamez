"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Word pools ──────────────────────────────────────────────────────────────
const KIDS_WORDS = [
  "cat","dog","pig","cow","hen","fox","owl","bat","bee","ant",
  "fly","cup","hat","pan","pot","jar","box","bag","bed","car",
  "bus","sun","ice","egg","arm","leg","ear","eye","fin","paw",
  "frog","fish","bear","bird","duck","wolf","deer","crab","moth",
  "wren","dove","swan","mole","hare","clam","slug","tree","leaf",
  "seed","root","nest","twig","lake","pond","rock","sand","hill",
  "rain","snow","star","moon","wind","gust","rose","fern","fawn",
];

const ADULT_WORDS = [
  "plant","bride","flame","craft","globe","grace","brave","crane",
  "prime","pride","grove","glide","blend","drift","grasp","tramp",
  "bridge","castle","spring","coffee","garden","forest","basket",
  "candle","mirror","dragon","wizard","sunset","flower","jungle",
  "rocket","magnet","pencil","pillow","window","hammer","button",
  "silver","frozen","stream","battle","planet","travel","hunter",
  "bronze","frozen","velvet","marble","gravel","cinder","cobalt",
  "captain","compass","crystal","diamond","chimney","lantern",
  "feather","bicycle","dolphin","blanket","harvest","kingdom",
  "leather","painter","rainbow","scatter","thunder","village",
  "whisper","fortune","climate","courage","journey","kitchen",
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word: string): string[] {
  const letters = word.split("");
  let result: string[];
  let tries = 0;
  do {
    result = shuffle(letters);
    tries++;
  } while (result.join("") === word && tries < 20);
  return result;
}

// ── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "over";
type Feedback = "correct" | "wrong" | null;

// ── Component ────────────────────────────────────────────────────────────────
export default function AnagramBlitzGame({ title }: { title: string }) {
  const [mode, setMode] = useState<"Kids" | "Adult">("Kids");
  const [phase, setPhase] = useState<Phase>("idle");
  const [pool, setPool] = useState<string[]>([]);
  const [poolIdx, setPoolIdx] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [tiles, setTiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const wordBank = mode === "Kids" ? KIDS_WORDS : ADULT_WORDS;
  const pointsPerWord = mode === "Kids" ? 10 : 15;

  const loadWord = useCallback((words: string[], idx: number) => {
    if (idx >= words.length) return;
    setCurrentWord(words[idx]);
    setTiles(scrambleWord(words[idx]));
    setSelected([]);
  }, []);

  const startGame = useCallback(() => {
    const fresh = shuffle(wordBank).slice(0, 20);
    setPool(fresh);
    setPoolIdx(0);
    setScore(0);
    setTimeLeft(60);
    setPhase("playing");
    loadWord(fresh, 0);
  }, [wordBank, loadWord]);

  const resetGame = useCallback(() => {
    setPhase("idle");
    setScore(0);
    setTimeLeft(60);
    setSelected([]);
    setPool([]);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) { setPhase("over"); return; }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // Auto-submit when all tiles selected
  useEffect(() => {
    if (phase !== "playing" || !currentWord || selected.length !== currentWord.length || feedback) return;
    const assembled = selected.map(i => tiles[i]).join("");
    setFeedback(assembled === currentWord ? "correct" : "wrong");
  }, [selected, currentWord, tiles, phase, feedback]);

  // Handle feedback resolution
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => {
      setFeedback(null);
      if (feedback === "correct") {
        setScore(s => s + pointsPerWord);
        const next = poolIdx + 1;
        if (next < pool.length) { setPoolIdx(next); loadWord(pool, next); }
        else setPhase("over");
      } else {
        setSelected([]);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [feedback, poolIdx, pool, loadWord, pointsPerWord]);

  const handleTileClick = (idx: number) => {
    if (selected.includes(idx) || feedback) return;
    setSelected(s => [...s, idx]);
  };

  const handleRemove = (pos: number) => {
    if (feedback) return;
    setSelected(s => s.filter((_, i) => i !== pos));
  };

  const handleSkip = () => {
    const next = poolIdx + 1;
    if (next < pool.length) { setPoolIdx(next); loadWord(pool, next); }
    else setPhase("over");
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : "var(--text-primary)";

  const feedbackBg =
    feedback === "correct" ? "rgba(34,197,94,0.12)" :
    feedback === "wrong"   ? "rgba(239,68,68,0.12)" : "transparent";

  const tileBase: React.CSSProperties = {
    width: 46, height: 46,
    border: "2px solid var(--border-highlight)",
    borderRadius: "var(--radius-sm)",
    fontSize: "1.2rem", fontWeight: 700, cursor: "pointer",
    transition: "all 0.15s", textTransform: "uppercase",
    fontFamily: "monospace",
  };

  const availableTile = (picked: boolean): React.CSSProperties => ({
    ...tileBase,
    background: picked ? "var(--bg-tertiary)" : "var(--bg-secondary)",
    color: picked ? "var(--text-secondary)" : "var(--text-primary)",
    opacity: picked ? 0.35 : 1,
    cursor: picked ? "default" : "pointer",
  });

  const selectedTile: React.CSSProperties = {
    ...tileBase,
    background: "var(--accent-primary)",
    borderColor: "var(--accent-primary)",
    color: "#fff", cursor: "pointer",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner}>
      <h3 className={styles.gameTitle}>{title}</h3>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["Kids", "Adult"] as const).map(m => (
          <button
            key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { setMode(m); resetGame(); }}
          >{m}</button>
        ))}
      </div>

      {/* ── IDLE ── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.7 }}>
            Unscramble as many words as you can in <strong>60 seconds</strong>!<br />
            Click the scrambled letters in the correct order.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Mode: <strong>{mode}</strong> &mdash; {mode === "Kids" ? "3–4 letter words" : "5–7 letter words"}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>Start Game</button>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === "playing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>

          {/* Stats */}
          <div style={{ display: "flex", gap: "2.5rem", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: timerColor, fontFamily: "monospace", lineHeight: 1 }}>
                {String(timeLeft).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>sec</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>pts</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-secondary)", lineHeight: 1 }}>{poolIdx + 1}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>word</div>
            </div>
          </div>

          {/* Tiles area */}
          <div style={{
            width: "100%", maxWidth: 420,
            background: feedbackBg,
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem 1rem",
            transition: "background 0.25s",
          }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Scrambled — tap to pick
            </div>
            <div style={{ display: "flex", gap: "0.45rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.1rem" }}>
              {tiles.map((letter, i) => (
                <button key={i} style={availableTile(selected.includes(i))} onClick={() => handleTileClick(i)}>
                  {letter}
                </button>
              ))}
            </div>

            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Your answer — tap to remove
            </div>
            <div style={{ display: "flex", gap: "0.45rem", justifyContent: "center", flexWrap: "wrap", minHeight: 50 }}>
              {selected.map((tileIdx, pos) => (
                <button key={pos} style={selectedTile} onClick={() => handleRemove(pos)}>
                  {tiles[tileIdx]}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div style={{
              fontSize: "1.4rem", fontWeight: 700,
              color: feedback === "correct" ? "#22c55e" : "#ef4444",
            }}>
              {feedback === "correct"
                ? `✓ ${currentWord.toUpperCase()}! +${pointsPerWord}`
                : "✗ Not quite — try again!"}
            </div>
          )}

          <button
            style={{
              background: "transparent", border: "1px solid var(--border-color)",
              color: "var(--text-secondary)", padding: "0.4rem 1.25rem",
              borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.82rem",
            }}
            onClick={handleSkip}
          >
            Skip word
          </button>
        </div>
      )}

      {/* ── GAME OVER ── */}
      {phase === "over" && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>
          <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Time&apos;s up!</div>
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent-primary)", marginBottom: "0.25rem" }}>{score}</div>
          <div style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>points</div>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
