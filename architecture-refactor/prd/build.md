# Build and project management

Build's audited implementation checks are green except for cross-tab cache freshness.

## BUILD-001 — Implement cross-tab Build cache freshness
Status: READY
Maps to: PRD-C123
Parallel group: 1
Depends on: none
Owner: build frontend agent

Scope: Propagate successful Build mutations from one browser tab so affected Build queries in another tab refetch without directly invalidating that tab's QueryClient.

Completion: A two-QueryClient test proves tab B observes tab A's mutation, and the query-key and cache-invalidation gates pass.

## BUILD-002 — Complete browser acceptance matrix
Status: READY
Maps to: PRD-C133, PRD-C134, PRD-C135, PRD-C149
Parallel group: 1
Depends on: BUILD-001
Owner: build acceptance agent

Scope: Verify loading, empty, error, retry, cross-tab freshness, keyboard/accessibility behavior, and responsive layouts at 375, 768, and 1280 pixels.

Completion: Current-head screenshots or recordings and an acceptance table cover every state and viewport, with defects fixed or linked as tasks.

## BUILD-003 — Re-run Build acceptance after performance closure
Status: FINAL-INTEGRATION
Maps to: PRD-C149, PRD-C190
Parallel group: 4
Depends on: BUILD-002, ARCH-002
Owner: release coordinator

Scope: Re-run the Build user journey on the accepted Web Vitals build.

Completion: Browser acceptance and performance evidence name the same frontend revision.
