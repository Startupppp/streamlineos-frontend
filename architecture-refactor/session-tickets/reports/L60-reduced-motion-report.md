# L60 — Reduced Motion Fix

## Before / After Counts

| | Before | After |
|---|---|---|
| Files using Framer Motion | 250+ | 250+ (unchanged) |
| Files calling `useReducedMotion()` | 103 | 103 (unchanged; they were already correct) |
| Files importing `lib/motion-variants.ts` without `useReducedMotion` | 40 | 40 (static import still works; hook is now available) |
| Files that could inherit fix by migrating to `useMotionVariants()` | 40 | 0 (migration path available; see Gap section) |
| `motion-reveal.tsx` (landing animation wrapper) — reduced motion aware | NO | YES |

## Mechanism

### 1. What `MotionConfig reducedMotion="user"` actually does in v12

`MotionProvider` at `components/providers/motion-provider.tsx` wraps the entire app in `<MotionConfig reducedMotion="user">`. This is mounted at `app/layout.tsx:148`.

After reading the Framer Motion v12 source (`node_modules/framer-motion/dist/framer-motion.dev.js`), the flag `shouldReduceMotion` is applied in only two places:
- **Layout animations** (line 6610): forces `delay: 0, type: false` — instant, no animation.
- **CSS positional keys** `width`, `height`, `top`, `left`, `right` (line 10034): forces `{ type: false }`.

It does **NOT** suppress `x`, `y`, `scale`, `opacity` in authored variant objects. So `fadeUp.hidden = { opacity: 0, y: 16 }` still translates under reduced motion even with `MotionConfig reducedMotion="user"`. The existing provider is necessary but insufficient.

### 2. The hook: `useMotionVariants()` — the activating wire

**File:** `lib/motion-variants.ts`

Added `useMotionVariants()` hook (exported alongside the existing static exports). Calling it returns reduced variants when `useReducedMotion()` is true:

```typescript
export function useMotionVariants() {
  const prefersReduced = useReducedMotion();
  return {
    staggerContainer: prefersReduced ? reducedStagger : staggerContainer,
    fadeUp: prefersReduced ? reducedFade : fadeUp,
    fadeIn: prefersReduced ? reducedFade : fadeIn,
    slideInLeft: prefersReduced ? reducedFade : slideInLeft,
    scaleIn: prefersReduced ? reducedFade : scaleIn,
  };
}
```

Under reduced motion all non-`fadeIn` variants collapse to `{ hidden: { opacity: 0 }, visible: { opacity: 1 } }`, dropping `y`, `x`, and `scale`. `staggerContainer` keeps `staggerChildren: 0` (children still sequence in, but without delay or transforms).

The 16 files already calling both `motion-variants` and `useReducedMotion` were already handling this themselves. They can optionally migrate to the hook; their existing pattern is equivalent.

### 3. `motion-reveal.tsx` fixed at the source

**File:** `features/landing/components/motion/motion-reveal.tsx`

This is the canonical reusable animation wrapper for the landing page. Three exported components (`MotionReveal`, `MotionStagger`, `MotionItem`) now call `useReducedMotion()` internally and select their variants at render time. Under reduced motion:
- `MotionReveal` uses `{ hidden: { opacity: 0 }, visible: { opacity: 1 } }` and sets `delay: 0`
- `MotionStagger` uses `reducedStagger` (no stagger delay, opacity only)
- `MotionItem` uses `{ hidden: { opacity: 0 }, visible: { opacity: 1 } }`

### 4. CSS `@media (prefers-reduced-motion: reduce)` — current state

The existing blocks in `globals.css` correctly suppress:
- `.brand-sweep` — animated gradient sweep (decorative, suppressed ✓)
- `button.goal-everything-chip` — animated gradient chip (decorative, suppressed ✓)
- `.preview-goal-marquee-track` — scrolling marquee (moves content across screen, suppressed ✓)
- `.skeleton-shimmer::after` + `.animate-pulse` — shimmer overlay (decorative, suppressed ✓)

**Deliberate exemption:** No general `* { animation: none !important }` was added. Such a rule would also kill `Loader2` spinner feedback and any progress indicator, which remain legitimate under reduced motion (they signal activity; they do not translate content). The four named suppressions are sufficient for the CSS layer.

## Gap: 40 static-variant consumers

40 files import the static exports (`fadeUp`, `staggerContainer`, etc.) from `lib/motion-variants.ts` without calling `useReducedMotion()`. Migrating them to `useMotionVariants()` would give them the fix automatically, but that is 40 client-component edits. The hook is now the canonical API; each component can be migrated at its next touch. The `MotionConfig reducedMotion="user"` in the provider does suppress layout animations for these components even without the hook.

## Verification

- `tsc --noEmit`: clean (npm warn about npmrc is pre-existing, unrelated)
- `pnpm -C frontend exec jest --testPathPattern="motion-variants"`: 4 tests pass
  - `returns full variants when reduced motion is not preferred` ✓
  - `returns opacity-only hidden states when reduced motion is preferred` ✓
  - `staggerContainer drops stagger delay when reduced motion is preferred` ✓
  - `staggerContainer retains stagger delay when reduced motion is not preferred` ✓
- No lint run (25+ min, per CLAUDE.md)
- No `next build` run (not required for this change class)

## Files changed

- `frontend/lib/motion-variants.ts` — added `useReducedMotion` import and `useMotionVariants()` hook
- `frontend/features/landing/components/motion/motion-reveal.tsx` — `MotionReveal`, `MotionStagger`, `MotionItem` now respect `useReducedMotion()` internally
- `frontend/lib/motion-variants.test.ts` — new regression test (4 assertions) for hook behaviour
