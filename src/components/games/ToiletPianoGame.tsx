"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Notes (C4–C6 white keys) ───────────────────────────────────────────────
const NOTES: { label: string; freq: number; key: string }[] = [
  { label: "C",  freq: 261.63, key: "A" },
  { label: "D",  freq: 293.66, key: "S" },
  { label: "E",  freq: 329.63, key: "D" },
  { label: "F",  freq: 349.23, key: "F" },
  { label: "G",  freq: 392.00, key: "G" },
  { label: "A",  freq: 440.00, key: "H" },
  { label: "B",  freq: 493.88, key: "J" },
  { label: "C5", freq: 523.25, key: "K" },
  { label: "D5", freq: 587.33, key: "Q" },
  { label: "E5", freq: 659.26, key: "W" },
  { label: "F5", freq: 698.46, key: "E" },
  { label: "G5", freq: 783.99, key: "R" },
  { label: "A5", freq: 880.00, key: "T" },
  { label: "B5", freq: 987.77, key: "Y" },
  { label: "C6", freq:1046.50, key: "U" },
];

const KEY_MAP: Record<string, number> = Object.fromEntries(NOTES.map((n, i) => [n.key, i]));

// ── Songs (note indices into NOTES array, all within 0–7) ─────────────────
const SONGS = [
  {
    name: "Twinkle Twinkle",
    emoji: "⭐",
    notes: [0,0,4,4,5,5,4, 3,3,2,2,1,1,0, 4,4,3,3,2,2,1, 4,4,3,3,2,2,1, 0,0,4,4,5,5,4, 3,3,2,2,1,1,0],
  },
  {
    name: "Mary Had a Little Lamb",
    emoji: "🐑",
    notes: [2,1,0,1,2,2,2, 1,1,1, 2,4,4, 2,1,0,1,2,2,2, 2,1,1,2,1,0],
  },
  {
    name: "Hot Cross Buns",
    emoji: "🍞",
    notes: [2,1,0, 2,1,0, 0,0,0,0, 1,1,1,1, 2,1,0],
  },
  {
    name: "Ode to Joy",
    emoji: "🎶",
    notes: [2,2,3,4,4,3,2,1,0,0,1,2,2,1,1, 2,2,3,4,4,3,2,1,0,0,1,2,1,0,0],
  },
  {
    name: "Jingle Bells",
    emoji: "🔔",
    notes: [2,2,2, 2,2,2, 2,4,0,1,2, 3,3,3,3, 3,2,2,2, 2,1,1,2,1,4],
  },
];

const KEYFRAMES = `
@keyframes tpFlush {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.35) rotate(-8deg); }
  60%  { transform: scale(0.9) rotate(5deg); }
  100% { transform: scale(1); }
}
@keyframes tpPulse {
  0%, 100% { box-shadow: 0 0 0 2px #fbbf24, 0 0 16px 4px rgba(251,191,36,0.4); }
  50%       { box-shadow: 0 0 0 3px #f59e0b, 0 0 28px 8px rgba(251,191,36,0.7); }
}
@keyframes tpWrong {
  0%,100% { background: rgba(239,68,68,0.4); border-color: #ef4444; }
  50%     { background: rgba(239,68,68,0.7); border-color: #fca5a5; }
}
`;

// ── Audio ──────────────────────────────────────────────────────────────────
function playToiletNote(ctx: AudioContext, freq: number) {
  const now = ctx.currentTime;

  // Piano: triangle + 2nd harmonic
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const g1 = ctx.createGain();
  const g2 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.value = freq;
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;

  g1.gain.setValueAtTime(0.001, now);
  g1.gain.linearRampToValueAtTime(0.5, now + 0.012);
  g1.gain.linearRampToValueAtTime(0.13, now + 0.22);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

  g2.gain.setValueAtTime(0.001, now);
  g2.gain.linearRampToValueAtTime(0.07, now + 0.012);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

  osc1.connect(g1).connect(ctx.destination);
  osc2.connect(g2).connect(ctx.destination);
  osc1.start(now); osc2.start(now);
  osc1.stop(now + 1.35); osc2.stop(now + 1.35);

  // Fart: amplitude-modulated noise → lowpass (much louder & audible)
  const dur = 0.35 + Math.random() * 0.15;
  const bufLen = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const modFreq = 35 + Math.random() * 45; // 35–80 Hz flutter
  for (let i = 0; i < bufLen; i++) {
    const t = i / ctx.sampleRate;
    const flutter = Math.abs(Math.sin(Math.PI * modFreq * t));
    data[i] = (Math.random() * 2 - 1) * flutter;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 380;
  lpf.Q.value = 0.6;

  const fg = ctx.createGain();
  fg.gain.setValueAtTime(0.55, now);
  fg.gain.linearRampToValueAtTime(0.65, now + 0.04);
  fg.gain.exponentialRampToValueAtTime(0.001, now + dur);

  noise.connect(lpf).connect(fg).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + dur + 0.02);
}

// ── Component ──────────────────────────────────────────────────────────────
type Mode = "kids" | "adult";
type Tab = "free" | "song";

export default function ToiletPianoGame({ title }: { title: string }) {
  const [mode, setMode] = useState<Mode>("kids");
  const [tab, setTab] = useState<Tab>("free");
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const [flushCount, setFlushCount] = useState(0);
  const [btnSize, setBtnSize] = useState(72);

  // Song mode state
  const [selectedSong, setSelectedSong] = useState(0);
  const [songStep, setSongStep] = useState(0);
  const [songDone, setSongDone] = useState(false);
  const [wrongKey, setWrongKey] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeRef = useRef<Set<number>>(new Set());
  const flushRef = useRef(0);
  const songStepRef = useRef(0);
  const tabRef = useRef<Tab>("free");
  const selectedSongRef = useRef(0);

  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => { selectedSongRef.current = selectedSong; }, [selectedSong]);

  const noteCount = mode === "kids" ? 8 : 15;
  const notes = NOTES.slice(0, noteCount);
  const row1 = notes.slice(0, 8);
  const row2 = notes.slice(8);

  const currentSong = SONGS[selectedSong];
  const highlightNote = tab === "song" && !songDone ? currentSong.notes[songStep] : null;

  // Responsive button size
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const cols = mode === "kids" ? 4 : 5;
      const raw = Math.floor((w - 24 - 8 * (cols - 1)) / cols);
      setBtnSize(Math.max(52, Math.min(raw, 110)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mode]);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const pressNote = useCallback((idx: number) => {
    if (activeRef.current.has(idx)) return;
    const next = new Set<number>();
    activeRef.current.forEach(k => next.add(k));
    next.add(idx);
    activeRef.current = next;
    setActiveKeys(new Set(activeRef.current));

    playToiletNote(getCtx(), NOTES[idx].freq);

    flushRef.current += 1;
    setFlushCount(flushRef.current);

    // Song mode: check correctness
    if (tabRef.current === "song") {
      const song = SONGS[selectedSongRef.current];
      const expected = song.notes[songStepRef.current];
      if (idx === expected) {
        const ns = songStepRef.current + 1;
        songStepRef.current = ns;
        setSongStep(ns);
        if (ns >= song.notes.length) setSongDone(true);
      } else {
        setWrongKey(idx);
        setTimeout(() => setWrongKey(null), 420);
      }
    }

    setTimeout(() => {
      const nd = new Set<number>();
      activeRef.current.forEach(k => { if (k !== idx) nd.add(k); });
      activeRef.current = nd;
      setActiveKeys(new Set(activeRef.current));
    }, 340);
  }, [getCtx]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = KEY_MAP[e.key.toUpperCase()];
      if (idx !== undefined && idx < noteCount) pressNote(idx);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [noteCount, pressNote]);

  const startSong = (idx: number) => {
    setSelectedSong(idx);
    selectedSongRef.current = idx;
    songStepRef.current = 0;
    setSongStep(0);
    setSongDone(false);
  };

  const replaySong = () => {
    songStepRef.current = 0;
    setSongStep(0);
    setSongDone(false);
  };

  return (
    <div ref={containerRef} className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      {/* Mode */}
      <div className={styles.difficultySelector}>
        <button className={`${styles.diffBtn} ${mode === "kids" ? styles.activeDiff : ""}`} onClick={() => setMode("kids")}>Kids (8 keys)</button>
        <button className={`${styles.diffBtn} ${mode === "adult" ? styles.activeDiff : ""}`} onClick={() => setMode("adult")}>Adult (15 keys)</button>
      </div>

      {/* Tab */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 4 }}>
        <button className={`${styles.diffBtn} ${tab === "free" ? styles.activeDiff : ""}`} onClick={() => setTab("free")}>🎹 Free Play</button>
        <button className={`${styles.diffBtn} ${tab === "song" ? styles.activeDiff : ""}`} onClick={() => setTab("song")}>🎵 Learn Songs</button>
      </div>

      {/* Song picker */}
      {tab === "song" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: "2px 4px 6px" }}>
          {SONGS.map((s, i) => (
            <button
              key={i}
              className={`${styles.diffBtn} ${selectedSong === i ? styles.activeDiff : ""}`}
              onClick={() => startSong(i)}
              style={{ fontSize: "0.75rem" }}
            >
              {s.emoji} {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Song progress */}
      {tab === "song" && !songDone && (
        <div style={{ textAlign: "center", fontSize: "0.78rem", color: "#94a3b8", padding: "0 0 4px" }}>
          Note <strong style={{ color: "#fbbf24" }}>{songStep + 1}</strong> / {currentSong.notes.length}
          {" · "}press the <strong style={{ color: "#fbbf24" }}>glowing 🚽</strong>
        </div>
      )}

      {/* Song complete */}
      {tab === "song" && songDone && (
        <div style={{ textAlign: "center", padding: "4px 0 6px" }}>
          <span style={{ fontSize: "1.1rem" }}>🎉 </span>
          <strong style={{ color: "#4ade80" }}>Song complete!</strong>
          <button className={styles.diffBtn} onClick={replaySong} style={{ marginLeft: 10, fontSize: "0.75rem" }}>↺ Replay</button>
        </div>
      )}

      {/* Piano */}
      <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <NoteRow notes={row1} startIdx={0} activeKeys={activeKeys} btnSize={btnSize} onPress={pressNote} highlightNote={highlightNote} wrongKey={wrongKey} />
        {row2.length > 0 && (
          <NoteRow notes={row2} startIdx={8} activeKeys={activeKeys} btnSize={btnSize} onPress={pressNote} highlightNote={highlightNote} wrongKey={wrongKey} />
        )}
      </div>

      <div style={{ textAlign: "center", padding: "6px 0 2px", fontSize: "0.85rem", color: "#94a3b8" }}>
        🚽 Flushes: <strong style={{ color: "#e2e8f0" }}>{flushCount}</strong>
      </div>
      <div style={{ textAlign: "center", padding: "2px 0 6px", fontSize: "0.65rem", color: "#475569" }}>
        {mode === "kids" ? "Keys: A S D F G H J K" : "Row 1: A S D F G H J K · Row 2: Q W E R T Y U"}
      </div>
    </div>
  );
}

// ── NoteRow ────────────────────────────────────────────────────────────────
function NoteRow({
  notes, startIdx, activeKeys, btnSize, onPress, highlightNote, wrongKey,
}: {
  notes: typeof NOTES;
  startIdx: number;
  activeKeys: Set<number>;
  btnSize: number;
  onPress: (idx: number) => void;
  highlightNote: number | null;
  wrongKey: number | null;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {notes.map((note, i) => {
        const idx = startIdx + i;
        const active = activeKeys.has(idx);
        const highlight = highlightNote === idx;
        const wrong = wrongKey === idx;

        let bg = "rgba(30,41,59,0.8)";
        let border = "2px solid rgba(100,116,139,0.4)";
        let animation = "none";

        if (wrong) {
          bg = "rgba(239,68,68,0.4)";
          border = "2px solid #ef4444";
        } else if (highlight) {
          bg = "rgba(251,191,36,0.18)";
          border = "2px solid #fbbf24";
          animation = "tpPulse 0.9s ease-in-out infinite";
        } else if (active) {
          bg = "rgba(59,130,246,0.35)";
          border = "2px solid #3b82f6";
        }

        return (
          <button
            key={idx}
            onPointerDown={() => onPress(idx)}
            style={{
              width: btnSize, height: btnSize + 24,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              background: bg, border, borderRadius: 12,
              cursor: "pointer", padding: 4,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              userSelect: "none",
              transition: wrong ? "none" : "background 0.08s, border-color 0.08s",
              animation,
            }}
          >
            <span style={{ fontSize: Math.max(28, btnSize * 0.45), lineHeight: 1, display: "inline-block", animation: active ? "tpFlush 0.35s ease-out" : "none" }}>
              {active ? "💦" : "🚽"}
            </span>
            <span style={{ fontSize: "0.65rem", color: highlight ? "#fbbf24" : "#94a3b8", fontWeight: 600 }}>
              {note.label}
            </span>
            <span style={{ fontSize: "0.55rem", color: "#475569" }}>{note.key}</span>
          </button>
        );
      })}
    </div>
  );
}
