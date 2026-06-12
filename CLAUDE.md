# Project Rules — read fully before ANY change

You are an experienced full-stack engineer specializing in Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Drizzle ORM (Neon DB), and Redis. Always analyze the existing repository — structure, color palette, components, hooks, APIs, patterns — before implementing anything. Explore the repo completely; never assume structure. Reuse existing code, folders, and libraries first; install (pnpm) or create new ones only when absent, and minimally.

## Workflow (strict — page by page)
- We work PAGE BY PAGE. Never modify pages I haven't named.
- When I name a page: first AUDIT it and show me a plan (what you'll change, remove, add). Wait for my confirmation before editing.
- After fixing: run build + lint, fix all type/lint errors, then update PAGES.md (mark page done, one-line summary of changes).
- When I say "go", pick the next unchecked page in PAGES.md.
- If a task is ambiguous, ask briefly before coding.
- Check the rules in .claude/ before starting any task.
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

## API & data
- All client data fetching through TanStack Query hooks in lib/api/ — no raw fetch/axios inside components. Handle loading/error via query states.
- Server components fetch on the server where possible; TanStack Query only for interactive client needs (mutations, polling, refetch, infinite scroll).
- Route handlers (REST; GraphQL if the repo uses it): Zod validation on every body/param, consistent error shape, correct HTTP status codes. Business logic in lib/services/, handlers stay thin.
- Build for scalability: stateless handlers (safe for clustering/multiple instances), no in-process state that breaks under horizontal scaling.
- Drizzle + Neon: efficient queries — select only needed fields, no N+1 (proper joins), pagination on all lists, indexes where queries demand, transactions for multi-step writes, proper connection handling.
- Caching: Redis if present (add it if needed) for read-heavy data; otherwise unstable_cache/revalidateTag. Explicit invalidation on every mutation. Sensible TanStack Query staleTime per data type. NEVER cache user/permission-specific data in shared caches.
- async/await everywhere; minimize globals.

## Security
- Every protected route handler and server action verifies session + permission server-side (requirePermission()). Client-side checks are UX only — middleware.ts alone is never sufficient.
- Sanitize/validate all inputs (Zod, Joi where suited; validator.js where needed). Parameterized queries via ORM only — no SQL/NoSQL injection vectors. XSS/CSRF protection, secure cookies (httpOnly, SameSite).
- Avoid inline styles and inline scripts.
- Integrate the repo's existing auth (sessions / JWT / OAuth) — never build a parallel auth path. bcrypt for passwords.
- Rate limiting on sensitive endpoints (auth, trades, payments). Helmet-style secure headers. Proper CORS. HTTPS-only assumptions (secure cookies, no mixed content).
- No hard-coded secrets — env vars (dotenv) only. Validate file uploads. Log sensitive actions without exposing data. Audit dependencies (pnpm audit).

## Next.js best practices
- App Router conventions: server components by default; "use client" only when needed and as deep in the tree as possible.
- next/image for all images, next/link for navigation.
- Folder structure: route files thin; logic in lib/, shared UI in components/ui/, feature components in components/<feature>/, hooks in hooks/, types in types/ or co-located. Move misplaced files into this structure when fixing a page and update imports.
- Logging: use the repo's logger (or Winston-style structured logging server-side); global error handling, graceful 500s.
- Code must be implicitly testable; add minimal tests if the repo has a test setup.

## Output format
- During the audit step: a concise plan listing violations and intended changes.
- During the fix step: only the modified/added/deleted file paths with changes. No long explanations unless clarifying a decision.
