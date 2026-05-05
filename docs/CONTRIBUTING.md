# Contributing to Vaivamm CRM

## Quickstart

```bash
pnpm install
cp .env.example .env  # fill in DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY at minimum
pnpm db:migrate       # apply schema migrations to local Postgres
pnpm dev              # http://localhost:3000
```

## Workflow

1. Branch from `main`: `git checkout -b feat/your-feature` or `fix/issue-123`.
2. Code. Keep changes scoped; prefer multiple small PRs over one big one.
3. Run locally before pushing:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```
   All four are CI gates; any failure blocks merge.
4. Commit + push. The repo convention is one logical change per commit, no `Co-Authored-By` trailer.
5. Open a PR against `main`. The PR template includes a test plan and screenshot checklist.
6. After merge to `main`, Vercel auto-deploys to production. Run [docs/SMOKE.md](./SMOKE.md) against the deployed URL.

## Adding a new resource (end-to-end)

Take "loans" as an example.

### 1. Schema → migration

Add the table to the appropriate schema file (`lib/db/schema/hr.ts`, `crm.ts`, etc.). Include:
- `org_id` FK to `organizations.id` for multi-tenancy
- `created_at` / `updated_at` timestamps with `defaultNow()`
- An index on `(org_id)` and `(org_id, status)` if status-filtered

```bash
pnpm db:generate       # interactive — pick "create enum" if asked
# inspect drizzle/<NEW>.sql; hand-edit to use IF NOT EXISTS / CONCURRENTLY
pnpm db:migrate
```

### 2. Validation schema

Add the input schema to `lib/validations/<resource>.ts`. Both route handlers and server actions import from here.

```ts
import { z } from "zod";

export const createLoanSchema = z.object({
  userId: z.string(),
  amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(500),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
```

### 3. Read path: query

Add a query function in `server/queries/<resource>.ts` (or a sub-file under `server/queries/<domain>/`).

```ts
import "server-only";
import { db } from "@/lib/db";
import { salaryLoans } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getLoans(orgId: string, opts?: { userId?: string; status?: string }) {
  const filters = [eq(salaryLoans.orgId, orgId)];
  if (opts?.userId) filters.push(eq(salaryLoans.userId, opts.userId));
  if (opts?.status) filters.push(eq(salaryLoans.status, opts.status));

  return db.query.salaryLoans.findMany({
    where: and(...filters),
    orderBy: [desc(salaryLoans.createdAt)],
    with: {
      user: { columns: { id: true, name: true, image: true } },
    },
  });
}
```

### 4. Write path: route handler OR server action

Pick **one** for a given mutation. The convention:
- **Server actions** for mutations driven by form submission within a Client Component.
- **Route handlers** for mutations called via `fetch` from anywhere (mobile, external integrations, third-party webhooks).

#### Route handler

```ts
// app/api/loans/route.ts
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-role-guards";
import { createLoanSchema } from "@/lib/validations/loans";
import { db } from "@/lib/db";
import { salaryLoans } from "@/lib/db/schema";

export async function POST(req: Request) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);
    const input = await parseBody(req, createLoanSchema);
    const [row] = await db.insert(salaryLoans).values({
      ...input,
      orgId: session.orgId,
      status: "PENDING",
    }).returning();
    return ok(row);
  });
}
```

#### Server action

```ts
// server/actions/loan-actions.ts
"use server";
import { requireAuth } from "@/lib/auth/require-auth";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { createLoanSchema } from "@/lib/validations/loans";
import { db } from "@/lib/db";
import { salaryLoans } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export async function createLoan(input: unknown) {
  const ctx = await requireAuth(ADMIN_ROLES);
  if ("error" in ctx) return ctx;
  const data = createLoanSchema.parse(input);
  const [row] = await db.insert(salaryLoans).values({
    ...data,
    orgId: ctx.orgId,
    status: "PENDING",
  }).returning();
  revalidatePath("/hr/loans");
  return { ok: true, row };
}
```

### 5. Client hook (TanStack Query)

Add hooks under `lib/api/hooks/<resource>.ts`. List hooks read via `apiClient`; mutations use the `useMutation` pattern + invalidate keys.

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useLoans(opts?: { userId?: string }) {
  return useQuery({
    queryKey: ["loans", opts],
    queryFn: () => apiClient.get<Loan[]>("/api/loans", { params: opts }),
  });
}
```

### 6. UI

- Page in `app/(dashboard)/hr/loans/page.tsx`.
- Sub-components colocated in `app/(dashboard)/hr/loans/_components/`.
- Helpers/constants in `app/(dashboard)/hr/loans/_lib/`.
- The `_` prefix prevents Next.js from registering these as routes.

### 7. Tests

Pure-function logic (calculators, formatters) gets a Vitest unit test. Place `<file>.test.ts` next to the source. See [lib/hr/payroll-calculations.test.ts](../lib/hr/payroll-calculations.test.ts).

## Code style

- **No comments** unless the WHY is non-obvious. Don't comment what the code does.
- **No emojis** in code or commits.
- **No `as any`** — ESLint blocks new ones. If you genuinely need it, prefer `as unknown` + narrow type, or `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a one-line WHY.
- **No console.log** in committed code (use `lib/logger`).
- **SVG icons over lucide** when in doubt — keeps the icon bundle small.
- **Sheet over Dialog** for forms — established convention.
- **Server-only modules** must `import "server-only";` at the top.
- **Client modules** start with `"use client";`.

## File size

Files >800 effective LOC trigger an ESLint warning. Pages over this should decompose into:
- `_components/` for JSX subtrees
- `_lib/` for pure helpers/constants

See [app/(dashboard)/hr/termination/](../app/(dashboard)/hr/termination/) for a worked example.
