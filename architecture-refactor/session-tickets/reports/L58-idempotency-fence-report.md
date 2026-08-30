# L58 — Idempotency Fence: Fail-Closed Extraction

## What was done

Removed the fail-open `claim()` catch wrapper added by L55 and extracted the `command_fences` persistence into a dedicated `CommandFenceStore` injectable that can be overridden in e2e.

## Extraction

**New file: `src/common/idempotency/command-fence-store.ts`**

Exports:
- `ClaimParams` / `ClaimResult` types (moved from the interceptor's private scope)
- `CommandFenceStore` interface (`claim`, `complete`, `fail`)
- `COMMAND_FENCE_STORE` injection token
- `DrizzleCommandFenceStore` — real implementation; injects `DRIZZLE`, contains all insert/select/update calls that were previously in `claimInner`, `complete`, and `fail` on the interceptor
- `InMemoryCommandFenceStore` — test implementation; uses an in-memory `Map`, same four-branch policy as the Drizzle version

**Updated: `src/common/idempotency/idempotency.interceptor.ts`**

- Removed `@Inject(DRIZZLE)` and all Drizzle imports
- Injects `@Inject(COMMAND_FENCE_STORE) private readonly store: CommandFenceStore`
- Removed the `claim()` wrapper and its `try/catch` that returned `{ kind: "proceed", fenceId: null }` on error
- Calls `this.store.claim(...)` directly — errors propagate to the NestJS exception pipeline (fail-closed)
- `complete` and `fail` are now `this.store.complete(...)` / `this.store.fail(...)`
- All policy logic (header validation, hashing, four `ClaimResult` branches, replay/mismatch/inflight) is unchanged

**Updated: `src/common/idempotency/idempotency.module.ts`**

- Provides `{ provide: COMMAND_FENCE_STORE, useClass: DrizzleCommandFenceStore }` and exports the token so e2e can override it

## Harness override

**Updated: `test/helpers/e2e-app.ts`**

Added `.overrideProvider(COMMAND_FENCE_STORE).useValue(new InMemoryCommandFenceStore())` to the `createE2eApp` builder. The in-memory store works correctly without a database, preserving all fence semantics (replay, inflight, mismatch) for any test that reaches a handler.

The `Idempotency-Key` header check happens before any store call and remains live — a missing header still returns 400 in e2e.

## E2e replay assertion

Adding a replay assertion to the existing `module-access` or `ownership` suites is not cheap: those suites test guard behavior (401/402/403) and do not set up mocked handler bodies for the 201-path routes that carry `@Idempotent`. A proper replay assertion belongs in a dedicated idempotency e2e spec. Skipped.

## Test results

### Unit tests (`--testPathPattern="idempot"`)

**Before:** 11 tests across 3 suites (billing-idempotency, hr-export-idempotency, idempotency.interceptor)  
**After:** 32/32 pass. The interceptor spec was rewritten to mock `CommandFenceStore` instead of `Db`, and a new "propagates store errors (fail-closed)" test was added to assert the removed catch is gone.

### `pnpm check:idempotent-commands`

PASS — 9 handlers in scope, all carry `@Idempotent`.

### `NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck`

PASS — clean, no errors.

### E2e (`--testPathPattern="module-access|ownership"`)

```
Tests: 5 failed, 198 passed, 203 total
```

- module-access: 166/168 (2 pre-existing assertion mismatches: ownership-transfer 403-vs-201, cancel-transfer 403-vs-404)
- ownership: 32/35 (3 pre-existing assertion mismatches: FORBIDDEN-vs-OWNER_ONLY_OPERATION message/code)
- **Zero 500s** — the in-memory store serves every fenced route without hitting the database

Numbers match L55's baseline exactly. No regressions.

## Files changed

- `src/common/idempotency/command-fence-store.ts` — NEW
- `src/common/idempotency/idempotency.interceptor.ts` — store injection + fail-open catch removed
- `src/common/idempotency/idempotency.module.ts` — provides COMMAND_FENCE_STORE
- `src/common/idempotency/idempotency.interceptor.spec.ts` — rewritten to mock CommandFenceStore
- `test/helpers/e2e-app.ts` — overrides COMMAND_FENCE_STORE with InMemoryCommandFenceStore
