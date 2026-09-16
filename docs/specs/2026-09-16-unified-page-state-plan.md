# Unified Page State — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One state machine decides what every page renders — loading, ready, empty, permission-denied, module-disabled, module-denied, plan-required, quota-exceeded, feature-locked, error — and one renderer draws it, wired at the page body, the route error boundary and the sidebar.

**Architecture:** A pure classifier (`resolvePageState`) extends the existing `resolveGate` state machine with module and entitlement dimensions. A renderer (`PageState`) draws each kind, reusing the state components that already exist. `PageWrapper` gains opt-in state props so page chrome and states live in one place; absent the new props its behaviour is unchanged. The backend stops discarding the reason a module is unavailable, so the frontend never has to guess upgrade-vs-enable.

**Tech Stack:** Next.js 16 App Router · React 19 · TS strict · Tailwind 4 · TanStack Query v5 · Zod 4 · NestJS 11 · Jest

**Spec:** `docs/specs/2026-09-16-unified-page-state-design.md`

## Global Constraints

- **Never add a code comment.** Not narration, not "why", not invariants. The reason goes in a test name. (root CLAUDE.md §1.4, §6)
- No `any`, no `as X`, no `@ts-ignore`, no `!` abuse. Derive types with `z.infer`.
- kebab-case files and folders; PascalCase symbol inside.
- Named handlers declared inside the component; never an inline arrow in a JSX prop.
- Every error string goes through `getErrorMessage` (`lib/get-error-message.ts`).
- Colors reference tokens (`statusToneClasses`, `bg-primary`, `text-muted-foreground`); never a hex, never a raw `slate-*`.
- File size ≤300 lines target, 500 hard.
- **Copy constraint:** no new state may use the words *empty*, *no results*, *no data*, *nothing here*, or *nothing yet*. `scripts/check-no-handrolled-empty-states.mjs:40` fires on a centred flex block whose surrounding 17 lines match that vocabulary, and the new states are centred flex blocks.
- **Universal no-gate zone** — no module, plan or permission gate may be added to any path in `lib/rbac/route-access/universal-routes.ts:16-129`: `/dashboard`, `/home`, `/me/*`, `/mail`, `/inbox`, `/chat`, `/notifications`, `/calendar`, `/announcements`, `/hr/announcements`, `/directory`, `/kb`, `/docs`, `/knowledge/*`, `/support/my`, `/referrals`, `/jobs`, `/settings` (exact), `/access-denied`, `/access-suspended`.
- **Two git repositories.** `backend/` is its own nested repo; `frontend/` and `docs/` belong to the root repo. Diff, commit and base-hash each separately.
- **Commit by explicit pathspec — never `git add -A` or `git add .`.** The backend tree holds 20 uncommitted files from another session (`build/`, `feedbucket/`, `workflows/`, `CLAUDE.md`, `migrations/meta/_journal.json`, and an untracked migration). A blanket add commits a stranger's work under this plan's message.
- **`pnpm check:module-gate` already fails at HEAD** with 13 pre-existing `MISSING_GATE` findings (9 HR, 3 payroll, 1 surveys), unrelated to this plan. Require **no new findings**, not exit 0.
- **`pnpm type-check` does not see test files.** `frontend/tsconfig.json` excludes them, so a type error in any `*.test.ts(x)` this plan adds is invisible to it. Every frontend task runs **`pnpm type-check:specs`** (`tsconfig.specs.json`) as well — but that program is **already red** with 15 pre-existing errors (stale mock shapes in `features/build`, `features/employee-onboarding`, `features/org-setup`, `hooks/api`, `lib/prefetch`, `lib/rbac`). Require **no error naming your own files**, not exit 0:

  ```bash
  cd frontend && pnpm type-check:specs 2>&1 | grep "<your-file-stem>"   # must print nothing
  ```
- **Backend typecheck needs a 10240 MB heap, and `NODE_OPTIONS` CANNOT set it.** `pnpm typecheck` runs `node --max-old-space-size=8192 …` — a CLI flag, which beats `NODE_OPTIONS`, so prefixing the pnpm script does nothing at all. At 8192 the program can die after ~220s with exit **134** printing **no type errors**, which reads as an environment fault or a hang rather than a heap limit. Invoke the compiler directly instead:

  ```bash
  cd backend && node --max-old-space-size=10240 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json
  ```

  Same for the test program, swapping `-p tsconfig.test.json`. If a run exits 134 with no diagnostics, it did not pass — re-run it at the higher limit before believing it.

---

# Phase 1 — Foundation

## Task 1: Backend carries the module-denial reason

`module-availability.ts:1` resolves three distinct reasons; `module.guard.ts:37` drops them and `api-exceptions.ts:32` hardcodes one plan-flavoured message. This task stops the loss.

**Files:**
- Modify: `backend/src/modules/access/access.types.ts:21-27`
- Modify: `backend/src/modules/access/authorize.ts:59-61`
- Modify: `backend/src/common/http/api-exceptions.ts:27-38`
- Modify: `backend/src/common/rbac/module.guard.ts:35-38`
- Modify: `backend/src/modules/access/permission.guard.ts:58`
- Modify: `backend/src/modules/crm/mcp/crm-mcp.service.ts:163-164`
- Test: `backend/src/common/rbac/module.guard.spec.ts` (exists)
- Test: `backend/src/modules/access/permission.guard.spec.ts` (exists)

**Interfaces:**
- Consumes: `ModuleAvailabilityReason` from `common/rbac/module-availability.ts:1`; `moduleDefinition` from `common/rbac/module-registry.ts:405`.
- Produces: `ModuleDisabledException(moduleKey: string, reason: ModuleAvailabilityReason)`; `AuthResult.moduleReason?: ModuleAvailabilityReason`. The wire shape `details: { moduleKey: string; reason: ModuleAvailabilityReason; upgradePath: string | null }` is consumed by Task 2.

- [ ] **Step 1: Write the failing test**

Append to `backend/src/common/rbac/module.guard.spec.ts`:

```ts
describe("ModuleGuard denial reason reaches the wire", () => {
  it("reports org-disabled as enable, not as upgrade, so a free module is never sold", async () => {
    const guard = buildGuardForRequiredModule("feedbucket", {
      available: false,
      reason: "org-disabled",
    });

    await expect(guard.canActivate(contextFor("feedbucket"))).rejects.toMatchObject({
      response: {
        code: "MODULE_NOT_ENABLED",
        details: { moduleKey: "feedbucket", reason: "org-disabled", upgradePath: null },
      },
    });
  });

  it("offers an upgrade path only when the plan is the actual blocker", async () => {
    const guard = buildGuardForRequiredModule("payroll", {
      available: false,
      reason: "not-in-plan",
    });

    await expect(guard.canActivate(contextFor("payroll"))).rejects.toMatchObject({
      response: {
        details: { moduleKey: "payroll", reason: "not-in-plan", upgradePath: "/settings/billing" },
      },
    });
  });

  it("does not tell an individually denied user to enable a module that is already on", async () => {
    const guard = buildGuardForRequiredModule("hr", {
      available: false,
      reason: "user-denied",
    });

    await expect(guard.canActivate(contextFor("hr"))).rejects.toMatchObject({
      response: { details: { reason: "user-denied", upgradePath: null } },
    });
  });
});
```

Read the file's existing helpers first and reuse them; if `buildGuardForRequiredModule` and `contextFor` are not already present, add them beside the existing setup in the same file, matching its established mocking style.

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && pnpm test -- src/common/rbac/module.guard.spec.ts
```

Expected: FAIL — `details` has only `moduleKey`, no `reason`, no `upgradePath`.

- [ ] **Step 3: Widen `AuthResult`**

`backend/src/modules/access/access.types.ts` — add the import and the field:

```ts
import type { ModuleAvailabilityReason } from "../../common/rbac/module-availability";

export type DenyReason = "UNAUTHENTICATED" | "NO_MODULE" | "FORBIDDEN";

export interface AuthResult {
  allow: boolean;
  scope: DataScope;
  reason?: DenyReason;
  moduleReason?: ModuleAvailabilityReason;
}
```

Re-export the type beside the existing `export type { DataScope, MfaState, ScopePredicate };` line so consumers import from one place:

```ts
export type { DataScope, MfaState, ScopePredicate, ModuleAvailabilityReason };
```

`DenyReason` is deliberately not widened — the extra field keeps the blast radius to the one branch that sets it.

- [ ] **Step 4: Carry the reason out of `authorize`**

`backend/src/modules/access/authorize.ts:60-61` — replace the two lines below the existing `namespaceOf` comment (keep that comment, it is pre-existing):

```ts
  const avail = await ctx.moduleAvailable(namespaceOf(permissionKey));
  if (!avail.available)
    return { allow: false, scope: "none", reason: "NO_MODULE", moduleReason: avail.reason };
```

- [ ] **Step 5: Rewrite the exception**

`backend/src/common/http/api-exceptions.ts` — add the imports at the top of the file and replace lines 27-38:

```ts
import type { ModuleAvailabilityReason } from "../rbac/module-availability";
import { moduleDefinition } from "../rbac/module-registry";

const MODULE_DENIAL_MESSAGE: Record<
  ModuleAvailabilityReason,
  (moduleName: string) => string
> = {
  "not-in-plan": (moduleName) => `${moduleName} is not included in your current plan.`,
  "org-disabled": (moduleName) => `${moduleName} is not enabled for your organization.`,
  "user-denied": (moduleName) => `You do not have access to ${moduleName}.`,
};

function moduleDisplayName(moduleKey: string): string {
  return moduleDefinition(moduleKey)?.displayName ?? moduleKey;
}

export class ModuleDisabledException extends HttpException {
  constructor(moduleKey: string, reason: ModuleAvailabilityReason) {
    super(
      {
        code: "MODULE_NOT_ENABLED",
        message: MODULE_DENIAL_MESSAGE[reason](moduleDisplayName(moduleKey)),
        details: {
          moduleKey,
          reason,
          upgradePath: reason === "not-in-plan" ? "/settings/billing" : null,
        },
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
```

- [ ] **Step 6: Update the three throw sites**

`backend/src/common/rbac/module.guard.ts:36-38`:

```ts
      for (const moduleKey of moduleKeys) {
        const avail = await authContext.moduleAvailable(moduleKey);
        if (!avail.available) throw new ModuleDisabledException(moduleKey, avail.reason);
      }
```

`backend/src/modules/access/permission.guard.ts:58` — keep the pre-existing comment block above it, change only the throw:

```ts
      if (result.reason === "NO_MODULE")
        throw new ModuleDisabledException(
          namespaceOf(permissionKey),
          result.moduleReason ?? "org-disabled",
        );
```

`backend/src/modules/crm/mcp/crm-mcp.service.ts:163-164` — keep the pre-existing comment block, change only the throw:

```ts
      if (decision.reason === "NO_MODULE") {
        throw new ModuleDisabledException(
          namespaceOf(tool.requiredPermission),
          decision.moduleReason ?? "org-disabled",
        );
      }
```

The `?? "org-disabled"` fallback is the honest default: it offers no upgrade and no false claim about the plan.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
cd backend && pnpm test -- src/common/rbac/module.guard.spec.ts src/modules/access/permission.guard.spec.ts src/common/rbac/module-availability.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Run the backend gates**

```bash
cd backend && NODE_OPTIONS=--max-old-space-size=10240 pnpm typecheck && pnpm check:module-gate && pnpm check:module-entitlement && pnpm check:bare-throw && pnpm check:cycles
```

Expected: all exit 0. `check:cycles` matters here — `common/http` now imports `common/rbac`.

- [ ] **Step 9: Commit**

```bash
git add backend/src/common/http/api-exceptions.ts backend/src/common/rbac/module.guard.ts backend/src/modules/access/access.types.ts backend/src/modules/access/authorize.ts backend/src/modules/access/permission.guard.ts backend/src/modules/crm/mcp/crm-mcp.service.ts backend/src/common/rbac/module.guard.spec.ts
git commit -m "fix(access): carry the module-denial reason to the client

A module that is merely switched off told the customer to upgrade their
plan. The resolver knew the difference and the guard discarded it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: The page-state contract and classifier

**Files:**
- Create: `frontend/lib/page-state/page-state-schema.ts`
- Create: `frontend/lib/page-state/resolve-page-state.ts`
- Test: `frontend/lib/page-state/resolve-page-state.test.ts`

**Interfaces:**
- Consumes: `AccessState` from `lib/rbac/gate.ts:38`; `isApiError` from `lib/api-envelope.ts:35`; `PermissionKey` from `lib/rbac/permissions`.
- Produces: `PageStateResolution`, `PageStateInput`, `ModuleAvailability`, `resolvePageState(input)`, `pageStateFromError(error)`. Tasks 3–8 depend on these names.

- [ ] **Step 1: Write the contract**

`frontend/lib/page-state/page-state-schema.ts`:

```ts
import { z } from "zod";

export const moduleDenialReasonContract = z.enum([
  "not-in-plan",
  "org-disabled",
  "user-denied",
]);

export const moduleDenialDetailsContract = z.object({
  moduleKey: z.string().min(1),
  reason: moduleDenialReasonContract,
  upgradePath: z.string().min(1).nullable(),
});

export const quotaDetailsContract = z.object({
  limitKey: z.string().min(1),
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  upgradePath: z.string().min(1),
});

export const featureDetailsContract = z.object({
  feature: z.string().min(1),
  requiredPlan: z.string().min(1),
  upgradePath: z.string().min(1),
});

export type ModuleDenialReason = z.infer<typeof moduleDenialReasonContract>;
export type ModuleDenialDetails = z.infer<typeof moduleDenialDetailsContract>;
export type QuotaDetails = z.infer<typeof quotaDetailsContract>;
export type FeatureDetails = z.infer<typeof featureDetailsContract>;
```

- [ ] **Step 2: Write the failing test**

`frontend/lib/page-state/resolve-page-state.test.ts`:

```ts
import { ApiError } from "@/lib/api-envelope";
import { resolvePageState, pageStateFromError } from "./resolve-page-state";

const idle = { isLoading: false, isError: false } as const;

describe("resolvePageState", () => {
  it("claims nothing while access is still in flight", () => {
    expect(resolvePageState({ ...idle, access: "loading", isLoading: false }))
      .toEqual({ kind: "loading" });
  });

  it("answers module before permission, because ModuleGuard runs before PermissionGuard", () => {
    const state = resolvePageState({
      ...idle,
      access: "denied",
      module: {
        status: "unavailable",
        moduleKey: "payroll",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      },
    });

    expect(state).toEqual({
      kind: "plan-required",
      moduleKey: "payroll",
      upgradePath: "/settings/billing",
    });
  });

  it("separates an individually denied user from an organization that never enabled it", () => {
    const denied = resolvePageState({
      ...idle,
      access: "granted",
      module: { status: "unavailable", moduleKey: "hr", reason: "user-denied", upgradePath: null },
    });
    const disabled = resolvePageState({
      ...idle,
      access: "granted",
      module: { status: "unavailable", moduleKey: "hr", reason: "org-disabled", upgradePath: null },
    });

    expect(denied.kind).toBe("module-denied");
    expect(disabled.kind).toBe("module-disabled");
  });

  it("does not read a denied query's flags, so denial never renders as emptiness", () => {
    const state = resolvePageState({
      access: "denied",
      permission: "hr:employees:view",
      isLoading: false,
      isError: false,
      isEmpty: true,
    });

    expect(state).toEqual({ kind: "denied", permission: "hr:employees:view" });
  });

  it("treats a 402 module denial as its reason rather than as a generic failure", () => {
    const error = new ApiError("nope", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "feedbucket",
      reason: "org-disabled",
      upgradePath: null,
    });

    expect(resolvePageState({ ...idle, access: "granted", isError: true, error }))
      .toEqual({ kind: "module-disabled", moduleKey: "feedbucket" });
  });

  it("renders a permission denial from a 403 instead of Something went wrong", () => {
    const error = new ApiError("nope", 403);
    expect(resolvePageState({ ...idle, access: "granted", isError: true, error }).kind)
      .toBe("denied");
  });

  it("degrades a malformed denial payload rather than throwing inside a render", () => {
    const error = new ApiError("nope", 402, "MODULE_NOT_ENABLED", { moduleKey: 7 });
    expect(pageStateFromError(error)).toEqual({ kind: "module-disabled", moduleKey: "" });
  });

  it("leaves a non-api error to the ordinary error branch", () => {
    expect(pageStateFromError(new Error("boom"))).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd frontend && pnpm test -- lib/page-state/resolve-page-state.test.ts
```

Expected: FAIL — `Cannot find module './resolve-page-state'`.

- [ ] **Step 4: Write the classifier**

`frontend/lib/page-state/resolve-page-state.ts`:

```ts
import { isApiError } from "@/lib/api-envelope";
import type { AccessState } from "@/lib/rbac/gate";
import type { PermissionKey } from "@/lib/rbac/permissions";
import {
  featureDetailsContract,
  moduleDenialDetailsContract,
  quotaDetailsContract,
  type ModuleDenialReason,
} from "./page-state-schema";

export type ModuleAvailability =
  | { status: "loading" }
  | { status: "available" }
  | {
      status: "unavailable";
      moduleKey: string;
      reason: ModuleDenialReason;
      upgradePath: string | null;
    };

export type PageStateResolution =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "denied"; permission: PermissionKey | null }
  | { kind: "module-disabled"; moduleKey: string }
  | { kind: "module-denied"; moduleKey: string }
  | { kind: "plan-required"; moduleKey: string; upgradePath: string }
  | {
      kind: "quota-exceeded";
      limitKey: string;
      used: number;
      limit: number;
      upgradePath: string;
    }
  | { kind: "feature-locked"; feature: string; requiredPlan: string; upgradePath: string }
  | { kind: "error"; error: unknown };

export interface PageStateInput {
  readonly permission?: PermissionKey;
  readonly access?: AccessState;
  readonly module?: ModuleAvailability;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error?: unknown;
  readonly isEmpty?: boolean;
}

const DEFAULT_UPGRADE_PATH = "/settings/billing";

function fromModuleDenial(
  moduleKey: string,
  reason: ModuleDenialReason,
  upgradePath: string | null,
): PageStateResolution {
  if (reason === "not-in-plan")
    return { kind: "plan-required", moduleKey, upgradePath: upgradePath ?? DEFAULT_UPGRADE_PATH };
  if (reason === "user-denied") return { kind: "module-denied", moduleKey };
  return { kind: "module-disabled", moduleKey };
}

export function pageStateFromError(error: unknown): PageStateResolution | null {
  if (!isApiError(error)) return null;
  if (error.status === 403) return { kind: "denied", permission: null };
  if (error.status !== 402) return null;

  if (error.code === "MODULE_NOT_ENABLED") {
    const parsed = moduleDenialDetailsContract.safeParse(error.details);
    if (!parsed.success) return { kind: "module-disabled", moduleKey: "" };
    return fromModuleDenial(parsed.data.moduleKey, parsed.data.reason, parsed.data.upgradePath);
  }

  if (error.code === "QUOTA_EXCEEDED") {
    const parsed = quotaDetailsContract.safeParse(error.details);
    if (!parsed.success) return { kind: "error", error };
    return { kind: "quota-exceeded", ...parsed.data };
  }

  if (error.code === "FEATURE_NOT_AVAILABLE") {
    const parsed = featureDetailsContract.safeParse(error.details);
    if (!parsed.success) return { kind: "error", error };
    return { kind: "feature-locked", ...parsed.data };
  }

  return { kind: "error", error };
}

export function resolvePageState(input: PageStateInput): PageStateResolution {
  if (input.access === "loading") return { kind: "loading" };
  if (input.module?.status === "loading") return { kind: "loading" };

  if (input.module?.status === "unavailable")
    return fromModuleDenial(
      input.module.moduleKey,
      input.module.reason,
      input.module.upgradePath,
    );

  if (input.access === "denied")
    return { kind: "denied", permission: input.permission ?? null };

  if (input.isLoading) return { kind: "loading" };

  if (input.isError) return pageStateFromError(input.error) ?? { kind: "error", error: input.error };

  if (input.isEmpty === true) return { kind: "empty" };
  return { kind: "ready" };
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd frontend && pnpm test -- lib/page-state/resolve-page-state.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/page-state/
git commit -m "feat(page-state): one classifier for every page outcome

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: The renderer

Three of the five views already exist as private functions inside `components/entitlement-gate.tsx`. Promote them; do not redraw them.

**Files:**
- Create: `frontend/components/shared/page-state-views.tsx`
- Create: `frontend/components/shared/page-state.tsx`
- Modify: `frontend/components/shared/no-permission-state.tsx:6-12`
- Modify: `frontend/components/shared/index.ts`
- Test: `frontend/components/shared/page-state.test.tsx`

**Interfaces:**
- Consumes: `PageStateResolution` (Task 2); `ErrorState`, `NoPermissionState`, `EmptyState`, `isTransientNetworkError`, `getErrorMessage`.
- Produces: `<PageState>` with props `{ resolution, loading, empty?, onRetry?, className?, children }`; views `ModuleDisabledView`, `ModuleDeniedView`, `PlanRequiredView`, `QuotaExceededView`, `FeatureLockedView`.

- [ ] **Step 1: Make `permission` optional on `NoPermissionState`**

`frontend/components/shared/no-permission-state.tsx` — change the interface at `:6-12`:

```ts
interface NoPermissionStateProps {
  permission?: string;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}
```

Then guard the mono chip at `:47-49` so it renders only when a key is known:

```tsx
{permission ? (
  <code className="mt-3 rounded bg-muted px-1.5 py-0.5 font-mono text-dense text-muted-foreground">
    {permission}
  </code>
) : null}
```

Match the existing element and classes in that file rather than the sketch above if they differ; the only change is the conditional.

- [ ] **Step 2: Write the failing test**

`frontend/components/shared/page-state.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { PageState } from "./page-state";

const loading = <div data-testid="skeleton" />;

describe("PageState", () => {
  it("offers to enable, never to buy, when the organization simply has it switched off", () => {
    render(
      <PageState resolution={{ kind: "module-disabled", moduleKey: "feedbucket" }} loading={loading}>
        <div>body</div>
      </PageState>,
    );

    expect(screen.getByRole("link", { name: /modules/i })).toHaveAttribute(
      "href",
      "/settings/modules",
    );
    expect(screen.queryByRole("link", { name: /plan|upgrade|billing/i })).toBeNull();
  });

  it("does not offer to enable a module that is already on to a user who was denied it", () => {
    render(
      <PageState resolution={{ kind: "module-denied", moduleKey: "hr" }} loading={loading}>
        <div>body</div>
      </PageState>,
    );

    expect(screen.queryByRole("link", { name: /modules/i })).toBeNull();
  });

  it("sends the customer to billing only when money is the actual blocker", () => {
    render(
      <PageState
        resolution={{ kind: "plan-required", moduleKey: "payroll", upgradePath: "/settings/billing" }}
        loading={loading}
      >
        <div>body</div>
      </PageState>,
    );

    expect(screen.getByRole("link", { name: /plan/i })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("renders the body only when the state is ready", () => {
    render(
      <PageState resolution={{ kind: "ready" }} loading={loading}>
        <div>body</div>
      </PageState>,
    );
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("falls back to the children when a non-list surface reports emptiness", () => {
    render(
      <PageState resolution={{ kind: "empty" }} loading={loading}>
        <div>body</div>
      </PageState>,
    );
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd frontend && pnpm test -- components/shared/page-state.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 4: Move the three existing views into their own file**

Create `frontend/components/shared/page-state-views.tsx`. **Move** — do not copy — `ModuleNotEnabledState` (`components/entitlement-gate.tsx:230-281`), `FeatureUnavailableState` (the block ending at `:224`) and `QuotaExceededState` (`:379` call site's component) verbatim, including their existing comments, which are pre-existing and stay. Rename them `ModuleDisabledView`, `FeatureLockedView` and `QuotaExceededView` and export each. Carry `GateStateProps` and `humanizeModuleKey` across with them.

**Then delete the three from `entitlement-gate.tsx` and have it import them from the new file.** Moving rather than copying matters: a copy would leave two definitions of each view in the tree from this commit until Task 9 deletes the old file, which is a §4 violation for every commit in between. After this step `entitlement-gate.tsx` is a thin shell, which is what Task 9 removes.

Then add the two views that do not exist yet, in the same file and the same visual idiom:

```tsx
export function ModuleDeniedView({ moduleKey, compact, className }: ModuleDeniedViewProps) {
  const moduleName = humanizeModuleKey(moduleKey);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed",
        "border-border bg-muted/30",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="status"
      aria-label={`Access not granted: ${moduleName}`}
    >
      <div
        className={cn(
          "rounded-lg bg-muted flex items-center justify-center mb-4",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <ShieldOff className={cn("text-muted-foreground", compact ? "h-4 w-4" : "h-6 w-6")} />
      </div>
      <h3 className="font-semibold text-foreground text-sm">Access not granted</h3>
      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm mt-1.5",
        )}
      >
        Your access to <span className="font-medium text-foreground">{moduleName}</span> has been
        turned off. Ask an organization admin to restore it.
      </p>
    </div>
  );
}

export function PlanRequiredView({
  moduleKey,
  upgradePath,
  compact,
  className,
}: PlanRequiredViewProps) {
  const moduleName = humanizeModuleKey(moduleKey);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed",
        "border-border bg-status-info-surface/40",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="status"
      aria-label={`Upgrade required: ${moduleName}`}
    >
      <div
        className={cn(
          "rounded-lg bg-status-info-surface flex items-center justify-center mb-4",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <Lock className={cn("text-status-info-ink", compact ? "h-4 w-4" : "h-6 w-6")} />
      </div>
      <h3 className="font-semibold text-foreground text-sm">Upgrade to unlock {moduleName}</h3>
      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm mt-1.5",
        )}
      >
        <span className="font-medium text-foreground">{moduleName}</span> is not included in your
        current plan.
      </p>
      <div className={cn(compact ? "mt-4" : "mt-5")}>
        <Button asChild size={compact ? "sm" : "default"}>
          <Link href={upgradePath}>View plans</Link>
        </Button>
      </div>
    </div>
  );
}
```

Declare the two prop interfaces beside them:

```ts
interface ModuleDeniedViewProps extends GateStateProps {
  moduleKey: string;
}

interface PlanRequiredViewProps extends GateStateProps {
  moduleKey: string;
  upgradePath: string;
}
```

If the file passes 300 lines, split the two new views into `page-state-plan-views.tsx` and re-export from `page-state-views.tsx`.

- [ ] **Step 5: Write the renderer**

`frontend/components/shared/page-state.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { isTransientNetworkError } from "@/lib/query-error-policy";
import { ErrorState } from "./error-state";
import { NoPermissionState } from "./no-permission-state";
import {
  FeatureLockedView,
  ModuleDeniedView,
  ModuleDisabledView,
  PlanRequiredView,
  QuotaExceededView,
} from "./page-state-views";

export interface PageStateProps {
  resolution: PageStateResolution;
  loading: ReactNode;
  empty?: ReactNode;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
  children: ReactNode;
}

export function PageState({
  resolution,
  loading,
  empty,
  onRetry,
  className,
  compact,
  children,
}: PageStateProps) {
  switch (resolution.kind) {
    case "loading":
      return <>{loading}</>;
    case "denied":
      return (
        <NoPermissionState
          permission={resolution.permission ?? undefined}
          className={className}
          compact={compact}
        />
      );
    case "module-disabled":
      return (
        <ModuleDisabledView
          moduleKey={resolution.moduleKey}
          className={className}
          compact={compact}
        />
      );
    case "module-denied":
      return (
        <ModuleDeniedView
          moduleKey={resolution.moduleKey}
          className={className}
          compact={compact}
        />
      );
    case "plan-required":
      return (
        <PlanRequiredView
          moduleKey={resolution.moduleKey}
          upgradePath={resolution.upgradePath}
          className={className}
          compact={compact}
        />
      );
    case "quota-exceeded":
      return (
        <QuotaExceededView
          limitKey={resolution.limitKey}
          used={resolution.used}
          limit={resolution.limit}
          upgradePath={resolution.upgradePath}
          className={className}
          compact={compact}
        />
      );
    case "feature-locked":
      return (
        <FeatureLockedView
          feature={resolution.feature}
          requiredPlan={resolution.requiredPlan}
          upgradePath={resolution.upgradePath}
          className={className}
          compact={compact}
        />
      );
    case "error":
      return (
        <ErrorState
          className={className}
          compact={compact}
          title={
            isTransientNetworkError(resolution.error)
              ? "Server temporarily unavailable"
              : undefined
          }
          description={getErrorMessage(resolution.error)}
          onRetry={onRetry}
        />
      );
    case "empty":
      return <>{empty ?? children}</>;
    case "ready":
      return <>{children}</>;
  }
}
```

Adjust `QuotaExceededView`/`FeatureLockedView` prop names in this switch to whatever the promoted components actually declare — read them after the move rather than trusting this sketch.

- [ ] **Step 6: Export from the barrel**

`frontend/components/shared/index.ts` — add one line beside the existing state exports:

```ts
export { PageState } from "./page-state";
```

Do **not** deep-import `page-state` from a route file; §65 of frontend/CLAUDE.md requires route-level files to deep-import leaf state components to keep `react-hook-form` out of the eager chunk. `PageState` follows the same rule: route files import `@/components/shared/page-state`.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
cd frontend && pnpm test -- components/shared/page-state.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 8: Run the structural gates**

```bash
cd frontend && pnpm check:empty-states && pnpm check:colors && pnpm check:named-handlers && pnpm check:over-300 && pnpm check:cycles
```

Expected: all exit 0. `check:empty-states` is the one at risk — the new views are centred flex blocks, so if it fires, the copy contains a banned word (see Global Constraints) and the copy must change, not the gate.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/shared/page-state.tsx frontend/components/shared/page-state-views.tsx frontend/components/shared/page-state.test.tsx frontend/components/shared/no-permission-state.tsx frontend/components/shared/index.ts
git commit -m "feat(page-state): one renderer for every page outcome

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: The access hook

**Files:**
- Create: `frontend/hooks/api/use-page-state.ts`
- Test: `frontend/hooks/api/use-page-state.test.tsx`

**Interfaces:**
- Consumes: `useAccess`, `useCanState` (`hooks/api/access.ts:54`, `:97`); `useEntitlements` (`hooks/api/entitlements.ts:19`); `normalizeOrgModuleKey` (`lib/org-module-keys.ts`); `resolvePageState` (Task 2).
- Produces: `usePageState(options): PageStateResolution`.

- [ ] **Step 1: Write the failing test**

`frontend/hooks/api/use-page-state.test.tsx` — mock `useAccess`, `useCanState` and `useEntitlements`, then assert:

```tsx
it("reports loading rather than availability while the access snapshot is in flight", () => {
  mockAccess({ data: undefined, isLoading: true });
  const { result } = renderHook(() => usePageState({ module: "hr", isLoading: false, isError: false }));
  expect(result.current).toEqual({ kind: "loading" });
});

it("calls a module plan-locked only when entitlements say so, not because it is plan-gated", () => {
  mockAccess({ data: { modules: { feedbucket: false }, scopes: {}, isOrgOwner: false } });
  mockEntitlements({ data: { lockedModules: ["payroll", "inventory"] } });
  const { result } = renderHook(() =>
    usePageState({ module: "feedbucket", isLoading: false, isError: false }),
  );
  expect(result.current).toEqual({ kind: "module-disabled", moduleKey: "feedbucket" });
});

it("does not hide a surface when the billing read fails", () => {
  mockAccess({ data: { modules: { payroll: false }, scopes: {}, isOrgOwner: false } });
  mockEntitlements({ data: undefined, isError: true });
  const { result } = renderHook(() =>
    usePageState({ module: "payroll", isLoading: false, isError: false }),
  );
  expect(result.current).toEqual({ kind: "module-disabled", moduleKey: "payroll" });
});
```

Follow the mocking idiom already used in `frontend/lib/query-scope-isolation.test.tsx` and the existing access tests rather than inventing a new one.

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && pnpm test -- hooks/api/use-page-state.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

`frontend/hooks/api/use-page-state.ts`:

```ts
"use client";

import { useAccess } from "@/hooks/api/access";
import { useEntitlements } from "@/hooks/api/entitlements";
import { accessState } from "@/lib/rbac/gate";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import { normalizeOrgModuleKey } from "@/lib/org-module-keys";
import {
  resolvePageState,
  type ModuleAvailability,
  type PageStateResolution,
} from "@/lib/page-state/resolve-page-state";
import type { PermissionKey } from "@/lib/rbac/permissions";

export interface UsePageStateOptions {
  readonly permission?: PermissionKey;
  readonly module?: string;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error?: unknown;
  readonly isEmpty?: boolean;
}

export function usePageState(options: UsePageStateOptions): PageStateResolution {
  const { data: access, isLoading: accessLoading } = useAccess();
  const { data: entitlements } = useEntitlements(options.module !== undefined);

  const permissionState =
    options.permission === undefined
      ? ("granted" as const)
      : accessState({
          isLoading: accessLoading,
          granted: access !== undefined && grantsPermission(access, options.permission),
        });

  let moduleAvailability: ModuleAvailability | undefined;
  if (options.module !== undefined) {
    const moduleKey = normalizeOrgModuleKey(options.module);
    if (accessLoading || access === undefined) moduleAvailability = { status: "loading" };
    else if (access.modules[moduleKey] === true) moduleAvailability = { status: "available" };
    else {
      const planLocked =
        entitlements?.lockedModules.some(
          (locked) => normalizeOrgModuleKey(locked) === moduleKey,
        ) ?? false;
      moduleAvailability = {
        status: "unavailable",
        moduleKey,
        reason: planLocked ? "not-in-plan" : "org-disabled",
        upgradePath: planLocked ? "/settings/billing" : null,
      };
    }
  }

  return resolvePageState({
    permission: options.permission,
    access: permissionState,
    module: moduleAvailability,
    isLoading: options.isLoading,
    isError: options.isError,
    error: options.error,
    isEmpty: options.isEmpty,
  });
}
```

This hook can never produce `module-denied` — no member-callable endpoint distinguishes it. That state arrives only from a 402 `details.reason` via `pageStateFromError`, which is why Task 1 exists.

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && pnpm test -- hooks/api/use-page-state.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/hooks/api/use-page-state.ts frontend/hooks/api/use-page-state.test.tsx
git commit -m "feat(page-state): resolve module and plan availability in one hook

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `PageWrapper` accepts a state

**Files:**
- Modify: `frontend/components/ui/page-wrapper.tsx:11-32` (props), `:149-159` (actions), `:164-177` (filters), `:179-210` (content)
- Test: `frontend/components/ui/page-wrapper-state.test.tsx`

**Interfaces:**
- Consumes: `PageState` (Task 3), `PageStateResolution` (Task 2).
- Produces: `PageWrapperProps` gains `state?: PageStateResolution`, `loading?: ReactNode`, `empty?: ReactNode`, `onRetry?: () => void`.

- [ ] **Step 1: Write the failing test**

`frontend/components/ui/page-wrapper-state.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { PageWrapper } from "./page-wrapper";

describe("PageWrapper state", () => {
  it("renders children untouched when no state is supplied, so existing pages cannot change", () => {
    render(
      <PageWrapper title="Employees" actions={<button type="button">Add</button>}>
        <div>table</div>
      </PageWrapper>,
    );
    expect(screen.getByText("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("keeps the title but withdraws the actions a denied reader cannot use", () => {
    render(
      <PageWrapper
        title="Employees"
        actions={<button type="button">Add</button>}
        filters={<input aria-label="Search" />}
        state={{ kind: "denied", permission: "hr:employees:view" }}
        loading={<div data-testid="skeleton" />}
      >
        <div>table</div>
      </PageWrapper>,
    );

    expect(screen.getByRole("heading", { name: "Employees" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
    expect(screen.queryByLabelText("Search")).toBeNull();
    expect(screen.queryByText("table")).toBeNull();
  });

  it("keeps the actions when the state is ready", () => {
    render(
      <PageWrapper
        title="Employees"
        actions={<button type="button">Add</button>}
        state={{ kind: "ready" }}
        loading={<div data-testid="skeleton" />}
      >
        <div>table</div>
      </PageWrapper>,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByText("table")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && pnpm test -- components/ui/page-wrapper-state.test.tsx
```

Expected: FAIL — `state` is not a valid prop; actions still render.

- [ ] **Step 3: Extend the props**

`frontend/components/ui/page-wrapper.tsx` — add to `PageWrapperProps` (after `variant`):

```ts
  state?: PageStateResolution;
  loading?: React.ReactNode;
  empty?: React.ReactNode;
  onRetry?: () => void;
```

Import at the top. `LoadingState` is **not** currently imported by this file and is needed for the default in Step 4:

```ts
import { PageState } from "@/components/shared/page-state";
import { LoadingState } from "@/components/shared/loading-state";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
```

Deep-import both leaves, never `@/components/shared` — the barrel re-exports `EntityFormSheet`/`EntityFormDialog`, which pull `react-hook-form` into the eager chunk of every page that mounts `PageWrapper` (frontend/CLAUDE.md §3).

- [ ] **Step 4: Suppress chrome and swap the body**

Inside the component, above the `showHeader` computation, derive the two flags:

```ts
  const isInterrupted = state !== undefined && state.kind !== "ready" && state.kind !== "empty";
  const visibleActions = isInterrupted ? undefined : actions;
  const visibleFilters = isInterrupted ? undefined : filters;
```

Replace every read of `actions` in the header block (`:93`, `:149`, `:157`) with `visibleActions`, and every read of `filters` (`:164`, `:175`) with `visibleFilters`.

Wrap the body. In both the `noInternalScroll` branch (`:188`) and the scrolling branch (`:207`), replace `{children}` with `{body}`, and compute `body` above the `return`:

```tsx
  const body =
    state === undefined ? (
      children
    ) : (
      <PageState
        resolution={state}
        loading={loading ?? <LoadingState variant="page" />}
        empty={empty}
        onRetry={onRetry}
        className="flex-1"
      >
        {children}
      </PageState>
    );
```

`empty` is passed through undefined-or-not; `PageState` already falls back to `children` for a non-list surface.

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd frontend && pnpm test -- components/ui/page-wrapper-state.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Prove the 440 untouched pages are unaffected**

```bash
cd frontend && pnpm test -- components/ui/ components/layout/ && pnpm type-check
```

Expected: PASS. Any failure here means the `state === undefined` path changed behaviour, which it must not.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/ui/page-wrapper.tsx frontend/components/ui/page-wrapper-state.test.tsx
git commit -m "feat(page-wrapper): own the page's states alongside its chrome

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Stop throwing access errors to the route boundary

**Files:**
- Modify: `frontend/lib/query-error-policy.ts:8-23`
- Modify: `frontend/components/ui/route-error-boundary.tsx:66-145`
- Test: `frontend/lib/query-error-policy.test.ts`
- Test: `frontend/components/ui/route-error-boundary.test.tsx` (exists)

**Interfaces:**
- Consumes: `pageStateFromError` (Task 2), `PageState` (Task 3).
- Produces: no new exports; `RouteErrorBoundary`'s props are unchanged, so all 199 `error.tsx` files keep compiling untouched.

- [ ] **Step 1: Write the failing test**

Append to `frontend/lib/query-error-policy.test.ts` (create it if absent):

```ts
import { ApiError } from "@/lib/api-envelope";
import { readErrorReachesBoundary } from "./query-error-policy";

const noData = { state: { data: undefined } };

it("keeps a plan denial inline, because Try Again can never resolve one", () => {
  const error = new ApiError("nope", 402, "MODULE_NOT_ENABLED", {
    moduleKey: "feedbucket",
    reason: "org-disabled",
    upgradePath: null,
  });
  expect(readErrorReachesBoundary(error, noData)).toBe(false);
});

it("keeps a permission denial inline rather than calling it an unexpected error", () => {
  expect(readErrorReachesBoundary(new ApiError("nope", 403), noData)).toBe(false);
});

it("still sends a server fault to the boundary", () => {
  expect(readErrorReachesBoundary(new ApiError("boom", 500), noData)).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && pnpm test -- lib/query-error-policy.test.ts
```

Expected: FAIL on the first two — both currently return `true`.

- [ ] **Step 3: Narrow the boundary policy**

`frontend/lib/query-error-policy.ts` — replace the body of `readErrorReachesBoundary` (`:11-22`). The `ORGANIZATION_ACCESS_ERROR_CODES` set becomes unused by this function; leave the constant only if another module imports it, otherwise delete it (`check:dead-code` will say which).

```ts
export function readErrorReachesBoundary(
  error: unknown,
  query: { readonly state: { readonly data: unknown } },
): boolean {
  if (query.state.data !== undefined) return false;
  if (!isApiError(error)) return true;
  if (error.code === "ABORTED") return false;
  if (error.status === 401) return false;
  if (error.status === 402) return false;
  if (error.status === 403) return false;
  return true;
}
```

A 403 carrying `ORG_MEMBERSHIP_INACTIVE`/`SUSPENDED` is already intercepted in `lib/api-client.ts:91-108`, which redirects to `/access-suspended` before the query ever sees it — so folding all 403s into one branch loses nothing.

- [ ] **Step 4: Classify inside the boundary**

`frontend/components/ui/route-error-boundary.tsx` — after the `isNetwork` computation at `:76`, add:

```ts
  const accessState = pageStateFromError(error);
```

and immediately before the existing `const content = (` at `:123`, return the shared renderer when the error is an access state:

```tsx
  if (accessState !== null && accessState.kind !== "error")
    return (
      <PageState resolution={accessState} loading={null} onRetry={handleRetry}>
        {null}
      </PageState>
    );
```

Import both at the top of the file:

```ts
import { PageState } from "@/components/shared/page-state";
import { pageStateFromError } from "@/lib/page-state/resolve-page-state";
```

- [ ] **Step 5: Add the boundary regression test**

Append to `frontend/components/ui/route-error-boundary.test.tsx`:

```tsx
it("names the module instead of showing Project error when a plan gate rejects the read", () => {
  const error = Object.assign(
    new ApiError("This module is not available on your plan.", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "feedbucket",
      reason: "org-disabled",
      upgradePath: null,
    }),
    { digest: undefined },
  );

  render(<RouteErrorBoundary error={error} reset={jest.fn()} title="Project error" />);

  expect(screen.queryByText("Project error")).toBeNull();
  expect(screen.getByRole("link", { name: /modules/i })).toBeInTheDocument();
});
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd frontend && pnpm test -- lib/query-error-policy.test.ts components/ui/route-error-boundary.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/query-error-policy.ts frontend/lib/query-error-policy.test.ts frontend/components/ui/route-error-boundary.tsx frontend/components/ui/route-error-boundary.test.tsx
git commit -m "fix(errors): stop rendering access denials as unexpected failures

A 402 and a bare 403 reached the route boundary and drew a retry button
for a condition retrying cannot change.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `RequireModule` gains its missing branches

Name and call signature are unchanged, so its ~15 Documents call sites are untouched.

**Files:**
- Modify: `frontend/components/auth/require-module.tsx`
- Test: `frontend/components/auth/require-module.test.tsx`

**Interfaces:**
- Consumes: `usePageState` (Task 4), `PageState` (Task 3).
- Produces: `RequireModule({ module, children })` — unchanged.

- [ ] **Step 1: Write the failing test**

`frontend/components/auth/require-module.test.tsx`:

```tsx
it("shows a skeleton rather than a blank frame while access is resolving", () => {
  mockAccess({ data: undefined, isLoading: true });
  const { container } = render(<RequireModule module="kb"><div>body</div></RequireModule>);
  expect(container).not.toBeEmptyDOMElement();
  expect(screen.queryByText("body")).toBeNull();
});

it("offers an upgrade when the plan is what blocks the module", () => {
  mockAccess({ data: { modules: { payroll: false }, scopes: {}, isOrgOwner: false } });
  mockEntitlements({ data: { lockedModules: ["payroll"] } });
  render(<RequireModule module="payroll"><div>body</div></RequireModule>);
  expect(screen.getByRole("link", { name: /plan/i })).toHaveAttribute("href", "/settings/billing");
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && pnpm test -- components/auth/require-module.test.tsx
```

Expected: FAIL — the loading branch renders `null` (`require-module.tsx:41`) and there is no plan branch.

- [ ] **Step 3: Reimplement on the classifier**

Replace the whole of `frontend/components/auth/require-module.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { PageState } from "@/components/shared/page-state";
import { LoadingState } from "@/components/shared/loading-state";
import { usePageState } from "@/hooks/api/use-page-state";

interface RequireModuleProps {
  module: string;
  children: ReactNode;
}

export function RequireModule({ module, children }: RequireModuleProps) {
  const state = usePageState({ module, isLoading: false, isError: false });

  return (
    <PageState resolution={state} loading={<LoadingState variant="page" />} className="flex-1">
      {children}
    </PageState>
  );
}
```

`ModuleDisabledState` and its `/settings/modules` link move into `ModuleDisabledView` (Task 3) and are deleted here.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd frontend && pnpm test -- components/auth/require-module.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Verify the 15 Documents call sites still render**

```bash
cd frontend && pnpm test -- app/\(authenticated\)/knowledge features/wiki && pnpm type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/auth/require-module.tsx frontend/components/auth/require-module.test.tsx
git commit -m "fix(require-module): stop rendering a blank frame, add the plan branch

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Sidebar locks plan-gated modules

**Files:**
- Modify: `frontend/components/layout/sidebar/sidebar-nav-types.ts:22-40`
- Modify: `frontend/components/layout/sidebar/sidebar-nav-items.ts:143-208`
- Modify: `frontend/components/layout/app-sidebar.tsx:111-121`
- Modify: `frontend/components/layout/sidebar/use-product-sidebar-visibility.ts:36-52`
- Modify: `frontend/components/layout/command-palette-dialog.tsx:149-173`
- Modify: `frontend/components/layout/header/product-grid.tsx:15-18`
- Test: `frontend/components/layout/sidebar/sidebar-plan-locking.test.ts`

**Interfaces:**
- Consumes: `useEntitlements` (`hooks/api/entitlements.ts:19`).
- Produces: `NavRoute.locked?: boolean`; `getNavGroupsForUser(role, scopes, enabledModules, lockedModules?)` and `getNavGroupsForProduct(product, role, scopes, enabledModules, lockedModules?)` — the fourth/fifth parameter is optional and defaults to `[]`, so every existing caller compiles unchanged.

- [ ] **Step 1: Write the failing test**

`frontend/components/layout/sidebar/sidebar-plan-locking.test.ts`:

```ts
import { getNavGroupsForProduct } from "./sidebar-nav-items";

it("keeps a plan-locked destination visible so the owner can discover and buy it", () => {
  const groups = getNavGroupsForProduct("payroll", "OWNER", {}, ["PAYROLL"], ["payroll"]);
  const routes = groups.flatMap((group) => group.routes);
  expect(routes.length).toBeGreaterThan(0);
  expect(routes.every((route) => route.locked === true)).toBe(true);
});

it("still removes a destination the caller has no permission for", () => {
  const groups = getNavGroupsForProduct("hrms", "MEMBER", {}, ["HR"], []);
  expect(groups.flatMap((group) => group.routes)).toEqual([]);
});

it("leaves navigation intact when the billing read returns nothing", () => {
  const groups = getNavGroupsForProduct("payroll", "OWNER", {}, ["PAYROLL"], []);
  const routes = groups.flatMap((group) => group.routes);
  expect(routes.some((route) => route.locked === true)).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && pnpm test -- components/layout/sidebar/sidebar-plan-locking.test.ts
```

Expected: FAIL — `getNavGroupsForProduct` takes four parameters and `locked` is not a field.

- [ ] **Step 3: Add the field**

`frontend/components/layout/sidebar/sidebar-nav-types.ts` — add to `NavRoute`, below `modulesAny`:

```ts
  /** Visible but gated behind a paid plan; the entry routes to billing. */
  locked?: boolean;
```

- [ ] **Step 4: Thread `lockedModules` through the filter**

`frontend/components/layout/sidebar/sidebar-nav-items.ts` — `filterRoute` gains a parameter and marks rather than removes:

```ts
function filterRoute(
  route: NavRoute,
  isOwner: boolean,
  granted: GrantedPredicate,
  enabledModules: string[],
  lockedModules: string[],
  inheritedPermission?: PermissionRequirement,
): NavRoute[] {
  const lockedByPlan = route.module !== undefined && isPlanLocked(route.module, lockedModules);

  if (route.module && !lockedByPlan && !isModuleEnabled(route.module, enabledModules)) return [];
  if (
    route.modulesAny &&
    !route.modulesAny.some((module) => isModuleEnabled(module, enabledModules))
  )
    return [];

  const effectivePermission = route.requiredPermission ?? inheritedPermission;
  const children = (route.children ?? []).flatMap((child) =>
    filterRoute(child, isOwner, granted, enabledModules, lockedModules, effectivePermission),
  );

  if (!isOwner && !matchesPermission(effectivePermission, granted)) return children;

  const resolved = lockedByPlan ? { ...route, locked: true } : route;
  return [
    children.length > 0
      ? { ...resolved, children }
      : { ...resolved, children: undefined },
  ];
}
```

Add the predicate beside `matchesPermission`, reusing the existing product→module map:

```ts
function isPlanLocked(product: ProductKey, lockedModules: string[]): boolean {
  const moduleKey = PRODUCT_MODULE_KEY[product];
  if (!moduleKey) return false;
  return matchesOrgModule(lockedModules, moduleKey);
}
```

`PRODUCT_MODULE_KEY` is currently module-private in `sidebar-products.ts:182`; export it there and import it here rather than writing a second copy.

`getNavGroupsForUser` and `getNavGroupsForProduct` gain `lockedModules: string[] = []` as their last parameter, pass it into `filterRoute`, and change the group-level filter so a plan-locked group survives:

```ts
  return NAV_GROUPS.filter(
    (group) =>
      !group.module ||
      isPlanLocked(group.module, lockedModules) ||
      isModuleEnabled(group.module, enabledModules),
  )
```

- [ ] **Step 5: Feed it from the four consumers**

In `app-sidebar.tsx:111-121`, `use-product-sidebar-visibility.ts:36-52` and `command-palette-dialog.tsx:149-173`, add:

```ts
  const { data: entitlements } = useEntitlements();
  const lockedModules = entitlements?.lockedModules ?? [];
```

and pass `lockedModules` as the final argument to the `getNavGroupsFor*` call in each. The `?? []` is the deliberate fail-open: navigation is not the authorization boundary, and the server still answers 402.

In `product-grid.tsx`, delete the hardcoded map at `:15-18` and read `locked` from the nav model instead, so there is one source for which products are plan-locked.

- [ ] **Step 6: Render the lock**

In the sidebar item renderer (`SidebarSection`, reached from `app-sidebar.tsx`), when `route.locked` is true, render the existing lock affordance used by `product-tile.tsx:37-149` and point the link at `/settings/billing`. Read `product-tile.tsx` first and reuse its chip; do not draw a second one.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
cd frontend && pnpm test -- components/layout/sidebar/ components/layout/nav-surface-parity.test.ts
```

Expected: PASS, including the pre-existing `sidebar-permission-coverage.test.ts` and `nav-surface-parity.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add frontend/components/layout/
git commit -m "feat(nav): surface plan-locked products instead of hiding them

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Consolidate `Gated` and `EntitlementGate`

Cardinal Rule §4 — two symbols doing one job must become one. Do this only after Tasks 2–5 are green.

**Files:**
- Modify (9 consumers): `app/(authenticated)/crm/settings/blueprints/page.tsx:10`, `.../options/page.tsx:33`, `.../pipelines/page.tsx:13`, `features/timesheets/reports/{approval-sla,billing-leakage,client-profitability,compliance,utilization}-tab.tsx`, `features/billing/components/plan-tab.tsx:422`
- Delete: `frontend/components/shared/gated.tsx`, `frontend/components/entitlement-gate.tsx`
- Modify: `frontend/components/shared/index.ts:8`

- [ ] **Step 1: Migrate the eight `Gated` consumers**

Replace each `<Gated permission={…} isLoading={…} isError={…} isEmpty={…} loading={…} empty={…} onRetry={…}>` with:

```tsx
const state = usePageState({ permission: "crm:blueprints:view", isLoading, isError, error, isEmpty });
…
<PageState resolution={state} loading={<DataTableSkeleton rows={10} columns={5} />} empty={emptyState} onRetry={refetch}>
```

Use each call site's existing permission key, skeleton and empty node verbatim — this is a mechanical swap, not a redesign.

- [ ] **Step 2: Migrate `plan-tab.tsx`**

`<EntitlementGate error={error} onRetry={refetch}>` becomes `<PageState resolution={pageStateFromError(error) ?? { kind: "ready" }} loading={null} onRetry={refetch}>`.

- [ ] **Step 3: Delete both components and the barrel line**

```bash
cd frontend && rm components/shared/gated.tsx components/entitlement-gate.tsx
```

Remove `export { Gated } from "./gated";` from `components/shared/index.ts:8`.

Keep `lib/rbac/gate.ts` — `resolveGate` and `accessState` are still used by `useCanState` and by the classifier's semantics.

- [ ] **Step 4: Prove nothing still references them**

```bash
cd frontend && pnpm exec knip --no-progress && pnpm type-check && pnpm build
```

Expected: exit 0. `type-check` alone is insufficient — only a real `next build` catches a missing side-effect import.

- [ ] **Step 5: Commit**

List the changed paths explicitly. Never `git add -A` or `git add .` — the backend tree carries 20 uncommitted files belonging to another session, and a blanket add in either repo would sweep in a stranger's work under this plan's message.

```bash
git add frontend/components/shared/index.ts frontend/app/\(authenticated\)/crm/settings frontend/features/timesheets/reports frontend/features/billing/components/plan-tab.tsx
git rm frontend/components/shared/gated.tsx frontend/components/entitlement-gate.tsx
git commit -m "refactor(page-state): fold Gated and EntitlementGate into one component

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `/access-denied` renders inside the shell

Spec D2. Today it is a standalone route at `app/access-denied/page.tsx`, outside `(authenticated)`, so a denied user loses the sidebar, the header and their place — and `requireModulePermission` sends `required=module:hr`, which the page renders to the customer as a raw permission chip.

**Files:**
- Create: `frontend/app/(authenticated)/access-denied/page.tsx`
- Delete: `frontend/app/access-denied/page.tsx`
- Modify: `frontend/lib/rbac/require-permission.ts:83-90` (module denial keeps its reason in the query string)
- Test: `frontend/app/(authenticated)/access-denied/access-denied.test.tsx`

**Interfaces:**
- Consumes: `PageState` (Task 3), `PageWrapper` (Task 5).
- Produces: no new exports. The route keeps accepting `?required=` and `?from=`, and additionally accepts `?reason=`.

- [ ] **Step 1: Write the failing test**

```tsx
it("names the module and offers the fix, rather than showing module:hr as a permission", async () => {
  render(await AccessDeniedPage({ searchParams: Promise.resolve({ required: "module:hr", reason: "org-disabled" }) }));
  expect(screen.queryByText("module:hr")).toBeNull();
  expect(screen.getByRole("link", { name: /modules/i })).toBeInTheDocument();
});

it("still lists a plain permission key when that is what was missing", async () => {
  render(await AccessDeniedPage({ searchParams: Promise.resolve({ required: "hr:employees:view" }) }));
  expect(screen.getByText("hr:employees:view")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend && pnpm test -- app/\(authenticated\)/access-denied
```

Expected: FAIL — the route does not exist at that path yet.

- [ ] **Step 3: Move the route into the group**

Create `app/(authenticated)/access-denied/page.tsx`. Carry over the existing `searchParams` parsing from `app/access-denied/page.tsx:15-18`, then render through `PageWrapper` + `PageState`: when `required` starts with `module:`, build the resolution with `fromModuleDenial`-equivalent inputs from `reason`; otherwise render `{ kind: "denied", permission: required }`.

Delete the `AppThemeProvider`/`AppThemeScript` mounting (`:28-31`) and its explanatory comment — the authenticated layout already provides both, and that comment documents a problem this move removes.

- [ ] **Step 4: Pass the reason through the redirect**

`frontend/lib/rbac/require-permission.ts:83-90` — append the availability reason to the module-denial redirect so the page can render the right remedy. The reason is available from the access snapshot's module map only as a boolean, so send `org-disabled` unless the caller knows better; the 402 path (Task 1) remains the authoritative source.

- [ ] **Step 5: Delete the old route**

```bash
cd frontend && rm -r app/access-denied
```

- [ ] **Step 6: Verify every inbound link still resolves**

```bash
cd frontend && grep -rn "/access-denied" app lib components features --include=*.ts --include=*.tsx | grep -v node_modules
pnpm type-check && pnpm build
```

`/access-denied` is in the universal allowlist (`universal-routes.ts:124`), so the authenticated layout will not bounce it. Confirm `proxy.ts` does not special-case the old path.

- [ ] **Step 7: Commit**

```bash
git add -A frontend/app frontend/lib/rbac/require-permission.ts
git commit -m "fix(access-denied): keep the customer inside the app when access is refused

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Phase 1 gate

- [ ] **Step 1: Full verification, both repos**

```bash
cd backend && NODE_OPTIONS=--max-old-space-size=10240 pnpm typecheck && NODE_OPTIONS=--max-old-space-size=10240 pnpm typecheck:test && pnpm check:module-gate && pnpm check:route-classification && pnpm check:cycles
cd ../frontend && pnpm type-check && pnpm check:properties && pnpm check:empty-states && pnpm check:gated-reads && pnpm check:response-contracts && pnpm check:route-access-contract && pnpm build
```

- [ ] **Step 2: Record which checks did not run and why.** Report unrun checks explicitly; do not present a partial run as a pass.

---

# Phase 2 — Six proof pages

Stop after this phase and hand back for review. Do not begin Documents, Home or HRMS rollout until the review returns.

The six are chosen to exercise every kind at least once, one per architecture shape:

| # | Page | Proves |
|---|---|---|
| 1 | `app/(authenticated)/build/[projectId]/feedbucket/page.tsx` | the captured 402 `org-disabled` — the screenshot itself |
| 2 | `app/(authenticated)/hr/employees/page.tsx` | server-gated list, `denied` + `empty` + `error` |
| 3 | `app/(authenticated)/knowledge/wiki/templates/page.tsx` | server-gated with **no** client denial branch today |
| 4 | `app/(authenticated)/me/pay/page.tsx` | universal self-service — proves the no-gate zone holds |
| 5 | `app/(authenticated)/hr/settings/policies/page.tsx` | the worst cluster: no `loading.tsx`, no `error.tsx` |
| 6 | `app/(authenticated)/dashboard/page.tsx` | universal, already has states — proves no regression |

For each page:

- [ ] **Step 1: Capture the current behaviour** — screenshot or note what renders for a denied/disabled actor, before changing anything.
- [ ] **Step 2: Move the page's read onto `usePageState`**, passing the module key only where the route is **outside** the universal no-gate zone. Pages 4 and 6 get `permission`/`isEmpty` only — **never** a `module`.
- [ ] **Step 3: Pass `state`, `loading`, `empty`, `onRetry` to the page's `PageWrapper`.** Delete the ternary chain it replaces.
- [ ] **Step 4: Typecheck and test.**

```bash
cd frontend && pnpm type-check && pnpm test -- <the page's own test path>
```

- [ ] **Step 5: Commit per page**, so a bad one reverts alone.

- [ ] **Step 6: Browser proof.** Boot the stack and load page 1 as a member of an org with `feedbucket` disabled. Expected: the module name, an *Enable* path to `/settings/modules`, and **no** upgrade link and **no** "Try Again". A passing typecheck is not proof of a customer journey.

- [ ] **Step 7: Report.** List each page, what it rendered before, what it renders now, and every check that did not run.

---

## Deliberately deferred: the backend guard audit (spec D5 / §6.2)

Spec §6.2 requires every endpoint behind Home, HRMS and Documents to be checked for a missing module/plan guard, with each added guard reported individually. **That work is not in this plan**, and its absence here is a decision, not an oversight:

- It changes live API behaviour on endpoints that work today, so it must not ride along with a rendering change — if a screen breaks, the cause has to be unambiguous.
- It is naturally per-module, so it belongs with phases 3–5, where the same agents are already reading each module's controllers.
- Until Task 1 ships, a new guard would emit the wrong message anyway.

It gets its own plan per module, written after the Phase 2 review, and each added guard is reported with route, module asserted, and justification before it ships.

## Rollout phases 3–5 (not in this plan)

Documents (20) → Home (23) → HRMS (127), one plan each, written after the Phase 2 review. Fan-out rule: read-only audit agents propose, the coordinator applies. No two agents in one file. `page-wrapper.tsx`, `sidebar-nav-items.ts`, `resolve-page-state.ts` and `page-state.tsx` stay coordinator-owned throughout.
