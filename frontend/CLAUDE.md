# frontend/CLAUDE.md — StreamlineOS web app

Next.js 16.3 App Router · React 19.2 · TypeScript strict · Tailwind 4 (CSS-first) · shadcn/ui · TanStack Query 5.90 · react-hook-form 7.68 + Zod 4 · Sonner · Framer Motion 12 · NextAuth 5 beta.
**UI, client state and Query hooks only.** Root `CLAUDE.md` holds the cardinal rules and precedence; this file wins on UI matters.

Cite rules by ID in review (`FE-22`). `(gate: x)` names the `pnpm` check that fails the PR — run it before claiming done, `:self-test` first. Component index, tokens, templates and prop tables live in **[`UI-KIT.md`](./UI-KIT.md)**.
**`BE-nn` refers to `backend/CLAUDE.md`.** Those are the cross-repo contract — read them there, never restate them here.

## 1. Next.js & Routing

**FE-01.** Default to Server Components. Use `"use client"` only for state, handlers, effects or browser APIs, pushed to the leaves. (gate: check:client-pages)
**FE-02.** Pass Server Components into Client Components as `children`; parallelize independent fetches with `Promise.all`.
**FE-03.** Wrap non-`fetch` server data access in React `cache()`.
**FE-04.** Await route params — `const { projectId } = await params` — and validate bracket params as untrusted input.
**FE-05.** Name route params for the entity: `[projectId]`, never `[id]`. Must match the backend param (BE-27).
**FE-06.** Add no business `route.ts`. The two sanctioned handlers are `app/api/auth/[...nextauth]/route.ts` and `app/api/media/image/route.ts`. (gate: check:routes)
**FE-07.** Treat any new `route.ts` as a public POST endpoint: Zod-validate, verify auth, object-level and tenant authz, keep it thin.
**FE-08.** Never treat middleware as authorization — it is bypassable (CVE-2025-29927). Re-verify at the data layer.
**FE-09.** The routing layer is `proxy.ts` (Node runtime). `middleware.ts` was deleted in v16 — never recreate it.
**FE-10.** Put no route-permission map in `proxy.ts`. *Why:* the JWT carries no permissions claim.
**FE-11.** `resolveWizardGate` (`lib/wizard-gate.ts`) is the only authority for `/org-setup` and `/employee-onboarding`. *Why:* two decision points over two sources gives `ERR_TOO_MANY_REDIRECTS`.
**FE-12.** Never put a secret behind `NEXT_PUBLIC_`. *Why:* it is inlined into the client bundle. Mark server-only modules `import 'server-only'`.
**FE-13.** Ship `error.tsx` with `reset()` and `not-found.tsx`; production hides raw error text.
**FE-14.** Add Next.js server-cache revalidation only for an actual server-cached read, validated in a production build.

## 2. Data Layer — TanStack Query

**FE-15.** Route all client fetching through `lib/api/` or `hooks/api/`. No raw `fetch`/`axios` in `components/`, `features/` or `app/`. (gate: check:effect-fetches)
**FE-16.** Put ordinary reads in Query hooks, never a fetch effect.
**FE-17.** Zustand is not installed and must not be added. Query owns server state; shared client state uses React Context co-located with its feature.
**FE-18.** Import the query-key **domain module** (`@/lib/query-keys/build-work`), never the `@/lib/query-keys` aggregate. *Why:* the aggregate pulls all 43 domains into every consumer. (gate: `lib/query-keys/aggregate-import-boundary.test.ts`)
**FE-19.** Never hand-type a key array. One factory per entity; co-locate `queryKey`, `queryFn` and `staleTime`.
**FE-20.** Keep the key array tenant-free. The scope segment lives in the hash via `scopedQueryKeyHashFn` (`lib/query-scope.ts:45`). *Why:* `invalidateQueries` matches the array, not the hash. (gate: check:query-scope)
**FE-21.** Never hand-thread `orgId` into a factory for an authenticated surface. An `orgId` argument is legitimate only for a **public** tenant the viewer does not belong to.
**FE-22.** Construct a `QueryClient` only via `createAppQueryClient` or `createServerQueryClient`. (gate: check:query-scope)
**FE-23.** Scope org-owned `localStorage` through `lib/org-scoped-storage.tsx`. Pure UI preferences (theme, density) deliberately do not.
**FE-24.** Declare a `staleTime` on every `useQuery`: live `0` + `refetchInterval` · volatile `15_000` · standard list `30_000` · standard entity `60_000` · slow list `2 * 60_000` · session/org `5 * 60_000` · catalog `30 * 60_000`.
**FE-25.** Declare a `mutationKey` on every `useMutation`.
**FE-26.** Forward the abort `signal` from every `queryFn`. (gate: check:query-signal)
**FE-27.** Parse every response through its contract. (gate: check:response-contracts, check:contract-drift)
**FE-28.** Match the contract to the backend field for field. *Why:* an omitted field is silently stripped and renders empty; a mis-typed one throws. (gate: check:contract-parity)
**FE-29.** Name hooks `hooks/api/<module>/<entity>.ts` as `useThings` / `useThing` / `useCreateThing` / `useUpdateThing` / `useDeleteThing`.
**FE-30.** Spread `options` **before** the gate and never re-declare `enabled` after it — combine `enabled: !!orgId && (options?.enabled ?? true)`.
**FE-31.** Never hardcode pagination params in a hook. Accept the endpoint's cursor/page/filter contract (BE-24, BE-25) and retain its envelope.
**FE-32.** Never hydrate a collection through a parent-detail endpoint. Read the dedicated paginated endpoint.
**FE-33.** Source per-status filter badges from a server-side `statusCounts` aggregate, so filtering paginates server-side.
**FE-34.** Invalidate by true key prefix — no trailing `undefined`, `exact: true` only when meant — and always re-call `options?.onSuccess`.
**FE-35.** Patch the cache with `setQueryData` when the response already carries the new state. *Why:* invalidating a paginated query refetches every loaded page.
**FE-36.** Make inline edits on board, list and card surfaces optimistic. Quotes and revenue figures never are.
**FE-37.** Optimistic recipe (`useUpdateTicket`, `hooks/api/build/ticket-update-mutation.ts:93`): cancel and snapshot every key you patch → patch every cache the view renders → resolve related display objects from cached data → restore every snapshot `onError` → invalidate `onSettled`, gating expensive aggregates behind the fields that move them.
**FE-38.** Never show `AppLoadingScreen` on a background refetch or ordinary mutation. Preserve stale data; show pending state only on the affected control.
**FE-39.** Never refresh the NextAuth session to reconcile state Query already owns.

## 3. Access & Page State

**FE-40.** Decide what a gated surface renders with `<PageState resolution={usePageState(...)}>`, never a boolean. It owns the branch order: access-loading → module unavailable → denied → loading → error → empty → ready. (gate: check:page-state-usage)
**FE-41.** **Always pass `error` to `usePageState`.** *Why:* omit it and every 402 becomes "Something went wrong" while tests still pass.

```tsx
const pageState = usePageState({ permission: "build:view", isLoading, isError, error });
//                                                                        ^^^^^ not optional
```

**FE-42.** Never use `useCan` for a page's own state. *Why:* it is `false` while access is in flight, so it flashes denial at permitted users.
**FE-43.** Gate a **surface** on `useCanState(key) !== "denied"` — do not claim denial before you know.
**FE-44.** Gate a **mutation control** on `useCan` — fail closed, do not claim authority before you know. The asymmetry with FE-43 is the point.
**FE-45.** Use the endpoint's exact `@RequirePermission` key (BE-26). A key absent from the backend catalog makes `useCan` false forever. (gate: check:permission-catalog, check:permission-binding)
**FE-46.** Gate every permissioned read. (gate: check:gated-reads)
**FE-47.** Never render an empty state for a denial. A disabled Query v5 read is `isPending: true, isFetching: false`, so `isLoading` is **false** — identical to an empty list.
**FE-48.** `lib/rbac/denial-is-not-emptiness.known.json` (278 entries) may only shrink. A surface not on it that reads a gated hook and renders empty fails the build.
**FE-49.** Render denial as `NoPermissionState`, never an empty-success state. (gate: check:empty-states)
**FE-50.** `useModuleEnabled` returning true while access loads is not proof of authorization.
**FE-51.** Never fire a request the role cannot access. Prevent predictable 403 fetch loops.
**FE-52.** Present the six standings from BE-102. Never build a role-creation screen; internal role slugs are identifiers, not permission.
**FE-53.** Drive desktop sidebar, mobile drawer, bottom nav, product switcher and command palette from the same filtered navigation model — never parallel hard-coded lists.
**FE-54.** Give every non-universal route a `requiredPermission` and every universal route none. (gate: `components/layout/sidebar/sidebar-permission-coverage.test.ts`)
**FE-55.** Never render a link that predictably ends at Access Denied. An inaccessible parent may promote an accessible child.

## 4. Components & Structure

**FE-56.** Pages compose; they don't implement. A route `page.tsx` fetches and composes — UI lives in `features/<feature>/components/`. (gate: check:route-thinness)
**FE-57.** Keep files under 500 lines; 300+ is ratcheted. 428 files exceed 300 and 7 exceed 500 today; both counts may only shrink. (gate: check:file-sizes, check:over-300)
**FE-58.** Check the inventory before writing anything: [UI-KIT.md](./UI-KIT.md#import-index) → the feature barrel → `components/shared` → `components/ui`.
**FE-59.** Extend the existing primitive. A component duplicating one is a defect — there is exactly one `DataTable`, one `TablePagination`, one `LoadingButton`, one `AiActionsMenu`, one editor per class of surface.
**FE-60.** Promote a component to `components/shared` (or `components/ui` for a primitive) on its second consumer, and update every importer.
**FE-61.** Never import feature → feature. (gate: check:import-direction, check:feature-cycles)
**FE-62.** Add a row to [UI-KIT.md](./UI-KIT.md#import-index) in the same change that adds or extends a shared component.
**FE-63.** Deep-import `ErrorState`/`LoadingState`/`NoPermissionState` from the leaf in `app/**` route files, not the barrel. *Why:* the barrel drags `react-hook-form` across the client boundary — ~10–11 KB gzipped for nothing.
**FE-64.** Put feature code in `features/<feature>/{components,lib,hooks}/`. `app/` holds route files only; `_components/` and `_lib/` inside `app/` are banned.
**FE-65.** Import a feature through its barrel `index.ts`, max ~3–4 folders deep.
**FE-66.** Name files kebab-case with a PascalCase symbol inside; hooks `use-*.ts` → `useX`; server fetch helpers `get-*`; Zod schemas `*-schema.ts`.
**FE-67.** Type props explicitly (`interface XProps`). No `any`, no `React.FC`; derive from Zod with `z.infer` where a schema exists.
**FE-68.** Never thread a prop more than 2 levels. Use `children` or feature context.
**FE-69.** Declare every JSX callback as a named handler inside the component — `onClick={handleSave}`, never `onClick={() => refresh()}`. Holds for `render`/`cell` callbacks and `map` bodies. (gate: check:named-handlers)
**FE-70.** Accept and merge `className` with `cn()`; `forwardRef` whenever wrapping a focusable or measurable element, and always for DataTable-cell sub-components.
**FE-71.** Spread `{...field}` for react-hook-form controls; never fork a field's state into local `useState`.
**FE-72.** Keep the import graph acyclic. (gate: check:cycles, check:feature-cycles)

## 5. Forms, Errors & Toasts

**FE-73.** Use react-hook-form + `zodResolver` always. No ad-hoc uncontrolled forms, no `useState` field soup.
**FE-74.** Prefer `EntityFormSheet` / `EntityFormDialog` over hand-wiring `useForm`. ≤5 fields → Dialog; 6+ or multi-section → Sheet ([ladder](./UI-KIT.md#overlay-ladder)).
**FE-75.** Put the schema in a sibling `*-schema.ts` and fields in a sibling `*-form-fields.tsx`. 116 `.tsx` files still hold an inline `z.object({` — that count may only shrink.
**FE-76.** Route every mutation `onError` and every error string through `getErrorMessage` (`lib/get-error-message.ts`). Never `error instanceof Error ? …`, never raw `.message`. (gate: check:formatters)
**FE-77.** Import `ApiError`, `isApiError`, `getApiErrorCode`, `applyContract` and `lazyContract` from their owner `lib/api-envelope.ts`, not the `lib/api-client.ts` re-export.
**FE-78.** Branch on `isApiError(e) && e.status === 409`, never on message prefixes. Status semantics are BE-22.
**FE-79.** Surface server validation errors per field. `FormMessage` renders `null` with no error — never conditionally mount it.
**FE-80.** Make every async button `<LoadingButton isPending>`. Never `disabled={isPending}` plus a spinner ternary.
**FE-81.** Write success toasts in past tense and specific; errors are always `toast.error(getErrorMessage(error))`.
**FE-82.** Show no toast for an optimistic inline edit that already displays its result — the rollback is the error signal.
**FE-83.** Use `ConfirmDialog destructive` for every destructive or lifecycle action. Never a hand-rolled `AlertDialog` with a red button. Sanctioned variants: `HierarchyArchiveDialog` and the typed-name confirm.
**FE-84.** Archive and restore hierarchy records, never delete (BE-53). A dependency conflict keeps the dialog open, lists every dependency with counts, and states that nothing changed.

## 6. Content & URL State

**FE-85.** Show names, never raw IDs. Resolve display names at the display boundary via `getUserDisplayName`/`getUserInitials`. A visible UUID is a bug.
**FE-86.** Keep tab, filter, sort and pagination state in the URL via `router.replace(…, { scroll: false })`, and always reset pagination on filter change.
**FE-87.** Debounce search ≥300ms and reset to page 1. `SearchInput` does not debounce for you.
**FE-88.** Edit fields in place on cards and rows via a compact popover, with the optimistic mutation.
**FE-89.** Offer inline AI only where it reduces effort — `AiActionsMenu`, draft-first (the user applies), credit-metered, `useCan`-gated, rendering `AiUsageChip`.
**FE-90.** Show a "Connect X" banner for an unconnected integration. Never fail silently or render broken data.
**FE-91.** Render tenant money in that organisation's currency ([UI-KIT.md](./UI-KIT.md#money-and-dates)). Never inline `toLocaleDateString`.

## 7. Design System

**FE-92.** Reference tokens; never restate a hex or an arbitrary visual value. (gate: `streamline/no-raw-visual-values` — eslint error; check:colors)
**FE-93.** 228 hardcoded hex literals remain in `components/` and `features/`. That count may only shrink; third-party brand marks are the only defensible survivors.
**FE-94.** Use `statusToneClasses(tone)` for new semantic status. Add no new legacy `bg-X-50` literals.
**FE-95.** Use `rounded-xl` for cards and panels, `rounded-md` for inputs and tables. `2xl`/`3xl` only for marketing and the HR/Administration rich surface.
**FE-96.** Space on a 4px base. Never `p-[7px]`, `mt-[13px]`, `gap-[5px]`.
**FE-97.** Never re-declare page padding at a call site — it belongs to `content-fill-panel.tsx`.
**FE-98.** Never hardcode a height. States fill via a flex chain (`flex flex-col` ancestors + `flex-1 min-h-0`).
**FE-99.** Let a container own its padding once. Never mix `space-y-*` with child `mt-*`; gaps come from one `gap-*` on the parent.
**FE-100.** Wrap every authenticated page in `PageWrapper`. Never `min-h-screen`, a page-level gradient or an ad-hoc `<h1>`.
**FE-101.** One `<h1>` per page (the `title` prop), max 3 actions with exactly one primary, never stacked vertically.
**FE-102.** Keep every field control at `h-9 / text-sm` from `FIELD_CONTROL_CLASS`. Never add a local `h-8`/`h-10`/`text-xs`.
**FE-103.** Render every numeric cell `font-mono` or `tabular-nums`. *Why:* prevents column jitter.
**FE-104.** Use `DataTable` for every page-level list. Always pass `pagination`; never pass `search` or `toolbar`.
**FE-105.** Sort on the server only. A `DataTable` holds one page, so a client column-sort reorders that page and presents it as sorted.
**FE-106.** Use `StatCard`/`StatCardGrid` for stats — a bespoke `text-xl font-bold` div over a label is an anti-pattern.
**FE-107.** Animate interactive surfaces with `AnimatedIconButton` and `useAnimatedIcon`; static `lucide-react` is for non-interactive icons only. Banned: `@phosphor-icons/react`, `react-icons`.
**FE-108.** Animate only `opacity` and `transform`, 150–250ms micro / 250–350ms panels, nothing over 400ms. Respect `prefers-reduced-motion` via `useReducedMotion()`.
**FE-109.** Import shared variants from `lib/motion-variants.ts`; never redefine them.
**FE-110.** Take the lowest overlay rung that suffices ([ladder](./UI-KIT.md#overlay-ladder)). Escalating past the first rung that fits is a violation.
**FE-111.** Below `md`, every rung-2 popover and rung-3/4 filter or menu panel becomes a **Drawer** via `ResponsivePopover`. Date pickers and 1–3 item menus are exempt.

## 8. Performance & Accessibility

**FE-112.** Never render an unbounded collection. Use server pagination or `react-window` v2. An `items.map(...)` with no pagination, `slice` or windowing is a hang-risk bug.
**FE-113.** Lazy-load heavy client components with `next/dynamic` — editors, charts, maps, kanban, anything inside a dialog or sheet.
**FE-114.** Memoize only what you measured. `React.memo` for components rendered many times per screen with stable props; `useMemo` only for genuinely expensive derivations; `useCallback` only for a memoized child or a dependency.
**FE-115.** Never `useMemo` an object or array literal, or anything Query already caches. Reach for `staleTime`/`select`.
**FE-116.** Keep route bundles within budget. (gate: check:route-bundle-budget, check:web-vitals-budget)
**FE-117.** Give every icon-only control an `aria-label`. (gate: `streamline/no-unlabelled-icon-button` — eslint error; check:icon-labels)
**FE-118.** Disable a confirmed icon-label false positive with `// eslint-disable-next-line streamline/no-unlabelled-icon-button -- <reason>`, never a bare disable.
**FE-119.** Put `type="button"` on non-submit buttons, wire label ↔ control through the `Form*` primitives, and give every list item a stable `key` — never the index.
**FE-120.** Test at 375 / 768 / 1280 and verify keyboard reachability and focus management in overlays.

## 9. Testing

**FE-121.** Tests are **excluded from `tsconfig.json`**. Run `pnpm type-check:specs` after any signature change. *Why:* `pnpm type-check` cannot see them. (gate: check:test-typecheck)
**FE-122.** Pair a control-gate negative test with a positive one. *Why:* the negative passes when the control simply cannot render.
**FE-123.** jsdom cannot see layout overflow, real focus order or paint — inspect those in a browser.
**FE-124.** There is no Prettier and no coverage threshold in this repo. Do not assume formatting or coverage is enforced.

---

## Non-negotiables — these block a PR

1. **FE-41** — `error` is passed to `usePageState`, so a 402 shows the backend's upgrade path.
2. **FE-40** — page state resolves through `<PageState>`, never a boolean.
3. **FE-44** — mutation controls fail closed on `useCan`.
4. **FE-15** — no raw `fetch` outside `lib/`/`hooks/`.
5. **FE-18** — no production import of the `@/lib/query-keys` aggregate.
6. **FE-27 / FE-28** — every response parsed through a contract that matches the backend field for field.
7. **FE-45** — the exact backend permission key, present in both catalogs (BE-112).
8. **FE-06** — no new business `route.ts`.
9. **FE-92** — no raw hex or arbitrary visual value.
10. No `any`, no `as X`, no `@ts-ignore`. (gate: check:type-assertions — hard zero)

## Definition of Done — frontend task

- [ ] Loading, empty, error, denied and populated states all implemented and **filling** height via the flex chain; skeleton mirrors the real layout.
- [ ] Page state resolves through `usePageState` + `<PageState>` **with `error` passed**; controls gate on `useCan`; destructive prompts are `ConfirmDialog destructive`.
- [ ] `pnpm type-check` **and** `pnpm type-check:specs` pass (FE-121).
- [ ] `pnpm lint` passes with no new `^_` escapes and no bare eslint disables.
- [ ] Every gate named by a rule you touched passes, `:self-test` first.
- [ ] Filters update the URL; pagination resets on filter change; pagination is server-side.
- [ ] Field controls left at `h-9`; numeric cells `font-mono tabular-nums`; colored tints carry `dark:` pairings.
- [ ] Tested at 375 / 768 / 1280; icon-only buttons labelled; keyboard-navigable.
- [ ] Real data renders — if an API fails, fix the API or hook. Never a raw UUID on screen.
- [ ] Components reused from [UI-KIT.md](./UI-KIT.md), memoized only where measured.

## Anti-patterns seen in this repo

| # | Where | Wrong | Right |
|---|---|---|---|
| **AP-1** | `features/build/cycles/cycles-page.tsx:148` | 589 lines, hand-wires `useForm` + raw `Sheet` — while being the canonical `usePageState` example | extract to `features/`, use `EntityFormSheet` (FE-57, FE-74) |
| **AP-2** | `features/landing/contact-form.tsx:55` | `fetch(\`${process.env.NEXT_PUBLIC_API_URL}/public/contact\`)` — bypasses `apiClient`, contract and error policy | `apiClient` + a contract (FE-15, FE-27) |
| **AP-3** | `features/hr/documents/document-table.tsx:68` | raw `fetch` inside a component for a bulk download | an `hooks/api/` helper (FE-15) |
| **AP-4** | `app/(authenticated)/inventory/purchase-orders/[poId]/page.tsx` | a 559-line `page.tsx` that implements rather than composes | compose from `features/` (FE-56) |
| **AP-5** | `features/auth/components/oauth-buttons.tsx:34` | inline `#4285F4` — one of 228 hex literals | token, or a documented brand-mark exception (FE-92, FE-93) |
| **AP-6** | any page | `if (!useCan(key)) return <NoPermissionState/>` | `<PageState resolution={usePageState({ permission, isLoading, isError, error })}>` (FE-40, FE-42) |
| **AP-7** | any page | `isError ? <ErrorState/>` as the whole failure branch — discards the 402 upgrade path | pass `error` to `usePageState` (FE-41) |
| **AP-8** | any list | `<Tabs>` with 5+ status triggers (overflows at 768px) | Tabs for ≤4 content categories; status filters are `<Select>` |
| **AP-9** | any page | `animate-spin` as the page loading state | a skeleton matching the real shape; `Loader2` is button-only |
| **AP-10** | any page | `SheetContent` without `p-0`, wrapping an inner `p-4` (40px edge padding) | `p-0 flex flex-col gap-0`; inner zones own padding |

## Open questions — decide these

1. **`app/api/media/image/route.ts`** — sanctioned exception or debt? *Recommended default:* keep it, document it in FE-06 as an image proxy (it needs a server-side upstream fetch), and pin the allowlist to exactly two entries in `check:routes`.
2. **FE-57 / FE-75 / FE-93 have no ratchet file**, so the counts are prose, not gates. *Recommended default:* emit `known.json` baselines from today's 428 / 116 / 228 and let the existing `check:over-300` pattern enforce shrink-only.
3. **`check:command-catalog` and `check:effect-fetches` are blocking and currently red** (4 and 1 real defects). *Recommended default:* fix the 5, don't widen the allowlists.
4. **`lib/query-keys/aggregate-import-boundary.test.ts` excludes CRM and inventory.** *Recommended default:* keep the exclusion, add a comment-free `known.json`, migrate those two lanes when they are next touched.

<details>
<summary>Deleted and merged points (restore anything cut wrongly)</summary>

**Deleted**
- *"Read locality: reuse canonical query options… Shell reads stay lightweight."* — 60 words, no checkable assertion, no threshold, no gate.
- *"Density with restraint… one accent, not a rainbow… motion discipline… predictable states"* (UI/UX preamble) — motivational, no mechanism. The concrete halves survive as FE-92…FE-111.

**Merged**
- `ConfirmDialog` reuse was stated four times (§2, §10, §13, AP-10) → FE-83.
- *"Filters always update the URL and reset pagination"* was stated three times (§6, §9, §14) → FE-86.
- The fill chain was stated three times (§7, §9, §10) → FE-98 plus [UI-KIT.md](./UI-KIT.md#the-scroll-chain).
- *"Roles are fixed standings"* duplicated backend §5 → FE-52 now cites **BE-102**.
- *"Prefer patching the cache over refetching"* was verbatim root §9 → FE-35.
- *"Long content scrolls inside the main content area only"* → the scroll chain in UI-KIT.md.
- *"Gating follows the actual endpoint contract"* — a 120-word hedged paragraph → FE-45, FE-46, FE-50, FE-51.
- The §14 per-page checklist → became the Definition of Done above.
- `queryClient.clear()` *"stays at all eight call sites as defence in depth — no longer load-bearing"* — dropped as a rule; it is inert by its own admission and `check:query-scope` covers the real invariant (FE-22).

**Corrected, not cut**
- *"The only `route.ts` is NextAuth / auth-bridge"* was **false** — two exist (FE-06).
- *"one `queryKeys` object in `lib/query-keys.ts`"* was **backwards** vs an enforced test (FE-18).
- `lib/org-scoped-storage.ts` is actually `.tsx` (FE-23).
- `ApiError` is owned by `lib/api-envelope.ts`, not `lib/api-client.ts` (FE-77).
- *"extract past ~200 lines"* replaced with the real gate thresholds (FE-57).

**Moved to [`UI-KIT.md`](./UI-KIT.md)** — the component import index, T1–T7 templates, token and type-scale tables, motion table, icon sizes, overlay ladder diagram, shell layout, and the `DataTable`/`PageWrapper`/`ConfirmDialog` prop tables. Nothing was cut; rules here cite it by anchor.

</details>

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
