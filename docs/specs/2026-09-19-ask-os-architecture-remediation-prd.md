# Ask OS Architecture Remediation — PRD

**Date:** 2026-09-19 · **Scope:** Ask OS chat lane + everything its tools and executors reach
**Source:** architecture review pass 1 + pass 2 (23 candidates), plus one reported production defect
**Constraint:** no commits. Migration `1123` is authored, NOT applied.

---

## 1. Why

Two things are true at once.

The Ask OS lane is *well designed* — a tool registry, a confirmable-action registry, a discriminated outcome union, a credit ledger, 218 gate scripts. And it is *unenforced*: no backend CI runs, so a rule with a dedicated gate, a nominal type and an ADR behind it went red in the newest code and nobody found out.

The census proves the pattern. Every rule the typechecker or a gate enforces has **zero** violations. Every rule that lives only in prose has drifted. This PRD fixes the specific defects and closes the enforcement gap that produced them.

---

## 2. The reported defect (P0-1)

A user schedules a reminder. The assistant asks for confirmation in text, the user replies "Yes", and the assistant asks again — forever. No confirmation card ever renders, and each turn mints a new proposal row.

**Root cause A — the prompt instructs the loop.** `chat-assistant-prompt.ts:79` tells the model, on `{status:"pending_confirmation"}`, to "tell the user the action is ready and waiting for their confirmation". Nothing tells it a card renders and that the card is the only confirmation channel. `:70` ("Confirm details before scheduling or communicating") causes a second, pre-tool ask.

**Root cause B — no propose idempotency.** `AiConfirmationService.propose` dedupes on an explicit key only; the tool passes none, so every retry inserts a fresh row and burns credits.

**Root cause C — card rendering** (pending trace confirmation; see TODO-1.3).

---

## 3. Priorities

| | Theme | Why now |
|---|---|---|
| **P0** | The reported bug · the red gate · CI · the silent payload drop · the RLS regression | Live defects, or blocking the migration |
| **P1** | Extensibility guards · confirm-lane correctness · frontend directive persistence | Makes the next module fast *and* safe |
| **P2** | Token cost · DB cost · reusability · standards · docs | Compounding cost, no live breakage |

---

## 4. TODO items

Done = every unchecked box below is ticked with evidence.

### P0

- [x] **3.4** ⚠ **The premise was wrong, and the truth is worse.** Wire `pnpm typecheck:test` into CI. `pnpm typecheck` is `tsc -p tsconfig.build.json`, which **excludes specs**, and typecheck is the only gate that sees an arity change (`ts-jest` runs `diagnostics: false`). The frontend already does this via `type-check:specs`.

  *A step was added at `ci.yml:89` (`continue-on-error: true`). **But "no gate typechecks specs" was false.** Two already exist in the `gates` job, both blocking, neither with `continue-on-error`: `check:spec-typecheck` (ci.yml:824) runs `tsc -p tsconfig.json`, and `check:test-typecheck` (ci.yml:347). And `tsconfig.test.json` only extends `tsconfig.json` while restating the same `include`/`exclude` — so the new step typechecks **the identical program** the blocking gate already covers. It is therefore redundant and weaker than what was there.*

  ⚠ ***Measured, not inferred:*** *I ran the blocking gate at the corrected heap — `pnpm check:spec-typecheck` → **exit 2, 62 errors**, ending `check-spec-typecheck: spec-inclusive typecheck failed`. So a required CI gate is RED on this tree. The largest contributor, `src/modules/inventory/stock-engine/__tests__/quantity.property.spec.ts` (47 errors, all `TS7006` implicit-any on callback parameters), is **tracked and unmodified** in `git status`, so it is not this session's doing.*

  *What I cannot certify: whether a clean `main` is equally red. Three sessions are editing this tree concurrently and root §11 says to separate your regressions from pre-existing ones on a clean tree before claiming either — I have no clean tree to check against, and `git stash`/`checkout` are forbidden here. Two readings fit the evidence: the gate has been failing and going unlooked-at, or CI runners have enough headroom that it completed at 8192 while this machine OOMs. **Deciding between them is the next action for whoever owns CI**, and it matters, because under the second reading those 62 errors have been visible in CI for some time.*

  *Open, not done: the `continue-on-error: true` step should be deleted as redundant once the 62 are owned, rather than becoming a second, permanently-amber signal beside a blocking one.*
- [x] **3.7** *(done, and it was bigger than written)* ⚠ **`typecheck:test` is a false-pass gate.** The script hardcodes `--max-old-space-size=8192`; at that size tsc dies with `FATAL ERROR: Ineffective mark-compacts near heap limit`, **exit 134, printing no type errors** — so any output filter sees a clean run. Confirmed here: 8192 → 0 errors reported; 10240 → **62 real errors**. Raise both typecheck scripts to 10240 (matching `backend/CLAUDE.md` §8) and make the CI step assert the exit code, not the output.

  *Done in `package.json:11-12`. **But the item understated the blast radius, and the fix was incomplete until I extended it.** The same hardcoded 8192 also sat inside two scripts that are wired **blocking** in CI's `gates` job with no `continue-on-error`: `check-spec-typecheck.mjs:40` (ci.yml:824) and `check-test-typecheck.mjs:54` (ci.yml:347). Both now pass `--max-old-space-size=10240` to their tsc subprocess, and their stale 8192 NOTE comments were corrected rather than left to mislead the next reader.*

  *Two things make this worse than a tuning miss. First, `tsconfig.test.json` merely extends `tsconfig.json` and **restates the identical `include`/`exclude`** — so `typecheck:test` and `check:spec-typecheck` typecheck **the same program**, one at 10240 and one, until now, at 8192. Second, `check-spec-typecheck.mjs`'s own `--self-test` would have caught this: on an OOM it gets exit 134 with no fixture name in the output and fails with "typecheck failed but did not name the fixture file". That self-test is wired in CI. So either it has been failing, or CI runners have more headroom than this machine — and which one it is decides whether the 60 committed errors below have ever been visible.*
- [x] **3.6** Clear `check:dead-code`. *(done — exit 0, self-test 0. It was 9 unclassified + 2 STALE verdicts by the time it was worked, not 11: an earlier wave had already resolved some. 4 barrel re-exports in `confirm-actions/index.ts` classified KEEP; 2 `z.enum`-companion types KEEP — the classifier does not recognise `(typeof X)[number]` derivation; 2 REMOVE; 1 WIRE.)*
  ⚠ ~~**That WIRE verdict is a live defect** — nothing invokes `runWithImpersonationContext`, so impersonation is never recorded in any audit log.~~ **Retracted 2026-09-21: the claim was false.** The setter *is* invoked, by `ImpersonationContextInterceptor.intercept` (`src/common/impersonation/impersonation-context.interceptor.ts:20`), which wraps every impersonated HTTP request; the read half at `audit.service.ts:200-204` reaches a real write. The interceptor is registered **before** `TenantContextInterceptor`, so its scope encloses the after-commit drain. `check-dead-code.mjs:242` now carries the matching KEEP verdict with that caller named. The original reading came from an import-search that missed the interceptor — root §10's "grep cannot prove deadness" in the other direction.
- [x] **4.2** Restore the silently dropped fields. *(done, and it found a fourth: `title` on `ticket.updateStatus` was also being stripped. `location` and `timezone` are now passed through; `fromTicketId` is written as `entityType:"ticket"` per the existing convention read back by `calendar-event-source.loader.ts:70`.)* ⚠ **Two fields cannot be honoured and now say so instead of lying:** `CalendarService.createEvent` takes `attendeeIds` and runs `assertUsersInOrg`, with no name path — so `attendeeNames` returns `uninvitedAttendeeNames` and appends "— not invited: …" to the summary. `updateTicketSchema` is `.strict()` with no `reason` field, so `reason` lands in the summary and result only. See 21.1/21.2.
- [x] **4.3** Spec: every definition's propose input round-trips to its execute input. *(done — 22 `it.each` cases plus fixtures. Widening the scanner window from a flat 600 chars to "up to the next propose site" immediately found a real site the old `[a-z]+\.[A-Za-z]+` regex could not match: `meetings.send-follow-up`, a second confirm lane that redeems its own token. Exempted via a named `SELF_REDEEMED_ACTIONS` plus a test that each exemption really calls `confirmation.confirm` itself.)*
- [x] **5.1** Decide the proposal sweep → **deleted**, with proof. Expiry is already enforced on the read path (`ai-confirmation.service.ts:200-215` refuses an expired row and stamps it `EXPIRED` under `id + org_id + status='PROPOSED'`), so the sweep was cosmetic and would have raised `42501` after `1123`. `sweepExpiredProposals`, `getProposalExecutedResult` and `cancelProposal` had zero references outside their own folder in **both** repos. `markExecuted` is used and kept. ⚠ **Surfaced:** deleting `cancelProposal` removes the last building block for a user *declining* a card — no endpoint exists today, and the earlier hardening PRD (A-03) calls that a product gap. Whoever adds decline must write the mutation with a tenant predicate, not restore the id-only version.

### P1

- [x] **6.2** Spec: every `defineTool` `module` is a known module key — **and** change `isToolAvailable` so an unknown module key fails **closed**, not open. *(done — `ask-os-tool-registry.ts:54` is now `!snapshot.modules[definition.module]`. Validated against `CATALOG_MODULES` itself, not a hand-typed list. I checked the production safety independently before accepting the flip: `resolveModuleFlags` (`access-snapshot.resolver.ts:125-130`) assigns an explicit boolean to every `CATALOG_MODULES` key, and every real declared tool module is a permission namespace, so nothing legitimate resolves `undefined`.)* ⚠ Two agents reverted this line mid-flight; the stale fixtures it broke were passing **because of** the fail-open bug (`modules: {}` used to mean "everything enabled").
- [x] **11.1** Persist the directive with the assistant message server-side, so the card is read rather than reconstructed and survives a refetch. *(done — `serializeDirective()` in `streaming/ask-os-directive.ts`; `chat-assistant.service.ts`'s `onCompleted` appends the serialized directives to the stored assistant message. No migration was needed or written.)*

  ⚠ **The chosen encoding opened a hole, which I found and closed.** Persistence appends the directive to the assistant message **as text** — a `CONFIRM_ACTION:{…json…}` line inside `content`. And `chat-assistant.service.ts` replays stored assistant content to the model **verbatim** (pinned by `chat-assistant-history-source.spec.ts`: "replays stored turns oldest-first"). So every subsequent turn re-sent the model a JSON blob containing the proposal's **redemption token**, its full preview, and — worse — a worked example of the exact wire format the client parses cards out of. A model that has seen that format can emit one, pairing a **real token it read from history** with a summary of its own choosing: the user reads "Create event" on the card and clicks Confirm, while the server executes whatever the stored proposal actually says. That defeats 1.1's whole premise that the card is an un-forgeable channel.
  **Fixed:** `stripDirectives()` in `streaming/ask-os-directive.ts` (beside `serializeDirective`, so the format has one owner), applied to assistant turns only on the history replay path. Four regression tests in `chat-assistant-history-source.spec.ts`; mutation-verified — neutering `stripDirectives` fails 3 of them. The card still persists for the client; the model simply never sees it again. A column would be the better home than a text line, but that needs a migration and migrations are not authorised here.
- [x] **11.4** Ship `title` / `confirmLabel` from the backend; delete the frontend `ACTION_TITLES` / `CONFIRM_LABELS` copies, which are already 3 keys behind. *(done — backend `ACTION_LABELS` at `ask-os-tool-registry.ts:16`; both frontend maps deleted.)* ⚠ **The drift just moved sides.** The map has 20 entries against 22 registered confirmable actions, and a missing entry makes the card fall back to the raw summary and a generic "Confirm" — silently, which is the same failure 11.4 existed to fix. A registry-driven parity spec is assigned; until it lands this is a copy that can rot like the last one.

  ⚠ **This item shipped with its own acceptance test red, found 2026-09-20 and now fixed.** Four tests in `frontend/components/assistant/ask-os-confirmation-card.test.tsx` were failing and nobody noticed, because the frontend suite was never run for this item. The product was correct — the card takes `title`/`confirmLabel` and falls back to `summary` / `"Confirm"`, and the parent passes them straight off the directive. The **test** was stale: it rendered the card with neither prop while expecting "Send email" and "Send", labels only the `ACTION_LABELS` map this item **deleted** could ever have produced. The tests now pass the props the real parent passes, and a new test covers the fallback path — no `title`, no `confirmLabel` → summary plus a generic "Confirm" — which is reachable whenever an action has no label entry and was previously untested. `components/assistant` is 44/44, frontend typecheck 0. The lesson is the item's own: a cross-repo change needs the other repo's suite run before it is called done.

### P2

- [x] **13.1** Prompt caching on the invariant prefix. *(**PARTIAL, and deliberately so** — the flag itself is not reachable on the installed provider, and I would rather say that than tick a no-op.)*

  *Verified against the installed packages before writing anything, not from the review: the chat model is `google("gemini-2.5-pro")` by default. Gemini 2.5 does **implicit** caching, which has no API flag — it triggers only when the invariant part is a byte-identical prefix. Explicit `cachedContent` IS exposed by `@ai-sdk/google` through `providerOptions`, but `AiStreamTextOpts` has no `providerOptions` field and the gateway never passes one to `streamText`, so it cannot be reached without a gateway change. **That gateway gap is the finding; wiring it is a separate item with an owner.***

  *What was delivered is the precondition, which is real and regressible: tests pin that `buildContextPrompt` returns a byte-identical string for the same turn, with two counter-tests proving the equality is not vacuous (change the actor, change the workspace data, get different bytes). Add a `Date.now()` or a `Math.random()` to the prompt builder and the test goes red — which is exactly the change that would silently kill implicit caching.*

  ⚠ **This exposed that 13.3's memoisation never fired, and I fixed it.** `manifestSchema`'s `WeakMap` is keyed on the definition object, but `collectToolDefinitions` calls each provider's `tools()` per turn and those methods **build fresh object literals every call** — so the key was always new and the cache was a guaranteed miss. The PRD's "once per process" claim was false, and 62 `z.toJSONSchema` conversions were running per request. `collectToolDefinitions` now memoises per provider instance, which stabilises the definition references and makes the manifest memo actually hit. 3 tests; mutation-proved (removing the memo fails 2 of 3, and the third proves caching drops no provider's tools from the manifest).
- [x] **13.6** Mark truncated history; charge prompt + manifest against the budget. *(done — `MAX_HISTORY_CHARS = 24_000` becomes `MAX_CONTEXT_CHARS = 48_000` minus the actual system-prompt length minus `MANIFEST_CHARS_ESTIMATE = 20_000` (62 tools × ~320 chars). The old budget charged history alone, so the real context was far larger than the number claimed and the budget protected nothing. History now drops whole messages rather than slicing one mid-sentence, and a dropped run is announced with `[N earlier messages omitted from context]` — the model can no longer read a cut-off message as a complete one.)*

  ⚠ *The first implementation had a hole I fixed: dropping **whole** messages means that if the newest message alone exceeds the budget, the loop breaks immediately and the model receives the omission marker **with the user's actual question missing**. Worse than the mid-sentence cut it replaced. The newest message is now always kept, truncated explicitly with `[message truncated to fit the context budget]` when it has to be — visible truncation is the point of the item, and this is the one case where truncation is unavoidable. Mutation-proved: restore the plain `break` and that test alone goes red.*
- [x] **14.1** Move provider/LLM calls out of tenant transactions in the tool bodies. ⚠ **RE-OPENED then CLOSED 2026-09-20.** The residual filed below as a *future* risk was already live on three existing tools. `summarizeMailThread` (AI gateway), `listRecentEmails` and `sendMailFromAccount` (Composio/Gmail/Outlook HTTP via `MailService`) all ran inside the registry's tenant transaction, holding one of 15 pooled connections across a network round trip. All three now declare `ownsTransaction: true` and wrap only their DB reads.

  *Proved by two mutations in opposite directions, each failing independently: move the provider call **inside** the transaction → the "does not hold a pooled connection" test goes red (1 failed / 20 passed); move the DB read **outside** → the "DB read has tenant GUC" test goes red. The agent's first attempt was a near-tautology — it deleted `ownsTransaction: true` and a test asserting `ownsTransaction === true` went red, which proves only that the literal exists, and changes nothing at runtime in a spec that calls `tool.run` directly and bypasses the registry. Sent back for a real one. I also botched my own first attempt at this mutation: a regex unwrap left unbalanced parens, the suite failed with 0 tests run, and an invalid mutation is not evidence.*

  *The sweep of the other 12 tool files was re-run one hop deeper, because "the service is DB-only" is the exact reasoning that missed this defect — `MailService` looked DB-only until it fell through to Composio two hops down. `CalendarEventsAggregateService` → `CalendarSourceRegistry.loadAll` → registered sources are all DB-backed (external calendar sync is a background sweep that writes rows; the read path reads those rows). `ChatSearchService.searchMessages` → `filterByEntityAccess` → `EntityReferenceService.resolve` → DI-registered adapters, all local tables. No other tool makes an uncovered external call.* *(original note follows.)* The item's ⚠ note below says "forgetting `ownsTransaction` on a **future** tool that calls a provider is silent". It is already forgotten on an existing one: `summarizeMailThread` (`core/tools/mail-copilot-tools.ts`) declares no `ownsTransaction`, so the registry wraps it, and it calls `mailAi.threadSummary` → `gateway.invokeStructured` — a paid provider round trip holding a pooled Postgres connection idle-in-transaction, which is the exact defect this item exists to remove. Two more in the same file hold the connection across Composio/Gmail/Outlook HTTP: `listRecentEmails` and `sendMailFromAccount`, via `MailService.listMessages`/`getThread`. The three HR tools named below ARE fixed; the item was closed on those three without sweeping the rest of the tool layer for gateway calls. *(original note follows.)*

  *(done. The problem was not in the tool bodies at all — it was structural. `buildAskOsToolset` wrapped **every** tool run in `runInNewTenantTransaction`, so the three `gateway.invokeText` calls in `hr-copilot-tools.ts` (`askHrPolicy`, `draftPerformanceReviewNote`, `draftPromotionLetter`) each held a pooled Postgres connection idle-in-transaction for the entire provider round trip — seconds, under someone else's outage. Both tool-file agents correctly reported it as out of their reach.*

  *Fix: an `ownsTransaction?: true` declaration on `AskOsToolDefinition`. The registry skips the ambient wrapper for those tools, and each of the three now opens its own `runInNewTenantTransaction` around **only its DB read**, leaving the provider call outside. The reads must stay in a transaction — they are RLS-protected and `app.current_org_id()` raises `42501` with no GUC — so this moves the boundary rather than removing it. This mirrors the `@NoTenantTransaction()` idiom the controllers already use.*

  *2 tests pin both directions (an ordinary tool IS wrapped, a declaring tool is NOT) — the negative alone would pass if the wrapper vanished entirely. Restructuring also exposed that `hr-copilot-tools.spec.ts` called `tool.run` directly, bypassing the registry, so its fake `db` had no `.transaction`; the helper is now mocked there in the way the sibling specs already do, with the callback actually invoked.*

  ⚠ **Residual: forgetting `ownsTransaction` on a future tool that calls a provider is silent** — a slow connection hold, not an error. The durable guard would be for `AiGatewayService` to detect an ambient tenant transaction at the start of a paid call and complain. Not done here.
- [x] **14.3** Drop the redundant reads. *(done where they exist — `getPayrollSummary` called `selfPayrollRows` twice on two paths that reduce to one; consolidated. ⚠ **Two of the three claims in this item were wrong:** there is no triple `organizations` fetch anywhere in the tool layer, and the "duplicated lead WHERE" is not in `crm-copilot-tools.ts` — `updateLeadStatus` and `searchLeads` each run exactly one read. Verified by reading both files rather than trusting the review.)*
- [x] **14.4** Bring caps under 100 and bound the unbounded reads. ⚠ **RE-OPENED then CLOSED 2026-09-20.** The caps were right; the claim "each cap now has a guard test" was not — only `REFERRAL_CAP` had one. `STOCK_LOOKUP_CAPS` was not exported and had zero test references, so `variantScan` could go back to 500 with nothing red, which is exactly the creep the guard exists to stop. **Fixed:** `VARIANT_SCAN_CAP` now lives in `tools/lib/tool-read-caps.ts` beside `REFERRAL_CAP` and `ops-copilot-tools.ts` imports it. It had to move rather than be exported in place — `tool-file-layout.spec.ts` (19.1) rejects any non-class export from a tool file, so the two rules agree on the destination. Guard test added and mutation-proved: raise it to 500, the test goes red. I re-ran that mutation myself rather than taking the report. *(A third claim in the original note is simply obsolete: `MEMBER_SCAN_CAP` does not exist anywhere in the backend — 15.1 deleted the scan it bounded — so its "500 → 100" line described a constant that is gone, not one that is capped.)* *(original note follows.)*

  *(done — all three: `variantScan` 500 -> 100, `MEMBER_SCAN_CAP` 500 -> 100, `REFERRAL_CAP` 200 -> 100. Every `input.limit` in the self tools is already bounded `.max(50)`. Each cap now has a guard test asserting it stays at or under 100, so it cannot creep back. Fixing `REFERRAL_CAP` broke a test that hardcoded `"200+"` — I made it derive from the constant instead, since a test pinning the number rather than the behaviour is what blocks the next legitimate change.)*
- [x] **14.5** Replace `getMyTicketStats`' load-100-and-count with a `GROUP BY`. ⚠ **RE-OPENED then CLOSED 2026-09-20.** `countTicketsByStatus`'s `mine` branch now applies the same `projectMembers × ACTIVE organizationMembers` intersection `getAllWork({scope:"mine"})` applies, with the empty-set short circuit, and `opts.projectIds` is honoured by intersection instead of silently ignored. The membership query — previously duplicated inline in three methods — is now one exported `memberProjectIdsQuery`, which is a §4 fix the repair surfaced rather than the item asking for it.

  ⚠ **The first fix was correct and completely unprotected, which is how this defect shipped the first time.** Its 16 new tests exercised `memberProjectIdsQuery`, `allCountByStatusQuery` and `mineCountByStatusSql` in isolation against hand-built WHERE clauses — none called `countTicketsByStatus`. I deleted the single line that applies the filter and ran `build/core` wide: **95 suites, 453 tests, all green.** The components were never the bug; the wiring was, and the tests pinned the components. Sent back for tests that call the service and capture what reaches the count query. Now: mutation → **4 failed / 457 passed**, restored → **461 passed**. I reproduced both runs myself rather than accept the report.

  *(Superseded finding, kept because the correction is the point: I previously wrote "I verified the new SQL myself … the intersection is preserved." I had verified `countTicketsByProjectAndStatus`, which was correct, and generalised to a sibling that was not.)* The aggregates exist and the per-project one is correct, but `countTicketsByStatus`'s `mine` branch **drops the project-membership intersection**: the `projectMembers × ACTIVE organizationMembers` join sits inside `if (opts.scope === "all")`, so the `mine` path falls through with only org + non-archived + not-deleted. The path it replaced applies it — `isSelfScoped` is `created|subscribed` only, so `getAllWork({scope:"mine"})` goes through `inArray(tickets.projectId, allowedProjectIds)`. Net effect: `getMyTicketStats` counts tickets in projects the caller is not an ACTIVE member of, while `getMyTickets` beside it does not. Not cross-tenant — `org_id` holds on both union branches — but a real widening. **I previously wrote "I verified the new SQL myself … the intersection is preserved"; that was wrong.** I verified `countTicketsByProjectAndStatus` and generalised. Two further defects in the same branch: `opts.projectIds` is accepted and silently ignored for `mine`, and the "rewritten authorization proofs" mock `ProjectsWorkQueryService` wholesale, so the guarantee moved from tested to untested — `rg countTickets src/modules/build/core/*.spec.ts` returns nothing.

  *Still true from the original work:* counts are exact rather than capped at the first 100 rows, and the per-project breakdown is more correct than the version it replaced.

  *(done — two aggregates on `ProjectsWorkQueryService`: `countTicketsByStatus` (the `mine` scope keeps the UNION shape root §7 requires, because an `OR` between an indexed assignee predicate and a participation semi-join defeats both) and `countTicketsByProjectAndStatus` for the per-project breakdown.*

  ⚠ *The first attempt **silently dropped** `getPersonTicketStats`' `byProject` breakdown and rewrote the tool description to match the reduced shape. Sent back: the breakdown is restored by grouping on `(projectId, status)`, and it is now more correct than before, since the old one was computed from ≤100 loaded rows and under-reported above that. Three of the five specs that broke were the authorization proofs — they failed because they asserted the **mechanism** ("delegates exclusively to `getAllWork` with no raw SQL fallback") rather than the guarantee, so they were rewritten against the new path rather than deleted. I verified the new SQL myself: `isNull(tickets.deletedAt)`, `eq(tickets.orgId, …)`, `ne(projects.status, "ARCHIVED")` and a real `projectMembers` × ACTIVE-`organizationMembers` intersection with empty-set short circuits are all preserved.)*
- [x] **15.1** One person resolver in `core/tools/lib/`, delegating to `person-seam`. *(done — `core/tools/lib/resolve-attendees.ts` delegates to `resolvePeopleByName`; `comms-copilot-tools.ts` loses `resolveMemberName`, `resolveAttendeeIds`, `ResolvedAttendees`, `AmbiguousNeedle`, `MIN_NAME_MATCH_CHARS` and `MEMBER_SCAN_CAP`, and no longer touches `organizationMembers`/`users` directly. **There were not six** — three of the candidates are genuinely different jobs and stay: `assignTicket`'s partial-name **search**, `findPerson`'s browse-a-list tool, and `grantBonus`'s id→existence check.)*

  *The consolidation fixes a defect nobody had filed: the old resolver loaded the first **100** org members and matched in JavaScript, so in an organisation larger than 100 people most members were simply invisible to attendee resolution. The seam matches in SQL against the whole tenant.*

  ⚠ *Two regressions in the first version, both caught and fixed rather than accepted:*
  - *__Lost liveness filters.__ The old resolver checked `users.isActive` and `users.deletedAt`; my seam checked only `organizationMembers.status = ACTIVE`. `backend/CLAUDE.md` §5 is explicit that a live membership joins both, and the agent reported the gap instead of dropping it — credit where due. The seam now joins `users` on both.*
  - *__Exact-match only.__ The agent swapped substring matching for exact and called it intentional. It was not: a model says "invite Jordan", not "invite Jordan Lee", so exact-only would have quietly broken the common case. Partial matching is back as a **fallback** — exact matches win, a partial needs ≥3 characters, and the LIKE pattern escapes `%`/`_` so a person named `%` cannot match the whole organisation. "Sam" resolves to Sam rather than going ambiguous against Samantha.*

  *15 tests on the seam, 8 on the tool. `pnpm check:cycles` clean — `modules/ai` → `modules/directory` is the correct direction and no edge runs back.*

  ⚠ ~~*Open: `AmbiguousCandidate` (tool registry) and `NameResolutionCandidate` (directory seam) are the same `{ label, hint? }` shape.*~~ **Closed — verified 2026-09-21.** Unified into the neutral home exactly as prescribed: one declaration at `src/common/types/ambiguous-candidate.ts`, three importers (`ai/core/registry/ask-os-tool.types.ts`, `ai/core/tools/lib/resolve-attendees.ts`, `directory/person-seam.ts`), no alias and no re-export. `modules/directory` still does not import from `modules/ai`.
- [x] **17.4** Delete the zero-reference and spec-only exports. *(done — re-measured with **knip** rather than taken from the census, because root §10 says an import-search cannot prove deadness. 11 in the Ask OS lane, each verified against `rg` before deletion.)*

  - *__A barrel re-export that gave one symbol two import paths.__ `confirm-actions/index.ts` re-exported `defineConfirmableAction` + 4 types from `confirmable-action.types.ts`, and **not one consumer used that path** — all 5 action files and the spec import from the owning module directly. This is the §4 alias defect exactly: two paths, consumers split, they drift. Block deleted.*
  - *__One spec-only function.__ `loadLeadProfile` in `crm-brief-loaders.ts` had a single reference in the whole repo: a `jest.mock` factory stubbing it. Production uses `loadLeadContext`. Function and stub deleted.*
  - *__Six zero-reference type aliases.__ `NextBestActionsInput`, `EmailDraftInput`, `SummarizeNotesInput`, `ObjectionHelpInput`, `ConfirmActionBodyInput`, `TicketStatusUpdatePayload`. Their Zod schemas are live (`@Validate` uses them) and stay; only the unconsumed `z.infer` aliases go.*

  ⚠ *Found while deleting: that same `jest.mock` factory was still stubbing `trunc` from `crm-brief-loaders`, which **17.2 had just moved out of that module**. The stub silently stopped applying and the spec began exercising the real `trunc` without anyone noticing — it passed either way. Stale key removed. This is the failure mode where a refactor leaves a mock pointing at a symbol the module no longer exports and nothing goes red.*

  *knip also reports unused exports outside `modules/ai`. Out of this PRD's lane; left for an owner. **Re-measured 2026-09-21: 89 → 56**, after 33 were deleted across the modules that were not under concurrent edit. Most were not merely unused — they were §4 alias defects, service files re-exporting types they do not own. What remains sits in billing, build, cron, impersonation, inventory, kb, notifications and timesheets, plus 18 duplicate-export groups.*
- [x] **18.1** Write ADR 0004 / 0005 / 0006 from what the code and gates already encode. *(done — `backend/docs/adr/0004-auth-facts-resolve-once-per-request.md`, `0005-a-datascope-is-spent-not-read.md`, `0006-auth-facts-reach-guards-through-di-tokens.md`. Each is written from source, not ahead of it. ⚠ 0006's subject is inferred: `backend/CLAUDE.md` §5 is the ONLY place that names it, and names it jointly with 0004 — the file says so rather than pretending otherwise.)*
- [x] **19.2** Derive the CRM MCP JSON Schema from the same Zod input via `z.toJSONSchema`; one definition, two adapters. *(done — 6 per-tool Zod schemas in `crm-mcp.schemas.ts` are now the single contract; `toMcpInputSchema()` derives the manifest and strips `$schema` by construction rather than by deletion. 63 lines of hand-written JSON Schema deleted. Field-by-field diff against the old literals found exactly two differences — `$schema` (stripped) and `additionalProperties: false` (kept, and the response contract widened to match), with names/types/required identical across all 6 tools, so no external client sees a shape change. 17 tests; mutation 1 adds a Zod field and shows it flows through with no catalogue edit, mutation 2 restores a hand-written literal missing a field and fails 3 tests — i.e. the spec would have caught the original drift.)* ⚠ One claim I could not confirm: the agent reports `crm-mcp-agent-token-gap.spec.ts`'s DI failure is pre-existing and "fails identically on a clean tree" — no agent here has a clean tree to compare against.

### P2 — added by the coverage check

Found by cross-checking every review candidate against the list above. These were missing.

- [x] **20.1** Make "no tier specified" mean one thing. **DECIDED 2026-09-20: keep the streaming default as it is.** *(The item's premise was wrong. It is not a one-sided cost bug: buffered already does `opts.tier ?? "fast"` and needs no change, and **15** of 24 streaming callers pass no tier, not the 21 the review claimed. Matching them to `fast` is an ~8.3× cost reduction **and** a quality downgrade for agenda generation, follow-up emails, CRM briefs and KB drafts — a product trade, not a cleanup, which is why it went to the owner rather than being closed as housekeeping. Ask OS chat is unaffected either way: `chat-assistant.service.ts` passes `model` and `modelId` explicitly and never reaches tier selection.)*

  *What shipped is the part that makes the asymmetry safe rather than accidental: `DEFAULT_STREAM_GOOGLE_MODEL` and `DEFAULT_STREAM_OPENROUTER_MODEL` are now typed `ProviderModelId`, so a streaming default with no pricing entry is a **compile error** instead of a `logger.warn` that bills at `DEFAULT`. That closes the gap 20.2 left open. 2 tests pin both the catalog entry and the chosen model, so the next person to change the default has to change a test that says why it is what it is.*
- [x] **20.6** `getPayrollSummary`. *(the `empty()` -> `denied()` half is **done** and mutation-proved: a model handed `empty` tells the user they have no payroll data, which is a different and wrong answer from "you may not view it this way".)* ⚠ **The declaration was deliberately NOT changed, and I accept the reasoning after checking it.** `permission` is what `isToolAvailable` filters on, so it is the tool's minimum *entry* bar — repointing it at `hr:payroll:view` would delete the tool for every ordinary employee and take their own payslips with it, which root §8 makes a self-service guarantee. I verified the widening genuinely bites: the org-wide branch requires `ctx.readFor("hr:payroll:view").rawScope(...) === "all"`, and its SQL is tenant-bound on `pr.org_id`. So the declaration is honest as the entry bar, and the widening is authorized separately — which is exactly the shape root §5 asks for.
- [x] **20.8** Housekeeping from the census. *(done, but **two of the three counts in the item were already stale** when I measured them rather than trusting them.)*

  - *Malformed identifiers: fixed in `projects-ai.controller.ts` — `projectIdticketIdParams` → `projectAndTicketIdParams` (7 occurrences), `projectIdmeetingIdParams` → `projectAndMeetingIdParams` (2). The HTTP param names (`@Param("ticketId")`) are the wire contract and were deliberately left alone. ⚠ **The same malformed names survive in 5 `build/core/` controllers** (26 occurrences, including a `projectIdticketIdParams_`), outside this PRD's lane. The correctly-named forms already exist in `build/meetings/`, `build/client-portal/` and `build/execution/`, so `build/core/` is the straggler — it needs an owner.*
  - *Redundant `!`: **zero remain** in `src/modules/ai`. The census's 2 were removed by earlier waves of this PRD.*
  - *`as X` casts: **one** remained in the lane, not 7 — `canonicalize` in `ai-confirmation.helpers.ts:39`, the same defect class as the one I introduced and fixed in `ask-os-tool-manifest.ts`: narrowing on `typeof value === "object"` gives you `object`, not `Record<string, unknown>`, so the cast looks redundant and is not. Fixing it properly exposed a bigger §4 problem — the repo has **13 private copies** of that same record type guard. I consolidated the 5 in the Ask OS lane into one `src/common/types/is-record.ts` (`ask-os-tool-manifest.ts`, `ai-stream-response.ts`, `ai-jobs.service.ts`, `org-features.service.ts`, and `confirmable-action.types.ts`'s `isPayloadRecord`, now deleted). `org-features.service.ts`'s copy was missing `!Array.isArray`, so a JSONB array in the features column passed as a features record — the consolidation fixes that as a side effect. The remaining 8 copies are in `auth`, `crm/import`, `e-sign`, `workflow`, `openapi` and `storage`, outside this lane.*

### Product decisions — yours, not mine

Surfaced by 4.2. Both are cases where the confirmation card was showing the user a
field the executor silently discarded. The lie is fixed either way; what the
product should actually *do* is a call I should not make alone.

- [x] **21.1** `calendar.createEvent` attendee names. **DECIDED 2026-09-20: resolve the names and invite them.** *(done — `resolvePeopleByName` in `modules/directory/person-seam.ts`, called from the `calendar.createEvent` executor. The interim `uninvitedAttendeeNames` / "— not invited: …" lie is gone.)*

  *The first implementation resolved correctly but had two defects I fixed rather than shipped:*
  - *__N+1.__ It looped `resolvePersonByName` once per attendee — root §9. It is now one statement for every name, proved by a test asserting a single call.*
  - *__A resolvable person the calendar would then reject.__ It read `organization_people` alone, so an offboarded person resolved to a `userId`, the card said "invited", and `assertUsersInOrg` (which requires `organizationMembers.status = ACTIVE`) then **404'd the whole event** — nothing created, misleading message. The query now inner-joins `organization_members` on ACTIVE, so an inactive person reads as unresolved and the user is told before confirming. This is the same defect class 14.2 fixed in `resolveMemberName`.*

  *Also: all bad names are reported in one error rather than one retry per name, and the event is created only if every name resolves. 10 tests in `person-seam-name-resolution.spec.ts` — 5 compile the real SQL via `.toSQL()` (following `projects-work-query-tenant-isolation.spec.ts`) because a mocked `db` cannot see a missing join, and 5 cover the resolution logic. Mutation-proved: dropping the ACTIVE condition, the `deleted_at` filter, or the name cap each fails its own test.*
- [x] **21.2** `ticket.updateStatus` reason. **DECIDED 2026-09-20: persist it as a ticket comment.** *(done — the executor resolves `ProjectsTicketCommentsService` alongside `ProjectsTicketsService` and calls `addComment` when `reason` is non-empty after trimming. The comment is attributed to the confirming user, so it becomes real visible history. No column added, and `— reason: …` is gone from the summary now that the reason has a reader. 4 tests; mutation-proved on the call itself and on the whitespace guard.)*

  *Now atomic (2026-09-21). The deferral above held on three clauses and failed on its conclusion: `updateTicket` and `addComment` do each open their own transaction, neither accepts an external `tx`, and the controller is `@NoTenantTransaction()` — but making it atomic needed **no signature change**. Both services inject `DRIZZLE`, the `createTenantAwareDb` proxy, which under an ambient tenant context resolves every property to the ambient `tx`; their inner `this.db.transaction(...)` therefore becomes `tx.transaction(...)`, which drizzle's postgres-js driver implements as `client.savepoint(...)` (`postgres-js/session.js:131`) on the same connection. One outer `runInTenantTransaction(db, fn, { orgId })` in `build-confirm-actions.ts:44` is sufficient. `runInNewTenantTransaction` was rejected: a second pooled connection against a ceiling of 10.*

  *`build-confirm-actions-atomicity.spec.ts` now asserts both writes are unreachable when the transaction callback never runs — mutation-proved by moving `updateTicket` outside the wrapper, which the previous assertion did not catch. The spec mocks `runInTenantTransaction`, so it proves containment and call shape, not rollback; rollback rests on the savepoint mechanism cited above and would need a live database to prove end to end.*

---

## 5. Out of scope

Deliberately excluded, with reasons:

| Item | Why |
|---|---|
| ~~Applying migration `1123`~~ | ✅ **Applied to production 2026-09-20.** See §6. |
| `email.send` → `chat:messages:write` remap | Both keys are `MEMBER` defaults, so it is not an escalation. Owner decision. |
| `noUncheckedIndexedAccess` / unused-symbol flags | A separate migration with its own owner (root §6) |
| Bulk comment removal (291) | §6 says the reason belongs in a *test name* — convert as files are touched, never bulk-strip |
| Frontend message-list virtualization | Unverifiable without a browser |

---

## 5a. Coverage check

Every review candidate maps to at least one TODO. Verified 2026-09-19.

| C | → | C | → | C | → |
|---|---|---|---|---|---|
| 1 | 4.1–4.3 | 9 | 20.1, 20.2 | 17 | 19.2 |
| 2 | 7.1 | 10 | 9.1 | 18 | 6.1–6.4 |
| 3 | 15.1 | 11 | 19.1, 20.3–20.6 | 19 | 13.1–13.6 |
| 4 | 16.1 | 12 | 11.1, 11.2 | 20 | 14.1–14.5 |
| 5 | 5.1, 5.2 | 13 | 12.1, 12.2 | 21 | 18.1, 18.2 |
| 6 | 10.1 | 14 | 11.3, 11.4, 20.7 | 22 | 19.1 |
| 7 | 8.1, 8.2 | 15 | 2.1–2.4 | 23 | 16.2, 17.1–17.4, 20.8 |
| 8 | 15.2 | 16 | 3.1–3.3 | bug | 1.1–1.4 |

---

## 6. Acceptance

- `pnpm check:scope-boundary` exits clean.
- `.github/workflows/backend.yml` runs typecheck + gates + suite, green.
- The reminder flow renders one card, confirms on click, and does not re-propose on "Yes".
- Backend `typecheck` (build **and** test programs) is clean; no new failures in `src/modules/ai`.
- `pnpm check:cycles`, `check:route-classification` stay green.
- Every box in §4 ticked, or explicitly moved to §5 with a reason.

**Never claimed:** zero bugs, a quality score, or production readiness from static checks (root §11).
