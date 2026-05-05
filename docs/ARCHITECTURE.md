# Vaivamm CRM Architecture

Last updated as part of PR #318 (April 22 hotfix + audit refactor).

## Stack

- **Next.js 16** (App Router, RSC) on Vercel
- **NextAuth v5** (beta) for sessions
- **NeonDB** PostgreSQL via **Drizzle ORM**
- **TanStack Query** for client-side data caching
- **shadcn/Radix** UI primitives, **Tailwind**, **framer-motion**
- **Tiptap** rich-text editor
- **Ably** realtime, **Inngest** background jobs, **Upstash Redis** rate-limit/cache
- **SendGrid** email, **Cloudflare R2** file uploads
- **Sentry** error tracking + perf traces (optional via env)

## Layered architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ middleware.ts            Rate-limit, MFA gate, role routing     │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│ app/                                                            │
│   (auth)/         Login, signup, password reset                 │
│   (dashboard)/    Authenticated app                             │
│   (public)/       Public marketing pages, careers, landing      │
│   api/            Route handlers (REST)                         │
└────┬───────────────────────────────────┬────────────────────────┘
     │ RSC fetches                       │ Mutations (server actions)
     ▼                                   ▼
┌─────────────────────────────────┐ ┌────────────────────────────┐
│ server/queries/                 │ │ server/actions/            │
│   Read path. Drizzle ORM.       │ │   "use server" mutations   │
│   Owns all db.query.* calls.    │ │   Use requireAuth() helper │
└──────────────┬──────────────────┘ └─────────────┬──────────────┘
               │                                  │
               └──────────────┬───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/db/schema/   Drizzle table definitions                      │
│   auth.ts        users, organizations, organizationMembers      │
│   crm.ts         leads, clients, deals, accounts, contacts...   │
│   hr.ts          payroll, attendance, leave, appraisals, PIP... │
│   projects.ts    projects, tickets, sprints                     │
│   enums.ts       all pgEnum() definitions                       │
└─────────────────────────────────────────────────────────────────┘
```

## Auth

- **Sessions** are NextAuth v5 with Drizzle adapter. JWT strategy.
- **Roles** are stored in `organization_members.role`. Role lists in [lib/constants/roles.ts](../lib/constants/roles.ts):
  `OWNER`, `CEO`, `ADMIN`, `HR`, `SALES`, `CUSTOMER_SUPPORT`, `ENGINEERING`, …
- **Helpers**:
  - [lib/auth-helpers.ts](../lib/auth-helpers.ts) — `getAuthenticatedMember()` resolves session + org member, server-only.
  - [lib/auth-role-guards.ts](../lib/auth-role-guards.ts) — pure role predicates (`isAdminOrOwner`, `isCEO`, `isExpenseAdmin`); safe for client components.
  - [lib/api/helpers.ts](../lib/api/helpers.ts) — `withAuth`, `withAdmin` wrappers for route handlers.
  - [lib/auth/require-auth.ts](../lib/auth/require-auth.ts) — `requireAuth(allowedRoles?)` for server actions; mirrors withAuth.

## Validation

Use Zod schemas at every external boundary:
- Route handler input → `parseQuery(req, schema)` / `parseBody(req, schema)`
- Server action input → parse args at function entry

When a schema is shared between a route handler and a server action, declare it once in [lib/validations/](../lib/validations/) and import in both.

## Background jobs

[lib/inngest/](../lib/inngest/) wires Inngest. Events are typed in [lib/inngest/client.ts](../lib/inngest/client.ts). Function definitions live in `lib/inngest/functions/`.

Use Inngest for: scheduled reports, post-mutation side effects (notifications, emails), backfills.

## Schema migrations

- Source of truth is `lib/db/schema/*`.
- Generate migrations: `pnpm db:generate` (interactive — choose "create" for new enums).
- Apply: `pnpm db:migrate` against the target database (`DATABASE_URL`).
- Hand-write migration SQL (rather than relying on `db:push`) when you need `CONCURRENTLY`, partial indexes, or other Postgres features Drizzle doesn't generate.
- Track `drizzle/meta/_journal.json` — every applied migration must be journaled.

## Performance

- **Indexes** — every FK column referenced in a `WHERE` should be indexed. CRM index audit landed in migration `0112_crm_indexes.sql`.
- **N+1 prevention** — prefer `db.query.X.findMany({ with: {...} })` over `.select()` plus inline mapping. Group counts with `GROUP BY` instead of looping `count()` queries.
- **Pagination** — list endpoints default to `limit=25, max=500`. Cursor pagination is preferred for >10k row tables (not yet adopted; see plan).

## Observability

[Sentry](https://sentry.io) captures unhandled errors and 10% of traces. Initialized only when `NEXT_PUBLIC_SENTRY_DSN` is set — no-op locally. Tunnel route `/monitoring` bypasses ad blockers; it's same-origin so the strict CSP allows it.

## Testing

Vitest (`pnpm test`) is wired into CI. Current coverage: payroll calculator (`lib/hr/payroll-calculations.test.ts`, 21 tests). Add tests under any module's directory as `<file>.test.ts`. CI fails on any failing test.

## CI

[.github/workflows/ci.yml](../.github/workflows/ci.yml) runs `pnpm tsc --noEmit && pnpm lint && pnpm test && pnpm build`. All four are hard gates. ESLint is configured to error on `@typescript-eslint/no-explicit-any` and warn on files >800 effective LOC.

## Production smoke checklist

After every refactor merges to main, run [docs/SMOKE.md](./SMOKE.md) against the deployed Vercel URL. ~10 minutes; if any item fails, revert the merge commit.

## What still needs work (post-PR #318)

These are deferred to dedicated PRs:

| Item | Why deferred |
|---|---|
| Split `lib/db/schema/hr.ts` (2078 LOC) and `crm.ts` (1415 LOC) | 81 + ~50 cross-table relations; needs staging environment to validate |
| Split `lib/api/hooks/crm.ts` (1764 LOC) | 125 self-contained hooks; mechanical but high diff churn |
| Repository layer (`server/repos/`) | Needs ESLint custom rule to forbid `db.select` outside repos |
| Migrate raw `db.*` calls in public/organization routes | 11 files; pairs with repo layer to deliver value |
| Cursor pagination on hot list endpoints | Client API contract change |
| Drop dead schema (workflows, etc.) | Needs production schema audit |
| Sub-component decomposition of fat pages | Section state hoisting requires careful analysis per page |
