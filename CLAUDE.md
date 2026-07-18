# CLAUDE.md — StreamlineOS Engineering Constitution v5

> Single source of truth for AI-assisted development on StreamlineOS.
> **Read this file fully before ANY change.** When a rule here conflicts with your
> instinct, this file wins. When two rules conflict, §29 (Precedence) decides.
> Version-sensitive rules are tagged **[verify-version]** — confirm against the repo's
> installed version before enforcing.

---

## 0. Cardinal Rules — non-negotiable (violating any one fails the task)

1. **Inspect before you change.** Explore the real repo — structure, tokens, components, hooks, APIs, schema — before writing a line. Never assume structure; never hallucinate a file, symbol, route, or API you have not confirmed exists.
2. **Reuse before you create.** Use an existing component/hook/service/util (or a variant) before making a new one. Create new only when nothing fits, and minimally.
3. **Work page by page, audit-first.** Only touch the page(s) I name. AUDIT → show a PLAN → wait for my confirmation → then edit.
4. **Business logic lives in the backend, never the frontend.** All REST endpoints, controllers, services, and the DB schema live in the NestJS repo (`streamlineos-api`). The Next.js repo holds UI, client state, and TanStack Query hooks only. (§6)
5. **Authorize at the data layer, on every read AND write, scoped by tenant.** Middleware, client checks, and page redirects are advisory only and are bypassable. Re-assert object-level + tenant access in the service/DAL every time. (§20)
6. **Strict TypeScript, always.** No `any`, no casting hacks, no `@ts-ignore`/`@ts-expect-error`, no `!` non-null assertion abuse. Everything typed against the real backend contract.
7. **Verify before you claim done.** Build passes, lint passes, types pass — every time. Then update `PAGES.md`. "Done" without a green build+lint+types is not done. (§26)
8. **Keep files small and single-purpose.** Soft cap **500 lines / target ≤300** per file; split by responsibility past that. Exceptions in §9.
9. **Leave less code than you found where you can.** Delete dead code, unused components/hooks/APIs/types, and their files. Never add speculative abstractions (YAGNI).
10. **Living rules.** Any new rule/preference/correction I state mid-task is added to this file immediately (correct section, concise), confirmed, and followed from then on.
11. **Git is orchestrator-only.** Orchestrator MAY `commit` verified work on the current branch between tasks. NEVER push/checkout/branch/merge/pull/fetch/reset/stash/rebase. Subagents/workflows run NO git commands ever.

---

## 1. Mission & Stack

Build an enterprise-grade, **multi-tenant** SaaS platform (StreamlineOS): scalable, secure, reliable, maintainable, performant, and production-ready.

**Two repos, hard boundary:**
- **Frontend** — Next.js (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui · TanStack Query (v5) · Zustand · react-hook-form + Zod · Sonner · Framer Motion. Package manager: **pnpm**.
- **Backend (`streamlineos-api`)** — NestJS (REST) · Drizzle ORM · Neon (Postgres) · Redis · Zod validation. **Owns all business logic, APIs, and the DB schema.**

## 2. Core Principles

Never hallucinate · Inspect before changing · Reuse before creating · Simplicity over cleverness · Normalize data · Reduce technical debt · SOLID · DRY · KISS · YAGNI · Secure-by-default · Deny-by-default authorization · Fail fast and loud at boundaries. Think like a CTO + Principal Engineer + Product Manager + Security Engineer + Database Architect — improve the architecture, not just the code.

---

## 3. Workflow (strict — page by page)

- Work **PAGE BY PAGE**; never modify pages I haven't named.
- When I name a page: **AUDIT and show a plan** (change / remove / add). **Wait for confirmation** before editing.
- Ambiguous + structural → **ask briefly** before coding. Don't guess.
- Check `.claude/` rules before starting any task.
- After fixing: run **build + lint + typecheck**, fix all errors, then update `PAGES.md` (mark done + one-line summary).
- When I say **"go"**, pick the next unchecked page in `PAGES.md`.
- **Parallelism:** decompose into independent sub-tasks, dispatch each to a separate subagent via the Task tool, commit between tasks.

## 4. Mandatory Discovery (before coding)

Identify from the actual codebase: Module · Business problem · Entities · Existing schema · Existing APIs · Existing cache keys · Existing RBAC keys/guards · Existing components · Existing services · Existing hooks · A simpler alternative.

## 5. Audit Dimensions (per page/module)

Architecture · Database · API · Cache · Backend · Frontend · UI · UX · Security · Performance · Product completeness. Then implement, then validate.

---

## 6. Frontend ↔ Backend Boundary (architectural backbone)

- **Backend owns ALL APIs & business logic.** Every controller/route handler/business service is written in the NestJS backend only. The frontend holds only UI, client state, and TanStack Query hooks (`lib/api/`) that call the backend.
- **Do NOT add `app/api/**` business routes or `lib/services/**` business logic in the frontend.** The only `app/api/**` allowed are NextAuth / auth-bridge routes.
- **DB schema source-of-truth is the backend:** `backend/src/db/schema/**`. Drizzle config (`backend/drizzle.config.ts`) and migrations (`backend/migrations/`) live in the backend. Run migrations from the backend only: `pnpm -C backend db:generate` · `db:push` · `db:migrate`.
- Frontend keeps a **minimal auth-only** schema at `frontend/lib/db/schema/` (`enums.ts`, `auth.ts`, `shared.ts`) for NextAuth's DrizzleAdapter only. No business-domain tables there.
- **External app integrations (living rule, 2026-07-04):** all third-party app connectivity (calendar, mail, chat, files) goes through **Composio** via the backend `integrations` module (`@composio/core`, server-side only) — never direct provider OAuth flows, never provider access/refresh tokens in our DB. Composio custodies tokens; we mirror only connected-account metadata (`user_integration_connections`). The frontend receives redirect URLs and connection state exclusively from backend endpoints.
- **Retired — do not use:** `pnpm sync:schema`, `pnpm check:schema`.

---

## 7. TypeScript & Code Quality

- Readable, reusable, efficient, clean, extensible, scalable, maintainable, robust, secure. SOLID throughout.
- **`strict: true`** (enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.). Also enable `noUncheckedIndexedAccess`.
- No `any` — use `unknown` + narrowing. No `@ts-ignore`/`@ts-expect-error`. No non-null assertion (`!`) abuse — restructure or use optional chaining / `??`. No casting hacks.
- **Never force types (living rule, 2026-07-11):** don't silence TS with `as SomeShape` / `as unknown as X`. This includes raw `db.execute(sql\`…\`)` results — the rows are `Record<string, unknown>`; read each field through a converter at the use site (`Number(row.count)`, `String(row.month)`, `row?.field ?? fallback`), never `(row[0] as { count: string })`. If a cast feels necessary, fix the source type or the query projection instead.
- **Discriminated unions** for state machines and API responses (shared literal `type`/`status` field), with exhaustive `switch` + `assertNever` default so missing cases fail at compile time.
- **Validate untrusted input at runtime with Zod** at every boundary (API bodies/params, Server Actions, env). Types are compile-time only and do not protect a running endpoint.
- **No anonymous functions for event handlers** — named handlers only.
- **No comments in code.** Remove stray comments, commented-out code, and `console.log`s.
- **Eliminate ALL dead code** and delete its files; verify nothing else imports them.
- Mentally test edge cases before finishing: errors, loading, empty, network failure, invalid input, auth, concurrency, StrictMode double-invoke.

## 8. Component Architecture

- Split into multiple components/files **only when logically necessary** (separation of concerns), never by default.
- **Priority:** `@custom/` or `@shared/` if available → fallback `@ui/` (shadcn/ui). Error/loading/empty states use `@pre-ui/` if it exists, else minimal ones styled from design tokens.
- Always reuse existing components; never create a new one if an existing (or variant) can serve.
- Lazy-load heavy client components (dynamic import). `React.memo`/`useMemo` only for **measured** hot paths.
- **Icons:** Use `@animateicons/react` exclusively. Only use icons available at https://animateicons.in/icons/lucide (248 Lucide) and https://animateicons.in/icons/huge (33 Huge). For any icon not available there, fall back to `lucide-react` static icon — never `@phosphor-icons/react` or any other icon library for new code.
- **Animated icons on hover (living rule, 2026-07-10):** icons on interactive/hoverable surfaces (cards, row action buttons, nav items, popover/sheet triggers) must be the animated components from `@animateicons/react/lucide` (`XxxIcon`) driven by the shared `useAnimatedIcon()` hook (`hooks/common/use-animated-icon.ts` → `{ iconRef, hoverHandlers }`: attach `ref={iconRef}` to the icon, spread `hoverHandlers` on the hoverable element). Static `lucide-react` only for non-interactive icons or icons absent from the animated set. **Canonical helper (living rule, 2026-07-16):** any shadcn `Button` carrying an interactive icon uses `<AnimatedIconButton icon={XxxIcon} …ButtonProps>` (`components/ui/animated-icon-button.tsx` — wires the hook internally, works under `DropdownMenuTrigger asChild`, `iconSize` 14 default/16 for h-4); plain `<button>`/DataTable-cell contexts extract a small named `forwardRef` sub-component calling the hook (hooks can't run in cell callbacks). Animated names differ from lucide (`MoreHorizontal`→`EllipsisIcon`); verify the export exists in `node_modules/@animateicons/react` before importing — `PencilIcon` does NOT exist (keep `Pencil` static). Other wrappers to reuse/extend: `features/knowledge-base/lib/kb-icons.tsx`, `components/layout/sidebar/sidebar-animated-nav.tsx`.
- **Rich text (living rule, updated 2026-07-03):** simple rich-text fields (ticket descriptions, blog, comments) reuse `components/editor/tiptap-editor.tsx` (TipTap on shadcn styling) — extend it rather than adding another simple editor. **Notion-style document surfaces (KB Wiki pages) use Plate (`platejs`, shadcn-based)** under `components/editor/plate/` — do not build document-editor features on TipTap. Lazy-load editors in dialogs/sheets.

## 9. File & Folder Structure + Naming (STRICT)

**Structure:**
- Feature components → `features/<feature>/components/`; feature libs → `features/<feature>/lib/`; feature hooks → `features/<feature>/hooks/`.
- **Banned:** `_components/` and `_lib/` inside `app/` route folders.
- `app/` contains **only** route files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts` (auth-bridge only).
- Cross-feature reusable UI → `components/`; shared hooks → `hooks/`; shared utils → `lib/`; types → `types/` or co-located.
- **Feature-first, not type-first.** Group by business capability; a feature owns its components/hooks/queries/types. Genuinely shared code only goes in the shared roots above.
- Max nesting ~3–4 folders deep. When fixing a page, move misplaced files into this structure and update all imports.
- A feature's public surface is its barrel `index.ts`; import feature internals through it, not by deep path.

**Naming:**
- **kebab-case for all file and folder names** (`project-upsert-form.tsx`, `use-project-list.ts`) — avoids macOS/Linux case bugs in CI.
- React components: PascalCase symbol in a kebab-case file. Hooks: `use-*` file, `useX` symbol. Server-side query/fetch helpers: `get-*`. Zod schemas: `*-schema.ts`.
- Folder/segment names singular where it reads naturally. Route params are **descriptive, never `[id]`** (see §17).

**File size (soft cap — split by responsibility past it):**
- **Target ≤300 lines, hard-review at 500.** Over 500 → split into smaller components/hooks/services unless the file is one of these legitimate exceptions:
  - generated files (Drizzle migrations, generated types/clients),
  - the RBAC permission catalog / role-templates constants,
  - shadcn/ui primitives you haven't modified,
  - `*.d.ts` declaration files.
- Splitting must follow separation of concerns — never split a cohesive unit just to hit a number.

## 10. State, Effects & Data Fetching

- Minimize `useState`/`useEffect`. **NEVER use `useEffect` to trigger API calls** — use TanStack Query (`useQuery` to read, `useMutation` to write) exclusively. `useEffect` is for DOM sync, subscriptions, and framework concerns only.
- Global/shared state: **Zustand** (or the repo's existing manager if different).
- No prop drilling > 2 levels — composition or context.
- Any `useEffect` that fires a mutation/API call/irreversible side-effect MUST guard StrictMode double-invoke:
  ```ts
  const calledRef = useRef(false);
  if (calledRef.current) return;
  calledRef.current = true;
  ```
  Reset the ref only inside a user-initiated retry handler — never unconditionally on re-render.
- All client fetching goes through TanStack Query hooks in `lib/api/` — **no raw `fetch`/`axios` in components.**
- Server Components fetch on the server where possible; TanStack Query only for interactive client needs (mutations, polling, refetch, infinite scroll).

## 11. TanStack Query (v5)

- **Query key factories:** centralize keys and co-locate `queryKey`, `queryFn`, and `staleTime` in one exported `queryOptions` per entity — no hand-typed key arrays scattered around.
- **`staleTime` vs `gcTime`** (note: v5 renamed `cacheTime` → `gcTime`). Calibrate `staleTime` to volatility: session/org ~5min, permissions ~30s, list data ~30s–2min, rarely-changing config longer; live data → `staleTime: 0` + `refetchInterval`. Don't leave everything at the default `staleTime: 0`.
- Every `useMutation` includes a `mutationKey`; every `useQuery` includes a calibrated `staleTime`.
- **Invalidate by true key prefix** (no trailing `undefined` slot) so list caches actually match; use `exact: true` only when you mean it.
- **Optimistic updates:** `onMutate` → `cancelQueries` → snapshot → `setQueryData`; `onError` → roll back from snapshot; `onSettled` → `invalidateQueries`.
- Dedupe identical inflight requests with a shared Promise (token/session fetch) — never let N callers each fire the same call.
- Client request/response types must match the backend Zod contract exactly — no hand-maintained drift (extra fields are silently stripped → silent no-ops).
- **Optimistic writes on interactive surfaces (living rule, 2026-07-10):** inline edits on board/list/card surfaces (assignee, status, priority, type, points, dates, drag-reorder) MUST be optimistic — `onMutate` cancels + snapshots + patches the **exact cache the view renders from** (e.g. the project-detail cache the kanban board reads, not a sibling list cache the view ignores), `onError` rolls back from the snapshot, `onSettled` reconciles. NEVER rely on invalidate-and-refetch for perceived speed, and NEVER invalidate a heavy detail/aggregate query (full project detail, all reports, burndown, velocity) on **every** field change — gate each aggregate behind the specific fields that actually move it, and let it refetch in the background (invalidation is a no-op when the view is unmounted). Resolve related display objects (e.g. the assignee avatar/name) from an already-cached list inside the patch so the card is correct with zero round-trip.
- **Never hydrate a collection through a parent-detail endpoint (living rule, 2026-07-10):** a list/board view must read its rows from a dedicated **paginated, column-projected** endpoint (`GET /projects/:id/tickets`), never from an unbounded `with: { tickets: { … } }` embedded in `GET /projects/:id`. Parent-detail endpoints return only the parent + light metadata (name, key, statuses, members) — never every child row with per-row sub-joins, which re-runs on every mutation invalidation.

## 12. Forms & Validation

- **react-hook-form + Zod** for every form. Per-field validation with visible error messages.
- **Small form → Dialog. Large/multi-section form → Sheet.** Before building either, inspect existing Sheets/Dialogs (UI + UX) and match that format exactly.

## 13. Design System (source of truth: landing, `/signin`, `/signup`)

- Colors, typography, spacing, radius, shadows come **only** from tokens extracted from those pages (`tailwind.config`/`globals.css`). Never invent colors or arbitrary values. Follow shadcn palette conventions mapped to the detected palette.
- Compact, clean layout: remove unnecessary spacing, tighten cards, no oversized padding/margins.
- **UI reference standard:** `/signin` and `/signup` are the canonical reference for compact card layout, consistent hover/active/focus states, and spacing. When fixing or building any new page/sheet/dialog, match their density and interaction patterns; avoid redundant padding/margins (especially in Sheets) and ensure hover text/background maintain readable contrast.
- Modern, mobile-first responsive (verify **375 / 768 / 1280px**), accessible (ARIA, keyboard nav).
- Notifications: **Sonner** toasts for success/error/info.

## 14. Animations & UI Polish

> Current design-token values below. If §13's extracted tokens differ, the extracted tokens win — update this section as a living rule.

- Every page feels like a **$10k+ SaaS product** — polished, dense, purposeful; no default buttons or flat cards. Canonical spec: `UI-UX-SYSTEM.md` (repo root) — read it before any UI work.
- **Extracted-token reality (living rule, reconciled 2026-07-02):** the system is **ink-first** (Linear/Stripe style) — `--primary: #0b1220` slate-900 fills for primary CTAs, `--accent: #3b82f6` blue-500 for links/interactive states, slate-neutral chrome. The violet/indigo gradient CTA style is RETIRED; brand gradients live only on landing/marketing surfaces, never inside the authenticated shell. One primary button per view.
- **Blue replaces purple (living rule, 2026-07-11):** wherever legacy violet/purple/indigo accents are removed or an accent color is needed (progress fills, active tab/nav indicators, icon tints, chart seeds, selection highlights), use the **blue family** (`blue-500`/`blue-600`) — never violet/purple. Emerald/amber/red stay reserved for semantic status only.
- **Theme-accent tokens over literal blue (living rule, 2026-07-13):** the shell now has a multi-theme system (Light/Dark/System × 18 accent palettes in `themes.css`; accents tint ALL neutral chrome via `color-mix` blocks). Interactive accent surfaces (unread indicators/dots/left-bars, selection tints, active filter states, count badges, drag/selected card states) MUST use theme tokens — `bg-primary` solid, `bg-primary/5..15` tints, `border-l-primary`, `--ring` — never hardcoded `blue-*`. The default Ink theme renders pure monochrome; blue may appear only when a blue palette is selected. Literal blue stays only for semantic "info" status and chart seeds. This narrows the 2026-07-11 rule: blue is the replacement for retired violet in semantic/chart contexts, not the color for theme-accent surfaces.
- **Dark mode conformance (living rule, 2026-07-13):** every colored light-tint pairing (`bg-X-50 text-X-700 border-X-200` chips/banners) carries `dark:bg-X-500/10 dark:text-X-300 dark:border-X-500/30`; standalone colored icons carry `dark:text-X-400`. Never hardcode neutral hexes/`bg-white`/`slate-*` chrome — semantic tokens only (they flip in `.dark`). `bg-primary/N` tints are theme-correct (whitish glow in dark Ink is intended monochrome).
- **Framer Motion** for page/step transitions (`AnimatePresence` + `motion.div`, slide+fade), list stagger, entrance.
- Step/route transition: `initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}}`, `duration:0.22, ease:"easeOut"`, in `<AnimatePresence mode="wait">`.
- Selection cards/chips: subtle `hover:shadow-md` + accent border on selected — no scale transforms in dense lists.
- Progress bars animate fill: `transition: width 0.4s ease`.
- Micro-interactions everywhere: hover lift, `whileTap={{scale:0.97}}` on standalone CTAs only.
- **Loading buttons (living rule, 2026-07-10):** every button that triggers a mutation/async action uses the shared `<LoadingButton>` (`components/ui/loading-button.tsx` — wraps `Button`, takes `isPending` → disables + shows a circular `Loader2` spinner, optional `loadingText`). Never hand-roll `disabled={mutation.isPending}` + a `Loader2`/spinner ternary at call sites. Press feedback (`active:scale`) is already built into `Button` via the `press-scale` utility — never re-add it per button.
- **Every authenticated page uses `PageWrapper`** (`components/ui/page-wrapper.tsx`: title, subtitle, eyebrow, badge, backHref, actions, filters). Never `min-h-screen`/page-level gradients/ad-hoc `<h1>` inside the shell.
- **PageWrapper consistency (living rule, 2026-07-07):** keep sibling pages within a module visually uniform. (a) **No `backHref` on a page that has its own sidebar nav entry** — a top-level nav page has nothing to go "back" to; `backHref`/the back arrow is only for nested/detail pages reached from a parent. (b) Use the **default heading `variant`** for standard pages; reserve `variant="display"` for genuine module hero/landing surfaces, applied consistently — don't mix default and display across sibling list pages. (c) Don't surface a bare row **count** in the title `badge` or as the whole `subtitle` ("5 portfolios") unless the user asks; give a descriptive subtitle instead, and keep `badge` for meaningful status labels.
- **Interactive components animate open/close and press.** shadcn/Radix **Dialog** & **Sheet** animate via their `data-[state=open]`/`data-[state=closed]` hooks with `tailwindcss-animate`: Dialog fades + zooms (`fade-in-0 zoom-in-95` in / `fade-out-0 zoom-out-95` out) with an overlay fade; **Sheet** slides from its edge (`slide-in-from-right` / `slide-out-to-right`, matched to the side); dropdowns, popovers, and tooltips fade + zoom from their trigger side. **Buttons** get a hover state (color/shadow lift), `active:scale-[0.98]`, and `whileTap`. Keep it snappy (~150–250ms, `ease-out`) and consistent across the app, and **respect `prefers-reduced-motion`** (fall back to instant/opacity-only).
- Cards (in-shell): `bg-card border border-border rounded-xl shadow-sm` — no backdrop-blur/heavy shadows in the authenticated shell; the glassy `rounded-2xl shadow-xl` card style is for auth/landing surfaces only.
- Full-page backgrounds: the shell owns the background (`--background` slate-50). Pages NEVER repaint it — no `min-h-screen`, no page-level gradients inside `(authenticated)`.
- **Translucent panel fills (living rule, 2026-07-15):** translucent card/panel fills in the shell stay ≥75% card opacity with borders ≥70% opacity (pm-chrome `PM_PANEL`) so panels don't wash out against the canvas. A deeper canvas (`#f4f6fa` + `--border #d7dee8`) was trialed for stronger card lift and rolled back — get an explicit decision before changing surface tokens again.
- **Flat filter toolbars (living rule, 2026-07-15):** filter rows must not wrap Inputs/Selects in an outer `rounded-xl border bg-card` panel — that creates nested cards (fields already use `border-input bg-card`). Use a flat flex row (`PM_TOOLBAR` / Course Library pattern); keep compact groups like `ViewToggle` / `TabsList` as the only bordered chrome. Prefer `FILTER_SELECT_TRIGGER` (`h-8 border-input bg-card`) on filter selects.
- Sequential list entrance: staggered `delay: idx * 0.08`. Success states: spring bounce + confetti where appropriate.

## 15. Layout & States (every page satisfies ALL)

- **Loading:** skeletons matching the real layout, not lone spinners.
- **Empty:** fills available content height (`flex-1`/`h-full`) with icon + message + primary action. Never a small floating block.
- **Empty-state illustrations (living rule, 2026-07-03):** full-page/main-region empty states use a themed SVG component from `components/illustrations` (extend that set in the `_shared.tsx` tokens/style when nothing fits — compositions may be adapted from unDraw, but always shipped as recolored inline components, never raw downloaded SVG files). Icon-only empty states are for compact/table-cell contexts only.
- **Error:** friendly message + retry.
- **Error messages — single global helper (living rule, 2026-07-07):** ALL user-facing error text (toasts, inline form/page errors) goes through the one canonical `getErrorMessage(error: unknown)` in `lib/get-error-message.ts`. **Never** hand-roll `error instanceof Error ? error.message : "…"` ternaries or read `.message` raw at call sites — pass the caught value straight to `getErrorMessage`. `getApiError` is a thin delegate to it; don't reintroduce a second implementation. The helper surfaces the **real backend message** and only substitutes a friendly generic for bare status-lines (`"409 …"`), network failures, or empty errors. The API client (`lib/api-client.ts`) is the **only** place that parses an error response: it extracts the backend `message` (string **or** a NestJS validation `string[]`, joined) and attaches the HTTP `status` to `ApiError` — branch on `isApiError(e) && e.status === …` when you need status-specific UX, never on message-prefix string matching.
- Long content scrolls **inside the main content area only**; sidebar + shell never scroll with the page (sidebar `h-screen sticky`; main `overflow-y-auto`).
- No unintended overflow/scrollbars: `min-w-0`, `truncate`, `flex-1`, proper overflow — not fixed heights that burst.
- Unconnected integration (calendar, payments, …) → clear **"Connect X"** banner with a connect action; never fail silently or render broken data.
- **Show names, never raw IDs (living rule, 2026-07-10):** the UI (cards, tables, CSV/exports, tooltips, activity logs, filter chips) MUST render human-readable labels — a person's display name (via the shared `getUserDisplayName`/`getUserInitials`), a project/ticket title, a status/label name — **never** a raw UUID/numeric FK or an `assigneeId`-style value. Resolve the id to its entity (from an already-cached list where possible) at the display boundary. A visible id in the UI is a bug.
- **Inline contextual AI on detail/record surfaces (living rule, 2026-07-17):** every individual/detail page (KB doc, ticket, lead/deal, support ticket, employee/candidate, product/vendor, invoice/variance, calendar event, blog post, etc.) should offer a compact **inline** AI affordance where it genuinely reduces human effort — never forced/gimmicky AI, never on trivial pages. Use the shared `AiActionsMenu` (`components/ai/ai-actions-menu.tsx` — a Sparkles dropdown of contextual actions → draft result in a sheet via `AiDraftCard`, with built-in loading/quota(402)/permission(403)/error states). Each action reuses the module's EXISTING gateway-backed AI endpoint (add a new one only when none fits); results are draft-first (the user applies, never auto-edit/send/post), credit-metered, and `useCan`-gated. Errors via `getErrorMessage`. Do NOT duplicate the primitive per module — extend `AiActionsMenu`.
- **Edit-in-place on cards/rows (living rule, 2026-07-10):** on board cards and list/table rows, **every** editable field (assignee, status, priority, type, points, labels, cycle, sprint, dates) must be changeable inline via a compact popover — the user should not have to open the detail panel to change a field. Reuse the shared inline field components (`features/projects/views/card-inline-fields.tsx`) and drive them through the optimistic mutation, never a separate non-optimistic path.

## 16. Feature Completeness (per page)

- Verify the page's feature has everything: list, create, edit, delete, filters, pagination, permissions, all states. ADD what's missing; REMOVE what's not required (including files), then fix folder placement + imports.
- **Product-specific (HR):** onboarding/profile forms collect only what a real HR platform asks a new joiner — personal (phone, DOB, gender, home address, emergency contact), bank/payroll, ID & document uploads. Exclude recruitment-only data (years of experience, skills).
- Employee onboarding form is **never** shown to org owners or platform/super admins — gate **server-side** and redirect (owner → setup/dashboard; platform admin → `/owner`).
- **Module-owned surfaces (living rule, 2026-07-02):** custom fields, automations, integrations, and data-hub import/export are module-scoped features — surface them inside each module's own settings area, never as global `/settings/*` pages. Global settings keeps only org-wide concerns (security, billing, roles, modules, org profile).
- **One unified calendar (living rule, 2026-07-11):** `/calendar` is the single calendar surface for every employee. Never build module-specific calendar pages (`/hr/calendar` etc.). Module events (holidays, leaves, birthdays/anniversaries, review cycles, training, travel, interviews) are exposed as toggleable SOURCES inside the global `/calendar` via backend aggregate endpoints.
- **Plan entitlements (living rule, 2026-07-16):** plan tiers are FREE / PAID / ENTERPRISE, resolved server-side from `subscriptions` by `PlanLimitsService` (`backend/src/modules/billing/plan-limits.service.ts`; catalog + LimitKeys in `plan-entitlements.constants.ts`). Every creation endpoint for a limited resource (members, projects, kbPages, chatChannels, crmLeads/Contacts/Deals, supportTickets, automations, signEnvelopes, surveys, acctInvoices) MUST call `assertWithinLimit(orgId, key)` before insert. Paid-only modules (payroll, inventory) are blocked at `setModuleEnabled` on FREE — existing enablement is not retroactively revoked. Frontend reads `GET /billing/entitlements` via `useEntitlements`.
- **Platform billing is exactly 2 pages (living rule, 2026-07-16):** `/billing` (tabbed: Plan + promo code + seats + usage meters · Invoices & Payments · Billing Profile) and `/billing/ai-credits` (wallet, top-up packs, auto-top-up, history). `/settings/subscription` and `/billing/seats` are redirects — never resurrect them. `/billing/invoices` is the org's own customer invoicing (accounting), not platform billing.

---

## 17. Next.js (App Router) — best practices

> **StreamlineOS context (reconcile with §6).** The frontend calls the NestJS backend for all business data and mutations — it owns no business APIs and no business DB. So: Server Components fetch by calling the backend (server-to-server) or the client uses TanStack Query; **business Server Actions / Route Handlers are NOT used here** — the only frontend `route.ts` is NextAuth/auth-bridge, and webhooks/public APIs live in the backend; and the Data Access Layer principle below is a **backend service-layer** rule. The rendering, routing, caching, params, and auth-bridge practices below still apply to the frontend.

**Server / Client boundary**
- Server Components are the default. Add `"use client"` only for state, event handlers, effects, or browser APIs — and push it to the **leaves** of the tree to shrink the client bundle.
- Fetch data in Server Components; pass serializable props to Client Components. Don't fetch in `useEffect` when a server fetch will do.
- A Server Component can't be imported into a Client Component — pass it as `children`. Context providers are Client Components rendered as deep as possible, wrapping Server children via `children`.

**Data fetching & waterfalls**
- Initiate independent requests in parallel (`Promise.all` / preload) — sequential `await`s create waterfalls.
- `fetch` GETs are auto-memoized within a render; wrap non-`fetch` server-side data access (e.g. backend calls) in React `cache()` to dedupe within a render.
- Push fetches down to the components that need them and wrap those in `<Suspense>` rather than fetching at the root.

**Caching [verify-version]** — defaults changed across majors; confirm the installed version:
- Classic layers: Request Memoization (per-render), Data Cache (persistent server), Full Route Cache (static HTML/RSC), Router Cache (client).
- **Next 15:** `fetch` is **uncached by default** — opt in with `cache: 'force-cache'` or `next: { revalidate }`.
- **Next 16 Cache Components:** dynamic by default; opt into caching with `use cache` + `cacheLife` + `cacheTag`. `use cache` scopes can't read `cookies()`/`headers()` — read outside, pass as args.
- **Every mutation pairs with invalidation:** `revalidateTag('post:'+id)` / `revalidatePath(path)` (Next 16: `updateTag` for read-your-writes). Tag specifically — never one global tag. Test caching with `next build && next start`, never `next dev`.

**Server Actions** — treat as public POST endpoints:
- Inside every action: (1) Zod-validate input, (2) verify auth, (3) verify object-level + tenant authorization. Client validation is UX only.
- Keep any such action thin — it calls the NestJS backend and handles only Next-specific concerns (`revalidateTag`/`revalidatePath`); it holds no business logic or DB access. Webhooks and public APIs live in the backend (§6), not in frontend Route Handlers.

**Routing & params [verify-version]**
- `params`/`searchParams` are Promises — `const { projectId } = await params`. Validate bracket-folder params as untrusted input.
- **Descriptive route params, never `[id]`.** Backend (`:projectId`) and frontend (`app/(authenticated)/projects/[projectId]`) match, and the destructured variable matches.

**Rendering, assets, errors**
- `next/image` for images, `next/link` for nav, `next/font` to self-host fonts (no layout shift), `next/script` with an explicit strategy for third-party JS. Static assets in `public/`.
- `error.tsx` (segment) with `reset()`, `global-error.tsx` (root), `not-found.tsx` (404). Log details server-side; production hides raw error text.
- Minimize client bundle via dynamic imports / code splitting; keep client components small.

**Middleware — NOT for authorization**
- Middleware is bypassable (CVE-2025-29927). Use it only for optimistic redirects / locale / coarse routing UX; **re-verify auth at the data layer.** Keep Next.js patched (≥15.2.3 / ≥14.2.25) and strip `x-middleware-subrequest` at the proxy.

**Env & secrets**
- Env vars are server-only except `NEXT_PUBLIC_`-prefixed (inlined into the client bundle) — never put a secret behind that prefix. Only server/DAL code reads secrets.

**Data Access Layer (DAL) — backend service-layer rule**
- In the NestJS backend, centralize business data access in a service layer. Each function: verify session, verify object-level + tenant authorization, use explicit `select` (never `select *`), return minimal DTOs (never raw ORM rows). On the frontend, the only server-side data surface is the NextAuth auth-bridge (auth-only schema, §6) and `require-permission.ts` (which calls the backend `/me/access`); mark such frontend server modules `import 'server-only'` and keep DB packages + secret env vars out of client code.

## 18. Backend (NestJS)

- **Thin controllers; services own business logic.** One controller per resource/domain.
- **DTO validation:** register a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` in `main.ts` (Zod pipe is an acceptable alternative). `whitelist` strips undeclared props (blocks mass-assignment); `forbidNonWhitelisted` 400s unknown props; `transform` builds DTO instances + coerces types.
- **Guards** for authN/authZ; attach metadata with custom decorators + `Reflector`; deny by default. **Interceptors** for logging/timing/response shaping; **Pipes** for validation/transform; a **global Exception Filter** for a consistent JSON error envelope (log full error server-side, return generic message).
- **Serialization:** `ClassSerializerInterceptor` + `@Exclude()` at class level, `@Expose()` only returned fields; `@Exclude({ toPlainOnly: true })` for secrets like `password`. Never leak sensitive columns.
- **Config:** `@nestjs/config` global + startup `validationSchema` (required vars `.required()`, `NODE_ENV` enum, sensible defaults). Fail fast on missing/invalid config. `.env` out of git; commit `.env.example`.
- **Stateless handlers** (safe for horizontal scaling) · `async/await` everywhere, never block the event loop · structured logging · global error handling · graceful shutdown hooks · `/health` via `@nestjs/terminus`.
- **HTTP semantics:** GET/HEAD are safe + idempotent — no writes in a GET. State changes via POST/PATCH/DELETE.
- **API versioning** (URI/header) · cursor-based pagination for live data · consistent filter/sort conventions.
- **Idempotency:** mutating endpoints accept a client `Idempotency-Key`; store first result keyed by (key + tenant), replay it on retry, 409 while in-flight, compare params and error on mismatch, expire after a TTL.

## 19. Database (Drizzle + Neon)

- **Normalize lifecycle entities** — invitations, members, approvals, comments, notifications, audit logs, tasks, events, documents → each its own table with PK, `tenant_id`/`org_id` FK, `status`, `created_at`, indexes. **Never JSONB arrays** for these (can't be individually indexed, paginated, atomically updated, or soft-deleted).
- Every table: UUID or identity PK (prefer `generatedAlwaysAsIdentity()` over `serial`). Every tenant-scoped table: non-nullable `org_id`/`tenant_id` FK with index. Money as integer cents, never float.
- **Tenant-scoped uniqueness is composite (living rule, 2026-07-07):** any "unique per org" business key (project `key`, SKU, code, slug, name-within-tenant) MUST use a composite `uniqueIndex(org_id, <col>)` — **never** a bare global `.unique()` on the column alone. A global unique lets one tenant's value (e.g. project key `STRE`) block every other org from using it — a cross-tenant DoS + info leak. (Fixed 2026-07-07: `projects.key` `.unique()` → `uniqueIndex("uniq_projects_org_key").on(orgId, key)`, migration `0175`.) Always catch the resulting DB `23505` in the service and throw a friendly `ConflictException` (→ 409), never let it surface as an unhandled 500.
- **Composite indexes ordered most-selective-first**, leading with `org_id`/`tenant_id`; e.g. `(org_id, status, created_at DESC)`. Index every FK. No full-table scans.
- Select only needed columns. **No N+1** — proper joins / relational `with`. Prepared statements (`sql.placeholder`) for hot queries. Multi-step writes in a **single transaction** (`db.transaction`, pass `tx` down). Atomic upserts (`INSERT … ON CONFLICT DO UPDATE`) for counters/idempotent creates; counters need a unique `(org, resource, actor)` index + upsert.
- **Free-text search:** `to_tsvector` + GIN (or `pg_trgm`) — never leading-wildcard `ILIKE`.
- **All list endpoints paginated**, hard cap **100/page** (public included). **Soft-delete** with `deleted_at`.
- **Migrations:** `generate` + `migrate` in CI (durable, auditable); `push` for local dev only. Never hand-edit generated SQL — regenerate. Additive migrations: add nullable → backfill in batches → add NOT NULL; build indexes concurrently on large tables; one purpose per migration; name constraints/indexes explicitly.

## 20. Security (OWASP API Top 10 — 2023)

- **A01 BOLA (the #1 API risk):** every endpoint taking a resource id re-asserts the caller's access to **that specific object** (org + record) on **reads AND writes** — role/module ability alone is insufficient. Centralize in an access service; call it in every mutating method. Test with two accounts (A can't touch B's data).
- **A02 Broken Authentication:** integrate the repo's existing auth (sessions/JWT/OAuth) — never a parallel path. Account lockout + rate limiting on login; generic auth-failure messages.
- **A03 BOPLA (Excessive Data Exposure + Mass Assignment):** allowlist input (DTO `whitelist`) and output (DTO/serialization). Reject/ignore client-sent protected fields (`role`, `isAdmin`, `orgId`).
- **A04 Unrestricted Resource Consumption:** rate limits, quotas, timeouts, payload caps, pagination caps. **AI/LLM metering:** reserve/consume credits **atomically BEFORE** the paid call; refund only on provider failure — never check-then-spend. Anonymous traffic must never spend the shared LLM budget (**denial-of-wallet**); short-circuit before embedding when the org has no eligible content.
- **A05 Broken Function Level Authorization:** role/permission checks on privileged/admin routes via Guards; deny by default.
- **A06 Sensitive Business Flows:** bot mitigation / rate limiting on abusable flows (signup, purchase).
- **A07 SSRF:** never fetch user-supplied URLs without an allowlist; block internal/metadata endpoints.
- **A08 Security Misconfiguration:** Helmet headers, strict CORS to known origins, disable verbose errors/docs in prod, secure defaults, avoid inline styles/scripts (CSP-friendly). HTTPS-only assumptions (secure cookies, no mixed content).
- **A09 Improper Inventory Management:** track and retire old API versions / zombie endpoints.
- **A10 Unsafe Consumption of APIs:** validate + sanitize responses from third-party/upstream services.
- **Tenant isolation (defense in depth):** every tenant table has `tenant_id` + leading composite index; every query scoped by tenant. Prefer **Postgres RLS** as a DB-enforced backstop (`FORCE ROW LEVEL SECURITY`, `USING` + `WITH CHECK` policies against a per-request GUC set via `SET LOCAL` in a transaction; app role lacks `BYPASSRLS`). A forgotten `WHERE` must not become a breach.
- **AuthZ placement (by layer, see §21):** the **backend** gates every protected endpoint with `@RequirePermission` + `PermissionGuard` (server-resolved via `AccessService`); **frontend** server components / auth-bridge routes use `requirePermission()` (which calls the backend `/me/access`). Client checks and `middleware.ts` are UX only and never sufficient.
- **Input/output:** validate all input (Zod); parameterized queries via the ORM only (no injection); sanitize rendered HTML (XSS); secure cookies (`httpOnly`, `Secure`, `SameSite`); Server Actions get Origin/Host checks, Route Handlers need manual CSRF.
- **Passwords:** **Argon2id** (min m=19456 KiB, t=2, p=1); scrypt/bcrypt (work factor ≥10, 72-byte limit) only as fallback. Unique salt per password. Never fast hashes (MD5/SHA-256) for passwords.
- **Secrets & supply chain:** no hard-coded secrets — validated env vars only; only the DAL reads secrets. Validate file uploads. Log sensitive actions without exposing data. Audit dependencies (`pnpm audit` + SCA); keep Next.js patched.

## 21. RBAC Engine — server-resolved (read before adding ANY feature)

Permissions are resolved from the DB on **every request** via `AccessService`. **CASL is fully removed from the backend.** The frontend keeps `lib/abilities.ts` only as a lightweight (NON-CASL) server-side SSR helper.

> **Verified against repo (2026-07-03):** decorator import is `../access/require-permission.decorator`; `ROLE_DEFAULT_PERMISSIONS` lives in `permissions.constants.ts` (not role-templates); scope helper is `applyScope(scope: DataScope, userId: string, cols: ScopeColumns): SQL` in `modules/access/apply-scope.ts`; `bumpPermissionsVersion(tx, orgId)` is a standalone helper in `common/rbac/access-invalidate.ts`; permission resolution is `AccessService.resolveUserPermissions(orgId, userId)`.
> **Verified against repo (2026-07-18):** `PermissionGuard` denies guarded handlers without `@RequirePermission`, exempts an explicit `@Public` route only when no permission metadata exists, and reaches the org-owner/platform-admin bypass only after permission metadata is present. Explicit permissions still run on non-JWT authentication routes that use `@Public` to bypass only the global JWT guard. JWT-only routes do not apply `PermissionGuard`; a controller-wide metadata audit verifies every guarded non-public route has a cataloged permission.

### Permission key format
`"module:resource:action"`, three lowercase colon-separated segments (`"hr:employees:view"`). `action` ∈ {view, create, update, delete, manage, assign, export, approve, reject, import}. Resolved via `GET /me/access` — **never** in JWT claims.

### Key files (do not delete)
- `backend/src/modules/rbac/permissions.constants.ts` — permission catalog + `ROLE_DEFAULT_PERMISSIONS` (source of truth).
- `backend/src/modules/rbac/role-templates.constants.ts` — role templates.
- `backend/src/common/rbac/access-invalidate.ts` — standalone `bumpPermissionsVersion(tx, orgId)`.
- `backend/src/db/schema/access.ts` — RBAC schema (backend source of truth).
- `backend/src/modules/access/access.service.ts` — `resolveUserPermissions`; caches per `(userId, orgId)`; degrades pre-migration.
- `backend/src/modules/access/permission.guard.ts` — `PermissionGuard` (reads `@RequirePermission`, sets `req.rbacScope`).
- `backend/src/modules/access/apply-scope.ts` — `applyScope` helper.
- `frontend/lib/api/hooks/access.ts` — `useAccess`, `useCan`, `useModuleEnabled`.
- `frontend/components/auth/can.tsx` — `<Can permission="…">`, `<RequireModule module="…">`.
- `frontend/lib/abilities.ts` — lightweight NON-CASL server-side `AppAbility`.
- `frontend/lib/rbac/require-permission.ts` — server-side page permission check.
- `backend/src/scripts/backfill-rbac-access.ts` — seeds default grants (run once after migration).

### Add a protected backend endpoint
1. Add the key(s) to `permissions.constants.ts`; if a role default, add to `ROLE_DEFAULT_PERMISSIONS`.
2. Decorate the controller method:
   ```ts
   @UseGuards(JwtAuthGuard, PermissionGuard)
   @RequirePermission("newmodule:resource:view")
   @Get()
   async list(@Req() req: RequestWithUser) { ... }
   ```
3. List endpoints — apply DataScope. Create `newmodule-scope.ts`, read `req.rbacScope` in the service, filter:
   ```ts
   if (scope === "own")  return { ...query, assignedToId: actor.userId };
   if (scope === "none") return { ...query, assignedToId: -1 };
   return query; // "all"/"team" handled upstream
   ```
4. Every role/permission mutation calls `bumpPermissionsVersion` in the same transaction:
   ```ts
   await this.db.transaction(async (tx) => {
     await tx.insert(rolePermissionGrants).values(...);
     await bumpPermissionsVersion(tx, orgId);
   });
   ```
5. Bust the access cache for `(userId, orgId)` in any service that changes role assignments/grants.

### Frontend gates
- Client: `const canCreate = useCan("newmodule:resource:create");`
- Declarative: `<Can permission="newmodule:resource:delete"><DeleteButton/></Can>`
- Module on/off: `<RequireModule module="newmodule">…</RequireModule>` / `useModuleEnabled("newmodule")`
- Server page: `const { session } = await requirePermission("newmodule:resource:view");`
- New keys auto-appear in `/settings/roles` (reads `GET /rbac/permissions`) — no frontend change.

### DB migration for RBAC schema
Edit `access.ts` → `pnpm -C backend db:generate` → `db:push`/`db:migrate` (needs TTY + enums `data_scope`, `principal_group_type`) → after first deploy `pnpm -C backend backfill:rbac`.

### Runtime notes
- Tables `user_roles`, `role_permission_grants`, `group_roles`, `access_versions` must exist; `AccessService` degrades pre-migration.
- Org owners (`isOrgOwner`) and platform/super admins (`isPlatformAdmin`) bypass all checks.
- Resolution cached per `(userId, orgId)` in Redis with TTL; busted by `bumpPermissionsVersion`.
- `DataScope`: `"all"` · `"team"` (same dept) · `"own"` (`assignedToId === userId`) · `"none"` (deny).

### RBAC — NEVER
- Never `@CheckAbility`/`AbilityGuard`/`useAbility()` (CASL, deleted).
- Never import `@casl/ability`, `@casl/react`, `@/lib/abilities-context` (deleted).
- Never `requireAuthorize(...)` or `hasRoleOrPrivileged` (old helpers, deleted).
- Never put permission checks in JWT claims — resolve server-side via `/me/access`.
- Never read `req.user.permissions` for access decisions — use `PermissionGuard` + `AccessService` (JWT is stale; DB is authoritative).
- Never skip `@RequirePermission` on a protected endpoint.
- Never add a permission without a catalog entry.
- Never skip `bumpPermissionsVersion` when mutating role/permission tables.

---

## 22. Caching (system-wide)

- **Backend:** Redis for read-heavy data with **explicit invalidation on every mutation**. Public read-only GETs set `Cache-Control` (`s-maxage` + `stale-while-revalidate` per volatility).
- **Frontend:** TanStack Query `staleTime` per §11.
- **Never cache user/permission-scoped data in a shared cache.**

## 23. Performance

Bundle size · lazy loading · dynamic imports · query optimization · cache efficiency · deduped requests · parallel (not sequential) data fetching · granular Suspense streaming.

- **AI endpoint efficiency (living rule, 2026-07-16):** every AI endpoint must be super efficient end-to-end. Assemble prompt context in the fewest queries possible (`Promise.all` for independent fetches, explicit column projection, hard caps on row counts and text lengths — never dump whole entities into prompts). Default to the fast/cheap model tier and cap max output tokens per feature; use the standard tier only where quality demonstrably requires it. Short-circuit BEFORE any provider call when the org/user has no eligible context. Never re-embed unchanged content (content-hash guard). Dedupe identical in-flight AI requests. Cache derived AI context/results tenant-scoped with explicit invalidation where staleness is acceptable. Vector queries always run against a proper ANN index (HNSW). Every AI call records latency/tokens/cost through the AI gateway.

## 24. Reliability & Future-Proofing

- **Deny by default; fail fast at boundaries.** Validate every external input; return typed, consistent errors.
- **Idempotent + transactional writes** so retries are safe (§18, §19).
- **Stateless services** so horizontal scaling and redeploys are safe.
- **Depend on abstractions across feature boundaries; one-directional dependency flow** (features → shared, never shared → features). No circular dependencies.
- **Version-sensitive rules tagged `[verify-version]`** — re-check against installed versions rather than assuming. Prefer additive, backward-compatible schema and API changes.
- **Prefer boring, well-supported patterns** over experimental APIs in production paths; isolate anything experimental behind a clear seam.

## 25. Refactoring & Dead-Code

Remove dead/duplicate code, unused schemas/APIs/hooks/components/types — and delete their files, verifying nothing still imports them. Don't abstract prematurely; extract an abstraction only once real duplication reveals its shape.

## 26. Definition of Done

Build ✓ · Lint ✓ · Types ✓ · CRUD complete · RBAC complete (gated + scoped) · Tenant-scoped queries ✓ · Caching correct + invalidated on mutation · Responsive (375/768/1280) · Accessible · Secure (BOLA re-asserted, inputs validated, no secrets leaked) · Tests present (§27) · No file over the 500-line cap without a §9 exception · `PAGES.md` updated.

## 27. Testing

- A new module ships **controller e2e specs** (auth + RBAC + scope allow/deny, credit exhaustion, cross-tenant isolation) **and** unit tests for access/credit/permission logic **before** it's done.
- Unit-test services with mocked providers; e2e-test controllers. Code must be implicitly testable; add minimal tests when the repo has a test setup.

## 28. Output Format

- **Audit step:** concise plan listing violations found + intended changes. Wait for confirmation.
- **Fix step:** only modified/added/deleted file paths with their changes. No long prose unless justifying a decision.
- Always be able to state: Findings · Root cause · Recommended solution · Files changed · Validation.

## 29. Precedence (conflict resolution)

1. My explicit instruction in the current turn.
2. Cardinal Rules (§0).
3. This file's specific sections over its general principles.
4. The repo's established, consistent pattern over anything ambiguous here — and when you rely on it, tell me so we codify it as a living rule.

When genuinely unsure and the choice is structural, **ask briefly** rather than guess.
