# Pages

> **Launch blockers (2026-07-18)**: Public pricing and legal copy now match the backend Free-plan limit of five members, and `POST /public/contact` provides validated, rate-limited delivery to the required `CONTACT_NOTIFICATION_EMAIL`.
>
> **PermissionGuard (2026-07-18)**: Guarded handlers now deny missing permission metadata, metadata-free `@Public` routes remain exempt, and explicit permissions are evaluated before privileged bypasses. The controller audit and focused unit/e2e tests cover this contract.
>
> **Ticket batch STRE-230–238 (2026-07-18)**: Question-bank row menu now closes before the Edit sheet opens (controlled dialog lifted out of the dropdown); hiring-flow cards use 3-dot menus (round rows hover-only) and the Add Round form shows per-field errors (conflicting `valueAsNumber`+`setValueAs` removed, string-schema per zodResolver gotcha); app-wide intermittent `removeChild` NotFoundError hardened via `lib/dom-mutation-guard.ts` (foreign-node-safe removeChild/insertBefore, installed pre-hydration in query-provider; feedbucket widget audited clean — ShadowRoot, body-owned host); Receive Goods sheet gains a warehouse picker for warehouse-less POs (backend `grn.service.ts` BOLA-checks explicit `locationId`, needs rebuild+restart); PO list rows/PO number/⋮ View navigate to detail; vendors+PO mutations invalidate by true key prefix (trailing-`undefined` factory keys never matched — 9 mutations fixed); create-PO quantity focus loss fixed (columns memoized; was rebuilding DataTable per keystroke) + text/numeric input drops native integer tooltip; stock-transfers table horizontally scrolls (`minWidth` like Movements). FE tsc ✓ lint 0 errors ✓; BE tsc ✓ (1 pre-existing baseline error).

> **Skeleton fidelity + shimmer + overflow tooltips + backend efficiency (2026-07-16, wave 3)**: **(A) Skeleton fidelity** — all 287 `app/(authenticated)/**/loading.tsx` rebuilt to be a visual Xerox of their real page via 5 module agents (CRM 43, Projects 54, Inventory 60, HR 64, rest ~55): filter rows → `FILTER_TOOLBAR_ROW` with h-9 width-matched controls in real order (was plain-flex h-8 blocks), stats → `StatCardGridSkeleton`, list bodies → `DataTableSkeleton` 9–12 rows, correct detail-page stat counts + backHref. **(B) Skeleton shimmer** — shared `Skeleton` primitive now layers a `skeleton-shimmer` sweep (globals.css keyframe, theme-aware via color-mix, reduced-motion-safe) over the pulse → every skeleton block animates. **(C) Overflow tooltips** — new `components/ui/truncated-text.tsx` `<TruncatedText text lines? className? side?>`: ResizeObserver-measured, shows full text tooltip ONLY when truncated, works hover+focus+**mobile-tap** (`pointerType==="touch"` toggles); global `TooltipProvider` mounted in query-provider. Swept ~400 files across all modules (5 agents) onto truncated title/name surfaces — DataTable title cells, kanban/list titles, entity/person names, breadcrumbs, sidebar labels, PageWrapper subtitle; fixed short text (badges/counts/keys) left alone. **(D) Backend** — notification delivery fixed (self-draining in-process worker `notification-delivery-worker.service.ts` OnModuleInit interval, env-toggleable — queue was never drained because no scheduler exists, so engine push/email never sent); RBAC fail-open gaps closed on hr-recruitment/interviews/config/analytics + platform/ai (existing catalog keys only; requisitions `:view`→`:manage` privilege bug fixed); ResourceGrantsModule duplicate deleted (route collision with AccessModule); cost migration `0274_cost_efficiency_indexes.sql` staged (20 indexes incl. GL composites + inv_products/hr_people GIN trgm — the declared `_trgm` indexes were secretly B-tree); code-level cost fixes (GROUP BY aggregation, projections, chat-unread/accounting-settings/crm-metadata caches w/ invalidation, Promise.all); ~130 forced casts removed (payroll 30+, notifications/signos/stock-engine ~50) via guard+spread/converters. **(E) TanStack freshness** — 16 live hooks got refetchOnWindowFocus + calibrated refetchInterval (notifications/dashboards/approvals/AI-credits/reservations/run-logs), refetchIntervalInBackground:false, 21 mutationKeys, 2 key-factory migrations; socket-driven chat left un-polled. Gate: frontend tsc ✓ lint 0 errors (759 warnings baseline) ✓; backend tsc green for all touched files. **CAVEAT:** remaining backend tsc errors are in the concurrent AI session's live-in-progress new modules (`ai-summaries`, `support-kb-gap`, `ai-action-copilot.spec`) — NOT this session's; left untouched per concurrent-session rule. **Awaiting decision:** apply mig 0274 (TTY), drop ~15 zero-importer tables, consolidate dup helpers (escapeLike×7/slugify×3/subDays×3), fix the AI-session modules once that session pauses.

> **Animated-icon program + deep verifies (2026-07-16, wave 2)**: ~300 more files via ~20 parallel single-module agents + central repair loop. **New shared primitive `components/ui/animated-icon-button.tsx`** (`AnimatedIconButton { icon, iconSize?, iconClassName?, …ButtonProps }` — wires `useAnimatedIcon` internally, works under `DropdownMenuTrigger asChild`; forwardRef sub-component pattern for plain buttons/cells, exemplar `ConversationOptionsButton` in ask-os-conversation-list). **Repo-wide `MoreHorizontal`→`EllipsisIcon`: 100% (37 files)**, then interactive-icon breadth per module: Projects (60+ files — ticket details, views, sprints/epics, QA, roadmap, settings, whiteboard, command center), HR (60+ — attendance, expenses, recruitment, governance, enterprise ops, templates), Inventory (45+ — sheets, quality, shipping, traceability, reports, POs/SOs), Chat/Calendar/Dashboard (25+ — bubbles, panels, huddle, calendar toolbar/pickers), Support/KB (20), Payroll/Timesheets/Surveys/Sign/Org (50+), Settings/Users (16), leftovers (payments, subscription, shared automations/import-export). **Deep verifies to Accounting parity**: Accounting+Billing (87 files — 9–12-row skeletons, StatCardGridSkeleton, fill chains, dark-mode incl. chart seeds #8b5cf6→blue, LoadingButton, raw #ID labels→names, named handlers) and CRM (~22 files — dark tint pairs, 14 LoadingButton conversions, getErrorMessage sweep, raw-ID removal). **Docs**: UI-UX-SYSTEM.md §6 rewritten (h-9 canon + FILTER_TOOLBAR_ROW single-row; old spec said h-8/flex-wrap), §7 skeleton-Xerox canon, §8 icons rewritten animated-first; CLAUDE.md §8 AnimatedIconButton living rule. **Verified animated-set gaps** (keep static): PencilIcon, HomeIcon (use HouseIcon), ArrowLeftIcon/ArrowRightIcon, ArrowDownIcon, RefreshCwIcon, SaveIcon, PlayCircleIcon. Gate: tsc ✓ lint 0 errors (749 warnings incl. react-hooks/refs pattern warnings on icon refs — tolerated baseline) ✓ build ✓. Known remaining: DropdownMenuItem inner icons stay static by convention (menu row is the hover target); icons absent from the animated set.

> **UI/UX conformance mega-sweep (2026-07-16)**: 10 parallel single-module agents + central punch-list, ~190 files across ALL modules (landing/auth/onboarding excluded). **Control chrome**: page/sheet/dialog `h-8`/`h-10`/`text-xs` overrides stripped repo-wide so root `FIELD_CONTROL_CLASS` h-9 canon propagates — timesheets-core (worst offender, 14), users dialogs/forms (9), settings org profile+localization (17), CRM dialogs/sheets, surveys builder, HR (~30 selects across 22 files), support/kb filters, notifications. **Toolbars**: FILTER_TOOLBAR_ROW/FILTER_SELECT_TRIGGER adoption — HR outer `bg-muted` filter-card wrappers removed (9 files), kb-manager double-nested wrapper collapsed, support reports/inbox, timesheets-core audit/reports/approvals, accounting CoA, billing enterprise-quotes/invoices. **LoadingButton**: timesheets approvals/my-time, all 6 organization CRUD pages (×2 each), CRM stakeholders. **Color**: HR violet/purple purge (50+ across 40 files → blue family or theme tokens with dark: pairings), locations STORE badge, timesheets `text-blue-600`→`text-primary`. **Copy**: 22 HR bare-count badges + 6 KB count subtitles → descriptive text. **Skeletons**: projects bugs/meetings loading filter rows non-wrap + h-9; timesheets billing → StatCardGridSkeleton. **Raw-ID entry eliminated**: deal-stakeholders-card "Contact ID" text input → searchable `Combobox` on `useContacts` + `useDebouncedValue` (names + email sublabels) with animated PlusIcon/Trash2Icon. **Misc**: notifications quiet-hours hand-rolled input chrome → shared `Input`; `getApiError`→`getErrorMessage` (vip-clients) + kpi-library raw catches; incidents-page row actions → animated `EllipsisIcon` sub-component. Gate: tsc ✓ lint 0 errors ✓ build ✓. **Intentional exceptions**: CommandInput comboboxes/command palettes/quick-find; support inbox split-pane compact controls; KB wiki document-sidebar h-8; timesheet week-grid cell inputs; payroll/org setup wizards centered; chat thread reading width; hr template-token-picker violet (semantic token-category color); chip rows inside cards may wrap. **Not covered** (session-limit cutoffs): full repo-wide animated-icon breadth (converted in touched files only) and deep per-page verification of CRM/Accounting beyond grep-verified toolbars/search/chrome.

> **Table title overflow fix (2026-07-15)**: Root cause — `TableCell` `whitespace-nowrap` + auto `table-layout` + `min-w-max` wrapper let long titles paint into the next column; `TEXT_ONE_LINE` used `truncate`/`nowrap` (no real clamp) and title `td`s used circular `max-w-[min(100%,…)]` without `table-fixed`. Fixed shared `TEXT_ONE_LINE` (`line-clamp-1` + break-all), added `TABLE_TITLE_CELL` (`w-[40%] max-w-0 whitespace-normal`), DataTable `table-fixed` + cell `min-w-0 overflow-hidden`, swept bugs/backlog/QA/approvals/governance and other DataTable title columns.

Ordered money-path first. Check off each page after fixing.

> **Visual QA wave (2026-07-02)**: Screenshot-driven QA via Playwright harness (`frontend/scripts/screenshot-pages.mjs`, 375/768/1280, auth-state reuse, `SCREENSHOT_EMAIL/PASSWORD` env override) across all admin groups — ~50 files fixed from real pixels. Root-cause theme repair: `--accent` blue→slate-100 neutral hover pair (fixes invisible dropdown hover icons app-wide), borders full-opacity, header violet leftovers→ink/blue. New primitives: compact `StatCard`+`StatCardGrid` (~56px rows, one-row mobile scroll), generic `DataTable` (sort/pagination/selection/skeleton), PageWrapper v3 (equal-width mobile actions, mobile filters popover, one-line subtitle clamp, `backHref`). virabha reference recipe codified + applied (filters block SEPARATE from table card; sheet anatomy header/body/footer with fixed header+footer). All bespoke error/empty states → shared `ErrorState`/`EmptyState` (dashed container, outline CTA). Rules codified in `UI-UX-SYSTEM.md`: calculated heights (no magic numbers), big-form→Sheet, equal-width sheet footer buttons, no overlapped spacing, per-module identity accents (nav-only). Demo-account seed + failing-API triage: failures were unseeded-org only, wiring correct.

> **Visual program wave 3 (2026-07-02)**: DataTable `search`/`toolbar` props REMOVED — filters can never share the table card (6 org pages rewired to PageWrapper filters row; 12 accounting pages' in-card filter blocks lifted out). Module switcher redesigned (root cause: 40%-opacity selected border — now per-module accent border + check; trigger shows accent-tinted current module). Per-module nav accents (MODULE_ACCENTS) across rail/sidebar/switcher. Create-workspace 404 → Dialog (create → switch → dashboard). Hidden products root-caused: module key case/name mismatch (`hrms` vs `"HR"`) — all products visible, disabled ones locked → /settings/modules. Module enable FIXED (3-point chain): catalog-merged list endpoint, dual-store transactional sync (`org_modules` + `organizations.enabledModules` via array_append/remove), cache bust + JWT/session refresh on toggle — DB-probe verified both stores agree incl. revert; 19 entitlements unit tests pass. PhoneInput standardized across 20 forms + rule in doc. Duplicate "API Keys" nav entry removed (Platform group). Dev rate limits ×10 (prod unchanged) + fixed cross-tier shared-bucket bug in the in-memory limiter. Demo org seeded (`seed-demo.ts`) + harness env-credential support; login verified end-to-end on screenshots. Module semantics UNIFIED: `organizations.enabledModules` is the single read truth (entitlements list derives `enabled` from it; kb/blog = `core: true` "Always on", non-toggleable, 400 on toggle); settings/modules toggles render pure backend state. `authorize.ts` guard: org-owner/platform-admin bypass, case-normalized module compare, error names the module (was `undefined`), tier check reads `ctx.plan` (dead cast removed). All 9 organization pages wrapped in `<RequireModule module="HR">` (module-disabled state + Manage Modules link on direct URL). Org sheet forms: doubled `py-2` removed (6 pages). AI credits 500 root-caused: `org_ai_credits.org_id` was integer vs text org UUIDs (`parseInt`→NaN) — schema/columns fixed to text+FKs, migration applied, zero-wallet default returns 200. Backend tsc ✓ frontend tsc ✓ (only user-in-flight chat/tickets edits outstanding).

> **Settings PM review (2026-07-02)**: `/settings/email-templates` DELETED (preview-only, no user value; CRM has its own full-CRUD editor at `/crm/settings/email-templates`); `/settings/custom-fields` → redirect to existing `/crm/settings/custom-fields` (dead global feature code deleted). Living rule added (CLAUDE.md §16): custom fields/automations/integrations/data-hub are module-owned, never global settings. `/users/import` dead nav link removed — UserImportDialog already on /users (More→Import CSV), backend verified with real 2-row import. `/billing` stats: two rows → one StatCardGrid (5 cards, dupes dropped). `/settings/security`: passwordExpiryDays was DECORATIVE — now enforced at login (baseline passwordChangedAt→createdAt → forceChangePassword → /reset-password); allowedEmailDomains + maxConcurrentSessions were enforced-but-hidden — UI cards added; NIST copy; ipAllowlist = stored-unenforced backlog. `/settings/sessions` e2e: next-auth.d.ts `sessionId` type gap (JWT always randomUUID → isCurrent never true) fixed; JwtAuthGuard now reads `revoked:session:` Redis denylist (revocation actually enforces, PAT skip, Redis-down graceful); page rebuilt on DataTable + canonical filters + ConfirmDialog. `/settings/api-tokens`: 12 violations fixed (viewport-tall empty pit, loose copy block, header action, condensed 32px rows). `/settings/ai` KEPT (real org AI flags + usage). Backend tsc ✓ frontend tsc ✓.

> **Module-owned settings wave 2 (2026-07-05)**: `/settings/integrations`, `/settings/automations`, `/settings/ai` DELETED as global pages — moved to module settings: HR integrations+automations → `/hr/settings/integrations`, `/hr/settings/automations`; Projects git → `/projects/settings/integrations`; Support automations → `/support/settings/automations`; Finance automations → `/accounting/settings/automations`; CRM AI → `/crm/settings/ai`. Old URLs redirect (integrations→HR, automations→HR, ai→CRM, git→projects). Platform sidebar group entries removed; `/settings/connected-accounts` kept global. Calendar/email connect CTAs → `/settings/connected-accounts`.

> **Projects UI wave + KB extraction + live modules (2026-07-03)**: All 22 eligible Projects pages refined to canon (roadmap/my-tickets/tickets-hooks skipped — user in-flight): PageWrapper eyebrow/backHref everywhere, shared DataTable/StatCardGrid/EmptyState/ErrorState, canonical sheet footers (intake ×3, webhooks inline-form→Sheet, cycles/modules/views body→footer), RequireModule PROJECTS on top-level pages; §9 splits: templates 693→149 (+4 feature files), reports 679→42 (+7 chart sections), epics 514→176 (+epic-card). Module state is LIVE everywhere: new `useEnabledModules()` reads `/me/access` (session fallback for first paint), 7 consumers swapped off JWT claim — toggle → instant unlock, no reload (root cause: NextAuth beta update() unreliable). KB extracted from helpdesk: `/support/kb/**` → `/kb/**` (param-preserving redirects, 7 link sites, features/kb/), Documents product tile → /kb, KB removed from Helpdesk nav group, /kb→documents pathname mapping. Wiki dedup: removed from Home Overview (Documents product is sole sidebar home). Analytics product tile fixed /analytics(404)→/reports (+product mapping). Agent screenshot-login failures root-caused: AUTH_RATE_LIMITED from parallel Playwright logins, not a regression — verified login works post-window. Backend tsc ✓ frontend tsc ✓ (user in-flight: chat-types, tickets hooks, my-tickets, roadmap, features/crm/analytics).

> **Sales/CRM conformance program (2026-07-03)**: All 34 CRM pages audited+fixed against CLAUDE.md/UI-UX-SYSTEM.md via 14-domain parallel workflow (95 files): PageWrapper/DataTable/StatCardGrid/EmptyState/ErrorState everywhere, 3-zone sheets, condensed tables, motion discipline + useReducedMotion, dead code removed. Empty states → inline illustration components (4 new: leads/deals/companies/clients, SMIL-animated; `Wrapper` now pauses SVG animations under reduced-motion); raw downloaded SVGs deleted per the inline-components rule. Hooks: 32 mutationKeys added; `useUpdateDealStage` optimistic update was a silent no-op (snapshotted the bare root key) → `getQueriesData`/`setQueriesData` across list variants; `useDealAging` staleTime→0 for polling; quotes.ts migrated to `queryKeys.crmQuotes` factory (raw keys lived in a separate namespace — factory invalidations silently missed); 22 dead hooks deleted (commissions/quotas/NPS-admin/CSAT/SLA/renewals) + orphaned factory keys pruned; `activities.ts`→`custom-fields.ts`. Backend RBAC hardening (~50 endpoints): fail-open GETs gated across crm/deals/sales/clients/quotes/calendar/contacts/leads-ops; banned `requireAuthorize` purged from contacts (vCard endpoint had ZERO auth); stale-JWT role/permission checks → DB DataScope (clients BOLA, targets); 8 catalog keys added + role defaults; §21 reconcile-note resolved and the PermissionGuard fail-open gap codified in CLAUDE.md. NEW backend: `crm_automation_rules` + `crm_products` tables + CRUD (DDL applied to dev DB directly — canonical drizzle migration still needs TTY `db:generate`) — `/crm/settings/automations` and `/crm/settings/products` were calling endpoints that never existed. E2E (Playwright, 28 routes + detail attempts, screenshots, 4 parallel shards) found+fixed: forecast `limit=200`→400 (backend caps 100), audit-log wrong path + 12 contract mismatches (`/audit-log`, targetType/dateFrom/logs/totalPages) + dead export button, login blocker = rate-limiter orphaned Redis key (`count=552, ttl=-1`) — limiter now self-heals TTL-less keys, fflate blob-worker CSP → `worker-src 'self' blob:`, Excalidraw fonts on public boards → `font-src + https://esm.sh`, wiki share page `ssr:false`-in-RSC build break → client loader, phantom `@tiptap/extension-image` pinned ^3.27.1. Final E2E: 25/28 routes zero-error; clients/quotes/settings-products carry one cosmetic console error from a Next 16.2.9 framework bug (1 of 37 SSR chunk script tags missing the CSP nonce; pages function). Follow-ups: PermissionGuard deny-by-default flip (platform-wide decision), `catalog.ts`/`authorize.ts` orphans blocked by settings/org-hierarchy, repo-wide `as Record<string,unknown>` filter-cast idiom (fix = api-client/query-keys generics). Backend tsc ✓ frontend tsc ✓ lint ✓ build ✓ E2E artifacts deleted per instruction.

> **Email system (2026-07-02)**: email system overhauled (shared layout kit, 63 templates, orphans wired/deleted, provider dedup)

> **UI/UX system program (2026-07-02)**: Canonical spec written at `UI-UX-SYSTEM.md` (repo root) from 100+ source research; CLAUDE.md §14 reconciled to the real ink-first system (slate-900 primary, blue-500 accent — violet gradients retired from the shell). PageWrapper v2 (`backHref` added); 13 legacy pages migrated off `min-h-screen` gradients/ad-hoc headers; 12 dead sidebar links removed + Developer group repointed; mobile nav → @animateicons; search filters added to all 7 org CRUD pages; CoA/assets filter-tabs → Selects; sheet padding unified (`p-0` + `px-6 py-4` header + `px-6 py-5` body); `/users/invitations` rebuilt canonical + `/settings/members` → redirect `/users`; CRM detail pages on PageWrapper+backHref. **Admin module overhaul (all 7 groups)**: Organization (9 pages — sticky sheet footers, dense tables, mobile overflow), People (users-page 905→430 lines, broken 17-line user detail stub rebuilt to full page, bulk ops verified), Access Control (stale `role.permissions` reads fixed post-column-drop, matrix sticky column, 613/693-line components split), Subscription/Platform (subscription page split 509→332), Security/Developer (`/settings/security` rewritten from personal-password form to real org policy page, session cache-key split bug fixed, audit user filter added, api-tokens/webhooks hardened). Verified: frontend tsc ✓ lint 0 errors ✓.

> **Visual redesign (redesign/v2 branch)**: All landing, auth, public/marketing pages have been visually redesigned — `brand-text` gradient clip-text removed (hero `brand-sweep` kept), `rounded-3xl` → `rounded-2xl`/`rounded-xl`, decorative uppercase eyebrows removed/converted to `font-medium`, `PageWrapper` eyebrow styling updated. Dashboard feature pages already use clean design system — no `brand-text` or `rounded-3xl` found.

> **Ask OS bar space + full-width/full-height layout wave (2026-07-13)**: Shell-level fix in `dashboard-shell.tsx` — `<main>` reserves a 24px bottom strip on desktop (`md:pb-6`, exact Ask OS bar height) so no page content/scrollbar sits under the fixed Ask OS bar; mobile scroll area reserves nav+bar (`pb-[5.5rem]`) and the Ask OS anchor was raised above the mobile bottom nav (was overlapping it). Then a 9-agent sweep across ALL `app/(authenticated)` modules (~56 files): removed narrow page-body `max-w-*xl mx-auto` caps so every page spans full width (settings/security/subscription/service-accounts/connected-accounts, billing checkout/invoice new+detail, notifications preferences/policy, accounting setup/opening-balances/bank-import/invoice-detail, payroll settings, hr engagement/integrations/exit-verification/emergency-detail/create-job-form/template-editor, projects webhooks/automations/goal-detail/feedbucket-detail, crm automation-builder, kb settings, chat config/discovery, inventory barcode + create-form skeletons — loading.tsx skeletons updated to match); viewport-height hacks converted to shell-fill (`h-screen`→`h-full` workflow builder ×5, `h-[calc(100vh-*)]`→PageWrapper `noInternalScroll`+`h-full` hr recruitment inbox + jobs new/edit). Intentionally kept: Sheet/Dialog widths, search inputs, centered wizards (org onboarding, payroll setup), Notion-style document-editor canvases (hr documents editor, KB wiki), chat thread 900px reading width, centered 404/empty text. Also fixed the one repo lint error (`@ts-ignore` in feedbucket-widget network-capture → typed overload signature). Build ✓ tsc ✓ lint ✓.
>
> **Round 2 — fill-chain wave (2026-07-13, same day)**: user feedback showed content still ended mid-screen (empty states/tables floating in a void). Root cause: nothing between PageWrapper and the final block passed height down. SHARED ENABLERS: PageWrapper inner content wrapper → `flex min-h-full flex-col` (bottom pad tightened `pb-6`→`pb-3` so content ends ~10px above the Ask OS bar); EmptyState + ErrorState (non-compact) now carry `flex-1` (auto-fill); DataTable scroll body → `flex flex-col` with a vertically-centering flex empty-slot (percentage-height bug fixed — empty states inside tables now truly fill). Then a 9-agent page-by-page fill-chain pass (~200 files): body wrappers → `flex flex-1 min-h-0 flex-col`, primary DataTable → `className="flex-1 min-h-0"` (internal scroll + sticky header to the bottom edge, Linear-style), skeletons `flex-1`, `min-h-[40vh]`-style floors removed, double gutters (page `px-*` inside PageWrapper) removed, Tabs surfaces threaded (payroll bonuses/payslips, api-tokens). Detail/form/chart/wizard pages intentionally natural-height; card-grids left transparent-natural. 3 accounting wrapper tables gained a typed `className` pass-through; 1 duplicate JSX prop fixed. VERIFIED LIVE via Playwright (demo org, real UA per E2E memory): /organization/teams, /users, /billing/coupons, /workflows all measure contentBottom=837 vs viewport 873 (bar top ~848). Build ✓ tsc ✓ lint ✓ (concurrent feedbucket-widget session's in-flight errors resolved themselves before final gate).

> **Selectable interface themes (2026-07-11)**: all 17 Tailwind accent palettes as shadcn-style themes (Red→Rose rainbow order; light hues amber/yellow/lime use 400-shade primary + dark foreground for contrast) + default Ink, scoped to the authenticated shell only — auth pages, org-setup, and marketing keep the fixed design. Themes are `:root.theme-*` token overrides in `frontend/themes.css` (primary/ring/sidebar-accent family/brand vars/chart seeds; neutrals stay slate), registry + type guard in `lib/theme/app-themes.ts`, context provider + localStorage persistence in `components/theme/app-theme-provider.tsx` (html-class applied on mount, removed on unmount so signin after logout resets), flash-free first paint via nonce'd inline script (`app-theme-script.tsx`, CSP pattern from GTM), palette-popover switcher in the global header. next-themes NOT reintroduced. Build ✓ tsc ✓ lint ✓.

---

## Global Navigation (Platform Shell)
- [x] `layout` — Activity Bar approach (VS Code/Linear style): thin 48px vertical icon rail (ActivityBar) for product switching using @phosphor-icons/react fill/regular weight + framer-motion spring indicator; full sidebar restored (logo+workspace, context-aware nav via getNavGroupsForProduct, search+bell footer, inline user profile dropdown); MobileBottomNav preserved; home product now shows Overview nav (Dashboard/Calendar/Chat/Notifications/Reports); tooltips z-[200]; deleted TopHeader, ProductSwitcher, orphaned NotificationBell and SidebarUserMenu
- [x] **Mobile shell (2026-07-04)** — GlobalHeader hidden below `md`; bottom nav = Menu (sidebar sheet: product switcher + workspace + module nav), Search (⌘K), module-aware Quick Create sheet, Alerts, Me (account menu opens upward); desktop header unchanged

---

## Dashboard
- [x] `/dashboard` — Removed type cast, duplicate import, dead widget exports, useEffect data fetch; added TanStack Query hook for public docs; named all event handlers; fixed empty states, grid orphan, loading skeleton alignment, quick-actions deduplication, comments removed

---

> **CRM metadata-first program (2026-07-12)**: Recheck of the prior CRM wave found migrations 0251/0252 unapplied + the CRM metadata seed never run (empty pipelines/options across all 41 orgs) — applied 0251-0255 live, backfilled seed (41/41 orgs) + RBAC grants (crm keys). Then closed the 22-doc PRD gap set via ~13 parallel agents. **Metadata-driven everywhere**: deleted `PIPELINE_STAGES`/`DEAL_STAGES`/`STATUS_COLORS`/`PRIORITY_COLORS`/`SOURCE_COLORS`/`PIPELINE_COLORS`/`FUNNEL_STAGES` hardcodes — leads/deals tables, kanban, reports, CRM-home widget, company detail all render from `useCrmOptions`/`useCrmStages` + `CrmOptionBadge`/`CrmStageBadge` with token colors; backend killed hardcoded board statuses, priority→SLA map, dashboard stage-name filters, `negotiation` auto-channel literal (→ `stageType`+probability signal), and status/priority Zod enums in reports+AI tools. **Blueprint enforcement**: lead status changes + deal stage changes now assert transitions (allowedNext, requiredFields, requiresQuote, requiredActivityTypeKeys); deals now run the configurable validation engine. **Leads engine**: 3 new routing modes (weighted_round_robin/least_loaded/territory, mig 0254), per-dimension scoring, `lead.score_changed` emit. **Automation studio**: graph/branch execution walker (50-node cap + cycle detection), 4 new runner actions (assign_owner/update_field allowlist/add_tag/remove_tag), sequence stopOn (converted), FE branch/exit builder nodes + run-log branchTaken (16 new green tests). **Event emits wired**: form.submitted, invoice.paid, task.overdue cron (email.replied deferred — no inbound infra). **New surfaces**: Data Quality dashboard (`/crm/settings/data-quality`, 8 aggregates), inbox AI-recommended-actions section, deal stakeholders card + forecast manager-override (mig 0255), Customer 360 projects + signed-documents sections. **AI hardening**: all 15 CRM AI endpoints feature-flag-gated + audited. **UX pass**: purple→blue purge, getErrorMessage sweep, sheet anatomy fixes, LoadingButton/animated-icons, split 7 files >500 lines, added loading/error states to inbox + 6 settings routes. FE tsc ✓ BE tsc ✓ (email.replied stopOn + wait-node scheduling + send_whatsapp/create_deal/create_quote actions documented as deferred).

## CRM — Leads & Pipeline
- [x] `/crm` — Dedicated stats endpoint; error state; metadata-driven pipeline-mini widget (useCrmOptions, no PIPELINE_STAGES constant)
- [x] `/crm/leads` — Leads pipeline with kanban + table view, stats bar, filters, create/edit sheet
- [x] `/crm/leads/[leadId]` — Lead detail: info + activities + quick actions + sidebar
- [x] `/crm/leads/distribute` — Lead distribution to team members
- [x] `/crm/leads/smart-search` — AI-powered lead search
- [x] `/crm/leads/duplicates` — Duplicate detection + merge
- [x] `/crm/leads/source-report` — Lead source analytics
- [x] `/crm/deals` — Deals kanban (metadata-driven stages from useCrmPipelines) + table, stage management, optimistic moves
- [x] `/crm/deals/[dealId]` — Deal detail: info + activities + meetings + sidebar (health chip, next-step inline, approval banner, competitors card); blueprint transition enforcement + won/lost dialog
- [x] `/crm/deals/forecast` — Pipeline forecast summary + chart + close-date list + snapshot capture/list
- [x] `/crm/deals/approvals` — Deal approval workflow; approve/reject gated by crm:deals:approve
- [x] `/crm/deals/aging` — Aging deals report with metadata-driven stage badges
- [x] `/crm/deals/win-loss` — Win/loss analysis with metadata-driven terminal stage keys
- [x] `/crm/quotes` — Quotes list with status filters, pagination + CSV export (backend `/quotes` contract)
- [x] `/crm/quotes/[quoteId]` — Quote detail with line items, totals, status transitions
- [x] `/crm/contacts` — Contacts list with search/filter, table/card views, CSV import, AI enrich
- [x] `/crm/contacts/[contactId]` — Contact detail: info + timeline + notes + related deals
- [x] `/crm/clients` — Client accounts list with health status
- [x] `/crm/clients/[clientId]` — Client detail: info + activities + timeline + opportunities + onboarding + renewals
- [x] `/crm/companies` — Companies (CRM organizations) list with search + pagination
- [x] `/crm/companies/[companyId]` — Company detail: rollup stats + hierarchy + timeline + related leads
- [x] `/crm/activities` — Cross-entity activity log with filters + stats bar
- [x] `/crm/tasks` — CRM tasks by due-date buckets with complete/delete
- [x] `/crm/calendar` — REMOVED (redirects to `/calendar`); CRM events now a toggleable "CRM events" source in the unified `/calendar` per §16 one-calendar rule
- [x] `/crm/analytics` — CRM analytics dashboard; fixed 500 crashes (raw-sql JS-Date → .toISOString()); backend endpoints all verified 200
- [x] `/crm/reports` — CRM reports with Excel export
- [x] `/crm/settings/assignment-rules` — Lead assignment rules with priority reorder
- [x] `/crm/settings/email-templates` — CRM email templates with variables + preview
- [x] `/crm/settings/scoring-rules` — Lead scoring rules with live preview
- [x] `/crm/settings/sla` — SLA policies + report + breached leads
- [x] `/crm/settings/products` — Product catalog CRUD
- [x] `/crm/settings/custom-fields` — Custom field definitions per entity
- [x] `/crm/settings/automations` — Automation rules dense list, optimistic enable/disable toggle, run history drawer; builder at `/automations/[automationId]` (DnD node composer, test panel, run history); `CrmAutomationBusService` (emit + depth guard + cooldown), `CrmSequencesRunnerService` (cron flush); migration 0252; `crm:sequences:manage` permission; `POST /cron/crm-sequences-flush`
- [x] `/crm/settings/sequences` — CRM email sequence CRUD + reorder + enrollments + stop (tab added to settings layout)
- [x] `/crm/settings/ai` — CRM AI feature flags + usage dashboard
- [x] `/crm/settings/audit-log` — Audit log with filters + pagination + export
- [x] `/crm/settings/import-export` — CRM leads/contacts/deals/clients import & export
- [x] `/crm/settings/data-quality` — Data quality dashboard: 8 severity-tinted aggregates (missing email, invalid phone, duplicate leads/companies, stale deals, no next activity, no owner, missing stage-required fields) with deep-link offender lists; `crm:data-quality:view`

---

## Billing & Accounting
- [x] `/billing` — **Consolidated Billing & Plan (2026-07-16)**: URL-synced tabs — Plan (current plan/trial banner, plan cards + monthly/annual toggle, promo-code apply, Razorpay upgrade, compact seats block, plan-usage meters from `GET /billing/entitlements`), Invoices & Payments (subscription payment history), Billing Profile (GSTIN/PAN/address form); absorbs `/settings/subscription` + `/billing/seats`
- [x] `/billing/invoices` — Invoices list with status filters
- [x] `/billing/invoices/new` — New invoice creation
- [x] `/billing/invoices/[invoiceId]` — Invoice detail: line items table, totals, payments history, record-payment dialog, send/mark-paid/delete actions
- [x] `/billing/checkout` — Multi-step checkout wizard: plan selector → billing cycle → coupon → review & pay with Razorpay; 20% annual discount; coupon validation
- [x] `/billing/ai-credits` — AI Credits wallet: balance stats, auto top-up toggle, credit pack cards, usage history table with transaction types
- [x] `/billing/analytics` — Revenue Analytics (platform admin): MRR/ARR/ARPU/churn KPI cards, MRR trend BarChart, period selector (3m/6m/12m)
- [x] `/billing/affiliate` — Affiliate Dashboard: register CTA, referral link copy, send invite email, commission history table; empty state when not registered
- [x] `/billing/enterprise-quotes` — Enterprise Quotes list: status filter, table (ref/subject/status/seats/value/valid-until/deal), New Quote Sheet (seat negotiation + custom pricing + contract terms + Zod validation + live total preview), skeleton + empty + error states
- [x] `/billing/enterprise-quotes/[quoteId]` — Enterprise Quote detail: two-column layout, Quote Details card (seats/pricing/contract term/total value), Contract Terms + Notes cards, Approval Workflow sidebar timeline, context-sensitive actions (Submit/Approve+Reject/Send/Accept), Print button; gated behind `billing:enterprise-quotes:approve` for approve/reject
- [x] `/billing/bundles` — Solution Suites (Sales/People/Operations/Finance) with savings badges + individual vs bundle pricing; Custom Module Bundle builder with 11 modules, tiered 15%/20% discount, live price calculator
- [x] `/billing/seats` — **Redirects to `/billing?tab=plan`** (2026-07-16); seats block lives in the Billing & Plan page's Plan tab
- [x] `/billing/addons` — Add-ons store: 9 add-on cards (AI Credits/Extra Storage/WhatsApp/SMS/Voice AI/White-label/Custom Domain/Premium Support/API Capacity), Coming Soon badges for unavailable, Manage Credits link for AI credits
- [x] `/billing/coupons` — Coupon management: 4-stat row, table with Active/Inactive/Expired badges, copy/deactivate actions, Create Coupon Sheet (code/type/value/maxUses/applicablePlans/expiresAt), `useCan("settings:manage")` gate; uses `coupons` table
- [x] `/billing/trials` — Trial management: TRIAL status shows countdown + days remaining + progress bar + upgrade CTA + trial type info cards; paid plan shows renewal date; no-subscription shows plan CTA
- [x] `/billing/referrals` — Referral program: rewards flow banner, email invite form, 3 stat cards (invites/active/rewarded), status-badged table (PENDING/SIGNED_UP/ACTIVATED/REWARDED/EXPIRED)
- [x] `/billing/checkout` — **Rebuilt to 8 steps**: Platform → Apps&Bundles → Seats → AI Credits → Review Pricing (coupon, annual/monthly toggle) → Tax Details (GSTIN/state/GST calc) → Payment (Razorpay) → Confirmation; invoice statuses updated to DRAFT/ISSUED/PAID/FAILED/VOIDED
- [x] `/marketplace` — App Marketplace: category filter tabs, app cards with install/trial/uninstall actions, skeleton loading, empty state per category
- [x] `/accounting` — Accounting overview
- [x] `/accounting/coa` — Chart of accounts
- [x] `/accounting/coa/[accountId]` — Account detail: type badge, edit dialog (name/description/isActive), recent journal entries
- [x] `/accounting/journal` — Journal entries
- [x] `/accounting/journal/new` — New journal entry
- [x] `/accounting/journal/[entryId]` — Journal entry detail: lines table with balanced indicator, Post/Reverse AlertDialog actions
- [x] `/accounting/trial-balance` — Trial balance
- [x] `/accounting/profit-loss` — Profit & loss
- [x] `/accounting/balance-sheet` — Balance sheet
- [x] `/accounting/customers` — Customer ledger list
- [x] `/accounting/customers/[clientId]` — Customer ledger: date-range filter, summary stats, ledger table with running balance
- [x] `/accounting/vendors` — Vendor ledger list
- [x] `/accounting/vendors/[vendorId]` — Vendor ledger: date-range filter, summary stats, ledger table with running balance
- [x] `/accounting/purchase-bills` — Purchase bills list
- [x] `/accounting/purchase-bills/new` — New purchase bill
- [x] `/accounting/purchase-bills/[billId]` — Bill detail: line items, totals, Post AlertDialog, record-payment dialog
- [x] `/accounting/aged-receivables` — Aged receivables
- [x] `/accounting/aged-payables` — Aged payables
- [x] `/accounting/gstr-1` — GSTR-1
- [x] `/accounting/gstr-3b` — GSTR-3B

> **Accounting & Finance program (2026-07-12)**: full PRD build (tasks/accounting-finance, 21 docs) via ~30 parallel agents — 11 backend modules (accounting-settings, accounting-gl, finance-ar/ap/banking/tax/reports/planning/assets/controls/expenses) on a hardened FinancePostingService contract (balanced/immutable/period-locked/idempotent/multi-currency), 38 new tables (migrations 0240–0247, journaled, NOT applied — need TTY), 58 RBAC keys + ACCOUNTANT role, 21 notification events, finance cron endpoints (recurring-flush/due-checks/depreciation), deterministic AI insights (anomalies/digest/categorize-suggest), 132 passing finance unit/controller specs, authenticated CSV export helper. Full build/typecheck DEFERRED (concurrent sibling sessions) — run after all sessions land.

- [x] `/accounting` — Finance overview dashboard: StatCards + drill links, 12-mo revenue/expense chart, bank accounts, AI insights strip
- [x] `/accounting/invoices` + `/[invoiceId]` — AR invoice list (stats, filters, record payment w/ allocations, void) + detail (lines, payments, credit notes, collection panel) + Collections tab (aging, risk scores, promise-to-pay)
- [x] `/accounting/recurring-invoices` — recurring invoice templates CRUD + run-now
- [x] `/accounting/credit-notes` — credit notes CRUD, post (approval-gated), apply-to-invoice
- [x] `/accounting/payments-received` — payments list (derived; org-level payments endpoint = known debt)
- [x] `/accounting/payment-reminders` — reminder policies + send log
- [x] `/accounting/recurring-bills` — recurring bill templates CRUD + run-now
- [x] `/accounting/vendor-credits` — vendor credits CRUD, post, apply-to-bill
- [x] `/accounting/vendor-payments` — vendor payments list + manual multi-bill allocation
- [x] `/accounting/payment-runs` + `/[runId]` — payment run planning: create from filters → approve → execute (per-item results)
- [x] `/accounting/banking` + `/[bankAccountId]` — bank accounts hub + transactions
- [x] `/accounting/banking/import` — 3-step CSV import wizard (mapping, preview, dedupe results)
- [x] `/accounting/banking/reconciliation` — two-pane reconciliation workspace (scored suggestions, match/split/fee/journal/ignore, rules builder)
- [x] `/accounting/banking/transfers` — inter-account transfers
- [x] `/accounting/expenses` (+`/receipts`, `/reimbursements`, `/reimbursements/[batchId]`, `/policies`) — finance expense views: approval flow, receipt inbox, reimbursement batches (approve/pay), policies
- [x] `/accounting/general-ledger` — GL with running balance, dimension filters, CSV export
- [x] `/accounting/period-close` — periods, close checklist w/ deep links, close/lock/reopen
- [x] `/accounting/opening-balances` — opening balance editor (auto-balance to retained earnings)
- [x] `/accounting/dimensions` — accounting dimensions + values CRUD
- [x] `/accounting/taxes` (+`/codes`, `/payments`, `/reports`) — tax dashboard, tax codes (GST seed), tax payments, input/output/liability reports w/ drill-down
- [x] `/accounting/budgets` + `/[budgetId]` — budgets, matrix line editor, revisions, budget-vs-actual
- [x] `/accounting/forecast` — 13-week scenario-weighted cash forecast + compare
- [x] `/accounting/scenarios` — cash-flow scenario builder
- [x] `/accounting/assets` + `/[assetId]` + `/depreciation` — fixed assets, straight-line schedules, depreciation runs, disposal
- [x] `/accounting/approvals` — finance approval queue (separation of duties)
- [x] `/accounting/reports` + 10 report pages — reports hub (catalog-driven) + statements, sales/expense analytics, profitability, working capital, burn/runway
- [x] `/accounting/settings` — finance settings hub: company financial, tax registration, sequences, system accounts, approval policies, exchange rates, payment terms (+ existing automations tab)
- [x] `/accounting/setup` — guided 6-step setup wizard (company/currency → tax registration → COA template → system accounts → periods → opening balances) driven by setup-status

---

## HR — Core
- [x] `/hr` — HR overview
- [x] `/hr/employees` — Employees list
- [x] `/hr/employees/[employeeId]` — Employee profile: tabs (overview/attendance/edit), avatar, stats, direct reports, skills, social links, full edit form
- [x] `/hr/attendance` — Attendance
- [x] `/hr/leaves` — Leave management
- [x] `/hr/payroll` — redirects to /payroll
- [x] `/hr/payroll/salary-structures` — redirects to /payroll/salary-structures
- [x] `/hr/payroll/allowances` — redirects to /payroll/components
- [x] `/hr/payroll/tax` — redirects to /payroll/taxes
- [x] `/hr/payroll/bank-transfers` — redirects to /payroll/bank-transfers
- [x] `/hr/my-payslips` — redirects to /payroll/me
- [x] `/hr/expenses` — Expenses
- [x] `/hr/reimbursements` — Reimbursements
- [x] `/hr/assets` — Assets
- [x] `/hr/devices` — Devices (redirects to /hr/assets — intentional)
- [x] `/hr/work-logs` — Work logs
- [x] `/timesheets` — My Time capture hub (timer + weekly grid + day timeline, submit/recall week)
- [x] `/timesheets/team` — Team time overview (week grid, submission status, drill-down)
- [x] `/timesheets/approvals` — Approval queue (bulk approve/reject, period detail + audit timeline)
- [x] `/timesheets/billing` — Billing queue (uninvoiced hours, rate resolution, CSV/XLSX export, invoice draft)
- [x] `/timesheets/payroll` — Timesheets payroll queue & export (summary, overtime, mapping, CSV/XLSX, history)
- [x] `/timesheets/reports` — Reports (overview analytics + Project Budgets burn tab live; other catalog tabs "coming soon")
- [x] `/timesheets/settings` — Settings (general policy, rates/rate cards, audit trail)
  - Standalone Timesheets product (MVP loop) — **its own top-level product module**: header product-switcher tile + dedicated sidebar (removed from Projects), RBAC-only core module (no `@RequireModule`, always-on). Backend module `timesheets-core/` (`TimesheetsCoreModule`), FE `features/timesheets-core/` + `hooks/api/timesheets-core/`; payroll queue stays in `timesheets/` (`TimesheetsModule`). APIs `/timesheets/{entries,timer,periods,approvals,billing,reports,settings,rates,audit}`; schema `timesheet_periods|timer_sessions|timesheet_audit_events|timesheet_rate_cards|timesheet_rates` + extended `timesheets`; migration `0160_timesheets_standalone.sql` (NOT YET RUN — deferred; renumbered from 0156 after siblings took 0156-0159); RBAC `timesheets:*` catalog. Backend + FE timesheets typecheck clean; pure-logic unit tests green.

---

## HR — People Ops
- [x] `/hr/onboarding` — Onboarding overview
- [x] `/hr/onboarding/[userId]` — Employee onboarding: progress bar, grouped tasks (pending/completed), overdue highlighting, toggle-complete actions
- [x] `/hr/onboarding/my-tasks` — My onboarding tasks
- [x] `/hr/org-chart` — Org chart
- [x] `/hr/teams/[teamId]` — Team detail: info card, lead employee resolution, edit Sheet, delete AlertDialog
- [x] `/hr/helpdesk` — HR helpdesk
- [x] `/hr/handbook` — Employee handbook; `DashboardGate permission="hr:documents:manage"`
- [x] `/hr/recognition` — Recognition
- [x] `/hr/performance` — Performance reviews; `DashboardGate permission="hr:performance:manage"`
- [x] `/hr/surveys` — Surveys
- [x] `/hr/enps` — eNPS
- [x] `/hr/assessments` — Assessments
- [x] `/hr/learning-paths` — Learning paths
- [x] `/hr/skills` — Skills
- [x] `/hr/certifications` — Certifications
- [x] `/hr/career-ladders` — Career ladders
- [x] `/hr/loans` — Loans
- [x] `/hr/bonuses` — Bonuses; `DashboardGate permission="hr:payroll:generate"`
- [x] `/hr/incentives` — Incentives
- [x] `/hr/documents` — Documents
- [x] `/hr/documents/templates` — Document templates
- [x] `/hr/documents/templates/new` — New document template
- [x] `/hr/documents/templates/[templateId]/edit` — Edit document template
- [x] `/hr/documents/editor/new` — New document
- [x] `/hr/documents/editor/[documentId]` — Document editor
- [x] `/hr/document-review` — Document review
- [x] `/hr/document-types` — Document types
- [x] `/hr/email-templates` — HR email templates; `DashboardGate permission="hr:documents:manage"`
- [x] `/hr/compliance` — Compliance
- [x] `/hr/background-verification` — Background verification; `DashboardGate permission="hr:employees:update"`
- [x] `/hr/alumni` — Alumni
- [x] `/hr/exit` — Exit management
- [x] `/hr/fnf` — Full & final settlement; `DashboardGate permission="hr:payroll:approve"`
- [x] `/hr/termination` — Terminations
- [x] `/hr/asset-returns` — Asset returns
- [x] `/hr/analytics` — HR analytics; `DashboardGate permission="hr:performance:view"`
- [x] `/hr/settings/import-export` — HR employees/expenses/assets export
- [x] `/hr/settings/integrations` — Recruitment job board integrations (LinkedIn, Naukri, Indeed)
- [x] `/hr/settings/automations` — HR automation rules (non-CRM triggers)
- [x] `/hr/team-events` — Team events
- [x] `/hr/employees/find-expert` — Find expert
- [x] `/hr/employees/skills-matrix` — Skills matrix

---

## HR — Recruitment
- [x] `/hr/recruitment` — Recruitment overview
- [x] `/hr/recruitment/jobs` — Job postings
- [x] `/hr/recruitment/jobs/new` — New job posting
- [x] `/hr/recruitment/jobs/[jobId]/edit` — Edit job posting
- [x] `/hr/recruitment/candidates` — Candidates list
- [x] `/hr/recruitment/candidates/[candidateId]` — Candidate detail
- [x] `/hr/recruitment/candidates/import` — Bulk candidate import
- [x] `/hr/recruitment/pipeline` — Pipeline
- [x] `/hr/recruitment/interviews` — Interviews
- [x] `/hr/recruitment/scorecard-templates` — Scorecard templates
- [x] `/hr/recruitment/scorecard-analytics` — Scorecard analytics
- [x] `/hr/recruitment/question-bank` — Question bank
- [x] `/hr/recruitment/interviewer-performance` — Interviewer performance
- [x] `/hr/recruitment/diversity-report` — Diversity report
- [x] `/hr/recruitment/sla` — Recruitment SLA
- [x] `/hr/recruitment/sla-report` — SLA report
- [x] `/hr/recruitment/analytics` — Recruitment analytics
- [x] `/hr/recruitment/automations` — Recruitment automations
- [x] `/hr/recruitment/booking-links` — Interview booking links
- [x] `/hr/recruitment/email-sequences` — Email sequences
- [x] `/hr/recruitment/headcount` — Headcount planning
- [x] `/hr/recruitment/hiring-flows` — Hiring flows
- [x] `/hr/recruitment/inbox` — Recruitment inbox
- [x] `/hr/recruitment/internal-jobs` — Internal job board
- [x] `/hr/recruitment/offer-templates` — Offer templates
- [x] `/hr/recruitment/recruiters` — Recruiters
- [x] `/hr/recruitment/refer` — Refer a candidate
- [x] `/hr/recruitment/referrals` — Referrals
- [x] `/hr/recruitment/reports` — Recruitment reports
- [x] `/hr/recruitment/vendors` — Recruitment vendors

---

## Projects
**PM page-by-page futuristic UI wave (2026-07-14):** Shared chrome (`pm-chrome.tsx`: glass panels, ambient glow, toolbars, dense rows) + text overflow tokens. Polished money-path: Home, All Projects, My Work, All Work, Board, Backlog, Sprints, Epics, ticket detail. Critical fix: backlog/epics/sprints/cycles/ticket-key resolve use `useProjectBoardTickets` (no longer broken after project detail stopped embedding tickets). **Hard-deleted FE orphans:** `/projects/resource-allocation`, `/projects/whiteboards` hub, `/projects/programs/**` + program feature components (per-project whiteboard kept).

**PM Linear IA rebuild (2026-07-14):** Project sidebar cut from 30+ always-on items to Linear-style **primary rail** (Issues · Backlog · My issues · Cycles · Epics · Timeline · Chat) + searchable **More** popover for the rest · Settings pinned bottom. Product nav slimmed to Home · My issues · Projects · Inbox · Roadmap · Goals · Portfolios · Approvals · Templates · Settings. Workload route redirects to `?view=workload` on the board shell. Command Center rebranded Home with jump chips. Board API split retained (tickets not embedded on project detail).

**PM Linear/ClickUp polish + board API split (2026-07-14):** Board no longer hydrates tickets via `GET /projects/:id` (CLAUDE §11 living rule). Dedicated `useProjectBoardTickets` → paginated `GET /projects/:id/tickets` (column-projected list + cycle join; multi-page fetch cap 5×100). Project detail returns statuses/members only. Ticket detail comments capped at 50. Optimistic ticket patches hit board/list caches. UI: Command Center denser 2-col layout + animated jump links + priority/status rows; project sidebar Work/Plan/Ship/More IA + `bg-primary/10` active rail; kanban cards denser with left accent bar + theme hover.

**Projects module UI consistency (2026-07-07):** All sidebar list pages aligned to Approvals/Portfolio reference — `PageWrapper` + `eyebrow="Projects"`, shared `StatCard`/`StatCardGrid`, filters in `PageWrapper.filters`, themed empty/error states, `rounded-xl` card chrome, no double inner padding.
- [x] `/projects/all` — All Projects: PmPageShell + ambient glow, glass PM_TOOLBAR filters (outside table), denser grid cards/list with overflow-safe names, PmPanel empty/error/loading chrome; create/edit/archive/delete + URL filters + pagination kept (Linear-grade polish 2026-07-14)
- [x] `/projects/[projectId]` — Project board
- [x] `/projects/[projectId]/backlog` — Backlog
- [x] `/projects/[projectId]/sprints` — Sprints
- [x] `/projects/[projectId]/timeline` — Timeline: PmPageShell + glass Gantt (PM_TOOLBAR/PM_PANEL), board-tickets source, ticket click → detail URL, EmptyState when undated (Linear-grade polish 2026-07-14)
- [x] `/projects/[projectId]/epics` — Epics
- [x] `/projects/[projectId]/cycles` — Cycles
- [x] `/projects/[projectId]/modules` — Modules
- [x] `/projects/[projectId]/milestones` — Milestones: PmPageShell + glass milestone cards (left stripe, TEXT overflow, animated Plus/Trash), stats + CRUD sheets kept (Linear-grade polish 2026-07-14)
- [x] `/projects/[projectId]/pages` — Pages
- [x] `/projects/[projectId]/views` — Views
- [x] `/projects/[projectId]/intake` — Intake
- [x] `/projects/[projectId]/my-tickets` — My tickets (Board/List/Table via `?view=`; reuses KanbanBoard/ListView/TableView + ViewSwitcher subset; default table)
- [x] `/projects/[projectId]/tickets/[ticketKey]` — Ticket detail (Jira-like 2-column page: title/description/activity left, status/assignees/labels sidebar right; board/backlog/my-tickets navigate here; sheet widened to 3/4 for quick-view fallback)
- [x] `/projects/[projectId]/analytics` — Analytics (E2E fix: assignee chart now joins users for real names)
- [x] `/projects/[projectId]/budget` — Budget
- [x] `/projects/[projectId]/settings` — Project settings; Workflow Statuses fully editable (inline name/color/category + CRUD, header Add Status, optimistic patches; type seed+backfill)
- [x] `/projects/[projectId]/whiteboard` — Whiteboard (2026-07-03 sharing pass: fixed P0 save contract — backend DTO/schema moved from legacy element array to Excalidraw scenes; visibility model private/project/public with per-member viewer/editor shares enforced object-level in `WhiteboardsService`; share dialog with public-link restrictions — view/edit link access, expiry presets, allow-export toggle, copy + reset link; autosave via `getSceneVersion` + 2s debounce with flush-on-unmount; writes re-keyed `projects:write` → catalog key `projects:whiteboards:manage`; migrations `0137_whiteboard_sharing.sql` + `0138_whiteboard_scene_backfill.sql` pending TTY apply + `backfill:rbac`; see `PRD-whiteboard.md`)
- [x] `/board/[shareToken]` — Public shared whiteboard (unauthenticated, `(public)` group; generic-404 token endpoints `public/whiteboard-links/:token` rate-limited 60 view / 30 edit per min per IP; view-only or editable per link access; export UI hidden when disallowed)
- [~] `/projects/whiteboards` — **DELETED 2026-07-14** (orphan hub; per-project whiteboard kept at `/projects/[projectId]/whiteboard`)

**Whiteboard UX wave (2026-07-03):** single-line header — PageWrapper gained an additive `leading` prop (renders in the backHref slot); whiteboard page title = selected board name, boards-panel collapse toggle replaces the back arrow, all actions (save status, Save, Fullscreen, `⋯` menu with Share/Hide boards/Open public link, New Board) on one row; autosave hook made board-switch-safe (pending scenes carry their boardId, flushed on switch) so it lives at page level; `ExcalidrawCanvas` now presentational (fullscreen overlay keeps its own slim bar, Esc-exit + scroll lock). Collapsible boards panel + fullscreen mode + trimmed Excalidraw MainMenu (external links removed; ClearCanvas/ToggleTheme/Background/SaveAsImage only). tldraw-style reskin via scoped `whiteboard-theme.css` (`.wb-canvas`, verified against Excalidraw 0.18 dist vars: white islands, 12px radius, soft `--shadow-island`, violet-600 active-tool pill, slate hovers; dark mode untouched except shadows). Project sidebar: header collapse icon (both states) + persisted collapse. RBAC: uncataloged `projects:write` fully retired — milestones/intake/views/pages writes now `projects:workspace:manage` (catalog + 6 role templates + frontend PermissionKey; backfilled live: 248 grants, versions bumped). Backend PRD closure: 2MB Zod scene cap + 3mb JSON body limit (`useBodyParser`, rawBody preserved). PM migrations 0008/0009 applied live (fixed 42703 `project_statuses.type` crash).

- [x] `/projects/templates` — Templates: PmPageShell glass cards + stagger, TEXT overflow, getErrorMessage, glass empty/error (2026-07-14 Linear polish)
- [~] `/projects/resource-allocation` — **DELETED 2026-07-14** (orphan surface; hook/types/feature card removed)
- [x] `/projects/command-center` — Command Center: eyebrow on all states, StatCardGrid + PageSection pattern (reference-aligned); **2026-07-13 quick-nav 404 fix** — pinned links repointed to real workspace routes (my-work/all-work/approvals/roadmap/portfolios), workspace-level "Create Sprint" removed (project-scoped), project-card "New Task" now opens the board create dialog via `?create=1` (wired through `CreateTicketDialog` `externalOpen`)
- [x] `/projects/my-work` — My Work: PmPageShell + glass StatCards, denser tabs, due-bucket PmPanels, WorkItemRow TEXT_ONE_LINE/PM_ROW (Linear-grade polish 2026-07-14)
- [x] `/projects/all-work` — All Work: PmPageShell + PM_TOOLBAR filters, theme-token Me scope, glass list/board/table sections, overflow-safe titles, polished empty/error/loading + pagination chrome (Linear-grade polish 2026-07-14)
- [x] `/projects/settings/integrations` — Git connections + AI Agent Access (MCP tokens); glass PmPageShell chrome (2026-07-14); backed by `/agent-tokens` + `/agent/v1/*` + `mcp-server.mjs`
- [x] `/projects/portfolio` — Portfolio health view: eyebrow, subtitle, StatCardGrid, filters in PageWrapper, rounded-xl table shell
- [x] `/projects/[projectId]/releases` — Releases: PmPageShell + glass table panel, overflow-safe names, animated create/delete, getErrorMessage; create/edit Sheet w/ TipTap notes + status badges (Linear-grade polish 2026-07-14)
- [x] `/projects/[projectId]/workload` — Workload (dedicated route exposing existing `WorkloadView`; was only a hidden view-switcher tab)
- [x] `/projects/[projectId]/qa` — QA / Test Management: PmPageShell + glass tab toolbar/panel, overflow-safe titles, animated Plus/ellipsis, getErrorMessage; cases/runs sheets intact (Linear-grade polish 2026-07-14)
- [x] `/projects/[projectId]/qa/runs/[runId]` — Test Run execution: glass result rows + Complete-run LoadingButton; per-result status + notes + QA-failed→bug
- [x] `/projects/[projectId]/bugs` — Bugs: PmPageShell + PM_TOOLBAR filters + glass DataTable panel, animated report/actions, assignee names not IDs (Linear-grade polish 2026-07-14)

**Feedbucket AI triage (2026-07-13, `/projects/[projectId]/feedbucket/[submissionId]`):** vision-model feedback→ticket. New backend `FeedbucketAiService` (`modules/feedbucket/`) + `LlmService.invokeStructuredWithImage` (multimodal gpt-4o, image_url content blocks) + `AiCreditsService.refundCredits`. Two endpoints: `POST .../ai-analyze` (`feedbucket:submissions:ai`) reads the screenshot + text + metadata/console logs and returns a structured `FeedbackAnalysis` (type/confidence/suggestedTicketType/title/summary/HTML description/reproductionSteps/suggestions/acceptanceCriteria/priority); `POST .../ai-create-ticket` (`feedbucket:submissions:manage`) creates a properly-typed ticket — **feature→EPIC** w/ acceptance criteria, **bug→BUG** w/ reproduction + environment + suggestions. Security: prompt-injection hardening (feedback = untrusted data), SSRF-safe screenshot fetch (own-storage host allowlist → base64), server-side HTML sanitize, credits reserved-before-call + refunded on provider failure, rate-limited (20/60s), plan-gated (`ai.feedbucket`, PROFESSIONAL), **public widget never triggers AI** (denial-of-wallet), BOLA + tenant re-assert. Analysis cached on the row (idempotent, no re-charge). Frontend `FeedbucketAiPanel` in submission detail (analyze/re-analyze/create-ticket, `useCan`-gated, DOMPurify-rendered description). Migration `0268_feedbucket_ai_columns.sql` (5 nullable AI cols) **HAND-WRITTEN, NOT applied** (sibling session holds DB lock). FE+BE `tsc` clean; 19 BE unit tests green.

**PM module completion pass (2026-07-02, PRD §16/§17 phases A–E):** backend — chat `metadata.entities` persisted; comment lookup + edit/delete endpoints; stable error codes (`PROJECTS_FORBIDDEN_TICKET/PROJECT`, `PROJECTS_TICKET_CONFLICT` 409, `PROJECTS_INVALID_TICKET_STATUS`); access-denied audit events; transactional `createFromDeal`; chat status action hardened (activity + audit + system message); ticket search returns recent tickets on empty query; calendar feed emits project-ticket due dates + `linkedTicket` enrichment; statuses settings re-pointed to `project_statuses` (board columns now follow settings). Frontend — `PROJ-123` identity everywhere; comment edit/delete UI + permalink deep-links; saved views apply + save-from-board; chat ticket/comment pills, internal permalink unfurls, offline-queue metadata; calendar link/unlink + create-ticket-from-calendar; TipTap rich-text ticket descriptions (living rule §8); `mutationKey`/`staleTime` sweep; ink-first UI polish across all PM pages + chat/calendar surfaces (violet/indigo brand chrome removed per UI-UX-SYSTEM). Adversarial review pass (7 finder angles + verifiers) fixed 9 confirmed bugs: realtime messages dropped sender/metadata (pills only appeared after reload); TipTap phantom empty-description PATCH on open + legacy plain-text newline normalization; statuses `type` silently dropped (new column + migration 0009); reorder bypassed status validation; self-inflicted 409 from stale `expectedUpdatedAt` (server now returns `updatedAt`, dialog tracks it call-time); layout rendered "no access" for 5xx/network errors (now rethrows to boundary); chat invalid-status threw an unmapped code; `null-123` in comment previews; burnup/velocity/CFD always showed 0 completed (pre-existing `stateId` gap — canonical-status fallback added). Consolidations: one `formatTicketKey`, one status-color source, shared `ticket-status.util.ts`, per-comment pending state. Migrations `0008_activity_comment_actions.sql` + `0009_project_statuses_type.sql` APPLIED 2026-07-03 (headless SQL run; fixed live 42703 `project_statuses.type` crash on project detail). Open: custom-field columns in table/list views; shared-views RBAC model; `removeMember`/"Hide Done" hardcode canonical terminal statuses (proper fix needs an `isTerminal` column on `project_statuses`).

**PM foundation harden + complete (2026-07-05, tasks/project-management ProjectOS spec — slice 1 of the "harden + complete foundation" scope):** Backend RBAC/BOLA closure — **every mutating PM endpoint now carries `@RequirePermission`** with class-level `PermissionGuard` across all controllers in `modules/projects/` (11) + `modules/projects-execution/` (all), reusing the existing catalog (NO new keys → zero conflict with concurrent payroll session; `permissions.constants.ts` untouched). Fixed phantom `projects:read` → `projects:manage` on report snapshot (was hard-blocking all users). Added `@RequireModule("projects")` to the 6 controllers missing it (advisory — module gating isn't guard-enforced repo-wide, matches KB precedent). New endpoints: `GET /projects/my-work` (cross-project assignee tickets, tenant+user scoped), `DELETE .../sprints/:id`, `PATCH`+`DELETE .../epics/:id` (with ownership/tenant checks). Service split: `projects-ticket-subresources.service.ts` 544→367 + new `projects-ticket-comments.service.ts` (224). Frontend — new screens: Command Center, My Work, Releases UI, Workload route (see above) + sidebar/project-sidebar wiring. **Project Creation Wizard** replaces the single dialog: 7-step Sheet (Basics→Type→Template→Toggles→Workflow→Team→Review), Framer Motion step transitions w/ `useReducedMotion`, per-step Zod (input===output, no coerce), template-apply vs direct-create provisioning w/ `Promise.allSettled` member adds; edge cases handled (409 dup key, template deleted mid-flight, no-invite-permission, start>end, partial member failure). Structural — centralized 8 scattered inline types into `types/projects/**` (hooks re-export for back-compat); **deleted dead `components/projects/`** (legacy dup, 0 external importers); split 6 oversized files (roadmap page 1127→66, board 475→345, backlog 422→244, saved-views 367→145, portfolio 365→168, ticket-details-dialog 421→303) into feature subfolders — nothing over 345. NO migrations (feature toggles ride existing `projects.settings` JSONB; project-type/workflow/extra-toggles are UI-only defaults this slice). Known debt (deferred, not regressions): 3 backend services still >500 (`projects.service` 540, `projects-tickets.service` 566, `projects-reports.service` 501 — shared private helpers make a clean split risky); pre-existing >500 frontend files untouched (`activity-feed` 620, `ticket-sidebar` 559, `git-integration-settings` 557, `create-ticket-dialog` 540, `whiteboard/page` 519); persisting project-type/workflow/toggles into `settings` needs a create-DTO extension. Build NOT run (concurrent payroll session mid-edit); verified by cross-agent import reconciliation. Next engine slices queued: QA/Test + first-class Bugs, Client Portal + Change Requests, Approvals engine, AI Project Manager.

**PM engine slice 1 — QA/Test + first-class Bugs (2026-07-05, ProjectOS spec docs 14/15):** New `projects-qa` engine end-to-end. Schema — 5 tables (`test_suites`, `test_cases`, `test_runs`, `test_run_results`, `bugs`) + 7 pgEnums, tenant+project scoped, FK-linked to `tickets`/`sprints`/`project_releases` (case→ticket traceability, result→bug, bug→affected/fixed release), per-project sequences `caseNumber`/`runNumber`/`bugNumber`. Migration `0159_qa_test_bugs.sql` HAND-WRITTEN, **NOT applied** (renumbered off the 0156 collision with sibling timesheets-standalone + inventory migrations; guarded enum DDL + `CREATE TABLE IF NOT EXISTS` in FK-safe order — apply in TTY). RBAC — 7 keys `projects:qa:view/manage/execute` + `projects:bugs:view/create/update/delete` in catalog + ROLE_DEFAULT_PERMISSIONS (engineering/design/etc get qa:view+execute+bugs:view/create/update; qa:manage+bugs:delete via ALL_PERMISSIONS). Backend — `modules/projects-qa/` (4 controllers, 3 services, Zod DTOs; every endpoint `@RequirePermission`-gated + `@RequireModule("projects")`; tenant/BOLA re-asserted on read+write with 404-not-leak; sequences via `pg_advisory_xact_lock` in txn + unique-constraint backstop; `createBugFromResult` prefills a bug from a failed test case and links `result.linkedBugId`; audit events bug.created/status_changed/created_from_result + test_run.completed; registered in app.module.ts). Frontend — `types/projects/qa.ts`+`bugs.ts`, `hooks/api/projects/qa.ts`+`bugs.ts` (20 hooks), query-keys + 7 PermissionKey-union entries, 3 screens (QA test-management w/ steps-builder Sheet, run-execution w/ per-result pass/fail controls + QA-failed→bug, bug tracker board) all 5 states, sidebar `QA / Tests`+`Bugs` gated by useCan. Reconciled end-to-end (hook URLs ↔ routes, types ↔ response shapes, all imports resolve). Build NOT run (sibling sessions mid-edit); zero file overlap with siblings (distinct module/schema/key namespaces). Next: Client Portal + Change Requests → Approvals → AI PM.

**PM engine slice 2 — Client Portal + Change Requests (2026-07-05):** Frontend-only slice (backend in parallel against same contract). Types: `types/projects/change-requests.ts` + `types/projects/client-portal.ts` (exported from barrel). Hooks: `hooks/api/projects/change-requests.ts` (5 hooks, mutationKey tuples, staleTime 60s) + `hooks/api/projects/client-portal.ts` (7 hooks + optimistic visibility toggles). Query keys: `queryKeys.projects.changeRequests.*` + `.clientPortal.*` added to `lib/query-keys.ts`. PermissionKey union: 5 new keys (`projects:portal:view`, `projects:changerequests:view/create/manage`, `projects:clientvisibility:manage`). Sidebar: "Client Portal" → `/projects/portal` added to "Projects & Time" group; project-sidebar adds "Client" section (`FilePen` Change Requests + `Globe` Client Portal) gated by useCan. Screens: (1) `/projects/portal` — client-facing project cards grid; (2) `/projects/portal/[projectId]` — client dashboard (milestones, tasks, files, change requests + submit-CR Sheet with Tiptap description); (3) `/projects/[projectId]/change-requests` — 8-state CR workflow DataTable with Sheet (full field set incl. estimate hrs/budget ₹/timeline days/approval owner/decision comment) + AlertDialog delete, gated useCan; (4) `/projects/[projectId]/client-portal` — visibility management with optimistic Switch toggles per ticket/milestone. All 4 screens: all 5 states (loading skeleton, error+retry, empty w/ illustration, filtered-empty, content). **Backend + schema (same slice):** added `client_visible boolean` (default false) to `tickets`/`ticket_comments`/`ticket_attachments`/`project_milestones` + new `change_requests` table (per-project `crNumber`, 8-state `change_request_status` enum, impact/estimate/budget/timeline). Migration `0161_client_portal_change_requests.sql` HAND-WRITTEN, **NOT applied** (renumbered off the `0160` collision w/ sibling timesheets-standalone). RBAC: 5 keys + new **`CLIENT` role template** (portal + CR-submit only, zero internal PM access) + `CLIENT_USER` role defaults. Backend module `modules/projects-client-portal/` (9 files, 14 endpoints, all `@RequirePermission`+`@RequireModule`): client-facing portal reads enforce **client isolation** — `assertClientProject` checks `orgId=caller.orgId AND clientId=caller.userId`, 404-not-leak, and the overview returns an EXPLICIT allowlist (no budget/description/estimate/assignee/internal-notes; only `clientVisible=true` rows); internal CR CRUD+workflow + audited client-visibility toggles; `crNumber` via `pg_advisory_xact_lock` in txn; audit events change_request.created/status_changed + client_visibility.changed; registered in app.module.ts. Reconciled end-to-end (hook URLs↔routes, types↔shapes; fixed one drift — backend portal project shape now returns `color`+`targetEndDate` to match the FE contract). Follow-up: role-default key is `CLIENT_USER` while the template slug is `CLIENT` — confirm the client-user assignment path grants `projects:portal:view` at `backfill:rbac` time. Build NOT run (sibling sessions mid-edit); zero file overlap with siblings.
- [x] `/projects/portal` — Client Portal: PmPageShell glass cards + stagger, TEXT overflow, full-height empty/error (2026-07-14 Linear polish)
- [x] `/projects/portal/[projectId]` — Client dashboard: PmPanel/PM_ROW sections, dark-mode CR badges, glass empty states (2026-07-14 Linear polish)
- [x] `/projects/[projectId]/change-requests` — Internal CR management: 8-state workflow DataTable, filters, create/edit Sheet (estimate/budget/timeline/approvalOwner/decisionComment), delete AlertDialog; gated `projects:changerequests:view/create/manage`
- [x] `/projects/[projectId]/client-portal` — Client visibility management: Switch toggle per ticket + milestone (optimistic PATCH); info banner; gated `projects:clientvisibility:manage`
- [x] `/projects/approvals` — Approvals inbox: PmPageShell + StatCardGrid + glass table, overflow-safe titles, getErrorMessage (Linear-grade polish 2026-07-14)
- [x] `/projects/[projectId]/approvals` — Project approvals: PM_TOOLBAR filters + glass DataTable, animated Request/ellipsis actions, Decide/Delegate/Escalate/Cancel/Delete

**PM engine slice 3 — Approvals (2026-07-05, ProjectOS spec doc 22):** Generic project-scoped, polymorphic approval engine (distinct from the automation-engine `workflow_approvals`). Schema — `project_approvals` (`entityType`/`entityId` over task/milestone/budget/release/change_request/document/timesheet/client_approval, `approverId`, 7-state `approval_status`, `level`, `dueAt`/`decidedAt`/`decisionComment`) + 2 enums; indexed `(approverId,status)` for the cross-project inbox. Migration `0162_project_approvals.sql` HAND-WRITTEN, **NOT applied** (no collision this time). RBAC — 4 keys `projects:approvals:view/request/decide/manage` in catalog + role defaults + `project_manager` template. Backend `modules/projects-approvals/` (4 files, 7 endpoints, all `@RequirePermission`+`@RequireModule`): approver≠requester (400 pre-DB), decide-authorization BOLA (assigned approver OR `projects:approvals:manage`, else 404-not-leak), 409 on already-decided, cross-project inbox via INNER JOIN + `dueAt ASC NULLS LAST`, audit events approval.requested/decided/delegated/escalated/cancelled, registered in app.module.ts. Frontend — `types/projects/approvals.ts`, `hooks/api/projects/approvals.ts` (7 hooks), query-keys + 4 PermissionKey-union entries, 2 screens (inbox + per-project) + shared decide-dialog/delegate-dialog/request-sheet/status-badge, sidebar "Approvals" in Projects&Time + project-sidebar Tracking. NOTE: the frontend agent died mid-run (process exit); lead completed the missing per-project page + 6 route files + sidebar wiring by hand and removed a dead `useSession` in the inbox. Reconciled end-to-end (hook URLs↔routes, all UI deps + imports resolve). Build NOT run (sibling sessions mid-edit).

- [x] `/projects/[projectId]/ai` — AI Assistant: 6 capability cards (Project Summary, Risk Detection, Draft Client Update, Plan-from-Prompt, Extract Tasks from Notes, Ask a Question) — gated `projects:ai:use` + `useFeature("ai.project-manager")`

**PM engine slice 4 — AI Project Manager (2026-07-06, ProjectOS spec doc 31):** REUSES the existing AI stack (OpenAI gpt-4o-mini via `LlmService.invokeStructured`) — NOT a parallel LLM. NO new tables/migration. Backend extends `modules/ai/`: `projects-ai.controller.ts` (@Controller("ai"), class `@RequirePermission("projects:ai:use")`) + `projects-ai.service.ts` + `prompts/pm.prompts.ts` + `dto/pm.schemas.ts`; 6 POST routes summary/risks/client-update/plan/extract-tasks/ask, each `requireFeature(u.plan,"ai.project-manager")` (402) + `ensureLlm()` (503 if no `OPENAI_API_KEY`). Guardrails: BOLA `assertProject` 404-not-leak; **evidence computed in code from fresh DB** (LLM only narrates, never fabricates counts); **client-update reads ONLY `clientVisible=true` tickets + `isPublic` roadmap** and instructs the LLM to exclude internal data; **suggestions-only** (plan/extract create nothing); audit events `ai.project.*` on every call. RBAC key `projects:ai:use` + plan feature `ai.project-manager` (PROFESSIONAL+) + granted to 7 roles + `project_manager` template. Frontend — `types/projects/ai.ts`, `hooks/api/projects/ai.ts` (6 mutations), 14 files under `features/projects/ai/**` (page + 6 cards + evidence-strip + shared suggested-task-list), route `/projects/[projectId]/ai`, sidebar "AI Assistant" (More, gated), PermissionKey + frontend feature-gate mirror. **Create-tasks-from-suggestions**: `useCreateTicket` per selected item, deduped case-insensitively against open ticket titles from `useTickets`. **Lead fixes post-agent (reconciliation):** the empty-project short-circuit returned `{noData}` which crashed the cards (undefined `.highlights`/`evidence`) — changed to return typed empty shapes; removed the (wrong) short-circuit from plan/extract/ask so they work on brand-new projects; aligned `risks` evidence to the frontend `ProjectAiEvidence` shape. Reconciled end-to-end (hook URLs↔routes↔types). Runtime prereq: valid `OPENAI_API_KEY` in backend `.env` (else 503 + friendly toast, no crash). Build NOT run (sibling sessions mid-edit).

- [x] `/projects/[projectId]/risks` — Risk register: probability×impact **risk-matrix heatmap** (open-risk counts per cell, click-to-filter) + StatCards + status filter + DataTable (`RISK-{n}`, probability/impact/severity badges, owner, status); create/edit Sheet; `projects:risks:view/manage`
- [x] `/projects/[projectId]/decisions` — Decision log: status filter + search + DataTable (`DEC-{n}`, status badge, owner, decided/revisit dates); create/edit Sheet (context/decision/options + dates); `projects:decisions:view/manage`

**PM engine slice 5 — Governance: Risks & Decisions (2026-07-06, ProjectOS spec doc 26):** `project_risks` (probability/impact/status enums, owner, mitigation, per-project `riskNumber`) + `project_decisions` (context/decision/optionsConsidered, status, `decidedAt`/`revisitAt`, `decisionNumber`) + 4 enums. Migration `0163_project_governance.sql` HAND-WRITTEN, **NOT applied** (no collision). RBAC 4 keys `projects:risks:view/manage` + `projects:decisions:view/manage` + role defaults + `project_manager` template. Backend `modules/projects-governance/` (6 files, 10 endpoints, all `@RequirePermission`+`@RequireModule`): per-project sequences via `pg_advisory_xact_lock` in txn, BOLA `loadRisk`/`loadDecision` (id+org+project+not-deleted, 404-not-leak), audit `risk.*`/`decision.*`, registered in app.module.ts. Frontend — `types/projects/governance.ts`, `hooks/api/projects/governance.ts` (10 hooks), `features/projects/governance/**` (risk-severity 3×3 matrix helper + `RiskMatrix` heatmap + both pages + sheets), 2 routes, new "Governance" sidebar section (ShieldAlert/Gavel), PermissionKey + query-keys. Reconciled end-to-end (hook URLs↔routes↔types; `decidedAt`/`revisitAt` are `z.coerce.date()` so the FE date strings persist — no silent-strip). **`nest build` GREEN after fix:** the earlier cleanup pass wrongly de-exported `BurnupPoint`/`VelocitySprint`/`CriticalPathNode`/`MemberCost` (inferred controller-return types → TS4053); restored `export`. The build then found ONLY those 4 errors → all 5 engines' backend compiles clean.

- [x] `/projects/[projectId]/meetings` — Meetings list: PmPageShell + PM_TOOLBAR + glass next-meeting strip/table, `useProjectBoardTickets` for agenda sources, names not raw IDs (Linear-grade polish 2026-07-14)
- [x] `/projects/[projectId]/meetings/[meetingId]` — Meeting detail: glass PmPanels for notes/attendees/action items/standup; Convert-to-Task badge without raw ticket FK

**PM engine slice 6 — Meetings, Standups & Action Items (2026-07-06, ProjectOS spec doc 20):** 4 tables `project_meetings` (type meeting/standup/retro/planning/review, agenda, notes, per-project `meetingNumber`) + `meeting_attendees` (normalized) + `meeting_action_items` (assignee/due/status, `convertedTicketId`) + `meeting_standup_entries` (per-user yesterday/today/blockers) + 3 enums. Migration `0164_project_meetings.sql` HAND-WRITTEN, **NOT applied**. RBAC 2 keys `projects:meetings:view/manage` + role defaults + `project_manager` template. Backend `modules/projects-meetings/` (6 files, 13 endpoints): meetings CRUD + attendees (POST validates the user IS a `project_members` row → 400 else) + standup PUT (self-service, `view` perm, caller's own entry only) + action items CRUD + **convert-to-task** (atomic: creates a ticket via the same `ticketNumber` advisory-lock seq + `createTicket` defaults type=TASK/status=TODO/priority=MEDIUM, sets `convertedTicketId`+status=converted, 409 if already converted); two-level BOLA, audit, app.module registered. Frontend — `types/projects/meetings.ts`, `hooks/api/projects/meetings.ts` (12 hooks), 22 files `features/projects/meetings/**` (list + detail w/ TipTap notes, attendees/action-items/standup sections + badges + sheets), 2 routes, "Meetings" in Planning sidebar, PermissionKey + query-keys. **Lead fixes post-agent (build + reconciliation):** (1) **enum-name collision** — a new `meetingStatusEnum`/`"meeting_status"` clashed with the existing CRM enum in the shared `db/schema/enums.ts` (TS2308 + would silently reuse the wrong uppercase DB type) → renamed to `projectMeetingStatusEnum`/`"project_meeting_status"` in schema+migration+DTO; (2) GET `/:id` returned NESTED `{meeting,...}` but FE `MeetingDetail extends Meeting` is flat → changed backend to `{...meeting, attendees, actionItems, standupEntries}`; (3) list now returns real `attendeeCount`/`actionItemCount` (grouped `count(*)::int` + merge) the FE table displays. Reconciled end-to-end. GOTCHA: the repo has a SHARED `db/schema/enums.ts` with cross-domain enums — new projects enums must not reuse those names.

- [x] `/projects/[projectId]/incidents` (+`/[incidentId]`) — Incidents & SLA: severity/status, SLA response+resolution timers with breach chips, timeline updates, owner
- [x] `/projects/[projectId]/forms` (+`/[formId]`) — Forms builder: 11 field types, dynamic renderer, actions (create_task/bug on submit), submissions + process
- [x] `/projects/portfolios` (+`/[portfolioId]`) — Portfolios: PmPageShell/PmPanel table + PM_TOOLBAR filters, dark-mode status/health badges, glass detail + PM_ROW linked projects, router.push on delete (2026-07-14 Linear polish)
- [x] `/projects/programs` (+`/[programId]`) — HARD-DELETED frontend surface (2026-07-14); portfolios kept
- [x] `/projects/[projectId]/workflow` — Workflow builder: per-status WIP limits + configurable from→to transition rules (requiredFields/allowedRoles/requiresApproval, "Any status")
- [x] `/projects/[projectId]/chat` — Project Chat tab (wires existing entity-channel) + "Convert message → task/bug" action in chat message toolbar

**PM engine slices 7–11 (2026-07-06, ProjectOS docs 27/10/30/08-09/18) — built via pipelined parallel agents (schema→backend→frontend, sequential slices sharing the perm-catalog/barrels/sidebar):**
- **7 Incidents/SLA** (doc 27): `project_incidents`(severity/status enums, SLA timestamps respondedAt/resolvedAt/*DueAt, rootCause/customerComms) + `incident_updates` timeline; migration `0165`; `projects:incidents:view/manage`; `modules/projects-incidents` (respondedAt/resolvedAt auto-set on status change; flat GET-detail); FE SLA-breach helper + timeline + sidebar Quality section.
- **8 Forms-builder** (doc 10): `project_forms`(jsonb fields[]/actions[], isPublic/publicToken) + `form_submissions`(jsonb values, convertedTicketId); migration `0166`; `projects:forms:view/manage`; `modules/projects-forms` (submit executes create_task/create_bug actions inline → ticket + convertedTicketId); FE dynamic field-editor + 11-type renderer + submissions.
- **9 Portfolio/Program** (doc 30): workspace-level `project_portfolios`+`project_programs`(+health enum) + M2M `portfolio_projects`/`program_projects`; migration `0167`; 4 keys; `modules/projects-portfolios` mounted `@Controller("projects")` registered BEFORE ProjectsModule (static routes beat `:projectId`); FE top-level routes + nav-group entries.
- **10 Workflow-transition engine** (docs 08/09): `workflow_transitions`(from/to status FK, requiredFields/allowedRoles/requiresApproval) + `wip_limit` col on `project_statuses`; migration `0168`; `projects:workflow:view/manage`; `modules/projects-workflow` (from/to validated ∈ project, global transitions via null fromStatusId, WIP update); FE builder (WIP rows + transitions). **Gantt enhancement** (doc 09, no schema): `gantt-view.tsx` + `gantt/` overlays — SVG dependency arrows + critical-path highlight (reuse `useCriticalPath`) + milestone markers (`useProjectMilestones`); `projectId` became a required GanttView prop (both callers updated). Lead fix: removed agent's `as`-casts (added `wipLimit` to `CustomState`, typed transition `onSubmit`).
- **11 Chat-connected** (doc 18): mature chat infra already existed (ticket pills, `#`-mention, permalink unfurls, chat→ticket-status, entity-channel mechanism). Added (NO migration): backend `POST /chat/actions/create-task-from-message` (creates ticket from a message + posts back a ticket pill; reuses ticket-status membership/systemMessage pattern; inline ticket insert since ProjectsTicketsService isn't exported) + widened chat `entityType` enum to include sprint/release/incident; frontend convert-to-task toolbar action + dialog + project Chat tab (`/projects/[id]/chat` wiring `useEntityChannel`). Documented follow-ups (larger/cross-cutting, NOT built): work→chat auto-posting (needs a `send_chat_message` automation action + event wiring), assign/set-due-date-from-chat, AI-PM tools inside the chat assistant.

All slices 7–11: build not run (sibling sessions mid-edit) — verified by cross-agent import reconciliation; migrations `0165/0166/0167/0168` HAND-WRITTEN, NOT applied.

**PM follow-ups completed (2026-07-06, NO migrations) — the cross-cutting items previously documented as deferred:**
- **AI-PM tools in chat** — added `searchProjects`/`askProjectAI`/`getProjectSummary` tools to `ChatAssistantService.processChat()` (reuse `ProjectsAiService`, same AiModule so DI is trivial) → "what's blocked?"/"summarize project" answerable in chat.
- **Chat→work actions** — `POST /chat/actions/assign-ticket` (`projects:tickets:assign`) + `/set-due-date` (`projects:tickets:update`) mirroring the ticket-status membership+pill pattern; frontend toolbar actions + `assign-ticket-dialog`/`set-due-date-dialog` (prefill ticket/project from the message's linked-ticket entity via a type-predicate, no cast).
- **Work→chat** — approval-requested posts a system message to the project's entity chat channel; FAIL-SAFE fire-and-forget (`void notifyProjectChannel(...).catch(()=>undefined)`, outside the txn) so approval creation can't break; cycle-checked; `ChatModule` now exports `ChatChannelsService`/`ChatMessagesService`, imported by `ProjectsApprovalsModule`.
- **Board transition enforcement** — `assertTransitionAllowed` in `projects-tickets.service` `updateTicket`+`reorder`; FAIL-OPEN (allows when no `workflow_transitions` configured / unmappable status / any query error; throws 400 only on a clean "transitions exist + this from→to matches none"). `validateTicketStatus` untouched. (Service now 611 lines — known debt.)
- **Wizard persistence** — `projects.settings` `$type` widened (+`projectType`/`workflow`/`features?`, no migration); `createProjectSchema` + `createProject` merge them additively; wizard now sends them (were UI-only). Additive — a create without them behaves exactly as before.
All reconciled (hook URLs↔routes, chat signatures, PermissionKeys). Build not run (siblings mid-edit).

---

## Sales
- [x] `/sales` — Sales overview
- [x] `/sales/person/[personSlug]` — Sales person profile
- [x] `/sales/quotas` — Quotas
- [x] `/sales/commissions` — Commissions
- [x] `/sales/forecast-report` — Forecast report
- [x] `/sales/cohort-analysis` — Cohort analysis
- [x] `/sales/rep-comparison` — Rep comparison
- [x] `/sales/meeting-prep` — Meeting prep
- [x] `/sales/playbook` — Playbook
- [x] `/sales/task-sequences` — Task sequences
- [x] `/sales/report-narrator` — Report narrator

---

## Customer Executive
- [x] `/customer-executive` — Overview
- [x] `/customer-executive/account-summary` — Account summary
- [x] `/customer-executive/client-onboarding` — Client onboarding
- [x] `/customer-executive/renewals` — Renewals
- [x] `/customer-executive/upsell` — Upsell
- [x] `/customer-executive/sla` — SLA
- [x] `/customer-executive/surveys` — Surveys
- [x] `/customer-executive/sentiment` — Sentiment
- [x] `/customer-executive/health` — CS Health Score engine (see Non-HR Features section)
- [x] `/customer-executive/nps` — NPS closed-loop (see Non-HR Features section)

---

~~## Marketing~~ — **REMOVED**: All `/marketing/*` pages, API routes, schema, hooks, sidebar nav, billing gates, and AI features deleted end-to-end.

~~## Digital Marketing~~ — **REMOVED**: All `/digital-marketing/*` pages, API routes, DM leads/campaigns schema, hooks, and sidebar nav deleted end-to-end.

---

## Inventory
> 2026-07-12 — full-module overhaul via 14 parallel agents: NAV (all 19 unreachable routes now in sidebar tree; operations hub packing/shipping links fixed; zero 404 hrefs verified), P0 contract fixes (SO create sent productId/customerId/number-prices vs backend productVariantId/clientId/string-prices — fixed end-to-end; PO+SO broken /edit links → DRAFT edit sheets; adjustment raw-ID inputs → variant+location selectors), NEW: reports/slow-moving + reports/expiry pages, Export-jobs UI (Import & Export tabs), webhooks management in settings, holds detail sheet + GET holds/:holdId, ai.ts/webhooks.ts hooks. BACKEND: 17 controllers got missing ModuleGuard, {items,total,page,totalPages} pagination on stock-summary/reorder/movements/suggestions (+cache), GRN/shipSo/returns N+1s batched + wrapped in transactions (idempotency-replay-safe narrowed ConflictException catch), reservation consumption moved into ReservationService.consumeReservationsBatch (engine encapsulation restored), channels bulk upserts, migration 0253 applied + verified live (composite stock indexes + 6 pg_trgm search indexes; journal untouched — sibling owns it). UI: 13 raw tables → DataTable, server pagination on SO/vendors/reports/suggestions lists, 8 sheets fixed to 3-zone, LoadingButton + animated-icon sweep, 60/60 routes have loading.tsx, violet fully purged, 4 oversized files split ≤500. Inventory jest 181/181 green; full build deferred (sibling sessions in flight — backend needs nest build + restart to serve changes).
> 2026-07-03 — full UI/UX conformance pass (all 24 pages): PageWrapper + URL-synced filters everywhere, DataTable/condensed table density, StatCard adoption, semantic badges, skeleton/empty/error states with themed illustrations, sheet 3-zone anatomy, gradients/violet removed, mutationKeys + calibrated staleTimes, dashboard client moved to `features/inventory` and de-cast (2 redundant queries dropped), dead assets deleted. tsc green.
- [x] `/inventory` — Inventory overview
- [x] `/inventory/products` — Products list
- [x] `/inventory/products/new` — New product (2026-07-08: SKU format enforcement + char limits, inline category/UOM create dialogs, UOM dependency, reorder gating, pb-24 widget clearance, status field fix)
- [x] `/inventory/products/[productId]` — Product detail (2026-07-08: edit form expanded with productType/trackingMethod/costingMethod/standardCost/purchaseUomId/salesUomId/reorderEnabled + inline create selects)
- [x] `/inventory/products/categories` — Product categories
- [x] `/inventory/products/uom` — Units of measure
- [x] `/inventory/stock` — Stock levels
- [x] `/inventory/stock/adjustments` — Stock adjustments
- [x] `/inventory/stock/movements` — Stock movements
- [x] `/inventory/stock/transfers` — Stock transfers
- [x] `/inventory/stock/transfers/[transferId]` — Transfer detail
- [x] `/inventory/warehouses` — Warehouses
- [x] `/inventory/warehouses/[warehouseId]` — Warehouse detail
- [x] `/inventory/vendors` — Inventory vendors
- [x] `/inventory/vendors/[vendorId]` — Vendor detail
- [x] `/inventory/purchase-orders` — Purchase orders
- [x] `/inventory/purchase-orders/new` — New purchase order
- [x] `/inventory/purchase-orders/[poId]` — Purchase order detail
- [x] `/inventory/sales-orders` — Sales orders
- [x] `/inventory/sales-orders/new` — New sales order
- [x] `/inventory/sales-orders/[soId]` — Sales order detail
- [x] `/inventory/reports/stock-summary` — Stock summary report
- [x] `/inventory/reports/movements` — Movements report
- [x] `/inventory/reports/reorder` — Reorder report

> 2026-07-05 — full Inventory module expansion per `tasks/inventory` 25-doc PRD: backend stock engine (idempotency, row locking, valuation layers, reservations, number sequences, audit events; migrations 0156–0158 applied live), 20 backend modules (186 tests green), 43-key RBAC catalog (`:view`→`:read` fix end-to-end), 34 new frontend pages below, hooks split ≤300 lines, barrel completed, lint clean (0 warnings).
- [x] `/inventory/operations` — Operations hub
- [x] `/inventory/operations/receipts` — Goods receipts (GRN list + reverse)
- [x] `/inventory/operations/issues` — Outbound issues ledger
- [x] `/inventory/operations/picking` — Pick queue
- [x] `/inventory/operations/packing` — Pack queue
- [x] `/inventory/operations/shipping` — Ship queue
- [x] `/inventory/operations/returns` — Vendor + customer returns
- [x] `/inventory/cycle-counts` — Cycle counts
- [x] `/inventory/cycle-counts/[countId]` — Cycle count detail (lifecycle + variance post)
- [x] `/inventory/physical-audits` — Physical audits
- [x] `/inventory/physical-audits/[auditId]` — Physical audit detail
- [x] `/inventory/lots` — Lots/batches
- [x] `/inventory/lots/[lotId]` — Lot detail + traceability chain
- [x] `/inventory/serials` — Serial numbers
- [x] `/inventory/serials/[serialId]` — Serial detail + traceability
- [x] `/inventory/expiry` — Expiry alerts
- [x] `/inventory/replenishment` — Reorder suggestions + generate PO
- [x] `/inventory/replenishment/rules` — Reorder rules CRUD
- [x] `/inventory/forecasting` — Demand forecasting (SMA)
- [x] `/inventory/valuation` — Stock valuation + layers
- [x] `/inventory/costing` — Costing methods governance
- [x] `/inventory/barcode` — Barcode scan + lookup
- [x] `/inventory/import` — CSV import wizard
- [x] `/inventory/settings` — Inventory settings + sequences + health
- [x] `/inventory/quality` — Quality hub
- [x] `/inventory/quality/inspections` — Inspections (pass/fail/dispose)
- [x] `/inventory/quality/holds` — Quality holds
- [x] `/inventory/quality/recalls` — Recalls (OPEN→IN_PROGRESS→CLOSED)
- [x] `/inventory/packages` — Packages
- [x] `/inventory/shipments` — Shipments
- [x] `/inventory/loads` — Loads/containers
- [x] `/inventory/carriers` — Carriers
- [x] `/inventory/channels` — Sales channels + stock publications
- [x] `/inventory/3pl` — 3PL connections

---

## Organization
- [x] `/organization` — Organization overview
- [x] `/organization/departments` — Departments
- [x] `/organization/teams` — Teams
- [x] `/organization/locations` — Locations
- [x] `/organization/branches` — Branches
- [x] `/organization/business-units` — Business units
- [x] `/organization/cost-centers` — Cost centers

---

## Support
- [x] `/support` — Support overview
- [x] `/support/inbox` — Support inbox; `DashboardGate permission="dashboard:support:view"`
- [x] `/support/settings/sla` — SLA Policies CRUD (mirrors `/crm/settings/sla`); subject `support:settings:manage`.
- [x] `/support/settings/business-hours` — Business-hours calendars: timezone, weekly schedule grid, holidays, 24x7/default toggles; Sheet form (multi-section); subject `support:settings:manage`.
- [x] `/support/settings/channels` — Support channels (email/chat/whatsapp/sms) CRUD, inline active toggle; subject `support:channels:manage`.
- [x] `/support/portal` + `/support/portal/[portalTicketId]` — Customer-facing ticket portal (reuses `CLIENT_USER` auth, no new auth system): own-tickets-only list/create/detail/reply, no internal-note visibility; subject `support:portal:tickets:*`.
- [x] `/support/reports` (tabs: overview / agent-performance / queue-performance / channel-performance / automation-performance / csat) — Reporting dashboards: FRT/resolution time/SLA compliance/reopen rate/breakdowns, date-range + agent/queue/channel filters, recharts; subject `support:reports:view`.
- [x] `/ticket-feedback/[token]` — Public CSAT survey (no auth; top-level path chosen to avoid the `/support` middleware-prefix collision and to stay distinct from the pre-existing generic `/csat` survey-campaign backend module).
- [x] `/support/macros` — extended with `visibility` (org/team/private), `actions` (set status/priority/tag/internal-note on apply), usage counts, and a compose-time preview; "Use macro" wired into the inbox reply composer.
- [x] `/support/settings/automations` — extended `AutomationTrigger`/`AutomationActionType` (shared `hooks/api/automations.ts` + `automation-meta.ts`/`automation-builder-sheet.tsx`) with `ticket.priority_changed`/`ticket.message_received` triggers and `support_assign_ticket`/`support_set_priority`/`support_add_tag`/`support_internal_note` actions.
- [x] Ticket detail — AI suggestions panel (`ticket-ai-panel.tsx`): summary/sentiment/category/priority/spam analysis, suggested reply/macro (insert-to-composer via a `SUPPORT_INSERT_REPLY_DRAFT_EVENT` window event), KB-article suggestions, duplicate-ticket detection — every suggestion requires explicit agent accept/reject, never auto-applied. Ticket risk badge (SLA due-soon/breached/paused) added to the detail header.

---

## Reports
- [x] ~~`/reports`~~ — REDIRECT 2026-07-05 → `/crm/reports` (global stub page deleted; reports are module-owned: CRM `/crm/reports`, Payroll `/payroll/reports`, Timesheets `/timesheets/reports`, Inventory `/inventory/reports/*`, HR `/hr/analytics`, Recruitment `/hr/recruitment/reports`, Projects `/projects/[projectId]/reports`; Analytics product removed from shell)

---

## Chat & Communication
- [x] `/chat` — Chat
- [x] `/calendar` — Calendar: month/week/day views, responsive toolbar (stacked mobile, icon-only Export/Add on xs, compact date labels), adaptive month grid height + mobile/tablet cell typography via calendar-container CSS; icons migrated to @animateicons/react/lucide (Ticket/Video/Calendar/Tag/Pencil/HelpCircle lucide fallbacks only); Composio external accounts (2026-07-05): connect multiple Google Calendar/Outlook accounts via accounts sheet (connect/disconnect/set-primary, per-account visibility toggles + colors), merged all-accounts grid view (60s Redis-cached backend fetch, external events read-only with detail sheet + join-meeting link), event create sync-to-account select + Meet/Teams conference toggle, finalize-on-return with StrictMode guard; backend `integrations` module (`user_integration_connections`, RBAC `integrations:connections:view/manage`, no ModuleGuard by design — platform-level plumbing); migration PENDING (db:generate held); live-connect fixes (2026-07-07): finalize ownership now via Composio `list({userIds})` membership + ACTIVE check (SDK `wordId` is an account slug, not the owner), tool execution pins the latest toolkit version (SDK rejects "latest"), finalize redirect accepts both `connected_account_id`/`connectedAccountId` — verified live: finalize/list/external-events all 200; Meet/Teams meeting creation (2026-07-07): Google Meet link verified LIVE end-to-end (create+push+delete on real account); Outlook create/list args fixed to pinned-toolkit schema (`start_datetime`/`end_datetime`+`time_zone`, `attendees_info`) — Teams path schema-verified, awaits a connected Outlook account; Outlook update/delete-event tools don't exist in Composio's catalog (no-op stands); New Event dialog upgrades (2026-07-07): (a) attendee picker rebuilt as a shadcn Popover+Command combobox that SERVER-searches `GET /org/members?search=&limit=` (org-scoped ILIKE on name/first/last/email, debounced 300ms via `useCalendarMemberSearch`, selected shown as removable chips) — replaces the static full-member list; backend `listMembers` gained optional org-scoped `search`/`limit` (cap 100), no-arg call unchanged for other consumers; (b) manual "Meeting link" URL field (Video icon) so a Meet/Teams/Zoom link can be pasted without a synced account — persists to the new normalized `calendar_events.meeting_url` column (DDL applied live, unjournaled), returned in list/get, rendered as a "Join meeting" button in the detail sheet; auto-sync now stores the generated link in `meeting_url` (prefers user-provided) instead of overloading `location`. Verified live: search (org-isolated), manual-url create/list/invalid-400. Round-2 fixes (2026-07-07): **(1) CRITICAL 404** — `CalendarController` had a bogus `@RequireModule("calendar")`+ModuleGuard (calendar is core, not an entitlement) → every non-owner got 404 MODULE_DISABLED on all calendar APIs; removed the module gate (kept JwtAuthGuard+PermissionGuard). **(2)** manual meeting-URL paste field REMOVED (user wants Composio-only); `meeting_url` column stays, populated only by Composio auto-gen. **(3)** attendee picker "can't select" was Popover+cmdk nested in a vaul Drawer → extracted reusable inline `components/members/member-multi-select.tsx` (plain-button rows + controlled search, no Popover) used by the calendar picker. **(4)** sync-account select showed "googlecalendar" ×2 → `ComposioGateway.getAccountEmail` (GOOGLECALENDAR_GET_CALENDAR → calendar_data.id) populates real email on finalize; finalize now DEDUPES same-email dupes (+ backfilled existing rows). **(5)** selected attendees now get a real invite email (`CalendarService`+`EmailService`, `templates/calendar.ts`, fire-and-forget, verified status=SENT). **(6)** dialog error toast now uses `getErrorMessage(error)`. **(7)** "Connect an account" in the dialog is now an actionable Connect Google/Outlook control (`calendar-connect-inline.tsx`). Both builds green; integrations 9/9 tests pass
- [x] `/notifications` — Notifications: PRD-aligned sections (ALL/UNREAD/MENTIONS/ASSIGNED_TO_ME/APPROVALS/BROADCASTS/ARCHIVED/SYSTEM), search bar with 300ms debounce, bulk actions (mark-read/archive/delete), section/category/priority filters via desktop Select row + mobile single DropdownMenu (Radix viewport max-height), inline approve/reject for APPROVALS section, compact divide-y list; `/notifications/preferences` — channel toggles + quiet hours + timezone + digest mode; `/notifications/templates` — CRUD with preview dialog; `/notifications/broadcasts` — create/publish/cancel/delete with status tabs; `/notifications/analytics` — metrics + per-category/priority bar charts; `/notifications/queue` — active + failed tabs with retry; `/notifications/audit` — audit log; GlobalHeader added (logo+workspace switcher+product switcher+search+AI/calendar/chat links+bell+quick-create+avatar); approve/reject hooks added; notification bell with popover

---

## AI
- [x] `/ai` — AI assistant

---

## Settings
- [x] `/settings` — Account settings (profile + security only); notification prefs removed 2026-07-13 — use `/notifications/preferences` (deleted `settings-preferences.tsx` + legacy HR notification hooks)
- [x] `/settings/organization` — Organization settings
- [x] `/settings/members` — Members management
- [x] `/settings/roles` — Roles list
- [x] `/settings/roles/[roleId]` — Role editor: per-role permission matrix + member list via `useRole`/`useRoleMembers`, gated `settings:rbac:manage`, back button to `/settings/roles`
- [x] `/settings/roles/simulate` — Permission Simulator — employee combobox, simulates effective permissions via GET /roles/simulate/:targetUserId, grouped by module with expandable rows, scope badges
- [x] `/settings/modules` — Org module management: enable/disable feature modules via `useOrgModules`/`useToggleOrgModule`, responsive grid with Switch per module, gated `settings:manage`; Feedbucket removed from catalog 2026-07-13 (lives under PM `/projects/[projectId]/feedbucket`)
- [x] `/settings/permissions` — Permission Matrix — replaced `DashboardGate allowedRoles` with `permission="settings:rbac:manage"`, added `GET /roles/permissions/matrix` backend endpoint, `useRolePermissionsMatrix()` hook, page now renders live role/permission data with loading skeleton, error state, and empty state
- [x] `/settings/branches` — Branches (E2E fix: empty state fills content height with in-card primary CTA)
- [x] `/settings/notifications` — Redirects to `/notifications/preferences`
- [x] `/settings/audit-log` — Audit log
- [x] `/settings/webhooks` — Webhooks (E2E fix: empty state fills content height with in-card primary CTA)
- [x] `/settings/email-templates` — Email templates
- [x] `/settings/custom-fields` — Custom fields (E2E fix: empty state fills content height with in-card primary CTA)
- [x] `/settings/feature-flags` — Feature flags; `DashboardGate permission="settings:manage"`
- [x] ~~`/settings/automations`~~ — REDIRECT 2026-07-05 → `/hr/settings/automations` (module-owned)
- [x] ~~`/settings/integrations/recruitment`~~ — REDIRECT 2026-07-05 → `/hr/settings/integrations`
- [x] ~~`/settings/integrations/git`~~ — REDIRECT 2026-07-05 → `/projects/settings/integrations`
- [x] ~~`/settings/integrations/calendar`~~ — REMOVED 2026-07-05: superseded by the in-calendar accounts sheet on `/calendar` (Composio-managed connections)
- [x] ~~`/settings/data-hub`~~ — DELETED 2026-07-05: module-owned import/export moved to `/crm/settings/import-export`, `/hr/settings/import-export`, `/payroll/settings/import-export`
- [x] ~~`/settings/ai`~~ — REDIRECT 2026-07-05 → `/crm/settings/ai`
- [x] `/projects/settings/integrations` — Integrations: PmPageShell glass connection cards + setup panel, agent tokens glass section, getErrorMessage (2026-07-14 Linear polish)
- [x] `/support/settings/automations` — Support ticket automation rules
- [x] `/accounting/settings/automations` — Finance automation rules
- [x] `/settings/api-tokens` — API tokens
- [x] `/settings/devices` — Trusted devices; browser/OS parsed via shared `parse-user-agent` (2026-07-13) — API clients show labels like Axios 1.18.1, not raw UA
- [x] `/settings/login-history` — Login history; browser/OS columns from API-enriched DTOs (2026-07-13)
- [x] `/settings/security` — Security settings
- [x] `/settings/sessions` — Active sessions; browser/OS from API-enriched DTOs (2026-07-13)
- [x] `/settings/subscription` — **Redirects to `/billing?tab=plan`** (2026-07-16); plan management consolidated into Billing & Plan

---

## New Non-HR Feature Pages (added — full vertical: schema → migration → service → API → TanStack hooks → UI)
- [x] `/projects/[projectId]/reports` — Agile Reporting: velocity, burnup, cumulative-flow (CFD) + on-demand daily snapshots (`project_daily_snapshots`); recharts; per-section loading/empty/error states.
- [x] `/projects/goal` — Goals & OKRs: PmPageShell glass stats/cards + PM_TOOLBAR filters, TEXT overflow, RequireModule (`/goals` redirects here) (2026-07-14 Linear polish)
- [x] `/projects/goal/[goalId]` — Goal detail: PmPanel sections, LoadingButton check-in/link, backHref, getErrorMessage (`/goals/[goalId]` redirects) (2026-07-14 Linear polish)
- [x] `/support/kb` — Knowledge Base manager: categories + articles, status/visibility filters, search (`kb_categories`/`kb_articles`/`kb_article_feedback`; subject `support:kb`).
- [x] `/support/kb/[articleId]` — KB article editor (title/category/excerpt/visibility/status/tags/content) + feedback summary.
> 2026-07-03 — refactored: monolithic pages (843/1041 lines) decomposed into `features/kb/components/*` (manager-content, article-editor + card/dialog/panels); PageWrapper filters w/ URL sync, StatCardGrid, themed empty-state illustrations, AlertDialog confirms, mutationKeys on all 16 KB mutations; `/support/kb` stays canonical (`?create=1` quick-create supported). Open item: editor is a Textarea — TipTap migration needs backend HTML contract.
- [x] `/help/[orgId]` & `/help/[orgId]/[slug]` — Public help center (no auth): browse/search published-public articles, helpful/not-helpful feedback.
- [x] `/projects/roadmap` — Roadmap: PmPageShell glass kanban columns + PM_TOOLBAR tabs/search, stagger cards, getErrorMessage (2026-07-14 Linear polish)
- [x] `/roadmap/[orgId]` — Public roadmap board (no auth): upvote (localStorage voterKey), submit feedback, changelog feed.
- [x] `/customer-executive/health` — CS Health Score engine: configurable weights/thresholds (Sheet), recompute-now, per-account scores + breakdown (`health_score_config`/`client_health_scores`; reuses `crm:clients`).
- [x] ~~`/settings/automations`~~ — REDIRECT 2026-07-05 → module settings (`/hr/settings/automations`, `/support/settings/automations`, `/accounting/settings/automations`, `/crm/settings/automations`)
- [x] `/customer-executive/nps` — NPS closed-loop: surveys w/ public token, overall NPS + promoter/passive/detractor split, per-survey responses, activate/close (`nps_surveys`/`nps_responses`; reuses `crm:clients`).
- [x] `/nps/[token]` — Public NPS response page (no auth): 0–10 score + comment; server-derived category; only when survey is active.
- [x] `/support/macros` — Canned Responses manager: create/edit/copy macros by category (`support_macros`; subject `support:macros`).
- [x] `/support/routing` — Ticket Routing Rules: ordered condition→assignee/priority rules with enable toggle, applied on ticket creation (`support_routing_rules`; integrated into `POST /api/support`).
- [x] `/accounting/cash-flow` — Cash Flow Statement: operating/investing/financing sections derived from posted GL cash/bank movements; opening/closing/net + reconciliation (no new tables; reuses ledger/journal).
- [x] `/billing/recurring` — Recurring Invoices: list recurring invoices + "Generate due now" (clones via existing `createInvoice` as DRAFT, advances `nextRecurringDate` by `recurringInterval`; no new tables).
- [x] `/support/kb` + `/support/kb/[articleId]` + `/help/[orgId]` — **KB PDF Q&A (RAG)**: pgvector on Neon (`kb_article_chunks`, `vector(1536)` + HNSW cosine index), PDF (`unpdf`) + Word `.docx` (`mammoth`) + text extraction, OpenAI `text-embedding-3-small` embeddings (Gemini `gemini-2.0-flash` answer fallback). New `lib/services/kb-rag.ts` (extract→chunk→embed→index + cosine search + grounded answer w/ citations), `lib/ai/embeddings.ts`. Auto-reindex on attachment upload/delete + article edit; manual "Rebuild AI index" + index-status on editor; bulk "Index all for AI" backfill (`POST /api/support/kb/reindex-all`); per-article chunk cap (400). Endpoints: `POST /api/support/kb/ask` (authed, `support:kb:view`, ai rate-tier), `POST /api/public/kb/ask` (no-auth, published+public only), `…/reindex`, `…/index-status`. Reusable `KbAskPanel` on dashboard KB + public help center. Hooks `lib/api/hooks/support/kb-rag.ts`. DB/vector round-trip verified live; **blocked on a valid OPENAI_API_KEY for live answers** (both keys in `.env` currently 401/unregistered).

---

## Knowledge Base Module (KB PRD — phased rebuild; schema authored in web repo + `sync:schema`, ALL APIs in NestJS backend)
- [x] **Phase 0 — Foundations** — Promoted KB to a first-class top-level `kb` module. Schema (web, synced to backend): new `lib/db/schema/kb/` — `kb_spaces`, `kb_space_members`, `kb_article_restrictions`, `kb_article_versions`, `kb_article_translations`, `kb_tags`/`kb_article_tags`, `kb_events`, `tenant_ai_credits` + `tenant_ai_credit_transactions`; enums `kb_audience`/`kb_space_role`/`kb_translation_status`; extended `kb_articles` (spaceId, ownerId, contentText, seo*, reviewIntervalDays, lastVerifiedAt, archivedAt, `in_review` status) and `kb_categories` (spaceId, parentId). Raw SQL `migrations/0118_kb_foundations.sql` — pgvector, `in_review` enum value, FTS tsvector+GIN on articles & chunks, HNSW on chunk embeddings, default-"General"-space backfill. Entitlement/RBAC (web → JWT claims): `kb` added to `MODULES`+plan tiers; KB feature flags (`kb.public-portal`/`kb.ai`/`kb.multi-space`/`kb.analytics`/`kb.multilingual`); `lib/rbac/permissions/kb.ts` catalog wired into PERMISSIONS + role defaults (employees get `kb:*:view`, support gets full). Backend (`backend/src/modules/kb/`): `KbModule` + `KbCreditsService` (atomic consume/grant + ledger, `InsufficientCreditsException` 402), `KbAccessService` (accessible-space resolution + `assertArticleViewable` with restriction checks), `KbEventsService`; entitlement via existing `@RequireModule("kb")`/`ModuleGuard`, RBAC via `@CheckAbility`. Verified: backend `nest build` clean, `check:schema` in sync, web `tsc` 0 errors + lint clean. (Checkpoints for user: run `db:push`+`0118.sql` on a DB; backend has no eslint config; credit provisioning/UI = later phases.)
- [x] **Phase 1** — Spaces / Collections / Articles CRUD + reader + editor (internal). Backend (`backend/src/modules/kb`, committed feat/kb-module, `nest build` clean): `KbSpacesController` (list/create/get/update/soft-delete + auto admin membership), `KbCategoriesController` (collections, nest depth≤3, cycle-safe move), `KbArticlesController` (paginated permission-scoped list, get w/ access+restriction checks, create+publish+update with version snapshots, unpublish, verify, vote, versions list, restore) — all gated by `@RequireModule("kb")`+`@CheckAbility`. Frontend (committed main, `tsc` 0 + lint clean): `lib/api/hooks/kb/*` (spaces/categories/articles/versions), `types/kb.ts`, `/kb` routed to backend in `api-client`, `app/(authenticated)/knowledge-base/` — P1 home (search + space grid + create-space Sheet), P2 `/spaces/[spaceId]` (collection tree + paginated article list + create-collection Dialog), P3 reader `/spaces/[spaceId]/articles/[articleId]` (TipTap-JSON render via `@tiptap/html`, auto-TOC w/ scroll-spy, verified badge, helpful vote, edit/verify actions), P4 editor `/new` + `/edit` (TipTap, debounced autosave w/ create-then-edit, publish gate, settings Sheet). Sidebar "Knowledge Base" nav + middleware `/knowledge-base` → `kb:articles:view`. Content canonical = TipTap JSON string; `contentText` = plaintext for search.
- [x] **Phase 2** — Granular permissions + public help center. (2a) Backend `KbMembersController` GET/POST/DELETE `/kb/spaces/:spaceId/members` (grant by user or role + spaceRole; exactly-one-target; can't remove last admin); frontend members admin page (`/spaces/[spaceId]/members`) + add-member Dialog (user/role picker) + "Manage access" link on the space. (2b) Backend hardened ALL public KB queries (`public/kb.service` list/get/feedback + public Ask retrieval) to require space.audience ∈ {public,mixed} + status=published + visibility=public (no internal leak). Frontend public help (`/help/[orgId]` + `[slug]`) → SSR server components: TipTap-JSON render via `ArticleContent`, auto-TOC, `generateMetadata` + Article JSON-LD, "Still need help? → /contact" deflection, public helpful vote.
- [x] **Phase 3** — Search + Ask AI. Backend (committed, `nest build` clean): `KbSearchService`/Controller `GET /kb/search` (permission-scoped keyword + optional pgvector RRF over kb_article_chunks when embeddings configured; snippet; `kb_events` search/search_no_results logging); `KbAskService`/Controller `POST /kb/ask` (grounded cited answer reusing `LlmService`+`EmbeddingsService`, retrieval over accessible articles, metered 1 credit via `KbCreditsService.consume`, 402 `INSUFFICIENT_CREDITS`, graceful refusal w/o charge, `ai_answer` events); `AiModule` exports Llm/Embeddings. Frontend (`tsc` 0): hooks `useKbSearch`/`useKbAsk`, P6 `/knowledge-base/search` (results + zero-result Ask-AI CTA), P7 `/knowledge-base/ask` (inline `[n]` citations → article links, top-up prompt on insufficient credits, refusal→ticket).
- [x] **Phase 4** — Analytics + verification. Backend `KbAnalyticsController`: `/kb/analytics/overview` (views, search-success rate, AI answers, helpful ratio, Trust Score = verified÷published, top articles), `/kb/analytics/no-results`, `/kb/verification/queue` (overdue-for-review); view instrumentation `POST /kb/articles/:id/view` (increments views + `kb_events` view). Frontend: P11 analytics dashboard (MetricCards + no-results/top-article tables + date filter), verification queue page (per-row Verify), reader logs a view on mount.
- [x] **Phase 5 (core)** — AI authoring + gap analysis. Backend `KbAuthoringController` `/kb/ai/draft|improve|summarize|translate` (metered 1 credit each, reuse `LlmService`, `kb:ai:generate`). Frontend: in-editor AI toolbar (Draft-from-prompt / Improve / Summarize→excerpt via TipTap key-remount, insufficient-credit handling) + gap analysis page (`/knowledge-base/gaps`, reuses analytics no-results → "Draft article" prefilled via `?title=`).
- [x] **Phase 5 (optional follow-ons)** — article-from-ticket: KbFromTicketService + helpdesk deflection UI; multilingual translations CRUD page; embeddable widget: /public/kb/widget/:orgId/script; Enterprise features: pending.

---

## Onboarding
- [x] `/onboarding` — Employee onboarding wizard. Fixed ID-proof upload (sent `ID` vs DB enum `ID_PROOF`); added server-side Zod validation for doc type/mime/size and personal details; trimmed personal step to standard HR fields (removed experience/skills, added home address + emergency contact); compacted document cards. All access gating moved to middleware (owners/platform admins redirected away; completed users redirected to /dashboard via new `users.onboardingCompletedAt`, set on submit + surfaced in JWT) — no page-level role checks.
- [x] `/org-setup` + auth/invitation flow hardening (2026-07-02) — Multi-org made first-class: new `users.lastActiveOrgId` column; canonical resolution (lastActiveOrgId if valid, else newest membership whose org exists — always innerJoin organizations) in `auth.service.resolveActiveMembership` + `jwt-auth.guard.resolveOrgContext`; JwtAuthGuard falls back to DB when the JWT orgId claim is empty (fixes blanket "Organization not found" 401s after setup); org-setup self-heals orphaned memberships. Wizard trimmed 7→5 steps (unreachable StepInvite/StepComplete deleted, dead `POST /org/invite` hook removed, `setupSchema` trimmed to sent keys). `acceptInvitation` now returns `autoLoginToken` (auto-login after accepting, both new + existing users) and sets `hasDashboardAccess: true` + `lastActiveOrgId`; `switchOrg` persists `lastActiveOrgId`. `POST /users/invite` + resend now actually send the invitation email, block duplicate invites, and no longer leak the raw token. Magic-link verify rate limit 10→60/min (shared server IP). Debug console.logs removed. Migration APPLIED via `src/scripts/apply-auth-flow-migration.ts`.
- [x] OAuth incomplete-onboarding signout loop fixed (2026-07-11) — New Google-OAuth users (no org yet) hit `POST /onboarding/module-recommendations` on the org-setup Modules step, which lacked `@AllowNoOrg` → JwtAuthGuard 401 "Organization not found" → api-client's double-401 handler force-signed them out; the localStorage draft resumed the wizard at that step on every login, re-firing the call → permanent login→signout loop. Fixed: `@AllowNoOrg()` on module-recommendations (pure rule engine, org-independent); JwtAuthGuard's no-org denial changed 401→403 (session IS valid) so any future `@AllowNoOrg` miss degrades to an error toast, never a signout loop (guard spec updated + its stale select-chain mock repaired); `GET/PATCH /org/setup/session` no longer 500s pre-org (`org_id=""` FK violation) — returns an ephemeral client-persisted session until complete/skip creates the org (nullable `org_id` migration noted as follow-up for cross-device pre-org resume). Backend-only; needs `nest build` + restart to go live.
- [x] Verify-email auto-login + oversized session cookie fixed (2026-07-11) — Root cause: NextAuth session JWT carried the user's full RBAC `permissions` array (485 keys ≈ 11.4KB payload) → 16.4KB JWE cookie chunked into 5 cookies → ~16.6KB Cookie header exceeded Node's 16KB limit → HTTP 431 with empty body on auth endpoints → `ClientFetchError: Unexpected end of JSON input` in signIn(), session read-back null, "Email verified! Signing you in…" then bounced to /signin. Fix (frontend): JWT cookie slimmed to identity + auth-flow flags + small middleware-advisory claims only; permissions/enabledModules/plan/branchId/image/hasDashboardAccess resolved LIVE in the session callback via `/auth/session-data/:userId` (React cache()-deduped). Cookie now ~1KB, single cookie. middleware.ts skips the advisory permission gate when the claim is absent (server-side requirePermission stays authoritative). Fix (backend): `authorize()` returns DB-resolved granted keys; `PermissionGuard` hydrates `req.user.permissions` from them, so backendJwt no longer needs a permissions claim (per CLAUDE.md §21). authorize.spec extended (17 tests green). Users with old 5-chunk cookies must clear cookies for the site once (their requests 431 before reaching the app).
- [x] Schema normalization + RBAC single-source wave 3 (2026-07-02) — `roles.permissions` JSONB removed: backfill executed (225 permissions catalog, 23,650 grants), all reads/writes cut to `role_permission_grants` + `ROLE_DEFAULT_PERMISSIONS`; `org_modules` confirmed live (entitlements toggling) and kept. Lifecycle arrays → join tables: `interview_panel_members`, `booking_link_interviewers`, `calibration_participants`, `announcement_targets`, `deal_meeting_attendees` (API wire shapes preserved). `users.skills`/`experienceYears` removed (dual-write killed; `employee_skills` is the source; onboarding/edit forms + PDF updated). Signin page split via `features/auth/` (`MfaStep`, `MagicLinkForm`, `OAuthButtons`, `SignInAlerts`) → 498 lines. Auth e2e specs added: 37 tests (`auth.controller.e2e-spec.ts`, `invitations.e2e-spec.ts`) — guards, Zod, rate limits, error codes, internal-secret gate. All migrations applied to dev DB via `apply-auth-flow-migration.ts` + `apply-normalization-migration.ts`. Verified: backend tsc ✓ build ✓ boot `/health` 200 ✓ frontend tsc ✓ lint ✓.
- [x] Auth platform hardening wave 2 (2026-07-02) — Typed error contract: `{ code, message, details? }` envelope (`AUTH_ACCOUNT_LOCKED` + retryAfterSeconds, `AUTH_MFA_REQUIRED`, `AUTH_TOKEN_INVALID/EXPIRED`, `AUTH_RATE_LIMITED`, …); frontend branches via `lib/parse-auth-error.ts`, zero string matching. One password policy 8–128 + complexity (`lib/password-utils.ts` constants; backend `passwordSchema`). Register anti-enumeration (`{success:true}` always; silent verification resend for unverified existing). New `POST /auth/force-change-password` wired to forced-change UI mode. All tokens hashed at rest (verification + invitation + magic-link); auto-login tokens ≤10min; invite validate/accept rate-limited. Email reliability: DB outbox (`email_outbox`) + cron retries w/ exponential backoff + DEAD status DLQ + error alerts. `getSessionData` now Redis-cached 60s (12 existing invalidation sites finally effective). Invitation lifecycle consolidated from 3 duplicate implementations into one `invitations.service.ts` (11 routes preserved); `auth.service` split (`auth-tokens.service.ts`); `organization/users` services split under the 500-line cap; 10 zombie `/auth/*` endpoints deleted (superseded by `/me/*`, `/hr/sessions`). Double audit logging removed (`userActivity` table dropped; `audit_logs` gained actorUserId/resourceType/resourceId). Schema: 5 FK indexes added; ranked normalization plan produced for 9 remaining JSONB-array violations (interview panels, booking interviewers, calibration participants, roles.permissions dual-source, users.skills dual-write, enabledModules dual-source, announcement targets, deal meeting attendees). Verified: backend tsc ✓ build ✓ boot+/health 200 ✓ frontend tsc ✓ lint 0 errors ✓; dev-DB migration applied.
- [x] Production passwordless login redirect loop fixed (2026-07-18) — Middleware checks the HTTPS `__Secure-authjs.session-token` first in production, retains the unprefixed fallback, and keeps development on the unprefixed cookie; cookie-name selection has regression coverage.
- [x] Feedbucket snapDOM R2 CSP compatibility fixed (2026-07-18) — Both static and nonce-based CSP policies allow HTTPS reads from `*.r2.dev`, so screenshot capture is not blocked by application CSP; bucket CORS remains an infrastructure requirement.

---

## Workspace Setup Wizard (2026-06-29 → 2026-06-30)
- [x] `/setup` — 8-step customer workspace onboarding wizard (Welcome → Goals → Industry → Company Profile → AI Workspace Generation → Module Recommendations → Invite Team → Success). Full implementation end-to-end:
  - **Backend**: `WorkspaceOnboardingModule` with `POST /workspace-onboarding/generate` (idempotent industry-template workspace creation: BU/branch/depts/teams) and `POST /workspace-onboarding/complete` (sets `onboardingCompletedAt`). Both gated `settings:organization:manage`. `updateOrgSettingsSchema` extended with `companySize`, `country`, `enabledModules`. Permission key added to catalog.
  - **Frontend steps**: WelcomeStep (skip option), GoalsStep (8 goal cards, min 1 required), IndustryStep (10 industries, auto-advance with double-click guard via `hasFiredRef`), CompanyProfileStep (react-hook-form + Zod, saves to server), GenerationStep (animated task list, idempotent API call, retry on error), RecommendationsStep (goal→module mapping, enable/skip per module), InviteStep (stable-ID rows keyed by `crypto.randomUUID()`, CSV upload, per-row validation), SuccessStep (auto-calls `completeOnboarding`, error UI with retry).
  - **Persistence**: `wizard-storage.ts` — all wizard state in `localStorage` (`streamline:onboarding-wizard`), written on every step transition, cleared on completion or "Enter Workspace".
  - **Step gating**: `sanitizeStep()` enforces: no goals → max step 1, no industry → max step 2, no orgName → max step 3, never restores to step 7 (success). Prevents localStorage/URL manipulation to jump ahead.
  - **State**: 7 useState → 2 useState (consolidated `WizardState` object + `direction`); 1 useEffect loads localStorage + merges server seed in one pass; server data (`orgSettings.name`, `orgSettings.industry`) seeds localStorage on load, redirect if `onboardingCompletedAt` set.
  - **Post-setup**: `SuccessChecklist` floating widget (bottom-right, 5 items, localStorage-persisted done/dismissed state) injected into `dashboard-shell.tsx`.
  - **Removed steps**: IntegrationsStep and ImportStep removed (files deleted) — too complex/low-value for initial onboarding.
  - **Bug fixes (12 audit issues)**: invalid Tailwind class `h-4.5` fixed, `valueLabel` non-existent Progress prop replaced with `aria-label`, stable row IDs in InviteStep (index → UUID), `completeOnboarding` error surfaced with retry, double-click guard in IndustryStep, array guards in `loadWizardState` for corrupted localStorage.

---

## E2E Hardening Pass (real-browser audit, 2026-06-16)
Live Playwright E2E across all non-HR modules (105 routes × 3 viewports, authenticated as seeded owner) + parallel screenshot review. Bugs found & fixed (build ✓):
- [x] `/accounting/journal/new` & `/accounting/purchase-bills/new` — forms were dead (`pageSize ≤100` validation error: line-item account dropdowns request all accounts). Fixed: `listAccountsQuerySchema` allows `pageSize` ≤1000.
- [x] Currency app-wide — `formatCurrency` hard-coded `$` on an INR app → now delegates to `formatINRCompact` (₹). Also fixed 2 chart axes (`revenue-vs-goal-chart`, `sales-pipeline-charts`) and swapped `DollarSign`→`IndianRupee` icon across 16 currency cards.
- [x] `/dashboard` — Executive KPIs showed "Failed to load" because `GET /api/dashboard/executive` returned 403 for `OWNER` (allowed only CEO/HR/ADMIN). Fixed: added `OWNER`.
- [x] `/projects/[projectId]/analytics` — assignee chart showed raw `User <uuid>`; now joins `users` for real names.
- [x] `/billing/invoices/new` — line-item grid (`grid-cols-12`) was unusable at 375px; now stacks to labeled cards on mobile, tabular at md+.
- [x] `/crm/organizations` & `/crm/contacts` — create flow existed but had no trigger button (users couldn't create the first record); added header "New …" buttons + empty-state CTAs wired to the existing create dialogs.
- [x] `/settings/branches`, `/settings/custom-fields`, `/settings/webhooks` — empty states now fill content height with a solid in-card primary CTA (match Automations).

---

## Organization & Authorization Completion Pass (2026-06-28)
Completed all identified missing features across Organization and Authorization domains (build ✓):
- [x] `/organization/business-units` — Added archive/restore UI (toggle "Archived (N)" button, amber badge, Restore/Delete for archived rows, Edit/Archive for active rows).
- [x] `/organization/branches` — Same archive/restore pattern as business-units.
- [x] `/organization/departments` — Same archive/restore pattern; added Branch selector in form.
- [x] `/organization/teams` — Same archive/restore pattern; Capacity column added.
- [x] `/organization/locations` — Same archive/restore pattern; no `deletedAt` so filter by `status === "ARCHIVED"` only.
- [x] `/organization/cost-centers` — Same archive/restore pattern; converted anonymous handlers to `useCallback`.
- [x] `/settings/api-tokens` — Full implementation: list/create/revoke/delete tokens; token-created dialog with one-time copy; scope selector; expiry date.
- [x] `/settings/organization` — Added `maxConcurrentSessions` field to Security Policies section; wired to backend.
- Backend: Created `api-tokens` NestJS module (controller/service/dto) with list/create/revoke/delete endpoints; registered in `app.module.ts`.
- Backend: Added `maxConcurrentSessions` to `organizations` schema (frontend + backend), org security DTO, and session enforcement in `auth.service.ts` (oldest sessions revoked on login when limit exceeded).
- DB: Migration `0124_max_concurrent_sessions.sql` adds `max_concurrent_sessions` column.

---

## HR — New HRMS Pages (2026-07-01)
Full end-to-end: backend NestJS API → TanStack Query hooks → Next.js pages + feature components. All TypeScript errors resolved; `tsc --noEmit` clean.

### Attendance & Scheduling
- [x] `/hr/shifts` — Shifts management: list with status/time filters, create/edit/delete shift Sheet (name/start/end/days/capacity), assign-employee Dialog, active/draft/archived tabs
- [x] `/hr/rosters` — Rosters: weekly calendar grid, employee row per day, assign/unassign shifts via slot click, week navigation
- [x] `/hr/overtime` — Overtime requests: my requests + team requests tabs, comp-off balance card, approve/reject actions, create request Sheet
- [x] `/hr/comp-off` — Comp-off management: balance card, request history, create comp-off request from overtime
- [x] `/hr/geofencing` — Geofencing: office location map list, add/edit geofence Sheet (name/radius/lat/lng), GPS validation status
- [x] `/hr/biometric` — Biometric integration: device list (ZKTeco/Suprema/eSSL), sync logs, attendance pull history, device add/remove Dialog

### Leave Management
- [x] `/hr/leave-policies` — Leave policy rules engine: accrual/carry-forward/encashment config per policy type, create/edit/delete Sheet with Zod validation
- [x] `/hr/holidays` — Holiday calendar: global + branch holidays, recurring support, import/export, create/edit/delete with date picker
- [x] `/hr/leaves/analytics` — Leave analytics: status distribution bar, monthly trend chart, stat cards (total/pending/months tracked)

### Legacy Payroll (now redirect stubs)
- [x] `/hr/payroll/salary-structures` — redirects to /payroll/salary-structures
- [x] `/hr/payroll/allowances` — redirects to /payroll/components
- [x] `/hr/payroll/tax` — redirects to /payroll/taxes
- [x] `/hr/payroll/bank-transfers` — redirects to /payroll/bank-transfers

### Recruitment
- [x] `/hr/recruitment/requisitions` — Job requisitions pipeline: list with status filters, create/edit requisition Sheet (role/dept/headcount/priority), approval workflow

### Performance
- [x] `/hr/goals` — Goals & OKRs: list with status/type filters, create/edit goal Sheet, progress tracking, key results inline
- [x] `/hr/kpis` — KPI & competency frameworks: KPI list with target/actual, framework categories, create/edit Sheet
- [x] `/hr/feedback` — 360-degree feedback: feedback cycles list, create cycle Sheet, peer/manager/self review assignments
- [x] `/hr/performance/analytics` — Performance analytics: review cycle stats (BarChart by type, PieChart by status), active cycles count

### Learning
- [x] `/hr/courses` — Courses & LMS: course catalog with category/status filters, enrollment management, create/edit Sheet
- [x] `/hr/training` — Training programs & attendance: program list, session scheduling, attendance tracking
- [x] `/hr/career-development` — Career development: career paths list + my career plan tab (path ladder, milestones, target role/date)
- [x] `/hr/learning/analytics` — Learning analytics: enrollment stats, completion rates, popular courses chart

### Travel & Comms
- [x] `/hr/travel` — Travel requests: my requests list, create request Sheet (destination/dates/purpose/advance), status tracking
- [x] `/hr/travel/approvals` — Travel approvals: manager view of pending/approved/rejected requests, approve/reject actions
- [x] `/hr/announcements` — Announcements broadcast: list with pinned/active/archived tabs, create/edit Sheet, read-count tracking
- [x] `/hr/signatures` — Digital signatures: document sign requests list, create signature request Dialog, status tracking (pending/signed/expired)

---

## Payroll (PayrollOS module — 20 routes; migrations 0147-0150 applied; 261 unit + 4 e2e suites; full conformance pass 2026-07-04: 40+ audit findings fixed incl. ESS RBAC, engine calc methods, variance, module gating, snapshot-immutability triggers)
<!-- Gap-closure pass 2026-07-05 (6-agent audit vs 32-doc PRD → ~24 P0 + ~35 P1/P2 fixed by 10 parallel agents + manual seam reconciliation): calc engine (PERCENT_OF_BASIC base, FY2025-26 TDS + §87A + OLD-regime, half-day proration, reimportInputs, deduction ordering, unary-minus, OT guard, profiles.active); loan EMI recovery wired atomically into both lock paths; multi-currency payout sub-batches; journal double-entry now balances; reports RBAC→AccessService + pagination(100) + N+1; FNF 9-component net + HR/FINANCE review states + statement download; ESS bank-lock + declaration SUBMITTED + lockDate; bonus month/taxable/9-types; reimbursement payrollMonth end-to-end; fxRates persistence; calendar BOLA/atomic/audit; reminder scheduler; setup preview/toggle/category/activation-crash fixes; migration 0155_payroll_gapclosure written (UNRUN, unjournaled — renumber before db:migrate). NOT build/test-verified this pass (concurrent session active — run `pnpm -C backend typecheck` + payroll suites). Deferred: SALARY_ON_HOLD (no data source) + DUPLICATE_BANK_ACCOUNT (needs bank decrypt in run loop) detection wired but unpopulated; US Medicare YTD, IN PT brackets, per-category receipts need schema. -->

- [x] `/payroll` — Command Center: live run status, employee exception counts, stat cards, pending actions
- [x] `/payroll/me` — Employee self-service portal: my payslips, salary breakdown, declarations, bank details, loan requests
- [x] `/payroll/setup` — Owner setup wizard: template-first onboarding, policy toggles, payroll policy version creation
- [x] `/payroll/templates` — Template library: 5+ preset templates (Startup/SMB/MNC/Contract/Compliance), preview & activate
- [x] `/payroll/components` — Salary components engine: earnings and deductions CRUD with fixed/percentage formula types
- [x] `/payroll/settings` — Payroll settings: policy builder toggles, statutory config, notification rules
- [x] `/payroll/settings/import-export` — Payroll register CSV export
- [x] `/payroll/salary-structures` — Salary structure templates: basic/HRA/allowance config, effective date ranges, active/inactive
- [x] `/payroll/runs` — Payroll runs list: all runs with status filter (DRAFT/APPROVED/LOCKED/PAID/CLOSED), create new run
- [x] `/payroll/runs/[runId]` — Run detail: generate, approve, lock, reopen, mark paid lifecycle; exception list; employee breakdown
- [x] `/payroll/inputs` — Attendance inputs: LOP days, half-days, overtime hours per employee per period
- [x] `/payroll/employees` — Employee salary profiles list: assigned structure, CTC, last run status
- [x] `/payroll/employees/[employeeUserId]` — Employee salary profile detail: structure assignment, bank details (masked), history
- [x] `/payroll/reimbursements` — Reimbursements CRUD: claim list with approve/reject, add reimbursement dialog
- [x] `/payroll/bonuses` — Bonuses & incentives: one-time/recurring bonus CRUD, variable pay config
- [x] `/payroll/loans` — Loans & advances: loan applications, repayment schedule, EMI deduction config
- [x] `/payroll/taxes` — Tax & statutory: investment declarations (employee + admin), IT proof upload, regime selection, verification
- [x] `/payroll/bank-transfers` — Bank transfer batches: NEFT/RTGS disbursement runs, status tracking, NEFT file download
- [x] `/payroll/payslips` — Payslips: org-wide published payslips list, download, bulk publish
- [x] `/payroll/fnf` — FNF settlement: full & final calculations for exiting employees, gratuity, leave encashment
- [x] `/payroll/reports` — Reports: payroll register, bank payout report, journal export, cost center report, variance report

---

## Workflow & Automation Platform
- [x] `/workflows` — Workflow dashboard: analytics stats (total/active/executions/pending), workflow card list with status filters + search, create workflow Dialog (name + description), duplicate + delete, border-color per status, Framer Motion stagger
- [x] `/workflows/[workflowId]` — Workflow detail: status badge, version, description, execution history list, trigger workflow button, edit/builder link
- [x] `/workflows/[workflowId]/builder` — Visual workflow builder: React Flow canvas, node palette sidebar, node config panel, publish/save actions, lazy state init via BuilderGate wrapper to avoid hook-in-effect violations
- [x] `/workflows/templates` — Template gallery: search + category filter, template cards with Use button, creates workflow from template and navigates to builder
- [x] `/workflows/executions` — Execution monitor: paginated global execution list, status filter tabs, cancel action, auto-refetch when running
- [x] `/workflows/approvals` — Approval center: pending approval cards, approve/reject Dialog with optional comment, pending count badge
- [x] `/workflows/scheduler` — Cron scheduler: global schedule list, toggle enable/disable, delete with confirm Dialog, cron badge + timezone display
- [x] `/workflows/analytics` — Analytics dashboard: 6 stat cards (total/active/executions/success-rate/avg-duration/pending-approvals), 30-day execution trend bar chart
- [x] `/workflows/secrets` — Secrets manager: org-level encrypted secrets list, create Sheet (name/value/description, uppercase key enforced), delete with confirm
- [x] `/workflows/variables` — Variables manager: org-wide workflow version variables list grouped with workflow link, delete with confirm

---

## Knowledge Base Wiki (Notion-style Pages) — PRD-knowledge-base-wiki.md
> 2026-07-03 — conformance pass: Skeleton loading states, EmptyState adoption (+ EmptyKnowledgeIllustration on wiki home), sheet header/border fixes, `--accent` misuse → blue tokens, GPU-safe tree animation + useReducedMotion, aria-labels on icon buttons, all 4 `window.confirm` → AlertDialog, casts removed. Route prefix renamed /knowledge-base → /knowledge; back-compat redirect shims added; right utility panel added to page-document.
> 2026-07-05 — Plate v53 editor upgraded to full-featured toolbar (undo/redo, block-type, font-size, marks, color, align, lists, link, table, emoji, HR) + R2 media uploads (image/video/audio/file via `POST /kb/media`); VideoPlugin/AudioPlugin/FilePlugin/PlaceholderPlugin + CaptionPlugin registered; new media element components + fixed sticky toolbar; `uploadKbMedia` wired through `page-document.tsx`; public renderer updated for media nodes.
- [x] `/knowledge` — Wiki home: Recents, Favorites, root pages, New page action, template starters + full-height empty state; layout owns collapsible page-tree panel (Favorites section, add-child/context menu per node, Quick find Ctrl+K, Templates, Trash)
- [x] `/knowledge/pages/[pageId]` — Notion-style document: breadcrumbs, gradient/URL cover, emoji icon, inline title, TipTap document editor (slash commands, to-dos, tables, images, code highlight, callouts, toggles, @user mentions, [[page links]]), 1.5s autosave with save indicator, favorite, threaded comments Sheet, version history Sheet with restore, backlinks, duplicate/move/lock/export HTML/delete, trash restore + permanent delete; right utility panel (Details, Backlinks, Linked records) hidden below xl; backend: kb_pages + 6 sibling tables, 6 RBAC keys (kb:pages:*, kb:templates:manage), FTS search; migrations 0139/0140 pending TTY
- [x] `/knowledge/recent` — Recently visited pages: compact list rows (icon, title link, relative updated-at); skeleton/empty/error states; live count subtitle
- [x] `/knowledge/favorites` — Favorited pages: list with hover remove-star action via toggleFavorite mutation; empty state CTA to browse pages
- [x] `/knowledge/trash` — Full-page trash: list rows (icon, title, deleted-at) with Restore + Delete forever (AlertDialog confirm) via existing hooks; skeleton/empty/error states
- [x] `/knowledge/templates` — Templates grid (icon, name, description); Use → create page from template → navigate to new page; Delete gated on kb:templates:manage; skeleton/empty/error states
- [x] `/knowledge/analytics` — KB analytics: StatCardGrid (total pages, views, searches, helpful votes, search success rate) + no-result searches table; client useCan("kb:analytics:view") gate with access-denied EmptyState; skeleton loading
- [x] `/wiki/[shareToken]` — Public shared wiki page (unauthenticated, `(public)` group); server-side fetches `GET /public/wiki/:token` from backend; token validated `/^[A-Za-z0-9-]{8,64}$/`; 404 on invalid/non-public; renders cover (gradient presets replicated), icon + title, updated-at, content via `PublicPageContent` (dynamic ssr:false) — defensive renderer for both TipTap JSON and Slate node trees; `robots: noindex,nofollow` via `generateMetadata`
- [x] `/knowledge/spaces` — Spaces list with card grid, create/edit Sheet, delete AlertDialog; manage gated by kb:spaces:manage
- [x] `/knowledge/spaces/[spaceId]` — Space detail with info card + honest EmptyState for page list (spaceId not in tree nodes)
- [x] `/knowledge/private` — Private pages view filtered from page tree (visibility==="private") via filterTreeWithAncestors
- [x] `/knowledge/shared` — Shared-with-me view: pages where createdById !== current user, shown as rows with status badge
- [x] `/knowledge/reviews` — Governance review queue: status+type filter selects, condensed table (page title link, type badge, status badge, reviewer, due date w/ overdue red, requested-by, Approve/Reject actions w/ note dialogs gated kb:reviews:manage); useCan("kb:reviews:view") gate with lock EmptyState; skeleton/empty/error states
- [x] `/knowledge/settings` — KB module settings: module status card (core always-on), default review intervals table (policy 180d / SOP 90d / support 120d / other 365d), quick-links to /settings/roles and /settings/modules; useCan("kb:settings:manage") gate with lock EmptyState
- [x] `/knowledge/pages/[pageId]/history` — Full-page version history: two-pane layout (left: version list with active bg-blue-50 selection; right: read-only PublicPageContent preview + diff-lite summary vs current page + Restore AlertDialog); diff-lite helper in features/knowledge-base/lib/version-diff.ts (title change, word-count delta, first differing 200-char excerpt); "Open full history" link added to page-history-sheet list-view footer; pageHistoryHref added to knowledge-routes.ts
- [x] `/knowledge/import` — Import & Export: mode toggle (Markdown files / Paste text); file-multiple FileReader parse → {title, contentText}; preview table with per-row dedupe warning + remove; import mutation → useImportKbPages (POST /kb/pages/import); import history table (useKbImportJobs); ExportJobsCard (useKbExportJobs, GET /kb/export-jobs); permission gate useCan("kb:pages:import"); starter templates section on /knowledge/templates (15 types, see features/knowledge-base/lib/starter-templates.ts)
- [x] `/knowledge-base` → redirect to `/knowledge` (back-compat shim for old DB notification links)
- [x] `/knowledge-base/pages/[pageId]` → redirect to `/knowledge/pages/[pageId]` (back-compat shim)

---

## HRMS PeopleOS Rebuild (tasks/hrms/ — 44-doc PRD, 2026-07-11)

Full configurable PeopleOS: hardcoded HR rules refactored onto shared engines (policy/workflow/automation/template), all product modules + 15 enterprise packs shipped. Backend + frontend typecheck green. Migrations 0201–0225 (0222 skipped, no table) pending one TTY session — see `tasks/hrms/_reports/MIGRATION-RUNBOOK.md`.

### Shared engines (config, module-owned under /hr/settings)
- [x] `/hr/settings` — no-code config hub (Overview + Simple/Advanced) · [x] `/hr/settings/policies` — policy engine (15 types, scoped, effective-dated, versioned, preview-why) · [x] `/hr/settings/workflows` — approval workflow engine (multi-step/parallel/delegation/escalation) · [x] `/hr/settings/automations` — event→condition→action engine (loop-guarded, run logs) · [x] `/hr/settings/templates` — 13-kind template engine (lifecycle + variables + renders) · [x] `/hr/settings/forms` — no-code form builder (conditional/workflow-attached/public intake) · [x] `/hr/settings/custom-fields` — dynamic fields · [x] `/hr/settings/preview` — effective-rule "why" · [x] `/hr/settings/versions` — version history + rollback · [x] `/hr/settings/import-export` · [x] `/hr/settings/integrations` — webhooks + Composio apps

### Core people & org
- [x] `/hr/employees` (list, lifecycle+worker-type filters) · [x] `/hr/employees/[employeeId]` — 360 profile (timeline, gated sensitive tab, change governance) · [x] `/hr/org` — org hub (teams/locations/roles/levels + headcount) · [x] `/hr/org-chart`

### Time, leave, payroll-inputs (policy-driven, hardcode removed)
- [x] `/hr/attendance` (policy grace/OT/auto-checkout, regularization workflow, geofence) · [x] `/hr/shifts` `/hr/rosters` `/hr/overtime` `/hr/comp-off` `/hr/biometric` `/hr/geofencing` · [x] `/hr/leaves` (ledger-based, policy accrual, workflow approval) · [x] `/payroll/inputs` — buildPayrollInputs contract (build/lock/adjustments, full source traceability)

### Lifecycle
- [x] `/hr/onboarding` (+`/probation` reviews+confirmation, template-driven) · [x] `/hr/exit` `/hr/termination` `/hr/fnf` (asset-recovery gate, letters via template engine, alumni) · recruitment→employee handoff (no duplicate person)

### Documents, assets, performance, learning
- [x] `/hr/documents` (letters+e-sign+compliance calendar) `/hr/document-types` `/hr/document-review` `/hr/signatures` `/hr/handbook` · [x] `/hr/assets` `/hr/asset-returns` (+access requests) · [x] `/hr/performance` (calibration/9-box/succession) `/hr/goals` `/hr/kpis` `/hr/feedback` · [x] `/hr/courses` `/hr/training` `/hr/skills` `/hr/certifications` `/hr/career-development` `/hr/learning-paths`

### Engagement, cases, benefits, helpdesk
- [x] `/hr/engagement` (mood/kudos/badges/polls/communities/campaigns, min-5 anonymity) `/hr/announcements` · [x] `/hr/cases` (grievance/disciplinary, anonymous reporter protected, confidential tier) `/hr/safety` (incidents + wellness) · [x] `/hr/benefits` (plans/enrollment/dependents/claims→payroll) `/hr/travel` `/hr/expenses` `/hr/reimbursements` · [x] `/hr/helpdesk` (categorized/confidential routing + KB suggest)

### Localization, contractors, analytics/AI
- [x] `/hr/compliance` (work-auth/statutory calendar/IN pack) `/hr/contingent` (contracts, convert-to-employee) · [x] `/hr/analytics` command center (drill-down, permission-gated) `/hr/workforce` planning · AI HR copilot tools in global assistant (policy Q&A w/ citations, review/letter drafts, permission-safe)

### Enterprise packs (PRD 43)
- [x] `/hr/devices` `/hr/compensation-planning` `/hr/equity` `/hr/workforce-cost` (packs 1-5) · [x] `/hr/legal-holds` `/hr/retention` `/hr/delegations` `/hr/positions` `/hr/labor-relations` (packs 6-10) · [x] `/hr/accommodations` `/hr/emergency` `/hr/identity` `/hr/simulator` `/hr/event-stream` (packs 11-15)

### Cross-cutting
- [x] One unified `/calendar` (HR events as a toggleable source; `/hr/calendar` removed) · [x] Central notifications for HR events · [x] 107 engine unit/integration tests green (policy/workflow/automation/template/payroll-inputs/leave-ledger/attendance/cases) · [x] blue-accent conformance (violet retired)

## Search conformance pass (2026-07-13)
- [x] All ~70 search surfaces audited (CRM/HR/Inventory/Projects/Finance/Payroll/Workflows/Surveys/Org/Settings/Users/Notifications/Support/KB/Chat/Calendar/Blog); 45 files fixed to the canonical pattern: input bound to immediate local state, `useDebouncedValue` (shared hook) drives query + guarded URL write, never URL/debounce sync-back into the input · [x] all hand-rolled setTimeout/useDeferredValue debounces replaced with the shared hook; local duplicate hook deleted; `use-expense-filters` re-export removed · [x] `placeholderData: keepPreviousData` on all search-driven query hooks (~40) — no result flash while typing · [x] backend: migration `0267_search_trgm_indexes.sql` (39 pg_trgm GIN indexes incl. functional `first_name || ' ' || last_name`) applied; chat `searchUsers` org-scoped (cross-tenant leak fix); global `/search` empty-query short-circuit

## Theme system: Light/Dark/System × 18 accents (2026-07-13)
- [x] Mode axis (Light/Dark/System) added to the existing accent-theme system — mode row in avatar-menu "Interface theme" submenu; provider applies `.dark` + `colorScheme` on `<html>`, `useSyncExternalStore` tracks OS preference live for System, localStorage persistence, pre-paint script (no dark flash, CSP nonce) · [x] scoped to the authenticated shell only — landing/auth/org-setup never themed; `/onboarding` force-defaults via `ForceDefaultTheme` suppression (accent + dark both) · [x] 17 accent themes got `:root.dark.theme-*` reconciliation blocks (sidebar-accent-foreground → 300-shades, chart-1/legacy → 500 core) · [x] dark-readiness sweep: 314 files converted from hardcoded slate/gray/white to semantic tokens (bg-card/bg-muted/text-foreground/text-muted-foreground/border-border) + `dark:` variants on colored status chips, via 9 parallel agents; landing/auth/onboarding/sign-canvas/palette-data deliberately untouched · [x] project-sidebar hydration mismatch fixed (localStorage init → `project-sidebar-collapsed` cookie read in server layout, matching dashboard-shell pattern) · typecheck ✓ lint ✓ (full `next build` deferred — dev server + sibling session active)

## Dark-theme conformance + Ink monochrome pass (2026-07-13, same day follow-up)
- [x] Global root causes: calendar CSS `#ffffff` day slots → `var(--card)`; body selection colors dark-safe; `.dark` border/input/sidebar-border alpha lifted (borders no longer merge with bg); filter-chip tint rebased · [x] whole-surface accent tinting — `:root[class*="theme-"]` color-mix blocks tint bg/card/popover/muted/accent/border/input/sidebar in both modes (palettes recolor the whole shell, not just buttons) · [x] ~600-file conformance sweep via 10 agents: dark: variants on every colored light chip/banner, faded structural borders raised, hex chrome → tokens · [x] Ink=monochrome directive: default sidebar tokens de-blued, command palette de-blued, 149 brand-core tints → primary, 144-file interactive-blue pass (action links, CTAs, progress fills, avatar tints → primary tokens; semantic/status/chart blues kept), button `link` variant → text-primary · [x] 5 pre-existing lint errors fixed (a→Link, 2 useMemo inline, 2 unescaped entities) · typecheck ✓ 0 errors · lint ✓ 0 errors · 2 new CLAUDE.md living rules (§14)

## Ink monochrome completion + neutral dark palette (2026-07-13, final follow-up)
- [x] Default dark palette de-blued: navy surfaces (#07091a/#101428/rgba-blue borders) → neutral zinc (#0a0a0b/#131316, white-alpha borders 0.22/0.16); focus rings → neutral slate/zinc (accent palettes still override); accent dark tint-block bases updated to neutral · [x] 519-file de-blue pass via 8 agents: every standalone blue/indigo/sky accent (row washes, dots, left-bars, icon bubbles, decorative icon tints, active tabs/filters/steps, CTAs, progress fills, mention highlights) → primary tokens with stale dark:blue variants stripped; multi-color semantic maps + info banners + charts + brand gradients preserved · [x] shared ViewToggle + 8 more `bg-foreground text-background` active states → `bg-primary text-primary-foreground` (follows palette) · [x] residual scan clean (6 leftovers all excluded-surface or semantic) · typecheck ✓ 0 · lint ✓ 0
