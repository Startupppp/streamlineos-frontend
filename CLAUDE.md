# CLAUDE.md — StreamlineOS Engineering Constitution v5

> Read fully before ANY change. This file wins over instinct; §29 resolves conflicts.
> **[verify-version]** = re-confirm against the installed version before enforcing.
> Visual/UI matters defer to `UI-UX-SYSTEM.md`.

---

## 0. Cardinal Rules — violating one fails the task

1. **Inspect before you change.** Confirm every file, symbol, route, API, and schema exists. Never assume, never hallucinate.
2. **Reuse before you create.** New code only when nothing existing fits, and minimally.
3. **Page by page, audit-first.** Touch only pages I name: AUDIT → PLAN → my confirmation → edit.
4. **Business logic is backend-only.** All REST/controllers/services/schema live in `streamlineos-api`. Frontend = UI, client state, Query hooks. (§6)
5. **Authorize at the data layer** on every read AND write, scoped by tenant. Middleware, client checks, and redirects are advisory and bypassable. (§20)
6. **Strict TypeScript.** No `any`, no casting hacks, no `@ts-ignore`/`@ts-expect-error`, no `!` abuse.
7. **Verify before "done".** Types pass (build where it is the only proof), then update `PAGES.md`. (§3, §26)
8. **Small files.** Target ≤300 lines, hard review at 500; split by responsibility. Exceptions in §9.
9. **Leave less code than you found.** Delete dead code and its files. No speculative abstractions (YAGNI).
10. **Living rules.** Any rule or correction I state mid-task is added here immediately, in the right section, and followed from then on.
11. **Git is orchestrator-only.** MAY `commit` verified work on the current branch between tasks. NEVER push/checkout/branch/merge/pull/fetch/reset/stash/rebase. Subagents run no git commands.

## 1. Mission & Stack

Enterprise-grade **multi-tenant** SaaS (StreamlineOS): scalable, secure, reliable, maintainable, performant.

- **Frontend** — Next.js App Router · TypeScript strict · Tailwind · shadcn/ui · TanStack Query v5 · React Context · react-hook-form + Zod · Sonner · Framer Motion · **pnpm**.
- **Backend (`streamlineos-api`)** — NestJS REST · Drizzle · Neon Postgres · Redis · Zod. **Owns all business logic, APIs, and schema.**

## 2. Core Principles

Never hallucinate · Inspect before changing · Reuse before creating · Simplicity over cleverness · Normalize data · SOLID · DRY · KISS · YAGNI · Secure-by-default · Deny-by-default authz · Fail fast at boundaries. Think CTO + Principal Engineer + PM + Security Engineer + DB Architect: improve the architecture, not just the code.

---

## 3. Workflow

- Work **page by page**. When I name a page: audit, show a plan (change/remove/add), **wait for confirmation**.
- Ambiguous + structural → ask briefly. Don't guess. Check `.claude/` rules first.
- **`tsc --noEmit` is the default proof and always allowed. Never run lint or tests unless I explicitly ask** — they are slow and I decide when they are worth it. Report them as *not run*, never as passing.
- After fixing: typecheck (and `next build` where it is the only way to prove the change), then update `PAGES.md`.
- **"go"** = take the next unchecked page in `PAGES.md`.
- **Parallelism:** decompose into independent sub-tasks, one subagent each, commit between tasks.

## 4. Mandatory Discovery (before coding)

From the real codebase, identify: module · business problem · entities · existing schema, APIs, cache keys, RBAC keys/guards, components, services, hooks · a simpler alternative.

## 5. Audit Dimensions

Architecture · Database · API · Cache · Backend · Frontend · UI · UX · Security · Performance · Product completeness → implement → validate.

---

## 6. Frontend ↔ Backend Boundary

- **Backend owns ALL APIs and business logic.** Frontend holds UI, client state, and Query hooks only.
- **No `app/api/**` business routes, no `lib/services/**` business logic in the frontend.** The only frontend `route.ts` is NextAuth / auth-bridge.
- **Schema source of truth: `backend/src/db/schema/**`.** Drizzle config + `backend/migrations/` live in the backend; run migrations there only (`pnpm -C backend db:generate | db:push | db:migrate`).
- **The frontend has NO database access at all.** No DB client, schema, adapter, or migration — NextAuth runs `strategy: "jwt"` and every lookup goes through the backend. Server components fetch with the session's `backendJwt` (canonical: `lib/rbac/get-server-access.ts`).
- **Third-party app connectivity goes through Composio** via the backend `integrations` module (server-side only) — never direct provider OAuth, never provider tokens in our DB. We mirror only connection metadata (`user_integration_connections`); the frontend gets redirect URLs and state from backend endpoints.
- **Identity comes from the bearer token, never the client (living rule, 2026-08-03):** `JwtAuthGuard` sets `req.user.userId` (JWT `sub`) and `req.user.orgId` on every authenticated request — read them with `@CurrentUser()`, and never accept them from the caller. The frontend MUST NOT send its own user id or the active org id as a query param, body field, or path segment: a client-supplied `orgId` is a cross-tenant hole, a client-supplied actor id (`userId`/`actorId`/`createdById`/`authorId`) is impersonation. Self-scoped reads get a `/me` route (`PATCH /me/profile`, `GET /onboarding/me`, `GET /hr/onboarding-docs/me`) — never `?userId=<self>`. Still legitimate to send: a DIFFERENT person's id (invite recipient, assignee, member being administered), a DIFFERENT org's id (`POST /organization/switch`, membership-checked), `@Public()` routes where the URL `orgId` is the only tenant selector, and client-only values (Query cache keys, `localStorage` namespacing, realtime channel names).
- **An optional `userId` filter that widens scope must be authorized — and verify the gate actually bites (living rule, 2026-08-03):** `if (query.userId) where(userId = query.userId)` with no check lets any holder of the *read* key read anyone; with no filter at all it returns the whole org. Force the filter to the caller unless they hold the widening permission, and CONFIRM that permission excludes the roles holding the read key — `hr:employees:manage` sits beside `hr:employees:view` in HR_ADMIN/BRANCH_HR/RECRUITER, so gating on `manage` there is a no-op; gate on the scopable key's DataScope instead. (Fixed 2026-08-03: employees stats/projects/tickets, sales commissions/quotas, hr helpdesk list.)
- **Retired — do not use:** `pnpm sync:schema`, `pnpm check:schema`.

## 7. TypeScript & Code Quality

- `strict: true` + `noUncheckedIndexedAccess`. No `any` (use `unknown` + narrowing), no `@ts-ignore`, no `!` abuse, no casting hacks.
- **Never force types.** No `as SomeShape` / `as unknown as X`. Raw `db.execute(sql\`…\`)` rows are `Record<string, unknown>` — convert at the use site (`Number(row.count)`, `String(row.month)`, `row?.field ?? fallback`). If a cast feels necessary, fix the source type or the query projection.
- **Discriminated unions** for state machines and API responses, with exhaustive `switch` + `assertNever`.
- **Zod-validate every untrusted boundary** (API bodies/params, env). Types are compile-time only.
- **Zod schemas live in `*-schema.ts` files** beside the feature (frontend) or in the module's `dto/` (backend) — never inlined in a controller, route, component, or hook. Derive the type with `z.infer`; never hand-maintain a parallel `interface`. Trivial single-field guards may stay inline.
- **Named event handlers only** — no anonymous functions.
- **Single-statement `if`/`for` bodies omit the curly braces (living rule, 2026-08-08);** braces return the moment a body has two statements.
- **No comments in code.** Remove stray comments, commented-out code, `console.log`s.
- **Delete all dead code and its files**, verifying nothing imports them.
- Mentally test edge cases before finishing: error, loading, empty, network failure, invalid input, auth, concurrency, StrictMode double-invoke.

## 8. Component Architecture

- Split into files only when separation of concerns demands it, never by default.
- **Priority:** `@custom/` or `@shared/` → `@ui/` (shadcn). Error/loading/empty from `@pre-ui/` if present, else minimal token-styled ones.
- Lazy-load heavy client components. `React.memo`/`useMemo` only for **measured** hot paths.
- **Icons:** `@animateicons/react` only (248 Lucide + 33 Huge at animateicons.in); anything absent falls back to a static `lucide-react` icon. Never `@phosphor-icons/react` or any other library in new code.
- **Interactive icons are animated.** Icons on hoverable surfaces (cards, row actions, nav, popover/sheet triggers) use `@animateicons/react/lucide` driven by `useAnimatedIcon()` (`hooks/common/use-animated-icon.ts` → `{ iconRef, hoverHandlers }`). Any shadcn `Button` with an interactive icon uses `<AnimatedIconButton icon={XxxIcon} …>` (`components/ui/animated-icon-button.tsx`; works under `DropdownMenuTrigger asChild`; `iconSize` 14 default / 16 for `h-4`). Plain `<button>` and DataTable cells extract a small `forwardRef` sub-component (hooks can't run in cell callbacks). Animated names differ from lucide (`MoreHorizontal`→`EllipsisIcon`) — verify the export exists in `node_modules/@animateicons/react`; **`PencilIcon` does not exist** (keep `Pencil` static).
- **Rich text:** simple fields (ticket descriptions, blog, comments) reuse `components/editor/tiptap-editor.tsx` — extend it, don't add another. Notion-style document surfaces (KB Wiki) use Plate under `components/editor/plate/`. Lazy-load editors in dialogs/sheets.

## 9. File & Folder Structure + Naming (STRICT)

**Structure**
- Feature code → `features/<feature>/{components,lib,hooks}/`. **Banned:** `_components/`, `_lib/` inside `app/`.
- `app/` holds route files only: `page/layout/loading/error/not-found.tsx`, `route.ts` (auth-bridge only).
- Cross-feature UI → `components/`; shared hooks → `hooks/`; shared utils → `lib/`; types → `types/` or co-located.
- **Feature-first, not type-first.** A feature owns its components/hooks/queries/types and exposes them through its barrel `index.ts` — import through the barrel, not deep paths. Max ~3–4 folders deep. Move misplaced files when fixing a page and update imports.
- **Name the module for the module, the entity service for the entity.** Build sub-domains are `BuildQaModule`, `build-approvals.module.ts` — never `Projects*` (QA/forms/incidents are not projects). But `build/core/` keeps `ProjectsService` because it manages the **`projects` entity**, and `project` ≠ `product` ≠ Build module (§16).
- **Backend module folders nest, never hyphen-flatten:** `modules/<module>/<subdomain>/` plus `core/` for the module's own controllers/services (e.g. `build/{core,approvals,qa,teams,…}/`). **Never `modules/<module>-<subdomain>/`.** Full rule in §18.
- **Backend schema folders:** `db/schema/` = `common/` (enums, auth, organization, access, shared, notifications, workflow, integrations, idempotency, outbox) + one folder per business module, each with an `index.ts`. Consumers import only from the root barrel `db/schema`. Folder names match the real domain, never codenames. Remove dead schema files in any reorg.

**Naming**
- **kebab-case for all files and folders** (avoids macOS/Linux case bugs in CI). PascalCase component symbol in a kebab-case file; hooks `use-*`/`useX`; server fetch helpers `get-*`; Zod `*-schema.ts`.
- Folder/segment names singular where it reads naturally. **Route params are descriptive, never `[id]`** (§17).

**File size**
- Target ≤300 lines, hard review at 500 → split by responsibility. Exceptions: generated files (migrations, generated types/clients), unmodified shadcn primitives, `*.d.ts`.
- **Permission catalogs are folders, not files** — one file per business module behind a barrel: backend `modules/rbac/permissions/` (`hr.ts`, `crm.ts`, `build.ts`, … + `role-defaults.ts` + `index.ts`), frontend `lib/rbac/permissions/`. Never reintroduce a monolithic `permissions.constants.ts`. A single cohesive catalog artifact may exceed 500 lines rather than be split artificially.
- **The two catalogs must not drift.** Every frontend `PermissionKey` must exist in the backend catalog and vice versa — a frontend-only key silently fails `useCan` forever; a backend-only key can't be gated.

## 10. State, Effects & Data Fetching

- Minimize `useState`/`useEffect`. **NEVER use `useEffect` to trigger API calls** — TanStack Query only (`useQuery` to read, `useMutation` to write). `useEffect` is for DOM sync, subscriptions, and framework concerns.
- **Zustand is NOT installed; do not add it.** TanStack Query owns all server state; genuinely shared client state uses **React Context**, co-located with its feature. Never add a state library to satisfy a doc.
- No prop drilling > 2 levels — composition or context.
- Any `useEffect` firing a mutation or irreversible side-effect guards StrictMode double-invoke with a `calledRef`, reset only inside a user-initiated retry handler.
- All client fetching goes through Query hooks in `lib/api/` — **no raw `fetch`/`axios` in components.** Server Components fetch on the server; Query is for interactive needs (mutations, polling, refetch, infinite scroll).

## 11. TanStack Query (v5)

- **Query key factories:** centralize keys; co-locate `queryKey` + `queryFn` + `staleTime` in one exported `queryOptions` per entity. No hand-typed key arrays.
- **Every query key should carry the active org id.** `lib/query-keys.ts` roots every key at `["streamlineos"]` with no tenant segment, so a two-org user shares one cache across a switch and sees Org A's rows in Org B. The org id belongs in `base`, not per-factory. Until that lands, an org switch MUST `queryClient.clear()` — `useSwitchOrg` and the leave/delete-org paths already do; that is the regression to guard. Same discipline for any `localStorage` cache holding org-scoped data (key it by org, or clear on switch).
- **Calibrate `staleTime`** to volatility (session/org ~5min, permissions ~30s, lists ~30s–2min, live data `0` + `refetchInterval`). Note v5 renamed `cacheTime` → `gcTime`. Every `useMutation` has a `mutationKey`; every `useQuery` a calibrated `staleTime`.
- **Gate every query by the caller's access.** A query hitting a permission- or module-gated endpoint sets `enabled: useCan("<the endpoint's exact @RequirePermission key>")` (plus a module check where `@RequireModule` applies). **Never fire an API the user's role cannot access** — it 403-spams and burns Neon CPU. This matters most on globally-mounted surfaces (shell, sidebar, header, banners, checklists, providers) and dashboard widgets, which mount for everyone. The frontend gate must match the backend key exactly. **Clobber pitfall:** never re-declare `enabled` after the `...options` spread — it silently overrides every caller's gate. Combine: `enabled: !!orgId && (options?.enabled ?? true)`.
- **Invalidate by true key prefix** (no trailing `undefined` slot); `exact: true` only when you mean it.
- **Optimistic updates:** `onMutate` → `cancelQueries` → snapshot → `setQueryData`; `onError` → roll back; `onSettled` → invalidate.
- **Dedupe identical inflight requests** with a shared Promise (token/session fetch).
- Client request/response types match the backend Zod contract exactly — drift silently strips fields into no-ops.
- **Inline edits on board/list/card surfaces MUST be optimistic** — patch the **exact cache the view renders from**, roll back on error, reconcile on settled. Never rely on invalidate-and-refetch for perceived speed, and never invalidate a heavy detail/aggregate query on every field change — gate each aggregate behind the fields that actually move it. Resolve related display objects (assignee avatar/name) from an already-cached list inside the patch.
- **Never hydrate a collection through a parent-detail endpoint.** Lists/boards read from a dedicated **paginated, column-projected** endpoint (`GET /projects/:id/tickets`), never an unbounded `with: { tickets: … }` on `GET /projects/:id`. Parent-detail returns the parent + light metadata only.

## 12. Forms & Validation

- **react-hook-form + Zod** for every form, with per-field visible errors.
- **Small form → Dialog. Large/multi-section form → Sheet.** Match the existing Sheets/Dialogs exactly (§7 of `UI-UX-SYSTEM.md`).

## 13. Design System (source of truth: landing, `/signin`, `/signup`)

- Colors, typography, spacing, radius, shadows come **only** from tokens in `tailwind.config`/`globals.css`. Never invent colors or arbitrary values.
- `/signin` and `/signup` are the canonical reference for compact card layout, hover/active/focus states, and density. Match them; avoid redundant padding (especially in Sheets); keep hover text/background contrast readable.
- Mobile-first responsive (verify **375 / 768 / 1280**), accessible (ARIA, keyboard nav). Toasts: **Sonner**.
- **One customer email + env-driven branding.** `BRAND_SUPPORT_EMAIL` (`lib/branding.ts`, `NEXT_PUBLIC_SUPPORT_EMAIL`, default support@streamlineos.in) covers support/sales/security/founder. Never add per-purpose addresses or hardcode domains/emails — import from `lib/branding.ts` (`NEXT_PUBLIC_BRAND_DOMAIN` overrides the domain).

## 14. Animations & UI Polish

> Canonical spec: **`UI-UX-SYSTEM.md`** — read it before any UI work. Its tokens win over anything here.

- Every page reads as a **$10k+ SaaS product**: polished, dense, purposeful. One primary button per view.
- **Ink-first system** (Linear/Stripe): `--primary` slate-900 fills for primary CTAs, `--accent` blue-500 for links/interactive states, slate-neutral chrome. Brand gradients are landing/marketing only, never inside the authenticated shell.
- **HRMS keeps its rich hero/color surface** — the HR gradient hero (`HrHero`), colored tone tiles (`HrQuickAction`), and tinted chrome are DESIRED. Do not flatten HR to ink or purge its gradients in conformance passes; still apply structural fixes (fill-chain, compact filters, no double-cards, spacing). Other modules stay ink-first.
- **Blue replaces purple.** Wherever legacy violet/indigo is removed or an accent is needed, use `blue-500`/`blue-600` — never violet. Emerald/amber/red stay semantic-status-only.
- **Theme-accent tokens over literal blue.** Interactive accent surfaces (unread dots/bars, selection tints, active filters, count badges, selected cards) use `bg-primary`, `bg-primary/5..15`, `border-l-primary`, `--ring` — never hardcoded `blue-*` (18 accent palettes tint all chrome; default Ink is monochrome). Literal blue only for semantic "info" and chart seeds.
- **Dark mode conformance.** Every colored light tint (`bg-X-50 text-X-700 border-X-200`) carries `dark:bg-X-500/10 dark:text-X-300 dark:border-X-500/30`; standalone colored icons carry `dark:text-X-400`. Never hardcode neutral hexes/`bg-white`/`slate-*` chrome — semantic tokens only.
- **Framer Motion** for page/step transitions (`AnimatePresence` + `motion.div`), list stagger (`delay: idx * 0.08`), entrance. Step/route transition: `initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}}`, `duration:0.22, ease:"easeOut"`, inside `<AnimatePresence mode="wait">`.
- **Interactive components animate open/close and press** via Radix `data-[state]` + `tailwindcss-animate`: Dialog fade+zoom, Sheet slides from its edge, dropdowns/popovers/tooltips fade+zoom from the trigger. Keep it 150–250ms `ease-out` and **respect `prefers-reduced-motion`** (opacity-only fallback). Press feedback is built into `Button` — never re-add `active:scale` per button.
- **Every async button is `<LoadingButton isPending>`** (`components/ui/loading-button.tsx`). Never hand-roll `disabled={isPending}` + a spinner ternary.
- **Every authenticated page uses `PageWrapper`** (`components/ui/page-wrapper.tsx`). Never `min-h-screen`, page-level gradients, or ad-hoc `<h1>` inside the shell — the shell owns the background.
  - **No `backHref` on a page that has its own sidebar nav entry** (only nested/detail pages reached from a parent).
  - Use the default heading `variant`; reserve `variant="display"` for genuine module hero surfaces, applied consistently across siblings.
  - Don't put a bare row count in `badge` or as the whole `subtitle` — give a descriptive subtitle; keep `badge` for meaningful status.
- **Cards in-shell:** `bg-card border border-border rounded-xl shadow-sm`. No backdrop-blur/heavy shadows; the glassy `rounded-2xl shadow-xl` style is auth/landing only. Translucent panel fills stay ≥75% card opacity with ≥70% borders. Get an explicit decision before changing surface tokens.
- **Flat filter toolbars.** Never wrap filter Inputs/Selects in an outer `rounded-xl border bg-card` panel (fields already carry `border-input bg-card` → nested cards). Use a flat flex row; `ViewToggle`/`TabsList` are the only bordered chrome. Prefer `FILTER_SELECT_TRIGGER` on filter selects.
- **`StatCardGrid` is always one horizontally-scrolling row** (`components/ui/stat-card.tsx`): equal-width cards from child count, `overflow-x-auto` at **every** breakpoint so the ROW scrolls and the PAGE never does. Never `md:overflow-x-visible`, never multi-row breakpoints, never wrap or compress below ~10rem. Callers MUST use `StatCardGrid`, never a bespoke `grid grid-cols-*`.
- **One shared pagination.** Every paginated list uses `TablePagination` (`components/ui/table-pagination.tsx`); never hand-roll a per-feature prev/next footer (`components/shared/data-table-pagination.tsx` survives only because it adds page-size + first/last). **Never hardcode pagination params in a hook** — no `?page=1&limit=100` + `select`-away-the-envelope. Hooks take `{ page, limit, status? }`, are RBAC-gated, and return the real `{ data, pagination }`. Per-status filter badges come from a server-side `statusCounts` aggregate so filtering paginates server-side.
- **Lone filter / lone action fill their space on mobile.** A single filter (usually search) fills full width — never collapse a sole search into a dropdown/Drawer. A single primary action goes straight into `actions` (PageWrapper makes it full-width on mobile). Multi-filter bars keep search first and collapse the rest into a mobile Drawer.
- **Select dropdowns fit long options:** `SelectContent className="min-w-[var(--radix-select-trigger-width)]"` — never `w-[…]` (clips). Size triggers to content (`w-fit`/`min-w-[..px]`) when values are long; not every select is the same width.
- **Mobile overlays are Drawers.** Below `md`, any filter/display/menu/multi-section panel that would be a Popover or Sheet becomes a Drawer — via `ResponsivePopover` (`components/ui/responsive-popover.tsx`) for popover triggers. Never a raw `Popover`/`Sheet` for a mobile filter/menu. Desktop unchanged. Tiny 1–3 item menus and date pickers are exempt.
- **Module-aware mobile chrome.** Each module's primary sidebar destinations become the bottom tab bar (`MobileModuleBottomNav`, capped at 5; overflow in the Menu drawer). `MobileShellFab` opens Ask OS · Menu · Search · Profile — never bottom tabs. Chat keeps `ChatMobileBottomNav`; module tabs + FAB are suppressed during an open conversation. Reserve `pb-[calc(4rem+…)]` only when a bottom bar is mounted.

## 15. Layout & States (every page satisfies ALL)

- **Loading:** skeletons matching the real layout, never lone spinners.
- **Empty:** fills available content height (`flex-1`/`h-full`) with icon + message + primary action — never a small floating block. Full-page empty states use a themed SVG from `components/illustrations` (extend that set in `_shared.tsx` style; never ship raw downloaded SVGs). Icon-only empties are for compact/table-cell contexts.
- **Error:** friendly message + retry.
- **All user-facing error text goes through `getErrorMessage(error: unknown)`** (`lib/get-error-message.ts`). Never hand-roll `error instanceof Error ? … : …` or read `.message` raw. It surfaces the real backend message and substitutes a friendly generic only for bare status lines, network failures, or empty errors. **`lib/api-client.ts` is the only place that parses an error response** — it extracts the backend `message` (string or NestJS `string[]`, joined) and attaches `status` to `ApiError`; branch on `isApiError(e) && e.status === …`, never on message-prefix matching.
- Long content scrolls **inside the main content area only** (sidebar `h-screen sticky`; main `overflow-y-auto`).
- No unintended overflow: `min-w-0`, `truncate`, `flex-1`, proper overflow — not fixed heights that burst.
- Unconnected integration → clear **"Connect X"** banner with an action; never fail silently or render broken data.
- **Show names, never raw IDs.** Cards, tables, exports, tooltips, activity logs, and filter chips render display names (`getUserDisplayName`/`getUserInitials`), titles, or status labels — never a UUID or `assigneeId`. Resolve from an already-cached list at the display boundary. A visible id is a bug.
- **Inline contextual AI on detail/record surfaces.** Detail pages offer a compact AI affordance where it genuinely reduces effort — never forced, never on trivial pages. Use the shared `AiActionsMenu` (`components/ai/ai-actions-menu.tsx`); each action reuses the module's existing gateway-backed endpoint, is draft-first (user applies — never auto-send), credit-metered, `useCan`-gated, and errors via `getErrorMessage`. Extend the primitive, don't duplicate it per module.
- **Edit-in-place on cards/rows.** Every editable field (assignee, status, priority, type, points, labels, cycle, dates) is changeable inline via a compact popover — reuse `features/build/views/card-inline-fields.tsx` driven by the optimistic mutation.

## 16. Feature Completeness (per page)

- Verify the feature has list, create, edit, delete, filters, pagination, permissions, and all states. ADD what's missing; REMOVE what isn't required (including files); fix folder placement + imports.
- **HR:** onboarding/profile forms collect only what a real HR platform asks a new joiner — personal (phone, DOB, gender, address, emergency contact), bank/payroll, ID & document uploads. Exclude recruitment-only data (years of experience, skills).
- The employee onboarding form is **never** shown to org owners or platform admins — gate **server-side** and redirect (owner → setup/dashboard; platform admin → `/owner`).
- **Workspace gating:** a signed-in user with no workspace goes to `/org-setup` (platform admins → `/owner`), enforced by the live-session check in `app/(authenticated)/layout.tsx` (authoritative over the middleware's advisory JWT gates). Completing OR skipping a wizard is durably remembered — server stamps the DB, invalidates the `userSession` cache, client calls `completeOnboardingGate` (`lib/onboarding-gate.ts`). Never bounce a user back into a wizard they skipped.
- **Module-owned surfaces:** custom fields, automations, integrations, and data-hub import/export live inside each module's settings — never as global `/settings/*` pages. Global settings keeps org-wide concerns only (security, billing, roles, modules, org profile).
- **Employee self-service and knowledge are platform core, not paid-module entitlements (living rule, updated 2026-08-09):** every active member keeps Home access, mail, chat, notifications, the dashboard (content shaped by role), their own time off, attendance, expenses, payslips/pay, employment documents, announcements, recruitment referrals + internal job openings (never the candidate pipeline, interviews, or hiring administration — those stay recruiter/HR-gated), people directory, and Knowledge Base reading even when their only enabled product is Build/CRM/etc — the surface is universal; actions inside each surface stay permission-gated. Canonical self-service routes live under `/me/*`; backend handlers use `self:*`, derive the subject from `@CurrentUser()`, never accept a self `userId`, and never carry `@RequireModule`. Knowledge reads retain space, audience, and record ACLs. HR/payroll/finance administration plus Knowledge authoring, analytics, settings, and administration remain separately permission- and module-gated. Enforce core access in backend effective permissions and shared navigation, never as a visible-only exception or a frontend entitlement constant.
- **Home sidebar contains universal work only (living rule, 2026-08-05):** Dashboard/communication, `For Me`, announcements, and the people directory belong in Home. Recruitment, interviews, employee administration, policies, payroll runs, accounting, and every other module-specific destination stay inside their owning product navigation.
- **One unified calendar.** `/calendar` is the single calendar for every employee — never module-specific calendar pages. Module events (holidays, leaves, birthdays, review cycles, training, travel, interviews) are toggleable SOURCES fed by backend aggregate endpoints.
- **The delivery/strategy module is "Build"** — one umbrella over project management (`projects`, tickets, sprints, QA, backlog) AND product management (`managed_products`, roadmap, OKRs, feedback). Route `/build` (`/projects` redirects), RBAC `build:*`, module key `BUILD`, folders `build/`. **`project` ≠ `product`:** distinct tables/entities, never merged. Physical table names keep their entity names; only the module namespace is `build`.
- **Plan entitlements:** FREE / PAID / ENTERPRISE, resolved server-side from `subscriptions` by `PlanLimitsService` (`backend/src/modules/billing/core/plan-limits.service.ts`). Every creation endpoint for a limited resource calls `assertWithinLimit(orgId, key)` before insert. Paid-only modules (payroll, inventory) are blocked at `setModuleEnabled` on FREE; existing enablement is not retroactively revoked. Frontend reads `GET /billing/entitlements` via `useEntitlements`.
- **Platform billing is exactly 2 canonical Settings pages:** `/settings/billing` (Plan + promo + seats + usage · Invoices & Payments · Billing Profile) and `/settings/billing/ai-credits` (wallet, top-ups, auto-top-up, history). The old `/billing`, `/billing/ai-credits`, `/settings/subscription`, and `/billing/seats` routes are deleted — never resurrect them. `/billing/invoices` is the org's own customer invoicing (accounting), not platform billing.
- **AI billing is token-metered, Cursor-style.** Credits burn by actual tokens via `computeTokenCharge(model, in, out)` (`backend/src/modules/ai/core/billing/ai-model-pricing.constants.ts`) — never flat per-action charging; `AI_FEATURE_COSTS` are reserve ceilings only. The ledger stores integer **milli-credits**; APIs emit fractional credits; settle refunds under-run and debits overage. New AI endpoints use the gateway `*WithUsage` variants, return an `aiUsage` meta, and render the shared `AiUsageChip`.
- **Organization hierarchy lifecycle is archive/restore, never hard delete (living rule, 2026-08-08):** Business units, branches, departments, teams, locations, and cost centers archive through a status mutation and share `HierarchyArchiveDialog` over `ConfirmDialog`; never add a permanent-delete control to these pages. A dependency conflict keeps the controlled dialog open, displays every actionable dependency label + count, and confirms that nothing changed. New child-assignment selectors include only `ACTIVE`, non-deleted parents. Every hierarchy create/update/archive/restore invalidates the `queryKeys.hierarchy.all` prefix so lists, overview, and tree reconcile together.

---

## 17. Next.js (App Router)

> The frontend owns no business APIs and no business DB (§6): Server Components fetch by calling the backend, or the client uses Query. **Business Server Actions and Route Handlers are NOT used here** — the only frontend `route.ts` is NextAuth; webhooks and public APIs live in the backend. The DAL principle below is a **backend service-layer** rule.

**Server / Client boundary**
- Server Components by default. `"use client"` only for state, handlers, effects, or browser APIs — pushed to the **leaves**.
- Fetch in Server Components, pass serializable props down. A Server Component can't be imported into a Client Component — pass it as `children`. Providers are Client Components rendered as deep as possible.

**Data fetching**
- Parallelize independent requests (`Promise.all`/preload) — sequential `await`s create waterfalls. Wrap non-`fetch` server data access in React `cache()` to dedupe per render. Push fetches down and wrap in `<Suspense>`.

**Caching [verify-version]**
- Layers: Request Memoization · Data Cache · Full Route Cache · Router Cache.
- **Next 15:** `fetch` is uncached by default — opt in with `cache: 'force-cache'` or `next: { revalidate }`.
- **Next 16 Cache Components:** dynamic by default; opt in with `use cache` + `cacheLife` + `cacheTag` (can't read `cookies()`/`headers()` — read outside, pass as args).
- **Every mutation pairs with invalidation:** `revalidateTag('post:'+id)`/`revalidatePath` (Next 16: `updateTag` for read-your-writes). Tag specifically. Test caching with `next build && next start`, never `next dev`.

**Server Actions** (if ever used) — treat as public POST endpoints: Zod-validate, verify auth, verify object-level + tenant authz. Keep them thin: call the backend, handle only `revalidateTag`/`revalidatePath`.

**Routing & params [verify-version]**
- `params`/`searchParams` are Promises — `const { projectId } = await params`. Validate bracket-folder params as untrusted input.
- **Descriptive route params, never `[id]`.** Backend `:projectId` and frontend `[projectId]` match, and the destructured variable matches.
- **Route ownership is part of the product contract.** Global administration screens use canonical `/settings/*` URLs; module-owned configuration uses `/<module>/settings/*`. Settings owns configuration and access governance, never day-to-day operational work: operational workforce lives at `/directory/workers`, employee pay stays self-service, and payroll administration stays under `/payroll/*`. A navigation item must remain inside the product/sidebar that owns it. When one capability belongs in two products (for example the employee `/directory` and administration `/settings/directory`), keep one reusable component under `features/` and render it through thin, permission-checked route adapters with product-aware base-path props — never duplicate the page or import one `app/**/page.tsx` from another. **When a page moves to its canonical route, delete the old route files outright — no legacy redirect routes (living rule, updated 2026-08-09)** — and update every link to the canonical path.

**Rendering, assets, errors**
- `next/image`, `next/link`, `next/font`, `next/script` with an explicit strategy. Static assets in `public/`.
- `error.tsx` with `reset()`, `global-error.tsx`, `not-found.tsx`. Log server-side; production hides raw error text.
- Minimize client bundle via dynamic imports; keep client components small.

**Middleware — NOT for authorization**
- Middleware is bypassable (CVE-2025-29927): optimistic redirects / locale / coarse routing UX only; **re-verify at the data layer.** Keep Next patched (≥15.2.3 / ≥14.2.25); strip `x-middleware-subrequest` at the proxy.
- **The routing layer is `frontend/proxy.ts`** (named `proxy` export, Node runtime) — `middleware.ts` is deprecated in Next 16 and was deleted; never recreate it. Route-permission maps don't belong there (the JWT carries no permissions claim — gating is server-side `requirePermission` + backend `PermissionGuard`).
- **One wizard-gate authority (living rule, 2026-08-08):** `resolveWizardGate` (`lib/wizard-gate.ts`, live session + gate cookies) is the sole decider for `/org-setup` / `/employee-onboarding` routing, applied in the `(authenticated)`, `/org-setup`, and `/employee-onboarding` server layouts. `proxy.ts` never redirects on JWT claims (`orgId`, `*OnboardingCompletedAt`) — a stale claim opposing the live-session layouts is an instant `ERR_TOO_MANY_REDIRECTS` loop (two decision points + two data sources = redirect cycle whenever they disagree).

**Env & secrets** — server-only except `NEXT_PUBLIC_` (inlined into the client bundle). Never put a secret behind that prefix.

**Data Access Layer (backend rule)** — centralize business data access in services: verify session, verify object-level + tenant authz, explicit `select` (never `select *`), return minimal DTOs (never raw ORM rows). On the frontend, mark server-only modules `import 'server-only'`.

## 18. Backend (NestJS)

- **Thin controllers; services own business logic.** One controller per resource/domain.
- **Module folders nest by domain, never hyphen-flatten.** A sub-module lives inside its parent (`modules/build/qa/`), never `modules/build-qa/`. The parent's own controllers/services live in `<module>/core/`, so the parent folder reads as a table of contents. Each sub-folder is a real `@Module` with its own `*.module.ts`/`*.controller.ts`/`*.service.ts`/`dto/`, registered in `app.module.ts` by nested path. **Cross-module access goes through the other module's service**, never its repository or schema.
- **Validation stays Zod — do NOT introduce `class-validator`.** The repo has ~2,177 `ZodValidationPipe` call sites, zero decorator DTOs, and neither `class-validator` nor `class-transformer` installed. Take the NestJS validation *principles*, not its library: declared once per payload in a dedicated schema file, applied at the boundary by a pipe, strict about unknown keys (`z.object().strict()` = `whitelist` + `forbidNonWhitelisted`), and the single source of the type via `z.infer`.
- **Validation is registered GLOBALLY** — per-handler opt-in means a forgotten pipe is silently unvalidated input. `ZodValidationInterceptor` (`common/validation/zod-validation.interceptor.ts`) is registered once in `app.module.ts` as `APP_INTERCEPTOR`; handlers declare `@Validate({ body, query, params })` and it parses before the handler runs.
  - It is an **interceptor, not a pipe**, because only an interceptor gets the `ExecutionContext` needed to read per-route metadata (a global pipe would need an `any` cast).
  - It is a **pass-through without `@Validate`**, so it composes with existing per-parameter pipes — new endpoints prefer `@Validate`; existing ones need no migration.
  - A thrown `ZodError` maps to 400 in `AllExceptionsFilter` — never catch and re-shape it at the call site.
- **Guards** for authN/authZ (metadata via custom decorators + `Reflector`, deny by default) · **Interceptors** for logging/shaping · **Pipes** for validation · a **global Exception Filter** for one JSON error envelope (log fully, return generic).
- **Serialization:** `ClassSerializerInterceptor` + `@Exclude()` at class level, `@Expose()` only on returned fields, `@Exclude({ toPlainOnly: true })` for secrets. Never leak sensitive columns.
- **Config:** `@nestjs/config` global + startup `validationSchema` (required vars `.required()`, `NODE_ENV` enum). Fail fast on bad config. `.env` out of git; commit `.env.example`.
- Stateless handlers · `async/await` everywhere · structured logging · global error handling · graceful shutdown · `/health` via `@nestjs/terminus`.
- **HTTP semantics:** GET/HEAD are safe and idempotent — no writes in a GET. API versioning · cursor pagination for live data · consistent filter/sort conventions.
- **Idempotency:** mutating endpoints accept a client `Idempotency-Key`; store the first result keyed by (key + tenant), replay on retry, 409 while in-flight, error on param mismatch, expire after a TTL.

## 19. Database (Drizzle + Neon)

- **Normalize lifecycle entities** — invitations, members, approvals, comments, notifications, audit logs, tasks, events, documents each get a table with PK, `org_id` FK, `status`, `created_at`, indexes. **Never JSONB arrays** for these (can't be indexed, paginated, atomically updated, or soft-deleted).
- Every table: UUID or `generatedAlwaysAsIdentity()` PK (never `serial`). Every tenant-scoped table: non-nullable indexed `org_id` FK. Money as integer cents, never float.
- **Tenant-scoped uniqueness is composite.** Any "unique per org" business key (project key, SKU, code, slug) uses `uniqueIndex(org_id, <col>)` — **never** a bare global `.unique()`, which lets one tenant's value block every other org (cross-tenant DoS + info leak). Catch DB `23505` in the service and throw a `ConflictException` (409), never an unhandled 500.
- **Never a dual-purpose polymorphic FK.** An `entity_type` + `entity_id` pair pointing at different tables is banned for new tables — no FK, no referential integrity, no `ON DELETE`, and it defeats the composite tenant FK. Use an **exclusive arc** (one nullable FK per type + a `CHECK` that exactly one is set) for a small stable type set, or a **link table per relationship**; either carries its own `org_id` leading its composite index. Existing pairs (`notifications`, calendar events) are grandfathered as **display/dedupe pointers only** — never the sole path to resolve, join, or cascade a record.
- **Composite indexes most-selective-first, leading with `org_id`** (e.g. `(org_id, status, created_at DESC)`). Index every FK. No full-table scans.
- Select only needed columns. **No N+1** — joins or relational `with`. Multi-step writes in a **single transaction** (`db.transaction`, pass `tx` down). Atomic upserts for counters/idempotent creates (unique `(org, resource, actor)` index + upsert).
- **Never use `user: true`, `creator: true`, `approver: true`, or another unprojected relation to global `users`.** That row still contains authentication secrets and legacy payroll/HR fields during the R-11 cutover. Every users relation must declare an explicit minimal `columns` projection; response DTOs must not rely on raw ORM user rows.
- **Free-text search:** `to_tsvector` + GIN (or `pg_trgm`) — never leading-wildcard `ILIKE`.
- **All list endpoints paginated**, hard cap **100/page** (public included). **Soft-delete** with `deleted_at`.
- **Partition high-volume append-only tables by time** (`ai_usage_logs`, audit logs, notifications, chat messages, event/outbox streams): RANGE on `created_at`, monthly or weekly, partitions pre-created, archived by `DETACH PARTITION CONCURRENTLY` + `DROP TABLE` — never a bulk `DELETE`. Decide BEFORE partitioning: the partition key must be in every PK/UNIQUE, so the PK becomes `(id, created_at)` and bare `id` is no longer globally unique — keep the `(org_id, id)` tenant key. Don't partition a table that isn't demonstrably large; record the triggering row count in the migration.
- **Migrations:** `generate` + `migrate` in CI; `push` for local dev only. Never hand-edit generated SQL — regenerate. Additive: add nullable → backfill in batches → add NOT NULL; build indexes concurrently on large tables; one purpose per migration; name constraints/indexes explicitly.
- **Adding an FK or NOT NULL takes ACCESS EXCLUSIVE — split it in two.** `ADD CONSTRAINT … FOREIGN KEY` locks BOTH tables while installing triggers, so one long SELECT on `organizations` stalls every write to both. Always `ADD CONSTRAINT … NOT VALID` → `VALIDATE CONSTRAINT`. Same for NOT NULL: `ADD CONSTRAINT … CHECK (col IS NOT NULL) NOT VALID` → `VALIDATE` → `SET NOT NULL` → drop the CHECK separately. Every migration sets `lock_timeout` (~5s) so it fails fast instead of queueing and blocking the table behind it.
- **Migration reproducibility:** "applied to the Neon branch" ≠ "migrated" — it counts only when it's in the Drizzle journal AND `db:migrate` reproduces it on an EMPTY DB. Cold-DB rules: (1) a fresh DB must `CREATE EXTENSION` `vector`/`pg_trgm`/`btree_gist`/`pgcrypto`/`uuid-ossp` BEFORE `db:migrate` — never fold this into `0000` (editing an applied migration changes its hash); (2) heavy catalog PL/pgSQL `DO`-block migrations must prepend `SET statement_timeout = 0;` or Neon cancels them on a cold build; (3) to turn a unique index into a unique constraint an FK already targets, use `ADD CONSTRAINT … UNIQUE USING INDEX` — never `DROP INDEX` + re-`ADD` (the dependent FK blocks the drop); (4) author reconciliation as discrete dependency-ordered migrations — a ~2000-op monolith ECONNRESETs on Neon.

## 20. Security (OWASP API Top 10 — 2023)

- **A01 BOLA (the #1 risk):** every endpoint taking a resource id re-asserts the caller's access to **that specific object** (org + record) on **reads AND writes** — role/module ability alone is insufficient. Centralize in an access service; call it in every mutating method. Test with two accounts.
- **Cross-tenant misses return 404, never 403.** A 403 on another org's id confirms the record exists, turning a BOLA probe into an existence oracle. Reserve `ForbiddenException` for a caller inside the **correct** tenant who lacks the permission.
- **A02 Broken Authentication:** integrate the existing auth path, never a parallel one. Account lockout + rate limiting on login; generic auth-failure messages.
- **A03 BOPLA:** allowlist input (`whitelist`) and output (DTO/serialization). Reject client-sent protected fields (`role`, `isAdmin`, `orgId`).
- **A04 Unrestricted Resource Consumption:** rate limits, quotas, timeouts, payload caps, pagination caps. **AI/LLM metering: reserve/consume credits atomically BEFORE the paid call**, refund only on provider failure — never check-then-spend. Anonymous traffic must never spend the shared LLM budget (**denial-of-wallet**); short-circuit before embedding when the org has no eligible content.
- **A05 Broken Function Level Authorization:** Guards on privileged routes; deny by default.
- **AI retrieval filters by the asker's access in the SQL predicate, never in the prompt.** Every RAG/vector search binds tenant scope AND the same object-level visibility the direct read endpoint enforces (space membership, page visibility, `own`/`team` scope, draft vs published) **before** candidates reach the model — a chunk is disclosed the moment it enters the context window, and prompt-level filtering fails under adversarial input. Capture the ACL alongside the chunk at index time so the filter stays a cheap indexed predicate. **Make the unsafe state unrepresentable** — delete the "safe usage" flag rather than documenting a convention (a `publicOnly` flag in `kb-rag.service.ts` once left the default path filtering on `orgId` alone; the fix was removing the flag and making the predicates unconditional).
- **A06 Sensitive Business Flows:** bot mitigation / rate limiting on abusable flows (signup, purchase).
- **A07 SSRF:** never fetch user-supplied URLs without an allowlist; block internal/metadata endpoints.
- **A08 Security Misconfiguration:** Helmet, strict CORS, no verbose errors/docs in prod, CSP-friendly markup, HTTPS-only assumptions.
- **A09 Improper Inventory Management:** track and retire old API versions and zombie endpoints.
- **A10 Unsafe Consumption of APIs:** validate and sanitize upstream/third-party responses.
- **Tenant isolation (defense in depth; selective RLS rule, 2026-08-04):** every tenant-owned table needs an explicit tenant path, tenant-correlated queries, and an appropriate leading composite index. Enable Postgres RLS only for tables approved in the RLS matrix after every service path uses `runInTenantTransaction` and missing/cross-tenant GUC tests pass; do not blanket-enable or FORCE RLS. Global identity (`users`, `accounts`, `sessions`), global catalogs, platform administration, and public-token/bootstrap flows require their documented compensating controls or specialized policies because ordinary tenant RLS can break authentication and cross-organization workflows. Where tenant RLS is enabled, `app.current_org_id()` fails closed with SQLSTATE `42501` when the GUC is absent.
- **A side-effect fired after the request must not borrow the request's transaction (living rule, 2026-08-05).** `TenantContextInterceptor` wraps every HTTP request in one transaction and puts its handle in AsyncLocalStorage. A `void something(...)` started in a handler keeps that ALS context after the handler returns — but the transaction has committed and the handle is back in the pool, where the transaction-local GUC no longer exists, so every read and write dies `42501`. This silently produced **zero rows in `notifications` for the life of the product** across ~50 call sites, because each one ended `.catch(() => undefined)`. Rules: (1) defer post-commit work with `registerAfterCommit` — the interceptor drains the hooks only on success, so a rolled-back request never announces itself; (2) the deferred work opens its own tenant transaction (`runInNewTenantTransaction`), it cannot reuse the caller's; (3) resolve recipients/ids **before** returning, while the request transaction is still live, or read them inside the deferred transaction — never on the dead handle; (4) background sweeps have no ambient context at all, so a cross-tenant `UPDATE` is denied — iterate with `forEachOrg`; (5) **never swallow a deferred failure** — log it, or the next outage is invisible too.
- **AuthZ placement (§21):** backend gates every protected endpoint with `@RequirePermission` + `PermissionGuard`; frontend server components use `requirePermission()`. Client checks and routing middleware are UX only.
- **Input/output:** Zod-validate all input; parameterized ORM queries only; sanitize rendered HTML; secure cookies (`httpOnly`, `Secure`, `SameSite`).
- **Passwords:** **Argon2id** (m≥19456 KiB, t=2, p=1); scrypt/bcrypt (≥10, 72-byte limit) as fallback. Unique salt. Never fast hashes.
- **Secrets & supply chain:** no hard-coded secrets — validated env vars only. Validate uploads. Log sensitive actions without exposing data. Audit dependencies; keep Next patched.

## 21. RBAC Engine — server-resolved

Permissions resolve from the DB on **every request** via `AccessService`. **CASL is fully removed from both repos.**

**Key format** — `"module:resource:action"`, three lowercase colon-separated segments (`"hr:employees:view"`); `action` ∈ view · create · update · delete · manage · assign · export · approve · reject · import. Resolved via `GET /me/access` — **never** in JWT claims.

**Key files (do not delete)**
- `backend/src/modules/rbac/permissions/` — catalog folder, one file per module + `role-defaults.ts` (`ROLE_DEFAULT_PERMISSIONS`) + `index.ts`.
- `backend/src/modules/rbac/role-templates.constants.ts` — role templates.
- `backend/src/common/rbac/access-invalidate.ts` — `bumpPermissionsVersion(tx, orgId)`.
- `backend/src/db/schema/common/access.ts` — RBAC schema (source of truth).
- `backend/src/modules/access/access.service.ts` — `resolveUserPermissions`; caches per `(userId, orgId)`; degrades pre-migration.
- `backend/src/modules/access/permission.guard.ts` — reads `@RequirePermission`, sets `req.rbacScope`.
- `backend/src/modules/access/apply-scope.ts` — `applyScope(scope, userId, cols)`.
- `backend/src/modules/access/require-permission.decorator.ts` — the decorator.
- `frontend/hooks/api/access.ts` — `useAccess`, `useCan`, `useModuleEnabled`, `usePermissionCatalog`.
- `frontend/components/auth/require-module.tsx` — `<RequireModule module="…">`.
- `frontend/lib/rbac/require-permission.ts` — server-side page check (`requireSession`, `requirePermission`).
- `frontend/lib/rbac/get-server-access.ts` — cached server-side access fetch.

**Add a protected backend endpoint**
1. Add the key to the module's file in `permissions/`; if it's a role default, add it to `role-defaults.ts`.
2. Decorate: `@UseGuards(JwtAuthGuard, PermissionGuard)` + `@RequirePermission("newmodule:resource:view")`.
3. List endpoints apply DataScope — read `req.rbacScope` in the service and filter (`own` → `assignedToId = actor.userId`; `none` → deny; `all`/`team` handled upstream).
4. Every role/permission mutation calls `bumpPermissionsVersion(tx, orgId)` **in the same transaction**.
5. Bust the `(userId, orgId)` access cache in any service that changes role assignments or grants.

**Frontend gates** — `useCan("newmodule:resource:create")` for client checks; `<RequireModule module="newmodule">` / `useModuleEnabled` for module on/off; `requirePermission()` in server pages. New keys auto-appear in `/settings/roles` (reads `GET /rbac/permissions`).

**Runtime notes**
- Canonical grant tables are `role_assignments`, `role_permission_grants`, `principal_group_members`, `group_role_assignments`, `module_ownerships`, `user_delegations` + `user_delegation_permissions`, and `access_versions`. A delegation stores lifecycle once and one child row per permission; never put delegated permission arrays back on the header or create a parallel grant source. Never reintroduce `user_roles` or `group_roles`.
- Structural organization roles are exactly `OWNER`, `ORG_ADMIN`, and `MEMBER`. `OWNER` and active `ORG_ADMIN` receive the same product permission catalog. Ownership transfer, organization deletion, and other ownership-lifecycle operations must still check `isOrgOwner` explicitly.
- Every non-owner/non-admin is structurally `MEMBER`. Effective access is the union of direct roles, permission-group roles, unexpired delegations, and canonical module ownership, constrained by active tenant membership and module entitlement.
- A module has one lifecycle owner in `module_ownerships`. Assignable roles must not create a second meaning of owner; synchronize `*_MODULE_OWNER` only through the ownership service or name assignable broad roles `*_MODULE_ADMIN`.
- Resolution is cached per `(userId, orgId)` in Redis and busted by `bumpPermissionsVersion`. Cache TTL must not outlive the nearest role/delegation expiry. Cross-node revocation requires distributed invalidation; process-local callbacks are only a latency optimization.
- `DataScope`: `all` · `team` (same dept) · `own` · `none`. Do not expose `team` as effective until canonical team membership feeds scope evaluation.
- Guards run **before** interceptors, so a guard's own DB queries have no tenant GUC — wrap them explicitly (§20).

**Membership, invitations, and tenant integrity**
- Canonicalize email once (trim + lowercase under the documented policy) at every invite, import, direct-create, and HR-onboarding boundary, and enforce case-insensitive uniqueness in PostgreSQL.
- Seat enforcement is a serialized write invariant: acquire the per-org `quota:${orgId}:members` transaction advisory lock and call `PlanLimitsService.assertWithinLimit(..., tx)` immediately before every membership insert. A check outside the transaction is insufficient.
- Accept/resend/cancel/invitation-role transitions lock or conditionally update the invitation using current status, acceptance, and expiry predicates; check affected-row count. Never revive an accepted or revoked invitation via an ID-only update.
- Invitation tokens are hash-only at rest. Delivery is asynchronous and durable through outbox/retry; delivery failure is observable without rolling back the invitation.
- Global `users` stores identity only. Employee number, org placement, manager, designation, lifecycle, compensation, tax, and bank data belong to org-scoped employment/person tables.
- Every RBAC edge with `org_id` has composite tenant FKs for membership, role, and principal group. Application predicates and RLS do not replace relational integrity.
- Never delete historical invitations to free uniqueness. Pending uniqueness is on canonical email where `status = 'PENDING'`; retain terminal invitation/event history.
- Bulk membership/invitation flows authorize and load policy once, deduplicate emails, batch reads/writes, reserve quota once, enqueue delivery, and invalidate once. Do not run N complete single-row workflows.

**RBAC — NEVER**
- Never `@CheckAbility`/`AbilityGuard`/`useAbility()`/`@casl/*`/`lib/abilities` (all deleted), never `requireAuthorize`/`hasRoleOrPrivileged`.
- Never put permission checks in JWT claims; never read `req.user.permissions` for decisions (JWT is stale, DB is authoritative).
- Never skip `@RequirePermission` on a protected endpoint, add a permission without a catalog entry, or skip `bumpPermissionsVersion`.
- **Never send a lowercase/mixed-case role slug from the client.** Slugs are `UPPERCASE_SNAKE` (`/^[A-Z_]+$/`), canonical in `ROLE_TEMPLATES`; template **ids** stay lowercase. Uppercase before POSTing (canonical: `CreateRoleDialog.slugify()`); when cloning a template, omit `slug`/`name` to inherit canonical values.

---

## 22. Caching

- **Backend:** Redis for read-heavy data with **explicit invalidation on every mutation**. Public read-only GETs set `Cache-Control` (`s-maxage` + `stale-while-revalidate`).
- **Frontend:** Query `staleTime` per §11.
- **Never cache user/permission-scoped data in a shared cache.**
- Cache fills for the same key are single-flight in-process; high-scale/shared hot keys additionally need a short distributed fill lease, TTL jitter, and stale-while-revalidate where safe. Never let an expired popular key stampede the database.
- Do not use Redis wildcard `SCAN` invalidation synchronously on request paths at scale. Prefer versioned tenant/resource namespaces; bounded batched deletion is only a compatibility fallback.
- **The cache key must include every filter that changes the result (living rule, updated 2026-08-04):** caching a filtered query under an unfiltered key serves one caller's scoped rows to the next and defeats the filter in both directions. Put every result-changing discriminator in the key beneath an explicit tenant/resource namespace, read with `cachedVersioned`, and make every writer bump that namespace with `invalidateNamespace`. Do not add new request-path `invalidatePattern` calls; the `SCAN` implementation exists only as a temporary compatibility fallback while legacy families are migrated. (Fixed examples: sales commissions/quotas and organization/member caches.)

## 23. Performance

Bundle size · lazy loading · dynamic imports · query optimization · cache efficiency · deduped requests · parallel fetching · granular Suspense streaming.

- **Background refetches and ordinary mutations never replace the authenticated application with `AppLoadingScreen`.** Show the branded full-screen loader only when there is no verified session/access data on the true initial load. Preserve stale rendered data during refetch, use optimistic updates with rollback where safe, and show pending state only on the affected control/row.
- Never refresh the NextAuth session merely to reconcile ordinary server state already owned by TanStack Query. Update/invalidate the narrow query keys in the background; refresh the session only when session-owned identity or organization context actually changes.

- **Never render an unbounded collection — window it.** Rendering hundreds of rows freezes the tab. Two allowed strategies: (1) **server pagination** — the shared `DataTable` is already bounded (§19's 100/page cap); always pass a real `pagination` prop. (2) **Virtualization** for surfaces that can't paginate (long boards, infinite feeds) via **`react-window` v2** (`List` + `useDynamicRowHeight`); canonical: `features/build/views/kanban-virtual-ticket-list.tsx`. A `items.map(...)` over a collection with no pagination, `slice`, or windowing is a hang-risk bug.
  - With `@hello-pangea/dnd`, use `Droppable mode="virtual"` + `renderClone`. **react-window v2 gotcha:** its `List` stores the scroll container in `useState(null)`, so `api.element` is `null` on first render and dnd's validation trips "innerRef has not been provided with a HTMLElement". Fix: wrap `<List>` in a `display:contents` shell and point `provided.innerRef` at `shellRef.current.firstElementChild` in a `useLayoutEffect`. A virtualized column inside a horizontally-scrolling board still trips dnd's dev-only nested-scroll warning — accepted; drag/drop works.
- **Note:** `prepare: false` is set on the Neon driver, so `sql.placeholder` prepared statements are inert here — optimize via indexes, projection, and N+1 removal instead.
- **AI endpoints must be efficient end-to-end.** Assemble prompt context in the fewest queries (`Promise.all`, explicit projection, hard caps on rows and text length — never dump whole entities into prompts). Default to the fast/cheap model tier with a per-feature output cap; use the standard tier only where quality demands it. Short-circuit BEFORE any provider call when there's no eligible context. Never re-embed unchanged content (content-hash guard — hash the **source text**, not the rejoined chunks). Dedupe in-flight AI requests. Cache derived context tenant-scoped with explicit invalidation. Vector queries always hit an ANN (HNSW) index. Every call records latency/tokens/cost through the AI gateway.

## 24. Reliability & Future-Proofing

- Deny by default; fail fast at boundaries; validate every external input; return typed consistent errors.
- Idempotent + transactional writes so retries are safe (§18, §19). Stateless services so scaling and redeploys are safe.
- Depend on abstractions across feature boundaries; one-directional flow (features → shared, never shared → features). No circular dependencies.
- **The import graph stays acyclic, proven by `madge --circular` — both repos are at zero (living rule, 2026-08-05).** Run it before claiming done; a cycle is a design defect, not a lint nit. The four fixes, in preference order:
  1. **Shared type in a neutral module.** A type declared in a file that also holds runtime code drags that whole file into every importer. `Db`/`TenantTx` live in `db/drizzle.types.ts`, not `drizzle.module.ts`; a form's Zod schema lives in `*-schema.ts`, not in the component its children import it from. Re-export from the old home to avoid churn.
  2. **Extract the leaf service into its own module.** `forwardRef` hides a cycle, it does not remove one — and it is banned in new code. When A and B need each other, the thing they actually share is a leaf: pull it into a third module both import (`AccountingPostingModule`, `AiGatewayModule`, `HrTimeLedgerModule`). The parent re-exports it so existing consumers are unaffected.
  3. **Never import a barrel from inside that barrel's own tree.** `db/schema/hr/payroll.ts` importing `../accounting` pulls in every accounting file, one of which imports back. Import the defining module.
  4. **Co-locate mutually-referencing tables.** Two tables with FKs to each other (`bugs` ↔ `test_cases`) cannot be split across files without a cycle; one module owns both.
- Re-check `[verify-version]` rules against installed versions. Prefer additive, backward-compatible schema and API changes, and boring well-supported patterns in production paths.

## 25. Refactoring & Dead-Code

- Remove dead/duplicate code, unused schemas/APIs/hooks/components/types — and delete their files. Don't abstract prematurely.
- **Dead-code claims are proven by a module-graph tool, not grep.** Import-search misses side-effect imports (`import "./x";`), dynamic `import()`, and re-export chains — a blind spot that already cost a live file deletion. Prove non-use with **knip**, then confirm with a real `next build` / `nest build` (`tsc --noEmit` does not catch a missing side-effect import). Deleting a schema file additionally requires zero symbol references, zero raw table-name references, and no dependent FK (§9).

## 26. Definition of Done

Types ✓ (Build ✓ where run; **Lint/Tests only when I explicitly ask — otherwise reported as not run, never as passing**) · CRUD complete · RBAC gated + scoped · tenant-scoped queries · caching invalidated on mutation · responsive (375/768/1280) · accessible · secure (BOLA re-asserted, inputs validated, no secrets leaked) · tests present (§27) · no file over 500 lines without a §9 exception · `PAGES.md` updated.

## 27. Testing

- A new module ships **controller e2e specs** (auth + RBAC + scope allow/deny, credit exhaustion, cross-tenant isolation) **and** unit tests for access/credit/permission logic before it's done.
- Unit-test services with mocked providers; e2e-test controllers. Keep code implicitly testable.

## 28. Output Format

- **Audit:** concise plan — violations found + intended changes. Wait for confirmation.
- **Fix:** only modified/added/deleted paths with their changes. No long prose unless justifying a decision.
- Always be able to state: Findings · Root cause · Recommended solution · Files changed · Validation.

## 29. Precedence

1. My explicit instruction in the current turn.
2. Cardinal Rules (§0).
3. This file's specific sections over its general principles.
4. The repo's established consistent pattern over anything ambiguous here — and when you rely on it, tell me so we codify it.

When genuinely unsure and the choice is structural, **ask briefly** rather than guess.
