# AI Games Site — Wish List

Track ideas and backlog items here. Update as things get done or new ideas come in.

---

## ✅ Games Shipped (29 total)

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
| Word Ladder | word-ladder | |
| Ghost | ghost | Trie + minimax |
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

---

## 🎮 New Games To Build

### Action / Fun
- [ ] **Marble Drop / Color Match** — falling colored marbles, match-3 or stack-to-clear mechanic. Plan before building.

### Math (kids + adult)
- [ ] **Number Rocket** — math game, mechanic TBD
- [ ] **Shape Sorter** — math/geometry game
- [ ] **Estimation Station** — estimate quantities/measurements
- [ ] **Money Market** — coins and change game

### Painting / Creative
- [ ] **Kaleidoscope Painter** — draw and it mirrors symmetrically in real time
- [ ] **Mandala Drawer** — radial symmetry drawing tool
- [ ] **Color by Numbers** — tap numbered regions to fill with color

---

## 🌍 Language / i18n

- [x] Hebrew Anagram Blitz — 🇮🇱/🇺🇸 toggle, Hebrew word lists kids + adult
- [x] Hebrew Trivia — 20 kids + 20 adult Hebrew questions, RTL support
- [ ] **Hebrew Word Ladder** — needs Hebrew word pairs with single-letter-change connections. Source a word list first.
- [ ] **Hebrew Ghost** — needs a full Hebrew word trie. Complex, defer until dictionary is sourced.

---

## 🐛 Bugs & UX

- [ ] **Tablet/iPad layout audit** — games look small on 768–1024px. Audit `.gameContainer` sizing, update CLAUDE.md.
- [x] Mode-switch locked after game over — fixed (5 games, 2026-03-21)
- [x] IceCreamMemoryGame TypeScript error on Vercel (Phase type) — fixed 2026-03-21
- [x] MathBlitz invisible on mobile (play area needs explicit height) — fixed 2026-03-21
- [x] Word Ladder broken Unsplash image — fixed 2026-03-21

---

## 📊 Analytics & SEO

- [ ] **Vercel Analytics** — install `@vercel/analytics` package, add `<Analytics />` to layout.tsx to track page views and game engagement
- [ ] **SEO audit** — check meta tags, Open Graph, site title/description for Google discoverability; verify site appears in Google Search

---

## 💡 Future / Long-term Ideas

- [ ] Leaderboard / high scores (localStorage first, backend later)
- [ ] Sound effects toggle / mute button site-wide
- [ ] More languages beyond EN/HE
- [ ] More Hebrew word game content once a Hebrew dictionary is sourced
