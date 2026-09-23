# PAGES.md — StreamlineOS Frontend Route Catalog

**What this file is:** A complete audit index of every page route in `frontend/app/`. Each row is one `page.tsx` file. It is a route inventory, not a competing execution queue; current work is assigned only in the single completion plan. Contributors can confirm a route's module, primary hooks, and §8 Definition-of-Done status at a glance.

**How to use it:**

Build-resource verification (2026-09-11): Vercel reported an OOM during production compilation, leaving `routes-manifest.json` absent. Production builds now use Webpack with a 4096 MB Node heap allowance, explicit build workers, memory optimizations, and the production compiler cache disabled. Runtime caching and minification remain enabled. An isolated full build restricted to two logical CPUs completed in 513 seconds, generated all 466 static pages and both `BUILD_ID` and `routes-manifest.json`, and had a sampled build-process-tree RSS peak of 4252 MB. Production HTTP checks returned 200 for `/signin`, `/legal/privacy`, `/legal/terms`, and all 27 referenced sign-in JS/CSS assets; static assets retained one-year immutable caching. TypeScript passed after the full build; the import-cycle check passed with 22 resolution warnings. Lint and unit tests were not run. Browser hydration and authenticated workflows were not verified because no browser was connected. Vercel redeployment remains unverified; these results do not certify individual page audits.

Current local verification (2026-09-10): the final full frontend unit run passed 486 suites /
5,123 tests, including ten cross-tab cases and Support create/edit trigger coverage. Build mutations
now notify same-user/same-organization peer caches, including when the originating
provider unmounts during the request. Ticket resolution failures offer retry; risk
cells, parent search and reaction controls expose accessible state/names and touch
controls. Wiki comments distinguish read errors from empty results and support retry.
These checks do not mark responsive or screen-reader journeys visually certified:
the browser runtime has no connected browser. Current evidence and unresolved work:
[the single completion plan](../architecture-refactor/prd/completion-plan.md).

Build acceptance follow-up (2026-09-09): the KB isolation gap is closed (946/946 declared coverage; 469 runtime suites / 1,992 tests; two real-PostgreSQL controls). Whole OpenAPI snapshots were regenerated and committed byte-identically; 2,668/2,668 response seam calls carry parsing contracts. Exact timesheet totals remain synchronous by explicit compatibility decision, with their O(history) cost disclosed. Browser discovery still finds no connection, so loading/empty/error/retry/responsive states and current Web Vitals remain unverified. Evidence: `architecture-refactor/prd/completion-plan.md`.

Build/PM verification (2026-09-09): repaired infinite-board edit/drag cache updates, conditional field rollback, project analytics/report invalidation, ticket/detail/sprint/dashboard refresh, cursor-based older activity, and logged-time response parsing. Bounded reports display actionable errors and retry both burnup dependencies. The final focused run passed **24 suites / 137 tests**; frontend source and strict test-tree typechecks passed. Madge processed 5,926 files with zero cycles (20 external-import warnings). Evidence: `.artifacts/build-review-20260909-frontend-final-results.json` and `architecture-refactor/prd/completion-plan.md`. Browser validation is blocked until a signed-in browser is connected; production latency, Web Vitals and responsive layouts are not certified by these checks.

Five-area verification (2026-09-09): the focused organization/RBAC, Settings, module-access, billing and payments frontend run passed **52 suites / 474 tests**. Query-scope validation passed across 5,933 files; route-access validation checked 205 navigation permission keys against 633 contract permissions; the permission catalog remained current at 704 keys. Madge processed 5,929 files with zero circular dependencies (20 resolution warnings). Raw logs are in `.artifacts/five-areas-2026-09-09/frontend-agent/`. These checks do not certify individual page layouts or production infrastructure.

Focused shared-shell verification (2026-09-05): Ask OS now loads its full runtime on first opening and preserves state after minimizing; Inbox no longer preloads its closed notification drawer on mount. The two focused suites pass 6 tests and frontend source typecheck passes. This does not mark individual page audits or measured browser performance complete.

- `- [ ]` = not yet audited for this cycle. `- [x]` = audited; mark done after Audit → Plan → Confirm → Edit.
- §8 DoD columns: **L**ist · **C**reate · **E**dit · **D**elete · **F**ilters · **P**agination · **Perm** · **States** (loading/error/empty/denied). `✓` confirmed present, `✗` confirmed missing, `?` not yet verified.
- Hooks column shows the primary TanStack Query hooks seen in the `page.tsx` or its direct feature import. Routes that delegate entirely to a feature component show `→ feature/`.
- **Never delete a row** — mark it `[x]` and append `[RETIRED path]` if a route is removed.

**Generated:** 2026-08-30. **Total routes: 606.** Last updated: 2026-09-10 (C8 settings prefetch census).

**C5 — one owner for the session-claims refresh (2026-09-11).** `useSessionClaimsRefresh()` (`hooks/common/auth-hooks.ts`) is now the single owner of "re-read the session claims": `clearBackendTokenCache()` + `update()` + an 18s timeout, resolving `null` when the refresh fails or times out. All 13 hand-rolled `update()` call sites were repointed at it, `useSwitchOrg` included; `completeOnboardingGate` no longer races its own timeout and takes the shared refresh instead. Claim freshness gained two sources that did not exist: `useAccessVersionSync()` (`hooks/common/use-access-version-sync.ts`), mounted once in `app/(authenticated)/layout-client.tsx`, watches the permission `version` the sidebar already polls off `/me/access` — zero new requests — and on a change evicts every inactive query, refetches every active one and refreshes the claims; `SessionProvider` gained a 5-minute `refetchInterval` as the backstop for claims no version bump carries (plan change, org rename). Eviction is now app-wide rather than Home-only: `useHomeCacheSync` is deleted and its behaviour subsumed, so cached data for a now-denied module is dropped instead of merely stopping refetch. Dead key factory `queryKeys.hr.leaveBalance` removed (the live path is `collaborationQueryKeys.dashboard.myLeaveBalance()`). Types, gates and tests are **not run** in this lane — verified centrally.

**S4 — the claims refresh is fenced at every consumer that acts on it (2026-09-12).** `useSessionClaimsRefresh()`'s 18s timeout bounds the caller, not the work: a timed-out `update()` keeps running and still writes the session. `useConfirmedSessionClaimsRefresh()` (`hooks/common/use-confirmed-session-claims-refresh.ts`) wraps it with the fence `useSwitchOrg` already had — a generation captured before the mutation starts, re-checked after the await, plus an assertion that the refreshed session carries the `orgId`/`name` the mutation returned. `confirm()` yields `confirmed` / `superseded` / `unconfirmed`; `confirmOrWarn()` adds the single shared toast. Nine call sites were repointed at it: `components/organization/archived-orgs-restore.tsx`, `components/organization/leave-organization-control.tsx`, `features/settings/organization/org-danger-zone-section.tsx` (archive + leave), `features/settings/organization/org-danger-zone-dialogs.tsx` (delete), `hooks/api/ownership.ts` (`useAcceptTransfer`, fenced from `onMutate`), `features/settings/settings-edit-name-form.tsx`, `features/settings/settings-profile.tsx` (avatar upload + removal) — none of them now calls `queryClient.clear()`, navigates or reports success on an unconfirmed refresh. `useAccessVersionSync()` additionally had its ordering repaired: `seenVersion` advanced BEFORE the await, so an 18s null permanently marked that permission version seen; it now advances only on a confirmed refresh, with one bounded retry and the sweep issued once per version. Consumers still outside the fence, by owner: `app/org-setup/page.tsx`, `features/org-setup/components/step-generation.tsx` (×2) and `features/employee-onboarding/components/step-review.tsx` (all via `completeOnboardingGate`, which drops the org identity), `app/(auth)/invitation/[token]/page.tsx`, and `features/auth/suspended-access-card.tsx` (reads the returned session directly — correct by design).

**C1 — the org-setup wizard stops orchestrating (2026-09-11).** `/org-setup` no longer sequences provisioning from the browser. `features/org-setup/components/step-generation.tsx` (357 → 245 lines) lost `buildPayload`, `runPostSetupTasks` and the `generationPending` retry state machine; it fires `POST /org/setup/complete` once and then polls `GET /org/setup/status` through `features/org-setup/hooks/use-setup-provisioning.ts` under a 90s bound, so a closed tab can no longer leave an org half-provisioned. Workspace generation and bulk invites moved server-side into the setup-completed outbox consumer, and the complete/skip routes are now naturally idempotent (they short-circuit on `onboardingCompletedAt`), so a replay no longer re-sends the welcome mail or mints a second magic-link token. Payload mapping lives in `features/org-setup/lib/setup-payload.ts` and emits `{email, role}` only — the backend invitee schema is `.strict()` and never accepted `department`. Rendered states are not certified; no browser run.

**C10 — settings form owner + residuals (2026-09-10).** The organization settings edit protocol (enter edit, cancel, re-seed from the server record, submit once, toast, exit on success, keep input on failure) existed in six hand-written copies and now has one owner, `features/settings/organization/use-organization-settings-form.ts`. Six sections migrated; four are exempt with a reason each, held executable in `org-settings-form-adoption.contract.test.ts`. Payload conversion stays local per section — no `getPayload` bag, which is the shape the wave-2 lane rejected. Two latent defects fell out: Cancel restored mount-time defaults (stale after any save), and no section re-seeded when the org record changed underneath. `jest features/settings` passes 23 suites / 221 tests. Rendered behaviour is not certified — no browser run.

**C8 — settings prefetch census (2026-09-10).** All 23 `/settings/**` routes are now accounted for: 22 server-prefetch their initial reads behind the route's own permission gate and hydrate them through `HydrationBoundary`; `/settings/incoming-transfer` is classified NO PREFETCH NEEDED because its read declares `staleTime: 0` + `refetchOnMount: "always"`. The census is executable — `lib/prefetch/settings-prefetch-census.test.ts` enumerates the routes from disk, so a new settings page with neither a real prefetch nor a tested classification fails the suite. Measured with request-count assertions in `lib/prefetch/settings-hydration.test.tsx`: 20 first-mount reads removed, 1 deliberately retained.

**PAGES2 count reconciliation (2026-08-30):**
- Disk: 598 `page.tsx` files (confirmed via `find … | wc -l`).
- Normalizer strips every parenthesised route-group segment (e.g. `(auth)`, `(authenticated)`, `(portal)`, `(public)`, `(site)`). All 6 sanity-test paths passed.
- 4 blog routes were labelled with `(site)` in the path — corrected to their real URLs below.
- 3 routes existed on disk but were absent from this catalog: `/calendar/settings`, `/chat/moderation`, `/chat/settings` — added below. (2026-09-09: `/chat/moderation` has since been deleted — the huddle-to-Meet migration removed the participant controls it existed for; `/chat/settings` was kept and implemented.)
- Module-index sum after those additions: 600. Disk: 598. The 2-row gap is a parser artefact (2 rows use non-standard formatting that the script skipped); it is NOT a missing file. The module index is authoritative.

**Count reconciliation (2026-09-08):**
- Disk: 601 `page.tsx` files (measured via Glob tool).
- 6 routes existed on disk but were absent from this catalog: `/hr/dashboard`, `/inbox`, `/workflows/settings/access`, `/workflows/settings/secrets`, `/workflows/settings/variables`, `/blog/admin` — added below.
- 3 catalog rows had no matching `page.tsx` on disk: `/workflows/secrets`, `/workflows/variables`, `/waitlist` — marked `[x] [RETIRED path]`.
- Module-index sum after additions: 606. Disk: 601. Gap of 5 = 3 newly retired rows + the pre-existing 2-row parser artefact.

**Route-module thinness (S11, 2026-09-02).** `pnpm check:route-thinness` now measures what the "thin route module" rule asks for, so it is a number rather than a judgement. It scans all 586 authenticated `page.tsx`/`layout.tsx` files for component state, data fetching, forms, direct `apiClient` calls and files over 300 lines, and ratchets the in-scope count at **118**; a further **67** are CRM/Inventory and are printed under OUT OF SCOPE rather than filtered away. Run it with `--list` for the per-file reasons. Owners of the 118: HR 42, Accounting 33, Support 14, Build 10, Workflows 7, Notifications 6, Surveys 2, Settings 2, Payroll 1, Chat 1. Client route modules remain **260 of 600** against the 304 ceiling.

---

## Route-Ownership Violations

All prior violations resolved on 2026-08-30:

| Path | Resolution |
|---|---|
| `/crm/calendar` | DELETED — module events flow through the unified `/calendar`. |
| `/payroll/me` | DELETED — self-service pay is at `/me/pay`. |
| `/knowledge-base` | DELETED — canonical KB is at `/knowledge/wiki/**`. |
| `(portal)/projects` and `(portal)/projects/[projectId]` | DELETED — external client portal moved to `/client-portal` and `/client-portal/[projectId]`. |

Resolved on 2026-09-02 (S06 — backend API prefixes, not page routes):

| API prefix | Resolution |
|---|---|
| `product-management/workspaces` | RENAMED to `build/workspaces` — §8 puts every Build resource under `/build`. Both frontend callers (`hooks/api/build/pm-workspaces.ts`, the `[pmWorkspaceId]` layout server fetch) and 6 e2e route literals updated; all 9 operations were `internal permissioned`, so no published contract broke. |
| `whiteboards` (hub) | RENAMED to `build/whiteboards`. The project-scoped `build/:projectId/whiteboards` routes were already canonical; only the org-wide hub sat outside the prefix, where any middleware or rate-limit tier keyed on `/build` silently missed it. No frontend caller existed. |

**Open question (blocked — do not change unilaterally):** Root `CLAUDE.md` §8 lists "people directory" as a universal surface but also places workforce at `/directory/workers` as governance. The current code gates `/directory/workers` on `directory:workers:view`. Widening access is the unsafe direction to guess; left as-is pending an explicit product decision.

**Note:** `(authenticated)/portal` (internal, session JWT, `useCan("build:portal:view")`) and `(portal)/client-portal` (external, portal token, `portalApiClient`) are intentionally distinct surfaces — the hook collision was resolved by renaming to `useExternalPortalProjects`.

---

## Module Index (count per module)

| Module | Route count |
|---|---|
| Auth | 5 |
| Platform shell (root) | 4 |
| Dashboard / Home | 1 |
| Calendar | 2 |
| Mail | 2 |
| Chat | 5 |
| Notifications | 7 |
| AI / Ask | 2 |
| CRM | 56 |
| Build | 77 |
| HR | 125 |
| Payroll | 23 |
| Accounting | 74 |
| Inventory | 61 |
| Knowledge | 16 |
| Me (self-service) | 7 |
| Support | 26 |
| Surveys | 6 |
| Workflows | 14 |
| Sign (e-signature) | 8 |
| Timesheets | 9 |
| Directory | 6 |
| Settings | 25 |
| Billing (customer invoices) | 3 |
| Blog | 2 |
| Parties / Subjects | 2 |
| Portal (authenticated) | 2 |
| Portal group (client) | 3 |
| Public | 33 |

---

## Auth `(auth)`

- [ ] `/access-suspended` · **Auth** · hooks: none · §8: States ✓ (access-denied surface)
- [ ] `/invitation/[token]` · **Auth** · hooks: invite token fetch · §8: States ?
- [ ] `/magic-link` · **Auth** · hooks: magic-link verify · §8: States ?
- [ ] `/signin` · **Auth** · hooks: NextAuth · §8: States ✓ (IMMUTABLE reference surface)
- [ ] `/verify-email` · **Auth** · hooks: email verify · §8: States ?

---

## Platform Shell (root group)

- [ ] `/` · **Platform** · hooks: session redirect · §8: not a data page
- [ ] `/access-denied` · **Platform** · hooks: none · §8: States ✓
- [ ] `/employee-onboarding` · **Platform** · hooks: `useOnboardingWizard` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✓ — multi-step wizard; skeleton loading; `ErrorState` for load failure; StrictMode-safe; delegates steps to feature components; no `requiredPermission` (correct, universal)
- [ ] `/org-setup` · **Platform** · hooks: `resolveWizardGate` · §8: States ?

---

## Dashboard / Home

- [ ] `/dashboard` · **Home** · hooks: `→ feature/dashboard` · §8: States ?

---

## Calendar

- [ ] `/calendar` · **Platform (universal)** · hooks: `→ feature/calendar` · §8: F ✓ States ? — unified calendar; module event sources are toggleable
- [ ] `/calendar/settings` · **Platform** · hooks: `enforceRouteAccess("/calendar/settings")` · §8: E ? Perm ✓ States ✓ — placeholder; `PageWrapper` + `EmptyState`; no data loading states needed until UI is implemented

---

## Mail

- [ ] `/mail` · **Communications** · hooks: `→ feature/mail` · §8: L ? States ?
- [ ] `/inbox` · **Communications** · hooks: `→ feature/inbox` · §8: L ? States ?

---

## Chat

2026-09-10 verification: Chat frontend selection passed 26 suites / 234 tests. The entity-action
dialog now has an accessible description; its focused follow-up passed 6/6 with no Radix
description warning. Backend Chat passed 53 suites / 503 tests; the strengthened entity-channel
controller suite passed 12/12, and the message/idempotency fixture follow-up passed 18/18.
The read-path database fixture has been isolated from seed distribution, but its real-PostgreSQL
suite has not executed in this environment because no approved disposable database is configured.
Responsive browser acceptance remains unverified. Evidence:
`architecture-refactor/prd/completion-plan.md`.

- [x] `/chat` · **Communications** · hooks: `→ feature/chat` · §8: L ✓ E ✓ Err ✓ Offline ✓ States ✓ — Chat authz audit (2026-09-09): backend fixed a cross-channel reply content leak on message send, attachments readable outside channel membership, a private-channel existence oracle on send/edit/delete, and admin-check bypasses on channel-update/role-change — all exercised from this page's message panel and channel-info panel, now covered by new seeded real-database e2e specs. Unread badges now key off a commit-ordered position cursor (migration 1074), not a timestamp. Huddle panel shows a Join-meeting link only; the WebRTC mesh, device pickers and mute/deafen controls were deleted (`huddle-panel.tsx`). States completed 2026-09-09: loading skeletons, empty, error, and an offline/reconnect banner driven by `navigator.onLine` in `use-message-panel-data.ts` ("You're offline — messages will be sent when you reconnect"). Unread counting proved atomic under concurrent delivery by a two-connection real-DB spec, and cursor replay proved gapless and duplicate-free by `chat-realtime-unread.seeded-e2e-spec.ts` (12/12). Read cost measured as `streamline_app` with the tenant GUC: a 50-message page is 96 buffers, page 2 is 72, and unread across 52 channels is 33 — unread is O(channels), never O(messages). Query counts over the HTTP stack (`route-budget-http`, 5 of 7 chat routes measured): `/chat/unread` db=14, `/chat/channels` db=18, `/messages` db=16, `/members` db=16, `/chat/saved` db=13. That run found `GET /chat/saved` returning a shape its `@ResponseSchema` did not describe (`reactions` never hydrated, and `nextCursor` null vs `optional`) — the client contract rejected it too, so the Saved Messages panel failed closed for anyone whose first page was also their last. Both ends fixed. Browser acceptance matrix (CH7 gate 8, `scripts/chat-acceptance.mjs`, 11 states × 360/768/1280/1280@200%): **37 PASS · 1 FAIL · 6 NOT-RUN of 44**, `D:/localstack/ch7-run5`. Four defects it found and fixed: a read that failed with no data threw past the shell into the route boundary, so the timeline's and sidebar's own `ErrorState` were dead code and a 500 on ONE channel replaced the whole of `/chat` with "Chat Error" (`INLINE_READ_ERROR` now on the chat reads whose surfaces render the failure; the unread badge, which is above the route boundary, took the ENTIRE app to the root boundary); "Load older messages" and the scroll-to-top auto-load both fetched an older page that `resolveMessageWindowStart` immediately sliced back off, so the reader had to ask twice; the thread panel was `hidden lg:flex` with an "Open thread" trigger operable at every width, so threads painted nothing between 640px and 1024px (now a Sheet below `lg`); and `text-muted-foreground` on the `bg-muted` active channel row measured 4.34:1, below AA — the light `--muted-foreground` token moved from `#64748b` to `#556377` on 2026-09-13, which is 5.58:1 on `--muted` and 5.84:1 on `--background`, and the three contrast suites now require AA there instead of recording the gap (dark was already 6.63:1; not browser-re-verified). Fixed 2026-09-13 (not browser-re-verified): the chat nav was unreachable on the conversation surface between 640px and 767px — the list pane that hosts it is `hidden md:flex` while `ChatMobileBottomNav` was `sm:hidden`, so neither rendered in that band and Back was the only route. `getChatMobileBottomNavClassName()` is now `md:hidden` and both reserved insets moved to `max-md:`; the two pane class lists collapsed into `features/chat/chat-shell-layout.ts` so `features/chat/chat-shell.test.tsx` can assert the invariant that was actually broken — at no width are the nav and its host pane both hidden (a literal class-string assertion would not have caught it). The denied state is NOT browser-verified: `/me/access` is fetched server-side and dehydrated, so no browser response can deny this owner session — it needs a fixture member without `chat:*` (component coverage is `features/chat/__tests__/channel-sidebar-denied.test.tsx`).
- [ ] `/chat/channels` · **Communications** · hooks: `→ feature/chat` · §8: L ? C ? States ? — Chat authz audit (2026-09-09): "Create Channel" on this page reached a channel-create record-binding bypass — the insert returned the raw row instead of a membership-bound detail load, and entity/DM channels could skip the plan-limit check; both fixed in `chat-channels.service.ts`, now covered by new seeded real-database e2e specs for channel lifecycle and membership. A11y 2026-09-09: the discovery list now carries `aria-busy` + an `sr-only` `role="status"` while loading, and each row an `aria-label="Open <channel>"`. **Responsive was NOT visually verified at 375/768/1280** — the breakpoint classes are present in source but nobody rendered the page at those widths, so this row stays unchecked until someone does.
- [x] `/chat/invite/[token]` · **Communications** · hooks: `useJoinViaInviteLink` · §8: States ✓ — 2026-09-09: invite lifecycle is now real. Migration 1080 added `expires_at`, `max_uses` and `use_count`; before it a link was valid forever, so "expired invite" had no state to test. Join treats revoked, expired, exhausted and archived-channel identically with a **byte-identical 404 body** (no oracle), and admission is transactional and idempotent so a rejoin increments `use_count` once. Admins pick an expiry (never / 24h / 7d / 30d) in the add-members dialog. Verified by `chat-invite-links.seeded-e2e-spec.ts` — 10/10 against a real database, including cross-tenant.
- [x] `/chat/settings` · **Communications** · hooks: `useChatOrgSettings`, `useUpdateChatOrgSettings` · §8: L ✓ E ✓ Err ✓ Perm ✓ States ✓ — 2026-09-09: placeholder replaced with a real react-hook-form over `GET`/`PATCH /chat/settings` (`defaultNotificationPreference`, `maxAttachmentSizeMb`, `maxHuddleParticipants`). Read gated `chat:channels:read`, save gated `chat:org-settings:manage`, route gated by `enforceRouteAccess`. Skeleton mirrors the two cards; `ErrorState` with retry; `NoPermissionState`. Contract `chatOrgSettingsContract` is `.strict()` against the backend's strict response schema.

---

## Notifications

- [ ] `/notifications` · **Platform** · hooks: `→ feature/notifications` · §8: L ? States ?
- [ ] `/notifications/broadcasts` · **Platform** · hooks: `→ feature/notifications` · §8: L ? C ? States ?
- [ ] `/notifications/events` · **Platform** · hooks: `→ feature/notifications` · §8: L ? States ?
- [ ] `/notifications/policy` · **Platform** · hooks: `→ feature/notifications` · §8: E ? States ?
- [ ] `/notifications/preferences` · **Platform** · hooks: `→ feature/notifications` · §8: E ? States ?
- [ ] `/notifications/providers` · **Platform** · hooks: `→ feature/notifications` · §8: L ? C ? States ?
- [ ] `/notifications/templates` · **Platform** · hooks: `→ feature/notifications` · §8: L ? C ? States ?

---

## AI / Ask

- [ ] `/ask` · **AI** · hooks: `→ feature/ask` · §8: States ?
- [ ] `/ai/executive-brief` · **AI** · hooks: `lib/api/hooks/executive-brief` → `features/ai/executive-brief-page` · streaming/cancel/failure states covered by `features/ai/executive-brief-streaming.test.tsx`; full page acceptance remains open

---

## CRM

### Hub & overview
- [ ] `/crm` · **CRM** · hooks: `useLeadStats`, `useDealStats`, `useDeals`, `useContacts`, `useWinLossAnalysis`, `useTasks` · §8: States ✓ (loading/error skeletons, error state, hub not a list)

### Leads
- [ ] `/crm/leads` · **CRM** · hooks: `useLeadBoard`, `useLeadStats`, `useLeads`, `useUpdateLeadStatus`, `useCrmOptions` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓
- [ ] `/crm/leads/[leadId]` · **CRM** · hooks: `→ feature/crm/leads` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/leads/source-report` · **CRM** · hooks: `useLeadSourceReport` · §8: L ✓ C ✗ E ✗ D ✗ F ✓ P ✗ Perm ✗ States ✓ — analytics/report view; no `useCan` gate; all four states present (skeleton loading, `ErrorState`, `EmptyState` inside card, success chart); Framer Motion bar chart
- [ ] `/crm/leads/distribute` · **CRM** · hooks: `→ feature/crm/leads` · §8: E ? Perm ? States ?
- [ ] `/crm/leads/duplicates` · **CRM** · hooks: `→ feature/crm/leads` · §8: L ? States ?
- [ ] `/crm/leads/smart-search` · **CRM** · hooks: `→ feature/crm/leads` · §8: F ? States ?

### Contacts & Companies
- [ ] `/crm/contacts` · **CRM** · hooks: `useContacts` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/contacts/[contactId]` · **CRM** · hooks: `→ feature/crm/contacts` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/companies` · **CRM** · hooks: `→ feature/crm/companies` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/companies/[companyId]` · **CRM** · hooks: `→ feature/crm/companies` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/clients` · **CRM** · hooks: `→ feature/crm/clients` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/clients/[clientId]` · **CRM** · hooks: `→ feature/crm/clients` · §8: E ? D ? Perm ? States ?

### Deals
- [ ] `/crm/deals` · **CRM** · hooks: `useDeals`, `useDealStats` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/deals/[dealId]` · **CRM** · hooks: `→ feature/crm/deals` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/deals/forecast` · **CRM** · hooks: `→ feature/crm/deals` · §8: F ? States ?
- [ ] `/crm/deals/win-loss` · **CRM** · hooks: `useWinLossAnalysis` · §8: L ✓ C ✗ E ✗ D ✗ F ✓ P ✗ Perm ✗ States ✓ — analytics/report view; no `useCan` gate; all four states present (skeleton loading, `ErrorState`, `EmptyState` with `EmptyDealsIllustration`, success view); uses `access` prop on `EmptyState`
- [ ] `/crm/deals/aging` · **CRM** · hooks: `→ feature/crm/deals` · §8: F ? States ?
- [ ] `/crm/deals/approvals` · **CRM** · hooks: `→ feature/crm/deals` · §8: L ? States ?

### Quotes
- [ ] `/crm/quotes` · **CRM** · hooks: `→ feature/crm/quotes` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/quotes/[quoteId]` · **CRM** · hooks: `→ feature/crm/quotes` · §8: E ? D ? Perm ? States ?

### Campaigns
- [ ] `/crm/campaigns` · **CRM** · hooks: `→ feature/crm/campaigns` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/campaigns/[campaignId]` · **CRM** · hooks: `→ feature/crm/campaigns` · §8: E ? D ? Perm ? States ?

### Activities & Tasks
- [ ] `/crm/activities` · **CRM** · hooks: `→ feature/crm/activities` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/tasks` · **CRM** · hooks: `useTasks` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?

### Reports & Analytics
- [ ] `/crm/reports` · **CRM** · hooks: `→ feature/crm/reports` · §8: F ? States ?
- [ ] `/crm/analytics` · **CRM** · hooks: `→ feature/crm/analytics` · §8: F ? States ?

### Inbox & Issues
- [ ] `/crm/inbox` · **CRM** · hooks: `→ feature/crm/inbox` · §8: L ? States ?
- [ ] `/crm/issues` · **CRM** · hooks: `→ feature/crm/issues` · §8: L ? States ?
- [ ] `/crm/import` · **CRM** · hooks: `→ feature/crm/import` · §8: States ?

### Autonomy
- [ ] `/crm/autonomy` · **CRM** · hooks: `→ feature/crm` · §8: States ?

### Calendar
- [x] `/crm/calendar` · **CRM** [RETIRED 2026-08-30: file deleted; module events now flow through the unified `/calendar` per §8 rule]

### Access
- [ ] `/crm/access` · **CRM** · hooks: `→ feature/crm` · §8: Perm ? States ?

### Settings
- [ ] `/crm/settings/api-keys` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/crm/settings/ai` · **CRM** · hooks: `→ feature/crm/settings` · §8: E ? Perm ? States ?
- [ ] `/crm/settings/assignment-rules` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/audit-log` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/crm/settings/automations` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/automations/new` · **CRM** · hooks: `→ feature/crm/settings` · §8: C ? Perm ? States ?
- [ ] `/crm/settings/automations/[automationId]` · **CRM** · hooks: `→ feature/crm/settings` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/settings/blueprints` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? Perm ? States ?
- [ ] `/crm/settings/custom-fields` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/data-quality` · **CRM** · hooks: `→ feature/crm/settings` · §8: States ?
- [ ] `/crm/settings/email-templates` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/import-export` · **CRM** · hooks: `→ feature/crm/settings` · §8: States ?
- [ ] `/crm/settings/layouts` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? E ? Perm ? States ?
- [ ] `/crm/settings/options` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/pipelines` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/pricebooks` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/products` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/quotes` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? E ? Perm ? States ?
- [ ] `/crm/settings/scoring-rules` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/sequences` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/sla` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/subject-types` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/territories` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/validation-rules` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?

---

## Build (Project & Product Management)

### Hub & cross-project views
- [ ] `/build` · **Build** · hooks: `enforceRouteAccess`, `→ features/build/project-list` · §8: L ? C ? E ? D ? F ? P ? Perm ✓ States ?
- [ ] `/build/all` · **Build** · hooks: `enforceRouteAccess`, `→ features/build/project-list` · §8: L ? F ? P ? Perm ✓ States ?
- [ ] `/build/all-work` · **Build** · hooks: `→ features/build/all-work` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/build/my-work` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/inbox` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/drafts` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/command-center` · **Build** · hooks: `→ features/build` · §8: States ?
- [ ] `/build/approvals` · **Build** · hooks: `→ features/build` · §8: L ? Perm ? States ?
- [ ] `/build/members` · **Build** · hooks: `→ features/build` · §8: L ? Perm ? States ?
- [ ] `/build/customers` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/client-access` · **Build** · hooks: `→ features/build` · §8: Perm ? States ?
- [ ] `/build/access` · **Build** · hooks: `→ features/build` · §8: Perm ? States ?

### PM Workspaces
- [ ] `/build/pm-workspaces` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/all` · **Build** · hooks: `→ features/build` · §8: L ? F ? P ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/all-work` · **Build** · hooks: `→ features/build` · §8: L ? F ? P ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/my-work` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/pm-workspaces` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]` · **Build** · hooks: `→ features/build` · §8: L ? F ? P ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]/epics` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]/my-tickets` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]/views` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]/settings` · **Build** · hooks: `→ features/build` · §8: E ? Perm ? States ?

### Programs, Portfolios, Goals, Roadmap, Teams
- [ ] `/build/programs` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/portfolios` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/portfolios/[portfolioId]` · **Build** · hooks: `→ features/build` · §8: E ? D ? Perm ? States ?
- [ ] `/build/goal` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/goal/[goalId]` · **Build** · hooks: `→ features/build` · §8: E ? D ? Perm ? States ?
- [ ] `/build/roadmap` · **Build** · hooks: `→ features/build` · §8: F ? States ?
- [ ] `/build/teams` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/teams/[teamId]` · **Build** · hooks: `→ features/build` · §8: E ? D ? Perm ? States ?
- [ ] `/build/templates` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? States ?

### Managed Products (product management)
- [ ] `/build/managed-products` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/build/managed-products/[managedProductId]` · **Build** · hooks: `→ features/build` · §8: E ? D ? Perm ? States ?

### Settings (Build module)
- [ ] `/build/settings/integrations` · **Build** · hooks: `→ features/build/settings` · §8: L ? C ? E ? Perm ? States ?

### Per-project views (`/build/[projectId]/*`)
- [ ] `/build/[projectId]` · **Build** · hooks: `→ features/build/project` · §8: States ?
- [ ] `/build/[projectId]/ai` · **Build** · hooks: `→ features/build/project` · §8: States ?
- [ ] `/build/[projectId]/analytics` · **Build** · hooks: `→ features/build/project` · §8: F ? States ?
- [ ] `/build/[projectId]/approvals` · **Build** · hooks: `→ features/build/project` · §8: L ? Perm ? States ?
- [ ] `/build/[projectId]/automations` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/[projectId]/backlog` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? F ? P ? States ?
- [ ] `/build/[projectId]/budget` · **Build** · hooks: `→ features/build/project` · §8: F ? States ?
- [ ] `/build/[projectId]/bugs` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/change-requests` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/chat` · **Build** · hooks: `→ features/build/project` · §8: States ?
- [ ] `/build/[projectId]/client-portal` · **Build** · hooks: `→ features/build/project` · §8: Perm ? States ?
- [ ] `/build/[projectId]/cycles` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? P ? States ?
- [ ] `/build/[projectId]/cycles/[cycleId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/decisions` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/epics` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/feedbucket` · **Build** · hooks: `→ features/build/project` · §8: L ? F ? P ? States ?
- [ ] `/build/[projectId]/feedbucket/[submissionId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/forms` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/forms/[formId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/incidents` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/incidents/[incidentId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/intake` · **Build** · hooks: `→ features/build/project` · §8: L ? States ?
- [ ] `/build/[projectId]/meetings` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/meetings/[meetingId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/milestones` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/modules` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/my-tickets` · **Build** · hooks: `→ features/build/project` · §8: L ? States ?
- [ ] `/build/[projectId]/qa` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/qa/runs/[runId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/releases` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/reports` · **Build** · hooks: `→ features/build/project` · §8: F ? States ?
- [ ] `/build/[projectId]/risks` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/settings` · **Build** · hooks: `→ features/build/project` · §8: E ? Perm ? States ?
- [x] `/build/[projectId]/sprints` · **Build** · hooks: `useSprints, useUpdateSprint, useUpdateTicket, useSprintTicketMover` · §8: L ✓ C ✓ E ✓ D ✓ F ? P ? States ✓ — S06: three `Promise.all` per-ticket fan-outs replaced by the bounded transactional `POST /build/:projectId/tickets/bulk` (chunked at the backend cap of 100); sprint completion now sends `sprintId: null` so "move to backlog" actually clears the sprint instead of serialising `undefined` to a no-op. 5 tests in `use-sprint-ticket-mover.test.ts`.
- [ ] `/build/[projectId]/tickets/[ticketKey]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? Perm ? States ?
- [ ] `/build/[projectId]/timeline` · **Build** · hooks: `→ features/build/project` · §8: F ? States ?
- [ ] `/build/[projectId]/triage` · **Build** · hooks: `→ features/build/project` · §8: L ? States ?
- [ ] `/build/[projectId]/views` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/webhooks` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/build/[projectId]/whiteboard` · **Build** · hooks: `→ features/build/project` · §8: States ?
- [ ] `/build/[projectId]/wiki` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/wiki/[pageId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/workflow` · **Build** · hooks: `→ features/build/project` · §8: E ? Perm ? States ?

---

## HR (Human Resources)

### Hub
- [ ] `/hr` · **HR** · hooks: `→ features/hr/hub` · §8: States ✓ (hub surface)
- [ ] `/hr/dashboard` · **HR** · hooks: `→ features/hr/dashboard` · §8: States ?

### Employees
- [ ] `/hr/employees` · **HR** · hooks: `requirePermission("hr:employees:view")`, `→ features/hr/employees` · §8: L ? C ? E ? D ? F ? P ? Perm ✓ States ?
- [ ] `/hr/employees/[employeeId]` · **HR** · hooks: `→ features/hr/employees` · §8: E ? D ? Perm ? States ✓ (HRMS audit H-01: a non-404 read failure renders in place with a support code, not `error.tsx`)
- [ ] `/hr/employees/find-expert` · **HR** · hooks: `→ features/hr/employees` · §8: F ? States ?
- [ ] `/hr/employees/skills-matrix` · **HR** · hooks: `→ features/hr/employees` · §8: L ? F ? States ?

### Onboarding
- [ ] `/hr/onboarding` · **HR** · hooks: `→ features/hr/onboarding` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/onboarding/[userId]` · **HR** · hooks: `→ features/hr/onboarding` · §8: E ? States ?
- [ ] `/hr/onboarding/my-tasks` · **HR** · hooks: `→ features/hr/onboarding` · §8: L ? States ?
- [ ] `/hr/onboarding/probation` · **HR** · hooks: `→ features/hr/onboarding` · §8: L ? F ? States ?

### Attendance & Time
- [ ] `/hr/attendance` · **HR** · hooks: `→ features/hr/attendance` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/leaves` · **HR** · hooks: `→ features/hr/leaves` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/leaves/analytics` · **HR** · hooks: `→ features/hr/leaves` · §8: F ? States ?
- [ ] `/hr/leave-policies` · **HR** · hooks: `→ features/hr/leaves` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/holidays` · **HR** · hooks: `→ features/hr/holidays` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/work-logs` · **HR** · hooks: `→ features/hr/work-logs` · §8: L ? F ? P ? States ?
- [ ] `/hr/overtime` · **HR** · hooks: `→ features/hr/overtime` · §8: L ? F ? P ? States ?
- [ ] `/hr/shifts` · **HR** · hooks: `→ features/hr/shifts` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/rosters` · **HR** · hooks: `→ features/hr/rosters` · §8: L ? C ? E ? D ? F ? States ?
- [ ] `/hr/comp-off` · **HR** · hooks: `→ features/hr/comp-off` · §8: L ? F ? States ?

### Recruitment
- [ ] `/hr/recruitment` · **HR** · hooks: `→ features/hr/recruitment` · §8: States ?
- [ ] `/hr/recruitment/jobs` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/recruitment/jobs/new` · **HR** · hooks: `→ features/hr/recruitment` · §8: C ? Perm ? States ?
- [ ] `/hr/recruitment/jobs/[jobId]/edit` · **HR** · hooks: `→ features/hr/recruitment` · §8: E ? Perm ? States ?
- [ ] `/hr/recruitment/candidates` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/recruitment/candidates/[candidateId]` · **HR** · hooks: `→ features/hr/recruitment` · §8: E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/candidates/import` · **HR** · hooks: `→ features/hr/recruitment` · §8: States ?
- [ ] `/hr/recruitment/candidates/intake` · **HR** · hooks: `→ features/hr/recruitment` · §8: C ? States ?
- [ ] `/hr/recruitment/pipeline` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? F ? States ?
- [ ] `/hr/recruitment/interviews` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? F ? P ? States ?
- [ ] `/hr/recruitment/offers` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/hr/recruitment/offer-templates` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/requisitions` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/hr/recruitment/talent-pools` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/recruitment/headcount` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/analytics` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/diversity-report` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/scorecard-analytics` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/scorecard-templates` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/recruitment/question-bank` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/hiring-flows` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/booking-links` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? D ? States ?
- [ ] `/hr/recruitment/email-sequences` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/recruitment/automations` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/recruiters` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? Perm ? States ?
- [ ] `/hr/recruitment/vendors` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/recruitment/internal-jobs` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? F ? States ?
- [ ] `/hr/recruitment/referrals` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? F ? P ? States ?
- [ ] `/hr/recruitment/refer` · **HR** · hooks: `→ features/hr/recruitment` · §8: C ? States ?
- [ ] `/hr/recruitment/sla` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/sla-report` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/interviewer-performance` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/inbox` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? States ?
- [ ] `/hr/recruitment/reports` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/settings` · **HR** · hooks: `→ features/hr/recruitment` · §8: E ? Perm ? States ?

### Performance & Engagement
- [ ] `/hr/performance` · **HR** · hooks: `→ features/hr/performance` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/performance/analytics` · **HR** · hooks: `→ features/hr/performance` · §8: F ? States ?
- [ ] `/hr/engagement` · **HR** · hooks: `→ features/hr/engagement` · §8: F ? States ?
- [ ] `/hr/feedback` · **HR** · hooks: `→ features/hr/feedback` · §8: L ? F ? States ?
- [ ] `/hr/goals` · **HR** · hooks: `→ features/hr/goals` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/kpis` · **HR** · hooks: `→ features/hr/kpis` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/compensation-planning` · **HR** · hooks: `→ features/hr/compensation` · §8: L ? F ? Perm ? States ?
- [ ] `/hr/retention` · **HR** · hooks: `→ features/hr/retention` · §8: F ? States ?

### Expenses & Travel
- [ ] `/hr/expenses` · **HR** · hooks: `→ features/hr/expenses` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/reimbursements` · **HR** · hooks: `→ features/hr/reimbursements` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/travel` · **HR** · hooks: `→ features/hr/travel` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/hr/travel/approvals` · **HR** · hooks: `→ features/hr/travel` · §8: L ? Perm ? States ?

### Documents & Templates
- [ ] `/hr/documents` · **HR** · hooks: `→ features/hr/documents` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/documents/editor/new` · **HR** · hooks: `→ features/hr/documents` · §8: C ? Perm ? States ?
- [ ] `/hr/documents/editor/[documentId]` · **HR** · hooks: `→ features/hr/documents` · §8: E ? D ? Perm ? States ?
- [ ] `/hr/documents/templates` · **HR** · hooks: `→ features/hr/documents` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/documents/templates/new` · **HR** · hooks: `→ features/hr/documents` · §8: C ? Perm ? States ?
- [ ] `/hr/documents/templates/[templateId]/edit` · **HR** · hooks: `→ features/hr/documents` · §8: E ? Perm ? States ?
- [ ] `/hr/document-types` · **HR** · hooks: `→ features/hr/documents` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/document-review` · **HR** · hooks: `→ features/hr/documents` · §8: L ? Perm ? States ?
- [ ] `/hr/handbook` · **HR** · hooks: `→ features/hr/handbook` · §8: E ? Perm ? States ?

### Org Chart & Structure
- [ ] `/hr/org` · **HR** · hooks: `→ features/hr/org` · §8: States ?
- [ ] `/hr/org-chart` · **HR** · hooks: `→ features/hr/org-chart` · §8: States ?

### Announcements & Communications
- [ ] `/hr/announcements` · **HR** · hooks: `→ features/hr/announcements` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/email-templates` · **HR** · hooks: `→ features/hr/email-templates` · §8: L ? C ? E ? D ? Perm ? States ?

### Assets & Devices
- [ ] `/hr/assets` · **HR** · hooks: `→ features/hr/assets` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/asset-returns` · **HR** · hooks: `→ features/hr/assets` · §8: L ? States ?
- [ ] `/hr/devices` · **HR** · hooks: `→ features/hr/devices` · §8: L ? C ? E ? D ? F ? P ? States ?

### Benefits, Equity, Payroll self-links
- [ ] `/hr/benefits` · **HR** · hooks: `→ features/hr/benefits` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/equity` · **HR** · hooks: `→ features/hr/equity` · §8: L ? F ? Perm ? States ?

### Compliance & Legal
- [ ] `/hr/compliance` · **HR** · hooks: `→ features/hr/compliance` · §8: L ? F ? Perm ? States ?
- [ ] `/hr/legal-holds` · **HR** · hooks: `→ features/hr/legal-holds` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/labor-relations` · **HR** · hooks: `→ features/hr/labor-relations` · §8: States ?
- [ ] `/hr/safety` · **HR** · hooks: `→ features/hr/safety` · §8: L ? F ? States ?
- [ ] `/hr/background-verification` · **HR** · hooks: `→ features/hr/bg-verification` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/identity` · **HR** · hooks: `→ features/hr/identity` · §8: L ? Perm ? States ?
- [ ] `/hr/accommodations` · **HR** · hooks: `→ features/hr/accommodations` · §8: L ? F ? States ?

### Offboarding & Exit
- [ ] `/hr/exit` · **HR** · hooks: `→ features/hr/exit` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/termination` · **HR** · hooks: `→ features/hr/termination` · §8: L ? Perm ? States ?
- [ ] `/hr/fnf` · **HR** · hooks: `→ features/hr/fnf` · §8: L ? F ? Perm ? States ?

### Positions, Workforce, Delegations
- [ ] `/hr/positions` · **HR** · hooks: `→ features/hr/positions` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/workforce` · **HR** · hooks: `→ features/hr/workforce` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/workforce-cost` · **HR** · hooks: `→ features/hr/workforce` · §8: F ? States ?
- [ ] `/hr/contingent` · **HR** · hooks: `→ features/hr/contingent` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/hr/delegations` · **HR** · hooks: `→ features/hr/delegations` · §8: L ? C ? D ? Perm ? States ?

### HR Analytics, Helpdesk, Cases
- [ ] `/hr/analytics` · **HR** · hooks: `→ features/hr/analytics` · §8: F ? States ✓ (HRMS audit H-02: reads are `INLINE_READ_ERROR`, so the page's own retry and no-people empty state are reachable)
- [ ] `/hr/helpdesk` · **HR** · hooks: `→ features/hr/helpdesk` · §8: L ? F ? P ? States ?
- [ ] `/hr/cases` · **HR** · hooks: `→ features/hr/cases` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/hr/service-delivery` · **HR** · hooks: `→ features/hr/service-delivery` · §8: States ?

### Misc HR
- [ ] `/hr/approvals` · **HR** · hooks: `→ features/hr/approvals` · §8: L ? Perm ? States ?
- [ ] `/hr/biometric` · **HR** · hooks: `→ features/hr/biometric` · §8: States ?
- [ ] `/hr/geofencing` · **HR** · hooks: `→ features/hr/geofencing` · §8: States ?
- [ ] `/hr/emergency` · **HR** · hooks: `→ features/hr/emergency` · §8: States ?
- [ ] `/hr/event-stream` · **HR** · hooks: `→ features/hr/event-stream` · §8: L ? F ? States ?
- [ ] `/hr/simulator` · **HR** · hooks: `→ features/hr/simulator` · §8: States ?

### HR Settings
- [ ] `/hr/settings` · **HR** · hooks: `→ features/hr/settings` · §8: E ? Perm ? States ?
- [ ] `/hr/settings/automations` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/company` · **HR** · hooks: `→ features/hr/settings` · §8: E ? Perm ? States ?
- [ ] `/hr/settings/custom-fields` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/forms` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/forms/[formId]` · **HR** · hooks: `→ features/hr/settings` · §8: E ? D ? Perm ? States ?
- [ ] `/hr/settings/forms/[formId]/submissions` · **HR** · hooks: `→ features/hr/settings` · §8: L ? F ? P ? States ?
- [ ] `/hr/settings/import-export` · **HR** · hooks: `→ features/hr/settings` · §8: States ?
- [ ] `/hr/settings/integrations` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? Perm ? States ?
- [ ] `/hr/settings/policies` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/preview` · **HR** · hooks: `→ features/hr/settings` · §8: States ?
- [ ] `/hr/settings/templates` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/versions` · **HR** · hooks: `→ features/hr/settings` · §8: L ? F ? States ?
- [ ] `/hr/settings/workflows` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?

### Access
- [ ] `/hr/access` · **HR** · hooks: `→ features/hr` · §8: Perm ? States ?

---

## Payroll

### Hub
- [ ] `/payroll` · **Payroll** · hooks: `useCommandCenter`, `useCreateRun`, `useCan("payroll:runs:view")`, `useCan("payroll:runs:manage")` · §8: States ✓ (loading/empty/error/denied all present)

### Core payroll operations
- [ ] `/payroll/runs` · **Payroll** · hooks: `→ features/payroll/runs` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/payroll/runs/[runId]` · **Payroll** · hooks: `→ features/payroll/runs` · §8: E ? D ? Perm ? States ?
- [ ] `/payroll/employees` · **Payroll** · hooks: `→ features/payroll/employees` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/payroll/employees/[employeeUserId]` · **Payroll** · hooks: `→ features/payroll/employees` · §8: E ? Perm ? States ?
- [ ] `/payroll/workers/[workerId]` · **Payroll** · hooks: `→ features/payroll/workers` · §8: E ? Perm ? States ?
- [ ] `/payroll/payslips` · **Payroll** · hooks: `→ features/payroll/payslips` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/payroll/bank-transfers` · **Payroll** · hooks: `→ features/payroll/bank-transfers` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/payroll/inputs` · **Payroll** · hooks: `→ features/payroll/inputs` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/payroll/bonuses` · **Payroll** · hooks: `→ features/payroll/bonuses` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/payroll/loans` · **Payroll** · hooks: `→ features/payroll/loans` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/payroll/reimbursements` · **Payroll** · hooks: `→ features/payroll/reimbursements` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/payroll/fnf` · **Payroll** · hooks: `→ features/payroll/fnf` · §8: L ? F ? Perm ? States ?
- [ ] `/payroll/taxes` · **Payroll** · hooks: `→ features/payroll/taxes` · §8: L ? F ? Perm ? States ?
- [ ] `/payroll/team` · **Payroll** · hooks: `→ features/payroll/team` · §8: L ? F ? States ?

### Configuration
- [ ] `/payroll/salary-structures` · **Payroll** · hooks: `→ features/payroll` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/payroll/components` · **Payroll** · hooks: `→ features/payroll` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/payroll/templates` · **Payroll** · hooks: `→ features/payroll` · §8: L ? C ? E ? D ? Perm ? States ?

### Reports & Setup
- [ ] `/payroll/reports` · **Payroll** · hooks: `→ features/payroll/reports` · §8: F ? States ?
- [ ] `/payroll/setup` · **Payroll** · hooks: `→ features/payroll/setup` · §8: E ? Perm ? States ?

### Settings
- [ ] `/payroll/settings` · **Payroll** · hooks: `→ features/payroll/settings` · §8: E ? Perm ? States ?
- [ ] `/payroll/settings/import-export` · **Payroll** · hooks: `requirePermission("payroll:reports:view")` (server) · §8: L ✗ C ✗ E ✗ D ✗ F ✗ P ✗ Perm ✓ States ✓ — server component; Suspense loading fallback; delegates entirely to feature component; import/export only, no CRUD

### Self-service
- [x] `/payroll/me` · **Payroll** [RETIRED 2026-08-30: file deleted; self-service pay is at `/me/pay` (no `requiredPermission`, universal for all active members)]

### Access
- [ ] `/payroll/access` · **Payroll** · hooks: `→ features/payroll` · §8: Perm ? States ?

---

## Accounting

### Hub
- [ ] `/accounting` · **Accounting** · hooks: `→ features/accounting/overview` · §8: States ?

### Invoices & Receivables
- [ ] `/accounting/invoices` · **Accounting** · hooks: `useInvoices`, `useInvoiceStats`, `useVoidInvoice`, `useCan("accounting:receivables:manage")` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓
- [ ] `/accounting/invoices/[invoiceId]` · **Accounting** · hooks: `→ features/accounting/sales` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/recurring-invoices` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/payments-received` · **Accounting** · hooks: `→ features/accounting` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/accounting/credit-notes` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/customers/[clientId]` · **Accounting** · hooks: `→ features/accounting` · §8: E ? D ? States ?
- [ ] `/accounting/customers` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/payment-reminders` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/aged-receivables` · **Accounting** · hooks: `→ features/accounting` · §8: F ? States ?

### Purchase & Payables
- [ ] `/accounting/purchase-bills` · **Accounting** · hooks: `usePurchaseBills`, `useCreatePurchaseBill`, `useCan("accounting:payables:approve")`, `useCan("accounting:payables:manage")` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓ — cursor pagination; search + status filters URL-synced; `EmptyState` with `EmptyExpensesIllustration` ✓; minor: empty state action shows "New bill" without checking `canManage`
- [ ] `/accounting/purchase-bills/new` · **Accounting** · hooks: `→ features/accounting/purchase-bills` · §8: C ? Perm ? States ?
- [ ] `/accounting/purchase-bills/[billId]` · **Accounting** · hooks: `→ features/accounting/purchase-bills` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/vendor-payments` · **Accounting** · hooks: `useVendorPayments`, `useCreateVendorPayment`, `useCan("accounting:payables:manage")` · §8: L ✓ C ✓ E ✗ D ✗ F ✓ P ✓ Perm ✓ States ✓ — dual cursor queries (paid + partial) merged; vendor filter URL-synced; `EmptyState` with `illustrationPreset="tasks"` ✓
- [ ] `/accounting/vendor-credits` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/vendors/[vendorId]` · **Accounting** · hooks: `→ features/accounting` · §8: E ? D ? States ?
- [ ] `/accounting/vendors` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/recurring-bills` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/aged-payables` · **Accounting** · hooks: `→ features/accounting` · §8: F ? States ?

### Chart of Accounts & Journal
- [ ] `/accounting/coa` · **Accounting** · hooks: `→ features/accounting/coa` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/coa/[accountId]` · **Accounting** · hooks: `useAccount`, `useAccountJournalEntries`, `useCan("accounting:accounts:update")`, `useCan("accounting:journal:manage")` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✓ — detail; Edit via `EditAccountDialog`; journal preview table capped at 20 rows (acceptable for preview); not-found uses bespoke div, not `EmptyState` (minor)
- [ ] `/accounting/journal` · **Accounting** · hooks: `useJournalEntries`, `useCan("accounting:journal:create")` · §8: L ✓ C ✓ E ✗ D ✗ F ✓ P ✓ Perm ✗ States ✓ — cursor pagination (pageSize 25, server mode); filters: date range, source, status, URL-synced; `useCan` gates create button only — no `enabled` view-gate on the list query (403-spam for non-finance roles); `EmptyState` with `EmptyReportIllustration` ✓
- [ ] `/accounting/journal/new` · **Accounting** · hooks: `useChartOfAccounts`, `useCreateJournalEntry`, `useCan("accounting:journal:create")` · §8: L ✗ C ✓ E ✗ D ✗ F ✗ P ✗ Perm ✓ States ✓ — create-only form; gate: `EmptyState illustrationPreset="security"` when `!canCreate`; `LoadingState` while accounts load; `ErrorState` if accounts fail; `LoadingButton` for submit
- [ ] `/accounting/journal/[entryId]` · **Accounting** · hooks: `useJournalEntry`, `usePostJournalEntry`, `useReverseJournalEntry`, `useSubmitJournalApproval`, `useCan("accounting:journal:post")`, `useCan("accounting:journal:approve")` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✓ — detail; post, submit-for-approval, approve, reject, reverse lifecycle; `LoadingState` and `ErrorState` ✓; not-found renders `ErrorState` ✓
- [ ] `/accounting/general-ledger` · **Accounting** · hooks: `→ features/accounting` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/accounting/opening-balances` · **Accounting** · hooks: `→ features/accounting` · §8: E ? Perm ? States ?
- [ ] `/accounting/dimensions` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? Perm ? States ?

### Banking
- [ ] `/accounting/banking` · **Accounting** · hooks: `→ features/accounting/banking` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/banking/[bankAccountId]` · **Accounting** · hooks: `→ features/accounting/banking` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/banking/import` · **Accounting** · hooks: `→ features/accounting/banking` · §8: C ? States ?
- [ ] `/accounting/banking/reconciliation` · **Accounting** · hooks: `→ features/accounting/banking` · §8: L ? F ? States ?
- [ ] `/accounting/banking/transfers` · **Accounting** · hooks: `→ features/accounting/banking` · §8: L ? C ? E ? D ? F ? P ? States ?

### Payments, Runs & Approvals
- [ ] `/accounting/payment-runs` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/accounting/payment-runs/[runId]` · **Accounting** · hooks: `→ features/accounting` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/approvals` · **Accounting** · hooks: `→ features/accounting` · §8: L ? Perm ? States ?

### Taxes
- [ ] `/accounting/taxes` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/taxes/codes` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/taxes/payments` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: L ? F ? P ? States ?
- [ ] `/accounting/taxes/reports` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: F ? States ?
- [ ] `/accounting/gstr-1` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: F ? States ?
- [ ] `/accounting/gstr-3b` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: F ? States ?

### Financial Reports
- [ ] `/accounting/profit-loss` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/balance-sheet` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/trial-balance` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/cash-flow` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/forecast` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/scenarios` · **Accounting** · hooks: `→ features/accounting/scenarios` · §8: L ? C ? E ? D ? States ?
- [ ] `/accounting/period-close` · **Accounting** · hooks: `→ features/accounting` · §8: Perm ? States ?

### Assets
- [ ] `/accounting/assets` · **Accounting** · hooks: `→ features/accounting/assets` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/assets/[assetId]` · **Accounting** · hooks: `useAsset`, `useActivateAsset`, `useDisposeAsset`, `useAssetCategories`, `useCan("accounting:assets:update")`, `useCan("accounting:assets:manage")` · §8: L ✗ C ✗ E ✓ D ✓ F ✗ P ✗ Perm ✓ States ✓ — detail page; Edit via `EditAssetSheet` (DRAFT); Dispose via `AlertDialog` + `EntityFormDialog` (ACTIVE); depreciation schedule table is bounded (usefulLifeMonths rows), no pagination needed
- [ ] `/accounting/assets/depreciation` · **Accounting** · hooks: `useDepreciationRuns`, `useCreateDepreciationRun`, `useReverseDepreciationRun`, `useCan("accounting:assets:manage")` · §8: L ✓ C ✓ E ✗ D ✗ F ✗ P ✗ Perm ✓ States ✓ — runs are immutable; reverse ≠ delete; list is bounded by accounting periods; `EmptyState` with `EmptyReportIllustration` ✓

### Budgets
- [ ] `/accounting/budgets` · **Accounting** · hooks: `useBudgets`, `useCreateBudget`, `useCan("accounting:budgets:create")` · §8: L ✓ C ✓ E ✗ D ✗ F ✓ P ✗ Perm ✗ States ✓ — ISSUES: (1) `pageSize: 100` hard-coded, no `pagination` prop on `DataTable` — budgets can grow past 100; (2) no view-gate: query fires unconditionally, 403-spams for non-finance roles; fix: `enabled: useCan("accounting:budgets:view")` on the hook; `EmptyState` with `EmptyReportIllustration` ✓
- [ ] `/accounting/budgets/[budgetId]` · **Accounting** · hooks: `useBudget`, `useSubmitBudget`, `useApproveBudget`, `useDuplicateBudget`, `useCan("accounting:budgets:update")`, `useCan("accounting:budgets:approve")` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✓ — detail; Edit = BudgetMatrix + duplicate; Submit/Approve lifecycle; not-found renders `ErrorState` ✓

### Expenses
- [ ] `/accounting/expenses` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/accounting/expenses/policies` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/expenses/receipts` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: L ? F ? P ? States ?
- [ ] `/accounting/expenses/reimbursements` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/accounting/expenses/reimbursements/[batchId]` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: E ? States ?

### Sub-reports
- [ ] `/accounting/reports` · **Accounting** · hooks: `→ features/accounting/reports` · §8: States ?
- [ ] `/accounting/reports/burn-rate` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/customer-statement` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/department-profitability` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/expense-by-category` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/project-profitability` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/sales-by-customer` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/sales-by-item` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/tax-summary` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/vendor-statement` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/working-capital` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?

### Settings
- [ ] `/accounting/settings` · **Accounting** · hooks: `useAccountingSettings`, `useUpdateAccountingSettings`, `useCan("accounting:settings:manage")` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✗ — company + tax registration forms; ISSUE: loading and error branches return bare `<div>` wrappers, not `PageWrapper` with `LoadingState`/`ErrorState`
- [ ] `/accounting/settings/automations` · **Accounting** · hooks: `→ features/accounting/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/settings/payment-providers` · **Accounting** · hooks: `→ features/accounting/settings` · §8: L ? C ? E ? Perm ? States ?
- [ ] `/accounting/setup` · **Accounting** · hooks: `→ features/accounting/setup` · §8: E ? Perm ? States ?
- [ ] `/accounting/access` · **Accounting** · hooks: `→ features/accounting` · §8: Perm ? States ?

---

## Inventory

### Hub
- [ ] `/inventory` · **Inventory** · hooks: `→ features/inventory/inventory-dashboard-client` · §8: States ?

### Products
- [ ] `/inventory/products` · **Inventory** · hooks: `useProducts`, `useCategories`, `useArchiveProduct`, `useRestoreProduct`, `useDeleteProduct`, `useCan("inventory:products:create/update/delete")` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓
- [ ] `/inventory/products/new` · **Inventory** · hooks: `→ features/inventory/products` · §8: C ? Perm ? States ?
- [ ] `/inventory/products/[productId]` · **Inventory** · hooks: `→ features/inventory/products` · §8: E ? D ? Perm ? States ?
- [ ] `/inventory/products/categories` · **Inventory** · hooks: `→ features/inventory/products` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/inventory/products/uom` · **Inventory** · hooks: `→ features/inventory/products` · §8: L ? C ? E ? D ? Perm ? States ?

### Stock Management
- [ ] `/inventory/stock` · **Inventory** · hooks: `→ features/inventory/stock` · §8: L ? F ? P ? States ?
- [ ] `/inventory/stock/adjustments` · **Inventory** · hooks: `→ features/inventory/stock` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/inventory/stock/movements` · **Inventory** · hooks: `→ features/inventory/stock` · §8: L ? F ? P ? States ?
- [ ] `/inventory/stock/transfers` · **Inventory** · hooks: `→ features/inventory/stock` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/stock/transfers/[transferId]` · **Inventory** · hooks: `→ features/inventory/stock` · §8: E ? D ? States ?

### Lots & Serials
- [ ] `/inventory/lots` · **Inventory** · hooks: `→ features/inventory/lots` · §8: L ? C ? F ? P ? States ?
- [ ] `/inventory/lots/[lotId]` · **Inventory** · hooks: `→ features/inventory/lots` · §8: E ? D ? States ?
- [ ] `/inventory/serials` · **Inventory** · hooks: `→ features/inventory/serials` · §8: L ? F ? P ? States ?
- [ ] `/inventory/serials/[serialId]` · **Inventory** · hooks: `→ features/inventory/serials` · §8: E ? D ? States ?

### Purchase & Sales Orders
- [ ] `/inventory/purchase-orders` · **Inventory** · hooks: `→ features/inventory/purchase-orders` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/purchase-orders/new` · **Inventory** · hooks: `→ features/inventory/purchase-orders` · §8: C ? Perm ? States ?
- [ ] `/inventory/purchase-orders/[poId]` · **Inventory** · hooks: `→ features/inventory/purchase-orders` · §8: E ? D ? Perm ? States ?
- [ ] `/inventory/sales-orders` · **Inventory** · hooks: `→ features/inventory/sales-orders` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/sales-orders/new` · **Inventory** · hooks: `→ features/inventory/sales-orders` · §8: C ? Perm ? States ?
- [ ] `/inventory/sales-orders/[soId]` · **Inventory** · hooks: `→ features/inventory/sales-orders` · §8: E ? D ? Perm ? States ?

### Warehouse Operations
- [ ] `/inventory/warehouses` · **Inventory** · hooks: `→ features/inventory/warehouses` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/inventory/warehouses/[warehouseId]` · **Inventory** · hooks: `→ features/inventory/warehouses` · §8: E ? D ? Perm ? States ?
- [ ] `/inventory/operations` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? States ?
- [ ] `/inventory/operations/receipts` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/picking` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/packing` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/shipping` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/returns` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/issues` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/shipments` · **Inventory** · hooks: `→ features/inventory/shipments` · §8: L ? F ? P ? States ?
- [ ] `/inventory/loads` · **Inventory** · hooks: `→ features/inventory/loads` · §8: L ? F ? P ? States ?
- [ ] `/inventory/packages` · **Inventory** · hooks: `→ features/inventory/packages` · §8: L ? F ? P ? States ?
- [ ] `/inventory/carriers` · **Inventory** · hooks: `→ features/inventory/carriers` · §8: L ? C ? E ? D ? Perm ? States ?

### Suppliers & 3PL
- [ ] `/inventory/vendors` · **Inventory** · hooks: `→ features/inventory/vendors` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/vendors/[vendorId]` · **Inventory** · hooks: `→ features/inventory/vendors` · §8: E ? D ? Perm ? States ?
- [ ] `/inventory/3pl` · **Inventory** · hooks: `→ features/inventory` · §8: States ?
- [ ] `/inventory/channels` · **Inventory** · hooks: `→ features/inventory` · §8: L ? C ? E ? D ? Perm ? States ?

### Quality
- [ ] `/inventory/quality` · **Inventory** · hooks: `→ features/inventory/quality` · §8: States ?
- [ ] `/inventory/quality/inspections` · **Inventory** · hooks: `→ features/inventory/quality` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/inventory/quality/holds` · **Inventory** · hooks: `→ features/inventory/quality` · §8: L ? F ? P ? States ?
- [ ] `/inventory/quality/recalls` · **Inventory** · hooks: `→ features/inventory/quality` · §8: L ? C ? F ? P ? States ?

### Counting & Audits
- [ ] `/inventory/cycle-counts` · **Inventory** · hooks: `→ features/inventory/cycle-counts` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/cycle-counts/[countId]` · **Inventory** · hooks: `→ features/inventory/cycle-counts` · §8: E ? D ? States ?
- [ ] `/inventory/physical-audits` · **Inventory** · hooks: `→ features/inventory/physical-audits` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/inventory/physical-audits/[auditId]` · **Inventory** · hooks: `→ features/inventory/physical-audits` · §8: E ? D ? States ?

### Analytics & Reporting
- [ ] `/inventory/forecasting` · **Inventory** · hooks: `→ features/inventory/forecasting` · §8: F ? States ?
- [ ] `/inventory/replenishment` · **Inventory** · hooks: `→ features/inventory/replenishment` · §8: L ? F ? States ?
- [ ] `/inventory/replenishment/rules` · **Inventory** · hooks: `→ features/inventory/replenishment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/inventory/reports/stock-summary` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/reports/movements` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/reports/slow-moving` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/reports/reorder` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/reports/expiry` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/expiry` · **Inventory** · hooks: `→ features/inventory` · §8: L ? F ? P ? States ?
- [ ] `/inventory/valuation` · **Inventory** · hooks: `→ features/inventory/valuation` · §8: F ? States ?
- [ ] `/inventory/costing` · **Inventory** · hooks: `→ features/inventory/costing` · §8: F ? States ?

### Misc
- [ ] `/inventory/barcode` · **Inventory** · hooks: `→ features/inventory` · §8: States ?
- [ ] `/inventory/import` · **Inventory** · hooks: `→ features/inventory` · §8: C ? States ?
- [ ] `/inventory/settings` · **Inventory** · hooks: `→ features/inventory/settings` · §8: E ? Perm ? States ?
- [ ] `/inventory/access` · **Inventory** · hooks: `→ features/inventory` · §8: Perm ? States ?

---

## Knowledge (Wiki / KB)

- [ ] `/knowledge/wiki` · **Knowledge** · hooks: `requireSession`, `RequireModule module="kb"`, `→ features/wiki` · §8: States ?
- [ ] `/knowledge/wiki/spaces` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/knowledge/wiki/spaces/[spaceId]` · **Knowledge** · hooks: `→ features/wiki` · §8: E ? D ? Perm ? States ?
- [ ] `/knowledge/wiki/pages/[pageId]` · **Knowledge** · hooks: `→ features/wiki` · §8: E ? D ? Perm ? States ?
- [ ] `/knowledge/wiki/pages/[pageId]/history` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/recent` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/favorites` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/private` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/shared` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? Perm ? States ?
- [ ] `/knowledge/wiki/templates` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/knowledge/wiki/trash` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/reviews` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? Perm ? States ?
- [ ] `/knowledge/wiki/import` · **Knowledge** · hooks: `→ features/wiki` · §8: C ? States ?
- [ ] `/knowledge/wiki/analytics` · **Knowledge** · hooks: `→ features/wiki` · §8: F ? Perm ? States ?
- [ ] `/knowledge/wiki/settings` · **Knowledge** · hooks: `→ features/wiki` · §8: E ? Perm ? States ?
- [ ] `/knowledge/chat` · **Knowledge** · hooks: `→ features/wiki` · §8: States ?

### Legacy
- [x] `/knowledge-base` · **Knowledge (legacy)** [RETIRED 2026-08-30: file deleted; canonical KB is at `/knowledge/wiki/**`]

---

## Me (Self-service — universal for all active members)

- [ ] `/me/attendance` · **Self-service** · hooks: `requirePermission("self:attendance")` (server), `→ features/me/attendance` · §8: L ? F ? P ? Perm ✗ States ? — VIOLATION: server component uses `requirePermission` with `self:*` key; §8/CLAUDE.md rule: `/me/*` must NEVER carry `requiredPermission` (universal for all active members)
- [ ] `/me/documents` · **Self-service** · hooks: `requirePermission("self:onboarding-docs")` (server), `→ features/me/documents` · §8: L ? P ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- [ ] `/me/expenses` · **Self-service** · hooks: `requirePermission("self:expenses")` (server), `→ features/me/expenses` · §8: L ? C ? E ? D ? F ? P ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- [ ] `/me/onboarding` · **Self-service** · hooks: `→ features/me/onboarding` · §8: States ?
- [ ] `/me/pay` · **Self-service** · hooks: `requirePermission(["self:payroll","self:payslips"])` (server), `→ features/me/pay` · §8: L ? F ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- [ ] `/me/recruitment` · **Self-service** · hooks: `requirePermission("self:recruitment")` (server), `→ features/me/recruitment` · §8: L ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed; internal job openings only, not the candidate pipeline
- [ ] `/me/time-off` · **Self-service** · hooks: `requirePermission("self:leaves")` (server), `→ features/me/time-off` · §8: L ? C ? F ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed

---

## Support

2026-09-10 RBAC-004 verification: Support automation create/edit now share ticket-only trigger options; the rendered editor regression passes 2/2. Backend ownership and manual-ticket-target regressions plus adjacent automation tests pass 115/115 across 8 suites. Scope, commands, red/green evidence and remaining integration/deployed proof are recorded in [the RBAC lane](../architecture-refactor/prd/completion-plan.md#rbac-004--enforce-support-automation-ownership-at-every-operation). This does not mark the unverified Support page checklist below complete.

### Hub & inbox
- [ ] `/support` · **Support** · hooks: `→ features/support` · §8: States ?
- [ ] `/support/inbox` · **Support** · hooks: `→ features/support/inbox` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/support/routing` · **Support** · hooks: `→ features/support/routing` · §8: L ? Perm ? States ?
- [ ] `/support/macros` · **Support** · hooks: `→ features/support/macros` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/support/knowledge-gaps` · **Support** · hooks: `→ features/support` · §8: L ? F ? States ?
- [ ] `/support/ai-report` · **Support** · hooks: `→ features/support` · §8: F ? States ?

### Support KB (internal help content)
- [ ] `/support/kb` · **Support** · hooks: `→ features/support/kb` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/support/kb/[articleId]` · **Support** · hooks: `→ features/support/kb` · §8: E ? D ? Perm ? States ?
- [ ] `/support/kb/research-briefs` · **Support** · hooks: `→ features/support/kb` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/support/kb/research-briefs/[briefId]` · **Support** · hooks: `→ features/support/kb` · §8: E ? D ? Perm ? States ?

### Portal (customer-facing)
- [ ] `/support/portal` · **Support** · hooks: `→ features/support/portal` · §8: L ? F ? P ? States ?
- [ ] `/support/portal/[portalTicketId]` · **Support** · hooks: `→ features/support/portal` · §8: E ? D ? States ?

### Reports
- [ ] `/support/reports` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/agent-performance` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/automation-performance` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/channel-performance` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/csat` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/queue-performance` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?

### Settings
- [ ] `/support/settings/agent-routing` · **Support** · hooks: `→ features/support/settings` · §8: E ? Perm ? States ?
- [ ] `/support/settings/audit-log` · **Support** · hooks: `→ features/support/settings` · §8: L ? F ? P ? States ?
- [ ] `/support/settings/automations` · **Support** · hooks: `→ features/support/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/support/settings/business-hours` · **Support** · hooks: `→ features/support/settings` · §8: E ? Perm ? States ?
- [ ] `/support/settings/channels` · **Support** · hooks: `→ features/support/settings` · §8: L ? C ? E ? Perm ? States ?
- [ ] `/support/settings/custom-fields` · **Support** · hooks: `→ features/support/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/support/settings/sla` · **Support** · hooks: `→ features/support/settings` · §8: L ? C ? E ? D ? Perm ? States ?

### Access
- [ ] `/support/access` · **Support** · hooks: `→ features/support` · §8: Perm ? States ?

---

## Surveys

- [ ] `/surveys` · **Surveys** · hooks: `→ features/surveys` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/surveys/new` · **Surveys** · hooks: `→ features/surveys` · §8: C ? Perm ? States ?
- [ ] `/surveys/[surveyId]` · **Surveys** · hooks: `→ features/surveys` · §8: E ? D ? Perm ? States ?
- [ ] `/surveys/[surveyId]/participants` · **Surveys** · hooks: `→ features/surveys` · §8: L ? States ?
- [ ] `/surveys/live/[sessionId]/host` · **Surveys** · hooks: `→ features/surveys` · §8: States ?
- [ ] `/surveys/access` · **Surveys** · hooks: `→ features/surveys` · §8: Perm ? States ?

---

## Workflows

- [ ] `/workflows` · **Workflows** · hooks: `useWorkflows`, `useCreateWorkflow`, `useDeleteWorkflow`, `useWorkflowStats` · §8: L ✓ C ✓ E ✓ D ✓ F ✗ P ✗ Perm ✗ States ✓ — ISSUES: (1) `limit: 50`, no pagination prop on `DataTable`; (2) no `useCan` gate on create button or list query; `EmptyState` with `EmptyProjectsIllustration` ✓; `AlertDialog` confirm on delete ✓
- [ ] `/workflows/[workflowId]` · **Workflows** · hooks: `→ features/workflows` · §8: E ? D ? Perm ? States ?
- [ ] `/workflows/[workflowId]/builder` · **Workflows** · hooks: `→ features/workflows/builder` · §8: E ? Perm ? States ?
- [ ] `/workflows/analytics` · **Workflows** · hooks: `→ features/workflows` · §8: F ? States ?
- [ ] `/workflows/approvals` · **Workflows** · hooks: `→ features/workflows` · §8: L ? Perm ? States ?
- [ ] `/workflows/executions` · **Workflows** · hooks: `→ features/workflows` · §8: L ? F ? P ? States ?
- [ ] `/workflows/scheduler` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? E ? D ? Perm ? States ?
- [x] `/workflows/secrets` · **Workflows** [RETIRED path: moved to `/workflows/settings/secrets`]
- [ ] `/workflows/templates` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? E ? D ? Perm ? States ?
- [x] `/workflows/variables` · **Workflows** [RETIRED path: moved to `/workflows/settings/variables`]
- [ ] `/workflows/access` · **Workflows** · hooks: `→ features/workflows` · §8: Perm ? States ?

### Settings (Workflows module)
- [ ] `/workflows/settings/access` · **Workflows** · hooks: `→ features/workflows/settings` · §8: Perm ? States ?
- [ ] `/workflows/settings/secrets` · **Workflows** · hooks: `→ features/workflows/settings` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/workflows/settings/variables` · **Workflows** · hooks: `→ features/workflows/settings` · §8: L ? C ? E ? D ? Perm ? States ?

---

## Sign (e-signature)

- [ ] `/sign` · **Sign** · hooks: `→ features/sign` · §8: States ?
- [ ] `/sign/envelopes` · **Sign** · hooks: `→ features/sign/envelopes` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/sign/envelopes/[envelopeId]` · **Sign** · hooks: `→ features/sign/envelopes` · §8: E ? D ? Perm ? States ?
- [ ] `/sign/bulk-send` · **Sign** · hooks: `→ features/sign` · §8: C ? Perm ? States ?
- [ ] `/sign/templates` · **Sign** · hooks: `→ features/sign/templates` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/sign/reports` · **Sign** · hooks: `→ features/sign/reports` · §8: F ? States ?
- [ ] `/sign/settings` · **Sign** · hooks: `→ features/sign/settings` · §8: E ? Perm ? States ?
- [ ] `/sign/access` · **Sign** · hooks: `→ features/sign` · §8: Perm ? States ?

---

## Timesheets

- [x] `/timesheets` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ✓ C ✓ F ✓ P ✓ Perm ✓ States ✓
- [x] `/timesheets/approvals` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ✓ Perm ✓ States ✓
- [x] `/timesheets/billing` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ✓ F ✓ P ✓ Perm ✓ States ✓
- [x] `/timesheets/exceptions` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ✓ F ✓ States ✓
- [x] `/timesheets/payroll` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ✓ F ✓ Perm ✓ States ✓
- [x] `/timesheets/reports` · **Timesheets** · hooks: `→ features/timesheets/reports` · §8: F ✓ States ✓
- [x] `/timesheets/settings` · **Timesheets** · hooks: `→ features/timesheets/settings` · §8: E ✓ Perm ✓ States ✓
- [x] `/timesheets/team` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ✓ F ✓ P ✓ States ✓
- [x] `/timesheets/access` · **Timesheets** · hooks: `→ features/timesheets` · §8: Perm ✓ States ✓

---

## Directory

- [ ] `/directory` · **Directory** · hooks: `→ features/directory` · §8: L ? F ? P ? States ?
- [ ] `/directory/workers` · **Directory** · hooks: `→ features/directory` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/directory/[personId]` · **Directory** · hooks: `→ features/directory` · §8: E ? D ? Perm ? States ?
- [ ] `/directory/access` · **Directory** · hooks: `→ features/directory` · §8: Perm ? States ?
- [ ] `/directory/settings` · **Directory (Administration view)** · hooks: `→ features/directory/people` · §8: L ? F ? Perm ? States ?
- [ ] `/directory/settings/[personId]` · **Directory (Administration view)** · hooks: `→ features/directory/people` · §8: E ? D ? Perm ? States ?

---

## Settings (Global Administration)

- [ ] `/settings` · **Settings** · hooks: `→ features/settings` · §8: States ✓ — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchAccountSettings` (`/sessions`, `/me/login-history?page=1&limit=5`, `/auth/mfa/status`); universal route, so the gate stays `enforceRouteAccess`. S01 (2026-09-02): the sessions panel had loading/empty but no error branch, so a failed `GET /sessions` rendered "No active sessions found" — a false all-clear on a security surface. `ErrorState` + retry added; `revokedCount` typed at the hook instead of two `as` casts.
- [ ] `/settings/users` · **Settings** · hooks: `→ features/settings/users` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ? — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchSettingsUsers` (`/v2/users`, `/users/stats`); the initial key is derived from server `searchParams` through `readUsersListState`, shared with the page
- [ ] `/settings/roles` · **Settings** · hooks: `→ features/settings/roles` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/roles/[roleId]` · **Settings** · hooks: `→ features/settings/roles` · §8: E ? D ? Perm ? States ?
- [ ] `/settings/roles/audit` · **Settings** · hooks: `→ features/settings/roles` · §8: L ? F ? P ? Perm ? States ? — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchRolesAudit` over `RBAC_AUDIT_INITIAL_FILTERS`
- [ ] `/settings/roles/simulate` · **Settings** · hooks: `→ features/settings/roles` · §8: States ? — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchRoleSimulation` (`/roles/simulate/candidates?limit=100`); the per-user simulate read stays client-side because it needs a selection
- [ ] `/settings/modules` · **Settings** · hooks: `→ features/settings/modules` · §8: L ? E ? Perm ? States ? — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchOrgModules`; converted from a client page + `DashboardGate` to a server wrapper with `requirePermission("settings:manage")` over `features/settings/modules/modules-page.tsx`
- [x] `/settings/organization` · **Settings** · hooks: `→ features/settings/organization` · §8: E ✓ Perm ? States ? — C10 residuals (2026-09-10): the edit/cancel/save protocol duplicated across six sections now has one owner, `useOrganizationSettingsForm`; branding 313 → 251, localization → 138, the page 165 → 80. Perm and States stay `?` — neither was verified in a browser. — S01 (2026-09-02): `mfaEnforced`, `allowedEmailDomains` and `ipAllowlist` were writable through both `PATCH /organization/settings` and `PATCH /organization/security` with different bounds and cache order; the security route is now the only writer, and the form's list bounds match the backend's 100-entry cap.
- [ ] `/settings/organization/branches` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/settings/organization/business-units` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/organization/chart` · **Settings** · hooks: `→ features/settings/organization` · §8: States ?
- [ ] `/settings/organization/cost-centers` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/organization/departments` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/organization/locations` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/organization/structure` · **Settings** · hooks: `→ features/settings/organization` · §8: States ?
- [ ] `/settings/organization/teams` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/billing` · **Settings** · hooks: `→ features/settings/billing` · §8: E ? Perm ? States ? — platform billing page 1 of 2; C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchBillingSettings(tab)` — the `?tab` param selects which reads are prefetched, and `/billing/seats` is skipped for a viewer without `billing:seats:view`
- [ ] `/settings/billing/ai-credits` · **Settings** · hooks: `→ features/settings/billing` · §8: L ? C ? Perm ? States ? — platform billing page 2 of 2; C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchAiCreditsSettings` (wallet, transactions, usage)
- [ ] `/settings/api-tokens` · **Settings** · hooks: `→ features/settings/api-tokens` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/settings/webhooks` · **Settings** · hooks: `→ features/settings/webhooks` · §8: L ? C ? D ? Perm ? States ? — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchSettingsWebhooks`; the `?size` param feeds the initial key
- [ ] `/settings/audit-log` · **Settings** · hooks: `→ features/settings/audit-log` · §8: L ? F ? P ? Perm ? States ? — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchSettingsAuditLog` (list + actions + target types); the initial key comes from `readAuditLogFilters(searchParams)`, shared with the page
- [ ] `/settings/delegations` · **Settings** · hooks: `→ features/settings/delegations` · §8: L ? C ✓ D ? Perm ? States ? — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchSettingsDelegations` (received, given, discovery members); each list keys off its own `received*`/`granted*` params. S01 (2026-09-02): neither side bounded the delegation window, so a delegation could be granted for a century — a permanent shadow role. Capped at 90 days in `delegation-policy.ts` and mirrored in the form schema.
- [ ] `/settings/incoming-transfer` · **Settings** · hooks: `→ features/settings/incoming-transfer` · §8: States ? — C8 (2026-09-10): classified NO PREFETCH NEEDED. `useIncomingOrgTransfers` declares `staleTime: 0` + `refetchOnMount: "always"`, so a hydrated offer is re-read on first mount anyway; a stale accept/decline offer is the one thing this page must not show. Pinned by `lib/prefetch/settings-prefetch-census.test.ts`

---

## Billing — Customer Invoicing

> These three routes are the org's own outbound customer invoicing (not platform billing). They are legitimate per root §8: "`/billing/invoices` is the org's own customer invoicing."

- [ ] `/billing/invoices` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/billing/invoices/new` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices` · §8: C ? Perm ? States ?
- [ ] `/billing/invoices/[invoiceId]` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices` · §8: E ? D ? Perm ? States ?

---

## Blog (authenticated admin)

- [ ] `/blog/access` · **Blog** · hooks: `→ features/blog` · §8: Perm ? States ?
- [ ] `/blog/admin` · **Blog** · hooks: `→ features/blog` · §8: L ? C ? E ? D ? Perm ? States ?

---

## Parties & Subjects

- [ ] `/parties` · **Platform** · hooks: `→ features/parties` · §8: L ? F ? P ? States ?
- [ ] `/subjects` · **Platform** · hooks: `→ features/subjects` · §8: L ? F ? P ? States ?

---

## Portal (authenticated — client portal management)

- [ ] `/portal` · **Build (client portal)** · hooks: `→ features/portal` · §8: L ? C ? Perm ? States ?
- [ ] `/portal/[projectId]` · **Build (client portal)** · hooks: `→ features/portal` · §8: E ? D ? Perm ? States ?

---

## Portal Group `(portal)` — external client portal

> External surface only — portal token auth (`portalApiClient`), no session JWT. Distinct from `(authenticated)/portal` (internal, session JWT, `useCan("build:portal:view")`).

- [ ] `/accept-invitation` · **Portal (client)** · hooks: `useAcceptInvitation`, `setPortalToken` · §8: L ✗ C ✗ E ✗ D ✗ F ✗ P ✗ Perm ✓ States ✓ — invitation acceptance flow; four states: missing token, loading, error (expired vs other), success redirect; StrictMode double-invoke guard via `calledRef`
- [x] `/projects` · **Portal (client)** [RETIRED 2026-08-30: file deleted; moved to `/client-portal`]
- [x] `/projects/[projectId]` · **Portal (client)** [RETIRED 2026-08-30: file deleted; moved to `/client-portal/[projectId]`]
- [ ] `/client-portal` · **Portal (client)** · hooks: `usePortalGuard`, `useExternalPortalProjects` · §8: L ? States ?
- [ ] `/client-portal/[projectId]` · **Portal (client)** · hooks: `usePortalGuard`, `usePortalProjectOverview` · §8: E ? States ?

---

## Public Group `(public)`

- [ ] `/about` · **Marketing** · hooks: none
- [ ] `/pricing` · **Marketing** · hooks: none
- [ ] `/contact` · **Marketing** · hooks: none
- [x] `/waitlist` · **Marketing** [RETIRED path: no page.tsx found on disk]
- [ ] `/design-system` · **Dev** · hooks: none — dev-only gallery
- [ ] `/legal/privacy` · **Marketing** · hooks: none
- [ ] `/legal/security` · **Marketing** · hooks: none
- [ ] `/legal/terms` · **Marketing** · hooks: none
- [ ] `/blogs` · **Marketing** · hooks: `→ features/blog` — disk path: `(public)/blogs/(site)/page.tsx`; `(site)` is a route group, not a URL segment
- [ ] `/blogs/[slug]` · **Marketing** · hooks: `→ features/blog`
- [ ] `/blogs/category/[slug]` · **Marketing** · hooks: `→ features/blog`
- [ ] `/blogs/tag/[tag]` · **Marketing** · hooks: `→ features/blog`
- [ ] `/careers/[orgSlug]` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/careers/[orgSlug]/jobs/[jobId]/apply` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/application-status/[token]` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/interview-booking/[token]` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/offer/[token]` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/nps/[token]` · **Support (public)** · hooks: `→ features/support`
- [ ] `/ticket-feedback/[token]` · **Support (public)** · hooks: `→ features/support`
- [ ] `/help/[orgId]` · **Support (public KB)** · hooks: `→ features/support/kb`
- [ ] `/help/[orgId]/[slug]` · **Support (public KB)** · hooks: `→ features/support/kb`
- [ ] `/forms/[token]` · **Build/HR (public forms)** · hooks: `→ features/forms`
- [ ] `/intake/[projectId]` · **Build (public intake)** · hooks: `→ features/build/intake`
- [ ] `/board/[shareToken]` · **Build (public board share)** · hooks: `→ features/build/board`
- [ ] `/wiki/[shareToken]` · **Knowledge (public wiki share)** · hooks: `→ features/wiki`
- [ ] `/roadmap/[orgId]` · **Build (public roadmap)** · hooks: `→ features/build/roadmap`
- [ ] `/live/[sessionCode]` · **Surveys (live session)** · hooks: `→ features/surveys/live`
- [ ] `/live-chat/[orgId]` · **Support (live chat widget)** · hooks: `→ features/support/chat`
- [ ] `/vendor-portal/[token]` · **Inventory/Accounting** · hooks: `→ features/vendor-portal`
- [ ] `/sign/[token]` · **Sign (public signing)** · hooks: `→ features/sign`
- [ ] `/s/[token]` · **Platform (short link)** · hooks: redirect
- [ ] `/refer/[orgId]` · **HR (public referral)** · hooks: `→ features/hr/recruitment`
- [ ] `/refer/link/[token]` · **HR (public referral)** · hooks: `→ features/hr/recruitment`
