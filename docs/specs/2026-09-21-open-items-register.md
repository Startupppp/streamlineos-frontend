# Open-items register — as of 2026-09-21

Every unfinished item across the seven active lane/PRD documents, in one place,
deduplicated and grouped by **what is blocking it**. Companion to
`2026-09-21-session-handoff.md`, which holds environment traps, what was done, and the
gate rules — **read that first.**

## How to use this

- **Each item names its source document and line.** Go there for the evidence.
- ⚠ **Treat every entry as a lead, not a finding.** A premise in these documents has
  been refuted **thirteen times** this month, and the refutation nearly always made the
  work *smaller*. Two entries were already wrong when transcribed into this file — see
  the ⚠ marks on AA-5 and AR-8. Re-verify against source before you start.
- **Evidence level** is `documented` unless a line says otherwise. `documented` means a
  lane wrote it down; it does **not** mean anyone re-checked it today.
- Items marked `~~struck~~`, `✅ DONE`, retracted or superseded in the source are excluded.

**Count: 48 distinct items.** Six pairs were duplicated across documents and are merged
here under a single id.

---

## A. Blocked on a live environment — impossible on this machine

No local Postgres, Redis or Docker (5432 / 5433 / 6379 all refuse). These are not hard;
they are unreachable from here.

| id | Item | What closes it | Source |
|---|---|---|---|
| **L-1** | **chat-os P4-6** — source says the typed-directive emitter is wired end to end and unbranched, but a live SSE census saw **zero** `data-*` frames 12 hours after the emitter landed. Unresolved. | A **raw-SSE** census (not the decoded UI-message stream, which drops `transient` parts by construction) on a stack built from backend `448c4e25b` or later. | chat-os :178-183, :319 |
| **L-2** | **A-08 / A-09 / A-10** — send mail, disconnected mailbox, `needs_reauth` mailbox acceptance rows never run. | An interactively connected Gmail account. **Only the account holder can complete the OAuth step.** | chat-os :320 |
| **L-3** | **A-14** — "create a ticket in `<project>`" not run; the test member held no `build:*` key. | A seeded member with `build:tickets:create` and seeded tickets. | chat-os :320 |
| **L-4** | **A-17** — F-01 persona regression from a `/crm` page, and **P7-1 frontend half**: no rendered pixels were ever verified. | Start a Next.js dev server against the scratch stack. Blocked by another session's server (PID 9332 on `:1000`, pointed at production). | chat-os :303, :317, :320 |
| **L-5** | **A-19 partial** — only the stream half is proven (no `CONFIRM_ACTION:` in SSE frames). The "no token in reloaded history" and on-screen halves are unverified. | DOM + reloaded-history inspection. Depends on L-4. | chat-os :317 |
| **L-6** | **A-03 partial** — the "matches `/build/all-work?scope=mine`" half never exercised. | Same seeded-member setup as L-3. | chat-os :306, :313 |
| **L-7** | **Nothing in the deferred-items lane was exercised against a live database** — the `@NoTenantTransaction()` changes in storage, email and KB media are uncertified. | One real upload, one real download, one automation-triggered email against an RLS-enabled DB; confirm no `42501`. | deferred lane :63-65 |
| **L-8** | **A3 live-cert gap** — two opted-out AI routes (`POST /payroll/me/payslips/:publicationId/ai/explain`, `POST /inventory/ai/insights/:insightId/explain`) verified only by typecheck and structure. | One real request each; confirm no `42501` and that `AiRequestAbortInterceptor` is present. | connection-hold :127-129 |
| **L-9** | **Nothing in the get-route-writes lane was run against a live database.** | Run the affected routes against a live RLS-enabled DB. | get-route-writes :174 |
| **L-10** | **R-7** — the `countTicketsByProjectAndStatus` UNION rewrite was reasoned from declared indexes, never measured. | `EXPLAIN (ANALYZE, BUFFERS)` on both shapes as `streamline_app` **with the tenant GUC set**, on a seeded DB, before a large tenant relies on it. | chat-os :338 |
| **L-11** | **P1-5 residual** — cannot confirm `gemini-2.5-pro` resolves against this deployment's `GOOGLE_GENERATIVE_AI_API_KEY`. | One live turn. | chat-os :285 |
| **L-12** | **3 leading-wildcard `ILIKE` queries** — `org-membership-read.service.ts` (keyset on `coalesce(name, email)`), `chat-search.service.ts:153-167`, `kb-document-query.service.ts:73,115`. | The `pg_trgm` + `SECURITY DEFINER` five-condition pattern (canonical: `app.search_ticket_ids`), a migration, **and** a buffer measurement under RLS. | deferred lane :29 |

---

## B. Blocked on a product decision or a named owner

Do not start these as engineering tasks; they need someone to decide first.

| id | Decision needed | Source |
|---|---|---|
| **P-1** | **The 15 writing GET routes.** `logCritical` commits with the request *on purpose*; moving five to `logCriticalOutsideTransaction` changes what a rolled-back request records. **Audit semantics decision, not a refactor.** Also gates P-2. | get-route-writes; deferred lane :27 |
| **P-2** | **`accessMode: "read only"`** on read-intent transactions. Not safe to flip — W2 found two more write-on-reads, which is the proof the audit missed some. Needs **a full week of production signal including a deploy** with `check:get-route-writes` green, then flip `with-tenant.ts:188`. | get-route-writes :172-173 |
| **P-3** | **S-15 — the 1-credit reserve ceiling.** A 10-step agentic turn can cost ~40×; 20 concurrent turns authorize ~900 credits of real spend against 20 credits of balance. ⚠ **The zero-clamp is NOT the fix** — negative balances are deliberate. A costing decision. | hardening :248-249 |
| **P-4** | **A-03 decline API.** There is no endpoint to decline a proposed confirm card. `cancelProposal` was deleted (it was id-only, so it cannot simply be restored — a replacement needs an `orgId` predicate) and `sweepExpiredProposals` has no caller. Decide whether a user may reject a card and what the model then says. | remediation :154-155; hardening :250-251 |
| **P-5** | **The 4 rule-test / send-test frozen routes** — `automation#testAutomation`, `support-automations#testAutomation`, `projects-webhooks#sendTest`, `feedbucket#analyzeSubmission`. Each is a deliberate synchronous ping showing the user a delivery result. **Per route: is that result worth a pooled connection?** A blanket opt-out is wrong. | connection-hold :363-370 |
| **P-6** | **P6-6 credit-exhaustion gap** — `POST /chat/confirm` reserves and deducts nothing. Should confirms be credit-gated at all? No test was written, deliberately, to avoid certifying a fiction. | chat-os :199-203 |
| **P-7** | **`email.send` → `chat:messages:write` key mapping.** That key sits in `EMPLOYEE_SELF_SERVICE`, so the gate is effectively "is an active member". Either remap or formally document the amplification risk. Named owner needed (findings register #241). | chat-os :263 |
| **P-8** | **Email-predicate widening** — needs the notifications owner. | deferred lane |
| **P-9** | **AI model tiering** is two global constants (`fastModel`, `standardModel`). A real `ModelRouting.routeFor(feature)` returning `{provider, model, outputCap}` needs a **feature taxonomy** decided first. | closeout :99-101 |
| **P-10** | **Item 14 — payroll salary-profile name search.** `salary-profiles.repository.ts` imports `workers` + `organizationPeople` directly because routing through `resolvePeopleIdentities` breaks search, sort and pagination. Either extend the directory seam with a name-searchable/sortable query, **or** decide to drop worker-name search/sort from that endpoint. | closeout :301-338 |
| **P-11** | **Item 4 — the shared list-view module.** ~222 pages improvise, but the named repair was measured and **does not achieve the goal**: the `filter-*` cluster has only one external consumer. Either pick 2-3 pages that genuinely duplicate the pattern and let a neutral home follow from real consumers, **or drop the item**. | closeout :103-117 |

---

## C. Tractable engineering work — nothing is blocking these

Ordered roughly by value per unit of effort.

| id | Item | What exactly to do | Source |
|---|---|---|---|
| **E-1** | **F-10 — unbounded Ask OS message list** | `ask-os-chat-view.tsx:112` maps every row. `react-window` has **8 production consumers**; copy `inbox-virtual-list.tsx`, `mail-virtual-list.tsx` or `chat-user-virtual-list.tsx`. Variable height and scroll anchoring are already solved there. | hardening :251-252 |
| **E-2** | **F-07 — confirm card after reload** | The card *does* reappear (F-06 shipped the N-card renderer). It renders `mode="record"` — read-only — because the token is stripped at persist time (`streaming/ask-os-directive.ts:43`). Needs a token-bearing reload path. Pairs with **P-4** for the decline half. | hardening :250-251 |
| **E-3** | **AH-6 — two specs assert opposite outcomes for the same abort** | `chat-assistant.service.spec.ts:270-297` vs `chat-assistant-multistep-cancellation.spec.ts:345-402`. The former's `streamText` mock **never invokes `onAbort`**, so it certifies a fiction. Fix it against the latter, which matches the shipped SDK. *(Both files confirmed to exist, 2026-09-21.)* | hardening :257-258 |
| **E-4** | **AH-7 — a spec that cannot see production behaviour** | `ai-confirmation.service.spec.ts:452` asserts a row ends `EXPIRED` after an expired confirm, but in production the `BadRequestException` rolls that write back. The mock has no rollback. Assert the exception instead, or test against a real transaction. | hardening :258-259 |
| **E-5** | ⚠ **Malformed route parameter names in `build/core/`** — a §7 violation | Names like `IdstateIdParams`, `IdautomationIdParams`, `IdfieldIdParams` — a concatenation bug. Correctly-named forms already exist in `build/meetings/`, `build/client-portal/`, `build/execution/`; copy those. **⚠ The source says "5 controllers, 26 occurrences". Re-measured 2026-09-21: 8 controllers, ~38 occurrences** — `project-resources`, `projects-automations`, `projects-custom-fields`, `projects-releases`, `projects-ticket-associations`, `projects-ticket-checklists`, `projects-ticket-comments`, `projects-webhooks`. Another session edits this area — coordinate. | remediation :151-152 |
| **E-6** | **`feedbucket#analyzeSubmission` + `#createTicketFromAnalysis`** | Both frozen. ⚠ The recorded blocker (an idempotency fence) **was retracted later in the same document.** The real prerequisite is three-phasing `analyzeSubmission` — reads, AI call, writes — which clears both entries at once. | connection-hold :363-370, :574-585 |
| **E-7** | **`notifications-dispatch#dispatch`** | ⚠ Still frozen, but **its reason is stale**: H20 fixed the outbox scope resolution it was waiting on. Re-audit and re-file before doing anything. | connection-hold :363-367 |
| **E-8** | **8 duplicate copies of the record type guard** (`isRecord` / `isPayloadRecord`) | In `auth`, `crm/import`, `e-sign`, `workflow`, `openapi`, `storage`. `src/common/types/is-record.ts` already exists — redirect all 8 consumers and delete the copies. Textbook §4. | remediation :153 |
| **E-9** | **Gemini explicit caching is unreachable** | `AiStreamTextOpts` has no `providerOptions` field and the gateway never passes one to `streamText`, so Gemini 2.5 `cachedContent` can never be used. The byte-identical-prefix precondition is **already pinned by test**. Add the field and wire it through. | remediation :82-83 |
| **E-10** | **P0-4 residual — cross-user ticket counts under-count** | `getAllWork`'s `assigneeId` filter matches only `tickets.assignee_membership_id`, never `ticket_assignees`. The self case is closed; the cross-user stat is not. Extend the filter to join `ticket_assignees` on the non-`scope:"mine"` path. | chat-os :298 |
| **E-11** | **R-12 — the same bug, latent** | `countTicketsByStatus` with `scope:"all"` + `assigneeId` never consults `ticket_assignees`. **No live caller today.** Fix it or document the restriction in the signature *before* someone adds one. | chat-os :339 |
| **E-12** | **`mail#aiInboxSummary`** — the last remaining AI connection hold | `MailService.listMessages` falls through to a Gmail/Outlook fetch when metadata cannot serve the page, so wrapping its read naively **creates** a hold rather than removing one. Needs its own mail lane. | connection-hold :510-525 |
| **E-13** | **The 50 unbudgeted periodic sweeps** | None of the 50 (including all 38 under `modules/cron/`) carry `stopWhen` / `startAfterOrgId`. `check:sweep-budget` holds the ceiling at 50. Genuinely per-caller: making `stopWhen` required on `forEachOrg` would break single-pass administrative callers, so each needs a durable cursor decision. | connection-hold :245-261 |
| **E-14** | **`projects-members.service.ts` `limit(500)` / `projects-labels.service.ts` `limit(300)`** | Needs a keyset cursor **and** matching frontend paging — a two-repo lane. | deferred lane :28 |
| **E-15** | **`GET /payroll/.../:batchId/export` should be `POST`** | A prefetch, retry or link scanner fires it with no human involved, stamping `exportedBy` / `exportedAt` and emitting a `payroll.journal_batch_exported` audit event. Two-repo change. | get-route-writes :165-166 |
| **E-16** | **S-28 `user_membership_id` backfill** | New `ai_action_proposals` rows carry it; historical rows are NULL. Data migration. | remediation :153 |
| **E-17** | **`evaluateAssignmentRules` fires `void Promise.allSettled` after the handler** (`leads.service.ts:388`) | A post-commit-context hazard adjacent to S-01 — the request transaction has committed and the GUC is gone. Use `registerAfterCommit` or `runInNewTenantTransaction`. | remediation :155-156 |
| **E-18** | ⚠ **Frontend knip housekeeping** | Source says "14 unused web files + the `@reactour/tour` package". **Re-checked 2026-09-21: `@reactour/tour` is already absent from `frontend/package.json`** — that half is done. Re-run `pnpm exec knip --no-progress` in the frontend and confirm the 14 files before deleting. | closeout :388 |
| **E-19** | **`inventory/purchase-orders/po-lifecycle.ts`** | A verified stale duplicate of `lib/po-lifecycle.ts`, zero references. ⚠ **But `EXCLUDED_MODULE_RE` in `check-dead-code.mjs:80` puts all of `modules/inventory/` out of the gate's scope by design.** Deleting it is the inventory owner's call, not a dead-code sweep. | deferred lane :344-347 |
| **E-20** | **P4-13 prompt-phrasing gap** | "Apply for casual leave on 2026-10-15" (plainer phrasing) called **no tool** and promised an action it had not staged. Prompt tuning measured against representative phrasings. A product gap, not a code defect. | chat-os :313 |

---

## D. Structural — not fixable one item at a time

| id | Condition | Why it matters |
|---|---|---|
| **S-1** | **869 journal entries sit below the watermark and will never apply.** Production was built by **push/bootstrap**, not by the migration chain. | A cold rebuild and the live database are not guaranteed to agree. **S-2 and S-3 are symptoms of this, not separate bugs.** |
| **S-2** | `pnpm check:migration-chain` fails on `1090` (duplicate prefix, baselined) and `0619` (timestamp regression). | Pre-existing. Needs an owner. |
| **S-3** | **M6 cold-rebuild divergence** — `uniq_ai_action_proposals_org_id` exists in production but no migration creates it. | ⚠ **Do NOT write the migration — it would fail `42710`.** The constraint is already there, validated, with its index. |
| **S-4** | **`ai_action_proposals` uses a `serial` PK**, not `generatedAlwaysAsIdentity()`. | A breaking change on a live table with existing FKs. Needs its own migration lane with a downtime or online-migration plan. |
| **S-5** | **Read-replica routing for 1,646 GET routes** — the largest remaining capacity win. `DB_REPLICA_URL` is unset and `runInReplicaTenantRead` has only 3 call sites. | Blocked on infrastructure (no reader endpoint provisioned) **and** behind P-1: a reader cannot serve a GET that writes. |
| **S-6** | **Item 12 — project-narrowed ticket reads cost 11,121 buffers**, discarding 40,000 rows. No predicate rewrite fixes it; the UNION split was measured **284× worse**. | The only remaining live option is a `ticket_participants` redesign that pre-joins assignee + reporter + co-assignee. Major schema migration. |

---

## E. Deferred with an explicit re-open threshold — do nothing until it trips

| id | Item | Re-open when |
|---|---|---|
| **T-1** | `chat_messages` is unpartitioned. | It passes ~10M rows or ~10 GB. **Today: 14 rows.** Measure before designing. |
| **T-2** | No client-facing signal when an Ably channel capability list is truncated (>500 channels/member). Server-side observability exists. | Any org passes ~400 channels per member. Then add a `truncated` flag to the token response — a cross-repo contract change. |
| **T-3** | `rich-text-content.tsx` has no Plate branch; `renderSlateLeafNode` / `renderSlateNode` sit in `features/wiki/`. | A **second** Slate-rendering consumer appears. Then lift both to a neutral home and redirect. YAGNI until then. |
| **T-4** | Ownership-transfer lifecycle spans three services. Pure consolidation, no behavioural change. | A **fourth** code path needs the same lifecycle. Deferred on collision risk in a shared working tree. |

---

## F. Production hygiene — one real item

| id | Item | Source |
|---|---|---|
| **H-1** | ⚠ **An `org_1` fixture organisation exists in the PRODUCTION database** (`created_at` 2026-09-14). The e2e harness seeded it against whatever `DRIZZLE` resolved to while `.env` pointed at Aurora. **Two things close it:** delete the row, and make the e2e harness **refuse a non-local host outright** so it cannot happen again. The second matters more than the first. | chat-os :353-354 |

---

## G. Confirmed NOT work — do not re-open

Listed so nobody spends a sweep rediscovering them. Full reasoning in
`2026-09-21-session-handoff.md` §3.

- The **18 knip "duplicate exports"** — per-route `@ResponseSchema` contract names bound
  to a shared row model. Not the §4 alias defect; collapsing them merges contracts.
- Any knip finding under **`modules/crm/` or `modules/inventory/`** — excluded by design.
- **ask-os 11.1** — no directive column exists or is needed.
- **M6's migration** — see S-3.
- A **`z.infer` alias whose backing schema is live** — retained by the gate's own rule.
