"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/games/[id]/page.module.css";

type Phase = "idle" | "playing" | "over";
type Difficulty = "kids" | "adult";
type DeckKey = "animals" | "food" | "space" | "flags" | "science" | "music";

interface CardData { id: number; value: string; }

// ─── Decks ────────────────────────────────────────────────────────────────────
const DECKS: Record<DeckKey, { label: string; emoji: string; values: string[] }> = {
  animals:  { label: "Animals",  emoji: "🐾", values: ["🐶","🐱","🐸","🐰","🦊","🐼"] },
  food:     { label: "Food",     emoji: "🍕", values: ["🍕","🍔","🍦","🍩","🍎","🍌"] },
  space:    { label: "Space",    emoji: "🚀", values: ["🚀","🌍","🌙","⭐","☄️","🛸"] },
  flags:    { label: "Flags",    emoji: "🌍", values: ["🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇯🇵","🇧🇷","🇮🇳","🇦🇺"] },
  science:  { label: "Science",  emoji: "🔬", values: ["⚗️","🧬","🔬","💊","🧪","🔭","🧲","🌡️"] },
  music:    { label: "Music",    emoji: "🎵", values: ["🎸","🎹","🎺","🎻","🥁","🎷","🎤","🎵"] },
};

const KIDS_DECKS:  DeckKey[] = ["animals","food","space"];
const ADULT_DECKS: DeckKey[] = ["flags","science","music"];

const KEYFRAMES = `
@keyframes mm-match {
  0% { transform: scale(1); }
  40% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
@keyframes mm-wrong {
  0%,100% { transform: translateX(0) rotateY(180deg); }
  25% { transform: translateX(-5px) rotateY(180deg); }
  75% { transform: translateX(5px) rotateY(180deg); }
}
@keyframes mm-celebrate {
  0%,100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
`;

function buildCards(deck: DeckKey): CardData[] {
  const values = DECKS[deck].values;
  const pairs = [...values, ...values];
  // shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((value, idx) => ({ id: idx, value }));
}

export default function MemoryMatchGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("kids");
  const [deck, setDeck] = useState<DeckKey>("animals");
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [wrongIds, setWrongIds] = useState<number[]>([]);   // for shake anim
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [containerWidth, setContainerWidth] = useState(340);

  const diffRef      = useRef<Difficulty>("kids");
  const phaseRef     = useRef<Phase>("idle");
  const matchedRef   = useRef<number[]>([]);
  const scoreRef     = useRef(0);
  const timeRef      = useRef(90);
  const movesRef     = useRef(0);
  const lockedRef    = useRef(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Measure container width
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const updateMatched = useCallback((next: number[]) => {
    matchedRef.current = next;
    setMatchedIds(next);
  }, []);

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

  const startGame = useCallback((d: Difficulty, dk: DeckKey) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const newCards = buildCards(dk);
    setCards(newCards);
    setFlippedIds([]);
    updateMatched([]);
    setWrongIds([]);
    movesRef.current = 0; setMoves(0);
    scoreRef.current = 0; setScore(0);
    timeRef.current = 90; setTimeLeft(90);
    lockedRef.current = false;
    setPhase("playing");
    if (d === "adult") timerRef.current = setTimeout(tickTimer, 1000);
  }, [tickTimer, updateMatched]);

  // Match logic via effect
  useEffect(() => {
    if (flippedIds.length !== 2 || phaseRef.current !== "playing") return;
    const [id1, id2] = flippedIds;
    const c1 = cards.find(c => c.id === id1);
    const c2 = cards.find(c => c.id === id2);
    if (!c1 || !c2) return;

    movesRef.current += 1;
    setMoves(movesRef.current);

    if (c1.value === c2.value) {
      // Match!
      const next = [...matchedRef.current, id1, id2];
      updateMatched(next);
      if (diffRef.current === "adult") {
        scoreRef.current += 100 + Math.max(0, timeRef.current * 2);
        setScore(scoreRef.current);
      }
      setFlippedIds([]);
      lockedRef.current = false;
      // Win check happens in separate effect
    } else {
      // No match — shake and flip back
      lockedRef.current = true;
      setWrongIds([id1, id2]);
      setTimeout(() => {
        setFlippedIds([]);
        setWrongIds([]);
        lockedRef.current = false;
      }, 900);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flippedIds]);

  // Win detection
  useEffect(() => {
    if (phase === "playing" && cards.length > 0 && matchedIds.length === cards.length) {
      endGame();
    }
  }, [matchedIds, phase, cards.length, endGame]);

  const handleCardClick = useCallback((cardId: number) => {
    if (lockedRef.current || phaseRef.current !== "playing") return;
    if (matchedRef.current.includes(cardId)) return;
    setFlippedIds(prev => {
      if (prev.length >= 2 || prev.includes(cardId)) return prev;
      return [...prev, cardId];
    });
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Grid layout
  const isAdult = difficulty === "adult";
  const COLS = 4;
  const ROWS = isAdult ? 4 : 3;
  const GAP = 8;
  const PAD = 12;
  const maxCellByWidth = Math.floor((containerWidth - GAP * (COLS - 1) - PAD * 2) / COLS);
  const maxCellByHeight = typeof window !== "undefined"
    ? Math.floor((window.innerHeight * 0.44) / ROWS)
    : 90;
  const cellPx = Math.min(88, maxCellByWidth, maxCellByHeight);
  const fontSize = cellPx * 0.45;

  const availableDecks = isAdult ? ADULT_DECKS : KIDS_DECKS;

  return (
    <div ref={containerRef} className={styles.gameInner} style={{ justifyContent: "flex-start" }}>
      <style>{KEYFRAMES}</style>

      <h2 className={styles.gameTitle}>{title}</h2>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["kids", "adult"] as Difficulty[]).map(d => (
          <button key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => {
              if (phase === "playing") return;
              const nextDeck = d === "kids" ? "animals" : "flags";
              setDifficulty(d);
              setDeck(nextDeck);
              setPhase("idle");
            }}
          >{d === "kids" ? "🧒 Kids" : "🧠 Adult"}</button>
        ))}
      </div>

      {/* ── Idle ─────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1rem", padding: "0 0.5rem", width: "100%" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
            {isAdult ? "Match all pairs before time runs out! Score points for each match + time bonus." : "Find all matching pairs! Fewer moves = better score."}
          </p>

          {/* Deck picker */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            {availableDecks.map(dk => (
              <button key={dk}
                onClick={() => setDeck(dk)}
                style={{
                  padding: "0.5rem 1rem", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem",
                  cursor: "pointer", transition: "all 0.15s",
                  border: "2px solid",
                  borderColor: deck === dk ? "var(--accent-primary)" : "var(--border-color)",
                  background: deck === dk ? "rgba(var(--accent-primary-rgb), 0.1)" : "var(--bg-secondary)",
                  color: deck === dk ? "var(--accent-primary)" : "var(--text-secondary)",
                }}
              >
                {DECKS[dk].emoji} {DECKS[dk].label}
              </button>
            ))}
          </div>

          <button className={styles.resetBtn} onClick={() => startGame(difficulty, deck)}>
            {isAdult ? "🃏 Start Game" : "🎴 Play!"}
          </button>
        </div>
      )}

      {/* ── Playing ──────────────────────────────────────────────────────── */}
      {phase === "playing" && (
        <>
          {/* HUD */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", margin: "0.4rem 0" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
              🃏 {matchedIds.length / 2} / {cards.length / 2} pairs
            </span>
            {isAdult ? (
              <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>{score} pts</span>
            ) : (
              <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>🔄 {moves} moves</span>
            )}
            {isAdult ? (
              <span style={{ color: timeLeft <= 15 ? "#ef4444" : "var(--text-secondary)", fontWeight: 600, fontSize: "0.9rem" }}>
                ⏱ {timeLeft}s
              </span>
            ) : (
              <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{DECKS[deck].emoji} {DECKS[deck].label}</span>
            )}
          </div>

          {/* Timer bar — adult only */}
          {isAdult && (
            <div style={{ width: "100%", height: 3, background: "var(--border-color)", borderRadius: 2, marginBottom: "0.4rem", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                width: `${(timeLeft / 90) * 100}%`,
                background: timeLeft <= 15 ? "#ef4444" : "var(--accent-primary)",
                transition: "width 1s linear, background 0.3s",
              }} />
            </div>
          )}

          {/* Card grid — flex:1 playfield */}
          <div style={{
            flex: 1, minHeight: 0, width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: `${PAD}px`,
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`,
              gap: GAP,
            }}>
              {cards.map(card => {
                const isFaceUp = flippedIds.includes(card.id) || matchedIds.includes(card.id);
                const isMatched = matchedIds.includes(card.id);
                const isWrong   = wrongIds.includes(card.id);

                return (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    style={{
                      width: cellPx, height: cellPx,
                      perspective: 600,
                      cursor: isMatched ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {/* Flipper */}
                    <div style={{
                      width: "100%", height: "100%",
                      position: "relative",
                      transformStyle: "preserve-3d",
                      transition: "transform 0.35s ease",
                      transform: isFaceUp ? "rotateY(180deg)" : "rotateY(0deg)",
                      animation: isWrong ? "mm-wrong 0.4s ease" : isMatched && isFaceUp ? "mm-match 0.4s ease" : "none",
                    }}>
                      {/* Card back */}
                      <div style={{
                        position: "absolute", inset: 0,
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #1e293b, #0f172a)",
                        border: "2px solid var(--border-color)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: cellPx * 0.35,
                        color: "var(--border-color)",
                        userSelect: "none",
                      }}>✦</div>

                      {/* Card front */}
                      <div style={{
                        position: "absolute", inset: 0,
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        borderRadius: 8,
                        border: `2px solid ${isMatched ? "#22c55e" : "var(--border-color)"}`,
                        background: isMatched ? "rgba(34,197,94,0.12)" : "var(--bg-secondary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: fontSize,
                        userSelect: "none",
                        transition: "border-color 0.3s, background 0.3s",
                      }}>
                        {card.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deck switcher + new game (kids only) */}
          {!isAdult && (
            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {KIDS_DECKS.map(dk => (
                <button key={dk}
                  onClick={() => { setDeck(dk); startGame("kids", dk); }}
                  style={{
                    padding: "0.3rem 0.65rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                    border: "1px solid",
                    borderColor: deck === dk ? "var(--accent-primary)" : "var(--border-color)",
                    background: deck === dk ? "rgba(var(--accent-primary-rgb), 0.08)" : "transparent",
                    color: deck === dk ? "var(--accent-primary)" : "var(--text-secondary)",
                  }}
                >
                  {DECKS[dk].emoji}
                </button>
              ))}
              <button
                onClick={() => startGame(difficulty, deck)}
                style={{
                  padding: "0.3rem 0.65rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600,
                  cursor: "pointer", border: "1px solid var(--border-color)",
                  background: "transparent", color: "var(--text-secondary)",
                }}
              >↺ New</button>
            </div>
          )}
        </>
      )}

      {/* ── Game Over ────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1.5rem", textAlign: "center", padding: "0 1rem" }}>
          <div style={{ fontSize: "3rem", animation: "mm-celebrate 0.8s ease infinite" }}>🎉</div>
          <h3 style={{ color: "var(--text-primary)", margin: 0 }}>
            {matchedIds.length === cards.length ? "All Pairs Found!" : "Time's Up!"}
          </h3>
          {isAdult ? (
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--accent-primary)" }}>{score} pts</div>
          ) : (
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-primary)" }}>
              {matchedIds.length / 2} / {cards.length / 2} pairs in {moves} moves
            </div>
          )}
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
            {isAdult
              ? score >= 900 ? "🏆 Memory champion!" : score >= 600 ? "⚡ Sharp mind!" : "💪 Keep training that memory!"
              : moves <= cards.length / 2 + 2 ? "🏆 Outstanding memory!" : moves <= cards.length ? "⚡ Nice work!" : "💪 Keep playing to improve!"}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button className={styles.resetBtn} onClick={() => startGame(difficulty, deck)}>Play Again</button>
            <button
              onClick={() => setPhase("idle")}
              style={{
                padding: "0.5rem 1.5rem", borderRadius: 999, fontWeight: 600,
                border: "1px solid var(--border-color)", background: "transparent",
                color: "var(--text-secondary)", cursor: "pointer",
              }}
            >Change Deck</button>
          </div>
        </div>
      )}
    </div>
  );
}
