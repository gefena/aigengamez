# AI Games Site — Wish List

Track ideas and backlog items here. Update as things get done or new ideas come in.

---

## 🌍 Language / i18n

- [ ] **Hebrew Word Ladder** — needs Hebrew word pairs with Levenshtein-1 connections. Source a dictionary first.
- [ ] **Hebrew Ghost** — needs a Hebrew trie. Complex, defer until dictionary is sourced.
- [ ] **Hebrew Anagram Blitz** ✅ done (2026-03-21) — 🇮🇱/🇺🇸 toggle, Hebrew word lists kids + adult
- [ ] **Hebrew Trivia** ✅ done (2026-03-21) — 20 kids + 20 adult Hebrew questions

---

## 🎮 New Games

- [ ] **Tetris / Block Drop** ✅ done (2026-03-21) — falling blocks, 7 tetrominoes, kids/adult speed, ghost piece, hard drop
- [ ] **Ice Cream Memory** ✅ done (2026-03-21) — memorize scoop order, rebuild from palette, 5 rounds
- [ ] **Fart Tank** — animal fires farts instead of bullets. Plan mechanic before building.
- [ ] **Marble / Color Match falling game** — Tetris-like but with colored marbles or match-3 columns. Plan before building.

### Math games (one by one)
- [ ] Number Rocket
- [ ] Shape Sorter
- [ ] Estimation Station
- [ ] Money Market

### Painting / Creative
- [ ] Brainstorm more painting games (AI Canvas, Stamp Pad, Pixel Art already exist)
- [ ] Ideas: kaleidoscope painter, mandala drawer, color-by-numbers

---

## 🐛 Bugs & UX

- [ ] **Tablet/iPad layout audit** — games look small on 768–1024px. Need to audit `.gameContainer` sizing and update CLAUDE.md rules.
- [x] Mode-switch locked after game over — fixed 2026-03-21 (5 games)
- [x] MathBlitz invisible on mobile — fixed 2026-03-21 (play area needs explicit height)
- [x] Word Ladder broken image — fixed 2026-03-21
- [x] IceCreamMemoryGame TypeScript error on Vercel build — fixed 2026-03-21

---

## 💡 Future Ideas

- [ ] Leaderboard / high score persistence (localStorage or backend)
- [ ] Sound effects toggle (mute button)
- [ ] More languages beyond EN/HE
- [ ] Hebrew word games: source a Hebrew dictionary/word list first
