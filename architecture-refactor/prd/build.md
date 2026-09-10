# Build and project management

Build cross-tab cache freshness is implemented. Browser acceptance and acceptance on
the performance-approved build remain pending.

Completed 2026-09-10: **BUILD-001 / PRD-C123**. The scoped
[cache subscription](../../frontend/lib/build-cache-sync.ts) propagates successful
authorized Build mutations using invalidation-only messages. Active peer-tab queries
refetch; inactive queries become stale. Session changes dispose the subscription.
Publication runs from the QueryClient's global mutation-success callback before
local callbacks, retaining the originating scope when a pending mutation finishes
after its provider unmounts or switches organization. Active sender channels are
reused to avoid self-invalidation; detached senders publish through a temporary channel.
[Two-QueryClient regression coverage](../../frontend/lib/build-cache-sync.test.tsx)
proves a peer refetch even without a corresponding sender cache entry, no echo,
tenant/user isolation, failure handling, cleanup, and storage fallback. Follow-up
regressions cover a local success callback throwing after the server commits,
sender unmount and scope switch during a pending mutation, and refused channel creation.
The final actual-hook regression exposed three locally defined query keys outside
the canonical Build prefix. Custom-field definitions, ticket custom-field values
and project automations now use the central key factory. The regression first
failed with three reads instead of six after a peer mutation, then passed with all
three active peer hooks refetching. The final cache/factory/mutation run passed
three suites / 27 tests, including all ten cross-tab cases.

Verification: `pnpm -C frontend exec jest --runInBand --runTestsByPath lib/build-cache-sync.test.tsx hooks/api/build/mutation-invalidation.test.ts lib/query-keys/key-factory-contract.test.ts lib/query-scope-isolation.test.tsx`
initially passed **4 suites / 30 tests**. After the timing fixes,
`pnpm -C frontend exec jest --runInBand --runTestsByPath lib/build-cache-sync.test.tsx`
passed **1 suite / 9 tests**, adding four cases to the original five in that suite.
`pnpm -C frontend check:query-scope` and
`pnpm -C backend check:cache-invalidation` exited 0. These results describe the
2026-09-10 working tree; final revision/build reconciliation belongs to the coordinator.

## BUILD-002 — Complete browser acceptance matrix
Status: BLOCKED-EXTERNAL
Maps to: PRD-C123, PRD-C149
Parallel group: 1
Depends on: none
Owner: build acceptance agent

Scope: Verify loading, empty, error, retry, cross-tab freshness, keyboard/accessibility behavior, and responsive layouts at 375, 768, and 1280 pixels.

Completion: Current-head screenshots or recordings and an acceptance table cover every state and viewport, with defects fixed or linked as tasks.

Current evidence, 2026-09-10: ticket-key resolution and ticket-detail request failures
now render a retryable error instead of a false not-found result; genuine 404s retain
not-found behavior. Empty risk cells have contextual accessible names and selected
state. Saved-view controls and the reaction picker stay visible on touch devices;
reaction buttons expose pressed state; the parent-ticket search has an accessible name.
[Ticket failure/retry tests](../../frontend/features/build/ticket-details/ticket-detail-errors.test.tsx)
and [risk keyboard tests](../../frontend/features/build/governance/risk-matrix.test.tsx),
with the existing ticket-cache regression suite, passed **3 suites / 13 tests** using
`pnpm -C frontend exec jest --runInBand --runTestsByPath features/build/ticket-details/ticket-detail-errors.test.tsx features/build/governance/risk-matrix.test.tsx hooks/api/build/ticket-cache-regression.test.ts`.

Blocker: the connected browser runtime reports `No browser available` and an empty
browser list. Component checks do not certify browser layout or actual tab transport.

| Acceptance state | 375 px | 768 px | 1280 px | Current non-browser proof |
| --- | --- | --- | --- | --- |
| Loading and empty | Not run | Not run | Not run | Prior evidence only; fresh browser capture required |
| Error and retry | Not run | Not run | Not run | Ticket-key/detail error and retry regressions pass |
| Cross-tab freshness | Not run | Not run | Not run | Two independent QueryClients pass via channel adapter |
| Keyboard and accessibility | Not run | Not run | Not run | Risk matrix keyboard/name/selected-state checks pass |
| Responsive layout | Not run | Not run | Not run | Fresh browser screenshots required |

## BUILD-003 — Re-run Build acceptance after performance closure
Status: FINAL-INTEGRATION
Maps to: PRD-C149, PRD-C190
Parallel group: 4
Depends on: BUILD-002, ARCH-002
Owner: release coordinator

Scope: Re-run the Build user journey on the accepted Web Vitals build.

Completion: Browser acceptance and performance evidence name the same frontend revision.
