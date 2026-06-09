# StreamlineOS — Rebrand + Cinematic Landing Page

**Date:** 2026-06-09
**Status:** Approved (user delegated all open calls, will review the built result)

## 1. Goal

Two coupled deliverables:

1. **Full rebrand** of the codebase from "StreamlineOS" / "StreamlineOS" / `streamlineos` → **"StreamlineOS"** / `streamlineos` across every surface: UI strings, emails, PDFs, notifications, scripts, PRDs, comments, identifiers, package metadata, logo, favicon.
2. **New landing page** at `/` — cinematic, blue-themed, 3D-driven, premium typography, replacing the current amber/gold landing.

Both must ship together so the public face matches the new identity.

## 2. Brand identity

### 2.1 Name
- Display: **StreamlineOS** (single word, capital S + capital O + S)
- Package / slug: `streamlineos`
- Tagline working set: *"The operating system for modern teams."*

### 2.2 Typography
- **Bricolage Grotesque** — display headings (variable, optical-size aware, expressive)
- **Inter** — body, UI
- **JetBrains Mono** — accent labels, eyebrows, code-like callouts

All via `next/font/google` for self-hosting and zero-CLS. Wired in `app/layout.tsx`. Exposed as CSS variables: `--font-display`, `--font-sans`, `--font-mono`. Tailwind 4 reads them via `@theme` block.

### 2.3 Color palette (Midnight Gradient + Vision-OS glass)

Light/dark? **Dark-only for landing.** Dashboard keeps its existing theming machinery but primary brand color shifts amber → blue.

| Token | Value | Use |
|---|---|---|
| `--bg-deep` | `#03060F` | Base canvas |
| `--bg-elevated` | `#0A1428` | Section dividers / cards |
| `--bg-glass` | `rgba(96, 165, 250, 0.06)` | Frosted glass surfaces |
| `--border-glass` | `rgba(96, 165, 250, 0.18)` | Glass borders |
| `--blue-deep` | `#1E40AF` | Gradient start |
| `--blue-core` | `#3B82F6` | Primary brand |
| `--blue-bright` | `#60A5FA` | Highlight / link |
| `--cyan-glow` | `#06B6D4` | Gradient terminus / accent |
| `--gradient-signature` | `linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #06B6D4 100%)` | Headlines, key buttons |

Existing semantic colors (red/green/amber for status badges in dashboard) preserved so HR/CRM widgets don't visually break. Shadcn primary remapped from current to blue via CSS variables.

### 2.4 Logo
New SVG mark replacing `/public/logo.svg`:
- Mark: stylized "S" formed by two flowing ribbons (stream + line + os motif), drawn with a `#1E40AF → #06B6D4` gradient stroke.
- Wordmark: "StreamlineOS" set in Bricolage Grotesque Bold.
- Sizes: 22px (header), 32px (footer), 512px (PWA/og).
- Also update `app/icon.svg` for the favicon.

## 3. Landing page architecture

```
features/landing/
├── landing-page.tsx              (composer)
├── landing-shared.tsx            (motion variants, reveals — kept, refreshed)
├── landing-footer.tsx            (updated)
├── landing-form.tsx              (kept)
├── components/
│   ├── landing-nav.tsx           (glass sticky header with scroll-shrink)
│   ├── landing-hero.tsx          (3D + display headline + CTAs)
│   ├── landing-marquee.tsx       (trusted-by infinite scroll)
│   ├── landing-stats.tsx         (animated count-up strip)
│   ├── landing-bento.tsx         (3-tile bento with HR / Projects / CRM live UIs)
│   ├── landing-modules.tsx       (sticky scroll-jacked module gallery)
│   ├── landing-pillars.tsx       (why-us, 3 reasons)
│   ├── landing-walkthrough.tsx   (alternating L/R product steps)
│   ├── landing-testimonials.tsx  (auto-scroll testimonial wall)
│   ├── landing-pricing.tsx       ("Built for" segments / pricing teaser)
│   ├── landing-faq.tsx           (accordion)
│   ├── landing-cta.tsx           (final CTA)
│   ├── three/
│   │   ├── hero-scene.tsx        (R3F Canvas wrapper, lazy via next/dynamic ssr:false)
│   │   ├── glass-panels.tsx      (3 floating glass dashboards with cursor parallax)
│   │   ├── mesh-background.tsx   (shader plane: displaced gradient, mouse-reactive)
│   │   └── use-cursor.tsx        (shared cursor uniforms hook)
│   └── motion/
│       ├── magnetic.tsx          (magnetic-pull CTAs)
│       ├── number-counter.tsx    (count-up on scroll)
│       ├── marquee.tsx           (horizontal infinite scroller)
│       └── tilt-card.tsx         (3D cursor-tilt wrapper)
└── data/
    ├── modules.ts
    ├── pillars.ts
    ├── testimonials.ts
    └── faqs.ts
```

### 3.1 Section spec

1. **Sticky Nav** — full-width transparent → frosted glass on scroll. Logo, three nav anchors (Features, Solutions, Pricing), Sign In, Get Started (magnetic CTA).
2. **Hero** — R3F Canvas (60vh on mobile, full-bleed on desktop). Three angled glass panels render product mock UIs (Kanban card / Lead pipeline / Attendance chart) via `<Html>` from drei. Cursor parallax: panels tilt ±8° toward mouse. Background: shader-displaced gradient plane with simplex noise driven by `uTime` and `uMouse`. Foreground: massive Bricolage Grotesque headline with animated gradient sweep + supporting Inter copy + magnetic CTAs.
3. **Trusted-by Marquee** — duplicated horizontally scrolling logos (placeholder company names styled as marks).
4. **Stat Counters** — 4 metrics, count-up on scroll, with gradient digits.
5. **Bento Module Showcase** — 3-tile asymmetric grid. Each tile = a mini-UI demo: Kanban drag preview, CRM funnel, attendance heatmap. Subtle perpetual motion.
6. **Sticky Module Gallery** — pinned hero panel + right-rail scrolling list of 6 modules (Calendar / Chat / Analytics / AI / RBAC / Recruitment). Active module's visual swaps in the pinned area.
7. **Why Pillars** — 3 large cards: Enterprise security, Real-time everything, Role-based access. Each with animated icon.
8. **Animated Walkthrough** — 4 alternating L/R sections showing concrete user flows (Hire → Onboard → Sprint → Close).
9. **Testimonial Wall** — Two columns of cards, opposite-direction auto-scroll. Pause on hover.
10. **Pricing Teaser** — Three "Built for" segments (Startup / Scaleup / Enterprise) with feature checklists.
11. **FAQ** — Accordion, 6 questions.
12. **Final CTA** — Centered, gradient background flare, big magnetic button.
13. **Footer** — Updated with StreamlineOS branding.

### 3.2 3D implementation notes

- **R3F lazy load**: `next/dynamic(() => import('./three/hero-scene'), { ssr: false, loading: <Skeleton /> })`. Prevents Three.js from inflating the server bundle and reduces TBT.
- **Pixel ratio cap**: `dpr={[1, 1.5]}` for perf on high-DPI screens.
- **Reduced motion**: respect `prefers-reduced-motion` — disable canvas animation, swap to static gradient image.
- **Performance budget**: hero scene under ~150KB gzipped JS post-tree-shake. Bundle drei selectively (`@react-three/drei/core/Html` etc.) where possible.
- **Shader**: WebGL fragment shader writing displaced noise — no GLSL files, inline as template literals in TS.

### 3.3 Motion budget

- Framer Motion for DOM motion (scroll reveals, counters, marquees).
- R3F runs the canvas frame loop (Three.js native).
- All reveals use `whileInView` with `once: true` to keep CPU idle after first paint.
- Cursor parallax computed in canvas via `useFrame` reading a shared ref, not React state.

## 4. Rebrand sweep (Option C — full purge)

### 4.1 Strategy
1. Globals first: `package.json` (name), `README.md`, `next.config.ts`, `lib/env.ts` defaults, `app/layout.tsx` metadata defaults, `public/robots.txt`.
2. Centralize: introduce `lib/branding.ts` with `BRAND_NAME`, `BRAND_TAGLINE`, `BRAND_DOMAIN`, etc. so future renames are one file.
3. Sweep code via Grep → Edit: every `StreamlineOS` → `StreamlineOS`, every `StreamlineOS` → `StreamlineOS`, every `streamlineos` → `streamlineos`, every `streamlineos` → `streamlineos`.
4. Replace `/public/logo.svg` and `app/icon.svg`.
5. Update emails (`lib/email/*`) and PDFs (`lib/*-pdf.ts`).
6. Update server actions (`server/actions/*`).
7. Update Inngest function copy.
8. Update scripts (seed files include hardcoded brand text).
9. PRDs in `tasks/` — bulk-update brand references; preserve historical naming where it's part of a quote.
10. Update notifications (`lib/notifications/*`, `lib/web-push.ts`).

### 4.2 Risk areas
- **Database**: existing seeded data may contain "StreamlineOS" as account names. Scripts will be updated but live databases remain untouched (no automatic migration — that's a separate concern).
- **Comments/identifiers**: variable names like `streamlineosCapitalLogo` will be renamed; unlikely to be referenced externally but watched for in build.
- **Tests**: if any test asserts on the brand string, it'll be updated alongside.

## 5. Implementation order

1. Spec written + committed (this doc).
2. Foundation: fonts wired, palette tokens added to `globals.css`, `components.json` baseColor → `slate` (closest blue-leaning shadcn neutral).
3. Logo + icon assets replaced.
4. `lib/branding.ts` created; brand sweep across code, configs, PRDs, scripts.
5. R3F + drei installed.
6. Motion primitives (`magnetic`, `marquee`, `number-counter`, `tilt-card`).
7. R3F hero scene (glass panels + shader background).
8. All 13 landing sections built and composed.
9. `app/page.tsx` + `app/layout.tsx` updated for fonts + metadata.
10. `pnpm lint` + `pnpm build` clean.

## 6. Testing / verification

- `pnpm lint` — zero errors.
- `pnpm build` — succeeds, no missing module / type errors.
- Hero canvas renders without SSR mismatch warnings.
- All routes still resolve (rebrand didn't accidentally break a route handler).
- Spot-check 5 emails / 2 PDFs render with new brand.
- `grep -ri streamlineos` in repo returns zero hits (excluding `.git`, `node_modules`, `pnpm-lock.yaml`, this spec).
