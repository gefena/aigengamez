"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Word list ─────────────────────────────────────────────────────────────────
const GHOST_WORDS = [
  // A
  "ape","apt","arc","arm","art","ask","ace","add","age","ago","aid","aim","air","ale","all",
  "and","ant","any","are","ark",
  "able","acid","aged","arch","area","army","away",
  "apple","apply","angel","agree","ahead","alert","allow","alone","along",
  // B
  "bad","bag","ban","bar","bat","bay","bed","beg","bet","big","bit","bog","bow","bud","bug","bun","bus","but","buy",
  "back","bail","bake","ball","band","bank","bare","barn","base","bath","bear","beat","beer","bell","best","bill","bird","bite","bike","blow","blue","boat","body","bond","bone","book","born","boss","bowl","burn",
  "badge","baker","blast","blend","block","bloom","board","brave","bread","break","bring","broad","brown","brush","build","built","burst",
  // C
  "cab","can","cap","car","cat","cob","cop","cot","cow","cup","cut",
  "cage","cake","call","came","card","care","cart","case","cave","cell","chip","coal","coat","code","coin","cold","come","cook","cool","cope","cord","core","cost","crop","cure",
  "cabin","cable","cargo","carry","catch","cause","chain","chair","chalk","chance","change","charm","chart","chase","cheap","check","chest","chief","child","claim","clear","click","cliff","climb","clock","close","cloth","cloud","coach","crane","crash","cream","crisp","cross","crowd","crown","crush","curve",
  // D
  "den","dig","dim","dip","dog","dot","dry","dab","dam",
  "dare","dark","dash","data","date","dead","deal","dear","deep","deer","deny","desk","diet","dish","dive","done","door","dove","down","draw","drop","drum","dusk","dust","dote",
  "daily","dance","delay","depot","depth","dirty","doing","doubt","draft","drain","drama","dream","dress","drift","drill","drink","drive","drove","dwarf",
  // E
  "ear","eat","egg","elm","end","eve","eye",
  "each","earn","east","edge","emit","even","ever","evil","exam",
  "eagle","early","earth","eight","elder","elite","empty","enemy","enjoy","enter","equal","error","essay","every",
  // F
  "fan","far","fat","fin","fit","fly","fog","fur","fun",
  "face","fact","fail","fair","fall","fame","farm","fast","fate","feel","feet","fell","felt","fern","fill","film","find","fine","fire","firm","fish","fist","flag","flat","flaw","flip","flow","foam","fold","fond","fool","fore","fork","form","fort","free","frog","fuel","full","fund","fuse",
  "fable","faith","fancy","fault","feast","fence","fetch","fever","fiber","field","fight","final","fixed","flame","flair","flash","fleet","flesh","float","flood","floor","flour","flute","focus","force","forge","forth","forum","found","frame","frank","fresh","front","frost","fruit","funny","furry",
  // G
  "gap","gas","god","got","gun","gut","guy",
  "gain","game","gang","gate","gave","gear","gift","girl","give","glad","glow","glue","goal","gold","golf","gone","good","grab","gram","gray","grew","grid","grim","grip","grit","grow","gulf","gust",
  "giant","ghost","given","glare","glass","glaze","globe","gloom","gloss","glove","gnome","grace","grade","grain","grand","grant","grape","grasp","grass","grave","green","greet","grill","groan","groom","group","grove","growl","guard","guest","guide","guild","guilt","gusto",
  // H
  "had","ham","hat","hay","hen","her","him","hip","hit","hop","hot","hub","hug","hum",
  "hall","halt","hand","hang","hard","harm","harp","hate","have","haze","heal","heap","heat","help","herb","hero","hill","hint","hire","hold","hole","holy","home","hope","horn","host","hour","huge","hull","hung","hunt","hurt","hymn",
  "habit","happy","hardy","harsh","haste","haven","heart","heavy","hence","hinge","honor","horse","hotel","house","human","humid","humor","hurry",
  // I
  "ill","ink","ion","icy",
  "icon","idea","idle","inch","into","iron","item",
  "image","imply","infer","inner","input","inter","intro","irony","issue",
  // J
  "jab","jam","jar","jet","job","jot","joy","jug","jut",
  "jack","jail","jazz","join","joke","jump","just",
  "jaunt","jewel","joint","joker","joust","judge","juice","juicy","jumpy","juror",
  // K
  "keg","kin","kit",
  "keen","keep","kill","kind","king","knob","know",
  "kneel","knife","knock","knoll","knelt","known",
  // L
  "lad","lag","lap","law","led","leg","let","lid","lip","lit","log","lot","low",
  "lack","lake","lamp","land","lane","lark","last","late","lawn","lead","leaf","lean","leap","left","lend","lift","like","lime","line","link","list","live","load","lock","lone","long","look","lore","lose","loud","love","luck","lung","lure",
  "label","lance","large","laser","latch","later","laugh","layer","leave","legal","lemon","level","light","limit","liver","local","lodge","logic","loose","lower","lunar","lusty",
  // M
  "mad","man","map","mat","may","men","met","mob","mop","mud","mug",
  "made","mail","main","make","male","mane","mark","meal","meet","melt","mild","mile","milk","mill","mind","mint","miss","mist","mode","moon","more","move","much","must","myth","moor",
  "magic","manor","march","marsh","mason","match","mayor","media","mercy","merge","merit","metal","might","model","month","moral","mount","mouse","mouth","movie","muddy","music",
  // N
  "nab","nag","nap","nip","nit","nob","nod","nor","not","nun","nut",
  "nail","name","navy","near","neck","need","nest","news","next","nice","nine","node","none","noon","norm","nose","note",
  "niche","night","noble","noise","north","notch","novel","nudge","nurse",
  // O
  "oak","oar","odd","oil","opt","orb","ore",
  "once","only","open","oral","over",
  "offer","often","orbit","order","ought","ounce","outer","oxide",
  // P
  "pad","pal","pan","par","pat","paw","pay","peg","pen","pet","pig","pin","pit","pod","pop","pot","pub","pun","pup","put",
  "pace","page","pain","pale","palm","park","part","path","peak","pile","pine","plan","play","plot","plug","pole","pool","poor","pore","pose","pray","prey","pull","pure","push",
  "paced","padre","paint","panel","panic","party","pasta","patch","pause","peace","pearl","pedal","phase","phone","photo","piano","piece","pilot","pitch","pixel","place","plain","plane","plant","plate","plaza","plead","pluck","plumb","plume","point","polar","porch","pound","power","press","price","pride","prime","print","prior","prize","probe","prone","proof","proud","prove","prune","pulse","punch","purse",
  // R
  "rag","ram","ran","rap","rat","raw","ray","red","rib","rid","rim","rip","rob","rod","rot","row","rub","rug","rum","run","rut",
  "race","rain","rake","rang","rank","rash","rate","read","real","reel","rely","rent","rest","rich","ride","ring","riot","ripe","risk","road","roam","roar","robe","rock","rode","role","roll","roof","room","rope","rose","rule","rush","rust",
  "radar","radio","raise","rally","ranch","range","rapid","ratio","reach","react","ready","realm","rebel","refer","reign","relax","relay","relic","repay","reply","rider","rifle","right","risky","rival","river","robin","rocky","rough","round","route","royal","ruler","rural","rusty",
  // S
  "sad","sap","sat","saw","say","set","sin","sip","sit","sob","son","sow","sub","sum","sun","sup",
  "safe","sage","sail","sake","sale","salt","same","sand","sang","seal","sell","send","shed","ship","shoe","shop","shot","show","sick","side","silk","sing","sink","size","skin","slim","slip","slow","snow","soak","soar","soft","soil","sold","sole","some","song","sort","soul","span","spin","spot","star","stay","stem","step","stew","stop","stun","suck","suit","sung","sunk","sure","swap","swim",
  "scald","scale","scant","scare","scene","scone","scope","scout","screw","scrub","seize","sense","serve","seven","shade","shaft","shake","shall","shame","shape","share","shark","sharp","shelf","shell","shift","shine","shirt","shock","shore","short","shout","shove","sight","since","sixth","sixty","skill","skull","slave","sleek","sleep","slice","slide","slime","slope","smart","smell","smile","smoke","snake","solar","solve","sorry","south","space","spare","spark","speak","spear","speed","spell","spend","spice","spill","spike","spine","spoke","spoon","spray","stack","staff","stage","stain","stair","stake","stale","stall","stamp","stand","stark","start","stash","state","steal","steam","steep","steer","stern","stick","stiff","still","stock","stomp","stone","stool","store","storm","story","stout","stove","strap","straw","stray","strut","study","stuff","stump","stung","stunt","style","sugar","suite","sunny","super","surge","swamp","swear","sweep","sweet","swept","swift","swipe","swirl","swoop",
  // T
  "tab","tan","tap","tar","tax","tea","ten","tin","tip","toe","ton","top","tot","tow","toy","tug","tub",
  "tail","take","tale","talk","tame","tank","tape","task","teal","team","tear","tell","tall","tick","tide","till","time","tire","told","toll","tone","tool","tore","toss","tour","town","trap","tray","tree","trim","trip","true","tube","tune","turn","twin","type",
  "table","taunt","teach","tease","tempo","tense","tenth","thank","theft","their","theme","there","thick","thing","think","third","thorn","those","three","threw","throw","thumb","thump","tiger","tight","timer","tired","title","today","token","tonic","topic","torch","total","touch","tough","toxic","trace","track","trade","trail","train","trait","tramp","trash","treat","trend","trial","tribe","trick","trout","trove","truce","truck","truly","trump","trunk","trust","truth","tulip","tumor","tunic","tutor","tweak","twine","twist",
  // U
  "unit","upon","urge","used",
  "under","unfit","union","unity","until","upper","upset","urban","usher",
  // V
  "van","vat","vet","vow",
  "vale","vane","veil","very","vine","vote",
  "valid","value","valve","vapor","vault","verse","video","vigor","viral","virus","visit","vista","vital","vivid","vocal","voice","vouch","vowel",
  // W
  "war","wax","way","web","wit","woe",
  "wade","wage","wait","wake","walk","wall","wand","ward","warm","wash","wave","weed","week","well","west","wide","wind","wine","wing","wire","wish","woke","word","worm","wrap",
  "waist","waste","watch","water","weary","weave","wedge","weigh","weird","wheat","wheel","where","which","while","whiff","whirl","whisk","white","whole","whose","widen","wield","witch","woman","women","wrath","wreck","wring","write","wrong",
  // Y-Z
  "yell","your","zone","zoom","zero",
  "yacht","yield","young","youth",
];

// ── Trie ─────────────────────────────────────────────────────────────────────
interface TrieNode {
  children: Record<string, TrieNode>;
  isWord: boolean;
}

function makeTrie(): TrieNode {
  return { children: {}, isWord: false };
}

function buildTrie(words: string[]): TrieNode {
  const root = makeTrie();
  for (const word of words) {
    let node = root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = makeTrie();
      node = node.children[ch];
    }
    node.isWord = true;
  }
  return root;
}

function trieNode(root: TrieNode, prefix: string): TrieNode | null {
  let node = root;
  for (const ch of prefix) {
    if (!node.children[ch]) return null;
    node = node.children[ch];
  }
  return node;
}

function wordsWithPrefix(root: TrieNode, prefix: string): string[] {
  const node = trieNode(root, prefix);
  if (!node) return [];
  const results: string[] = [];
  function dfs(n: TrieNode, path: string) {
    if (n.isWord) results.push(path);
    for (const [ch, child] of Object.entries(n.children)) dfs(child, path + ch);
  }
  dfs(node, prefix);
  return results;
}

// ── Minimax (memo is local per AI call) ─────────────────────────────────────
// Returns true if the player whose turn it is CAN win from this position
function ghostWins(
  node: TrieNode,
  prefix: string,
  minLoseLen: number,
  memo: Map<string, boolean>
): boolean {
  const key = prefix;
  if (memo.has(key)) return memo.get(key)!;

  let anyWin = false;
  for (const [letter, child] of Object.entries(node.children)) {
    const np = prefix + letter;
    if (child.isWord && np.length >= minLoseLen) continue; // this move loses for us
    const opponentWins = ghostWins(child, np, minLoseLen, memo);
    if (!opponentWins) { anyWin = true; break; }
  }

  memo.set(key, anyWin);
  return anyWin;
}

function aiChooseLetter(
  root: TrieNode,
  prefix: string,
  minLoseLen: number,
  noisy: boolean
): string | null {
  const node = trieNode(root, prefix);
  if (!node) return null;

  // Collect moves that don't immediately complete a losing word
  const validMoves: string[] = [];
  for (const [letter, child] of Object.entries(node.children)) {
    const np = prefix + letter;
    if (child.isWord && np.length >= minLoseLen) continue;
    validMoves.push(letter);
  }

  if (validMoves.length === 0) {
    // Forced to complete a word — pick any and lose gracefully
    return Object.keys(node.children)[0] ?? null;
  }

  // 20% chance: pick a random valid move (makes AI beatable)
  if (noisy && Math.random() < 0.2) {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  // Minimax: find a move that makes the opponent lose
  const memo = new Map<string, boolean>();
  for (const letter of validMoves) {
    const child = node.children[letter];
    const np = prefix + letter;
    const opponentWins = ghostWins(child, np, minLoseLen, memo);
    if (!opponentWins) return letter; // winning move
  }

  // No winning move found — pick first valid move
  return validMoves[0];
}

// ── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "player-lost" | "ai-lost";
interface HistoryEntry { letter: string; by: "player" | "ai" }

// ── Component ────────────────────────────────────────────────────────────────
export default function GhostGame({ title }: { title: string }) {
  const [mode, setMode] = useState<"Kids" | "Adult">("Kids");
  const [phase, setPhase] = useState<Phase>("idle");
  const [prefix, setPrefix] = useState("");
  const [inputLetter, setInputLetter] = useState("");
  const [turn, setTurn] = useState<"player" | "ai">("player");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loseMsg, setLoseMsg] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [challengeResult, setChallengeResult] = useState<string | null>(null);
  const [record, setRecord] = useState({ wins: 0, losses: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const trie = useMemo(() => buildTrie(GHOST_WORDS), []);

  // Kids = easier: 4+ letter words lose (short words safe)
  // Adult = harder: 3+ letter words lose (even "cat" counts)
  const minLoseLen = mode === "Kids" ? 4 : 3;

  const startGame = useCallback(() => {
    setPrefix("");
    setInputLetter("");
    setTurn("player");
    setHistory([]);
    setLoseMsg("");
    setAiThinking(false);
    setChallengeResult(null);
    setPhase("playing");
  }, []);

  const resetGame = useCallback(() => {
    setPhase("idle");
    setPrefix("");
    setHistory([]);
    setLoseMsg("");
    setChallengeResult(null);
    // record intentionally preserved across sessions
  }, []);

  // Track wins/losses
  useEffect(() => {
    if (phase === "ai-lost")     setRecord(r => ({ ...r, wins: r.wins + 1 }));
    if (phase === "player-lost") setRecord(r => ({ ...r, losses: r.losses + 1 }));
  }, [phase]);

  // Focus input on player turn
  useEffect(() => {
    if (phase === "playing" && turn === "player") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase, turn]);

  // AI turn
  useEffect(() => {
    if (phase !== "playing" || turn !== "ai") return;
    setAiThinking(true);
    const t = setTimeout(() => {
      setAiThinking(false);
      const letter = aiChooseLetter(trie, prefix, minLoseLen, true);

      if (!letter) {
        setLoseMsg("AI is stuck — AI loses!");
        setPhase("ai-lost");
        return;
      }

      const np = prefix + letter;
      const node = trieNode(trie, np);
      const isWord = !!node?.isWord && np.length >= minLoseLen;

      setHistory(h => [...h, { letter, by: "ai" }]);
      setPrefix(np);

      if (isWord) {
        setLoseMsg(`AI completed "${np.toUpperCase()}" — AI loses!`);
        setPhase("ai-lost");
      } else {
        setTurn("player");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [phase, turn, prefix, trie, minLoseLen]);

  const handleAddLetter = () => {
    if (phase !== "playing" || turn !== "player" || !inputLetter) return;
    const letter = inputLetter.toLowerCase();
    if (!/^[a-z]$/.test(letter)) { setInputLetter(""); return; }

    const node = trieNode(trie, prefix);
    if (!node || !node.children[letter]) {
      setLoseMsg(`"${(prefix + letter).toUpperCase()}" leads nowhere — you lose!`);
      setPhase("player-lost");
      setInputLetter("");
      return;
    }

    const np = prefix + letter;
    const nextNode = node.children[letter];
    const isWord = nextNode.isWord && np.length >= minLoseLen;

    setHistory(h => [...h, { letter, by: "player" }]);
    setInputLetter("");
    setPrefix(np);

    if (isWord) {
      setLoseMsg(`You completed "${np.toUpperCase()}" — you lose!`);
      setPhase("player-lost");
    } else {
      setTurn("ai");
    }
  };

  const handleChallenge = () => {
    const words = wordsWithPrefix(trie, prefix);
    if (words.length === 0) {
      setChallengeResult(`Challenge success! No word starts with "${prefix.toUpperCase()}" — AI loses!`);
      setPhase("ai-lost");
    } else {
      setChallengeResult(`Challenge failed! "${words[0].toUpperCase()}" is a valid word — you lose!`);
      setPhase("player-lost");
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const letterChip = (entry: HistoryEntry, i: number) => (
    <span key={i} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 40, height: 44,
      background: entry.by === "player" ? "rgba(236,72,153,0.2)" : "rgba(109,40,217,0.2)",
      border: `2px solid ${entry.by === "player" ? "var(--accent-secondary, #ec4899)" : "var(--accent-primary)"}`,
      borderRadius: "var(--radius-sm)",
      color: "var(--text-primary)",
      fontFamily: "monospace", fontSize: "1.3rem", fontWeight: 800,
      textTransform: "uppercase",
    }}>{entry.letter}</span>
  );

  const endIcon = phase === "player-lost" ? "💀" : "🎉";
  const endTitle = phase === "player-lost" ? "You lost!" : "AI lost!";

  const recordPill = (record.wins + record.losses) > 0 && (
    <div style={{
      display: "inline-flex", gap: "0.75rem", fontSize: "0.78rem",
      background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-full, 999px)", padding: "0.25rem 0.75rem",
      color: "var(--text-secondary)",
    }}>
      <span style={{ color: "#22c55e" }}>W: {record.wins}</span>
      <span>|</span>
      <span style={{ color: "#ef4444" }}>L: {record.losses}</span>
    </div>
  );

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
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: "0.75rem" }}>
            Take turns adding one letter to a growing word.<br />
            The first player to <strong>complete a real word</strong> loses!
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            {mode === "Kids"
              ? "🟢 Kids: only 4+ letter words lose. Short words (3 letters) are safe!"
              : "🔴 Adult: even 3-letter words lose. Every letter is a trap!"}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
            You can <strong>Challenge</strong> if you think the AI has no valid word.
          </p>
          {recordPill}
          <div style={{ marginTop: "1.25rem" }}>
            <button className={styles.resetBtn} onClick={startGame}>Start Game</button>
          </div>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === "playing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>

          {/* Record pill */}
          {recordPill}

          {/* Growing prefix display */}
          <div style={{
            background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)", padding: "1rem 1.5rem",
            textAlign: "center", width: "100%", maxWidth: 400,
          }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
              Current letters
            </div>
            <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", flexWrap: "wrap", minHeight: 48 }}>
              {history.length === 0
                ? <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>—</span>
                : history.map((e, i) => letterChip(e, i))
              }
            </div>
            {prefix && (
              <div style={{
                marginTop: "0.75rem", fontFamily: "monospace",
                fontSize: "1.6rem", fontWeight: 800, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "var(--text-primary)",
              }}>
                {prefix}
              </div>
            )}
          </div>

          {/* Turn status */}
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {aiThinking
              ? "🤔 AI is thinking…"
              : turn === "player"
              ? "Your turn — add a letter:"
              : "Waiting for AI…"}
          </div>

          {/* Player input */}
          {turn === "player" && !aiThinking && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                ref={inputRef}
                value={inputLetter}
                onChange={e => setInputLetter(e.target.value.replace(/[^a-zA-Z]/g, "").slice(-1))}
                onKeyDown={e => e.key === "Enter" && handleAddLetter()}
                maxLength={1}
                placeholder="?"
                style={{
                  width: 56, height: 56, textAlign: "center",
                  background: "var(--bg-primary)",
                  border: "2px solid var(--accent-primary)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 800,
                  textTransform: "uppercase", outline: "none", caretColor: "transparent",
                }}
              />
              <button
                onClick={handleAddLetter}
                style={{
                  background: "var(--accent-primary)", color: "#fff",
                  border: "none", borderRadius: "var(--radius-sm)",
                  padding: "0.55rem 1.1rem", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem",
                }}
              >Add</button>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            <span><span style={{ color: "var(--accent-secondary, #ec4899)" }}>■</span> You</span>
            <span><span style={{ color: "var(--accent-primary)" }}>■</span> AI</span>
          </div>

          {/* Challenge */}
          {turn === "player" && !aiThinking && prefix.length >= 1 && (
            <button
              onClick={handleChallenge}
              style={{
                background: "transparent", border: "1px solid var(--border-color)",
                color: "var(--text-secondary)", padding: "0.4rem 1.1rem",
                borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.82rem",
              }}
            >
              Challenge AI (can they form a word?)
            </button>
          )}
        </div>
      )}

      {/* ── END STATE ── */}
      {(phase === "player-lost" || phase === "ai-lost") && (
        <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>{endIcon}</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            {endTitle}
          </div>

          <div style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {challengeResult ?? loseMsg}
          </div>

          <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
            {history.map((e, i) => letterChip(e, i))}
          </div>

          {/* Session record */}
          <div style={{ marginBottom: "1.25rem" }}>{recordPill}</div>

          <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
