# TYPE2 — Six TypeScript errors fixed

**Test result:** 40 suites, 331 passed, 1 skipped, 0 failed.

---

## Errors 1+2 — support-ai.service.ts(115,74) and (117,59)

**Root cause.** `searchKbForTicket` synthesised `const user = { orgId, userId }` and passed it to `KbAccessService.getAccessibleSpaceIds(user)` and `getPrincipalIds(user)`. Both require `CurrentUserContext` (which also carries `role`, `isOrgOwner`, `sessionId`, `tokenScopes`, `principal`). The partial object was structurally invalid.

**Fix.** Threaded the real `CurrentUserContext` down from the controller:

1. `searchKbForTicket(orgId, userId, query)` → `searchKbForTicket(user: CurrentUserContext, query)`. Removed the synthesised `user` object; all uses of `orgId` inside the method body replaced with `user.orgId`.
2. `suggestReply(orgId, ticketId, userId)` → `suggestReply(user: CurrentUserContext, ticketId)`. `orgId`/`userId` references replaced with `user.orgId`/`user.userId`.
3. `suggestKbArticles(orgId, ticketId, userId)` → `suggestKbArticles(user: CurrentUserContext, ticketId)`.
4. `generateHandoffSummary(orgId, ticketId, userId)` → `generateHandoffSummary(user: CurrentUserContext, ticketId)`.
5. `runFullAnalysis(orgId, ticketId, userId)` → `runFullAnalysis(orgId, ticketId, _userId?)`. `suggestKbArticles` removed from the body: background ticket creation has no full user context, so KB article suggestion (which requires per-user space ACL resolution) cannot run safely. `analyzeTicket` and `findDuplicates` are kept; they do not need `CurrentUserContext`.

**Controller update (support-ai.controller.ts — necessary to keep zero new errors).**
- `this.ai.suggestKbArticles(u.orgId, ticketId, u.userId)` → `this.ai.suggestKbArticles(u, ticketId)`
- `this.ai.suggestReply(u.orgId, ticketId, u.userId)` → `this.ai.suggestReply(u, ticketId)`
- `this.ai.generateHandoffSummary(u.orgId, ticketId, u.userId)` → `this.ai.generateHandoffSummary(u, ticketId)`

**Tenant-isolation spec update (support-ai-tenant-isolation.spec.ts).** The spec cast `suggestKbArticles` back to the old 3-arg signature to call it. Updated to pass a proper `CurrentUserContext` literal; the mock for `kbAccess.getAccessibleSpaceIds` does not inspect the object so test semantics are unchanged.

**Runtime behaviour change.** `runFullAnalysis` (fired after ticket creation) no longer triggers `suggestKbArticles`. KB article suggestions are still available on demand via the dedicated `POST /:ticketId/ai/suggest-kb-articles` endpoint where the full user context is present. This is the correct behaviour — KB ACL enforcement requires the requesting user's identity.

**Why correct rather than silencing.** Inventing the missing fields (`principal`, `role`, `isOrgOwner`) would have fed incorrect identity into `AccessService.holds` and potentially widened or narrowed KB space visibility relative to the requesting user's actual grants. Threading the real context is the only safe option.

---

## Error 3 — support-kb.service.ts(409,10): Property 'indexAttachment' does not exist on type 'KbIndexingService'

**Root cause.** `KbIndexingService` exposes `indexArticle`, `indexPage`, `removeArticleChunks`, `removePageChunks`, and `reindexAllPages`. No `indexAttachment` method exists or has ever existed in the current service. The call was a dead reference — attachment indexing was not implemented in this service.

**Fix.** Removed the entire fire-and-forget block:
```
void this.indexing.indexAttachment(orgId, inserted.id).catch(...)
```
The attachment row is still persisted; only the non-existent indexing call is removed. If attachment-level vector indexing is ever needed, it requires a new method on `KbIndexingService`.

---

## Error 4 — support-kb.service.ts(410,17): Parameter 'err' implicitly has an 'any' type

**Root cause.** The `.catch((err) => ...)` on the now-removed `indexAttachment` call had no type annotation on `err`.

**Fix.** Resolved as a direct consequence of error 3's fix — the block containing the catch was removed entirely.

---

## Errors 5+6 — tasks.controller.ts(55,22) and (84,3): Duplicate identifier 'analytics'

**Root cause.** The constructor declared `private readonly analytics: TaskAnalyticsService` (a field) and the class body declared an instance method also named `analytics` (the `GET analytics` route handler). TypeScript does not allow a property and a method to share the same name in a class.

**Fix.** Renamed the route handler method from `analytics` to `getAnalytics`. The HTTP route is determined by `@Get("analytics")`, not the method name, so the exposed endpoint is unchanged.

---

## Error 7 — virustotal-av-scanner.ts(71,28): Type 'Buffer<ArrayBufferLike>' is not assignable to type 'BlobPart'

**Root cause.** Node's `Buffer` type is typed as `Buffer<ArrayBufferLike>`. The Web `Blob` constructor accepts `BlobPart[]` where `BlobPart = string | BufferSource | Blob`, and `BufferSource = ArrayBufferView | ArrayBuffer`. Although `Buffer` is a `Uint8Array` subclass at runtime, the TypeScript lib types do not reflect this through the `ArrayBufferLike` type parameter.

**Fix.** `new Blob([buffer], ...)` → `new Blob([new Uint8Array(buffer)], ...)`. `Uint8Array` is unambiguously typed as `BufferSource`, so it satisfies `BlobPart`. `new Uint8Array(buffer)` creates a view over the same underlying `ArrayBuffer` — no copy, exact same bytes — preserving the malware-scan integrity.

---

## Files changed

- `src/modules/support/core/support-ai.service.ts`
- `src/modules/support/core/support-kb.service.ts`
- `src/modules/tasks/tasks.controller.ts`
- `src/common/security/virustotal-av-scanner.ts`
- `src/modules/support/core/support-ai.controller.ts` (controller call sites updated to match new service signatures — prevents new errors)
- `src/modules/support/core/support-ai-tenant-isolation.spec.ts` (updated to new `suggestKbArticles` signature)

## Test counts

Pattern: `support|tasks|av-gate|av-scan`

| Suites | Passed | Skipped | Failed |
|---|---|---|---|
| 40 | 331 | 1 | 0 |
