"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Valid word sets ──────────────────────────────────────────────────────────
const VALID_3 = new Set([
  "ape","arc","ark","arm","art","ask","axe",
  "bad","bag","ban","bar","bat","bay","bed","beg","bet","bid","big","bit","bog","bow","bud","bug","bun","bus","but","buy",
  "cab","can","cap","car","cat","cob","cod","cop","cot","cow","cub","cup","cut",
  "dab","dam","den","dig","dim","dip","dog","dot","dry",
  "ear","egg","elm","eve","eye",
  "fan","far","fat","fin","fit","fly","fog","fox","fun","fur",
  "gap","gas","god","got","gun","gut","guy",
  "had","ham","hat","hay","hen","her","him","hip","hit","hop","hot","hub","hug","hum",
  "ice","ill","ink","ion","ivy",
  "jab","jam","jar","jet","job","jot","joy","jug","jut",
  "keg","kin","kit",
  "lad","lag","lap","law","led","leg","let","lid","lip","lit","log","lot","low",
  "mad","man","map","mat","may","men","met","mob","mop","mud","mug",
  "nab","nag","nap","nip","nit","nob","nod","nor","not","nun","nut",
  "oak","oar","odd","oil","opt","orb","ore",
  "pad","pal","pan","par","pat","paw","pay","peg","pen","pet","pig","pin","pit","pod","pop","pot","pub","pug","pun","pup","put",
  "rag","ram","ran","rap","rat","raw","ray","red","rib","rid","rim","rip","rob","rod","rot","row","rub","rug","rum","run","rut",
  "sad","sap","sat","saw","say","set","sin","sip","sit","sob","sod","son","sop","sow","sub","sum","sun","sup",
  "tab","tan","tap","tar","tax","tea","ten","tin","tip","toe","ton","top","tot","tow","toy","tug","tub","two",
  "van","vat","vet","vow",
  "war","wax","way","web","wet","win","wit","woe",
  "yam","yap","yew","you",
  "zap","zip","zoo",
]);

const VALID_4 = new Set([
  "able","acid","aged","also","arch","area","army","away",
  "back","bail","bake","ball","band","bank","bare","barn","base","bath","bane","bear","beat","been","beer","bell","best","bill","bird","bite","bike","blow","blue","boat","body","bomb","bond","bone","book","born","boss","both","bowl","burn","busy",
  "cage","cake","call","came","card","care","cart","case","cast","cave","cell","chat","chip","city","clam","claw","clay","clip","coal","coat","code","coin","cold","come","cook","cool","cope","copy","core","cord","cost","crop","cure",
  "dare","dark","dead","deal","dear","deep","deer","deny","desk","diet","dish","disk","done","door","dove","down","draw","drop","drum","dual","dull","dump","dusk","dust","dote",
  "earn","east","edge","even","ever","evil","exam",
  "face","fact","fail","fair","fall","fame","farm","fast","fate","feel","feet","fell","felt","fern","fill","film","find","fine","fire","firm","fish","fist","flag","flat","flaw","flew","flip","flow","foam","fold","fond","fool","fore","fork","form","fort","foul","free","frog","fuel","full","fund","fuse",
  "gain","game","gang","gate","gave","gear","gene","gift","girl","give","glad","glow","glue","goal","gold","golf","gone","good","grab","gram","gray","grew","grid","grim","grip","grit","grow","gulf","gust",
  "hall","halt","hand","hang","hard","harm","harp","hate","have","haze","heal","heap","heat","help","herb","hero","hill","hint","hire","hold","hole","holy","home","hope","horn","host","hour","huge","hull","hung","hunt","hurt","hymn",
  "icon","idea","idle","inch","into","iron","item",
  "jack","jail","jazz","join","joke","jump","just",
  "keen","keep","kill","kind","king","knob","know",
  "lack","lady","laid","lake","lamp","land","lane","lark","lash","last","late","lawn","lead","leaf","leak","lean","leap","left","lend","lift","like","lime","line","link","list","live","load","loan","lock","loft","lone","long","look","loop","lore","lose","loss","lost","loud","love","luck","lump","lung","lure","lust","lute",
  "made","mail","main","make","male","mane","many","mark","mars","mast","meal","mean","meet","melt","menu","mere","mild","mile","milk","mill","mind","mint","miss","mist","mode","mood","moon","moor","more","morn","most","move","much","mule","must","myth",
  "nail","name","navy","near","neck","need","nest","news","next","nice","nine","none","noon","nook","norm","numb","nose","note",
  "once","only","open","oral","over",
  "pace","page","pain","pair","pale","palm","park","part","pass","past","path","pave","peak","peel","peer","pile","pine","pink","pipe","plan","play","plot","plow","plug","plum","plus","poem","pole","poll","pool","poor","pore","port","pose","pour","pray","prey","prop","pull","pure","push",
  "race","rack","rage","raid","rail","rain","rake","ramp","rang","rank","rant","rash","rate","read","real","rear","reel","rein","rely","rent","rest","rich","ride","ring","riot","ripe","risk","road","roam","roar","robe","rock","rode","role","roll","roof","room","rope","rose","rout","rule","ruse","rush","rust",
  "safe","sage","sake","sale","salt","same","sane","sang","sank","scar","seal","seam","seem","seen","self","sell","send","sent","shed","ship","shoe","shop","shot","show","shut","sick","side","silk","sing","sink","size","skin","slim","slip","slot","slow","slug","snap","snow","soak","soar","sock","soft","soil","sold","sole","some","song","sort","soul","span","spar","spin","spit","spot","star","stay","stem","step","stew","stop","stub","stun","suck","suit","sung","sunk","sure","swap","swim",
  "tail","take","tale","talk","tame","tank","tape","task","teal","team","tear","tell","tall","text","thin","tick","tide","till","time","tire","told","toll","tomb","tone","took","tool","tore","torn","toss","tour","town","trap","tray","tree","trek","trim","trip","true","tube","tune","turn","twin","type",
  "vale","vane","veil","very","vine","vote",
  "wade","wage","wait","wake","walk","wall","wand","want","ward","warm","wash","wave","weed","week","well","went","west","wide","wind","wine","wing","wire","wish","woke","word","worm","worn","wrap","writ",
  "yell","your","zero","zone","zoom",
]);

// ── Hebrew valid words (3-letter, no nikud) ──────────────────────────────────
const HE_VALID_3 = new Set([
  // ש-מ group
  "שמש","שמח","שמן","שמע","שמר","שמד","שמם",
  // ש-ל group
  "שלג","שלב","שלח","שלט","שלם","שלף",
  // כ-ל / ח-ל group
  "כלב","כלי","כלא","כלה","חלב","חלה","חלש","חלם","חלף","חלד",
  // פ-ר group
  "פרח","פרה","פרא","פרד","פרס","פרק",
  // נ-ח group
  "נחש","נחל","נחר","נחת",
  // ג-ש / א-ש group
  "גשם","גשר","אשר","אשם",
  // ע-נ group
  "ענב","ענן","ענף","ענם",
  // ע-י group
  "עין","עיר","עיף","עיט",
  // ד-ב group
  "דבש","דבק","דבר",
  // א-ר group
  "ארץ","ארז","ארס","ארח","ארך",
  // ז-ה / ז-מ group
  "זהב","זהר","זמר","זמן","זמם",
  // ג-מ group
  "גמל","גמד","גמר",
  // ע-פ / ע-ב / ע-ז group
  "עפר","עבר","עזר","עבד","עבל",
  // א-ב group
  "אבר","אבד","אבל","אבן",
  // common nouns / verbs
  "ילד","ספר","בית","ראש","יום","לחם","שיר","ארח",
  "רגל","אור","דגל","עיר","כוס","שלג","ספג","ספד",
  "נחש","גשם","גשר","כלי","כלא","כלה",
  "מים","סוס","שנה","חדש","בוא",
  // ו-pattern words
  "טוב","טוס","קוף","קול","קום","קוץ",
  "רוח","רום","שור","תוך","תום","תור",
  "חוט","חוב","חוג","חור",
  // more common words
  "אמא","אבא","עמל","עמד","ירד","עלה",
  "ישב","כתב","שתה","נפל","נפח","נפש",
  "חיה","חיל","כבד","כבה","כבש",
  "לבן","לבד","לבש","דגה","דגם",
  "אגם","יון","יום","יוד",
  "חלק","חלף","שמם","זחל","זהם",
]);

// ── Puzzle packs ─────────────────────────────────────────────────────────────
interface Puzzle { start: string; end: string; optimal: number; hint: string[] }

const KIDS_PUZZLES: Puzzle[] = [
  // 2-step
  { start: "hop", end: "hit", optimal: 2, hint: ["hop","hip","hit"] },
  { start: "mud", end: "bad", optimal: 2, hint: ["mud","mad","bad"] },
  { start: "cup", end: "but", optimal: 2, hint: ["cup","cut","but"] },
  { start: "sat", end: "wet", optimal: 2, hint: ["sat","set","wet"] },
  { start: "sit", end: "sun", optimal: 2, hint: ["sit","sin","sun"] },
  { start: "fan", end: "bun", optimal: 2, hint: ["fan","fun","bun"] },
  { start: "man", end: "hen", optimal: 2, hint: ["man","men","hen"] },
  { start: "sun", end: "gut", optimal: 2, hint: ["sun","gun","gut"] },
  { start: "big", end: "bad", optimal: 2, hint: ["big","bid","bad"] },
  // 3-step
  { start: "cat", end: "bag", optimal: 3, hint: ["cat","bat","bad","bag"] },
  { start: "hot", end: "cap", optimal: 3, hint: ["hot","hop","cop","cap"] },
  { start: "dog", end: "bat", optimal: 3, hint: ["dog","bog","bag","bat"] },
  { start: "got", end: "cap", optimal: 3, hint: ["got","cot","cop","cap"] },
  { start: "wet", end: "leg", optimal: 3, hint: ["wet","let","led","leg"] },
  { start: "ran", end: "pot", optimal: 3, hint: ["ran","rat","rot","pot"] },
  { start: "log", end: "cop", optimal: 3, hint: ["log","lot","cot","cop"] },
  { start: "top", end: "lot", optimal: 3, hint: ["top","hop","hot","lot"] },
  // 4-step
  { start: "man", end: "tan", optimal: 4, hint: ["man","men","hen","ten","tan"] },
  { start: "hot", end: "cat", optimal: 4, hint: ["hot","hop","cop","cap","cat"] },
  { start: "rot", end: "fun", optimal: 4, hint: ["rot","rat","ran","run","fun"] },
];

const ADULT_PUZZLES: Puzzle[] = [
  // 2-step
  { start: "dare", end: "gate", optimal: 2, hint: ["dare","date","gate"] },
  { start: "lime", end: "tide", optimal: 2, hint: ["lime","time","tide"] },
  { start: "lake", end: "bike", optimal: 2, hint: ["lake","bake","bike"] },
  { start: "band", end: "bone", optimal: 2, hint: ["band","bond","bone"] },
  { start: "love", end: "lime", optimal: 2, hint: ["love","live","lime"] },
  { start: "bone", end: "tune", optimal: 2, hint: ["bone","tone","tune"] },
  { start: "pale", end: "pine", optimal: 2, hint: ["pale","pile","pine"] },
  // 3-step
  { start: "cake", end: "bite", optimal: 3, hint: ["cake","bake","bike","bite"] },
  { start: "love", end: "note", optimal: 3, hint: ["love","dove","dote","note"] },
  { start: "cold", end: "ward", optimal: 3, hint: ["cold","cord","word","ward"] },
  { start: "ring", end: "link", optimal: 3, hint: ["ring","sing","sink","link"] },
  { start: "road", end: "dead", optimal: 3, hint: ["road","load","lead","dead"] },
  { start: "lake", end: "wine", optimal: 3, hint: ["lake","lane","line","wine"] },
  { start: "game", end: "lane", optimal: 3, hint: ["game","tame","tale","lane"] },
  { start: "most", end: "last", optimal: 3, hint: ["most","lost","lust","last"] },
  { start: "sail", end: "wall", optimal: 3, hint: ["sail","bail","ball","wall"] },
  // 4-step
  { start: "cold", end: "warm", optimal: 4, hint: ["cold","cord","word","ward","warm"] },
  { start: "cake", end: "kite", optimal: 4, hint: ["cake","bake","bike","bite","kite"] },
  { start: "dark", end: "lane", optimal: 4, hint: ["dark","lark","lack","lake","lane"] },
  { start: "fire", end: "king", optimal: 4, hint: ["fire","fine","find","kind","king"] },
  // 5-step
  { start: "love", end: "rose", optimal: 5, hint: ["love","dove","dote","note","nose","rose"] },
  { start: "head", end: "tail", optimal: 5, hint: ["head","heal","teal","tell","tall","tail"] },
];

// ── Hebrew puzzle packs ───────────────────────────────────────────────────────
// All chains verified: each step changes exactly 1 letter
const HE_KIDS_PUZZLES: Puzzle[] = [
  // 2-step (כלב→חלב: כ→ח; חלב→חלה: ב→ה)
  { start: "כלב", end: "חלה", optimal: 2, hint: ["כלב","חלב","חלה"] },
  // 2-step (פרח→פרה: ח→ה; פרה→פרא: ה→א)
  { start: "פרח", end: "פרא", optimal: 2, hint: ["פרח","פרה","פרא"] },
  // 2-step (שמש→שמח: ש→ח; שמח→שמן: ח→נ)
  { start: "שמש", end: "שמן", optimal: 2, hint: ["שמש","שמח","שמן"] },
  // 2-step (ענב→ענן: ב→נ; ענן→ענף: נ→פ)
  { start: "ענב", end: "ענף", optimal: 2, hint: ["ענב","ענן","ענף"] },
  // 2-step (עין→עיר: נ→ר; עיר→עיף: ר→פ)
  { start: "עין", end: "עיף", optimal: 2, hint: ["עין","עיר","עיף"] },
  // 2-step (שלג→שלב: ג→ב; שלב→שלח: ב→ח)
  { start: "שלג", end: "שלח", optimal: 2, hint: ["שלג","שלב","שלח"] },
  // 3-step (pos 2: ש→ח→נ→ע)
  { start: "שמש", end: "שמע", optimal: 3, hint: ["שמש","שמח","שמן","שמע"] },
  // 3-step (כ→ח then ב→ה then ה→ש)
  { start: "כלב", end: "חלש", optimal: 3, hint: ["כלב","חלב","חלה","חלש"] },
  // 3-step (ח→ה→א→ס)
  { start: "פרח", end: "פרס", optimal: 3, hint: ["פרח","פרה","פרא","פרס"] },
];

const HE_ADULT_PUZZLES: Puzzle[] = [
  // 2-step (דבש→דבק: ש→ק; דבק→דבר: ק→ר)
  { start: "דבש", end: "דבר", optimal: 2, hint: ["דבש","דבק","דבר"] },
  // 2-step (גמל→גמד: ל→ד; גמד→גמר: ד→ר)
  { start: "גמל", end: "גמר", optimal: 2, hint: ["גמל","גמד","גמר"] },
  // 2-step (עפר→עבר: פ→ב; עבר→עזר: ב→ז)
  { start: "עפר", end: "עזר", optimal: 2, hint: ["עפר","עבר","עזר"] },
  // 2-step (ארץ→ארז: צ→ז; ארז→ארס: ז→ס)
  { start: "ארץ", end: "ארס", optimal: 2, hint: ["ארץ","ארז","ארס"] },
  // 2-step (דבר→אבר: ד→א; אבר→אבד: ר→ד)
  { start: "דבר", end: "אבד", optimal: 2, hint: ["דבר","אבר","אבד"] },
  // 3-step (pos 2: ב→ג→ח→ט)
  { start: "שלב", end: "שלט", optimal: 3, hint: ["שלב","שלג","שלח","שלט"] },
  // 3-step (pos 2: ח→נ→ע→ר)
  { start: "שמח", end: "שמר", optimal: 3, hint: ["שמח","שמן","שמע","שמר"] },
  // 3-step (זהב→זהר: ב→ר; זהר→זמר: ה→מ; זמר→זמן: ר→נ)
  { start: "זהב", end: "זמן", optimal: 3, hint: ["זהב","זהר","זמר","זמן"] },
  // 3-step (נחש→נחל: ש→ל; נחל→נחר: ל→ר; נחר→נחת: ר→ת)
  { start: "נחש", end: "נחת", optimal: 3, hint: ["נחש","נחל","נחר","נחת"] },
  // 4-step (כ→ח; ב→ה; ה→ש; ש→מ)
  { start: "כלב", end: "חלם", optimal: 4, hint: ["כלב","חלב","חלה","חלש","חלם"] },
  // 4-step (pos 2: ש→ח→נ→ע→ר)
  { start: "שמש", end: "שמר", optimal: 4, hint: ["שמש","שמח","שמן","שמע","שמר"] },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function diffByOne(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs++;
  return diffs === 1;
}

function isValidWord(word: string, mode: "Kids" | "Adult", lang: "en" | "he"): boolean {
  if (lang === "he") return HE_VALID_3.has(word);
  return mode === "Kids" ? VALID_3.has(word) : VALID_4.has(word);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "won" | "lost";

// ── Component ────────────────────────────────────────────────────────────────
export default function WordLadderGame({ title }: { title: string }) {
  const [mode, setMode] = useState<"Kids" | "Adult">("Kids");
  const [lang, setLang] = useState<"en" | "he">("en");
  const [phase, setPhase] = useState<Phase>("idle");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [chain, setChain] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showOptimal, setShowOptimal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const puzzleList =
    lang === "he"
      ? mode === "Kids" ? HE_KIDS_PUZZLES : HE_ADULT_PUZZLES
      : mode === "Kids" ? KIDS_PUZZLES     : ADULT_PUZZLES;

  const startGame = useCallback(() => {
    const p = pickRandom(puzzleList);
    setPuzzle(p);
    setChain([p.start]);
    setInput("");
    setError(null);
    setSteps(0);
    setShowHint(false);
    setShowOptimal(false);
    setPhase("playing");
  }, [puzzleList]);

  const resetGame = useCallback(() => {
    setPhase("idle");
    setPuzzle(null);
    setChain([]);
    setInput("");
    setError(null);
    setSteps(0);
    setShowHint(false);
    setShowOptimal(false);
  }, []);

  useEffect(() => {
    if (phase === "playing") setTimeout(() => inputRef.current?.focus(), 50);
  }, [phase, chain]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 2000);
    return () => clearTimeout(t);
  }, [error]);

  const handleSubmit = () => {
    if (!puzzle) return;
    const word = lang === "he" ? input.trim() : input.toLowerCase().trim();
    const last = chain[chain.length - 1];
    const wordLen = puzzle.start.length;

    if (word.length !== wordLen) {
      setError(lang === "he" ? `חייב להיות ${wordLen} אותיות` : `Must be ${wordLen} letters`);
      return;
    }
    if (!diffByOne(last, word)) {
      setError(lang === "he" ? "יש לשנות בדיוק אות אחת" : "Must change exactly one letter");
      return;
    }
    if (!isValidWord(word, mode, lang)) {
      setError(lang === "he" ? `"${word}" אינה מילה תקנית` : `"${word.toUpperCase()}" isn't a valid word`);
      return;
    }
    if (chain.includes(word)) {
      setError(lang === "he" ? "כבר השתמשת במילה זו" : "Already used that word");
      return;
    }

    const newChain = [...chain, word];
    setChain(newChain);
    setSteps(s => s + 1);
    setInput("");
    setError(null);

    if (word === puzzle.end) setPhase("won");
  };

  const handleGiveUp = () => {
    setShowHint(true);
    setPhase("lost");
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const isHe = lang === "he";

  const chipStyle = (isTarget: boolean, isCurrent: boolean): React.CSSProperties => ({
    display: "inline-block",
    padding: "0.4rem 1.25rem",
    borderRadius: "var(--radius-sm)",
    fontFamily: isHe ? "inherit" : "monospace",
    letterSpacing: isHe ? "0" : "0.2em",
    fontSize: "1.2rem",
    fontWeight: 700,
    textTransform: isHe ? "none" : "uppercase",
    direction: isHe ? "rtl" : "ltr",
    background: isTarget
      ? "rgba(236,72,153,0.18)"
      : isCurrent
      ? "rgba(109,40,217,0.2)"
      : "var(--bg-secondary)",
    border: `2px solid ${isTarget ? "var(--accent-secondary, #ec4899)" : isCurrent ? "var(--accent-primary)" : "var(--border-highlight)"}`,
    color: "var(--text-primary)",
  });

  const hintChipStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "0.35rem 1rem",
    borderRadius: "var(--radius-sm)",
    fontFamily: isHe ? "inherit" : "monospace",
    letterSpacing: isHe ? "0" : "0.15em",
    fontSize: "1rem",
    fontWeight: 600,
    textTransform: isHe ? "none" : "uppercase",
    direction: isHe ? "rtl" : "ltr",
    background: "rgba(109,40,217,0.12)",
    border: "1px solid var(--accent-primary)",
    color: "var(--text-secondary)",
  };

  const starRating = puzzle
    ? steps <= puzzle.optimal
      ? "⭐⭐⭐ " + (isHe ? "מושלם!" : "Perfect!")
      : steps <= puzzle.optimal + 2
      ? "⭐⭐ " + (isHe ? "מצוין!" : "Great!")
      : "⭐ " + (isHe ? "פתרת!" : "Solved!")
    : "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner}>
      <h3 className={styles.gameTitle}>{title}</h3>

      <div className={styles.difficultySelector}>
        <span className={styles.difficultyLabel}>{isHe ? "רמה:" : "Mode:"}</span>
        {(["Kids", "Adult"] as const).map(m => (
          <button
            key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { setMode(m); resetGame(); }}
          >{isHe ? (m === "Kids" ? "ילדים" : "מבוגרים") : m}</button>
        ))}
        <span style={{ marginInlineStart: "0.5rem", opacity: 0.4 }}>|</span>
        {(["en","he"] as const).map(l => (
          <button
            key={l}
            className={`${styles.diffBtn} ${lang === l ? styles.activeDiff : ""}`}
            onClick={() => { setLang(l); resetGame(); }}
          >{l === "en" ? "🇺🇸 EN" : "🇮🇱 עב"}</button>
        ))}
      </div>

      {/* ── IDLE ── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "2rem 0", direction: isHe ? "rtl" : "ltr" }}>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "0.75rem" }}>
            {isHe ? (
              <>שנה את <strong>מילת הפתיחה</strong> למילת <strong>המטרה</strong>.<br />
              כל שלב — <strong>אות אחת בלבד</strong> — וכל מילה חייבת להיות מילה אמיתית.</>
            ) : (
              <>Transform the <strong>start word</strong> into the <strong>target word</strong>.<br />
              Change <strong>one letter</strong> at a time — each step must be a real word.</>
            )}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            {isHe
              ? `רמה: ${mode === "Kids" ? "ילדים" : "מבוגרים"} — מילים בנות 3 אותיות`
              : `Mode: ${mode} — ${mode === "Kids" ? "3-letter words" : "4-letter words"}`}
          </p>
          <button className={styles.resetBtn} onClick={startGame}>
            {isHe ? "התחל משחק" : "Start Game"}
          </button>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === "playing" && puzzle && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>

          {/* Goal banner */}
          <div style={{
            display: "flex", gap: "1rem", alignItems: "center",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1.5rem",
            flexWrap: "wrap", justifyContent: "center",
            direction: isHe ? "rtl" : "ltr",
          }}>
            <span style={chipStyle(false, false)}>{puzzle.start}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "1.5rem" }}>
              {isHe ? "←" : "→"}
            </span>
            <span style={chipStyle(true, false)}>{puzzle.end}</span>
            <button
              onClick={() => setShowOptimal(v => !v)}
              title={isHe ? "מספר הצעדים האופטימלי" : "Reveal optimal step count"}
              style={{
                background: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-full, 999px)",
                color: showOptimal ? "var(--accent-primary)" : "var(--text-secondary)",
                width: 24, height: 24, cursor: "pointer", fontSize: "0.75rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {showOptimal ? `${puzzle.optimal}` : "?"}
            </button>
          </div>

          {/* Chain */}
          <div style={{
            width: "100%", maxWidth: 500,
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            background: "var(--bg-secondary)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
              {chain.map((word, i) => (
                <React.Fragment key={i}>
                  <span style={chipStyle(false, i === chain.length - 1)}>{word}</span>
                  {i < chain.length - 1 && (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>↓</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => {
                  const val = e.target.value;
                  if (isHe) {
                    setInput(val.replace(/[^\u05D0-\u05EA]/g, ""));
                  } else {
                    setInput(val.toLowerCase().replace(/[^a-z]/g, ""));
                  }
                }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                maxLength={puzzle.start.length}
                placeholder={"_".repeat(puzzle.start.length)}
                dir={isHe ? "rtl" : "ltr"}
                style={{
                  width: 100, textAlign: "center",
                  background: "var(--bg-primary)",
                  border: "2px solid var(--accent-primary)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: isHe ? "inherit" : "monospace",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  letterSpacing: isHe ? "0" : "0.15em",
                  textTransform: isHe ? "none" : "uppercase",
                  padding: "0.4rem 0.5rem",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSubmit}
                style={{
                  background: "var(--accent-primary)", color: "#fff",
                  border: "none", borderRadius: "var(--radius-sm)",
                  padding: "0.4rem 0.9rem", cursor: "pointer", fontWeight: 600,
                }}
              >{isHe ? "הכנס" : "Go"}</button>
            </div>
          </div>

          {error && (
            <div style={{ color: "#ef4444", fontSize: "0.9rem", fontWeight: 600, direction: isHe ? "rtl" : "ltr" }}>{error}</div>
          )}

          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", direction: isHe ? "rtl" : "ltr" }}>
            {isHe ? "צעדים שנעשו:" : "Steps taken:"}{" "}
            <strong style={{ color: "var(--text-primary)" }}>{steps}</strong>
          </div>

          <button
            style={{
              background: "transparent", border: "1px solid var(--border-color)",
              color: "var(--text-secondary)", padding: "0.4rem 1.25rem",
              borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.82rem",
            }}
            onClick={handleGiveUp}
          >{isHe ? "ויתרתי / הראה פתרון" : "Give Up / Show Solution"}</button>
        </div>
      )}

      {/* ── WON ── */}
      {phase === "won" && puzzle && (
        <div style={{ textAlign: "center", padding: "1.5rem 0", direction: isHe ? "rtl" : "ltr" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🎉</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            {starRating}
          </div>
          <div style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
            {isHe
              ? `${puzzle.start} ← ${puzzle.end} ב-${steps} צעד${steps !== 1 ? "ים" : ""}${steps <= puzzle.optimal ? " — אופטימלי!" : ""}`
              : `${puzzle.start.toUpperCase()} → ${puzzle.end.toUpperCase()} in ${steps} step${steps !== 1 ? "s" : ""}${steps <= puzzle.optimal ? " — optimal!" : ""}`}
          </div>
          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {chain.map((w, i) => (
              <React.Fragment key={i}>
                <span style={chipStyle(i === chain.length - 1, false)}>{w}</span>
                {i < chain.length - 1 && <span style={{ color: "var(--text-secondary)" }}>{isHe ? "←" : "→"}</span>}
              </React.Fragment>
            ))}
          </div>
          <button className={styles.resetBtn} onClick={startGame}>
            {isHe ? "שחק שוב" : "Play Again"}
          </button>
        </div>
      )}

      {/* ── LOST ── */}
      {phase === "lost" && puzzle && (
        <div style={{ textAlign: "center", padding: "1.5rem 0", direction: isHe ? "rtl" : "ltr" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
          <div style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {isHe ? "פתרון אפשרי:" : "One solution:"}
          </div>
          {showHint && (
            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              {puzzle.hint.map((w, i) => (
                <React.Fragment key={i}>
                  <span style={hintChipStyle}>{w}</span>
                  {i < puzzle.hint.length - 1 && <span style={{ color: "var(--text-secondary)" }}>{isHe ? "←" : "→"}</span>}
                </React.Fragment>
              ))}
            </div>
          )}
          <button className={styles.resetBtn} onClick={startGame}>
            {isHe ? "נסה שוב" : "Try Another"}
          </button>
        </div>
      )}
    </div>
  );
}
