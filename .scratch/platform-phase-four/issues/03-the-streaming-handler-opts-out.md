# 03 — The one streaming handler opts out of the request transaction

**What to build:** `@NoTenantTransaction()` on the AI chat stream.

`TenantContextInterceptor` wraps each request in one tenant transaction held in AsyncLocalStorage. `pipeTextStreamToResponse` **returns before the stream ends**, so the handler completes, the transaction commits, and the tenant GUC is gone — while the model's tools and `onFinish` are still running against that context. That is the shape that previously produced `42501` and swallowed every notification write.

`ChatAssistantController.chatAssistant` was the only handler in the product doing this without the opt-out. Twelve other AI controllers carry it.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The streaming handler is opted out of the ambient request transaction.
- [ ] The opt-out is on the **handler**, not the class. The controller also serves conversation listing and action confirmation, which are ordinary requests that should keep the ambient transaction. `getAllAndOverride([handler, class])` makes handler-level win.
- [ ] Everything the stream does afterwards already opens its own transaction — verified before adding the decorator, not assumed: tools go through `withTenantScopedTools` → `runInNewTenantTransaction`, and `onFinish` wraps its ledger settle, usage tracking and history append the same way. Adding the opt-out to a handler that did *not* do this would break it.
- [ ] No other handler in the product streams without the opt-out.
