# 03 — Whether the two products share one permission namespace is a decision

**What to build:** A recorded decision on whether the public help centre and the internal wiki continue to share one permission namespace.

**Blocked by:** None — can start immediately.

**Status:** decided 2026-08-25 — keep one namespace

---

## The 30 keys, attributed

**Help centre only** — `kb:articles:view|create|update|delete|manage`, `kb:categories:manage`, `kb:analytics:view`, `kb:ai:generate` (enforced only in the help-centre authoring controller).

**Wiki only** — `kb:pages:view|create|update|delete|manage|export|import|purge`, `kb:reviews:view|manage`, `kb:templates:manage`.

**Genuinely shared** — `kb:spaces:view`, `kb:spaces:manage`, `kb:settings:manage`.

The articles/pages split is clean: no `kb:articles:*` key gates a wiki surface and no `kb:pages:*` key gates a help-centre one. The whole question turns on `kb:spaces:*`.

## The apparent crossing is not drift

Two facts looked like defects at first reading:

- `kb:spaces:view` gates the help centre's categories controller, not just wiki spaces.
- `kb:spaces:manage` drives `KbAccessService.isAdmin`, which is consulted on **article** paths and in retrieval, not only on wiki paths.

Both are correct, because **spaces are the shared container, not a wiki concept**:

- `kb_articles.space_id` and `kb_pages.space_id` both reference the same `kb_spaces` table, and the article service actively filters on it (`inArray(kbArticles.spaceId, ids)`).
- `kb_spaces` carries `is_public_help_center` and `default_visibility` — one table serving both products, with a flag distinguishing which product a space belongs to.
- `assertSpaceAccessible` lives in `kb/core/` — the shared folder, not `wiki/` — and is called from `help-centre/kb-articles.service.ts`, `help-centre/kb-categories.service.ts` **and** `wiki/kb-spaces.service.ts`.

A key that gates the shared container legitimately governs both products' content inside it. That is the container doing its job, not a namespace leaking.

## Decision: keep one `kb:` namespace

**Reasoning**

1. **The crossing keys gate a genuinely shared resource.** Splitting `kb:spaces:*` into help-centre and wiki variants would require splitting `kb_spaces` itself — a data-model change with FK, migration and ACL consequences — not a key rename. That is a much larger question than this ticket, and nothing observed suggests the shared space table is wrong.
2. **The resource-level keys are already separate.** `kb:articles:*` and `kb:pages:*` do not cross. Someone granted article authorship does not thereby gain wiki authority, and vice versa. The concern that motivated this ticket — "a grant intended for one product may confer authority over the other" — is true only for the space container, where it is intended.
3. **The cost of splitting is high and the benefit is naming.** A key rename invalidates every stored grant, needs a backfill migration, and must land in both catalogs simultaneously or `useCan` answers false forever. "It would be tidier" does not clear that bar, and the ticket set that bar deliberately.
4. **The module is core.** `kb` is one of the modules the root constitution names as core, so both products are reachable by every active member regardless. Splitting the namespace would not change who can reach what at the module level.

**This corrects the spec.** `docs/specs/c6-split-kb-help-centre-and-wiki.md` frames the shared namespace as "undecided rather than decided" and implies it may be residue from the flat folder. It is not — the sharing follows the data model, and the backend folder split deliberately left `kb-access.service.ts` and `kb-scope.ts` in `core/` precisely because both products consult them.

**One thing to keep an eye on:** `kb:settings:manage` gates the help-centre/wiki settings controller, the article-to-page conversion tool and the page-indexing controller. That is three fairly different administrative capabilities behind one key. It is not a product-crossing problem, but if those ever need separate delegation, that is the key to split — and it can be split without touching `kb:spaces:*`.

## Acceptance criteria

- [x] Every key in the shared namespace is listed and attributed to the help centre, the wiki, or genuinely both.
- [x] Any key that currently confers authority across both products is identified explicitly — `kb:spaces:view`, `kb:spaces:manage`, `kb:settings:manage`.
- [x] A written verdict: **keep one namespace**, with the reasoning.
- [x] If keeping: the rationale is recorded here so it is not re-litigated.
- [x] If splitting: N/A — the consequences are stated above as part of the reasoning for not splitting.
- [x] No key changes in this ticket.

## Todo

- [x] Enumerate the namespace's keys from the catalog and attribute each to a product
- [x] Find the keys that cross both products and check what standing they actually confer
- [x] Check whether any role template grants a key that reaches the other product — moot once the crossing is shown to follow the shared container
- [x] Decide and record the verdict with reasoning
- [x] No follow-up ticket needed; nothing to split
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
