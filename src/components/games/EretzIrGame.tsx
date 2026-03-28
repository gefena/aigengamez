"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/page.module.css";
import { CATEGORIES, WORD_BANK, LETTERS } from "@/data/eretzIrWords";

type Phase = "idle" | "playing" | "examples" | "over";

const TIME_PER_CATEGORY = 30;

const KEYFRAMES = `
@keyframes ei-letter-pop {
  0%   { transform: scale(0.3) rotate(-15deg); opacity: 0; }
  65%  { transform: scale(1.12) rotate(4deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes ei-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ei-tick {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.1); }
}
`;

export default function EretzIrGame({ title }: { title: string }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [letter, setLetter]       = useState("");
  const [catIdx, setCatIdx]       = useState(0);
  const [timeLeft, setTimeLeft]   = useState(TIME_PER_CATEGORY);
  const [userAnswer, setUserAnswer] = useState("");
  const [allAnswers, setAllAnswers] = useState<string[]>([]);

  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeLeftRef   = useRef(TIME_PER_CATEGORY);
  const catIdxRef     = useRef(0);
  const answerRef     = useRef("");
  const allAnswersRef = useRef<string[]>([]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  // Start 30-second countdown for the current category; auto-advance on expiry.
  const startCategory = useCallback((idx: number) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    catIdxRef.current   = idx;
    answerRef.current   = "";
    timeLeftRef.current = TIME_PER_CATEGORY;
    setCatIdx(idx);
    setUserAnswer("");
    setTimeLeft(TIME_PER_CATEGORY);
    setPhase("playing");

    const tick = () => {
      timeLeftRef.current--;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        setPhase("examples");
      } else {
        timerRef.current = setTimeout(tick, 1000);
      }
    };
    timerRef.current = setTimeout(tick, 1000);
  }, []);

  const startGame = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    allAnswersRef.current = [];
    setAllAnswers([]);
    const l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    setLetter(l);
    startCategory(0);
  }, [startCategory]);

  // Skip remaining time — go straight to examples.
  const handleSkip = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPhase("examples");
  }, []);

  // Save answer, advance to next category or end.
  const handleContinue = useCallback(() => {
    const updated = [...allAnswersRef.current, answerRef.current.trim()];
    allAnswersRef.current = updated;
    setAllAnswers(updated);
    const next = catIdxRef.current + 1;
    if (next >= CATEGORIES.length) {
      setPhase("over");
    } else {
      startCategory(next);
    }
  }, [startCategory]);

  const updateAnswer = useCallback((val: string) => {
    answerRef.current = val;
    setUserAnswer(val);
  }, []);

  useEffect(() => {
    const ref = timerRef;
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, []);

  const cat       = CATEGORIES[catIdx];
  const examples  = cat ? (WORD_BANK[letter]?.[cat.key] ?? []) : [];
  const timerPct  = timeLeft / TIME_PER_CATEGORY;
  const timerColor =
    timeLeft <= 5  ? "#ef4444" :
    timeLeft <= 10 ? "#f59e0b" :
    "var(--accent-primary)";

  return (
    <div className={styles.gameInner} dir="rtl">
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* ── IDLE ─────────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "1.5rem 0.5rem", animation: "ei-fade-in 0.4s ease-out" }}>
          <div style={{ fontSize: "2.75rem", marginBottom: "0.75rem" }}>🗺️</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.85, marginBottom: "1.25rem", maxWidth: 340, margin: "0 auto 1.25rem" }}>
            תישלף אות. לכל קטגוריה יש 30 שניות לחשוב על מילה שמתחילה באות זו. אחר כך תוצגנה דוגמאות טובות.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", marginBottom: "1.5rem" }}>
            {CATEGORIES.map(c => (
              <span key={c.key} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)", padding: "0.2rem 0.6rem",
                fontSize: "0.78rem", color: "var(--text-secondary)",
              }}>
                {c.emoji} {c.label}
              </span>
            ))}
          </div>
          <button className={styles.resetBtn} onClick={startGame}>!התחל לשחק 🎮</button>
        </div>
      )}

      {/* ── PLAYING ──────────────────────────────────────────────────────────── */}
      {phase === "playing" && cat && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", animation: "ei-fade-in 0.2s ease-out" }}>

          {/* Header: in dir=rtl flex-row → letter on right, timer on left */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "4rem", fontWeight: 900, color: "var(--accent-primary)", lineHeight: 1, animation: "ei-letter-pop 0.45s ease-out" }}>
              {letter}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {cat.emoji} {cat.label}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", direction: "ltr" }}>
                {catIdx + 1} / {CATEGORIES.length}
              </div>
            </div>
            <div style={{ textAlign: "center", direction: "ltr", minWidth: 44 }}>
              <div style={{
                fontSize: "2rem", fontWeight: 800, color: timerColor, lineHeight: 1,
                animation: timeLeft <= 5 ? "ei-tick 0.5s ease-in-out infinite" : undefined,
              }}>
                {timeLeft}
              </div>
              <div style={{ fontSize: "0.55rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>{"שנ'"}</div>
            </div>
          </div>

          {/* Timer bar (LTR so it drains left→right) */}
          <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden", direction: "ltr" }}>
            <div style={{ height: "100%", width: `${timerPct * 100}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }} />
          </div>

          {/* Answer input */}
          <input
            dir="rtl"
            autoFocus
            placeholder={`${cat.emoji} ${cat.label} שמתחיל/ה ב-${letter}...`}
            value={userAnswer}
            onChange={e => updateAnswer(e.target.value)}
            style={{
              width: "100%", padding: "0.75rem 1rem", fontSize: "1.05rem", fontWeight: 600,
              background: "rgba(255,255,255,0.05)", border: "2px solid var(--border-color)",
              borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Skip */}
          <button onClick={handleSkip} style={{
            background: "transparent", border: "1px solid var(--border-color)",
            color: "var(--text-secondary)", padding: "0.4rem 1.25rem",
            borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.82rem",
            alignSelf: "center",
          }}>
            הצג דוגמאות ←
          </button>
        </div>
      )}

      {/* ── EXAMPLES ─────────────────────────────────────────────────────────── */}
      {phase === "examples" && cat && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", animation: "ei-fade-in 0.3s ease-out" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ fontSize: "3.25rem", fontWeight: 900, color: "var(--accent-primary)", lineHeight: 1 }}>{letter}</div>
            <div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{cat.emoji} {cat.label}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", direction: "ltr" }}>{catIdx + 1} / {CATEGORIES.length}</div>
            </div>
          </div>

          {/* User's answer */}
          <div style={{
            background: userAnswer.trim() ? "rgba(34,197,94,0.07)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${userAnswer.trim() ? "rgba(34,197,94,0.3)" : "var(--border-color)"}`,
            borderRadius: "var(--radius-md)", padding: "0.65rem 1rem",
          }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              התשובה שלך
            </div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: userAnswer.trim() ? "var(--text-primary)" : "var(--text-secondary)" }}>
              {userAnswer.trim() || "—"}
            </div>
          </div>

          {/* Examples */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)", padding: "0.75rem 1rem",
          }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginBottom: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              דוגמאות טובות
            </div>
            {examples.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {examples.map(ex => (
                  <span key={ex} style={{
                    background: "rgba(255,255,255,0.07)", border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)", padding: "0.2rem 0.65rem",
                    fontSize: "0.85rem", color: "var(--text-primary)",
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                אין דוגמאות זמינות לאות זו בקטגוריה זו
              </div>
            )}
          </div>

          {/* Continue */}
          <button className={styles.resetBtn} onClick={handleContinue}>
            {catIdx + 1 < CATEGORIES.length
              ? `← קטגוריה הבאה: ${CATEGORIES[catIdx + 1].emoji} ${CATEGORIES[catIdx + 1].label}`
              : "!לסיכום 🎉"}
          </button>
        </div>
      )}

      {/* ── OVER ─────────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", animation: "ei-fade-in 0.4s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 900, color: "var(--accent-primary)", lineHeight: 1 }}>{letter}</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.3rem" }}>סיכום הסיבוב</div>
          </div>

          {CATEGORIES.map((c, i) => {
            const ans = allAnswers[i] ?? "";
            const exs = (WORD_BANK[letter]?.[c.key] ?? []).slice(0, 4);
            return (
              <div key={c.key} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)", padding: "0.6rem 0.9rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.2rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.emoji} {c.label}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: ans ? "var(--accent-primary)" : "var(--text-secondary)" }}>
                    {ans || "—"}
                  </div>
                </div>
                {exs.length > 0 && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                    דוגמאות: {exs.join("، ")}
                  </div>
                )}
              </div>
            );
          })}

          <button className={styles.resetBtn} onClick={startGame} style={{ marginTop: "0.5rem" }}>
            !סיבוב חדש 🎮
          </button>
        </div>
      )}
    </div>
  );
}
