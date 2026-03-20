# Claude Code Guidelines — AI Games Site

## Mobile Layout Rules for Games

These rules must be followed when building any new game component to prevent content clipping on mobile screens.

### How the three viewport tiers work

| Tier | Width | `.gameContainer` height | `.gameInner` |
|------|-------|------------------------|--------------|
| Desktop | >1024px | `aspect-ratio: 4/3` — gives an **explicit** computed height | `height: 100%` fills it; `overflow: hidden`; `justify-content: center` |
| Tablet | 641–1024px | `min(75vh, 720px)` — **explicit** viewport-relative height | `overflow: visible`; `justify-content: flex-start` |
| Mobile | ≤640px | `height: auto` — shrinks to content | `overflow: visible`; `justify-content: flex-start` |

**The key rule:** `height: 100%` on `.gameInner` only works when the parent has an **explicit** height (not `height: auto`). Desktop uses `aspect-ratio`; tablet uses `min(75vh, 720px)`; mobile abandons the percentage chain entirely and lets content flow naturally.

### Root Cause

`.gameContainer` has a fixed height on desktop and tablet but switches to `height: auto` on mobile. `.gameInner` is `overflow: visible; justify-content: flex-start` on tablet and mobile. This means the **game component itself** must manage its own layout — it cannot rely on the outer container to bound its height.

### Rules

#### 1. Always use `flex: 1` for the visual playfield
Any game with a distinct visual playfield (grid, canvas, arena) must wrap it in a div with `flex: 1; min-height: 0; overflow: hidden`. This lets the playfield claim remaining space between UI chrome (title, controls) without growing unboundedly.

```tsx
// Good
<div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
  {/* canvas, grid, arena */}
</div>

// Bad — fixed height that ignores available space
<div style={{ height: '300px' }}>
```

#### 2. Size canvases and grids from measured container width
Never hardcode pixel sizes. Use a `containerRef` + `resize` listener to compute responsive cell/canvas sizes.

```tsx
const containerRef = useRef<HTMLDivElement>(null);
const [containerWidth, setContainerWidth] = useState(320);

useEffect(() => {
  const measure = () => {
    if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
  };
  measure();
  window.addEventListener('resize', measure);
  return () => window.removeEventListener('resize', measure);
}, []);

// Then compute: cellPx = Math.min(maxCell, Math.floor((containerWidth - padding) / numCols))
```

#### 3. Cap cell/grid height against viewport height
On tall grids, also cap cell size against available viewport height:
```ts
const maxCellByHeight = Math.floor((window.innerHeight * 0.42) / numRows);
const cellPx = Math.min(maxCellByWidth, maxCellByHeight, MAX_CELL);
```

#### 4. Use `justify-content: flex-start` for content-heavy UIs
`justify-content: center` on a tall flex column in a bounded container pushes overflow in both directions. Use `flex-start` for any game with: title + difficulty selector + playfield + palette/controls stacked vertically.

#### 5. Never rely on outer `.gameInner` overflow for clipping
`.gameInner` is `overflow: visible` on tablet and mobile. Each game component is responsible for its own overflow boundaries. Use `overflow: hidden` only on specific inner containers (the playfield div), not the whole component.

#### 6. Content stack audit before shipping
Mentally stack the content heights: title + difficulty row + description + playfield + palette + program area + action buttons. If this stack could exceed ~480px on a phone, you need either:
- A `flex: 1` playfield that compresses to fit, or
- Deliberate scrollability (`overflow-y: auto` on the game's root)

### Pattern for New Games

```tsx
export default function MyGame({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div ref={containerRef} className={styles.gameInner}>
      <h2 className={styles.gameTitle}>{title}</h2>
      {/* difficulty selector */}

      {/* playfield — claims remaining space */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', width: '100%', position: 'relative' }}>
        {/* canvas / grid / arena */}
      </div>

      {/* controls — fixed height at bottom */}
      <div className={styles.gameControls}>
        {/* buttons */}
      </div>
    </div>
  );
}
```

## Game Architecture Conventions

- **Phase machine**: `type Phase = "idle" | "playing" | "over"` — all game states flow through this
- **Timer loops**: chained `setTimeout`, never `setInterval`
- **Stale closure prevention**: keep mutable game state in `useRef`, mirror to `useState` only when JSX needs to render it
- **Atomic ref+state sync**: `const updateItems = useCallback((next) => { itemsRef.current = next; setItems(next); }, [])`
- **CSS animations**: inject via `<style>{KEYFRAMES}</style>` inside the component, not in CSS modules
- **Shared CSS classes**: use `styles.gameInner`, `styles.gameTitle`, `styles.difficultySelector`, `styles.diffBtn`, `styles.activeDiff`, `styles.resetBtn` from `page.module.css`

## Adding a New Game

1. Create `src/components/games/MyGame.tsx`
2. Add entry to `src/data/games.json`
3. Import and register in `src/app/games/[id]/page.tsx` → `GAME_COMPONENTS`
4. Run `npm run build` locally before committing to catch ESLint/TypeScript errors

## Passing the Vercel Build

Vercel runs `next build` which includes ESLint and TypeScript checks. Build failures are **blocking** — the deploy will not go out. Follow these rules to pass on the first push.

### Pre-commit checklist
Run locally before every commit:
```bash
npm run build
```
Fix every error before committing. Warnings are fine; errors are not.

### ESLint: no unused variables (`no-unused-vars`)
The most common build killer. Rules:
- **Only declare `useState` if JSX renders it.** If a value is only read inside callbacks/timers, use `useRef` instead.
  ```tsx
  // Bad — ESLint error if `attempts` never appears in JSX
  const [attempts, setAttempts] = useState(0);

  // Good
  const attemptsRef = useRef(0);
  attemptsRef.current += 1;
  ```
- **Variables computed inside a function but never used** → delete them entirely. Don't leave `const cfg = ...` if you switched to reading from a ref.
- **Destructured values you don't need** → omit or prefix with `_`: `const [, setValue] = useState(0)` or `const _unused = ...`
- **`void expr`** trick: if an expression result is intentionally discarded and ESLint complains, prefix with `void`:
  ```ts
  void someRef.current; // suppresses unused-expression warning
  ```

### TypeScript: Set/iterator spread
`[...new Set(arr)]` can fail if `tsconfig` doesn't include `"downlevelIteration": true`.
Always use the manual dedup pattern instead:
```ts
// Bad
const unique = [...new Set(arr)];

// Good
const unique = arr.filter((x, i, a) => a.indexOf(x) === i);
```

### TypeScript: exhaustive type checks
- All `Record<Key, Value>` keys must be covered — add a default or narrow the type.
- `useRef<Type>(null)` requires null-checks before `.current` access: `if (ref.current) { ... }`
- Avoid `as any` — TypeScript errors hidden this way will surface as runtime bugs.

### React: hooks rules
- All hooks must be called unconditionally at the top level (not inside `if`, `for`, or callbacks).
- `useEffect` deps array must include every value read inside — omitting causes stale closure bugs that ESLint flags with `react-hooks/exhaustive-deps`.

### Common ESLint Pitfalls

- Declare state only if JSX reads it; use `useRef` for values only read inside callbacks
- `[...new Set(arr)]` may fail TypeScript — use `arr.filter((x, i, a) => a.indexOf(x) === i)` instead
- Avoid unused variables in destructuring — remove or prefix with `_`
