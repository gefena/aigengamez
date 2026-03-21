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

---

## 🎮 New Games To Build

### Action / Fun
- [ ] **Marble Drop / Color Match** — falling colored marbles, match-3 or stack-to-clear mechanic. Plan before building.
- [ ] **Toilet Piano** — piano keyboard where each key is a toilet/bathroom; plays real piano note + subtle fart sound blend. Tap keys to make music.

### Engineering / STEM
- [ ] **Research & brainstorm engineering games** — ideas to explore: bridge builder, circuit builder, gear/pulley puzzles, simple machines, rocket launch trajectory, architecture/load bearing. Pick 1–2 to build after brainstorm.

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
- [x] Hebrew Word Ladder — verified puzzle chains, HE_VALID_3 vocabulary set
- [x] Hebrew Ghost — HE_GHOST_WORDS trie, minimax AI works on Hebrew

---

## 🐛 Bugs & UX

- [ ] **Tablet/iPad layout audit** — games look small on 768–1024px. Audit `.gameContainer` sizing, update CLAUDE.md.
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

## 💡 Future / Long-term Ideas

- [ ] Leaderboard / high scores (localStorage first, backend later)
- [ ] Sound effects toggle / mute button site-wide
- [ ] More languages beyond EN/HE
- [ ] More Hebrew word game content once a Hebrew dictionary is sourced
