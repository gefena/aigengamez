# AI Games Site — Wish List

Track ideas and backlog items here. Update as things get done or new ideas come in.

---

## ✅ Games Shipped (40 total)

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
| Mandala Painter | mandala-painter | Radial stamp + draw, 8/12/16 segments, guide rings |
| Number Rocket | number-rocket | Math questions → fuel gauge → rocket launch, 60s |
| Shape Sorter | shape-sorter | Name shapes + area/perimeter calculations, 60s |
| Estimation Station | estimation-station | Visual dot jar + real-world quantity estimation |
| Money Market | money-market | Count coins + make change, SVG coin visuals |
| Gear Train Puzzle | gear-train | SVG animated gears, direction + RPM questions |

---

## 🎮 New Games To Build

### Action / Fun
- [x] **Marble Drop / Color Match** — falling colored marbles, match-3 or stack-to-clear mechanic. Plan before building.
- [x] **Toilet Piano** — piano keyboard where each key is a toilet/bathroom; plays real piano note + subtle fart sound blend. Tap keys to make music.

### Engineering / STEM
- [x] **Gear Train Puzzle** — SVG animated interlocking gears; kids: direction-only, adult: direction + RPM ratio.
- [ ] **More engineering games** — ideas: bridge builder (truss stress), rocket trajectory (angle + thrust), pulley systems.
- [ ] **Rush Hour** — sliding block puzzle: move cars/trucks horizontally or vertically to clear a path for the red car to exit. Pure logic, no timer pressure.

### Kids / Casual
- [x] **Socks Match** — pair up loose socks by color and pattern before the laundry pile grows too big. Match-2 mechanic with increasingly tricky patterns. Kids mode: simple colors; Adult mode: stripes, dots, and argyle patterns that look nearly identical.

### Math (kids + adult)
- [x] **Number Rocket** — math game, mechanic TBD
- [x] **Shape Sorter** — math/geometry game
- [x] **Estimation Station** — estimate quantities/measurements
- [x] **Money Market** — coins and change game

### Painting / Creative
- [x] **Kaleidoscope Painter** — draw and it mirrors symmetrically in real time
- [x] **Mandala Drawer** — radial symmetry drawing tool
- [x] **Color by Numbers** — tap numbered regions to fill with color

---

## 🌍 Language / i18n

- [x] Hebrew Anagram Blitz — 🇮🇱/🇺🇸 toggle, Hebrew word lists kids + adult
- [x] Hebrew Trivia — 20 kids + 20 adult Hebrew questions, RTL support
- [x] Hebrew Word Ladder — verified puzzle chains, HE_VALID_3 vocabulary set
- [x] Hebrew Ghost — HE_GHOST_WORDS trie, minimax AI works on Hebrew

---

## 🌿 Lawn Mower Coder

- [ ] **Wall collision rule** — no rule block for what happens when the mower hits a wall. Audit and add a "hit wall → stop / turn" instruction block if missing.
- [ ] **Visual polish** — make the game more visually appealing: better mower sprite, grass texture, color palette upgrade.

## 🐛 Bugs & UX

- [x] **Tablet/iPad layout audit** — games look small on 768–1024px. Audit `.gameContainer` sizing, update CLAUDE.md.
- [x] **Queen's Gauntlet chess board** — fixed: explicit square boardPx computed from outerRef width + 60vh cap; no longer relies on broken height:100% chain on mobile.
- [x] **Pixel Art Maker broken on mobile/tablet** — fixed: responsive cellPx from containerRef, pointer events on container for touch drag painting.
- [x] **Socks Match patterns** — stripes, dots, diagonal patterns already implemented in CSS.
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

- [x] **Trivia — more questions** — EN Kids: 55, EN Adult: 65, HE Kids: 55, HE Adult: 55. All pools at 50+.

---

## 🎨 Design & Visual Polish

- [ ] **Improve game tags/categories** — current tags (Puzzle, Action) are too broad. Add richer tags per game (e.g. "Word", "Math", "Art", "Multiplayer", "Hebrew", "Coding") and make Explore page filterable by them.
- [ ] **Replace generic Unsplash photos** — most game cards use stock photos unrelated to gameplay. Replace with on-brand custom thumbnails or generated art that reflects each game's actual visuals.
- [ ] **Site visual identity overhaul** — the site looks like a generic Next.js template. Ideas to make it feel unique: custom color palette, hand-drawn / pixel-art logo, animated homepage hero, card hover effects, a mascot character, and a coherent "arcade" or "retro-future" theme throughout.

---

## 💡 Future / Long-term Ideas

- [x] **Play counter per game** — localStorage `play_<id>` key, incremented on each game page visit; shown as "🎮 N" on Explore cards.
- [ ] Leaderboard / high scores (localStorage first, backend later)
- [ ] Sound effects toggle / mute button site-wide
- [ ] More languages beyond EN/HE
- [ ] **Spanish (🇪🇸)** — add ES translations for UI + word game content (Anagram Blitz, Word Ladder, Ghost, Trivia) with Spanish word lists for kids and adults
- [ ] More Hebrew word game content once a Hebrew dictionary is sourced
