"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── CSS animations ───────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes id-wave-enter {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes id-defeat {
  0%   { transform: scale(1) rotate(0deg); opacity: 1; }
  35%  { transform: scale(1.25) rotate(20deg); filter: brightness(2.5); }
  100% { transform: scale(0) rotate(40deg); opacity: 0; }
}
@keyframes id-shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-7px); }
  45%     { transform: translateX(7px); }
  65%     { transform: translateX(-4px); }
  85%     { transform: translateX(4px); }
}
@keyframes id-score-pop {
  0%   { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-44px); }
}
@keyframes id-banner-in {
  0%   { opacity: 0; transform: scale(0.9); }
  15%  { opacity: 1; transform: scale(1.03); }
  25%  { transform: scale(1); }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes id-fact {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes id-cell-pulse {
  0%,100% { box-shadow: 0 0 0 2px var(--accent-primary); }
  50%     { box-shadow: 0 0 12px 4px rgba(212,160,23,0.45); }
}
@keyframes id-hp-shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-3px); }
  75%     { transform: translateX(3px); }
}
`;

// ── Types ────────────────────────────────────────────────────────────────────
type InvaderType = "Bacterium" | "Virus" | "Parasite";
type CellType    = "Neutrophil" | "Macrophage" | "B-Cell" | "T-Cell" | "NK-Cell";
type Difficulty  = "Kids" | "Adult";
type Phase       = "idle" | "playing" | "over";

interface Invader {
  id: number;
  type: InvaderType;
  status: "alive" | "dying" | "hit";
}

interface ImmuneCell {
  type: CellType;
  status: "ready" | "selected" | "cooldown";
}

interface ScorePopup {
  id: number;
  label: string;
  positive: boolean;
}

// ── Game data ────────────────────────────────────────────────────────────────
// Which invader types each immune cell can defeat
const EFFECTIVENESS: Record<CellType, InvaderType[]> = {
  "Neutrophil": ["Bacterium"],
  "Macrophage": ["Bacterium", "Parasite"],
  "B-Cell":     ["Bacterium", "Virus"],
  "T-Cell":     ["Virus"],
  "NK-Cell":    ["Virus", "Parasite"],
};

const KIDS_CELLS: CellType[]  = ["Neutrophil", "B-Cell", "T-Cell"];
const ADULT_CELLS: CellType[] = ["Neutrophil", "Macrophage", "B-Cell", "T-Cell", "NK-Cell"];

const CELL_EMOJI: Record<CellType, string> = {
  "Neutrophil": "🔵",
  "Macrophage": "🟣",
  "B-Cell":     "🟡",
  "T-Cell":     "🟢",
  "NK-Cell":    "🔴",
};

const CELL_TARGETS: Record<CellType, string> = {
  "Neutrophil": "🦠 Bacteria",
  "Macrophage": "🦠🐛",
  "B-Cell":     "🦠😈",
  "T-Cell":     "😈 Viruses",
  "NK-Cell":    "😈🐛",
};

const INVADER_EMOJI: Record<InvaderType, string> = {
  "Bacterium": "🦠",
  "Virus":     "😈",
  "Parasite":  "🐛",
};

const INVADER_BG: Record<InvaderType, string> = {
  "Bacterium": "rgba(34,197,94,0.13)",
  "Virus":     "rgba(239,68,68,0.13)",
  "Parasite":  "rgba(168,85,247,0.13)",
};

const INVADER_BORDER: Record<InvaderType, string> = {
  "Bacterium": "rgba(34,197,94,0.45)",
  "Virus":     "rgba(239,68,68,0.45)",
  "Parasite":  "rgba(168,85,247,0.45)",
};

const CELL_FACTS: Record<CellType, string> = {
  "Neutrophil": "Neutrophils are first responders — they engulf and digest bacteria through phagocytosis within minutes of an infection!",
  "Macrophage": "Macrophages engulf bacteria and parasites, then display fragments on their surface to activate the rest of the immune system.",
  "B-Cell":     "B-Cells produce Y-shaped antibodies that tag bacteria and viruses for destruction, providing long-lasting immunity!",
  "T-Cell":     "Cytotoxic T-Cells hunt virus-infected host cells and inject perforins that trigger self-destruction (apoptosis).",
  "NK-Cell":    "Natural Killer cells detect abnormal cells by the absence of a surface marker — they destroy virus-infected cells and parasites on contact.",
};

const MAX_WAVES: Record<Difficulty, number> = { "Kids": 8, "Adult": 10 };
const WAVE_TIME: Record<Difficulty, number> = { "Kids": 20, "Adult": 15 };
const MAX_HP:    Record<Difficulty, number> = { "Kids": 6,  "Adult": 4  };

const INVADER_TYPES: InvaderType[] = ["Bacterium", "Virus", "Parasite"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInvaderCount(wave: number, diff: Difficulty): number {
  if (diff === "Kids") return Math.min(2 + Math.floor((wave - 1) / 3), 4);
  return Math.min(3 + Math.floor((wave - 1) / 2), 7);
}

// Kids cells: Neutrophil (Bacteria), B-Cell (Bacteria+Virus), T-Cell (Virus)
// → only Bacteria + Virus invaders so every invader is beatable
const KIDS_INVADER_TYPES: InvaderType[] = ["Bacterium", "Virus"];

function makeInvaders(wave: number, diff: Difficulty, idRef: { v: number }): Invader[] {
  const count = getInvaderCount(wave, diff);
  const pool = diff === "Kids" ? KIDS_INVADER_TYPES : INVADER_TYPES;
  return Array.from({ length: count }, () => ({
    id: idRef.v++,
    type: pool[Math.floor(Math.random() * pool.length)],
    status: "alive" as const,
  }));
}

function makeHand(diff: Difficulty): ImmuneCell[] {
  const cells = diff === "Kids" ? KIDS_CELLS : ADULT_CELLS;
  return cells.map(type => ({ type, status: "ready" as const }));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ImmuneDefenseGame({ title }: { title: string }) {
  const [difficulty, setDifficulty]     = useState<Difficulty>("Kids");
  const [phase, setPhase]               = useState<Phase>("idle");
  const [score, setScore]               = useState(0);
  const [hp, setHp]                     = useState(6);
  const [wave, setWave]                 = useState(1);
  const [invaders, setInvaders]         = useState<Invader[]>([]);
  const [hand, setHand]                 = useState<ImmuneCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<CellType | null>(null);
  const [waveTimeLeft, setWaveTimeLeft] = useState(20);
  const [banner, setBanner]             = useState<{ text: string; positive: boolean } | null>(null);
  const [showFact, setShowFact]         = useState(false);
  const [factText, setFactText]         = useState("");
  const [popups, setPopups]             = useState<ScorePopup[]>([]);
  const [highScore, setHighScore]       = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [hpShake, setHpShake]           = useState(false);

  // Refs — mutable state read inside timers/closures
  const phaseRef        = useRef<Phase>("idle");
  const scoreRef        = useRef(0);
  const hpRef           = useRef(6);
  const waveRef         = useRef(1);
  const diffRef         = useRef<Difficulty>("Kids");
  const invadersRef     = useRef<Invader[]>([]);
  const handRef         = useRef<ImmuneCell[]>([]);
  const selectedCellRef = useRef<CellType | null>(null);
  const transitionRef   = useRef(false);
  const invaderIdRef    = useRef({ v: 1 });
  const popupIdRef      = useRef(0);
  const factHideRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cellCoolRefs    = useRef<Partial<Record<CellType, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  // Atomic sync helpers
  const syncInvaders = useCallback((next: Invader[]) => {
    invadersRef.current = next;
    setInvaders(next);
  }, []);

  const syncHand = useCallback((next: ImmuneCell[]) => {
    handRef.current = next;
    setHand(next);
  }, []);

  const clearAllTimers = useCallback(() => {
    if (factHideRef.current) clearTimeout(factHideRef.current);
    Object.values(cellCoolRefs.current).forEach(t => { if (t) clearTimeout(t); });
    cellCoolRefs.current = {};
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  const showFactBanner = useCallback((text: string) => {
    if (factHideRef.current) clearTimeout(factHideRef.current);
    setFactText(text);
    setShowFact(true);
    factHideRef.current = setTimeout(() => setShowFact(false), 3800);
  }, []);

  const addPopup = useCallback((label: string, positive: boolean) => {
    const id = popupIdRef.current++;
    setPopups(p => [...p, { id, label, positive }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id !== id)), 900);
  }, []);

  // ── triggerWaveClear ───────────────────────────────────────────────────────
  const triggerWaveClear = useCallback(() => {
    if (transitionRef.current || phaseRef.current !== "playing") return;
    transitionRef.current = true;
    setTransitioning(true);

    const currentWave = waveRef.current;
    const diff = diffRef.current;
    const maxW = MAX_WAVES[diff];
    const bonus = currentWave >= Math.floor(maxW / 2) ? 30 : 20;
    scoreRef.current += bonus;
    setScore(scoreRef.current);

    if (currentWave >= maxW) {
      setBanner({ text: `🎉 All ${maxW} waves survived — YOU WIN! +${bonus} bonus!`, positive: true });
      setTimeout(() => {
        setBanner(null);
        phaseRef.current = "over";
        setPhase("over");
        setHighScore(prev => Math.max(prev, scoreRef.current));
        transitionRef.current = false;
        setTransitioning(false);
      }, 2500);
      return;
    }

    setBanner({ text: `✅ Wave ${currentWave} cleared! +${bonus} pts`, positive: true });
    setTimeout(() => {
      setBanner(null);
      const nextWave = currentWave + 1;
      waveRef.current = nextWave;
      setWave(nextWave);
      syncInvaders(makeInvaders(nextWave, diffRef.current, invaderIdRef.current));
      syncHand(makeHand(diffRef.current));
      selectedCellRef.current = null;
      setSelectedCell(null);
      setWaveTimeLeft(WAVE_TIME[diffRef.current]);
      transitionRef.current = false;
      setTransitioning(false);
    }, 2000);
  }, [syncInvaders, syncHand]);

  // ── Wave countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || transitioning) return;
    if (waveTimeLeft <= 0) {
      if (transitionRef.current) return;
      transitionRef.current = true;
      setTransitioning(true);

      const aliveCount = invadersRef.current.filter(inv => inv.status !== "dying").length;
      const hpLoss = Math.min(aliveCount, 3);

      if (hpLoss > 0) {
        hpRef.current = Math.max(0, hpRef.current - hpLoss);
        setHp(hpRef.current);
        setHpShake(true);
        setTimeout(() => setHpShake(false), 500);
      }

      if (hpRef.current <= 0) {
        setBanner({ text: "💀 Immune system overwhelmed! Game over!", positive: false });
        setTimeout(() => {
          setBanner(null);
          phaseRef.current = "over";
          setPhase("over");
          setHighScore(prev => Math.max(prev, scoreRef.current));
          transitionRef.current = false;
          setTransitioning(false);
        }, 2200);
        return;
      }

      const currentWave = waveRef.current;
      const maxW = MAX_WAVES[diffRef.current];
      if (currentWave >= maxW) {
        setBanner({ text: `⚠️ Wave ${currentWave} — time expired. Mission complete!`, positive: false });
        setTimeout(() => {
          setBanner(null);
          phaseRef.current = "over";
          setPhase("over");
          setHighScore(prev => Math.max(prev, scoreRef.current));
          transitionRef.current = false;
          setTransitioning(false);
        }, 2200);
        return;
      }

      const hpMsg = hpLoss > 0 ? ` (−${hpLoss} HP)` : "";
      setBanner({ text: `⚠️ Wave ${currentWave} — invaders broke through!${hpMsg}`, positive: false });
      setTimeout(() => {
        setBanner(null);
        const nextWave = currentWave + 1;
        waveRef.current = nextWave;
        setWave(nextWave);
        syncInvaders(makeInvaders(nextWave, diffRef.current, invaderIdRef.current));
        syncHand(makeHand(diffRef.current));
        selectedCellRef.current = null;
        setSelectedCell(null);
        setWaveTimeLeft(WAVE_TIME[diffRef.current]);
        transitionRef.current = false;
        setTransitioning(false);
      }, 2200);
      return;
    }
    const t = setTimeout(() => setWaveTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, waveTimeLeft, transitioning, syncInvaders, syncHand]);

  // ── startGame ──────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    clearAllTimers();
    const diff = diffRef.current;
    const startHp = MAX_HP[diff];
    phaseRef.current = "playing";
    scoreRef.current = 0;
    hpRef.current = startHp;
    waveRef.current = 1;
    transitionRef.current = false;
    invaderIdRef.current = { v: 1 };
    selectedCellRef.current = null;
    const firstInvaders = makeInvaders(1, diff, invaderIdRef.current);
    const firstHand = makeHand(diff);
    setPhase("playing");
    setScore(0);
    setHp(startHp);
    setWave(1);
    setWaveTimeLeft(WAVE_TIME[diff]);
    syncInvaders(firstInvaders);
    syncHand(firstHand);
    setSelectedCell(null);
    setBanner(null);
    setShowFact(false);
    setPopups([]);
    setTransitioning(false);
    setHpShake(false);
  }, [clearAllTimers, syncInvaders, syncHand]);

  const resetToIdle = useCallback(() => {
    clearAllTimers();
    phaseRef.current = "idle";
    transitionRef.current = false;
    setPhase("idle");
    syncInvaders([]);
    syncHand([]);
    setSelectedCell(null);
    setBanner(null);
    setTransitioning(false);
  }, [clearAllTimers, syncInvaders, syncHand]);

  const handleDiffChange = useCallback((d: Difficulty) => {
    setDifficulty(d);
    resetToIdle();
  }, [resetToIdle]);

  // ── handleCellTap ──────────────────────────────────────────────────────────
  const handleCellTap = useCallback((cellType: CellType) => {
    if (phaseRef.current !== "playing" || transitionRef.current) return;
    if (selectedCellRef.current === cellType) {
      selectedCellRef.current = null;
      setSelectedCell(null);
      syncHand(handRef.current.map(c =>
        c.type === cellType ? { ...c, status: "ready" } : c
      ));
    } else {
      selectedCellRef.current = cellType;
      setSelectedCell(cellType);
      syncHand(handRef.current.map(c => ({
        ...c,
        status: c.type === cellType ? "selected" : c.status === "selected" ? "ready" : c.status,
      })));
    }
  }, [syncHand]);

  // ── handleInvaderTap ───────────────────────────────────────────────────────
  const handleInvaderTap = useCallback((invaderId: number, invaderType: InvaderType) => {
    if (phaseRef.current !== "playing" || transitionRef.current) return;
    const cellType = selectedCellRef.current;
    if (!cellType) return;
    const invader = invadersRef.current.find(inv => inv.id === invaderId);
    if (!invader || invader.status !== "alive") return;

    const effective = EFFECTIVENESS[cellType].includes(invaderType);

    if (effective) {
      // Mark invader as dying
      syncInvaders(invadersRef.current.map(inv =>
        inv.id === invaderId ? { ...inv, status: "dying" } : inv
      ));
      scoreRef.current += 20;
      setScore(scoreRef.current);
      addPopup("+20", true);
      showFactBanner(CELL_FACTS[cellType]);

      // Deselect cell, put on cooldown
      selectedCellRef.current = null;
      setSelectedCell(null);
      syncHand(handRef.current.map(c =>
        c.type === cellType ? { ...c, status: "cooldown" } : c
      ));
      const coolT = setTimeout(() => {
        syncHand(handRef.current.map(c =>
          c.type === cellType ? { ...c, status: "ready" } : c
        ));
      }, 800);
      cellCoolRefs.current[cellType] = coolT;

      // Remove dying invader after animation, then check wave clear
      setTimeout(() => {
        const next = invadersRef.current.filter(inv => inv.id !== invaderId);
        syncInvaders(next);
        const remaining = next.filter(inv => inv.status !== "dying");
        if (remaining.length === 0 && !transitionRef.current) {
          triggerWaveClear();
        }
      }, 600);
    } else {
      // Miss — shake, deselect, Adult penalty
      syncInvaders(invadersRef.current.map(inv =>
        inv.id === invaderId ? { ...inv, status: "hit" } : inv
      ));
      if (diffRef.current === "Adult") {
        scoreRef.current = Math.max(0, scoreRef.current - 5);
        setScore(scoreRef.current);
        addPopup("\u22125", false);
      }
      selectedCellRef.current = null;
      setSelectedCell(null);
      syncHand(handRef.current.map(c =>
        c.status === "selected" ? { ...c, status: "ready" } : c
      ));
      setTimeout(() => {
        syncInvaders(invadersRef.current.map(inv =>
          inv.id === invaderId ? { ...inv, status: "alive" } : inv
        ));
      }, 500);
    }
  }, [syncInvaders, syncHand, addPopup, showFactBanner, triggerWaveClear]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const diff = difficulty;
  const maxW = MAX_WAVES[diff];
  const waveTime = WAVE_TIME[diff];
  const maxHp = MAX_HP[diff];
  const timerFrac = waveTimeLeft / waveTime;
  const timerColor = waveTimeLeft <= 5 ? "#ef4444" : waveTimeLeft <= 8 ? "#f59e0b" : "var(--text-primary)";
  const cells = diff === "Kids" ? KIDS_CELLS : ADULT_CELLS;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Difficulty */}
      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>Mode:</span>
        {(["Kids", "Adult"] as Difficulty[]).map(d => (
          <button
            key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`}
            onClick={() => handleDiffChange(d)}
          >
            {d === "Kids" ? "🧒 Kids" : "🔬 Adult"}
          </button>
        ))}
      </div>

      {/* ── IDLE ──────────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🛡️</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1.25rem", maxWidth: 360, margin: "0 auto 1.25rem" }}>
            {diff === "Kids"
              ? `Bacteria 🦠 and Viruses 😈 are attacking! Tap a cell card, then tap an invader to deploy it. Survive ${MAX_WAVES.Kids} waves to win!`
              : `Deploy the right immune cells against each invader. Wrong cells cost −5 pts. Survive all ${MAX_WAVES.Adult} waves!`}
          </p>

          {/* Cell cheat sheet */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "center", marginBottom: "1.25rem" }}>
            {cells.map(ct => (
              <div key={ct} style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                <span>{CELL_EMOJI[ct]}</span>
                <strong style={{ color: "var(--text-primary)", minWidth: 90, textAlign: "left" }}>{ct}</strong>
                <span>→ {CELL_TARGETS[ct]}</span>
              </div>
            ))}
          </div>

          {highScore > 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore} pts</strong>
            </div>
          )}
          <button className={styles.resetBtn} onClick={startGame}>Deploy!</button>
        </div>
      )}

      {/* ── PLAYING ───────────────────────────────────────────────────────────── */}
      {phase === "playing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem", width: "100%" }}>

          {/* HUD */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", justifyContent: "center", width: "100%" }}>
            {/* HP */}
            <div
              style={{ textAlign: "center", animation: hpShake ? "id-hp-shake 0.4s ease-out" : undefined }}
            >
              <div style={{ fontSize: "1.25rem", lineHeight: 1, letterSpacing: -2 }}>
                {Array.from({ length: maxHp }, (_, i) => (
                  <span key={i} style={{ opacity: i < hp ? 1 : 0.18 }}>❤️</span>
                ))}
              </div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>HP</div>
            </div>

            {/* Score */}
            <div style={{ textAlign: "center", position: "relative" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>pts</div>
              {popups.map(p => (
                <div key={p.id} style={{
                  position: "absolute", top: "20%", left: "50%",
                  transform: "translateX(-50%)",
                  color: p.positive ? "#22c55e" : "#ef4444",
                  fontWeight: 800, fontSize: "1.1rem",
                  pointerEvents: "none",
                  animation: "id-score-pop 0.9s ease-out forwards",
                  whiteSpace: "nowrap", zIndex: 10,
                  textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                }}>
                  {p.label}
                </div>
              ))}
            </div>

            {/* Timer */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: timerColor, lineHeight: 1, fontFamily: "monospace" }}>
                {String(waveTimeLeft).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                wave {wave}/{maxW}
              </div>
            </div>
          </div>

          {/* Timer bar */}
          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${timerFrac * 100}%`,
              background: waveTimeLeft <= 5 ? "#ef4444" : "var(--accent-primary)",
              transition: "width 1s linear, background 0.3s",
            }} />
          </div>

          {/* Banner */}
          {banner && (
            <div style={{
              background: banner.positive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${banner.positive ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: banner.positive ? "#22c55e" : "#ef4444",
              textAlign: "center",
              width: "100%",
              animation: "id-banner-in 2.5s ease-in-out forwards",
            }}>
              {banner.text}
            </div>
          )}

          {/* Invader arena */}
          <div style={{
            width: "100%",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "0.65rem",
            minHeight: 108,
          }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.45rem", textAlign: "center" }}>
              {selectedCell
                ? `${CELL_EMOJI[selectedCell]} ${selectedCell} ready — tap an invader`
                : "← Select a cell card below, then tap an invader above →"}
            </div>
            <div key={`wave-${wave}`} style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", justifyContent: "center", animation: "id-wave-enter 0.35s ease-out" }}>
              {invaders.map(inv =>
                inv.status === "dying" ? (
                  <div
                    key={inv.id}
                    style={{
                      width: 70, height: 70,
                      borderRadius: "var(--radius-md)",
                      background: INVADER_BG[inv.type],
                      border: `2px solid ${INVADER_BORDER[inv.type]}`,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      animation: "id-defeat 0.6s ease-out forwards",
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ fontSize: "2rem" }}>{INVADER_EMOJI[inv.type]}</span>
                  </div>
                ) : (
                  <button
                    key={inv.id}
                    onClick={() => handleInvaderTap(inv.id, inv.type)}
                    disabled={!selectedCell || transitioning}
                    style={{
                      width: 70, height: 70,
                      borderRadius: "var(--radius-md)",
                      background: INVADER_BG[inv.type],
                      border: `2px solid ${selectedCell ? INVADER_BORDER[inv.type] : "rgba(255,255,255,0.08)"}`,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 2,
                      cursor: selectedCell ? "pointer" : "default",
                      animation: inv.status === "hit" ? "id-shake 0.45s ease-out" : undefined,
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      boxShadow: selectedCell ? `0 0 0 1px ${INVADER_BORDER[inv.type]}` : "none",
                    }}
                  >
                    <span style={{ fontSize: "1.9rem", lineHeight: 1 }}>{INVADER_EMOJI[inv.type]}</span>
                    <span style={{ fontSize: "0.52rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>{inv.type}</span>
                  </button>
                )
              )}
              {invaders.length === 0 && !transitioning && (
                <div style={{ color: "#22c55e", fontSize: "0.85rem", padding: "0.75rem", fontWeight: 600 }}>
                  Wave cleared! ✅
                </div>
              )}
            </div>
          </div>

          {/* Immune cell hand */}
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem", textAlign: "center" }}>
              Your immune cells — tap to select
            </div>
            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
              {hand.map(cell => (
                <button
                  key={cell.type}
                  onClick={() => handleCellTap(cell.type)}
                  disabled={cell.status === "cooldown" || transitioning}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "0.45rem 0.55rem",
                    borderRadius: "var(--radius-md)",
                    background: cell.status === "selected"
                      ? "rgba(212,160,23,0.15)"
                      : cell.status === "cooldown"
                      ? "rgba(255,255,255,0.015)"
                      : "rgba(255,255,255,0.04)",
                    border: cell.status === "selected"
                      ? "2px solid var(--accent-primary)"
                      : "2px solid var(--border-color)",
                    cursor: cell.status === "cooldown" ? "default" : "pointer",
                    opacity: cell.status === "cooldown" ? 0.3 : 1,
                    transition: "background 0.15s, border-color 0.15s, opacity 0.25s",
                    animation: cell.status === "selected" ? "id-cell-pulse 1.6s ease-in-out infinite" : undefined,
                    minWidth: 56,
                  }}
                >
                  <span style={{ fontSize: "1.55rem", lineHeight: 1 }}>{CELL_EMOJI[cell.type]}</span>
                  <span style={{ fontSize: "0.58rem", color: "var(--text-primary)", fontWeight: 600, marginTop: 2, whiteSpace: "nowrap" }}>{cell.type}</span>
                  <span style={{ fontSize: "0.5rem", color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.2 }}>{CELL_TARGETS[cell.type]}</span>
                  {cell.status === "cooldown" && (
                    <span style={{ fontSize: "0.48rem", color: "var(--text-secondary)", marginTop: 1 }}>⏳</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Fact banner */}
          {showFact && (
            <div style={{
              animation: "id-fact 0.3s ease-out",
              background: "rgba(212,160,23,0.06)",
              border: "1px solid rgba(212,160,23,0.22)",
              borderRadius: "var(--radius-md)",
              padding: "0.65rem 1rem",
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              width: "100%",
              maxWidth: 420,
              textAlign: "center",
            }}>
              🔬 {factText}
            </div>
          )}
        </div>
      )}

      {/* ── OVER ──────────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ textAlign: "center", padding: "2rem 0.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
            {hp > 0 ? (score >= highScore && score > 0 ? "🏆" : "🎉") : "💀"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
            {hp > 0 ? "Immune system victorious!" : "The body was overwhelmed!"}
          </div>
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1, marginBottom: "0.2rem" }}>
            {score}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.2rem" }}>points</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
            Wave {wave} of {maxW}
            {highScore > 0 && score < highScore && (
              <span> &middot; Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore}</strong></span>
            )}
          </div>
          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
