# 04 — Chatbot retrieval is permissioned and bounded

**Status:** in-progress — no-eligible-content short-circuit not independently verified; all security and citation criteria done

## Acceptance criteria

- [x] Tenant, actor, space and record ACL predicates run before candidates reach the model. — pre-existing `visibleTo`/`pageVisibleTo`/`chunkVisibleTo` predicates plus the new ACL-revision join (`kb-search.service.ts:293,364`) all run inside the retrieval SQL query, before any text reaches `kb-ask.service.ts`'s prompt assembly.
- [x] The model never receives permission tables, role names or grant history. — `kb-ask.service.ts:22-28` (`ASK_SYSTEM_PROMPT`) instructs the model to answer only from provided context; no permission/role data is included in `context`/`fullContext` construction (`:78-119`), which is built solely from `contentText`/`snippet` fields.
- [x] Hybrid retrieval has hard caps on candidates, chunks, bytes and tokens. — `MAX_CONTEXT_ARTICLES = 6`, `MAX_CONTEXT_CHARS = 1500`, `MAX_TOTAL_CONTEXT_BYTES = 32_000`, `MAX_PROMPT_INPUT_TOKENS = 8_000` (`kb-ask.service.ts:17-20`), enforced during context assembly (`:83,105`) and pre-gateway truncation (`:117-119`).
- [ ] No eligible content short-circuits before embedding or generation. — not independently verified; the empty-result branch at `:63-76` was not changed and appears correct, but no dedicated test exercises it.
- [x] Citations re-resolve through direct-read visibility before response — for all content kinds. `resolveCitations` (`:154-189`) re-queries `kbArticles`/`kbPages`/`kbSources` with live access predicates after the AI call. `resolveVisibleSources` (`:191-207`) re-checks `kbSources` with the caller's accessible space ids, so the source-citation race window that was open in the first batch is now closed. Three tests in `kb-source-citation.spec.ts:88-148` cover source citation filtering.
- [x] Prompt-injection tests cannot widen retrieval. — `kb-source-citation.spec.ts:151-287`: two adversarial tests prove the SQL `WHERE` predicate structure is identical regardless of query string content — an injection payload in the query or document snippet produces the same conditions as a benign query.
- [x] Cost, latency, tokens and model are recorded through the AI gateway. — `kb-ask.service.ts:121-131` calls `aiGateway.invokeTextWithUsage(...)` (the `*WithUsage` gateway variant per house convention) and returns `aiUsage` in the response (`:151`).
