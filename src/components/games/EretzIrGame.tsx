"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import styles from "@/app/page.module.css";
import { CATEGORIES, WORD_BANK, LETTERS } from "@/data/eretzIrWords";

type Phase = "idle" | "playing" | "examples" | "over";

const TIME_PER_CATEGORY = 30;

const STYLES = `
@keyframes ei-letter-pop {
  0%   { transform: scale(0.25) rotate(-18deg); opacity: 0; }
  60%  { transform: scale(1.08) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes ei-fade-in {
  from { opacity: 0; transform: translateY(7px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ei-tick {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.12); }
}
@keyframes ei-dot-pop {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}

/* ── Buttons ── */
.ei-btn-primary {
  width: 100%; padding: 0.72rem 1.5rem;
  background: linear-gradient(135deg, #d4af37 0%, #b8960a 100%);
  color: #0a0a0a; border: none; border-radius: var(--radius-md);
  font-weight: 800; font-size: 0.95rem; font-family: inherit;
  cursor: pointer; letter-spacing: 0.02em;
  box-shadow: 0 4px 14px rgba(212,175,55,0.3), 0 1px 3px rgba(0,0,0,0.4);
  transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
}
.ei-btn-primary:hover  { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(212,175,55,0.4); }
.ei-btn-primary:active { transform: translateY(0); opacity: 0.85; }

.ei-btn-secondary {
  padding: 0.55rem 1.35rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.14);
  color: var(--text-secondary); border-radius: var(--radius-md);
  font-weight: 600; font-size: 0.84rem; font-family: inherit;
  cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s;
  backdrop-filter: blur(4px);
}
.ei-btn-secondary:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.28); color: var(--text-primary); }
.ei-btn-secondary:active { background: rgba(255,255,255,0.06); }
`;

export default function EretzIrGame({ title }: { title: string }) {
  const [phase, setPhase]           = useState<Phase>("idle");
  const [letter, setLetter]         = useState("");
  const [catIdx, setCatIdx]         = useState(0);
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_CATEGORY);
  const [userAnswer, setUserAnswer] = useState("");
  const [allAnswers, setAllAnswers] = useState<string[]>([]);

  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeLeftRef   = useRef(TIME_PER_CATEGORY);
  const catIdxRef     = useRef(0);
  const answerRef     = useRef("");
  const allAnswersRef = useRef<string[]>([]);

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

  const handleSkip = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPhase("examples");
  }, []);

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

  const cat        = CATEGORIES[catIdx];
  const examples   = cat ? (WORD_BANK[letter]?.[cat.key] ?? []) : [];
  const timerPct   = timeLeft / TIME_PER_CATEGORY;
  const timerColor = timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#d4af37";

  // Shared letter badge used in playing + examples phases
  const LetterBadge = ({ animate }: { animate: boolean }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: "0.45rem" }}>
        האות שנבחרה
      </div>
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 78, height: 78, borderRadius: 18,
        background: "linear-gradient(145deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))",
        border: "2px solid #d4af37",
        animation: animate ? "ei-letter-pop 0.45s ease-out" : undefined,
        boxShadow: "0 0 18px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.07)",
        fontSize: "3.25rem", fontWeight: 900, color: "#d4af37", lineHeight: 1,
      }}>
        {letter}
      </div>
    </div>
  );

  return (
    <div className={styles.gameInner} dir="rtl">
      <style>{STYLES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* ── IDLE ─────────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "1.25rem 0.5rem", animation: "ei-fade-in 0.4s ease-out" }}>
          <div style={{ fontSize: "2.75rem", marginBottom: "0.75rem" }}>🗺️</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.85, maxWidth: 340, margin: "0 auto 1.25rem" }}>
            תישלף אות אקראית. לכל קטגוריה — 30 שניות לכתוב מילה שמתחילה באות. אחר כך יוצגו דוגמאות טובות.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", marginBottom: "1.5rem" }}>
            {CATEGORIES.map(c => (
              <span key={c.key} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)", padding: "0.22rem 0.65rem",
                fontSize: "0.78rem", color: "var(--text-secondary)",
              }}>
                {c.emoji} {c.label}
              </span>
            ))}
          </div>
          <button className="ei-btn-primary" onClick={startGame}>!התחל לשחק 🎮</button>
        </div>
      )}

      {/* ── PLAYING ──────────────────────────────────────────────────────────── */}
      {phase === "playing" && cat && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", animation: "ei-fade-in 0.2s ease-out" }}>

          {/* Letter badge */}
          <LetterBadge animate />

          {/* Category + progress dots */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {cat.emoji} {cat.label}
            </div>
            <div style={{ display: "flex", gap: "0.3rem", direction: "ltr" }}>
              {CATEGORIES.map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i < catIdx ? "#d4af37" : i === catIdx ? "#d4af37" : "rgba(255,255,255,0.15)",
                  opacity: i < catIdx ? 0.45 : 1,
                  transform: i === catIdx ? "scale(1.25)" : "scale(1)",
                  transition: "background 0.2s",
                  animation: i === catIdx ? "ei-dot-pop 0.3s ease-out" : undefined,
                }} />
              ))}
            </div>
          </div>

          {/* Timer number + bar */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.35rem", direction: "ltr" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", direction: "rtl" }}>זמן</div>
              <div style={{
                fontSize: "1.55rem", fontWeight: 800, color: timerColor, lineHeight: 1,
                animation: timeLeft <= 5 ? "ei-tick 0.5s ease-in-out infinite" : undefined,
                direction: "ltr",
              }}>
                {timeLeft}
              </div>
            </div>
            <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden", direction: "ltr" }}>
              <div style={{ height: "100%", width: `${timerPct * 100}%`, background: timerColor, borderRadius: 3, transition: "width 1s linear, background 0.3s" }} />
            </div>
          </div>

          {/* Answer input */}
          <input
            dir="rtl"
            autoFocus
            placeholder={`${cat.emoji} ${cat.label} שמתחיל/ה ב-${letter}...`}
            value={userAnswer}
            onChange={e => updateAnswer(e.target.value)}
            style={{
              width: "100%", padding: "0.8rem 1.1rem", fontSize: "1.05rem", fontWeight: 600,
              background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none",
              boxSizing: "border-box", transition: "border-color 0.15s",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "#d4af37"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
          />

          {/* Skip */}
          <div style={{ textAlign: "center" }}>
            <button className="ei-btn-secondary" onClick={handleSkip}>
              הצג דוגמאות ←
            </button>
          </div>
        </div>
      )}

      {/* ── EXAMPLES ─────────────────────────────────────────────────────────── */}
      {phase === "examples" && cat && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", animation: "ei-fade-in 0.3s ease-out" }}>

          {/* Letter badge (no pop animation, just glow) */}
          <LetterBadge animate={false} />

          {/* Category label */}
          <div style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {cat.emoji} {cat.label}
          </div>

          {/* User's answer */}
          <div style={{
            background: userAnswer.trim() ? "rgba(34,197,94,0.07)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${userAnswer.trim() ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
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
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "var(--radius-md)", padding: "0.8rem 1rem",
          }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              דוגמאות טובות
            </div>
            {examples.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {examples.map(ex => (
                  <span key={ex} style={{
                    background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)",
                    borderRadius: "var(--radius-sm)", padding: "0.25rem 0.7rem",
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
          <button className="ei-btn-primary" onClick={handleContinue}>
            {catIdx + 1 < CATEGORIES.length
              ? `← קטגוריה הבאה: ${CATEGORIES[catIdx + 1].emoji} ${CATEGORIES[catIdx + 1].label}`
              : "!לסיכום 🎉"}
          </button>
        </div>
      )}

      {/* ── OVER ─────────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", animation: "ei-fade-in 0.4s ease-out" }}>

          {/* Letter badge */}
          <LetterBadge animate={false} />

          <div style={{ textAlign: "center", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.15rem" }}>
            סיכום הסיבוב
          </div>

          {CATEGORIES.map((c, i) => {
            const ans = allAnswers[i] ?? "";
            const exs = (WORD_BANK[letter]?.[c.key] ?? []).slice(0, 4);
            return (
              <div key={c.key} style={{
                background: ans ? "rgba(212,175,55,0.05)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${ans ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "var(--radius-md)", padding: "0.6rem 0.9rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.2rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.emoji} {c.label}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: ans ? "#d4af37" : "var(--text-secondary)" }}>
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

          <button className="ei-btn-primary" onClick={startGame} style={{ marginTop: "0.25rem" }}>
            !סיבוב חדש 🎮
          </button>
        </div>
      )}
    </div>
  );
}
