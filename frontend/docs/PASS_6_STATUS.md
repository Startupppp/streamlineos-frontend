# Pass 6 — Alias removal + CASL/plan-gate scaffold

## TL;DR

Two threads in this pass:

1. **Removed 8 pointless `const X = Y` aliases** across the codebase and migrated their consumers. Includes `isSuperAdmin`, `baseUrl` (15+ consumers), and 5 hook aliases. tsc clean.
2. **Scaffolded the recommended RBAC + plan-gating libraries** (`@casl/ability` + a hand-rolled feature-gate config). Did **not** wire the provider into the root layout or migrate any consumer — waiting for your sign-off before that step.

---

## Thread 1 — Alias removal

| Removed alias | Action |
|---|---|
| `export const isSuperAdmin = isSuperAdminRole` (`lib/constants/roles.ts`) | Deleted. All 5 callers (`dashboard-gate.tsx`, 4 API routes) now use `isSuperAdminRole` from `@/lib/rbac/permissions` directly. |
| `export const baseUrl = appUrl` (`lib/email/sender.ts`) | Deleted, file now re-exports `appUrl`. 6 consumer files updated. |
| `export const baseUrl = appUrl` (`lib/email-templates/base.ts`) | Deleted, file now re-exports `appUrl`. 10+ consumer files updated. |
| `const baseUrl = appUrl` (`lib/email.ts`) | Deleted, in-file usages renamed to `appUrl`. |
| `export const baseUrl` re-export in `lib/email-templates/index.ts` | Replaced with `appUrl`. |
| `export const useRbacUserPermissions = useUserPermissions` (`lib/api/hooks/rbac.ts`) | Deleted (no consumers). |
| `export const useSlaAlerts = useLeadSlaAlerts` (`lib/api/hooks/leads.ts`) | Deleted, 1 consumer (`crm/reports/page.tsx`) updated. |
| `export const useMarkRead = useMarkChannelRead` (`lib/api/hooks/chat.ts`) | Deleted, 1 consumer (`features/chat/message-panel.tsx`) updated. |
| `export const useCreateDM = useCreateDMChannel` (`lib/api/hooks/chat.ts`) | Deleted, 1 consumer (`features/chat/new-dm-dialog.tsx`) updated via the `lib/hooks/trpc-hooks` barrel. |
| `export const useChatSearch = useChatSearchMessages` (`lib/api/hooks/chat.ts`) | Deleted (no consumers). |
| `export const toISODateString = formatDateOnly` (`lib/date-utils.ts`) | Deleted (no consumers). |

**Total: ~25 consumer files updated, 0 behavioural changes.** Same symbol behind a clearer name.

### Intentionally NOT removed (these are legitimate)

- Numeric/constant `const MOBILE_BREAKPOINT = 768`, `const ITEMS_PER_PAGE = 10`, etc. — these are named constants, not redundant aliases.
- `const Form = FormProvider` in `components/ui/form.tsx` — shadcn-ui shorthand, leave alone.
- Re-exports like `export { appUrl } from "./app-url"` (which I introduced) — these aren't variable assignments; they're module re-exports that organise the public API of `lib/email-templates/base.ts` and `lib/email/sender.ts`.

---

## Thread 2 — RBAC + plan-gating scaffold (NOT wired yet)

### Why CASL

After weighing the major options:

| Library | Verdict |
|---|---|
| **CASL (`@casl/ability` + `@casl/react`)** ✅ **picked** | In-process, ~17 KB, TS-first, ~8k stars, declarative `can/cannot` rules, supports dynamic abilities loaded from your existing `roles` DB table at runtime. Works with NextAuth + Next.js out of the box. No infra. |
| Cerbos / OpenFGA / Permit.io / Oso Cloud | All require a separate policy service (sidecar or SaaS). Overkill for an in-process app. |
| AccessControl (`accesscontrol`) | Older, weaker conditions than CASL. |
| better-auth RBAC plugin | Would require rewriting auth (you use NextAuth). |

### Why hand-rolled plan-gating

| Option | Verdict |
|---|---|
| **Hand-rolled config + `useFeature`/`requireFeature`** ✅ **picked** | Plans are stable. A `PLAN_FEATURES` map + 2 helpers is ~80 LOC and gives everything a service does for SaaS-tier gating. |
| Schematic | The SOTA SaaS entitlements service. Reach for it later if you want non-devs to manage plans via a dashboard. |
| GrowthBook / LaunchDarkly / Unleash | Feature-flag tools, not plan-tier tools. Wrong abstraction. |
| Stripe Entitlements | Worth wiring later if Stripe is the source of truth. The hand-rolled config can read from Stripe at that point. |

### Files added (scaffold only — not consumed yet)

| File | Purpose |
|---|---|
| `lib/abilities.ts` | `defineAbilityFor({ role, permissions })` builds a CASL `MongoAbility`. Super-admins get `can("manage", "all")`. For every permission string like `"hr:employees:view"`, it adds `can("view", "hr:employees")`. **Dynamic** — abilities are rebuilt from the DB-loaded permissions on every render, so admin/owner changes via `/api/roles` take effect on next request. |
| `lib/abilities-context.tsx` | `<AbilityContextProvider>` (wraps CASL's `AbilityProvider` with session + permission loading), `useAbility()`, `Can` (CASL's component re-exported). |
| `lib/billing/feature-gates.ts` | `PLANS = ["FREE","STARTER","PRO","ENTERPRISE"]`, `FEATURES` (22 features), `PLAN_FEATURES` map, `canUseFeature`, `meetsPlan`, `minPlanFor`. |
| `lib/billing/use-feature.ts` | `useFeature(feature)` React hook — returns `{ enabled, plan, requiredPlan }`. Reads `session.user.plan`. |
| `lib/billing/server-feature.ts` | `requireFeature(plan, feature)` returns a 402 NextResponse or `null` for API routes. |

### Packages installed

- `@casl/ability@7.0.0`
- `@casl/react@7.0.0`

### What's still needed before this is usable

1. **Wrap the dashboard tree in `<AbilityContextProvider>`** — needs to live in `app/(dashboard)/layout.tsx` (or wherever you have the providers).
2. **Add `plan` to NextAuth session** — currently `session.user` has `id`, `role`, etc. but no `plan`. Need to fetch the org's plan from DB during the session callback. Until this is done, `useFeature` will return `enabled: false` for everyone.
3. **Migrate consumers** — `dashboard-gate.tsx` is the natural first target. Then 30+ files that do `hasPermission(...)` checks could switch to `ability.can(...)`. Then AI buttons / feature pages can wrap in `useFeature("ai.lead-scoring").enabled`.

I deliberately did **not** do steps 1–3 in this pass because they need your sign-off on:
- The plan list (`FREE / STARTER / PRO / ENTERPRISE` — is that right?)
- The features-per-plan mapping in `lib/billing/feature-gates.ts` (which features go in which tier?)
- Whether to extend the NextAuth session shape now or wait

---

## Build state

- `pnpm exec tsc --noEmit` — clean
- Nothing committed (per rule)
- `.env` untouched (per rule)
- Auth pages untouched (per rule)

---

## Pass 7 — what I'll do once you confirm

1. Confirm `FREE / STARTER / PRO / ENTERPRISE` plan list (or adjust)
2. Confirm features-per-plan map
3. Add `plan` to the NextAuth session callback (1 file edit)
4. Wrap `app/(dashboard)/layout.tsx` in `<AbilityContextProvider>` (1 file edit)
5. Migrate `dashboard-gate.tsx` to use `useAbility()` internally (no API change for its consumers)
6. Wire one AI button (`ai-score-button.tsx`) to `useFeature("ai.lead-scoring")` as a proof-of-concept upgrade banner
7. Document the migration path for the other 30+ permission consumers + AI features

Estimated 2–3 hours once you confirm the plan/feature shape.
