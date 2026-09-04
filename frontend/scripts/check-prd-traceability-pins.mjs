/**
 * The two pinned corpora `check-prd-traceability.mjs` enforces, kept in their own module so the
 * self-test can import them WITHOUT executing the gate — an `export` in the gate itself would run
 * its whole top-level body, and its `process.exit(1)`, on import.
 *
 * They live outside the gate for a second reason. PRD-C017's own defect was that every constant the
 * gate defends itself with sat inside the gate: one commit could lower a floor, delete the matching
 * pin and delete the criterion, and both the gate and the self-test still printed PASS. The
 * self-test now generates one case per key here, so removing an entry removes a passing case and
 * changes the `N/N` line a reviewer reads.
 */

// --- PRD-C017: the restored module evidence, pinned by id ------------------------------------
// Exported so the self-test generates one deletion case AND one repurposing case per key rather
// than pinning a single one. With only PRD-C127 covered, nine of the ten could be deleted from the
// PRD, the manifest, their ticket AND this map in one commit and the self-test still reported
// 10/10 PASS.
//
// `match` is what makes the pin an assertion about MEANING rather than about an id string.
// MEASURED at head before it existed: rewriting PRD-C127 from "Reconstruct current-head Chat
// evidence…" to "…current-head Support evidence…" in BOTH the PRD line and 12-chat.md left the
// gate at exit 0 — the id still existed, both sides still matched each other, so TEXT DRIFT stayed
// silent and the pin only ever asked "does this id exist?". Chat's restored evidence had been
// repurposed into something else while the gate reported it protected. `match` holds the lowercased
// substrings the criterion's own text must STILL contain for it to be the module it was restored
// for; ALL of them must be present. They are chosen against the head text (`workflow` matches the
// PRD's singular "Workflow evidence"; `directory` + `/me` spell "Directory/Me"), never derived from
// `module`, which is a display name.
//
// A `match` list may never be emptied or trimmed to nothing — the gate fails a pin with no
// substrings, because an assertion over zero substrings is the same disarm as deleting the check.
export const RESTORED_MODULE_EVIDENCE = {
  "PRD-C115": { module: "Home", match: ["home"] },
  "PRD-C118": { module: "Directory/Me", match: ["directory", "/me"] },
  "PRD-C119": { module: "HRMS", match: ["hrms"] },
  "PRD-C123": { module: "Build/PM", match: ["build/pm"] },
  "PRD-C124": { module: "Workflows", match: ["workflow"] },
  "PRD-C125": { module: "Billing/Payments", match: ["billing", "payment"] },
  "PRD-C126": { module: "Accounting/Finance", match: ["accounting", "finance"] },
  "PRD-C127": { module: "Chat", match: ["chat"] },
  "PRD-C132": { module: "Notifications", match: ["notification"] },
  "PRD-C136": { module: "Shared adapters", match: ["shared-adapter"] },
};

// --- The id-less legacy criteria, frozen -----------------------------------------------------
// Ownership above is enforced only over checkbox lines carrying a `**[PRD-Cnnn]**` id, so a
// checkbox line WITHOUT one used to be invisible to this gate: not counted toward the vacuity
// floor, never reported UNOWNED, unable to fail anything. MEASURED at head: 232 checkbox lines,
// 195 with an id, 37 without. Flipping one of the 37 from `[x]` to `[ ]` — the honest edit when a
// later ticket finds the work regressed — left an unchecked acceptance criterion with no id, no
// manifest row and no owning ticket, and this gate still exited 0 printing "PASS — every criterion
// has exactly one owner". Inserting a brand-new id-less `- [ ]` criterion did the same. That is the
// exact defect class the docstring above says this gate exists to close.
//
// These 37 are the frozen measurement, NOT a licence. They may be ticked, but never un-ticked,
// never deleted, and never added to: a new criterion must carry an id and an owner. Deleting a
// line here without deleting it from the PRD, or vice versa, fails.
export const LEGACY_UNIDENTIFIED = [
  "Prove domain modules expose small, stable interfaces and keep implementation local; remove shallow pass-through layers that add no behavior.",
  "Prove Home only composes universal experiences; Chat, Calendar, Inbox and Notifications retain independent business implementation.",
  "Prove zero circular imports, forbidden new `forwardRef`, barrel self-imports and erased Nest injection tokens.",
  "Keep authenticated `app/**/page.tsx` and `layout.tsx` files as thin route modules for metadata, parameters, server authorization and composition; move state, forms, queries and mutations behind feature-owned interfaces and gate route-file size/import direction without changing landing visuals or animations.",
  "Keep Zod schemas in module DTO/schema files, derive types with `z.infer`, reject protected/client-supplied actor and tenant fields and enforce unknown-key policy.",
  "Prove controllers remain thin, business rules stay backend-side and no frontend `app/api` or client module contains business/database logic.",
  "Establish a new clean migration baseline after authorized destructive rebase/squash, recreate disposable staging from zero and exercise interruption/retry plus rollback/forward-fix using [RB-09](runbooks/RB-09-migration-rollback.md); no legacy watermark upgrade is required.",
  "Verify every route is classified public, universal, permissioned or explicitly authorized inside its implementation; no undeclared route exists.",
  "Verify background sweeps iterate tenant context explicitly, use bounded/resumable leases and expose retry/DLQ/cancellation states.",
  "Reconcile OpenAPI exposure, request, response, 4xx schema and operation metadata with active controllers and consumers.",
  "Keep one canonical route per product operation; remove dead, versionless, duplicated and overlapping routes after caller/dependency proof.",
  "Support conditional responses with version/ETag or `Last-Modified` where correctness permits; include tenant, permission and representation changes in the validator.",
  "Keep response/error envelopes, pagination metadata and cache headers consistent across modules and prove frontend/OpenAPI contract compatibility.",
  "Remove duplicated/ad-hoc string query keys and prove invalidation targets the correct prefix without flushing unrelated tenants/modules.",
  "Enforce canonical query-key factories for authenticated data: zero ad-hoc array keys or local key factories, no redundant tenant argument where the scoped Query hash already owns tenant/user identity, and exact invalidation tests for every mutation.",
  "Expose shallow liveness and dependency-aware readiness interfaces, plus graceful shutdown, connection draining and worker lease handoff in code. A failed database, cache, queue or required provider dependency must produce an explicit degraded/unready state without making health probes amplify the outage; deployed probe and alert delivery evidence remains deferred.",
  "Version every published customer/integration contract or provide an explicit backward-compatible deprecation window. Reconcile REST/OpenAPI, webhooks, realtime events, exports and SDK-facing schemas with consumer evidence, idempotency/replay rules and removed-operation records; coordinated internal frontend/backend contracts may break only in the same release commit.",
  "Give the notification lifecycle mutations an `onError` and a rollback. `frontend/hooks/api/notifications-inbox.ts`",
  "Reduce authenticated client route modules below the current 304-page ceiling, never raise that ceiling, and move data/authorization/orchestration to server or feature seams while preserving interactive leaf components; public landing visuals and animations remain untouched.",
  "Test session fixation/replay, revoked membership, invitations, password reset, MFA/recovery, brute force and credential stuffing behavior.",
  "Test code-level CSRF, XSS, SSRF, SQL injection, unsafe redirect, path traversal, CORS/CSP/headers, payload limits and rate limits.",
  "Verify secret/PII redaction, secure cookies/sessions, generic auth failures and signing/encryption-key rotation behavior.",
  "Implement correction/rectification rather than treating export, deletion or anonymization as correction.",
  "Make subject export exhaustive and resumable with no silent caps or skipped in-scope sources.",
  "Implement idempotent tenant-scoped erasure for database, object storage, search/vector, projections, caches and supported adapters while preserving immutable/legal-hold records.",
  "Prove retention workers are code-scheduled, bounded/resumable, idempotent, audited, retryable and emit failure events.",
  "Prove document, payroll, export, purge and retention workflows never silently skip or truncate growing work.",
  "Eliminate request waterfalls where dependencies are known, prefetch only likely/authorized routes and prevent speculative prefetch from leaking or overloading tenant data.",
  "Virtualize or incrementally render large chat, calendar, inbox, notification, directory, HR and Build collections while preserving accessibility and cursor correctness.",
  "Optimize images, fonts and eligible static assets, use HTTP compression for text responses and keep upload/media transformations asynchronous.",
  "Measure memory, render count, long tasks and hydration mismatches on representative Home/module journeys; eliminate avoidable rerenders and main-thread blocking.",
  "Route every AI feature through one backend AI gateway with small model/provider interfaces, centralized timeouts, usage accounting, policy, redaction and observable error modes; no frontend direct-provider calls.",
  "Keep AI out of authentication and authorization decisions; deterministic RBAC and tenant/record ACL checks must finish before retrieval or provider invocation.",
  "Reserve token-metered credits atomically before paid calls, settle actual input/output usage in milli-credits and refund only according to the documented failure contract.",
  "Bound prompts, history, retrieved chunks, tool iterations, output tokens, concurrency and per-tenant/user rate; reject or summarize oversized context rather than consuming unbounded memory/cost.",
  "Record provider time-to-first-token separately and target end-to-end p95 ≤ 2 s where the selected model/provider supports it; provider-bound exceptions belong in deferred evidence, not hidden in application latency.",
  "Emit tenant-safe metrics for queue time, application overhead, provider latency, time-to-first-token, tokens, credits/cost, cache hit, cancellation, retry and failure without logging prompts or sensitive content.",
];
