@AGENTS.md

# frontend/CLAUDE.md — StreamlineOS web app

> In force for every change under `frontend/`. Root `CLAUDE.md` (cardinal rules, boundary, TS quality, product rules, DoD) still applies; this file adds the frontend half and **wins on UI matters**.
> Next.js 16 App Router · React 19 · TS strict · Tailwind 4 · shadcn/ui · TanStack Query v5 · react-hook-form + Zod 4 · Sonner · Framer Motion.
> **UI, client state and Query hooks only** — no business APIs, no DB, no schema (root §5). Auth pages (`/signin`, `/signup`) and the landing page are **IMMUTABLE reference surfaces**: the app conforms to them.

---

## 1. Next.js (v16)

- Server Components by default; `"use client"` only for state, handlers, effects or browser APIs, pushed to the **leaves**. Pass Server Components into Client Components as `children`. Parallelize independent fetches (`Promise.all`/preload); wrap non-`fetch` server data access in React `cache()`.
- **Caching (v16 Cache Components):** dynamic by default — opt in with `use cache` + `cacheLife` + `cacheTag`; a cached function can't read `cookies()`/`headers()`, so read them outside and pass values in. Every mutation pairs with a specific `revalidateTag`/`revalidatePath` (`updateTag` for read-your-writes). Test caching with `next build && next start`, never `next dev`.
- **Business Server Actions and Route Handlers are NOT used here.** The only `route.ts` is NextAuth / auth-bridge. If one ever exists, treat it as a public POST endpoint: Zod-validate, verify auth + object-level + tenant authz, keep it thin.
- **Params are Promises:** `const { projectId } = await params`; validate bracket params as untrusted input. **Route params are descriptive, never `[id]`** — backend `:projectId`, folder `[projectId]` and the variable all match.
- **Middleware is NOT authorization** — bypassable (CVE-2025-29927): optimistic redirects / locale / coarse routing UX only; re-verify at the data layer. Strip `x-middleware-subrequest` at the proxy.
- **The routing layer is `proxy.ts`** (`export async function proxy`, Node runtime); `middleware.ts` is deprecated in v16 and was deleted — never recreate it. No route-permission maps there (the JWT carries no permissions claim; gating is `requirePermission()` server-side + `PermissionGuard` in the API).
- **One wizard-gate authority:** `resolveWizardGate` (`lib/wizard-gate.ts`) decides `/org-setup` / `/employee-onboarding` in the `(authenticated)`, `/org-setup` and `/employee-onboarding` server layouts. `proxy.ts` never redirects on JWT claims (`orgId`, `*OnboardingCompletedAt`) — two decision points over two data sources = `ERR_TOO_MANY_REDIRECTS` the moment they disagree.
- `next/image`, `next/link`, `next/font`, `next/script` with an explicit strategy; `error.tsx` with `reset()`, `not-found.tsx`; production hides raw error text. **Env:** server-only except `NEXT_PUBLIC_` (inlined into the client bundle) — never a secret behind that prefix; mark server-only modules `import 'server-only'`.

## 2. Data Layer (TanStack Query v5)

- **NEVER `useEffect` to trigger an API call** — `useQuery` reads, `useMutation` writes; `useEffect` is for DOM sync, subscriptions and framework concerns. Minimize `useState`/`useEffect` generally.
- **Zustand is NOT installed; do not add it.** Query owns all server state; genuinely shared client state uses **React Context**, co-located with its feature.
- **All client fetching goes through Query hooks in `lib/api/` / `hooks/api/`** — no raw `fetch`/`axios` in components. Any `useEffect` firing a mutation guards StrictMode double-invoke with a `calledRef`, reset only in a user-initiated retry.

**Query keys** — one `queryKeys` object in `lib/query-keys.ts`, one factory per entity, `const base = ["streamlineos"]`; co-locate `queryKey` + `queryFn` + `staleTime` per entity. **Never hand-type a key array.**
⚠️ **The tenant segment lives in the query HASH, not in `base`.** Every key is hashed as `[authenticated:<orgId>:<userId>, key]` by `scopedQueryKeyHashFn` (`lib/query-scope.ts`), which `createAppQueryClient` and `createServerQueryClient` both install, and `QueryProvider` remounts on `key={scope}` so the cache is empty the moment the scope changes. A cross-org read is therefore structurally impossible, including for a factory nobody remembered to thread — proved without `clear()` by `lib/query-scope-isolation.test.tsx`. The key ARRAY stays tenant-free on purpose: `invalidateQueries` matches the array, not the hash.
- **Never hand-thread `orgId` into a factory for an authenticated surface.** That was a second, weaker pattern and it is collapsed: `access.me()`, `access.simulate(targetUserId)`, `access.simulationCandidates(params)`, `hr.attendanceStatus()`, `hr.hub(today)`, `dashboard.*()` and `notifications.*()` all take no org. An `orgId` argument is legitimate only where it selects a **public** tenant the viewer does not belong to — `roadmap.publicBoard(orgId)`, `kbAttachments.publicList(orgId, slug)`, `supportChatWidget.session(orgId, token)`.
- **`queryClient.clear()` stays** at all eight call sites as defence in depth. It is no longer load-bearing; it is the last line against a provider change that drops the scope.
- **A cache outside Query is still a cache.** Org-owned `localStorage` (stored entity ids, per-org drafts) carries the same scope segment via `lib/org-scoped-storage.ts`; pure UI preferences (theme, density, panel-collapsed) deliberately do not.
- `scripts/check-query-scope.mjs` fails the build on a `new QueryClient(` outside the two sanctioned factories, a stray `queryKeyHashFn`, or a prefetch that dehydrates from a client it did not get from `createServerQueryClient` — that last one is what made every authenticated route render a spinner.

**staleTime tiers** — live `0` + `refetchInterval` (realtime counters, in-flight jobs) · volatile `15_000` (fast queues) · standard list `30_000` (permissions, fast-changing lists) · **standard entity `60_000` — the default** · slow list `2 * 60_000` (reference lists, aggregates) · session/org `5 * 60_000` · catalog `30 * 60_000`. Every `useQuery` declares one; every `useMutation` a `mutationKey`. (v5: `cacheTime` → `gcTime`.)

**Hooks** — `hooks/api/<module>/<entity>.ts`. Naming `useThings` / `useThing` / `useCreateThing` / `useUpdateThing` / `useDeleteThing`. Options pass-through `options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">`, spread **before** the gate — **never re-declare `enabled` after `...options`** (it silently clobbers every caller's gate); combine `enabled: !!orgId && (options?.enabled ?? true)`.
**Never hardcode pagination params in a hook** (`?page=1&limit=100` + `select`-away-the-envelope). Hooks take `{ page, limit, status? }` and return the real `{ data, pagination }`; per-status filter badges come from a server-side `statusCounts` aggregate so filtering paginates server-side. **Never hydrate a collection through a parent-detail endpoint** — read a dedicated paginated, column-projected endpoint (`GET /projects/:id/tickets`), never `with: { tickets: … }`.

**Gating** (`hooks/api/access.ts`): `useCan(key)` (owner short-circuits true) · `useModuleEnabled(moduleKey)` (defaults true while loading) · `useAccess()` (staleTime 30_000, `GET /me/access`). **Gate every query:** `enabled: useCan("<the endpoint's exact @RequirePermission key>")`, plus a module check where `@RequireModule` applies. **Never fire an API the role cannot access** — it 403-spams and burns Neon CPU, worst on globally-mounted surfaces (shell, sidebar, header, banners, providers) and dashboard widgets. The key must match the backend catalog **exactly**. Server pages use `requirePermission()`; module on/off is `useModuleEnabled` or `<RequireModule module="…">`; denied UI renders `NoPermissionState`.
**Never POST a lowercase/mixed-case role slug.** Slugs are `UPPERCASE_SNAKE` matching `/^[A-Z0-9_]+$/` — digits allowed (`TIER_2_SUPPORT`); uppercase before sending (canonical `CreateRoleDialog.slugify()`, which strips `[^A-Z0-9_]`), and when cloning a template omit `slug`/`name` to inherit canonical values (template **ids** stay lowercase).

**Mutations** — invalidate by **true key prefix** (no trailing `undefined`; `exact: true` only when meant), listing every affected surface, and always re-call the caller's handler:

```ts
onSuccess: (data, variables, context, mutFnCtx) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });
  options?.onSuccess?.(data, variables, context, mutFnCtx);
}
```

**Optimistic — canonical `useUpdateTicket` (`hooks/api/build/ticket-mutations.ts`):** (1) `onMutate` cancels every key you will patch and snapshots each into a typed context; (2) patch **every cache the view renders from** — detail, single-entity, board array, all paginated pages via `getQueriesData`; (3) resolve related display objects from cached data inside the patch (assignee from `previousDetail.members`, so avatar and name appear immediately — never render an id while waiting); (4) `onError` restores every snapshot including each list snapshot; (5) `onSettled` invalidates, gating expensive aggregates behind the fields that actually move them so a title edit doesn't refetch sprint rollups.
**Inline edits on board/list/card surfaces MUST be optimistic** — never invalidate-and-refetch for perceived speed. Quotes and revenue figures never are. Dedupe identical inflight requests with a shared Promise (token/session).
**Never replace the app with `AppLoadingScreen` on a background refetch or ordinary mutation** — that loader is for the true initial load with no verified session/access data. Preserve stale data during refetch; show pending state only on the affected control/row. Never refresh the NextAuth session to reconcile state Query already owns.

## 3. Components & Memoization

**Pages compose; they don't implement.** A route `page.tsx` fetches and composes — UI lives in `features/<feature>/components/`. Extract the moment a block owns state, repeats, or pushes the file past ~200 lines (hard limits root §7). A 600-line page with five inline sections is a bug, not a style.

**Know the inventory before writing anything:** §15 import index → the feature barrel → `components/shared` → `components/ui`. A component that duplicates an existing primitive is a defect — extend the primitive. There is exactly one `DataTable`, one `TablePagination`, one `LoadingButton`, one `AiActionsMenu`, one editor per class of surface.

**Ownership.** A shared component lives in one place, imported through a barrel, never copied. Second consumer ⇒ promote it to `components/shared` (or `components/ui` for a primitive) and update every importer; feature → feature imports are banned (root §9). **Adding or extending a shared component means adding its row to §15 in the same change** — that index is how the next session finds it instead of writing a third variant.

**Props & attributes**
- Explicit typed props (`interface XProps`), no `any`, no `React.FC`; derive from Zod with `z.infer` where a schema exists.
- Composition over prop drilling — never thread a prop more than 2 levels; use `children` or feature context.
- Named handlers (`handleStatusChange`), never inline anonymous functions; callback props are `onXChange`/`onXSelect`.
- Accept and merge `className` with `cn()`; `forwardRef` whenever the component wraps a focusable or measurable element (and always for DataTable-cell sub-components — hooks can't run in cell callbacks).
- Accessibility is part of the contract: `aria-label` on every icon-only control, `type="button"` on non-submit buttons, label ↔ control via the `Form*` primitives, stable `key` in every list (never the index).
- **`streamline/no-unlabelled-icon-button` enforces the icon-only half at the call site**, which is where a component test cannot reach — `AnimatedIconButton`'s discriminated union requires a name, but that type erases the moment someone writes a raw `<button>`. It flags a `<button>` whose every JSX child is named `*Icon` and which carries no `aria-label` / `aria-labelledby` / `title`. It deliberately skips what it cannot resolve statically: `{...props}` spreads (the caller supplies the name), expression children, lowercase HTML children, and PascalCase children not named `*Icon` — `<TruncatedText>` and `<Avatar>` render visible UI, not icons. Widening it past that produced 101 findings of which one was real. For a confirmed false positive: `// eslint-disable-next-line streamline/no-unlabelled-icon-button -- <reason>`, never a bare disable.
- Spread `{...field}` for react-hook-form controls; never fork a field's state into local `useState`.

**Memoize only what you measured.** Optimizing an unmeasured render costs more (comparison + cache + cognitive load) than the render it saves.
- `React.memo` — only for components rendered many times per screen (table rows, board cards, list items) whose props are already stable.
- `useMemo` — only for genuinely expensive derivations (sorting/grouping large arrays, lookup maps). **Never** for object/array literals or anything Query already caches; reach for `staleTime`/`select` instead.
- `useCallback` — only when the callback goes to a memoized child or is an effect/`useMemo` dependency.

**Rendering cost**
- Lazy-load heavy client components with `next/dynamic` (editors, charts, maps, kanban, anything inside a dialog or sheet); keep `"use client"` at the leaves.
- **Never render an unbounded collection — window it.** Either server pagination (always pass a real `pagination` prop to `DataTable`; the API caps at 100/page) or **`react-window` v2** (`List` + `useDynamicRowHeight`); canonical `features/build/views/kanban-virtual-ticket-list.tsx`. An `items.map(...)` with no pagination, `slice` or windowing is a hang-risk bug.
  - With `@hello-pangea/dnd`: `Droppable mode="virtual"` + `renderClone`. **Gotcha:** react-window v2's `List` holds the scroll container in `useState(null)`, so `api.element` is `null` on first render and dnd trips "innerRef has not been provided with a HTMLElement" — wrap `<List>` in a `display:contents` shell and point `provided.innerRef` at `shellRef.current.firstElementChild` in a `useLayoutEffect`.
- **Rich text:** simple fields (tickets, blog, comments) extend `components/editor/tiptap-editor.tsx` — don't add another. Notion-style surfaces (KB Wiki) use Plate under `components/editor/plate/`.

## 4. Forms, Errors & Toasts

**react-hook-form + Zod always** (`zodResolver`), per-field visible errors. No ad-hoc uncontrolled forms, no `useState` field soup. ≤5 fields → Dialog; 6+/multi-section → Sheet (ladder §13).

**Use the two shells** over hand-wiring `useForm` — `EntityFormSheet` / `EntityFormDialog` (`components/shared`), generic over `<TInput, TOutput>`, props: `open` · `onOpenChange` · `title` · `description?` · `resolver` · `defaultValues` · `onSubmit` · `isSubmitting?` · `submitLabel?` · `cancelLabel?` · `side?` (Sheet only) · `className?` · `resetOnOpen?` · `children: (form) => ReactNode`.

```tsx
// canonical: features/build/sprints/create-sprint-dialog.tsx
const handleSubmit = (data: CreateSprintInput) => {
  createSprint.mutate(payload, {
    onSuccess: () => { toast.success("Sprint created successfully"); setOpen(false); },
    onError: (error) => { toast.error(getErrorMessage(error)); },
  });
};

<EntityFormSheet<CreateSprintInput>
  open={open} onOpenChange={setOpen} title="Create new sprint"
  resolver={zodResolver(createSprintSchema)} defaultValues={{ name: "", … }}
  onSubmit={handleSubmit} isSubmitting={createSprint.isPending} submitLabel="Create sprint"
>
  {(form) => <SprintFormFields form={form} />}
</EntityFormSheet>
```

Fields live in a sibling `*-form-fields.tsx` taking `{ form }`; the schema in a sibling `*-schema.ts` exporting schema + `z.infer` type.

**Field primitives** (`components/ui/form.tsx`): `Form` (FormProvider) · `FormField` (Controller + name context) · `FormItem` (`div.grid.gap-2`) · `FormLabel` (auto `htmlFor`, `data-[error=true]:text-destructive`) · `FormControl` (Slot wiring `id`, `aria-describedby`, `aria-invalid`) · `FormDescription` · `FormMessage` (`text-destructive text-xs`, `role="alert" aria-live="polite"`). Label above control, helper below, error below helper; `FormMessage` renders `null` with no error — never conditionally mount it. All controls inherit `h-9 / text-sm` from `FIELD_CONTROL_CLASS`.

**One error-extraction function:** `getErrorMessage(error: unknown): string` (`lib/get-error-message.ts`). **Every mutation `onError` and every error-state string goes through it** — never `error instanceof Error ? …`, never raw `.message`. It surfaces the backend message and substitutes a friendly generic only for bare status lines (`"404 Not Found"`), reason phrases, network failures, stale-build chunk errors and empty/`[object Object]` errors; status fallbacks are specific (402 credit/plan, 403 permission, 409 conflict).

**One error parser:** `lib/api-client.ts` — `ApiError { status?, code?, details? }` + `isApiError()` / `getApiErrorCode()`. Error body reads `message` as `string` **or** `string[]` (NestJS validation → joined `", "`), else `error`; success body `{ success: true, data }` unwraps to `data`; `204` → `undefined`. Branch on `isApiError(e) && e.status === 409`, never on message prefixes. Timeout **30s** → `ApiError(…, "TIMEOUT")`; `401` retries once with a fresh token then signs out; `403` with `ORG_MEMBERSHIP_INACTIVE`/`SUSPENDED` redirects to `/access-suspended`.

**Toasts (Sonner):** success toasts are used — past tense, specific; errors always `toast.error(getErrorMessage(error))`. No toast for an optimistic inline edit that already shows its result; the rollback is the error signal.

**Confirmations:** `UnsavedChangesDialog { open, onOpenChange, title?, description?, keepEditingLabel?, discardLabel?, saveLabel?, onSave?, onDiscard, isSaving? }` (omit `onSave` → Discard + Keep editing only). `ConfirmDialog { title, description, icon?, content?, confirmLabel?, cancelLabel?, destructive?, isPending?, confirmIcon?, hideConfirm?, keepOpenOnConfirm?, onConfirm } & ({ trigger } | { open, onOpenChange })` — trigger XOR controlled, enforced by the type; `keepOpenOnConfirm` keeps a failed action's dialog open, `hideConfirm` makes it a blocked-state explainer.

## 5. Content Rules

- **Show names, never raw IDs.** Cards, tables, exports, tooltips, activity logs and filter chips render display names (`getUserDisplayName`/`getUserInitials`), titles or status labels, resolved from an already-cached list at the display boundary. A visible UUID is a bug.
- **Edit-in-place on cards/rows.** Every editable field (assignee, status, priority, type, points, labels, cycle, dates) changes inline via a compact popover — reuse `features/build/views/card-inline-fields.tsx` with the optimistic mutation.
- **Inline contextual AI on detail/record surfaces** where it genuinely reduces effort — never forced, never on trivial pages. Use `AiActionsMenu` (`components/ai/`) over the module's existing gateway endpoint: draft-first (the user applies — never auto-send), credit-metered, `useCan`-gated, errors via `getErrorMessage`, rendering `AiUsageChip`.
- **Unconnected integration** → a clear "Connect X" banner with an action; never fail silently or render broken data.
- Long content scrolls **inside the main content area only**; no unintended overflow (`min-w-0`, `truncate`, `flex-1` — never fixed heights that burst).

## 6. Structure & Naming

- Feature code → `features/<feature>/{components,lib,hooks}/`. **Banned:** `_components/`, `_lib/` inside `app/`. `app/` holds route files only.
- Cross-feature UI → `components/`; shared hooks → `hooks/`; utils → `lib/`; shared types → `types/` or co-located.
- **Feature-first.** A feature owns its components/hooks/queries/types behind its barrel `index.ts` — import through the barrel (`import { EntityFormSheet } from "@/components/shared"`), max ~3–4 folders deep. Move misplaced files when fixing a page.
- kebab-case files/folders, PascalCase symbol inside; hooks `use-*.ts` → `useX`; server fetch helpers `get-*`; **Zod schemas in `*-schema.ts`** typed via `z.infer`. ⚠️ Legacy drift exists (inline `z.object({` in `.tsx`); new code adds none.
- Tabs sharing a line with search/filters use `PageTabsToolbar` (`{ tabs, search?, filters?, actions?, tabsDensity?, collapseBelow?, className? }`); a body-filling `TabsContent` needs `TABS_CONTENT_PAGE_BODY_CLASS`.
- Tab and filter state syncs to the URL with `router.replace(\`${pathname}?${params.toString()}\`, { scroll: false })` (canonical `features/build/all-work/use-all-work-filters.ts`), always resetting pagination.

---

# UI/UX System

**Density with restraint** (power users live here 6–8h/day; breathing comes from deliberate section separation, not random gaps) · **one accent, not a rainbow** · **consistent page anatomy** everywhere · **motion discipline** · **predictable states** (loading, empty, error, sparse 2–5, dense 50–500).

## 7. Color, Typography, Spacing

**Color** — tokens live in `globals.css` (Tailwind 4, CSS-first: `:root` + `.dark`, no `tailwind.config`). **Never restate a hex in a component.** Slate-neutral base, ink-black CTAs, blue-500 focus/links.
- `--primary` ink CTA fill · `--ring` focus rings · `--brand-*` + `--gradient-signature` landing/onboarding/marketing only · `--chart-1..5` chart seeds · `--sidebar-*` sidebar chrome.
- **`--accent` is a NEUTRAL hover wash, not brand blue** — shadcn primitives (DropdownMenuItem, SelectItem, CommandItem, CalendarDay…) paint `bg-accent text-accent-foreground` on hover/focus, so a chromatic value makes every menu hover illegible.
- **Accent surfaces use tokens, not literals.** Unread bars/dots, selection tints, active filters, count badges and selected cards use `bg-primary`, `bg-primary/5..15`, `border-l-primary`, `--ring` — a hardcoded `blue-*` doesn't flip in dark mode and forks the accent source. Literal blue survives only for semantic info and chart seeds. **Blue replaces purple** wherever legacy violet/indigo is removed.
- **Semantic status** — new code uses the status tokens: `statusToneClasses(tone)` from `lib/design-tokens`, giving `bg-status-<tone>-surface` / `text-status-<tone>-ink` / `border-status-<tone>-rule` for `success` · `warning` · `danger` · `info` · `neutral`. The dark pairing is built into the token, so no `dark:` twin is written by hand. Existing literals `bg-X-50 text-X-700 border-X-200` (emerald = completed/active/approved · amber = pending/expiring · red = error/rejected/overdue · blue = draft/in-progress/info · slate = closed/archived) stay valid until ticket 17 migrates them — do not add new ones. Never brand gradients for status, never status colors for decoration. **Every light tint carries `dark:bg-X-500/10 dark:text-X-300 dark:border-X-500/30`**; standalone colored icons carry `dark:text-X-400`. Never `bg-white` or raw `slate-*` chrome.
- **Borders:** `border-border` full opacity for structure; **≥70%** on any card/panel outer boundary (`border-border/70` is compliant); `/60` only for hairline dividers inside dense rows.
- **Per-module identity accent** — identity moments only (activity-bar icon tint, active nav indicator, module hero tint, chart seed), never buttons, hovers or body text: CRM/Sales `blue-600` · Build/PM `violet-600` · HR/People `emerald-600` · Inventory `amber-600` · Billing/Finance `cyan-700` · Support `rose-600` · Admin/Settings `slate-600`.

> **HR + Administration rich-surface exception.** The HRMS gradient hero, colored tone tiles and tinted chrome are DESIRED, and `/settings/*` follows the same treatment. The kit is shared — `components/shared/rich-surface.tsx`, re-exported as `Hr*` by `features/hr/shared/hr-ui.tsx`; Administration imports the **shared** module, never `features/hr/**`. For these two only, `rounded-2xl` and `backdrop-blur` are sanctioned and override the card-radius rule and AP-4. Every other module stays ink-first at `rounded-xl`. Structural rules (fill chain, `h-9` controls, `LoadingButton`, `getErrorMessage`, a11y) are **not** relaxed.

**Typography** — Geist via `next/font`, no second sans-serif; the `cv02`/`cv03`/`cv04`/`cv11` alternates are global, don't remove them.

| Role | Class |
|---|---|
| Page title default · display | `text-lg font-semibold tracking-tight` · `text-2xl font-extrabold tracking-[-0.02em]` |
| Section heading · sub-heading | `text-sm font-semibold` · `text-[13px] font-medium` |
| Body · dense/table cell | `text-sm` · `text-[11px]` |
| Label · caption | `text-[13px] font-medium` · `text-[11px] font-medium tracking-wider` |
| Table header · badge | `text-[10px] uppercase tracking-wider font-bold` · `text-[10px]` |
| Mono / numbers | `font-mono text-[11px]` |

`h1`–`h6` default to `-0.02em` / weight 600; `font-extrabold` only for `variant="display"` and marketing. **Every numeric cell** (amounts, counts, percentages, dates) is `font-mono` or `tabular-nums` — prevents column jitter.

**Spacing — base unit 4px**, never `p-[7px]`, `mt-[13px]`, `gap-[5px]`.
- Page chrome belongs to `components/ui/content-fill-panel.tsx` — **never re-declare page padding at a call site**: `PAGE_CHROME_X` = `px-4 sm:px-6 lg:px-8`, `PAGE_CHROME_BOTTOM` = `pb-0` (bodies meet the shell edge; Ask OS / FABs float above).
- **Card padding** standard `p-4` · compact list `p-3` · metric `p-4 sm:p-5` · section header in card `px-4 py-3`. **Gaps** `gap-1` icon+label · `gap-2` field stack/button group · `gap-3` filter bar & header actions · `gap-4` card grid · `gap-6` section separator.
- **Table density comes from the primitives:** `TableHead` `h-10 px-2 text-sm font-medium text-muted-foreground whitespace-nowrap` · `TableRow` `hover:bg-muted/50 data-[state=selected]:bg-muted border-b` · `DataTable`'s header `sticky top-0 z-10 bg-muted/50 border-b` · skeleton cell `px-2 py-2 text-sm`. A row needing height gets it from multi-line content, never an `h-*` override. **Anything denser than `h-10` is not implemented.**
- **Never hardcode heights.** No `h-60`, `min-h-[260px]`, fixed skeleton blocks. States fill via a flex chain (`flex flex-col` ancestors + `flex-1 min-h-0`), or `min-h-[calc(100vh-<real chrome>)]` when a chain is impractical; scroll areas are `flex-1 min-h-0 overflow-y-auto`.
- **No overlapped spacing.** A container owns its padding once — children never re-add horizontal padding inside a padded parent, never mix `space-y-*` with child `mt-*`; gaps come from ONE `gap-*` on the parent.

## 8. Page Anatomy

**Every authenticated page uses `PageWrapper`** (`components/ui/page-wrapper.tsx`) — never `min-h-screen`, a page-level gradient, or an ad-hoc `<h1>`; the shell owns the background.

**Props:** `title?` (the h1, optional for chromeless pages) · `subtitle?` · `badge?` (meaningful status, not a row count) · `backHref?` / `onBack?` / `backLabel?` · `leading?` (overrides back) · `actions?` (max 3) · `filters?` · `filtersClassName?` · `actionsInline?` · `children` · `className?` / `contentClassName?` · `noInternalScroll?` (Kanban, map) · `variant?: "default" | "display"`. **There is no `eyebrow` and no `filtersCollapseBreakpoint`.**

Title classes belong to the component — never restyle the `h1`: default `text-base sm:text-lg font-semibold tracking-tight leading-tight`; display `font-display text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold tracking-[-0.02em]`. `badge` renders `bg-primary/10 border-primary/20 text-[11px] tabular-nums`. A string `title` is auto-wrapped in `<TruncatedText>`; a `ReactNode` title is not.

- **One `<h1>` per page** — the `title` prop, never another inside children. Subtitle is a live count on list pages, `line-clamp-1`; never a bare row count as the whole subtitle or badge.
- **Max 3 actions, exactly one primary**, never stacked vertically.
- **Filter bar only when the page has filterable content.** `PageWrapper` renders **no divider** — separation comes from the header's `pb-3` and the body's own border; never fake one with `border-b`.
- **No `backHref` on a page with its own sidebar entry.** Detail pages get a back button (`ChevronLeft` + "Back to X"); breadcrumbs only at ≥3 levels. `variant="display"` is for genuine module hero surfaces only, consistent across siblings.
- **<640px:** `text-base` title, actions become a full-width row (`grid grid-flow-col auto-cols-fr`), a sole filter fills width, multi-filter collapses into a **Drawer**. ≥640px: right-aligned actions, single-row filters that never wrap.

## 9. Filters & Toolbars

2–4 mutually exclusive views → `Tabs`/segmented chips · 5+ status options → `Select` · multiple facets → one `Select` each · free text → `SearchInput` + `useDebouncedValue` (≥300ms; the component does not debounce for you) · dates → `DateRangePicker` or two `date` inputs, never free text · bulk actions → a contextual toolbar shown only when rows are selected.

**Sentinel-default Selects:** the first option is an "all" sentinel with a descriptive label (`<SelectItem value="all">All statuses</SelectItem>`); choosing it **removes** the query param rather than setting `"all"`.

```tsx
<div className={FILTER_TOOLBAR_ROW}>            // components/ui/content-fill-panel.tsx
  <SearchInput … />
  <Select …><SelectTrigger className={FILTER_SELECT_TRIGGER} />…</Select>
  <div className="ml-auto flex shrink-0 items-center gap-2">{/* export/secondary */}</div>
</div>
```

- **h-9 canon:** every field control (Input/SearchInput/SelectTrigger/DatePicker/combobox trigger) takes `h-9 / text-sm` from `FIELD_CONTROL_CLASS` (`components/ui/field-control.ts`) via the root primitives. **Never add local `h-8`/`h-10`/`text-xs`.** Only established inline-cell/popover editors inside tables and cards may be compact.
- `FILTER_SELECT_TRIGGER` carries color chrome only (`border-input bg-card`), deliberately **no height class**. `FILTER_TOOLBAR_ROW` is the only filter-row container: one row, `flex-nowrap`, `overflow-x-auto scrollbar-hide`, children `shrink-0`. **Filter rows never wrap**; never hide overflow with `overflow-hidden`.
- **No card/panel around a filter row** — fields already carry `border-input bg-card`, so a wrapper makes nested cards. `ViewToggle`/`TabsList` are the only bordered chrome allowed in the row, which sits in `PageWrapper`'s `filters` prop with no border, background or extra padding.
- **Search leftmost**, status second, specific filters after, export/secondary at `ml-auto`.
- **Select dropdowns fit their options:** `SelectContent className="min-w-[var(--radix-select-trigger-width)]"` (`FIELD_SELECT_CONTENT_CLASS`) — never `w-[…]`, which clips. Size triggers to content (`w-fit`/`min-w-[..px]`) when values are long.
- **Filters always update the URL** (`router.replace` + `useSearchParams`) and **always reset pagination**. Show an active-filter count badge on the mobile trigger when >2 are active. **Below `md`, any filter/display/menu panel that would be a Popover or Sheet becomes a Drawer** via `ResponsivePopover`; desktop unchanged, tiny 1–3 item menus and date pickers exempt.

**Fill-height list page:** `PageWrapper` gets `noInternalScroll className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"`; body order = stats row (`shrink-0 mb-2`) → conditional bulk bar → table card (`flex-1 min-h-0`), the card being `<Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">` around `<CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">`. Filters render above it, `shrink-0`, no border/background, search `min-w-0 flex-1 lg:max-w-md`. Non-fill pages (settings, detail sub-tables) use `<Card className="overflow-hidden"><CardContent className="p-0 overflow-x-auto">`.

## 10. Component Contracts

**Buttons** — **one default-variant `<Button>` per view**, never two primaries side by side. Default (slate-900 fill) = the single most important action · Outline = secondary (Export, Edit, Cancel) · Ghost = tertiary/icon-only · Destructive = delete confirm only, inside `AlertDialogAction`. `h-9` standard, `h-7` icon-only in table rows. Press feedback is built into `Button` — never re-add `active:scale`. **Every async button is `<LoadingButton isPending>`** — never `disabled={isPending}` + a spinner ternary.

**Cards** — **`rounded-xl` is the shell card radius**, two sanctioned surfaces: the `<Card>` primitive (`bg-card text-card-foreground flex flex-col rounded-xl border border-border/70 shadow-noir`) when you need CardHeader/Content/Footer, or a plain panel via `CONTENT_PANEL_SOLID` (`rounded-xl border border-border bg-card shadow-sm`) — import the constant, never retype it. Radius scale (`--radius: 0.625rem`): `sm` 6 · `md` 8 · `lg` 10 · `xl` 14px — inputs/tables `rounded-md`, cards/panels `rounded-xl`, `2xl`/`3xl` marketing + the HR/Administration rich surface only (AP-4). Shadows: `shadow-sm` for page panels, `shadow-noir` inside `<Card>`; `shadow-soft`/`shadow-medium` are **deprecated**. Always `bg-card`, never `bg-white`; translucent fills ≥75% card opacity with ≥70% borders. Clickable cards add `hover:border-primary/40 hover:shadow-md transition-all cursor-pointer`. No backdrop-blur or heavy shadows in the shell.

**StatCard** — `<StatCard>` / `<StatCardGrid>` (`components/ui/stat-card.tsx`) is the ONE stats component; a bespoke `text-xl font-bold` div over a label, or a bespoke `grid grid-cols-*`, is an anti-pattern.

```tsx
<StatCardGrid cols={4}>
  <StatCard label="Active Users" value={42} icon={Users} tone="emerald" />
</StatCardGrid>
```

Card is `rounded-lg border border-border bg-card px-3 py-2.5` (~56px) — tinted icon square (`h-8 w-8 rounded-md`) left, label `text-[11px] font-medium text-muted-foreground` (no uppercase) + value `text-lg font-semibold tabular-nums` right. `tone`: `default` · `blue` · `emerald` · `amber` · `red` · `violet` (RBAC/privileged); optional `delta`, `hint` (never with `delta`), `href`, `isLoading`. **`StatCardGrid` is always ONE horizontal row:** `repeat(N, minmax(10rem, 1fr))` from child count, `gap-3`, horizontal-scroll container **at every breakpoint** (`overflow-x-auto scrollbar-hide touch-pan-x`) so the ROW scrolls and the PAGE never does. **Never `md:overflow-x-visible`**, never multi-row, never wrap, never compress below ~10rem.

**Data tables** — `DataTable` (`components/ui/data-table.tsx`) for every page-level list/admin table, never a raw shadcn `<Table>`; `@tanstack/react-table` v8 wrapped so consumers never import TanStack types.

| Prop | Notes |
|---|---|
| `data` `T[]` · `columns` `DataTableColumn<T>[]` | required |
| `getRowKey` `(row, index) => string \| number` | required — takes **index too** |
| `isLoading` · `emptyState` | skeleton rows matching column count · rendered in a colspan cell |
| `pagination` | `{ pageSize?; onPageSizeChange? }` \| `{ mode: "server"; page; pageSize; total; onPageChange; onPageSizeChange?; pageSizeOptions? }` — **always pass it** |
| `selection` | `{ selected: Set<…>; onChange; isRowSelectable? }` — adds the checkbox column |
| `sortState` | `{ fields; field; direction: "asc" \| "desc"; onChange }` = **server sort, the only sort there is**; omit it and no header offers to reorder |
| `mobileCard` | `(row, index) => ReactNode`, replaces the table below `sm` |
| `search` / `toolbar` | declared and compiling — **do not pass them** |
| `onRowClick` · `footer` · `minWidth` · `className` · `rowClassName` | `rowClassName: (row, index) => string` |

`DataTableColumn<T>` = `{ key; header; cell: (row) => ReactNode; className?; headerClassName? }`. Search and filters live in `PageWrapper`'s `filters` prop above the card; `DataTable` renders only the table + pagination footer — `search`/`toolbar` still compile, so this is enforced **in review**.
**Sorting is the server's, and there is no client sort.** `sortState.fields` names the `key`s the endpoint accepts; a column in that list gets a header control, every other column gets none, so a header can never ask for an order the API would drop. Canonical `features/users/users-page.tsx` — one `as const` list feeds both the URL-param parse and `fields`, which is what stops the two drifting. **Never sort in the component instead:** a `DataTable` holds one page (server pagination, or a hook with its own `limit`), so a column-header sort over `data` reorders that page and presents it as a sorted table. There is no prop that makes this safe — whether the table holds the whole set is a property of the hook call, not of anything `DataTable` receives. The predecessor `sortable`/`sortValue` pair was inert for its whole life (display columns have no `accessorFn`, so table-core's `getCanSort()` was false for all 234 declarations) and is deleted; `components/ui/data-table-sorting.test.tsx` holds the line.
Call-site rules: row-actions column `w-8` with an `h-7 w-7` ghost icon button · numeric `font-mono tabular-nums text-right`, text left with `truncate`, links `text-blue-600 hover:underline` and no other link color · status via `<Badge variant="outline">` · empty body = one `<TableRow><TableCell colSpan={N} className="p-0">` wrapping `<EmptyState className="border-0 bg-transparent min-h-[40vh]">` · scroll body `flex-1 min-h-0 overflow-auto` with a `min-w-max` inner div.
**Fill chain:** a table filling the page body needs `className="flex-1 min-h-0"` on `DataTable` **and** a `flex min-h-0 flex-1 flex-col` ancestor chain, or it stops short of the shell edge.
**Pagination — two components, not interchangeable:** `DataTablePagination` (`components/shared/`) is what `DataTable` renders internally (page-size + first/last) — never mount it yourself; `TablePagination` (`components/ui/`) is for every **non-`DataTable`** paginated surface. Never hand-roll a prev/next footer.

**Sheets & dialogs** — three zones; header and footer never scroll:

```tsx
<SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
  <div className="shrink-0 px-6 py-4 border-b"><SheetHeader>…</SheetHeader></div>
  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">{/* fields */}</div>
  <div className="shrink-0 px-6 py-4 border-t">
    <div className="grid grid-cols-2 gap-2">      {/* equal width; 3+ → grid-flow-col auto-cols-fr */}
      <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
      <Button type="submit">Save Changes</Button>
    </div>
  </div>
</SheetContent>
```

`SheetContent` **always** `p-0` (inner zones own padding); the body **must** carry `min-h-0` or the flex chain overflows. `SheetTitle` `text-base font-semibold`, `SheetDescription` `text-[13px] text-muted-foreground`. Widths: short form `sm:max-w-md` · long form `sm:max-w-md`–`lg` · detail `sm:max-w-lg`–`xl` · full-context edit `sm:max-w-2xl` · mobile nav (Sheet left) `w-[17rem]`.

**States**
- **Empty** — `<EmptyState>` filling available height (`flex-1 min-h-[40vh]`, `min-h-[60vh]` full-page): illustration/icon → title (short noun phrase) → one-sentence description → **one** CTA. Full-page empties use a themed SVG from `components/illustrations` (extend in `_shared.tsx` style; unDraw only as recolored inline components, never raw downloads); compact/table-cell empties keep a lucide icon at `h-8 w-8 text-muted-foreground/40`. **Filter-empty ≠ data-empty:** filters active → "No results match your filters." + Clear filters; no data → the create action.
- **Loading** — skeletons, never standalone spinners: `<DataTableSkeleton rows columns />` (`components/ui/data-table.tsx`, defaults 12/4), `StatCardGridSkeleton`, `KanbanBoardSkeleton`, or `<Skeleton>` shaped to real content. A skeleton is a **visual Xerox** — same sections and columns, ~9–12 dense rows, filling remaining height, one non-wrapping row of `h-9` blocks for filters. `Loader2` is button/inline only. Suppress under 200ms (`isPending && !data`).
- **Error** — `<ErrorState>` (`components/shared`): friendly non-technical title, `description` that may include a user-actionable error, `onRetry` wired to `refetch`, `className="flex-1"`.

**Lifecycle confirmations** — hierarchy records archive and restore, never delete; all six pages use `HierarchyArchiveDialog` on `ConfirmDialog` with reversible-impact copy. A failed archive must not dismiss its dialog: dependency conflicts switch it to a blocked state listing each dependency and count, explain the resolution, hide the archive action and state that nothing changed. Parent selectors never offer archived/disabled/retired units.

**Badges & phone** — `<Badge variant="outline">` + semantic classes: table row `h-4 px-1.5 py-0 text-[9px]` · card chip `h-5 px-2 py-0.5 text-[10px]` · header/filter `h-5 px-2 py-0.5 text-xs`. Every phone/mobile/WhatsApp field uses `<PhoneInput>` (`components/ui/phone-input.tsx`), never a bare `<Input type="tel">`; default `defaultCountry="IN"`, emits E.164.

## 11. Icons

**Animated icons on ALL interactive/hoverable surfaces** — row actions, dropdown/popover/sheet triggers, primary CTAs, clickable cards, nav items — from `@animateicons/react/lucide` (`XxxIcon`), driven from the PARENT via `useAnimatedIcon()` (`hooks/common/use-animated-icon.ts` → `{ iconRef, hoverHandlers }`).

1. **`AnimatedIconButton`** (`components/ui/animated-icon-button.tsx`) is THE way to put an animated icon in a shadcn `Button` — wires the hook, forwards Button props, works under `DropdownMenuTrigger asChild`. `iconSize` defaults to 14; pass 16 where the static icon was `h-4 w-4`.
   ```tsx
   <AnimatedIconButton icon={EllipsisIcon} variant="ghost" size="icon" className="w-7" aria-label="Actions" />
   <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" size="sm">New Item</AnimatedIconButton>
   ```
2. Plain `<button>` and `.map()`/DataTable-cell contexts: extract a small named `forwardRef` sub-component in the same file that calls `useAnimatedIcon()`.

**Names are not 1:1 with lucide** (`MoreHorizontal` → `EllipsisIcon`) — verify the export exists in `node_modules/@animateicons/react`. **`PencilIcon` does not exist; keep `Pencil` static.**
**Static `lucide-react` — non-interactive only:** badges/status chips, empty states, informational rows, section titles, `Loader2`, decorative icons (breadcrumb chevrons, field adornments, the `SearchInput` magnifier). **Banned:** `@phosphor-icons/react`, `react-icons`, any other icon library.
**Sizes:** nav / row action / filter `h-4 w-4` · button icon `h-3.5 w-3.5` (small `h-3 w-3`) · card/stat `h-5 w-5` · empty-state `h-8 w-8` · full-page illustration `h-12 w-12`.

## 12. Motion

**Only GPU-composited properties** (`opacity`, `transform`) — never `width`, `height`, `padding`, `margin`, `top/left`. 150–250ms micro-interactions, 250–350ms panels/pages, nothing over 400ms in app chrome. **Always respect `prefers-reduced-motion`** via `useReducedMotion()` — keep opacity, drop translate and scale. Animate containers, never text nodes.

| Context | Spec |
|---|---|
| Button hover · press | 150ms `transition-colors` (CSS, no Framer) · `whileTap={{ scale: 0.97 }}` |
| Dropdown/popover · Dialog | 150ms `ease-out` `tailwindcss-animate` · `fade-in-0 zoom-in-95` |
| Sheet slide-in | 200ms `ease-out`, matched to its side |
| Page / step transition | opacity + x, `duration: 0.22, ease: "easeOut"`, inside `<AnimatePresence mode="wait">` |
| List stagger · skeleton shimmer | `delay: index * 0.08` · 1.5s linear infinite (CSS) |

Shared variants in `lib/motion-variants.ts`: **`staggerContainer`, `fadeUp`, `fadeIn`, `slideInLeft`, `scaleIn`** — import them, don't redefine. Under reduced motion swap to `{ hidden: { opacity: 0 }, visible: { opacity: 1 } }`.
**Never animates:** sidebar width (CSS `transition-[width]` only) · table rows on data refresh · hover states (CSS `transition-colors` — Framer costs 10s of JS events/second on dense tables) · status badge changes.

## 13. Overlay Ladder

**Always use the lowest rung that suffices** — escalating past the first rung that fits is a violation, not a style choice.

```
ONE field on a record already on screen?
├─ YES → bounded option set?  NO → RUNG 1 inline edit (no overlay)
│                             YES → RUNG 2 ResponsivePopover (Drawer < md)
└─ NO  → ≤5 fields, no context needed      → RUNG 3 EntityFormDialog   sm:max-w-md
         6+ / multi-section / keep context → RUNG 4 EntityFormSheet    sm:max-w-md–lg
         read-only detail of one record    → RUNG 4 AppSheet           sm:max-w-lg–xl
         irreversible / lifecycle          → ConfirmDialog destructive (any field count)
         substantial entity or workspace   → RUNG 5 full page route
```

Rung 1 `features/build/views/card-inline-fields.tsx` · rung 2 `components/ui/responsive-popover.tsx` (`INLINE_POPOVER_MIN_CLASS`) · rungs 3–4 `components/shared` · confirms `components/ui/confirm-dialog.tsx`, `unsaved-changes-dialog.tsx`.
**Hard rules** — a single-field transform never opens a Sheet or Dialog · below `md` every rung-2 popover and rung-3/4 filter or menu panel becomes a **Drawer** (date pickers and 1–3 item menus exempt) · rung 3 vs 4 is decided by field count, not by what was easier to build · destructive actions are always `ConfirmDialog destructive`, never a bare `Dialog` with a red button (typed-name confirm for high blast radius) · hierarchy records archive via `HierarchyArchiveDialog`, never delete.

## 14. Anti-Patterns & Per-Page Checklist

| # | Banned | Rule |
|---|---|---|
| **AP-1** | `SheetContent` without `p-0` + an inner `p-4` wrapper (40px edge padding) | always `p-0 flex flex-col gap-0`; inner zones own padding (§10) |
| **AP-2** | Status filter as `<Tabs>` with 5+ triggers (overflows at 768px) | Tabs only for ≤4 content categories; status filters are `<Select>` (§9) |
| **AP-3** | Gradient/`.brand-text` on titles, headers, labels or nav inside the shell | gradient text only on landing, `/signin`, `/signup`, onboarding hero |
| **AP-4** | `rounded-2xl`/`3xl` on shell cards, tables, inputs, sheets | `rounded-xl` cards/panels, `rounded-md` inputs/tables; `2xl`/`3xl` only for marketing, bottom sheets, onboarding, HR/Administration (§7) |
| **AP-5** | A ≥50-row list page with no search and no status filter | at minimum search + status `Select` (§9) |
| **AP-6** | A page rendering its own `<div>` header instead of `PageWrapper` | every authenticated page uses `PageWrapper` (§8) |
| **AP-7** | `animate-spin` as the page loading state | page loading is a skeleton matching the real shape; `Loader2` is button-only (§10) |
| **AP-8** | `text-[#3b82f6]`, `style={{ backgroundColor: '#0b1220' }}` | colors reference tokens; only semantic status families may be literal Tailwind colors (§7) |

- [ ] Loading / empty / error all implemented and **filling** height via the flex chain; no hardcoded heights; skeleton mirrors the real layout
- [ ] Every query gated by `useCan("<the endpoint's exact key>")`; no raw IDs rendered anywhere
- [ ] Filters update the URL; pagination resets on filter change; server-side pagination
- [ ] Field controls left at `h-9`; numeric cells `font-mono tabular-nums`
- [ ] Mobile: sole filter and sole action fill width; multi-filter collapses into a **Drawer**
- [ ] Interactive icons animated; async buttons are `LoadingButton`; colored tints carry `dark:` pairings
- [ ] Components extracted, reused from §15, memoized only where measured (§3)
- [ ] Tested at 375 / 768 / 1280; icon-only buttons have `aria-label`; keyboard-navigable
- [ ] No `any`, no `@ts-ignore`, no casts to silence TS
- [ ] Real data renders — if an API fails, fix the API/hook; the demo org has seed rows for the page **and its detail routes**

## 15. Component Import Index

If it is here, do not reimplement it. **Adding a shared component means adding a row here.**

| Need | Component · Path |
|---|---|
| Page shell | `PageWrapper`, `PageSection` — `components/ui/page-wrapper.tsx` |
| Page chrome constants | `PAGE_CHROME_X`, `PAGE_CHROME_BOTTOM`, `CONTENT_PANEL_SOLID`, `CONTENT_FILL_PANEL`, `FILTER_TOOLBAR_ROW`, `FILTER_SELECT_TRIGGER`, `PAGE_BODY_SKELETON_CLASS`, `PAGE_BODY_EMPTY_CLASS` — `components/ui/content-fill-panel.tsx` |
| Field sizing constants | `FIELD_CONTROL_CLASS`, `FIELD_SELECT_CONTENT_CLASS`, `FIELD_DATE_POPOVER_CONTENT_CLASS`, `INLINE_POPOVER_MIN_CLASS` — `components/ui/field-control.ts` |
| Table · skeleton | `DataTable`, `DataTableColumn`, `DataTableSkeleton` — `components/ui/data-table.tsx` |
| Pagination | `TablePagination` — `components/ui/table-pagination.tsx` · `DataTablePagination` — `components/shared/data-table-pagination.tsx` |
| Stats · search | `StatCard`, `StatCardGrid`, `StatCardSkeleton`, `StatCardGridSkeleton` — `components/ui/stat-card.tsx` · `SearchInput` — `search-input.tsx` |
| Tabs | `Tabs`, `TABS_CONTENT_PAGE_BODY_CLASS` — `components/ui/tabs.tsx` · `PageTabsToolbar` — `page-tabs-toolbar.tsx` |
| Form shells · primitives | `EntityFormSheet`, `EntityFormDialog`, `AppSheet`, `AppDialog` — `components/shared` · `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` — `components/ui/form.tsx` |
| Confirm | `ConfirmDialog` · `UnsavedChangesDialog` · `ConfirmSheet`, `ConfirmWithReasonSheet` — `components/ui/` |
| Async button · animated icon | `LoadingButton` — `components/ui/loading-button.tsx` · `AnimatedIconButton` — `animated-icon-button.tsx` · `useAnimatedIcon` — `hooks/common/use-animated-icon.ts` |
| States | `EmptyState` — `components/ui/empty-state.tsx` · `ErrorState`, `LoadingState`, `AccessDenied`, `NoPermissionState` — `components/shared` |
| Mobile overlay · badges | `ResponsivePopover`, `Drawer` — `components/ui/` · `Badge`, `SemanticBadge`, `StatusBadge`, `StatusMapBadge` — `components/ui/` |
| Pickers | `PhoneInput` · `DatePicker`, `DateRangePicker` · `Combobox`, `UserCombobox` — `components/ui/` |
| Board skeletons | `KanbanBoardSkeleton`, `KanbanColumnSkeleton` — `components/ui/kanban-skeleton.tsx` |
| Rich surface (HR + Administration) | `RichPanel`, `RichPageContent`, `RichHero`, `RichQuickAction`, `RichIconWell` — `components/shared/rich-surface.tsx` (re-exported `Hr*` from `features/hr/shared/hr-ui.tsx`) |
| AI | `AiActionsMenu`, `AiUsageChip` — `components/ai/` |
| API · errors · keys | `apiClient`, `ApiError`, `isApiError`, `getApiErrorCode` — `lib/api-client.ts` · `getErrorMessage` — `lib/get-error-message.ts` · `queryKeys` — `lib/query-keys.ts` |
| Access | `useAccess`, `useCan`, `useModuleEnabled`, `usePermissionCatalog` — `hooks/api/access.ts` · `useOrgDisplay` — `hooks/api/org-display.ts` · `<RequireModule module="…">` — `components/auth/require-module.tsx` · `requirePermission` — `lib/rbac/require-permission.ts` |
| Design tokens | `STATUS_TONES`, `statusToneClasses`, `typeScaleClass`, `densityAttribute`, `DENSITY_MODES` — `lib/design-tokens/index.ts` (values in `globals.css`; live gallery at `/design-system`, dev only) |
| Format · motion | `formatMoney`, `formatMoneyCompact`, `MoneyDisplay`, `formatINR`, `formatINRCompact`, `formatCurrencyFull`, `getInitials`, `formatTime`, `formatFileSize`, `calcPercent`, `numberToWords` — `lib/format-utils.ts` · `staggerContainer`, `fadeUp`, `fadeIn`, `slideInLeft`, `scaleIn` — `lib/motion-variants.ts` |

Money on a tenant's records renders in **that organisation's** currency: `formatMoneyCompact(value, useOrgDisplay())` for stats and dense cells, `formatMoney` for full precision. `useOrgDisplay` reads `GET /me/org-display`, which is ungated — every member sees money somewhere, so it must not depend on `settings:view`. `Intl` compact notation already groups `en-IN` in lakhs and crores, so this is not an INR special case. The INR-hardcoded helpers below are legacy: `formatCurrency` aliases `formatINRCompact` (`₹1.2Cr`/`₹3.4L`/`₹12K`, for stats and dense cells); `formatINR` renders `₹1,23,456`; `formatCurrencyFull(amount, currency?, locale?, maxFrac?)` is full precision, default `INR`/`en-IN`. Dates go through `lib/date-utils.ts` + `date-fns` `format` — never inline `toLocaleDateString`.

## 16. Screen Templates

Copy the archetype, fill in the entity. **Anything not shown is owned by a primitive:** never write page padding, control heights, table density, card radius or the scroll container.

**The scroll chain — memorise this.** Only **one** element scrolls: `PageWrapper`'s content zone; the shell is `overflow-hidden` above it (§17).

```
PageWrapper           flex h-full min-h-0 flex-1 flex-col   ← owned by the component
├── header zone       shrink-0
├── filter zone       shrink-0, one non-wrapping scrollable row
└── content zone      flex-1 min-h-0 overflow-y-auto        ← the ONE scroller
    └── your body     must carry flex-1 min-h-0 to fill it
```

A body using `space-y-4` instead of `flex flex-1 min-h-0 flex-col` leaves dead background above the Ask OS bar; a `DataTable`/`EmptyState`/`ErrorState` without `flex-1 min-h-0` stops short of the shell edge. `noInternalScroll` moves scroll responsibility to **you** — only for boards/maps that scroll internally.

### T1 · List + filters + table (the most common screen) — `features/settings/organization/hierarchy/branches-page.tsx`

```tsx
<PageWrapper
  title="Branches"
  subtitle="Branches within your organization."          // descriptive, not a bare row count
  actions={                                              // secondary first, ONE primary last, max 3
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button variant="outline" size="sm" className="flex-1 text-xs sm:flex-none" onClick={onToggle}>…</Button>
      {canManage ? (
        <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm"
          className="flex-1 sm:flex-none" onClick={onCreate}>Add Branch</AnimatedIconButton>
      ) : null}
    </div>
  }
  filters={<SearchInput placeholder="Search branches…" value={search} onValueChange={onSearch} />}
>
  {isError ? (
    <ErrorState className="flex-1" title="Couldn't load branches"
      description={getErrorMessage(error)} onRetry={onRetry} />
  ) : (
    <DataTable
      data={rows} columns={columns} getRowKey={(row) => row.id}
      isLoading={isLoading} emptyState={emptyState} minWidth="1000px"
      className="flex-1 min-h-0"                          // mandatory — this is the fill chain
      pagination={{ mode: "server", page, pageSize, total: data?.total ?? 0,
        onPageChange: setPage, onPageSizeChange: setPageSize, pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS }}
    />
  )}
</PageWrapper>
```

`flex-1 min-h-0` on `DataTable` is not optional · `pagination` is **server** mode for anything that can exceed a page · the error branch comes **before** empty/not-found or a failure reads as "no data" · `minWidth` forces horizontal scroll rather than crushing columns · a sole filter fills mobile width (never a Drawer), 2+ filters keep search first and collapse the rest below `md` · at 375px actions become a full-width row and the table becomes cards via `mobileCard`.

### T2 · List + cards (rows aren't tabular)

Same header/filters as T1; body is `<div className="flex flex-1 min-h-0 flex-col gap-3">` wrapping a `grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3` of `bg-card rounded-xl border border-border shadow-sm p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer` cards, then `<TablePagination />`. Only the card is `rounded-xl`; inner rows and chips stay `rounded-lg`/`rounded-md`.

### T3 · Detail + tabs

```tsx
<PageWrapper title={record.name} backHref="/crm/contacts" contentClassName="flex min-h-0 flex-1 flex-col">
  <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 flex-1 flex-col">
    <TabsList>…</TabsList>
    <TabsContent value="overview" className={TABS_CONTENT_PAGE_BODY_CLASS}>…</TabsContent>
  </Tabs>
</PageWrapper>
```

`backHref` only on a page with no sidebar entry (§8) · tab state syncs to the URL (§6) · every body-filling `TabsContent` uses `TABS_CONTENT_PAGE_BODY_CLASS` (hand-writing `flex-1 min-h-0 mt-0` omits the `data-[state=active]:` guards) · 5+ triggers as a status filter is **AP-2**.

### T4 · Settings section — Administration & HR (rich surface)

`features/settings/organization/organization-settings-page.tsx`: `PageWrapper` → `<RichPageContent className="flex-1 min-h-0">` → `OrgSettingsCard` (title, description, `icon`, optional `action` gated on `canEdit`) → `SettingsFieldGrid` / `SettingsField`. `OrgSettingsCard` sits on `RichPanel` + `RichIconWell`, so every section inherits the treatment from one place; `RichPageContent` supplies the `gap-3 sm:gap-4` rhythm — never `space-y-*` here.

### T5 · Module hub / landing

`features/hr/hub/hr-hub-page.tsx`: `PageWrapper variant="display"` → `RichPageContent` → `RichHero` of `RichQuickAction` tiles (horizontally scrollable on mobile) → queues / today / metrics bands. Every panel self-gates on its endpoint's exact permission and renders **nothing** when unheld, so a 2-permission user gets a short clean page rather than a wall of empty states; no hero on a page whose title already says the same thing.

### T6 · Board / kanban — the one screen that owns its scroll

```tsx
<PageWrapper title="Deals" filters={…} noInternalScroll
  className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
  <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto">
    {columns.map((col) => (
      <div key={col.key} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card">
        <div className="shrink-0 px-3 py-2">{col.label}</div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2">{/* virtualize past ~50 */}</div>
      </div>
    ))}
  </div>
</PageWrapper>
```

Column totals come from a server aggregate, never `COUNT(*)` per render. Past ~50 cards use `react-window` v2 with `Droppable mode="virtual"` + `renderClone` (§3).

### T7 · The four states + the data contract behind every template

```tsx
const canView = useCan("crm:contacts:view");            // the endpoint's EXACT @RequirePermission key
const { data, isLoading, isError, error, refetch } = useContacts(
  { page, limit, search },
  { enabled: canView },                                  // never fire an API the role cannot access
);

if (isLoading) return <DataTableSkeleton rows={10} columns={columns.length} />;   // never a spinner
if (isError)   return <ErrorState className="flex-1" description={getErrorMessage(error)} onRetry={refetch} />;
if (!canView)  return <NoPermissionState permission="crm:contacts:view" />;
if (rows.length === 0) return <EmptyState className="flex-1 min-h-0" … />;        // filter-empty ≠ data-empty
```

Hook in `hooks/api/<module>/<entity>.ts`; key from the `queryKeys` factory; calibrated `staleTime`; `mutationKey` on every mutation; `enabled` combined **after** any `...options` spread. Search debounced ≥300ms and resets to page 1. Forms: react-hook-form + `zodResolver`, schema in a sibling `*-schema.ts`, per-field `<FormMessage>`. Every async button `<LoadingButton isPending>`, every error string `getErrorMessage`, never a raw id.

## 17. Shell & Navigation Ownership

```
h-dvh flex flex-col overflow-hidden
├── [TrialBanner — shrinks to 0 when inactive] · [CommandPalette — Portal, z-50]
└── flex-1 flex min-h-0
    ├── aside [Sidebar — w-[17rem] / w-[3.5rem] collapsed, hidden md:flex]
    │   └── logo + workspace switcher · primary nav (≤7) · module nav · user/settings footer
    └── div [Content — flex-1 min-w-0 flex flex-col overflow-hidden]
        ├── GlobalHeader [h-10 shrink-0 border-b px-4]   (hidden below md)
        └── main [flex-1 min-w-0 flex flex-col overflow-hidden]
            └── div [flex-1 min-h-0 overflow-auto flex flex-col pb-16 md:pb-0]
                └── [PageWrapper] header shrink-0 · filters shrink-0 · content flex-1 min-h-0 overflow-y-auto
```

**Mobile chrome.** Nav is a left `Sheet` (`w-[17rem]`). Each module's primary sidebar destinations become `MobileModuleBottomNav` (fixed bottom, z-40, `pb-safe`, `MAX_MOBILE_MODULE_TABS = 5`, overflow in the Menu drawer). `MobileShellFab` opens Ask OS · Menu · Search · Profile — never bottom tabs. Chat keeps `ChatMobileBottomNav`; module tabs + FAB are suppressed during an open conversation. Reserve `pb-[calc(4rem+…)]` only when a bottom bar is mounted.

**Navigation ownership**
- Home is the universal employee workspace — Overview, Communication, For Me, Company; groups may collapse but destinations stay permission-filtered and keyboard accessible. Module-specific administration never appears in Home (recruitment/interviews, HR employee administration, payroll, accounting, product delivery).
- **A URL communicates product context** (root §8): platform administration owns `/settings/*`, module configuration owns `/<module>/settings/*`, and Settings navigation must never point at a top-level operational URL and silently switch the selected product.
- A workflow intentionally in two products renders ONE shared `features/` component through thin adapters with the route's base path passed in (`/directory/*` in Home vs `/settings/directory/*` in Administration) — never duplicate the page or import one `app/**/page.tsx` from another.
- Home and Documents are always-available products for active members: Documents owns KB reading (`/knowledge/*`), Home owns personal employment documents (`/me/documents`). Core products show as disabled "Included" controls in administration, never editable toggles. `For Me` uses canonical `/me/*` routes, visible independently of paid-module enablement. Announcements and the people directory are company-wide reading surfaces whose authoring controls may still require an owning-module permission.
- **Desktop sidebar, mobile drawer, mobile bottom nav, product switcher and command palette consume the same filtered navigation model** — never parallel hard-coded lists. Hubs, quick links, cards and empty-state actions use that model or the destination's exact permission: never render a link that predictably ends at Access Denied; an inaccessible parent may promote an accessible child, never expose itself.
- **Every module's navigation is permission-driven, not just the ones someone remembered to gate.** A route without a `requiredPermission` is visible to people who cannot use it, and a module surface gated on a *global* `settings:*` key is invisible to that module's own owner — both are defects. `sidebar-permission-coverage.test.ts` fails on either: every non-universal route must carry a requirement, and every universal one must not. Universal means the surfaces root §8 guarantees every active member — Home, communication, `/me/*`, `/knowledge/*` reading, the people directory, and `/settings` (My Account) — and that list is the allowlist, so widening it is a deliberate edit.
- **Every mutation control uses the exact backend mutation permission** — hide unauthorized buttons, row menus, bulk actions, create/import/export, builder actions, empty-state CTAs and configuration tabs, and still fail closed in the handler. A hidden control is UX only; the backend guard is the boundary. Universal self-service (root §8) is the only exception.
- Module Access ownership is narrow: only the canonical module owner sees the Ownership tab; org owners/admins and canonical module owners/admins may manage module members and roles; ordinary or custom permission grants never unlock those controls.
