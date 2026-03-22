"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── CSS animations ───────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes jt-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes jt-correct {
  0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.7); }
  70%  { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0   rgba(34,197,94,0); }
}
@keyframes jt-wrong {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-6px); }
  40%     { transform: translateX(6px); }
  60%     { transform: translateX(-4px); }
  80%     { transform: translateX(4px); }
}
@keyframes jt-timer-pulse {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.5; }
}
@keyframes jt-streak-pop {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
`;

// ── Types ────────────────────────────────────────────────────────────────────
type Phase      = "idle" | "playing" | "over";
type Difficulty = "Beginner" | "Advanced";

interface Question {
  q:       string;
  opts:    [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  fact:    string; // shown after answering
}

// ── Question banks ────────────────────────────────────────────────────────────
const BEGINNER_QS: Question[] = [
  { q: "What is the mat called in judo?", opts: ["Dojo","Tatami","Randori","Makura"], correct: 1, fact: "The tatami is a traditional Japanese mat made of rice straw, designed to cushion breakfalls." },
  { q: "What does 'Rei' mean in judo?", opts: ["Start","Bow","Stop","Attack"], correct: 1, fact: "Rei (礼) is the bow — judo's most important ritual, showing mutual respect before and after practice." },
  { q: "What does 'Hajime' mean?", opts: ["Stop","Well done","Begin","Danger"], correct: 2, fact: "Hajime (始め) is the referee's command to begin — it starts every contest and every randori." },
  { q: "What does 'Matte' mean?", opts: ["Attack","Stop","Pin","Fall"], correct: 1, fact: "Matte (待て) means 'wait' — the referee calls it to pause the match and reset the players." },
  { q: "Who founded judo?", opts: ["Gichin Funakoshi","Morihei Ueshiba","Jigoro Kano","Kyuzo Mifune"], correct: 2, fact: "Professor Jigoro Kano founded judo in 1882 at the Kodokan in Tokyo, developing it from ju-jitsu." },
  { q: "What does 'Tori' mean?", opts: ["The thrower","The mat","The referee","The hold"], correct: 0, fact: "Tori (取り) is the person executing the technique — they throw or pin Uke during practice." },
  { q: "What does 'Uke' mean?", opts: ["The winner","The person being thrown","The referee","The dojo"], correct: 1, fact: "Uke (受け) receives the technique. Learning to fall safely (ukemi) is the very first skill in judo." },
  { q: "What is 'Ukemi'?", opts: ["A throwing technique","Breakfalling","A ground choke","A belt exam"], correct: 1, fact: "Ukemi (受け身) means breakfall — the essential skill of landing safely after a throw, protecting joints and head." },
  { q: "What does 'Ippon' mean?", opts: ["Half point","Penalty","Full point — match won","Restart"], correct: 2, fact: "Ippon (一本) is the highest score in judo, won instantly. It requires a near-perfect throw or a 20-second pin." },
  { q: "What does 'Waza-ari' mean?", opts: ["No score","Half point","Full point","Penalty"], correct: 1, fact: "Waza-ari (技あり) is a near-perfect score. Two waza-ari equal one ippon — the 'accumulation rule'." },
  { q: "What is 'Randori'?", opts: ["A belt ceremony","Pre-arranged forms","Free practice sparring","A Japanese city"], correct: 2, fact: "Randori (乱取り) means 'free practice' — both partners take turns attacking and defending in a realistic but cooperative way." },
  { q: "What is 'Uchi-komi'?", opts: ["Free sparring","Repetition entry drills","A ground choke","A competition throw"], correct: 1, fact: "Uchi-komi (内込み) is repetition practice — entering the throw motion dozens of times to build muscle memory without actually throwing." },
  { q: "What does 'Newaza' refer to?", opts: ["Standing throws","Groundwork","Belt ranking","Formal kata"], correct: 1, fact: "Newaza (寝技) is groundwork — pins, chokes, and joint locks applied on the mat after a throw or clinch." },
  { q: "Which belt colour comes first in judo?", opts: ["Yellow","Blue","Red","White"], correct: 3, fact: "White is the first belt — the empty, pure colour representing a beginner who has everything to learn." },
  { q: "In competition, what colour judogi must opponents wear?", opts: ["Both white","One blue, one white","Any colour","Both red"], correct: 1, fact: "Since 1997, IJF rules require one player to wear a blue judogi so referees and spectators can easily distinguish competitors." },
  { q: "What does 'Kuzushi' mean?", opts: ["A throwing motion","Off-balancing","A ground pin","A bow"], correct: 1, fact: "Kuzushi (崩し) is the critical off-balancing that must come BEFORE the throw — without it, no technique can work." },
  { q: "In judo, what are the three parts of a throw called?", opts: ["Push, pull, roll","Kuzushi, Tsukuri, Kake","Attack, defend, escape","Enter, turn, sweep"], correct: 1, fact: "Every throw has three phases: Kuzushi (break balance), Tsukuri (fit in), Kake (execute). Skipping any phase fails the technique." },
  { q: "What is 'Osoto-gari'?", opts: ["A hip throw","Major outer reap","A shoulder throw","A foot sweep"], correct: 1, fact: "Osoto-gari (大外刈り) — major outer reap — is one of judo's most powerful throws, reaping the opponent's leg from outside." },
  { q: "What is 'Seoi-nage'?", opts: ["Hip throw","Foot sweep","Shoulder throw","Inner reap"], correct: 2, fact: "Seoi-nage (背負い投げ) is a shoulder throw where Tori lifts Uke onto their back and throws forward — a classic technique." },
  { q: "What does 'Osaekomi-waza' mean?", opts: ["Throwing techniques","Hold-down techniques","Choking techniques","Joint locks"], correct: 1, fact: "Osaekomi-waza (押え込み技) are pinning techniques. A 20-second hold earns Ippon; 5–10 seconds earns Waza-ari in competition." },
  { q: "When was judo first in the Olympic Games?", opts: ["1948 London","1956 Melbourne","1964 Tokyo","1972 Munich"], correct: 2, fact: "Judo debuted at the 1964 Tokyo Olympics — fittingly in Japan. Dutch athlete Anton Geesink famously won the open-weight gold." },
  { q: "What is the judo dojo's training hall entry ritual?", opts: ["Salute to teacher","Bow when stepping on or off the mat","Sprint around the mat","Handshake with partner"], correct: 1, fact: "Judoka bow (Rei) every time they step onto or off the tatami — a sign of respect for the training space and partners." },
  { q: "What is 'O-uchi-gari'?", opts: ["Major outer reap","Major inner reap","Hip throw","Leg sweep"], correct: 1, fact: "O-uchi-gari (大内刈り) — major inner reap — sweeps the opponent's inner leg, often combined with O-soto-gari in combinations." },
  { q: "What does 'Ko' mean in technique names like Ko-uchi-gari?", opts: ["Major","Small/Minor","Forward","Outer"], correct: 1, fact: "Ko (小) means 'small' or 'minor', while O (大) means 'major'. Ko-uchi-gari is the minor inner reap — a subtle foot attack." },
  { q: "What does 'Shime-waza' mean?", opts: ["Throwing techniques","Hold-downs","Strangulation techniques","Balance breaks"], correct: 2, fact: "Shime-waza (絞め技) are choke/strangle techniques targeting the carotid arteries. A judoka should tap out quickly — seconds matter!" },
];

const ADVANCED_QS: Question[] = [
  { q: "What are Judo's two main principles called?", opts: ["Rei and Kuzushi","Seiryoku zenyo and Jita kyoei","Randori and Kata","Nage and Newaza"], correct: 1, fact: "Seiryoku zenyo (精力善用) = maximum efficiency with minimum effort. Jita kyoei (自他共栄) = mutual welfare and benefit. Kano's philosophical foundations." },
  { q: "Teddy Riner won how many consecutive Men's World Championship titles (2010–2017)?", opts: ["6","7","8","10"], correct: 2, fact: "Teddy Riner (France) won 8 consecutive World Championships (2010–2017) and is considered the greatest heavyweight judoka ever." },
  { q: "What is 'Harai-goshi'?", opts: ["Sweeping hip throw","Inner leg reap","Shoulder drop","Knee wheel"], correct: 0, fact: "Harai-goshi (払腰) — sweeping hip throw — sweeps the opponent's legs while projecting them over the hip. A high-skill throw." },
  { q: "What is 'Tomoe-nage'?", opts: ["A sacrifice throw using the stomach","A shoulder throw","A leg reap","A standing choke"], correct: 0, fact: "Tomoe-nage (巴投げ) is a circular sacrifice throw — Tori falls backward and uses their foot on Uke's stomach to project them overhead." },
  { q: "How long must a pin be maintained to score Ippon in competition?", opts: ["10 seconds","15 seconds","20 seconds","25 seconds"], correct: 2, fact: "A 20-second Osaekomi scores Ippon. 10–19 seconds scores Waza-ari. Under 10 seconds scores nothing in IJF rules (as of 2017+)." },
  { q: "What is 'Kata' in judo?", opts: ["Free sparring","Pre-arranged formal training sequences","Belt exam","A foot sweep"], correct: 1, fact: "Kata (型) are pre-arranged forms practised with a partner. Nage-no-kata, Katame-no-kata, and Kodokan Goshin-jutsu are the main ones." },
  { q: "What does 'Kansetsu-waza' mean?", opts: ["Sacrifice throws","Strangulation techniques","Joint lock techniques","Counter throws"], correct: 2, fact: "Kansetsu-waza (関節技) are joint locks — in competition, only elbow locks (Ude-hishigi) are legal; shoulder/wrist/knee locks are restricted." },
  { q: "What is 'Kesa-gatame'?", opts: ["A hip throw","Scarf hold / cross-body pin","A knee wheel throw","A choke"], correct: 1, fact: "Kesa-gatame (袈裟固め) — scarf hold — is one of judo's oldest and most effective pins, clamping Uke's arm and head to the mat." },
  { q: "What is 'Sumi-gaeshi'?", opts: ["Corner throw (sacrifice)","Sweeping loin","Hip dislocation throw","Major outer reap"], correct: 0, fact: "Sumi-gaeshi (隅返し) — corner throw — is a sutemi (sacrifice) waza where Tori falls to the side to throw Uke diagonally." },
  { q: "Women's judo was first included in the Olympics in which year?", opts: ["1984","1988","1992","1996"], correct: 2, fact: "Women's judo was added at the 1992 Barcelona Olympics, 28 years after men's judo first appeared in Tokyo 1964." },
  { q: "What is 'Morote-seoi-nage'?", opts: ["One-arm shoulder throw","Two-hand shoulder throw","Hip wheel","Floating throw"], correct: 1, fact: "Morote-seoi-nage (両手背負い投げ) uses BOTH hands to grip Uke's sleeve and lapel, providing more control than ippon-seoi-nage." },
  { q: "What is 'De-ashi-barai'?", opts: ["Major inner reap","Advancing foot sweep","Hip throw","Drop knee throw"], correct: 1, fact: "De-ashi-barai (出足払い) — advancing foot sweep — times the opponent's forward step and sweeps their foot just as weight transfers to it." },
  { q: "What is 'Tani-otoshi'?", opts: ["Shoulder wheel","Valley drop","Floating drop","Hip dislocation"], correct: 1, fact: "Tani-otoshi (谷落とし) — valley drop — is a counter-throw executed by stepping behind the attacker and dropping to the mat with them." },
  { q: "In judo scoring, what replaced 'Yuko' (under IJF 2010 reform)?", opts: ["It became a full Ippon","It was removed; only Waza-ari and Ippon remain","It became a penalty","It became two Shidos"], correct: 1, fact: "The IJF removed Yuko in 2010, simplifying to Waza-ari and Ippon only. This forced judoka to attempt more decisive throws." },
  { q: "What does the referee call when a pin begins?", opts: ["Hajime","Osaekomi","Soremade","Koka"], correct: 1, fact: "Osaekomi! (押え込み!) is called when a hold-down is established — the clock starts counting toward Ippon or Waza-ari." },
  { q: "What is 'Tokui-waza'?", opts: ["A beginner technique","A favourite / specialist throw","A type of kata","A penalty throw"], correct: 1, fact: "Tokui-waza (得意技) is a judoka's 'favourite technique' — their go-to throw built through thousands of repetitions." },
  { q: "What is 'Uchi-mata'?", opts: ["Inner thigh throw","Major outer reap","Hip sweep","Shoulder drop"], correct: 0, fact: "Uchi-mata (内股) — inner thigh throw — sweeps between the legs from inside. One of the most common and versatile competition throws." },
  { q: "What is 'Ippon-seoi-nage'?", opts: ["Two-arm shoulder throw","One-arm shoulder throw","Hip throw","Sacrifice throw"], correct: 1, fact: "Ippon-seoi-nage (一本背負い投げ) uses one arm to secure Uke's sleeve while pivoting under them — lightning-fast and unpredictable." },
  { q: "What is the IJF competition rule for 'gripping time'?", opts: ["No time limit","3 seconds without attacking is a Shido penalty","5 seconds then Ippon is reversed","10 seconds only"], correct: 1, fact: "Under IJF rules, holding a grip for 3+ seconds without attacking earns a Shido (minor penalty) — forcing constant offensive intent." },
  { q: "What is 'Ko-soto-gari'?", opts: ["Minor outer reap","Minor inner reap","Floating hip","Corner throw"], correct: 0, fact: "Ko-soto-gari (小外刈り) — minor outer reap — targets the outer ankle/calf, often used as a combination follow-up to O-uchi-gari." },
  { q: "What is 'Hane-goshi'?", opts: ["Spring hip throw","Sweeping hip throw","Knee wheel","Shoulder wheel"], correct: 0, fact: "Hane-goshi (跳腰) — spring hip throw — uses a springing action of the knee to project the opponent, distinct from the smoother Harai-goshi." },
  { q: "What is 'Nage-no-kata'?", opts: ["Ground techniques kata","15 throwing techniques in formal pair form","A children's exercise","A belt test"], correct: 1, fact: "Nage-no-kata (投の形) consists of 15 throws in 5 pairs (Ma-sutemi, Yoko-sutemi, Ashi, Koshi, Te-waza) practised in formal paired sequence." },
  { q: "What does 'Koka' refer to in modern IJF rules?", opts: ["A minor score still in use","It was removed — no longer valid","A type of penalty","A near-Ippon throw"], correct: 1, fact: "Koka was the smallest score (removed 2003–2009, briefly returned, then permanently removed 2017). Only Waza-ari and Ippon exist today." },
  { q: "What does 'Sutemi-waza' mean?", opts: ["Counter techniques","Sacrifice throwing techniques","Strangle techniques","Advance foot sweeps"], correct: 1, fact: "Sutemi-waza (捨身技) are sacrifice throws where Tori intentionally falls to the mat to throw Uke — risking position to gain power." },
  { q: "What is 'Yoko-shiho-gatame'?", opts: ["Scarf hold","Side four-corner hold","Upper four-corner hold","Knee-on-belly hold"], correct: 1, fact: "Yoko-shiho-gatame (横四方固め) — side four-corner hold — pins from the side, controlling both Uke's head and hips simultaneously." },
  { q: "The Kodokan, judo's world headquarters, is located in which city?", opts: ["Osaka","Kyoto","Hiroshima","Tokyo"], correct: 3, fact: "Kano founded the Kodokan (講道館) in Tokyo in 1882 with just 9 students. Today it has training floors for thousands and is judo's spiritual home." },
  { q: "What is 'Tai-otoshi'?", opts: ["Body drop throw","Valley drop","Hip throw","Shoulder wheel"], correct: 0, fact: "Tai-otoshi (体落とし) — body drop — blocks the opponent's lead leg with Tori's trailing leg while pulling them forward over it." },
  { q: "What does 'Shido' mean in competition?", opts: ["Minor penalty","Major penalty","Disqualification","Warning without penalty"], correct: 0, fact: "Shido (指導) is a minor penalty for passivity or minor rule violations. Three Shidos = Hansoku-make (disqualification) for the opponent." },
  { q: "What is 'Hansoku-make'?", opts: ["Penalty causing loss of match","Minor warning","Half point","Major advantage throw"], correct: 0, fact: "Hansoku-make (反則負け) is disqualification — given for serious rule violations (like attacking the legs) or accumulating three Shidos." },
  { q: "What is 'Gyaku-juji-jime'?", opts: ["Reverse cross choke","A shoulder throw","An armbar","A foot sweep"], correct: 0, fact: "Gyaku-juji-jime (逆十字絞め) — reverse cross choke — is applied with crossed hands on Uke's collar, squeezing the carotid arteries." },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

const QUESTIONS_PER_GAME = 15;
const TIME_PER_Q = 20; // seconds

// ── Component ─────────────────────────────────────────────────────────────────
export default function JudoTriviaGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [phase, setPhase]           = useState<Phase>("idle");
  const [score, setScore]           = useState(0);
  const [streak, setStreak]         = useState(0);
  const [qIndex, setQIndex]         = useState(0);
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_Q);
  const [chosen, setChosen]         = useState<number | null>(null);
  const [highScore, setHighScore]   = useState(0);
  const [correct, setCorrect]       = useState(0);

  // Refs
  const phaseRef     = useRef<Phase>("idle");
  const scoreRef     = useRef(0);
  const streakRef    = useRef(0);
  const correctRef   = useRef(0);
  const diffRef      = useRef<Difficulty>("Beginner");
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const clearTimers = useCallback(() => {
    if (timerRef.current)   clearTimeout(timerRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // ── startGame ──────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    clearTimers();
    const pool = diffRef.current === "Beginner" ? BEGINNER_QS : ADVANCED_QS;
    const qs = shuffle(pool).slice(0, QUESTIONS_PER_GAME);
    phaseRef.current = "playing";
    scoreRef.current = 0;
    streakRef.current = 0;
    correctRef.current = 0;
    setPhase("playing");
    setScore(0);
    setStreak(0);
    setQIndex(0);
    setTimeLeft(TIME_PER_Q);
    setQuestions(qs);
    setChosen(null);
    setCorrect(0);
  }, [clearTimers]);

  const handleDiffChange = useCallback((d: Difficulty) => {
    setDifficulty(d);
    if (phaseRef.current !== "idle") {
      phaseRef.current = "idle";
      setPhase("idle");
      setQuestions([]);
    }
  }, []);

  // ── Timer countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || chosen !== null) return;
    if (timeLeft <= 0) {
      // Time expired — treat as wrong
      setChosen(-1); // -1 = timed out
      streakRef.current = 0;
      setStreak(0);
      advanceRef.current = setTimeout(() => {
        const nextIdx = qIndex + 1;
        if (nextIdx >= QUESTIONS_PER_GAME || nextIdx >= questions.length) {
          phaseRef.current = "over";
          setPhase("over");
          setHighScore(prev => Math.max(prev, scoreRef.current));
        } else {
          setQIndex(nextIdx);
          setTimeLeft(TIME_PER_Q);
          setChosen(null);
        }
      }, 2000);
      return;
    }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    timerRef.current = t;
    return () => clearTimeout(t);
  }, [phase, timeLeft, chosen, qIndex, questions.length]);

  // ── handleAnswer ───────────────────────────────────────────────────────────
  const handleAnswer = useCallback((optIdx: number) => {
    if (chosen !== null || phaseRef.current !== "playing") return;
    clearTimers();
    setChosen(optIdx);
    const q = questions[qIndex];
    if (optIdx === q.correct) {
      streakRef.current += 1;
      setStreak(streakRef.current);
      const bonus = streakRef.current >= 5 ? 30 : streakRef.current >= 3 ? 20 : 10;
      scoreRef.current += bonus;
      setScore(scoreRef.current);
      correctRef.current += 1;
      setCorrect(correctRef.current);
    } else {
      streakRef.current = 0;
      setStreak(0);
    }
    advanceRef.current = setTimeout(() => {
      const nextIdx = qIndex + 1;
      if (nextIdx >= QUESTIONS_PER_GAME || nextIdx >= questions.length) {
        phaseRef.current = "over";
        setPhase("over");
        setHighScore(prev => Math.max(prev, scoreRef.current));
      } else {
        setQIndex(nextIdx);
        setTimeLeft(TIME_PER_Q);
        setChosen(null);
      }
    }, 2200);
  }, [chosen, questions, qIndex, clearTimers]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentQ  = questions[qIndex] ?? null;
  const timerPct  = timeLeft / TIME_PER_Q;
  const timerColor = timeLeft <= 5 ? "#ef4444" : timeLeft <= 8 ? "#f59e0b" : "var(--accent-primary)";
  const streakMul = streakRef.current >= 5 ? "×3" : streakRef.current >= 3 ? "×2" : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Difficulty */}
      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Level:</span>
        {(["Beginner", "Advanced"] as Difficulty[]).map(d => (
          <button
            key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => handleDiffChange(d)}
          >
            {d === "Beginner" ? "🥋 Beginner" : "🏆 Advanced"}
          </button>
        ))}
      </div>

      {/* ── IDLE ──────────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🥋</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1.25rem", maxWidth: 360, margin: "0 auto 1.25rem" }}>
            {difficulty === "Beginner"
              ? `Test your judo basics — terms, commands, fundamental throws, and mat etiquette. ${QUESTIONS_PER_GAME} questions, ${TIME_PER_Q}s each.`
              : `Advanced judo — technique names, competition rules, kata, and judo history. Streaks multiply your points!`}
          </p>
          {highScore > 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore} pts</strong>
            </div>
          )}
          <button className={styles.resetBtn} onClick={startGame}>Hajime! 🥋</button>
        </div>
      )}

      {/* ── PLAYING ───────────────────────────────────────────────────────────── */}
      {phase === "playing" && currentQ && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", width: "100%", animation: "jt-fade-in 0.3s ease-out" }}>

          {/* HUD */}
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: timerColor, fontFamily: "monospace", lineHeight: 1, animation: timeLeft <= 5 ? "jt-timer-pulse 0.5s ease-in-out infinite" : undefined }}>
                {String(timeLeft).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>sec</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>pts</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{qIndex + 1}/{QUESTIONS_PER_GAME}</div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>question</div>
            </div>
            {streak >= 3 && (
              <div style={{
                background: streak >= 5 ? "#ef4444" : "#f59e0b",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "0.2rem 0.55rem",
                fontWeight: 800,
                fontSize: "0.8rem",
                animation: "jt-streak-pop 0.25s ease-out",
                whiteSpace: "nowrap",
              }}>
                🔥 {streak} streak! {streakMul}
              </div>
            )}
          </div>

          {/* Timer bar */}
          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${timerPct * 100}%`,
              background: timerColor,
              transition: "width 1s linear, background 0.3s",
            }} />
          </div>

          {/* Question card */}
          <div key={qIndex} style={{
            animation: "jt-fade-in 0.3s ease-out",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "1rem 1.25rem",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
              🥋 Judo Question
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>
              {currentQ.q}
            </div>
          </div>

          {/* Answer options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {currentQ.opts.map((opt, i) => {
              const isCorrect = i === currentQ.correct;
              const isChosen  = i === chosen;
              const timedOut  = chosen === -1;
              let bg     = "rgba(255,255,255,0.04)";
              let border = "var(--border-color)";
              let anim: string | undefined;

              if (chosen !== null) {
                if (isCorrect) {
                  bg = "rgba(34,197,94,0.15)";
                  border = "#22c55e";
                  anim = "jt-correct 0.5s ease-out";
                } else if (isChosen && !isCorrect) {
                  bg = "rgba(239,68,68,0.15)";
                  border = "#ef4444";
                  anim = "jt-wrong 0.4s ease-out";
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={chosen !== null}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: bg,
                    border: `2px solid ${border}`,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    textAlign: "left",
                    cursor: chosen !== null ? "default" : "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                    animation: anim,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: isChosen || (chosen !== null && isCorrect) ? "inherit" : "var(--text-secondary)",
                    minWidth: 18,
                  }}>
                    {chosen !== null ? (isCorrect ? "✓" : isChosen ? "✗" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Fact / timeout message */}
          {chosen !== null && (
            <div style={{
              animation: "jt-fade-in 0.3s ease-out",
              background: chosen !== -1 && chosen === currentQ.correct
                ? "rgba(34,197,94,0.06)"
                : "rgba(239,68,68,0.06)",
              border: `1px solid ${chosen !== -1 && chosen === currentQ.correct ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: "var(--radius-md)",
              padding: "0.65rem 1rem",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              textAlign: "center",
            }}>
              {chosen === -1
                ? `⏱️ Time's up! Correct answer: ${currentQ.opts[currentQ.correct]}`
                : chosen === currentQ.correct
                ? `✅ ${streakRef.current >= 3 ? `🔥 ${streakRef.current}-streak! +${streakRef.current >= 5 ? 30 : 20} pts! ` : "+10 pts! "}${currentQ.fact}`
                : `❌ ${currentQ.fact}`}
            </div>
          )}
        </div>
      )}

      {/* ── OVER ──────────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ textAlign: "center", padding: "2rem 0.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
            {correct >= QUESTIONS_PER_GAME * 0.8 ? "🏆" : correct >= QUESTIONS_PER_GAME * 0.5 ? "🥋" : "🤼"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
            {correct >= QUESTIONS_PER_GAME * 0.8
              ? "Sensei material!"
              : correct >= QUESTIONS_PER_GAME * 0.5
              ? "Good dojo knowledge!"
              : "Keep training — Osu!"}
          </div>
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1, marginBottom: "0.2rem" }}>
            {score}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.2rem" }}>points</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
            {correct}/{QUESTIONS_PER_GAME} correct
            {highScore > 0 && score < highScore && (
              <span> · Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore}</strong></span>
            )}
          </div>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
