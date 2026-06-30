# Project Rules — read fully before ANY change

You are an experienced full-stack engineer specializing in Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Drizzle ORM (Neon DB), and Redis. Always analyze the existing repository — structure, color palette, components, hooks, APIs, patterns — before implementing anything. Explore the repo completely; never assume structure. Reuse existing code, folders, and libraries first; install (pnpm) or create new ones only when absent, and minimally.

## Workflow (strict — page by page)
- We work PAGE BY PAGE. Never modify pages I haven't named.
- When I name a page: first AUDIT it and show me a plan (what you'll change, remove, add). Wait for my confirmation before editing.
- After fixing: run build + lint, fix all type/lint errors, then update PAGES.md (mark page done, one-line summary of changes).
- When I say "go", pick the next unchecked page in PAGES.md.
- If a task is ambiguous, ask briefly before coding.
- Check the rules in .claude/ before starting any task.
- Git: the ORCHESTRATOR may COMMIT verified work on the CURRENT branch between tasks; NEVER push, checkout, or run branch/merge/pull/fetch/reset/stash/rebase. Subagents/workflows NEVER run ANY git command — only the orchestrator commits.
- LIVING RULES: if during any fix I mention a new rule, preference, or correction, immediately add it to this CLAUDE.md under the correct section (concisely worded), confirm you added it, and follow it from that point on in every page.

## Code quality
- Readable, reusable, efficient, optimized, clean, extensible, scalable, maintainable, robust, secure code. SOLID principles.
- Strict TypeScript: no `any`, no type forcing/casting hacks, no `@ts-ignore`/`@ts-expect-error`. Everything well-typed.
- No anonymous functions for event handlers — create proper named handlers.
- No comments in code. Remove existing unwanted comments, commented-out code, and console.logs.
- Eliminate ALL dead code: unused imports, components, functions, hooks, types, APIs — and delete their files. Verify nothing else imports them afterward.
- Mentally test edge cases before finishing: errors, loading, empty data, network failures, invalid input, auth, concurrency.

## Component architecture
- Break into multiple components/files only when logically necessary (separation of concerns), never by default.
- Component priority: @custom/ or @shared/ if available → fallback to @ui/ (shadcn/ui). For error/loading/empty states use @pre-ui/ if it exists, else create minimal ones styled from the design tokens.
- Always reuse existing components. Never create a new component if an existing one (or a variant) can serve.
- Lazy-load heavy client components (dynamic import). Use React.memo/useMemo only for measured performance-critical parts.
- **Folder structure (STRICT):** Feature-specific components MUST live under `features/<featurename>/components/` and feature libs under `features/<featurename>/lib/`. NEVER use `_components/` or `_lib/` inside `app/` route folders — these conventions are banned. The `app/` folder contains only route files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`). All reusable UI components go in `components/`, feature components in `features/<featurename>/`.

## State & effects
- Minimize useState and useEffect. **NEVER use useEffect to trigger API calls** — use TanStack Query (`useQuery` for fetching, `useMutation` for writes) exclusively. `useEffect` is for DOM synchronization, subscriptions, and framework-level concerns only; it is never a trigger for network requests.
- Global/shared state: Zustand (or the repo's existing state management if different).
- No prop drilling more than 2 levels — use composition or context.
- Any `useEffect` that fires a mutation, API call, or irreversible side-effect MUST guard against React StrictMode double-invoke: `const calledRef = useRef(false); if (calledRef.current) return; calledRef.current = true;`. Reset the ref only inside a user-initiated retry handler — never unconditionally on re-render.

## Forms & validation
- react-hook-form + Zod schemas for every form. Proper per-field validation with visible error messages.
- Small forms → Dialog. Large forms (many fields or multi-section) → Sheet. Before building either, check how existing Sheets/Dialogs in the repo function (UI + UX) and follow the exact same format.

## Design system (source of truth: landing, /signin, /signup pages)
- Colors, typography, spacing, radius, shadows come ONLY from the tokens extracted from those pages (tailwind.config / globals.css). Never invent new colors or arbitrary values. Follow shadcn palette conventions mapped to the repo's detected palette.
- Compact, clean layout: remove unnecessary spacing, tighten cards, no oversized padding/margins. Rearrange page sections properly.
- Professional, modern, visually appealing, mobile-first responsive (verify 375 / 768 / 1280px), accessible (ARIA attributes, keyboard navigation).
- Notifications: Sonner toasts for success/error/info.

## Animations & UI quality (enforced on every page/component)
- Every page and component must feel like a $10k+ SaaS product — polished, spacious, purposeful. No default-looking buttons, no flat boring cards.
- Use Framer Motion for all page/step transitions (`AnimatePresence` + `motion.div` with slide+fade), list stagger, and element entrance animations. Import from `framer-motion`.
- Step/route transitions: `initial={{ opacity:0, x:24 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-24 }}` with `duration:0.22, ease:"easeOut"`. Wrap with `<AnimatePresence mode="wait">`.
- All CTA/primary buttons use a gradient: `bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200`.
- Selection cards/chips: scale + border glow on hover and selected state (`hover:scale-[1.02] hover:shadow-md border-violet-500 bg-violet-50`).
- Progress bars animate their fill: `transition: width 0.4s ease` with gradient fill.
- All interactive elements have micro-interactions: hover lift/scale, `whileTap={{ scale:0.97 }}` on buttons.
- Cards: `bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60`.
- Full-page backgrounds: `bg-gradient-to-br from-slate-50 via-white to-violet-50/40`.
- List items entering sequentially use staggered animation (`delay: idx * 0.08`).
- Completion/success states: spring bounce animation + confetti where appropriate.

## Layout & states (every page must satisfy ALL)
- Loading: skeletons matching the real layout, not lone spinners.
- Empty state: must fill the proper available content height (flex-1 / h-full within the content area) with icon + message + primary action. Never a small floating text block.
- Error state: friendly message + retry.
- Long content scrolls INSIDE the main content area only. Sidebar and page shell must NEVER scroll with the page (sidebar h-screen sticky; main content overflow-y-auto).
- No unintended overflow or unnecessary scrollbars: use min-w-0, truncate, flex-1, and proper overflow handling instead of fixed heights that burst.
- If a feature depends on an unconnected integration (calendar, payment provider, etc.), the page must show a clear "Connect X" banner/prompt with a connect action — never fail silently or render broken data.

## Feature completeness (per page)
- For the feature/category the page belongs to, verify everything needed exists (list, create, edit, delete, filters, pagination, permissions, states). ADD what's missing; REMOVE what's not required.
- Remove unnecessary components, cards, types, hooks, APIs — including their files — and rearrange remaining files into the proper folder structure, updating imports.
- Onboarding/profile forms collect ONLY the fields a real HR platform asks a new joiner (personal: phone, DOB, gender, home address, emergency contact; bank/payroll; ID & document uploads). Exclude recruitment-only data (years of experience, skills).
- The employee onboarding form is never shown to org owners or platform/super admins — gate server-side and redirect them away (owner → their setup/dashboard, platform admin → /owner).

## API & data
- BACKEND OWNS ALL APIs & BUSINESS LOGIC: every REST API/route handler/controller and business-logic service is written in the BACKEND repo (NestJS `streamlineos-api`) ONLY — never under this frontend repo. This frontend holds only UI, client state, and TanStack Query hooks (lib/api/) that call the backend API. Do NOT add new `app/api/**` business route handlers or `lib/services/**` business logic here (the only `app/api/**` allowed are NextAuth/auth-bridge routes); put business logic in the backend.
- DB SCHEMA source-of-truth is in the BACKEND: `backend/src/db/schema/**`. The Drizzle config (`backend/drizzle.config.ts`) and migrations (`backend/migrations/`) also live in the backend. Run `pnpm -C backend db:generate` / `pnpm -C backend db:push` / `pnpm -C backend db:migrate` for migration work — NEVER from the frontend. The frontend keeps a MINIMAL auth-only schema at `frontend/lib/db/schema/` (only enums.ts, auth.ts, shared.ts) solely for NextAuth's DrizzleAdapter — do NOT add business-domain tables there. Do NOT use `pnpm sync:schema` or `pnpm check:schema` (retired).
- All client data fetching through TanStack Query hooks in lib/api/ — no raw fetch/axios inside components. Handle loading/error via query states.
- Server components fetch on the server where possible; TanStack Query only for interactive client needs (mutations, polling, refetch, infinite scroll).
- Backend controllers (NestJS, REST): Zod validation on every body/param, consistent error shape, correct HTTP status codes. Business logic in the backend service layer; controllers stay thin.
- Build for scalability: stateless backend handlers (safe for clustering/multiple instances), no in-process state that breaks under horizontal scaling.
- Backend Drizzle + Neon: efficient queries — select only needed fields, no N+1 (proper joins), pagination on all lists, indexes where queries demand, transactions for multi-step writes, proper connection handling.
- Caching: backend uses Redis for read-heavy data with explicit invalidation on every mutation; the frontend uses sensible TanStack Query staleTime per data type. NEVER cache user/permission-specific data in shared caches.
- async/await everywhere; minimize globals.
- Schema normalization (enforced): entities with their own lifecycle — invitations, approvals, events, documents, audit entries, tasks — MUST be normalized into separate DB tables with their own PK, org_id FK, status, created_at, and indexes. Never store them as JSONB arrays embedded in a parent record; JSON arrays cannot be individually indexed, paginated, updated atomically, or soft-deleted.
- API efficiency (enforced): deduplicate concurrent identical inflight requests (e.g. token fetch, session fetch) with a shared Promise variable — never let N simultaneous callers each kick off the same network call. All `useMutation` hooks MUST include `mutationKey`; all `useQuery` hooks MUST include a `staleTime` calibrated to data volatility (session/org: 5min, permissions: 30s, list data: 30s–2min).
- Backend API quality standard (senior engineer level): every table has UUID/BIGSERIAL PK; every org-scoped table has a non-nullable `org_id` FK with index; composite indexes `(org_id, status, created_at DESC)` for common list queries; multi-step writes always in a single DB transaction; atomic upserts (`INSERT … ON CONFLICT DO UPDATE`) for counters/idempotent creates; no full-table scans; all list endpoints paginated (hard cap 100/page); soft-delete with `deleted_at` for audit trail; Zod validation on every body/param.

## Security
- Every protected backend endpoint verifies session + permission server-side (requirePermission()); frontend server actions / auth-bridge routes do the same where they exist. Client-side checks are UX only — middleware.ts alone is never sufficient.
- Sanitize/validate all inputs (Zod, Joi where suited; validator.js where needed). Parameterized queries via ORM only — no SQL/NoSQL injection vectors. XSS/CSRF protection, secure cookies (httpOnly, SameSite).
- Avoid inline styles and inline scripts.
- Integrate the repo's existing auth (sessions / JWT / OAuth) — never build a parallel auth path. bcrypt for passwords.
- Rate limiting on sensitive endpoints (auth, trades, payments). Helmet-style secure headers. Proper CORS. HTTPS-only assumptions (secure cookies, no mixed content).
- No hard-coded secrets — env vars (dotenv) only. Validate file uploads. Log sensitive actions without exposing data. Audit dependencies (pnpm audit).

## Next.js best practices
- Access/role REDIRECT gating (who may land on a route, role-based home redirects) lives in middleware ONLY — never duplicate role redirects in page or layout components. This is routing UX and does NOT replace data-layer security: the backend re-verifies session + permission server-side on every endpoint (see Security).
- App Router conventions: server components by default; "use client" only when needed and as deep in the tree as possible.
- next/image for all images, next/link for navigation.
- Dynamic route segments and their params use DESCRIPTIVE resource names, never a bare `id` — backend route params (`:projectId`, `:ticketId`, `:goalId`) and frontend page segments (`app/(authenticated)/projects/[projectId]`) — and the destructured variable matches (`const { projectId } = await ctx.params`). Never `[id]`.
- Folder structure (frontend): page/route files thin; client logic in lib/, shared UI in components/ui/, feature components in components/<feature>/, hooks in hooks/, types in types/ or co-located — all business logic + APIs live in the backend repo (Drizzle DB schema source-of-truth is in backend/src/db/schema; the frontend only holds a minimal auth-only schema for NextAuth). Move misplaced files into this structure when fixing a page and update imports.
- Logging: use the repo's logger (or Winston-style structured logging server-side); global error handling, graceful 500s.
- Code must be implicitly testable; add minimal tests if the repo has a test setup.

## Best practices (enforced — from OWASP/NestJS/Next.js/Drizzle/TanStack + KB review)
- AUTHORIZATION (OWASP API A01/BOLA): every endpoint that takes a resource id must re-assert the caller's access to THAT resource (org + space/record), on reads AND writes — module/role ability alone is insufficient. Centralize in an access service and call it in every mutating method, not just reads.
- AI METERING: reserve/consume credits atomically BEFORE the paid model/embedding call; refund (grant back) only on provider failure. Never check-then-spend (the LLM must not run between hasCredits and consume).
- PUBLIC/UNAUTHENTICATED endpoints: rate-limit per IP (+org), entitlement-gate, and meter any AI/LLM work against the tenant's credits; anonymous traffic must never spend the platform's shared LLM budget (denial-of-wallet). Short-circuit before embedding when the org has no eligible content.
- HTTP semantics: GET/HEAD are safe + idempotent — no writes inside a GET. Counters/state changes go through POST/PATCH/DELETE (or an async side channel).
- DB/Drizzle: free-text search uses a tsvector+GIN column (or pg_trgm), never leading-wildcard ILIKE; composite indexes ordered most-selective-first to cover filter+sort+FK; select only needed columns (project access-check queries); multi-step writes run in a transaction; user-action counters (votes/reactions) need a unique (org,resource,actor) index + upsert (increment only on net-new).
- Pagination: every list endpoint (including public) is paginated with a hard cap.
- Caching: public read-only GETs set Cache-Control (s-maxage + stale-while-revalidate per volatility); never cache user/permission-scoped data in a shared cache.
- TanStack Query: invalidate with a true key PREFIX (no trailing `undefined` slot) so list caches actually match; per-data-type staleTime; client request/response types must match the backend Zod contract (no hand-maintained drift — extra fields are silently stripped and become silent no-ops).
- Testing: a new module ships controller e2e specs (auth + RBAC + scope allow/deny, credit exhaustion) and unit tests for access/credit/permission logic before it is considered done.
- Sources: OWASP API Security Top 10 (2023); NestJS docs (validation/controllers); Next.js App Router data-fetching; Drizzle perf-queries; TanStack Query invalidation.

## Output format
- During the audit step: a concise plan listing violations and intended changes.
- During the fix step: only the modified/added/deleted file paths with changes. No long explanations unless clarifying a decision.

Decompose into independent tasks, use the Task tool to dispatch each one to a separate subagent in parallel, and commit between tasks

## RBAC implementation guide (read this before adding any new feature)

StreamlineOS uses a server-resolved RBAC engine (NOT JWT-embedded permissions). The backend resolves permissions from DB on every request via `AccessService`. CASL is fully removed from the backend; the frontend keeps `lib/abilities.ts` only for server-side SSR helpers.

### Permission key format
Always `"module:resource:action"` — e.g. `"hr:employees:view"`, `"crm:leads:create"`, `"inventory:stock:read"`. Three colon-separated segments, all lowercase.

### Key files
- **Permission catalog** (source of truth): `backend/src/modules/rbac/permissions.constants.ts` — `PERMISSIONS` array + `ROLE_DEFAULT_PERMISSIONS` map
- **DB schema**: `backend/src/db/schema/access.ts` (source of truth in backend)
- **AccessService**: `backend/src/modules/access/access.service.ts` — resolves snapshots, caches per (userId, orgId), degrades gracefully pre-migration
- **PermissionGuard**: `backend/src/modules/access/permission.guard.ts` — NestJS guard that reads `@RequirePermission` metadata and calls `authorize()`
- **Scope helpers**: each module has `*-scope.ts` (e.g. `leads-scope.ts`, `projects-scope.ts`) following the `applyScope(query, scope, userId)` pattern
- **Frontend hooks**: `frontend/lib/api/hooks/access.ts` — `useCan(key)`, `useAccess()` 
- **Frontend components**: `frontend/components/auth/can.tsx` — `<Can permission="...">`, `<RequireModule module="...">`, `useModuleEnabled(module)`

### Adding a new backend endpoint with RBAC (required for every new protected endpoint)

1. **Add the permission key to the catalog** (`permissions.constants.ts`):
   ```ts
   // In PERMISSIONS array:
   { name: "mymodule:resource:action", description: "...", scopable: false }
   // If this should be granted by default to a role, add to ROLE_DEFAULT_PERMISSIONS:
   MANAGER: ["mymodule:resource:action", ...]
   ```

2. **Decorate the controller method**:
   ```ts
   import { PermissionGuard } from "../access/permission.guard";
   import { RequirePermission } from "../access/require-permission.decorator";
   
   @UseGuards(JwtAuthGuard)
   @Controller("mymodule")
   export class MyController {
     @Get()
     @UseGuards(PermissionGuard)
     @RequirePermission("mymodule:resource:view")
     listItems(@CurrentUser() u: CurrentUserContext) { ... }
   }
   ```
   Note: `@UseGuards(JwtAuthGuard)` on the class + `@UseGuards(PermissionGuard)` + `@RequirePermission` on each method.

3. **For list endpoints, apply DataScope filtering** — create `mymodule-scope.ts`:
   ```ts
   // backend/src/modules/mymodule/mymodule-scope.ts
   import { applyScope } from "../access/apply-scope";
   import type { DataScope } from "../access/access.types";
   
   export function applyMyModuleScope<T extends { assignedToId?: string }>(
     query: T[], scope: DataScope, userId: string
   ): T[] { return applyScope(query, scope, userId, "assignedToId"); }
   ```
   Then in the service, read scope from the request (set by PermissionGuard on `req.rbacScope`) and apply it.

4. **Call `bumpPermissionsVersion` on every role/permission mutation** in the same DB transaction:
   ```ts
   await tx.insert(rolePermissionGrants).values(...);
   await bumpPermissionsVersion(tx, orgId);
   ```

5. **Cache invalidation**: call `this.cache.del(CACHE_KEYS.access(userId, orgId))` in any service that modifies role assignments or grants.

### Adding frontend permission gates

1. **In client components** — use `useCan`:
   ```tsx
   import { useCan } from "@/lib/api/hooks/access";
   
   function MyComponent() {
     const canCreate = useCan("mymodule:resource:create");
     return canCreate ? <CreateButton /> : null;
   }
   ```

2. **Declarative gate** — use `<Can>` from `components/auth/can.tsx`:
   ```tsx
   import { Can } from "@/components/auth/can";
   <Can permission="mymodule:resource:delete">
     <DeleteButton />
   </Can>
   ```

3. **Module on/off gate** — use `<RequireModule>` or `useModuleEnabled`:
   ```tsx
   import { RequireModule, useModuleEnabled } from "@/components/auth/can";
   <RequireModule module="mymodule"><PageContent /></RequireModule>
   ```

4. **Server-side pages** — use `requirePermission` in server components:
   ```ts
   import { requirePermission } from "@/lib/rbac/require-permission";
   const { session } = await requirePermission("mymodule:resource:view");
   ```

5. **Add TanStack Query hooks** in `frontend/lib/api/hooks/mymodule.ts` — use `apiClient` from `lib/api-client.ts`.

### Adding frontend roles admin support for new permission keys
After adding new keys to `permissions.constants.ts`, they automatically appear in the roles admin permission matrix at `/settings/roles`. No frontend changes needed — the matrix reads from `GET /rbac/permissions`.

### DB migration for schema changes
1. Edit `backend/src/db/schema/access.ts` (source of truth in backend)
2. Run `pnpm -C backend db:generate` to generate the migration file
3. Run `pnpm -C backend db:push` or `pnpm -C backend db:migrate` to apply (requires TTY + pre-existing enums `data_scope` and `principal_group_type`)
4. Run backfill after first deploy: `pnpm -C backend backfill:rbac`

### RBAC runtime notes
- The RBAC tables (`user_roles`, `role_permission_grants`, `group_roles`, `access_versions`) must exist for the engine to work. Before migration, `AccessService` degrades gracefully to legacy CASL fallback.
- Org owners always have all permissions — `isOrgOwner: true` bypasses all checks.
- Platform/super admins (`isPlatformAdmin: true`) bypass all checks.
- Permission resolution is cached per (userId, orgId) in Redis with TTL. Cache is busted by `bumpPermissionsVersion` (called in same tx as every role/permission mutation).
- `DataScope` values: `"all"` (see everything), `"team"` (same dept), `"own"` (assignedToId === userId), `"none"` (blocked).
- The `rbacScope` is set on `req` by `PermissionGuard` and must be read in the service to filter results.

### NEVER do
- Never add `@CheckAbility` or `AbilityGuard` — CASL is removed from backend
- Never use `requireAuthorize(u, {...})` or `hasRoleOrPrivileged` — these are the old access helpers, deleted
- Never skip `@RequirePermission` on a protected endpoint — ungated endpoints are a security hole
- Never read `req.user.permissions` for access decisions — use `PermissionGuard` + `AccessService` instead (JWT permissions are stale; DB is authoritative)
- Never add permissions without a corresponding catalog entry in `permissions.constants.ts`

## RBAC Implementation Guide

StreamlineOS uses a dynamic server-resolved RBAC system (NOT CASL). Permission keys use the format `module:resource:action` (e.g. `hr:employees:view`, `crm:leads:create`). Resolved server-side via `GET /me/access` — never in JWT claims.

### Permission key naming convention
`{module}:{resource}:{action}` where action is one of: view, create, update, delete, manage, assign, export, approve, reject, import

### Adding RBAC to a new backend endpoint

1. **Add the permission key to the catalog** in `backend/src/modules/rbac/permissions.constants.ts`:
   ```typescript
   "newmodule:resource:view",   // read list/detail
   "newmodule:resource:create", // create
   "newmodule:resource:update", // edit
   "newmodule:resource:delete", // delete
   ```

2. **Add default role grants** in `backend/src/modules/rbac/role-templates.constants.ts` under `ROLE_DEFAULT_PERMISSIONS` for the appropriate system roles (BRANCH_HR, BRANCH_MANAGER, SALES, etc.).

3. **Decorate the controller method**:
   ```typescript
   import { RequirePermission } from "@/modules/access/authorize.decorator";
   import { PermissionGuard } from "@/modules/access/permission.guard";
   import { UseGuards } from "@nestjs/common";

   @UseGuards(JwtAuthGuard, PermissionGuard)
   @RequirePermission("newmodule:resource:view")
   @Get()
   async list(@Req() req: RequestWithUser) { ... }
   ```

4. **Apply DataScope row filtering** (for resources owned by users):
   - Create `backend/src/modules/newmodule/newmodule-scope.ts`:
     ```typescript
     import { DataScope } from "@/modules/access/access.types";
     export function applyNewmoduleScope(query: Partial<NewmoduleWhere>, actor: { userId: number }, scope: DataScope) {
       if (scope === "own") return { ...query, assignedToId: actor.userId };
       if (scope === "none") return { ...query, assignedToId: -1 };
       return query;
     }
     ```
   - In the service list method, read `req.rbacScope` (set by PermissionGuard) and call the scope helper.

5. **Role/permission mutations must call bumpPermissionsVersion** inside the same transaction:
   ```typescript
   await this.db.transaction(async (tx) => {
     await tx.insert(rolePermissionGrants).values(...);
     await this.accessService.bumpPermissionsVersion(orgId, tx);
   });
   ```

### Adding RBAC to a new frontend component

1. **Gate UI elements with useCan()**:
   ```typescript
   import { useCan } from "@/lib/api/hooks/access";

   function MyComponent() {
     const canCreate = useCan("newmodule:resource:create");
     const canDelete = useCan("newmodule:resource:delete");

     return (
       <div>
         {canCreate && <Button onClick={handleCreate}>Create</Button>}
         {canDelete && <Button onClick={handleDelete}>Delete</Button>}
       </div>
     );
   }
   ```

2. **Check module enabled**:
   ```typescript
   import { useModuleEnabled } from "@/lib/api/hooks/access";
   const isEnabled = useModuleEnabled("newmodule");
   ```

3. **Server-side page protection** (server components):
   ```typescript
   import { requirePermission } from "@/lib/rbac/require-permission";
   export default async function Page() {
     await requirePermission("newmodule:resource:view");
     // ... rest of page
   }
   ```

### Key files — do not delete
- `frontend/lib/api/hooks/access.ts` — useAccess, useCan, useModuleEnabled hooks
- `frontend/lib/abilities.ts` — lightweight server-side AppAbility (NON-CASL; used by require-permission.ts)
- `frontend/lib/rbac/require-permission.ts` — server-side permission check for page components
- `backend/src/modules/access/access.service.ts` — resolvePermissions, bumpPermissionsVersion
- `backend/src/modules/access/permission.guard.ts` — PermissionGuard (sets req.rbacScope)
- `backend/src/modules/access/authorize.decorator.ts` — @RequirePermission decorator
- `backend/src/modules/access/apply-scope.ts` — applyScope helper
- `backend/src/modules/rbac/permissions.constants.ts` — full permission catalog
- `backend/src/modules/rbac/role-templates.constants.ts` — default role→permission grants
- `backend/src/scripts/backfill-rbac-access.ts` — seeds default grants (run once after migration)

### DataScope values
- `"all"` — user sees all records in the org
- `"team"` — user sees records in their department
- `"own"` — user sees only their own records
- `"none"` — user sees nothing (deny)

### NEVER
- Never use @CheckAbility or AbilityGuard (deleted — was CASL)
- Never use useAbility() (deleted — was CASL)
- Never import from "@casl/ability" or "@casl/react"
- Never import from "@/lib/abilities-context" (deleted)
- Never put permission checks in JWT claims — always resolve server-side via /me/access
- Never skip bumpPermissionsVersion when mutating role/permission tables
