# AI Games Site — Wish List

Track ideas and backlog items here. Update as things get done or new ideas come in.

---

## ✅ Games Shipped (34 total)

| Game | ID | Notes |
|------|----|-------|
| Queen's Gauntlet | queen-gauntlet | |
| Tic-Tac-Toe NextGen | tic-tac-toe | Minimax AI |
| AI Magic Canvas | ai-canvas | |
| Stamp & Sticker Pad | stamp-pad | |
| Pixel Art Maker | pixel-art | |
| Fireworks Canvas | fireworks-canvas | |
| Intestine Escape | maze-game | Prim's maze |
| Forest Escape | forest-maze | Nature maze |
| Temple Dash | endless-runner | Endless runner |
| Anagram Blitz | anagram-blitz | 🇺🇸/🇮🇱 Hebrew mode |
| Word Ladder | word-ladder | 🇺🇸/🇮🇱 Hebrew mode |
| Ghost | ghost | Trie + minimax · 🇺🇸/🇮🇱 Hebrew mode |
| Code Order | code-order | Block coding |
| Trivia Challenge | trivia | 🇺🇸/🇮🇱 Hebrew mode |
| Bubble Pop | bubble-pop | |
| Fruit Catcher | fruit-catcher | |
| Memory Match | memory-match | |
| Logic Gates | logic-gates | |
| Bug Hunt | bug-hunt | |
| 4 in a Row | four-in-a-row | Minimax AI |
| Skunk Duel | fart-duel | Fart Tank idea → became this |
| Times Table Treasure | times-table | |
| Fraction Slices | fraction-slices | |
| Balance Scales | balance-scales | |
| Math Blitz | math-blitz | |
| Lawn Mower Coder | lawn-mower | |
| Block Drop | block-drop | Tetris-style |
| Ice Cream Memory | ice-cream-memory | |
| Alien Invasion! | whack-a-mole | |
| Toilet Piano | toilet-piano | Web Audio piano + fart blend |
| Kaleidoscope Painter | kaleidoscope-painter | Real-time mirror symmetry, glow mode |
| Marble Drop | marble-drop | Column-drop color match, chain clears |
| Socks Match | socks-match | CSS-patterned sock pairs, 90s adult timer |
| Color by Numbers | color-by-numbers | SVG tap-to-fill, 4 pictures (House/Flower/Owl/Fish) |

---

## 🎮 New Games To Build

### Action / Fun
- [x] **Marble Drop / Color Match** — falling colored marbles, match-3 or stack-to-clear mechanic. Plan before building.
- [x] **Toilet Piano** — piano keyboard where each key is a toilet/bathroom; plays real piano note + subtle fart sound blend. Tap keys to make music.

### Engineering / STEM
- [ ] **Research & brainstorm engineering games** — ideas to explore: bridge builder, circuit builder, gear/pulley puzzles, simple machines, rocket launch trajectory, architecture/load bearing. Pick 1–2 to build after brainstorm.

### Kids / Casual
- [x] **Socks Match** — pair up loose socks by color and pattern before the laundry pile grows too big. Match-2 mechanic with increasingly tricky patterns. Kids mode: simple colors; Adult mode: stripes, dots, and argyle patterns that look nearly identical.

### Math (kids + adult)
- [ ] **Number Rocket** — math game, mechanic TBD
- [ ] **Shape Sorter** — math/geometry game
- [ ] **Estimation Station** — estimate quantities/measurements
- [ ] **Money Market** — coins and change game

### Painting / Creative
- [x] **Kaleidoscope Painter** — draw and it mirrors symmetrically in real time
- [ ] **Mandala Drawer** — radial symmetry drawing tool
- [x] **Color by Numbers** — tap numbered regions to fill with color

---

## 🌍 Language / i18n

- [x] Hebrew Anagram Blitz — 🇮🇱/🇺🇸 toggle, Hebrew word lists kids + adult
- [x] Hebrew Trivia — 20 kids + 20 adult Hebrew questions, RTL support
- [x] Hebrew Word Ladder — verified puzzle chains, HE_VALID_3 vocabulary set
- [x] Hebrew Ghost — HE_GHOST_WORDS trie, minimax AI works on Hebrew

---

## 🐛 Bugs & UX

- [ ] **Tablet/iPad layout audit** — games look small on 768–1024px. Audit `.gameContainer` sizing, update CLAUDE.md.
- [ ] **Pixel Art Maker broken on mobile/tablet** — grid too small, touch painting doesn't work well. Needs responsive cell sizing + touch event handling.
- [x] Mode-switch locked after game over — fixed (5 games, 2026-03-21)
- [x] IceCreamMemoryGame TypeScript error on Vercel (Phase type) — fixed 2026-03-21
- [x] MathBlitz invisible on mobile (play area needs explicit height) — fixed 2026-03-21
- [x] Word Ladder broken Unsplash image — fixed 2026-03-21

---

## 📊 Analytics & SEO

- [x] **Vercel Analytics** — installed, `<Analytics />` added to layout.tsx
- [x] **SEO** — Open Graph tags, keywords, robots.txt, sitemap.xml (29 game URLs) added

---

## 🎯 Content Improvements

- [ ] **Trivia — more questions** — research and add more EN + HE questions for kids and adult pools (currently 20 each). Aim for 50+ per pool for better variety.

---

## 🎨 Design & Visual Polish

- [ ] **Improve game tags/categories** — current tags (Puzzle, Action) are too broad. Add richer tags per game (e.g. "Word", "Math", "Art", "Multiplayer", "Hebrew", "Coding") and make Explore page filterable by them.
- [ ] **Replace generic Unsplash photos** — most game cards use stock photos unrelated to gameplay. Replace with on-brand custom thumbnails or generated art that reflects each game's actual visuals.
- [ ] **Site visual identity overhaul** — the site looks like a generic Next.js template. Ideas to make it feel unique: custom color palette, hand-drawn / pixel-art logo, animated homepage hero, card hover effects, a mascot character, and a coherent "arcade" or "retro-future" theme throughout.

---

## 💡 Future / Long-term Ideas

- [ ] Leaderboard / high scores (localStorage first, backend later)
- [ ] Sound effects toggle / mute button site-wide
- [ ] More languages beyond EN/HE
- [ ] **Spanish (🇪🇸)** — add ES translations for UI + word game content (Anagram Blitz, Word Ladder, Ghost, Trivia) with Spanish word lists for kids and adults
- [ ] More Hebrew word game content once a Hebrew dictionary is sourced
