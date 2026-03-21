"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Note frequencies (C4 = middle C) ──────────────────────────────────────
const NOTES: { label: string; freq: number; key: string }[] = [
  { label: "C",  freq: 261.63, key: "A" },
  { label: "D",  freq: 293.66, key: "S" },
  { label: "E",  freq: 329.63, key: "D" },
  { label: "F",  freq: 349.23, key: "F" },
  { label: "G",  freq: 392.00, key: "G" },
  { label: "A",  freq: 440.00, key: "H" },
  { label: "B",  freq: 493.88, key: "J" },
  { label: "C5", freq: 523.25, key: "K" },
  // Adult extra row (C5–C6)
  { label: "D5", freq: 587.33, key: "Q" },
  { label: "E5", freq: 659.26, key: "W" },
  { label: "F5", freq: 698.46, key: "E" },
  { label: "G5", freq: 783.99, key: "R" },
  { label: "A5", freq: 880.00, key: "T" },
  { label: "B5", freq: 987.77, key: "Y" },
  { label: "C6", freq:1046.50, key: "U" },
];

const KEY_MAP: Record<string, number> = Object.fromEntries(
  NOTES.map((n, i) => [n.key, i])
);

const KEYFRAMES = `
@keyframes tpFlush {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.35) rotate(-8deg); }
  60%  { transform: scale(0.9) rotate(5deg); }
  100% { transform: scale(1); }
}
@keyframes tpWater {
  0%   { opacity: 0; transform: translateY(0) scale(0.8); }
  40%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(18px) scale(1.2); }
}
`;

// ── Audio synthesis ────────────────────────────────────────────────────────
function playToiletNote(ctx: AudioContext, freq: number) {
  const now = ctx.currentTime;

  // Piano tone: triangle at fundamental + sine at 2×
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();

  osc1.type = "triangle";
  osc1.frequency.value = freq;
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.55, now + 0.012);
  gain1.gain.linearRampToValueAtTime(0.15, now + 0.22);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.linearRampToValueAtTime(0.12 * 0.55, now + 0.012);
  gain2.gain.linearRampToValueAtTime(0.12 * 0.15, now + 0.22);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

  osc1.connect(gain1).connect(ctx.destination);
  osc2.connect(gain2).connect(ctx.destination);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.35);
  osc2.stop(now + 1.35);

  // Fart sound: white noise → bandpass
  const bufLen = Math.floor(ctx.sampleRate * 0.25);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const bpf = ctx.createBiquadFilter();
  bpf.type = "bandpass";
  bpf.frequency.value = Math.min(350, freq * 0.45 + 70);
  bpf.Q.value = 1.5;

  const fartGain = ctx.createGain();
  fartGain.gain.setValueAtTime(0.11, now);
  fartGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  noise.connect(bpf).connect(fartGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.25);
}

// ── Component ──────────────────────────────────────────────────────────────
type Mode = "kids" | "adult";

export default function ToiletPianoGame({ title }: { title: string }) {
  const [mode, setMode] = useState<Mode>("kids");
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const [flushCount, setFlushCount] = useState(0);
  const [btnSize, setBtnSize] = useState(72);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeRef = useRef<Set<number>>(new Set());
  const flushRef = useRef(0);

  const noteCount = mode === "kids" ? 8 : 15;
  const notes = NOTES.slice(0, noteCount);

  // Responsive btn size
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const cols = mode === "kids" ? 4 : 5;
      const gap = 8;
      const pad = 16;
      const raw = Math.floor((w - pad * 2 - gap * (cols - 1)) / cols);
      setBtnSize(Math.max(52, Math.min(raw, 110)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mode]);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const pressNote = useCallback((idx: number) => {
    if (activeRef.current.has(idx)) return;
    const nextAdd = new Set<number>();
    activeRef.current.forEach(k => nextAdd.add(k));
    nextAdd.add(idx);
    activeRef.current = nextAdd;
    setActiveKeys(new Set(activeRef.current));

    const ctx = getCtx();
    playToiletNote(ctx, NOTES[idx].freq);

    flushRef.current += 1;
    setFlushCount(flushRef.current);

    // Release visual after short time
    setTimeout(() => {
      const nextDel = new Set<number>();
      activeRef.current.forEach(k => { if (k !== idx) nextDel.add(k); });
      activeRef.current = nextDel;
      setActiveKeys(new Set(activeRef.current));
    }, 350);
  }, [getCtx]);

  // Keyboard listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = KEY_MAP[e.key.toUpperCase()];
      if (idx !== undefined && idx < noteCount) pressNote(idx);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [noteCount, pressNote]);

  // Split notes into rows
  const row1 = notes.slice(0, 8);
  const row2 = notes.slice(8);

  return (
    <div ref={containerRef} className={styles.gameInner}>
      <style>{KEYFRAMES}</style>

      <h2 className={styles.gameTitle}>{title}</h2>

      {/* Mode selector */}
      <div className={styles.difficultySelector}>
        <button
          className={`${styles.diffBtn} ${mode === "kids" ? styles.activeDiff : ""}`}
          onClick={() => setMode("kids")}
        >Kids (8 keys)</button>
        <button
          className={`${styles.diffBtn} ${mode === "adult" ? styles.activeDiff : ""}`}
          onClick={() => setMode("adult")}
        >Adult (15 keys)</button>
      </div>

      {/* Piano */}
      <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <NoteRow notes={row1} startIdx={0} activeKeys={activeKeys} btnSize={btnSize} onPress={pressNote} />
        {row2.length > 0 && (
          <NoteRow notes={row2} startIdx={8} activeKeys={activeKeys} btnSize={btnSize} onPress={pressNote} />
        )}
      </div>

      {/* Flush counter */}
      <div style={{ textAlign: "center", padding: "8px 0 4px", fontSize: "0.9rem", color: "#94a3b8" }}>
        🚽 Flushes: <strong style={{ color: "#e2e8f0" }}>{flushCount}</strong>
      </div>

      {/* Keyboard hint */}
      <div style={{ textAlign: "center", padding: "2px 0 8px", fontSize: "0.7rem", color: "#64748b" }}>
        {mode === "kids" ? "Keys: A S D F G H J K" : "Row 1: A S D F G H J K · Row 2: Q W E R T Y U"}
      </div>
    </div>
  );
}

// ── Row sub-component ───────────────────────────────────────────────────────
function NoteRow({
  notes,
  startIdx,
  activeKeys,
  btnSize,
  onPress,
}: {
  notes: typeof NOTES;
  startIdx: number;
  activeKeys: Set<number>;
  btnSize: number;
  onPress: (idx: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {notes.map((note, i) => {
        const idx = startIdx + i;
        const active = activeKeys.has(idx);
        return (
          <button
            key={idx}
            onPointerDown={() => onPress(idx)}
            style={{
              width: btnSize,
              height: btnSize + 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: active
                ? "rgba(59,130,246,0.35)"
                : "rgba(30,41,59,0.8)",
              border: active
                ? "2px solid #3b82f6"
                : "2px solid rgba(100,116,139,0.4)",
              borderRadius: 12,
              cursor: "pointer",
              transition: "background 0.08s, border-color 0.08s",
              padding: 4,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              userSelect: "none",
            }}
          >
            <span
              style={{
                fontSize: Math.max(28, btnSize * 0.45),
                lineHeight: 1,
                animation: active ? "tpFlush 0.35s ease-out" : "none",
                display: "inline-block",
              }}
            >
              {active ? "💦" : "🚽"}
            </span>
            <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600 }}>
              {note.label}
            </span>
            <span style={{ fontSize: "0.55rem", color: "#475569" }}>
              {note.key}
            </span>
          </button>
        );
      })}
    </div>
  );
}
