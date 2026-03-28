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

// ── SVG illustrations ────────────────────────────────────────────────────────
// Simple stick-figure diagrams for technique questions
const SVG = {
  seoi: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Uke flying overhead -->
    <circle cx="55" cy="10" r="7" fill="#9ca3af"/>
    <line x1="55" y1="17" x2="38" y2="32" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="46" y1="24" x2="32" y2="20" stroke="#9ca3af" stroke-width="2"/>
    <line x1="46" y1="24" x2="40" y2="36" stroke="#9ca3af" stroke-width="2"/>
    <line x1="38" y1="32" x2="28" y2="30" stroke="#9ca3af" stroke-width="2"/>
    <!-- Tori bent forward loading Uke -->
    <circle cx="60" cy="38" r="7" fill="#374151"/>
    <line x1="60" y1="45" x2="60" y2="65" stroke="#374151" stroke-width="3"/>
    <line x1="60" y1="52" x2="42" y2="44" stroke="#374151" stroke-width="2.5"/>
    <line x1="60" y1="52" x2="72" y2="44" stroke="#374151" stroke-width="2.5"/>
    <line x1="60" y1="65" x2="48" y2="82" stroke="#374151" stroke-width="3"/>
    <line x1="60" y1="65" x2="70" y2="82" stroke="#374151" stroke-width="3"/>
    <!-- label -->
    <text x="55" y="92" text-anchor="middle" font-size="7" fill="#6b7280">Seoi-nage</text>
  </svg>`,

  osoto: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Tori (dark) standing, leg raised to reap -->
    <circle cx="40" cy="20" r="7" fill="#374151"/>
    <line x1="40" y1="27" x2="40" y2="50" stroke="#374151" stroke-width="3"/>
    <line x1="40" y1="37" x2="25" y2="32" stroke="#374151" stroke-width="2.5"/>
    <line x1="40" y1="37" x2="55" y2="32" stroke="#374151" stroke-width="2.5"/>
    <line x1="40" y1="50" x2="28" y2="68" stroke="#374151" stroke-width="3"/>
    <!-- reaping leg extended back/up -->
    <line x1="40" y1="50" x2="62" y2="38" stroke="#374151" stroke-width="3"/>
    <!-- Uke (gray) falling backward -->
    <circle cx="72" cy="28" r="7" fill="#9ca3af"/>
    <line x1="72" y1="35" x2="68" y2="58" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="70" y1="46" x2="55" y2="42" stroke="#9ca3af" stroke-width="2"/>
    <line x1="70" y1="46" x2="80" y2="40" stroke="#9ca3af" stroke-width="2"/>
    <line x1="68" y1="58" x2="58" y2="72" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="68" y1="58" x2="78" y2="74" stroke="#9ca3af" stroke-width="2.5"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">Osoto-gari</text>
  </svg>`,

  ouchi: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Tori stepping inside, reaping inner leg -->
    <circle cx="38" cy="20" r="7" fill="#374151"/>
    <line x1="38" y1="27" x2="38" y2="50" stroke="#374151" stroke-width="3"/>
    <line x1="38" y1="37" x2="22" y2="32" stroke="#374151" stroke-width="2.5"/>
    <line x1="38" y1="37" x2="54" y2="32" stroke="#374151" stroke-width="2.5"/>
    <line x1="38" y1="50" x2="28" y2="70" stroke="#374151" stroke-width="3"/>
    <!-- inner reaping leg goes between opponent's legs -->
    <line x1="38" y1="50" x2="56" y2="62" stroke="#374151" stroke-width="3"/>
    <!-- Uke (gray) being swept back -->
    <circle cx="68" cy="22" r="7" fill="#9ca3af"/>
    <line x1="68" y1="29" x2="66" y2="52" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="67" y1="40" x2="52" y2="36" stroke="#9ca3af" stroke-width="2"/>
    <line x1="67" y1="40" x2="78" y2="34" stroke="#9ca3af" stroke-width="2"/>
    <line x1="66" y1="52" x2="54" y2="68" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="66" y1="52" x2="76" y2="70" stroke="#9ca3af" stroke-width="2.5"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">O-uchi-gari</text>
  </svg>`,

  harai: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Hip throw — Tori hip-to-hip, sweeping leg -->
    <circle cx="42" cy="22" r="7" fill="#374151"/>
    <line x1="42" y1="29" x2="42" y2="52" stroke="#374151" stroke-width="3"/>
    <line x1="42" y1="40" x2="26" y2="36" stroke="#374151" stroke-width="2.5"/>
    <line x1="42" y1="40" x2="58" y2="36" stroke="#374151" stroke-width="2.5"/>
    <line x1="42" y1="52" x2="30" y2="72" stroke="#374151" stroke-width="3"/>
    <!-- sweeping leg extended -->
    <line x1="42" y1="52" x2="66" y2="44" stroke="#374151" stroke-width="3"/>
    <!-- Uke arcing over hip -->
    <circle cx="72" cy="16" r="7" fill="#9ca3af"/>
    <line x1="72" y1="23" x2="58" y2="40" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="65" y1="31" x2="52" y2="26" stroke="#9ca3af" stroke-width="2"/>
    <line x1="65" y1="31" x2="72" y2="44" stroke="#9ca3af" stroke-width="2"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">Harai-goshi</text>
  </svg>`,

  tomoe: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Sacrifice throw — Tori on back, foot on Uke's stomach -->
    <!-- Tori lying back -->
    <circle cx="55" cy="68" r="7" fill="#374151"/>
    <line x1="55" y1="61" x2="55" y2="45" stroke="#374151" stroke-width="3"/>
    <line x1="55" y1="55" x2="38" y2="50" stroke="#374151" stroke-width="2.5"/>
    <line x1="55" y1="55" x2="72" y2="50" stroke="#374151" stroke-width="2.5"/>
    <!-- foot planted up -->
    <line x1="55" y1="45" x2="55" y2="28" stroke="#374151" stroke-width="3"/>
    <line x1="55" y1="28" x2="60" y2="22" stroke="#374151" stroke-width="2.5"/>
    <!-- Uke flying over in arc -->
    <circle cx="58" cy="10" r="7" fill="#9ca3af"/>
    <line x1="58" y1="17" x2="52" y2="30" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="55" y1="22" x2="42" y2="18" stroke="#9ca3af" stroke-width="2"/>
    <line x1="55" y1="22" x2="66" y2="18" stroke="#9ca3af" stroke-width="2"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">Tomoe-nage</text>
  </svg>`,

  kesa: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Kesa-gatame — Tori sitting beside Uke on ground -->
    <!-- Uke lying flat -->
    <circle cx="55" cy="45" r="7" fill="#9ca3af"/>
    <line x1="55" y1="52" x2="85" y2="52" stroke="#9ca3af" stroke-width="3"/>
    <line x1="55" y1="52" x2="25" y2="52" stroke="#9ca3af" stroke-width="3"/>
    <line x1="85" y1="52" x2="95" y2="62" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="85" y1="52" x2="95" y2="44" stroke="#9ca3af" stroke-width="2"/>
    <!-- Tori sitting on side, controlling head and arm -->
    <circle cx="28" cy="30" r="7" fill="#374151"/>
    <line x1="28" y1="37" x2="28" y2="55" stroke="#374151" stroke-width="3"/>
    <line x1="28" y1="45" x2="12" y2="40" stroke="#374151" stroke-width="2.5"/>
    <line x1="28" y1="45" x2="44" y2="46" stroke="#374151" stroke-width="2.5"/>
    <line x1="28" y1="55" x2="18" y2="70" stroke="#374151" stroke-width="3"/>
    <line x1="28" y1="55" x2="40" y2="68" stroke="#374151" stroke-width="3"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">Kesa-gatame</text>
  </svg>`,

  uchimata: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Uchi-mata — inner thigh throw -->
    <circle cx="40" cy="20" r="7" fill="#374151"/>
    <line x1="40" y1="27" x2="40" y2="50" stroke="#374151" stroke-width="3"/>
    <line x1="40" y1="38" x2="24" y2="34" stroke="#374151" stroke-width="2.5"/>
    <line x1="40" y1="38" x2="56" y2="34" stroke="#374151" stroke-width="2.5"/>
    <line x1="40" y1="50" x2="28" y2="70" stroke="#374151" stroke-width="3"/>
    <!-- inner leg sweeping up between legs -->
    <line x1="40" y1="50" x2="60" y2="36" stroke="#374151" stroke-width="3"/>
    <!-- Uke going up/over -->
    <circle cx="70" cy="14" r="7" fill="#9ca3af"/>
    <line x1="70" y1="21" x2="62" y2="40" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="66" y1="30" x2="52" y2="26" stroke="#9ca3af" stroke-width="2"/>
    <line x1="66" y1="30" x2="76" y2="22" stroke="#9ca3af" stroke-width="2"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">Uchi-mata</text>
  </svg>`,

  tai: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Tai-otoshi — leg block, forward throw -->
    <circle cx="38" cy="22" r="7" fill="#374151"/>
    <line x1="38" y1="29" x2="38" y2="52" stroke="#374151" stroke-width="3"/>
    <line x1="38" y1="40" x2="22" y2="35" stroke="#374151" stroke-width="2.5"/>
    <line x1="38" y1="40" x2="54" y2="35" stroke="#374151" stroke-width="2.5"/>
    <line x1="38" y1="52" x2="26" y2="72" stroke="#374151" stroke-width="3"/>
    <!-- blocking leg extended across -->
    <line x1="38" y1="52" x2="62" y2="54" stroke="#374151" stroke-width="3"/>
    <!-- Uke falling forward over blocked leg -->
    <circle cx="74" cy="24" r="7" fill="#9ca3af"/>
    <line x1="74" y1="31" x2="66" y2="52" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="70" y1="42" x2="56" y2="38" stroke="#9ca3af" stroke-width="2"/>
    <line x1="70" y1="42" x2="80" y2="36" stroke="#9ca3af" stroke-width="2"/>
    <line x1="66" y1="52" x2="72" y2="68" stroke="#9ca3af" stroke-width="2.5"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">Tai-otoshi</text>
  </svg>`,

  deashi: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- De-ashi-barai — foot sweep of advancing foot -->
    <circle cx="36" cy="22" r="7" fill="#374151"/>
    <line x1="36" y1="29" x2="36" y2="52" stroke="#374151" stroke-width="3"/>
    <line x1="36" y1="40" x2="20" y2="36" stroke="#374151" stroke-width="2.5"/>
    <line x1="36" y1="40" x2="52" y2="36" stroke="#374151" stroke-width="2.5"/>
    <line x1="36" y1="52" x2="24" y2="72" stroke="#374151" stroke-width="3"/>
    <!-- sweeping foot coming across low -->
    <line x1="36" y1="52" x2="66" y2="68" stroke="#374151" stroke-width="3"/>
    <!-- Uke with one foot just been swept -->
    <circle cx="72" cy="26" r="7" fill="#9ca3af"/>
    <line x1="72" y1="33" x2="70" y2="55" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="71" y1="44" x2="56" y2="40" stroke="#9ca3af" stroke-width="2"/>
    <line x1="71" y1="44" x2="82" y2="38" stroke="#9ca3af" stroke-width="2"/>
    <!-- foot being swept away -->
    <line x1="70" y1="55" x2="60" y2="72" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="70" y1="55" x2="82" y2="72" stroke="#9ca3af" stroke-width="2.5"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">De-ashi-barai</text>
  </svg>`,

  tani: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Tani-otoshi — valley drop from behind -->
    <!-- Uke (gray) being taken down -->
    <circle cx="58" cy="30" r="7" fill="#9ca3af"/>
    <line x1="58" y1="37" x2="58" y2="60" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="58" y1="48" x2="44" y2="44" stroke="#9ca3af" stroke-width="2"/>
    <line x1="58" y1="48" x2="72" y2="44" stroke="#9ca3af" stroke-width="2"/>
    <line x1="58" y1="60" x2="46" y2="78" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="58" y1="60" x2="68" y2="78" stroke="#9ca3af" stroke-width="2.5"/>
    <!-- Tori (dark) stepping behind, pulling down -->
    <circle cx="40" cy="36" r="7" fill="#374151"/>
    <line x1="40" y1="43" x2="38" y2="65" stroke="#374151" stroke-width="3"/>
    <line x1="39" y1="52" x2="24" y2="48" stroke="#374151" stroke-width="2.5"/>
    <line x1="39" y1="52" x2="54" y2="48" stroke="#374151" stroke-width="2.5"/>
    <line x1="38" y1="65" x2="26" y2="80" stroke="#374151" stroke-width="3"/>
    <line x1="38" y1="65" x2="50" y2="80" stroke="#374151" stroke-width="3"/>
    <text x="55" y="92" text-anchor="middle" font-size="7" fill="#6b7280">Tani-otoshi</text>
  </svg>`,

  bow: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Two judoka bowing to each other -->
    <circle cx="30" cy="22" r="7" fill="#374151"/>
    <line x1="30" y1="29" x2="22" y2="50" stroke="#374151" stroke-width="3"/>
    <line x1="26" y1="40" x2="14" y2="36" stroke="#374151" stroke-width="2"/>
    <line x1="26" y1="40" x2="36" y2="36" stroke="#374151" stroke-width="2"/>
    <line x1="22" y1="50" x2="18" y2="68" stroke="#374151" stroke-width="3"/>
    <line x1="22" y1="50" x2="28" y2="68" stroke="#374151" stroke-width="3"/>
    <circle cx="80" cy="22" r="7" fill="#9ca3af"/>
    <line x1="80" y1="29" x2="88" y2="50" stroke="#9ca3af" stroke-width="3"/>
    <line x1="84" y1="40" x2="74" y2="36" stroke="#9ca3af" stroke-width="2"/>
    <line x1="84" y1="40" x2="96" y2="36" stroke="#9ca3af" stroke-width="2"/>
    <line x1="88" y1="50" x2="82" y2="68" stroke="#9ca3af" stroke-width="3"/>
    <line x1="88" y1="50" x2="94" y2="68" stroke="#9ca3af" stroke-width="3"/>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">Rei</text>
  </svg>`,

  pin: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Generic ground hold -->
    <circle cx="55" cy="48" r="7" fill="#9ca3af"/>
    <line x1="55" y1="55" x2="85" y2="55" stroke="#9ca3af" stroke-width="3"/>
    <line x1="55" y1="55" x2="25" y2="55" stroke="#9ca3af" stroke-width="3"/>
    <circle cx="30" cy="32" r="7" fill="#374151"/>
    <line x1="30" y1="39" x2="30" y2="58" stroke="#374151" stroke-width="3"/>
    <line x1="30" y1="48" x2="14" y2="43" stroke="#374151" stroke-width="2.5"/>
    <line x1="30" y1="48" x2="48" y2="50" stroke="#374151" stroke-width="2.5"/>
    <line x1="30" y1="58" x2="20" y2="74" stroke="#374151" stroke-width="3"/>
    <line x1="30" y1="58" x2="42" y2="72" stroke="#374151" stroke-width="3"/>
    <!-- timer arc -->
    <path d="M 82 20 A 12 12 0 0 1 94 32" stroke="#f59e0b" stroke-width="2" fill="none"/>
    <text x="88" y="18" font-size="8" fill="#f59e0b">20s</text>
    <text x="55" y="88" text-anchor="middle" font-size="7" fill="#6b7280">Osaekomi</text>
  </svg>`,

  kuzushi: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Off-balance diagram — figure leaning with arrows -->
    <circle cx="55" cy="22" r="7" fill="#9ca3af"/>
    <line x1="55" y1="29" x2="62" y2="52" stroke="#9ca3af" stroke-width="3"/>
    <line x1="58" y1="40" x2="44" y2="36" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="58" y1="40" x2="72" y2="36" stroke="#9ca3af" stroke-width="2.5"/>
    <line x1="62" y1="52" x2="50" y2="70" stroke="#9ca3af" stroke-width="3"/>
    <line x1="62" y1="52" x2="74" y2="68" stroke="#9ca3af" stroke-width="3"/>
    <!-- arrow showing pull direction -->
    <line x1="30" y1="30" x2="48" y2="24" stroke="#ef4444" stroke-width="2"/>
    <polygon points="48,24 42,20 44,27" fill="#ef4444"/>
    <!-- balance line -->
    <line x1="20" y1="78" x2="90" y2="78" stroke="#374151" stroke-width="1.5" stroke-dasharray="4"/>
    <text x="55" y="90" text-anchor="middle" font-size="7" fill="#6b7280">Kuzushi</text>
  </svg>`,
};

// ── Types ────────────────────────────────────────────────────────────────────
type Phase      = "idle" | "playing" | "over";
type Difficulty = "Beginner" | "Advanced";
type Lang       = "en" | "he";

interface Question {
  q:       string;
  opts:    [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  fact:    string;
  img:     string; // emoji string or SVG key
  svgKey?: keyof typeof SVG;
}

// ── English question banks ────────────────────────────────────────────────────
const EN_BEGINNER: Question[] = [
  { q: "What is the training mat called in judo?", opts: ["Dojo","Tatami","Randori","Makura"], correct: 1, fact: "The tatami is a traditional Japanese mat designed to cushion breakfalls and protect judoka during training.", img: "🟫", },
  { q: "What does 'Rei' mean in judo?", opts: ["Start","Bow","Stop","Attack"], correct: 1, fact: "Rei (礼) is the bow — judo's most important ritual, showing mutual respect before and after every practice.", img: "", svgKey: "bow" },
  { q: "What does 'Hajime' mean?", opts: ["Stop","Well done","Begin","Danger"], correct: 2, fact: "Hajime (始め) is the referee's command to begin — it starts every contest and every randori session.", img: "▶️", },
  { q: "What does 'Matte' mean?", opts: ["Attack","Stop / Wait","Pin","Fall"], correct: 1, fact: "Matte (待て) means 'wait' — the referee calls it to pause the match and reset players to standing.", img: "✋", },
  { q: "Who founded judo?", opts: ["Gichin Funakoshi","Morihei Ueshiba","Jigoro Kano","Kyuzo Mifune"], correct: 2, fact: "Professor Jigoro Kano founded judo in 1882 at the Kodokan in Tokyo, adapting it from traditional ju-jitsu.", img: "👴🥋", },
  { q: "What does 'Tori' mean?", opts: ["The thrower","The mat","The referee","The hold"], correct: 0, fact: "Tori (取り) is the practitioner executing the technique — they throw or pin Uke during practice.", img: "⚡🥋", },
  { q: "What does 'Uke' mean?", opts: ["The winner","The person being thrown","The referee","The dojo"], correct: 1, fact: "Uke (受け) receives the technique. Learning to fall safely (ukemi) is the very first skill taught in judo.", img: "💫🥋", },
  { q: "What is 'Ukemi'?", opts: ["A throwing technique","Breakfalling","A ground choke","A belt exam"], correct: 1, fact: "Ukemi (受け身) means breakfall — the essential skill of landing safely after a throw, protecting joints and the head.", img: "🤸", },
  { q: "What does 'Ippon' mean?", opts: ["Half point","Penalty","Full point — match won","Restart"], correct: 2, fact: "Ippon (一本) is the highest score in judo, winning the match instantly. It requires a near-perfect throw or a 20-second pin.", img: "🏆", },
  { q: "What does 'Waza-ari' mean?", opts: ["No score","Half point","Full point","Penalty"], correct: 1, fact: "Waza-ari (技あり) is a near-perfect score. Two waza-ari equal one ippon under the 'accumulation rule'.", img: "⭐", },
  { q: "What is 'Randori'?", opts: ["A belt ceremony","Pre-arranged forms","Free practice sparring","A Japanese city"], correct: 2, fact: "Randori (乱取り) means 'free practice' — both partners take turns attacking and defending in a realistic cooperative way.", img: "🤼", },
  { q: "What is 'Uchi-komi'?", opts: ["Free sparring","Repetition entry drills","A ground choke","A competition throw"], correct: 1, fact: "Uchi-komi (内込み) is repetition drilling — entering the throw motion dozens of times to build muscle memory, without completing the throw.", img: "🔄", },
  { q: "What does 'Newaza' refer to?", opts: ["Standing throws","Groundwork","Belt ranking","Formal kata"], correct: 1, fact: "Newaza (寝技) is groundwork — pins, chokes, and joint locks applied on the mat after a throw or clinch.", img: "🤸‍♀️", },
  { q: "Which belt colour comes first in judo?", opts: ["Yellow","Blue","Red","White"], correct: 3, fact: "White is the first belt — the pure, empty colour representing a beginner who has everything to learn.", img: "🥋", },
  { q: "In competition, what colours must opponents wear?", opts: ["Both white","One blue, one white","Any colour","Both red"], correct: 1, fact: "Since 1997, IJF rules require one competitor to wear a blue judogi so referees and spectators can easily tell them apart.", img: "🔵⚪", },
  { q: "What does 'Kuzushi' mean?", opts: ["A throwing motion","Off-balancing","A ground pin","A bow"], correct: 1, fact: "Kuzushi (崩し) is the critical off-balancing that must come before the throw — without it, no technique can succeed.", img: "", svgKey: "kuzushi" },
  { q: "What are the three parts of a judo throw?", opts: ["Push, pull, roll","Kuzushi, Tsukuri, Kake","Attack, defend, escape","Enter, turn, sweep"], correct: 1, fact: "Every throw has three phases: Kuzushi (break balance), Tsukuri (fit into position), Kake (execute). Skipping any phase fails the technique.", img: "3️⃣", },
  { q: "What is 'Osoto-gari'?", opts: ["A hip throw","Major outer reap","A shoulder throw","A foot sweep"], correct: 1, fact: "Osoto-gari (大外刈り) — major outer reap — is one of judo's most powerful throws, reaping the opponent's outer leg from behind.", img: "", svgKey: "osoto" },
  { q: "What is 'Seoi-nage'?", opts: ["Hip throw","Foot sweep","Shoulder throw","Inner reap"], correct: 2, fact: "Seoi-nage (背負い投げ) is a shoulder throw where Tori loads Uke onto their back and throws them forward — a classic technique.", img: "", svgKey: "seoi" },
  { q: "What does 'Osaekomi-waza' mean?", opts: ["Throwing techniques","Hold-down techniques","Choking techniques","Joint locks"], correct: 1, fact: "Osaekomi-waza (押え込み技) are pinning techniques. A 20-second hold earns Ippon; 10–19 seconds earns Waza-ari.", img: "", svgKey: "pin" },
  { q: "When was judo first in the Olympic Games?", opts: ["1948 London","1956 Melbourne","1964 Tokyo","1972 Munich"], correct: 2, fact: "Judo debuted at the 1964 Tokyo Olympics — fittingly in Japan. Dutch athlete Anton Geesink won the open-weight gold.", img: "🏅🗼", },
  { q: "What do judoka do when stepping onto the mat?", opts: ["Clap hands","Bow (Rei)","Sprint a lap","Shake hands"], correct: 1, fact: "Judoka bow (Rei) every time they step onto or off the tatami — a sign of respect for the training space and partners.", img: "", svgKey: "bow" },
  { q: "What is 'O-uchi-gari'?", opts: ["Major outer reap","Major inner reap","Hip throw","Leg sweep"], correct: 1, fact: "O-uchi-gari (大内刈り) — major inner reap — sweeps the opponent's inner leg, often combined with O-soto-gari in combinations.", img: "", svgKey: "ouchi" },
  { q: "What does 'Ko' mean in technique names like Ko-uchi-gari?", opts: ["Major","Small / Minor","Forward","Outer"], correct: 1, fact: "Ko (小) means 'small' or 'minor', while O (大) means 'major'. Ko-uchi-gari is the minor inner reap — a subtle foot attack.", img: "🤏", },
  { q: "What does 'Shime-waza' mean?", opts: ["Throwing techniques","Hold-downs","Strangulation techniques","Balance breaks"], correct: 2, fact: "Shime-waza (絞め技) are choke techniques targeting the carotid arteries. A judoka should tap out immediately — seconds matter!", img: "🤲", },
];

const EN_ADVANCED: Question[] = [
  { q: "What are judo's two founding principles?", opts: ["Rei and Kuzushi","Seiryoku zenyo and Jita kyoei","Randori and Kata","Nage and Newaza"], correct: 1, fact: "Seiryoku zenyo (精力善用) = maximum efficiency, minimum effort. Jita kyoei (自他共栄) = mutual welfare and benefit. Kano's philosophical foundations.", img: "⚖️", },
  { q: "How many consecutive World Championship titles did Teddy Riner win (2010–2017)?", opts: ["6","7","8","10"], correct: 2, fact: "Teddy Riner (France) won 8 consecutive World Championships (2010–2017) and is widely regarded as the greatest heavyweight judoka ever.", img: "🏆🏆", },
  { q: "What is 'Harai-goshi'?", opts: ["Sweeping hip throw","Inner leg reap","Shoulder drop","Knee wheel"], correct: 0, fact: "Harai-goshi (払腰) — sweeping hip throw — sweeps Uke's legs while projecting them over the hip. A high-skill classic throw.", img: "", svgKey: "harai" },
  { q: "What is 'Tomoe-nage'?", opts: ["A circular sacrifice throw using the foot","A shoulder throw","A leg reap","A standing choke"], correct: 0, fact: "Tomoe-nage (巴投げ) is a sacrifice throw — Tori falls backward and uses their foot on Uke's stomach to project them overhead.", img: "", svgKey: "tomoe" },
  { q: "How long must a pin be held to score Ippon?", opts: ["10 seconds","15 seconds","20 seconds","25 seconds"], correct: 2, fact: "A 20-second osaekomi scores Ippon. 10–19 seconds scores Waza-ari. Under 10 seconds scores nothing under IJF rules (2017+).", img: "", svgKey: "pin" },
  { q: "What is 'Kata' in judo?", opts: ["Free sparring","Pre-arranged formal training sequences","Belt exam","A foot sweep"], correct: 1, fact: "Kata (型) are pre-arranged forms practised with a partner. Nage-no-kata and Katame-no-kata are the primary ones.", img: "📿", },
  { q: "What does 'Kansetsu-waza' mean?", opts: ["Sacrifice throws","Strangulation techniques","Joint lock techniques","Counter throws"], correct: 2, fact: "Kansetsu-waza (関節技) are joint locks — in IJF competition, only elbow locks (ude-hishigi) are legal; other joints are restricted.", img: "💪", },
  { q: "What is 'Kesa-gatame'?", opts: ["A hip throw","Scarf hold — side cross-body pin","A knee wheel throw","A choke"], correct: 1, fact: "Kesa-gatame (袈裟固め) — scarf hold — is one of judo's oldest and most effective pins, clamping Uke's arm and head to the mat.", img: "", svgKey: "kesa" },
  { q: "What is 'Sumi-gaeshi'?", opts: ["Corner sacrifice throw","Sweeping loin","Hip dislocation throw","Major outer reap"], correct: 0, fact: "Sumi-gaeshi (隅返し) — corner throw — is a sutemi (sacrifice) waza where Tori falls sideways to throw Uke diagonally.", img: "↙️🥋", },
  { q: "When was women's judo first included in the Olympics?", opts: ["1984","1988","1992","1996"], correct: 2, fact: "Women's judo was added at the 1992 Barcelona Olympics, 28 years after men's judo first appeared at Tokyo 1964.", img: "🥋👩", },
  { q: "What is 'Morote-seoi-nage'?", opts: ["One-arm shoulder throw","Two-hand shoulder throw","Hip wheel","Sacrifice throw"], correct: 1, fact: "Morote-seoi-nage (両手背負い投げ) uses both hands to grip Uke's sleeve and lapel, providing more control than ippon-seoi-nage.", img: "💪💪", },
  { q: "What is 'De-ashi-barai'?", opts: ["Major inner reap","Advancing foot sweep","Hip throw","Drop knee throw"], correct: 1, fact: "De-ashi-barai (出足払い) — advancing foot sweep — times the opponent's forward step and sweeps the foot as weight transfers to it.", img: "", svgKey: "deashi" },
  { q: "What is 'Tani-otoshi'?", opts: ["Shoulder wheel","Valley drop — counter throw","Floating drop","Hip dislocation"], correct: 1, fact: "Tani-otoshi (谷落とし) — valley drop — is executed by stepping behind the attacker and dropping to the mat with them.", img: "", svgKey: "tani" },
  { q: "What replaced 'Yuko' under the IJF 2010 reform?", opts: ["It became a full Ippon","It was removed — only Waza-ari and Ippon remain","It became a penalty","It became two Shidos"], correct: 1, fact: "The IJF removed Yuko in 2010, simplifying to Waza-ari and Ippon only — forcing judoka to attempt more decisive throws.", img: "❌", },
  { q: "What does the referee call when a pin begins?", opts: ["Hajime","Osaekomi","Soremade","Koka"], correct: 1, fact: "Osaekomi! (押え込み!) is called when a hold-down begins — the clock starts counting toward Ippon or Waza-ari.", img: "⏱️", },
  { q: "What is 'Tokui-waza'?", opts: ["A beginner technique","A favourite / specialist throw","A type of kata","A penalty throw"], correct: 1, fact: "Tokui-waza (得意技) is a judoka's 'favourite technique' — their go-to throw built through thousands of repetitions.", img: "⭐🎯", },
  { q: "What is 'Uchi-mata'?", opts: ["Inner thigh throw","Major outer reap","Hip sweep","Shoulder drop"], correct: 0, fact: "Uchi-mata (内股) — inner thigh throw — sweeps between Uke's legs from inside. One of the most common competition throws.", img: "", svgKey: "uchimata" },
  { q: "What is 'Ippon-seoi-nage'?", opts: ["Two-arm shoulder throw","One-arm shoulder throw","Hip throw","Sacrifice throw"], correct: 1, fact: "Ippon-seoi-nage (一本背負い投げ) uses one arm on Uke's sleeve while pivoting under them — lightning-fast and unpredictable.", img: "", svgKey: "seoi" },
  { q: "What is the IJF gripping-time rule?", opts: ["No time limit","3 seconds without attacking earns a Shido","5 seconds reverses the score","10 seconds only"], correct: 1, fact: "Holding a grip for 3+ seconds without attacking earns a Shido (minor penalty) — forcing constant offensive intent.", img: "✋⏱️", },
  { q: "What is 'Ko-soto-gari'?", opts: ["Minor outer reap","Minor inner reap","Floating hip","Corner throw"], correct: 0, fact: "Ko-soto-gari (小外刈り) — minor outer reap — targets the outer ankle/calf, often used as a combination follow-up.", img: "🦶", },
  { q: "What is 'Hane-goshi'?", opts: ["Spring hip throw","Sweeping hip throw","Knee wheel","Shoulder wheel"], correct: 0, fact: "Hane-goshi (跳腰) — spring hip throw — uses a springing action of the knee to project Uke, distinct from the smoother Harai-goshi.", img: "🦘", },
  { q: "What is 'Nage-no-kata'?", opts: ["Ground techniques kata","15 throws performed as formal pairs","A children's exercise","A belt test"], correct: 1, fact: "Nage-no-kata (投の形) consists of 15 throws in 5 groups, practised in formal paired sequence — the foundational kata of judo.", img: "📋", },
  { q: "What does 'Koka' refer to in modern IJF rules?", opts: ["A minor score still used","It was removed — no longer valid","A type of penalty","A near-Ippon throw"], correct: 1, fact: "Koka was the smallest score (removed 2010, briefly returned, permanently removed 2017). Only Waza-ari and Ippon exist today.", img: "❌", },
  { q: "What does 'Sutemi-waza' mean?", opts: ["Counter techniques","Sacrifice throwing techniques","Strangle techniques","Advance foot sweeps"], correct: 1, fact: "Sutemi-waza (捨身技) are sacrifice throws where Tori intentionally falls to throw Uke — risking position to gain power.", img: "🤸‍♂️⬇️", },
  { q: "What is 'Yoko-shiho-gatame'?", opts: ["Scarf hold","Side four-corner hold","Upper four-corner hold","Knee-on-belly hold"], correct: 1, fact: "Yoko-shiho-gatame (横四方固め) — side four-corner hold — pins from the side, controlling both Uke's head and hips.", img: "", svgKey: "pin" },
  { q: "Where is the Kodokan, judo's world headquarters?", opts: ["Osaka","Kyoto","Hiroshima","Tokyo"], correct: 3, fact: "Kano founded the Kodokan (講道館) in Tokyo in 1882 with just 9 students. Today it trains thousands and is judo's spiritual home.", img: "🏛️🗼", },
  { q: "What is 'Tai-otoshi'?", opts: ["Body drop throw","Valley drop","Hip throw","Shoulder wheel"], correct: 0, fact: "Tai-otoshi (体落とし) — body drop — blocks Uke's lead leg with Tori's trailing leg while pulling them forward over it.", img: "", svgKey: "tai" },
  { q: "What does 'Shido' mean in competition?", opts: ["Minor penalty","Major penalty","Disqualification","Warning without penalty"], correct: 0, fact: "Shido (指導) is a minor penalty for passivity or minor violations. Three Shidos = Hansoku-make (disqualification) for the opponent.", img: "⚠️", },
  { q: "What is 'Hansoku-make'?", opts: ["Disqualification — immediate loss","Minor warning","Half point","Major advantage throw"], correct: 0, fact: "Hansoku-make (反則負け) is disqualification — given for serious rule violations (e.g., leg grabs) or accumulating three Shidos.", img: "🚫", },
  { q: "What is 'Gyaku-juji-jime'?", opts: ["Reverse cross choke","A shoulder throw","An armbar","A foot sweep"], correct: 0, fact: "Gyaku-juji-jime (逆十字絞め) — reverse cross choke — applied with crossed hands on Uke's collar, compressing the carotid arteries.", img: "🤲", },
];

// ── Hebrew question banks ─────────────────────────────────────────────────────
const HE_BEGINNER: Question[] = [
  { q: "מה שמו של מזרן האימון בג'ודו?", opts: ["דוג'ו","טאטמי","ראנדורי","מאקורה"], correct: 1, fact: "הטאטמי הוא מחצלת יפנית מסורתית שנועדה לבלום נפילות ולהגן על הגוף בזמן אימון.", img: "🟫", },
  { q: "מה פירוש 'ריי' בג'ודו?", opts: ["התחל","קידה","עצור","תקוף"], correct: 1, fact: "ריי (礼) היא קידת כבוד — המחווה החשובה ביותר בג'ודו, המסמלת כבוד הדדי לפני ואחרי כל אימון.", img: "", svgKey: "bow" },
  { q: "מה פירוש 'האג'ימה'?", opts: ["עצור","כל הכבוד","התחל","סכנה"], correct: 2, fact: "האג'ימה (始め) היא פקודת השופט להתחיל — פותחת כל מאבק וכל ראנדורי.", img: "▶️", },
  { q: "מה פירוש 'מאטה'?", opts: ["תקוף","עצור / המתן","ריתוק","נפול"], correct: 1, fact: "מאטה (待て) אומר 'המתן' — השופט קורא לו כדי להפסיק את המאבק ולאפס עמדות.", img: "✋", },
  { q: "מי ייסד את הג'ודו?", opts: ["גיצ'ין פונאקושי","מוריהאי אושיבה","ג'יגורו קאנו","קיוזו מיפונה"], correct: 2, fact: "פרופסור ג'יגורו קאנו ייסד את הג'ודו ב-1882 בקודוקאן בטוקיו, ופיתח אותו מהג'ו-ג'יטסו.", img: "👴🥋", },
  { q: "מה פירוש 'טורי' בג'ודו?", opts: ["המבצע","השטיח","השופט","הלוק"], correct: 0, fact: "טורי (取り) הוא המבצע את הטכניקה — הזורק או המרתק את אוקה בזמן אימון.", img: "⚡🥋", },
  { q: "מה פירוש 'אוקה' בג'ודו?", opts: ["המנצח","המקבל — זה שנזרק","השופט","הדוג'ו"], correct: 1, fact: "אוקה (受け) מקבל את הטכניקה. לימוד נפילה נכונה (אוקמי) הוא הכישרון הראשון שמלמדים בג'ודו.", img: "💫🥋", },
  { q: "מה היא 'אוקמי'?", opts: ["טכניקת זריקה","נפילה נכונה / בטוחה","חנק קרקע","בחינת חגורה"], correct: 1, fact: "אוקמי (受け身) היא נפילה נכונה — הכישרון הבסיסי לנחיתה בלי להיפגע, המגן על המפרקים והראש.", img: "🤸", },
  { q: "מה פירוש 'איפון'?", opts: ["חצי ניקוד","עונש","ניקוד מלא — ניצחון","המשך"], correct: 2, fact: "איפון (一本) הוא הניקוד הגבוה ביותר בג'ודו, ומנצח את המאבק מיידית. דורש זריקה מושלמת כמעט או ריתוק של 20 שניות.", img: "🏆", },
  { q: "מה פירוש 'וואזה-ארי'?", opts: ["ללא ניקוד","חצי ניקוד","ניקוד מלא","עונש"], correct: 1, fact: "וואזה-ארי (技あり) הוא ניקוד כמעט מושלם. שניים שווים איפון אחד — 'כלל הצבירה'.", img: "⭐", },
  { q: "מה הוא 'ראנדורי'?", opts: ["טקס חגורה","תרגיל מובנה מראש","אימון חופשי","עיר יפנית"], correct: 2, fact: "ראנדורי (乱取り) פירושו 'תרגול חופשי' — שני שותפים מתחלפים בתפקידי תקיפה והגנה.", img: "🤼", },
  { q: "מה הוא 'אוצ'יקומי'?", opts: ["אימון חופשי","תרגיל כניסות חוזרות","חנק","זריקת תחרות"], correct: 1, fact: "אוצ'יקומי (内込み) הוא תרגיל כניסות חוזרות — מבצעים את תנועת הזריקה עשרות פעמים לבניית זיכרון שרירי.", img: "🔄", },
  { q: "למה מתייחסת 'נה-וואזה'?", opts: ["זריקות עמידה","עבודת קרקע","דירוג חגורות","קאטה רשמי"], correct: 1, fact: "נה-וואזה (寝技) היא עבודת הקרקע — ריתוקים, חנקים ומנעולי מפרקים על המזרן.", img: "🤸‍♀️", },
  { q: "איזה צבע חגורה מגיע ראשון בג'ודו?", opts: ["צהוב","כחול","אדום","לבן"], correct: 3, fact: "לבן הוא החגורה הראשונה — הצבע הנקי המסמל מתחיל שעדיין יש לו הכל ללמוד.", img: "🥋", },
  { q: "איזה צבע קימונו לובשים בתחרות?", opts: ["שניהם לבן","אחד כחול ואחד לבן","כל צבע","שניהם אדום"], correct: 1, fact: "מאז 1997, חוקי IJF דורשים שמתחרה אחד ילבש קימונו כחול כדי שניתן יהיה להבחין ביניהם.", img: "🔵⚪", },
  { q: "מה פירוש 'קוזושי'?", opts: ["תנועת זריקה","שבירת שיווי משקל","ריתוק קרקע","קידה"], correct: 1, fact: "קוזושי (崩し) הוא שבירת שיווי המשקל שחייבת לקדום לזריקה — בלעדיה אף טכניקה לא תצליח.", img: "", svgKey: "kuzushi" },
  { q: "מה שלושת שלבי הזריקה בג'ודו?", opts: ["דחוף, משוך, גלגל","קוזושי, צוקורי, קאקה","תקוף, הגן, ברח","כנס, סוב, טאטא"], correct: 1, fact: "כל זריקה מורכבת משלושה שלבים: קוזושי (שבירת שיווי משקל), צוקורי (כניסה למקום), קאקה (ביצוע).", img: "3️⃣", },
  { q: "מה היא 'או-סוטו-גארי'?", opts: ["זריקת ירך","גריפה חיצונית גדולה","זריקת כתף","טאטוא רגל"], correct: 1, fact: "או-סוטו-גארי (大外刈り) — גריפה חיצונית גדולה — אחת הזריקות החזקות ביותר בג'ודו, קוצרת את רגל היריב מבחוץ.", img: "", svgKey: "osoto" },
  { q: "מה היא 'סאוי-נאגה'?", opts: ["זריקת ירך","טאטוא רגל","זריקת כתף","גריפה פנימית"], correct: 2, fact: "סאוי-נאגה (背負い投げ) היא זריקת כתף שבה הטורי טוען את האוקה על גבו וזורק קדימה — טכניקה קלאסית.", img: "", svgKey: "seoi" },
  { q: "מה פירוש 'אוסאיקומי-וואזה'?", opts: ["טכניקות זריקה","טכניקות ריתוק","טכניקות חנק","מנעולי מפרקים"], correct: 1, fact: "אוסאיקומי-וואזה (押え込み技) הן טכניקות ריתוק. 20 שניות = איפון; 10–19 שניות = וואזה-ארי.", img: "", svgKey: "pin" },
  { q: "מתי הג'ודו הופיע לראשונה באולימפיאדה?", opts: ["1948 לונדון","1956 מלבורן","1964 טוקיו","1972 מינכן"], correct: 2, fact: "הג'ודו עלה לאולימפיאדה ב-1964 בטוקיו — ביפן עצמה. ההולנדי אנטון חזינק זכה בזהב בקטגוריה הפתוחה.", img: "🏅🗼", },
  { q: "מה עושים ג'ודוקאים בכניסה למזרן?", opts: ["מחיאות כפיים","קידה (ריי)","ריצה מסביב","לחיצת יד"], correct: 1, fact: "ג'ודוקאים מקדים (ריי) בכל פעם שנכנסים או יוצאים מהטאטמי — כבוד למרחב האימון ולשותפים.", img: "", svgKey: "bow" },
  { q: "מה היא 'או-אוצ'י-גארי'?", opts: ["גריפה חיצונית גדולה","גריפה פנימית גדולה","זריקת ירך","טאטוא רגל"], correct: 1, fact: "או-אוצ'י-גארי (大内刈り) — גריפה פנימית גדולה — מטאטאת את הרגל הפנימית של היריב.", img: "", svgKey: "ouchi" },
  { q: "מה פירוש 'קו' בשמות כמו קו-אוצ'י-גארי?", opts: ["גדול","קטן / משני","קדמי","חיצוני"], correct: 1, fact: "קו (小) פירושו 'קטן' או 'משני', בעוד שאו (大) פירושו 'גדול'. קו-אוצ'י-גארי היא גריפה פנימית קטנה.", img: "🤏", },
  { q: "מה פירוש 'שימה-וואזה'?", opts: ["טכניקות זריקה","ריתוקים","טכניקות חנק","שבירת שיווי משקל"], correct: 2, fact: "שימא-וואזה (絞め技) הן טכניקות חנק המכוונות לעורקי הצוואר. ג'ודוקא חייב לאות מהר — שניות חשובות!", img: "🤲", },
];

const HE_ADVANCED: Question[] = [
  { q: "מה שני עקרונות היסוד של הג'ודו?", opts: ["ריי וקוזושי","סיירוקו-זניו וג'יטה-קיואי","ראנדורי וקאטה","נאגה ונוואזה"], correct: 1, fact: "סיירוקו-זניו = יעילות מרבית במאמץ מינימלי. ג'יטה-קיואי = רווחה הדדית ותועלת משותפת — יסודות הפילוסופיה של קאנו.", img: "⚖️", },
  { q: "כמה אליפויות עולם ברצף זכה טדי ריינר (2010–2017)?", opts: ["6","7","8","10"], correct: 2, fact: "טדי ריינר (צרפת) זכה ב-8 אליפויות עולם ברצף (2010–2017) ונחשב לג'ודוקא הגדול ביותר במשקל כבד.", img: "🏆🏆", },
  { q: "מה היא 'האראי-גושי'?", opts: ["זריקת ירך-טאטוא","גריפת רגל פנימית","נפילת כתף","גלגל ברך"], correct: 0, fact: "האראי-גושי (払腰) — זריקת ירך-טאטוא — מטאטאת את רגלי היריב תוך כדי הטלתם מעל הירך.", img: "", svgKey: "harai" },
  { q: "מה היא 'טומואה-נאגה'?", opts: ["זריקת הקרבה מעגלית עם הרגל","זריקת כתף","גריפת רגל","חנק עמידה"], correct: 0, fact: "טומואה-נאגה (巴投げ) — זריקת הקרבה מעגלית — הטורי נופל אחורה ומשתמש ברגלו על בטן האוקה להקיפ אותו מעליו.", img: "", svgKey: "tomoe" },
  { q: "כמה שניות צריך להחזיק ריתוק כדי לזכות באיפון?", opts: ["10 שניות","15 שניות","20 שניות","25 שניות"], correct: 2, fact: "20 שניות אוסאיקומי = איפון. 10–19 שניות = וואזה-ארי. פחות מ-10 שניות = ללא ניקוד (חוקי IJF 2017+).", img: "", svgKey: "pin" },
  { q: "מה היא 'קאטה' בג'ודו?", opts: ["אימון חופשי","רצפי אימון פורמליים מוסכמים מראש","בחינת חגורה","טאטוא רגל"], correct: 1, fact: "קאטה (型) הם תרגילים פורמליים עם שותף. נאגה-נו-קאטה וקאטאמה-נו-קאטה הם העיקריים.", img: "📿", },
  { q: "מה פירוש 'קאנסטסו-וואזה'?", opts: ["זריקות הקרבה","טכניקות חנק","טכניקות מנעול מפרק","זריקות נגד"], correct: 2, fact: "קאנסטסו-וואזה (関節技) — מנעולי מפרקים. בתחרות IJF רק מנעולי מרפק (אודה-חישיגי) מותרים; שאר המפרקים — מוגבלים.", img: "💪", },
  { q: "מה היא 'קסה-גאטאמה'?", opts: ["זריקת ירך","לוק צלב — ריתוק קרקע צדי","גלגל ברך","חנק"], correct: 1, fact: "קסה-גאטאמה (袈裟固め) — לוק צלב — אחד מריתוקי הקרקע הוותיקים והאפקטיביים ביותר, קובע את זרוע האוקה וראשו.", img: "", svgKey: "kesa" },
  { q: "מה היא 'סומי-גאישי'?", opts: ["זריקת פינה — הקרבה","טאטוא ירך","פירוק ירך","גריפה חיצונית גדולה"], correct: 0, fact: "סומי-גאישי (隅返し) — זריקת פינה — וואזה סוטמי שבה הטורי נופל הצדה לזרוק את האוקה אלכסונית.", img: "↙️🥋", },
  { q: "ג'ודו נשים נכנס לאולימפיאדה לראשונה בשנת:", opts: ["1984","1988","1992","1996"], correct: 2, fact: "ג'ודו נשים נוסף באולימפיאדת ברצלונה 1992 — 28 שנה אחרי שג'ודו גברים הופיע לראשונה בטוקיו 1964.", img: "🥋👩", },
  { q: "מה היא 'מורוטה-סאוי-נאגה'?", opts: ["זריקת כתף יד אחת","זריקת כתף שתי ידיים","גלגל ירך","זריקת הקרבה"], correct: 1, fact: "מורוטה-סאוי-נאגה (両手背負い投げ) — שתי ידיים אוחזות בשרוול ובדש, מה שנותן שליטה רבה יותר.", img: "💪💪", },
  { q: "מה היא 'דה-אשי-בארי'?", opts: ["גריפה פנימית גדולה","טאטוא כף רגל מתקדמת","זריקת ירך","זריקת ברך נפולה"], correct: 1, fact: "דה-אשי-בארי (出足払い) — טאטוא כף רגל מתקדמת — מתזמן את הצעד הקדמי של היריב ומטאטא את רגלו ברגע העברת המשקל.", img: "", svgKey: "deashi" },
  { q: "מה היא 'טאני-אוטושי'?", opts: ["גלגל כתף","נפילת עמק — זריקת נגד","נפילה צפה","פירוק ירך"], correct: 1, fact: "טאני-אוטושי (谷落とし) — נפילת עמק — זריקת נגד המבוצעת על ידי כניסה מאחורי התוקף ונפילה לקרקע איתו.", img: "", svgKey: "tani" },
  { q: "מה החליף את 'יוקו' ברפורמת IJF 2010?", opts: ["הפך לאיפון מלא","הוסר — רק וואזה-ארי ואיפון נותרו","הפך לעונש","הפך לשני שידו"], correct: 1, fact: "ה-IJF הסיר את היוקו ב-2010, ופישט ל-וואזה-ארי ואיפון בלבד — מה שאילץ ניסיון זריקות מכריעות יותר.", img: "❌", },
  { q: "מה השופט קורא כשמתחיל ריתוק?", opts: ["האג'ימה","אוסאיקומי","סורמאדה","קוקה"], correct: 1, fact: "אוסאיקומי! (押え込み!) נקרא כשנקבע הריתוק — השעון מתחיל לספור לעבר איפון או וואזה-ארי.", img: "⏱️", },
  { q: "מה היא 'טוקואי-וואזה'?", opts: ["טכניקת מתחיל","הזריקה האהובה / מומחיות","סוג קאטה","זריקת עונש"], correct: 1, fact: "טוקואי-וואזה (得意技) היא 'הטכניקה האהובה' של ג'ודוקא — הזריקה העיקרית שנבנתה דרך אלפי חזרות.", img: "⭐🎯", },
  { q: "מה היא 'אוצ'י-מאטה'?", opts: ["זריקת ירך פנימית","גריפה חיצונית גדולה","טאטוא ירך","נפילת כתף"], correct: 0, fact: "אוצ'י-מאטה (内股) — זריקת ירך פנימית — מטאטאת בין רגלי האוקה מבפנים. אחת הזריקות הנפוצות ביותר בתחרויות.", img: "", svgKey: "uchimata" },
  { q: "מה היא 'איפון-סאוי-נאגה'?", opts: ["זריקת כתף שתי ידיים","זריקת כתף יד אחת","זריקת ירך","זריקת הקרבה"], correct: 1, fact: "איפון-סאוי-נאגה (一本背負い投げ) — יד אחת על השרוול, הטורי מסתובב מתחת — מהירה ובלתי צפויה.", img: "", svgKey: "seoi" },
  { q: "מה כלל זמן האחיזה בתחרות IJF?", opts: ["ללא הגבלת זמן","3 שניות ללא תקיפה = עונש שידו","5 שניות ואז ביטול","10 שניות בלבד"], correct: 1, fact: "אחיזה 3+ שניות ללא תקיפה מזכה בשידו — מה שמאלץ כוונה התקפית מתמדת.", img: "✋⏱️", },
  { q: "מה היא 'קו-סוטו-גארי'?", opts: ["גריפה חיצונית קטנה","גריפה פנימית קטנה","ירך צפה","זריקת פינה"], correct: 0, fact: "קו-סוטו-גארי (小外刈り) — גריפה חיצונית קטנה — מכוונת לקרסול/שוק החיצוני, משמשת לעיתים כהמשכה.", img: "🦶", },
  { q: "מה היא 'האנה-גושי'?", opts: ["זריקת ירך קפיצית","זריקת ירך-טאטוא","גלגל ברך","גלגל כתף"], correct: 0, fact: "האנה-גושי (跳腰) — זריקת ירך קפיצית — משתמשת בפעולת קפיצה של הברך להטיית האוקה, שונה מהאראי-גושי החלקה.", img: "🦘", },
  { q: "מה היא 'נאגה-נו-קאטה'?", opts: ["קאטה עבודת קרקע","15 זריקות ברצף פורמלי","תרגיל ילדים","בחינת חגורה"], correct: 1, fact: "נאגה-נו-קאטה (投の形) מורכב מ-15 זריקות ב-5 קבוצות, המבוצעות ברצף פורמלי עם שותף.", img: "📋", },
  { q: "למה מתייחסת 'קוקה' בחוקי IJF המודרניים?", opts: ["ניקוד קטן בשימוש","הוסרה — לא בתוקף","סוג עונש","זריקה כמעט-איפון"], correct: 1, fact: "קוקה הייתה הניקוד הקטן ביותר. הוסרה 2010, חזרה בקצרה, ואז הוסרה לצמיתות 2017. היום רק וואזה-ארי ואיפון.", img: "❌", },
  { q: "מה פירוש 'סוטמי-וואזה'?", opts: ["טכניקות נגד","טכניקות זריקת הקרבה","טכניקות חנק","טאטואי רגל"], correct: 1, fact: "סוטמי-וואזה (捨身技) — זריקות הקרבה שבהן הטורי נופל בכוונה לקרקע כדי לזרוק את האוקה.", img: "🤸‍♂️⬇️", },
  { q: "מה היא 'יוקו-שיחו-גאטאמה'?", opts: ["לוק צלב","ריתוק ארבע-כיוונים צדי","ריתוק ארבע-כיוונים עליון","לוק ברך-על-בטן"], correct: 1, fact: "יוקו-שיחו-גאטאמה (横四方固め) — ריתוק ארבע-כיוונים צדי — שולט בו-זמנית בראש ובירכי האוקה.", img: "", svgKey: "pin" },
  { q: "בואיזו עיר נמצא הקודוקאן, מרכז הג'ודו העולמי?", opts: ["אוסקה","קיוטו","הירושימה","טוקיו"], correct: 3, fact: "קאנו ייסד את הקודוקאן (講道館) בטוקיו ב-1882 עם 9 תלמידים בלבד. היום הוא מאמן אלפי ג'ודוקאים.", img: "🏛️🗼", },
  { q: "מה היא 'טאי-אוטושי'?", opts: ["הפלת גוף — זריקה בחסימת רגל","נפילת עמק","זריקת ירך","גלגל כתף"], correct: 0, fact: "טאי-אוטושי (体落とし) — הפלת גוף — חוסם את רגל האוקה הקדמית תוך משיכתם קדימה מעל הרגל החסומה.", img: "", svgKey: "tai" },
  { q: "מה פירוש 'שידו' בתחרות?", opts: ["עונש קל","עונש חמור","פסילה","אזהרה ללא עונש"], correct: 0, fact: "שידו (指導) הוא עונש קל על פסיביות או הפרות קלות. שלושה שידו = חאנסוקו-מאקה (פסילה) ליריב.", img: "⚠️", },
  { q: "מה פירוש 'האנסוקו-מאקה'?", opts: ["פסילה — הפסד מיידי","אזהרה קלה","חצי ניקוד","יתרון זריקה גדולה"], correct: 0, fact: "האנסוקו-מאקה (反則負け) — פסילה — ניתנת להפרות חמורות (כמו אחיזת רגליים) או לאחר שלושה שידו.", img: "🚫", },
  { q: "מה היא 'גיאקו-ג'וג'י-ג'ימה'?", opts: ["חנק צלב הפוך","זריקת כתף","מנעול מרפק","טאטוא רגל"], correct: 0, fact: "גיאקו-ג'וג'י-ג'ימה (逆十字絞め) — חנק צלב הפוך — ידיים מוצלבות על צווארון האוקה, לוחץ על עורקי הצוואר.", img: "🤲", },
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
const TIME_PER_Q = 20;

// ── Component ─────────────────────────────────────────────────────────────────
export default function JudoTriviaGame({ title }: { title: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [lang, setLang]             = useState<Lang>("en");
  const [phase, setPhase]           = useState<Phase>("idle");
  const [score, setScore]           = useState(0);
  const [streak, setStreak]         = useState(0);
  const [qIndex, setQIndex]         = useState(0);
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_Q);
  const [chosen, setChosen]         = useState<number | null>(null);
  const [highScore, setHighScore]   = useState(0);
  const [correct, setCorrect]       = useState(0);

  const phaseRef     = useRef<Phase>("idle");
  const scoreRef     = useRef(0);
  const streakRef    = useRef(0);
  const correctRef   = useRef(0);
  const diffRef      = useRef<Difficulty>("Beginner");
  const langRef      = useRef<Lang>("en");
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const clearTimers = useCallback(() => {
    if (timerRef.current)   clearTimeout(timerRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const startGame = useCallback(() => {
    clearTimers();
    const d = diffRef.current;
    const l = langRef.current;
    const pool = l === "he"
      ? (d === "Beginner" ? HE_BEGINNER : HE_ADVANCED)
      : (d === "Beginner" ? EN_BEGINNER : EN_ADVANCED);
    const qs = shuffle(pool).slice(0, QUESTIONS_PER_GAME);
    phaseRef.current  = "playing";
    scoreRef.current  = 0;
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

  const handleLangChange = useCallback((l: Lang) => {
    setLang(l);
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
      setChosen(-1);
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
  const isHe        = lang === "he";
  const currentQ    = questions[qIndex] ?? null;
  const timerPct    = timeLeft / TIME_PER_Q;
  const timerColor  = timeLeft <= 5 ? "#ef4444" : timeLeft <= 8 ? "#f59e0b" : "var(--accent-primary)";
  const streakMul   = streakRef.current >= 5 ? "×3" : streakRef.current >= 3 ? "×2" : null;

  // Render the question image (SVG diagram or large emoji)
  const renderImg = (q: Question) => {
    if (q.svgKey && SVG[q.svgKey]) {
      return (
        <div
          style={{ width: 110, height: 90, flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: SVG[q.svgKey] }}
        />
      );
    }
    if (q.img) {
      return (
        <div style={{ fontSize: "2.2rem", lineHeight: 1, textAlign: "center", minWidth: 60 }}>
          {q.img}
        </div>
      );
    }
    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner} dir={isHe ? "rtl" : "ltr"}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Lang + Difficulty selectors */}
      <div className={styles.difficultySelector}>
        <button className={`${styles.diffBtn} ${lang === "en" ? styles.activeDiff : ""}`} onClick={() => handleLangChange("en")}>🇺🇸 EN</button>
        <button className={`${styles.diffBtn} ${lang === "he" ? styles.activeDiff : ""}`} onClick={() => handleLangChange("he")}>🇮🇱 עב</button>
        <span style={{ margin: "0 0.25rem", color: "var(--text-muted)" }}>|</span>
        {(["Beginner", "Advanced"] as Difficulty[]).map(d => (
          <button key={d} className={`${styles.diffBtn} ${difficulty === d ? styles.activeDiff : ""}`} onClick={() => handleDiffChange(d)}>
            {d === "Beginner" ? (isHe ? "🥋 מתחיל" : "🥋 Beginner") : (isHe ? "🏆 מתקדם" : "🏆 Advanced")}
          </button>
        ))}
      </div>

      {/* ── IDLE ──────────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🥋</div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1.25rem", maxWidth: 360, margin: "0 auto 1.25rem" }}>
            {isHe
              ? (difficulty === "Beginner"
                ? `בחן את הג'ודו הבסיסי — פקודות, זריקות, אחיזות ואטיקט המזרן. ${QUESTIONS_PER_GAME} שאלות, ${TIME_PER_Q} שניות לכל אחת.`
                : `ג'ודו מתקדם — שמות טכניקות, חוקי תחרות, קאטה והיסטוריה. רצף שאלות נכון = כפולות ניקוד!`)
              : (difficulty === "Beginner"
                ? `Test your judo basics — commands, throws, holds, and mat etiquette. ${QUESTIONS_PER_GAME} questions, ${TIME_PER_Q}s each.`
                : `Advanced judo — technique names, competition rules, kata, and history. Streaks multiply your points!`)}
          </p>
          {highScore > 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              {isHe ? "שיא: " : "Best: "}<strong style={{ color: "var(--accent-primary)" }}>{highScore} {isHe ? "נק'" : "pts"}</strong>
            </div>
          )}
          <button className={styles.resetBtn} onClick={startGame}>{isHe ? "!האג'ימה 🥋" : "Hajime! 🥋"}</button>
        </div>
      )}

      {/* ── PLAYING ───────────────────────────────────────────────────────────── */}
      {phase === "playing" && currentQ && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", animation: "jt-fade-in 0.3s ease-out" }}>

          {/* HUD */}
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", justifyContent: "center", direction: "ltr" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: timerColor, fontFamily: "monospace", lineHeight: 1, animation: timeLeft <= 5 ? "jt-timer-pulse 0.5s ease-in-out infinite" : undefined }}>
                {String(timeLeft).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{isHe ? "שנ'" : "sec"}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{isHe ? "נק'" : "pts"}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{qIndex + 1}/{QUESTIONS_PER_GAME}</div>
              <div style={{ fontSize: "0.58rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{isHe ? "שאלה" : "question"}</div>
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
                🔥 {streak} {isHe ? "רצף" : "streak"}{streakMul ? ` ${streakMul}` : ""}
              </div>
            )}
          </div>

          {/* Timer bar */}
          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${timerPct * 100}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }} />
          </div>

          {/* Question card with illustration */}
          <div key={qIndex} style={{
            animation: "jt-fade-in 0.3s ease-out",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "0.9rem 1.1rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
          }}>
            {renderImg(currentQ)}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>
                🥋 {isHe ? "שאלת ג'ודו" : "Judo Question"}
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>
                {currentQ.q}
              </div>
            </div>
          </div>

          {/* Answer options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
            {currentQ.opts.map((opt, i) => {
              const isCorrect = i === currentQ.correct;
              const isChosen  = i === chosen;
              let bg     = "rgba(255,255,255,0.04)";
              let border = "var(--border-color)";
              let anim: string | undefined;
              if (chosen !== null) {
                if (isCorrect) { bg = "rgba(34,197,94,0.15)"; border = "#22c55e"; anim = "jt-correct 0.5s ease-out"; }
                else if (isChosen) { bg = "rgba(239,68,68,0.15)"; border = "#ef4444"; anim = "jt-wrong 0.4s ease-out"; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={chosen !== null}
                  style={{ padding: "0.7rem 1rem", borderRadius: "var(--radius-md)", background: bg, border: `2px solid ${border}`, color: "var(--text-primary)", fontWeight: 500, fontSize: "0.88rem", textAlign: isHe ? "right" : "left", cursor: chosen !== null ? "default" : "pointer", transition: "background 0.15s, border-color 0.15s", animation: anim, display: "flex", alignItems: "center", gap: "0.5rem", flexDirection: isHe ? "row-reverse" : "row" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isChosen || (chosen !== null && isCorrect) ? "inherit" : "var(--text-secondary)", minWidth: 18, textAlign: "center" }}>
                    {chosen !== null ? (isCorrect ? "✓" : isChosen ? "✗" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Fact / timeout feedback */}
          {chosen !== null && (
            <div style={{
              animation: "jt-fade-in 0.3s ease-out",
              background: chosen !== -1 && chosen === currentQ.correct ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${chosen !== -1 && chosen === currentQ.correct ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: "var(--radius-md)",
              padding: "0.65rem 1rem",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              textAlign: isHe ? "right" : "center",
            }}>
              {chosen === -1
                ? (isHe ? `⏱️ הזמן נגמר! תשובה נכונה: ${currentQ.opts[currentQ.correct]}` : `⏱️ Time's up! Correct: ${currentQ.opts[currentQ.correct]}`)
                : chosen === currentQ.correct
                ? <>
                    <span style={{ unicodeBidi: "isolate", direction: "ltr" }}>
                      {streakRef.current >= 3
                        ? `✅ 🔥 ${isHe ? `רצף ${streakRef.current}!` : `${streakRef.current}-streak!`} +${streakRef.current >= 5 ? 30 : 20} ${isHe ? "נק'" : "pts"}!`
                        : `✅ +10 ${isHe ? "נק'" : "pts"}!`}
                    </span>
                    {" "}{currentQ.fact}
                  </>
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
            {isHe
              ? (correct >= QUESTIONS_PER_GAME * 0.8 ? "חומר לסנסיי!" : correct >= QUESTIONS_PER_GAME * 0.5 ? "ידע טוב של הדוג'ו!" : "!המשך לאמן — אוס")
              : (correct >= QUESTIONS_PER_GAME * 0.8 ? "Sensei material!" : correct >= QUESTIONS_PER_GAME * 0.5 ? "Good dojo knowledge!" : "Keep training — Osu!")}
          </div>
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1, marginBottom: "0.2rem" }}>{score}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.2rem" }}>{isHe ? "נקודות" : "points"}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.5rem", direction: "ltr" }}>
            {correct}/{QUESTIONS_PER_GAME} {isHe ? "נכון" : "correct"}
            {highScore > 0 && score < highScore && (
              <span> · {isHe ? "שיא: " : "Best: "}<strong style={{ color: "var(--accent-primary)" }}>{highScore}</strong></span>
            )}
          </div>
          <button className={styles.resetBtn} onClick={startGame}>{isHe ? "שחק שוב" : "Play Again"}</button>
        </div>
      )}
    </div>
  );
}
