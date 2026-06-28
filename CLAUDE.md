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

## State & effects
- Minimize useState and useEffect. No useEffect data fetching.
- Global/shared state: Zustand (or the repo's existing state management if different).
- No prop drilling more than 2 levels — use composition or context.

## Forms & validation
- react-hook-form + Zod schemas for every form. Proper per-field validation with visible error messages.
- Small forms → Dialog. Large forms (many fields or multi-section) → Sheet. Before building either, check how existing Sheets/Dialogs in the repo function (UI + UX) and follow the exact same format.

## Design system (source of truth: landing, /signin, /signup pages)
- Colors, typography, spacing, radius, shadows come ONLY from the tokens extracted from those pages (tailwind.config / globals.css). Never invent new colors or arbitrary values. Follow shadcn palette conventions mapped to the repo's detected palette.
- Compact, clean layout: remove unnecessary spacing, tighten cards, no oversized padding/margins. Rearrange page sections properly.
- Professional, modern, visually appealing, mobile-first responsive (verify 375 / 768 / 1280px), accessible (ARIA attributes, keyboard navigation).
- Notifications: Sonner toasts for success/error/info.

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
- DB SCHEMA is authored in the FRONTEND and synced to the backend: the Drizzle schema source-of-truth is `frontend/lib/db/schema/**`, and the Drizzle config + migrations live in `frontend/` (e.g. `frontend/migrations/`). After editing the schema source, run `pnpm sync:schema` to regenerate the backend copy (`backend/src/db/schema/**`, gitignored) and `pnpm check:schema` to drift-gate it — NEVER hand-edit the generated backend schema. The backend still OWNS all DB queries/transactions against that schema.
- All client data fetching through TanStack Query hooks in lib/api/ — no raw fetch/axios inside components. Handle loading/error via query states.
- Server components fetch on the server where possible; TanStack Query only for interactive client needs (mutations, polling, refetch, infinite scroll).
- Backend controllers (NestJS, REST): Zod validation on every body/param, consistent error shape, correct HTTP status codes. Business logic in the backend service layer; controllers stay thin.
- Build for scalability: stateless backend handlers (safe for clustering/multiple instances), no in-process state that breaks under horizontal scaling.
- Backend Drizzle + Neon: efficient queries — select only needed fields, no N+1 (proper joins), pagination on all lists, indexes where queries demand, transactions for multi-step writes, proper connection handling.
- Caching: backend uses Redis for read-heavy data with explicit invalidation on every mutation; the frontend uses sensible TanStack Query staleTime per data type. NEVER cache user/permission-specific data in shared caches.
- async/await everywhere; minimize globals.

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
- Folder structure (frontend): page/route files thin; client logic in lib/, shared UI in components/ui/, feature components in components/<feature>/, hooks in hooks/, types in types/ or co-located — all business logic + APIs live in the backend repo (Drizzle DB schema is authored in frontend/lib/db/schema and synced to the backend via pnpm sync:schema). Move misplaced files into this structure when fixing a page and update imports.
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
