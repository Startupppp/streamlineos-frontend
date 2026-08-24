# Platform phase three — ticket set

Ten tickets across three streams, dated 2026-08-23. Derived from the six architecture reviews in the repository root, each claim re-verified against the tree before ticketing.

These are the candidates the earlier phases left uncovered. Phase two's four streams (access version channel, module registry, list-view seam, entity actions path) are tracked in `.scratch/platform-phase-two/`.

## The streams

| Stream | PRD | Tickets | What it delivers |
|---|---|---|---|
| **E — Route registry** | `2026-08-23-route-registry-prd.md` | 01, 02, 03 | A screen's product is declared once, so the sidebar cannot silently lose a module. |
| **F — Config seam** | `2026-08-23-config-seam-prd.md` | 04, 05, 06, 07 | Misconfiguration fails at boot, and a new direct read fails the build. |
| **G — Person directory** | `2026-08-20-person-directory-seam.md` | 08, 09, 10, 11 | One way to resolve a person, and the payroll entry point that is missing. |

## Progress — 2026-08-23

**Stream E is complete.** Tickets 01, 02 and 03 are done and committed. Full web suite 77 suites / 438 tests green, `tsc --noEmit` 0, `madge --circular` clean across 3,146 files. One criterion is deliberately left unticked on ticket 03: nothing was verified by running the application.

**Stream F is complete — tickets 04, 05, 06 and 07 all done.** Nineteen reads have moved onto injected config across twilio, the notification worker, razorpay, contact, roadmap, platform, storage, KB, realtime and push. Ticket 06 — the import-time reads in `email/email.provider.ts` — is now **done** (`e2d5d111`). It became tractable on discovering `EmailModule` is `@Global()`, so no consumer module needed an import change. Provider selection was pinned with eight pure-function tests before the refactor touched anything, because which provider wins when both are configured is the one behaviour here a reader could not reconstruct from the code. Its send-real-mail criterion is still unmet.

Superseded note, kept because the reasoning was sound at the time: It is the one part of this stream that is not a substitution: the file builds its Resend and ZeptoMail clients from module-scope constants at import time, so converting it needs a factory provider plus module wiring across Automation and Notifications, and its own acceptance criterion is to verify by **sending mail**, which was not possible here. A half-done version that ticks the type-level boxes and leaves a lazy mutable singleton would be worse than the current state, which is at least honest about what it does.

### Verified state — 2026-08-23

- **Backend: `tsc --noEmit` clean. Full suite 557 suites / 4,761 tests, exit 0** (six sequential shards at `--maxWorkers=2`; the whole suite at once gets its workers OS-killed).
- **Backend: `pnpm lint` 0 errors, 32 warnings.** It was failing before this phase — `script.executor.ts:131` had a `require()` error, so the CI lint job was red.
- **Web: `tsc --noEmit` clean. Full suite 77 suites / 438 tests, exit 0. `madge --circular` clean on both repos (3,146 web files, 3,363 API files).**
- **Controller e2e: `chat-entity-actions.controller.e2e-spec.ts` 10/10 under `pnpm test:e2e`** — run explicitly, because e2e specs are excluded from the default suite and a green default run says nothing about them.
- **Nothing was verified by running the application.** Every criterion that asked for that is left unticked and says so.

### Verified state — 2026-08-24 (second pass)

The application **was** run this time, and it changed two answers.

- **Backend: 578 suites / 4,886 tests, exit 0** (six shards at `--maxWorkers=2`) · `tsc --noEmit` clean · `nest build` 0 (needs `--max-old-space-size=8192`; the default heap aborts with exit 134, which reads as a build failure and is not one) · `pnpm lint` **0 errors**, 36 warnings · `madge --circular` clean over 3,406 files · knip: 11 unused files, all of them the SQL-managed set root §10 protects.
- **Web: 84 suites / 491 tests, `tsc` clean, `next build` exit 0, `madge` clean, knip zero unused files and zero unused dependencies.**
- **Run against a booted API:** seeded harness 8/8 against a real database · calendar controller e2e 7/7 · `chat-entity-actions` e2e 10/10 · `db:check-request-txn` under ceiling with `/me/access` at 0.89 txn/req · a live `/me/access` returning 34 module flags · real chat messages sent and observed arriving over Ably.
- **Two live defects only running it could find.** `@everyone` notified nobody, because the send path never called the resolver U02 built — its unit test passed against a function with no production caller. And the access snapshot was one review away from flipping every non-plan-gated namespace (`settings`, `self`, `notifications`, `dashboard`, `mail`, `calendar`, `billing`) to unavailable, "proved" safe by a test that recomputed its expectation from the implementation.
- **What remains unverified is four browser criteria**, by decision rather than oversight: there is no Playwright or Puppeteer in this repo and adding it was declined.

**Stream G is complete.** Tickets 08 and 09 turned out to describe work that already existed — `directory/person-seam.ts` carries the three-way subject and resolves the person-record path on the link column — but ticket 09 had a hole worth naming: **nothing ever populated that link**, so the seam's person-record path was a dead letter for every row created after the column was added. Fixed 2026-08-24 (`2366a8eb`): all four paths that can bring an HR person into existence now resolve the canonical `organization_people` row and carry its id, and each catches `23505` on `uniq_hr_people_org_person_link` as a 409. There are four such paths, not one — direct create, the importer, user-to-person sync and the recruitment handoff — and enumerating them was the point. **Ticket 11 is DONE** — `resolvePeopleIdentities` gives the seam a batch identity read, one query however many subjects, with a test pinning the query count.

**Ticket 10 is closed WON'T DO AS WRITTEN.** With ticket 11 in hand the N+1 objection disappeared, and each of the three payroll files then failed for its own reason: the payee builder needs `workerNumber` and bank details the seam refuses by design, so a seam version is three queries where there is one; filings needs batch employment the seam does not carry; and the profile search uses `ILIKE` on person columns, which no resolution seam can serve without discarding the index. The goal — one owner of person joins — is already met for *resolution*, which is the question that carries a correctness risk. Projection and search are different questions and would need a directory read module, which is a design decision rather than an inherited rule.

Writing a ticket for shipped work is cheap; the expensive mistake is the opposite, so the ticket is kept as the record of what was required rather than deleted.

## Three live defects this set found, all in Stream E

Each was reachable in the product, and none was in any earlier ticket.

- **The Workflows group was in no product's sidebar.** It was assembled into the navigation tree and named in no product's heading list, so its nine routes — dashboard, templates, executions, approvals, scheduler, analytics, variables, secrets, access — were reachable only by typing a URL.
- **Global administration was gated on a paid module.** The `Organization` group declared `module: "hrms"`, so an organization without HRMS lost all of `/settings/organization/*`. `OrgHierarchyController` carries no `@RequireModule` and only `settings:*` permissions, so the backend never agreed with that gate. Cost centers are finance's and locations are inventory's; gating them on HR was never right.
- **Build's sidebar heading could not be renamed.** It read "Product Management", the module's pre-rename name, because the heading string was how the group found its product. The naming was also inverted: that group holds delivery work, while the group called "More" held the actual product management.

## Premises corrected before ticketing

Recorded because each would have produced a ticket that built the wrong thing.

- **The permission key grammar is not violated.** A review reported 53 two-segment keys breaking a documented `module:resource:action` grammar. Only `split(":")[0]` is load-bearing anywhere in the codebase — no code reads segment `[1]` or `[2]` structurally — and the domain verbs are documented as intentional where collapsing to `manage` would lose a distinction. There is no validator, which is true and does not matter much. No ticket.
- **`/build/anything` already returns 404.** A review reported a greedy `:projectId` route with `ParseIntPipe` returning 400 for sibling paths. The route uses `ParseResourceIdPipe`, which throws `NotFoundException`, and Nest resolves static segments before parameterized ones. No ticket.
- **The attendance event tables are not a live failure.** Seven attendance tables and two directory tables are declared in Drizzle with no applied migration, and a live service queries two of them — but `prepareCommand` returns `null` unless the organization's write mode is `DUAL` and calls `requireCanonicalRelations` before touching them. It fails safe with a 503, not a 42P01. The declared-vs-applied drift is real; the severity was not.
- **The config secrets fail closed.** The unvalidated webhook and token secrets reject every webhook and mint no tokens when unset. This is availability and diagnosability, not an authorization hole, and ticket 04 says so on its face.
- **The contractor premise was already corrected in Stream G's PRD.** An earlier draft claimed consolidating the person models would remove the ability to pay a non-member. `hr_employments` keys on `hr_people`, not on membership, and `hr_people.user_id` is nullable. The real gap is that payroll has two payee entry points and needs a third.

## Carried forward — verified, real, and not yet ticketed

The six architecture review HTML files in the repository root were the source for phases two and three. Everything actionable in them is now either shipped, ticketed, or listed here; the files themselves are deleted, and recoverable from git (`git show 8244527bf:architecture-review-20260820-1.html`).

Re-checked against the tree on 2026-08-24. Four are now closed, two are refused on evidence, and two remain open. Each says which.

- ~~**`ChatAssistantController` carries no `@NoTenantTransaction`.**~~ **DONE.** The decorator is at `chat-assistant.controller.ts:202`, with the comment naming the reason: `pipeTextStreamToResponse` returns before the stream ends, so the request transaction would commit while tools and `onFinish` still ran on a live-but-dead tenant context.
- **Chat scale residue — five of six are closed.** Invite tokens are hashed at rest (`token_hash` + `uniq_chat_invite_link_token_hash`); the twelve `serial` primary keys are `generatedAlwaysAsIdentity`; the reaction lost-update is fixed; `MAX_CAPABILITY_CHANNELS = 500` was never silent — it logs org, user, total and granted, and a bounded capability list is deliberate; and `sendToChannelMembers` no longer fans out in the request thread, because the whole fan-out moved behind `registerAfterCommit` in its own tenant transaction (phase-four 05). **Still open:** `chat_messages` is unpartitioned — deliberately. Measured 2026-08-23: **2 rows / 136 kB**, and backend §3 forbids partitioning a table that is not demonstrably large, so the number is the decision. Revisit when it is.
- ~~**`applyScope`'s team branch runs a correlated subquery.**~~ **DECIDED** (phase-four 04, 2026-08-24): leave it and accept the measured cost. The measurement, kept here because the ticket carrying it is retired: **0** role grants and **0** user grants use `scope='team'` — the distribution is `all=8291, own=6` — so the slow path costs nothing today. Team scope keeps working through the subquery, no existing grant changes scope, and the unreachable fast path stays — it is not dead code but a guarded placeholder, since `apply-scope-team.spec.ts` fails the day a caller supplies `teamColumn`, having first asserted it found more than 20 call sites so a broken glob cannot pass by matching nothing.
- ~~**Housekeeping knip reports.**~~ **DONE.** The 14 web files and `@reactour/tour` are deleted; frontend knip now reports zero unused files and zero unused dependencies, verified with `next build` rather than `tsc`. They were one connected cluster, not 14 orphans. The 11 API schema files were correctly left alone — that is the SQL-managed arrangement guarded by `migration-integrity.spec.ts`.
- ~~**`rich-text-content.tsx` has no Plate branch.**~~ **WON'T DO — speculative, as the review suspected.** `RichTextContent` has exactly **one** consumer in the entire web app: `features/build/ticket-details/comment-item.tsx`, a ticket comment. Nothing renders Knowledge Base content through it, and nothing outside the KB renders a KB document at all. Adding a Plate branch would be an abstraction for a consumer that does not exist, which root §1.9 bans. Reopen when a second surface genuinely needs to render a KB page.
- **The invitation state machine has no owner.** *Still open.* Predicates are partly centralised in `invitations.helpers.ts`, but no unified transition module exists and `InvitationLifecycleService` is a thin wrapper. Adding a state still means finding several services. Low urgency — the dangerous accept/decline races were already correct — but it grows with every transition.
- **AI model choice is two global tiers.** *Still open, and blocked on a product decision rather than effort.* `resolveLlmProvider` returns one fast and one standard model for every feature, so a trivial classification and a payroll explanation pay the same rate. It needs a feature taxonomy before it can be ticketed.

## Two review claims that were measured wrong, not just stale

- **"219 files import the filter row"** was retracted by the review itself; the real filter-bar family had 15 importers. `FILTER_TOOLBAR_ROW` is a generic layout constant used by 223 files and was never part of the Build filter module — counting it conflated a shared CSS class with a deep module.
- **Chat's permission vocabulary** was reported as 4 keys against 21 routes. It is 11 keys against 72 routes. The ratio is still thin and still worth widening, but the numbers that made it sound alarming were wrong in both directions.

## Known hazards in this area

- The web `tsconfig.json` **excludes test files**, so a clean `tsc --noEmit` does not prove the tests compile. A required field added to a shared type is invisible there until a test runs.
- A digest test pins the navigation graph. It is doing its job when it fails on an intentional rename — update the digest, do not weaken the test.
- This tree is edited by more than one session at once, and the git index is shared. `git add <paths>` followed by a bare `git commit` takes the **whole index**. The correct form is `git commit -m … -- <paths>`, and the pathspec should name **files, not directories** — a directory pathspec swept in a neighbouring file mid-way through this set.
- A subagent will report the queries a service makes without reading the guards above them. Verify severity yourself before ticketing a live bug.
