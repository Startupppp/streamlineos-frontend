# Frontend Cutover-Cleanup Manifest — Batch 3

Status: ANALYSIS ONLY. Nothing in this manifest is executed until the corresponding
domain's NestJS backend has been functional-tested in staging. Each domain is cut over
independently; do not delete a domain's route files until its backend passes tests.

Batch 3 domains:
- FULLY migrated → careers.
- PARTIAL (have deferred routes — no blanket prefix) → invoices, onboarding, webhooks.

Repo root for all paths below: `D:/projects/personal/Streamlineos/frontend/`.

Precondition (from `FRONTEND-STRANGLE-MANIFEST.md`): do NOT delete until the NestJS backend is
deployed AND `NEXT_PUBLIC_API_URL` is set in the frontend env — otherwise `apiClient` falls back
to same-origin `/api` and these features 404.

`apiClient` routing mechanism (recap): `lib/api-client.ts` routes a path to the NestJS backend
(EXTERNAL_API) ONLY when its prefix is in `MIGRATED_PREFIXES` (currently `['/contacts','/targets','/csat']`).
`isMigrated()` matches by path PREFIX and is METHOD-AGNOSTIC (`path === p || path.startsWith(p + "/")`).
This is the central constraint for Batch 3: three of four domains are PARTIAL, and their deferred
routes share a base prefix with their ported routes — so a blanket prefix would mis-route the
deferred calls to a backend that lacks them. See §3.

---

## 1. Files to delete

Route files for the FULLY-migrated domain, plus only truly-dead support files (verified zero
importers outside their own deletable domain routes). PARTIAL domains list ONLY their fully-ported
route files (deleted individually — never `rm -rf` the folder).

### careers (fully migrated)

Backend scope = NestJS `@Controller("careers")` with exactly 2 public endpoints
(`GET /careers`, `POST /careers/apply`), mapping 1:1 to the two route files below. Both deletable:

- `app/api/careers/route.ts` — GET (list job postings).
- `app/api/careers/apply/route.ts` — POST (candidate application).
- NO dead support files. Both routes import ONLY shared infra (`@/lib/db`, `@/lib/db/schema`,
  `@/lib/api/helpers`, `@/lib/api/cache-tags`, plus drizzle-orm/zod/next). Every one has hundreds
  of other importers (lowest is `cache-tags.ts` at 28). There are NO careers-dedicated
  `lib/services`, `server/queries`, `types`, or `scripts` files anywhere in the frontend.

### invoices (PARTIAL — delete only the 2 GET-only ported routes)

> BLOCKED on physical removal until full cutover — see the apiClient caveat in §3. Listed as
> deletable-in-principle (backend equivalent exists) but NOT safely removable now.

- `app/api/invoices/stats/route.ts` — GET stats (ported, GET-only).
- `app/api/invoices/recurring/route.ts` — GET listRecurring (ported, GET-only).
- NO dead support files. Every support file these routes touch stays reachable from a KEPT
  deferred route, the server-component page, or another accounting domain (see Keep-shared).

### onboarding (PARTIAL — delete only the 5 ported routes)

- `app/api/onboarding/route.ts` — GET list (ported).
- `app/api/onboarding/templates/route.ts` — GET/POST templates (ported).
- `app/api/onboarding/personal-details/route.ts` — PATCH (ported; ALSO has zero UI callers — wizard
  uses server actions, see §5 — so deletable on both grounds).
- `app/api/onboarding/submit/route.ts` — POST submit (ported; service fully implements it incl.
  leaveBalances seeding; ALSO has zero UI callers — see §5).
- `app/api/onboarding/[userId]/route.ts` — GET one (ported).
- NO dead support files. The 5 routes import only heavily-shared infra (`lib/api/helpers.ts`,
  `lib/db.ts`, `lib/db/schema/index.ts`, `lib/abilities-server.ts`). Onboarding schema tables
  (`onboardingTasks`/`Templates`/`TemplateSteps`/`Steps`) remain used by the 3 KEPT deferred
  routes, by `lib/inngest/functions/initiate-onboarding.ts`, and by
  `server/actions/onboarding-actions.ts` — nothing becomes dead.

### webhooks (PARTIAL — delete only the 2 CRUD ported routes)

- `app/api/webhooks/route.ts` — GET list / POST create `webhookEndpoints` (ported).
- `app/api/webhooks/[webhookId]/route.ts` — GET/PATCH/DELETE (ported).
- NO dead support files. Both routes import only shared infra and query `db` inline (no dedicated
  `lib/services`/`server/queries` file exists). `webhookEndpoints` + `webhookLogs` tables remain
  used by `lib/inngest/functions/webhook-dispatcher.ts` — schema stays SHARED.

---

## 2. Barrel edits (edit, do not delete)

### careers — `lib/api/cache-tags.ts` (one-line removal)

- Line 53 `careers: "careers"` is referenced ONLY by `app/api/careers/route.ts`. After that route
  is deleted the key is orphaned (no other `revalidateTag("careers")` caller exists). KEEP the
  shared file (28 other importers); just drop the single orphaned `careers` line.

No other barrel edits in Batch 3:
- `lib/db/schema/index.ts` re-exports tables via `export *` (no domain-specific line); the
  `webhookEndpoints` table lives in `lib/db/schema/shared.ts`, `jobPostings`/`candidates`/
  `candidateApplications`/`organizations` (careers) and the invoice/onboarding tables back Drizzle
  types app-wide. KEEP.
- No `server/queries/index.ts` or `lib/services/index.ts` barrel re-exports any deleted file
  (none of the deletable routes have a dedicated query/service file).

---

## 3. api-client MIGRATED_PREFIXES additions

File: `lib/api-client.ts`. Add ONLY the FULLY-migrated Batch-3 domain:

- `/careers` — both routes (`GET /careers`, `POST /careers/apply`) ported (NestJS `CareersController`).
  No deferred sub-route under `/careers`, so the prefix is safe.
  - Caveat: careers currently has ZERO frontend `apiClient`/hook callers (no UI consumes
    `/api/careers` via apiClient today — see §4). The prefix is still correct to add for parity; it
    repoints nothing immediately but future-proofs any consumer added later.

DO NOT add prefixes for the three PARTIAL domains — each has a DEFERRED route sharing the base
prefix, so a blanket prefix would route the deferred call to a backend that lacks it:

- NOT `/invoices` — `isMigrated()` is method-agnostic, so `/invoices` would capture the DEFERRED
  writes `POST /invoices`, `PATCH /invoices/:id`, `POST /invoices/:id/payments`, and
  `POST /invoices/recurring/run`. Consequence: even the two GET-only "deletable" files (stats,
  recurring) cannot be physically removed until full cutover, because `useInvoiceStats` →
  `/invoices/stats` and `useRecurringInvoices` → `/invoices/recurring` would 404 (they'd still hit
  same-origin `/api` with the file gone). All `/invoices/*` client calls stay SAME_ORIGIN.
- NOT `/onboarding` — would capture the DEFERRED `PATCH /onboarding/tasks/:taskId`
  (completion-email fan-out). Hooks in `lib/api/hooks/hr/onboarding.ts` call BOTH ported paths
  (`get('/onboarding')`, `get('/onboarding/{userId}')`, `post('/onboarding')`,
  `get`+`post('/onboarding/templates')`) AND the deferred `patch('/onboarding/tasks/{taskId}')`.
- NOT `/webhooks` — KEEP the deferred inbound `POST /webhooks/razorpay`. (Technically razorpay is
  inbound-only — Razorpay POSTs directly, never via apiClient — so adding `/webhooks` would be
  harmless in practice; but per the batch rule "any deferred route ⇒ no blanket prefix" it is left
  out for safety/consistency.)

These partial domains' hooks stay pointed at same-origin `/api` until per-route routing exists or
the domain is fully ported in a later batch.

Resulting array after Batch-3 cutover (assuming Batches 1–2 already applied):
```ts
const MIGRATED_PREFIXES = [
  "/contacts", "/targets", "/csat",
  "/blog", "/audit-log", "/goals", "/tasks",
  "/quotes", "/customer-executive", "/reports",
  "/sales", "/push",
  "/careers",
] as const;
```

---

## 4. Keep-shared (domain-looking but still imported elsewhere)

These must NOT be deleted. They look domain-specific but have live importers outside the
deletable route graph.

### careers
- `lib/db` (db client, 682 other importers), `lib/db/schema` barrel (`jobPostings`, `candidates`,
  `candidateApplications`, `organizations`; 688 other importers), `lib/api/helpers.ts` (`ok`/`err`,
  666 other importers), `lib/api/cache-tags.ts` (`CacheTag`, 28 other importers — only the one
  `careers` key line is orphaned, see §2). All KEEP.

### invoices (partial)
- `server/queries/invoice.ts` — used by KEPT routes (`route.ts`, `[invoiceId]/payments`) AND the
  server component `app/(dashboard)/billing/invoices/page.tsx`. KEEP.
- `lib/services/invoices.ts` — used by KEPT `POST route.ts` (`createInvoice`) AND by
  `lib/services/recurring-invoices.ts`. KEEP.
- `lib/services/recurring-invoices.ts` — used by KEPT `POST recurring/run/route.ts`
  (`generateDueRecurringInvoices`). KEEP.
- `lib/accounting/post-invoice.ts` — used by KEPT `PATCH [invoiceId]/route.ts` + `lib/services/invoices.ts`. KEEP.
- `lib/accounting/post-payment.ts` — used by KEPT `POST [invoiceId]/payments/route.ts`. KEEP.
- `lib/accounting/seed-coa.ts` — SHARED across the accounting domain (purchase-bills, journal,
  accounts routes + kept invoice routes). KEEP.
- `lib/api/hooks/invoice.ts` — client TanStack hooks consumed by invoices-client, invoice-detail,
  record-payment-dialog, recurring/billing pages. Stays same-origin (no prefix). KEEP.
- `types/invoice.ts` — shared types used by the hooks + 6 billing client files. KEEP.
- DEFERRED routes (KEEP whole — they co-locate migrated GET handlers with deferred writes):
  `app/api/invoices/route.ts` (GET migrated, POST deferred),
  `app/api/invoices/[invoiceId]/route.ts` (GET migrated, PATCH deferred),
  `app/api/invoices/[invoiceId]/payments/route.ts` (GET migrated, POST deferred),
  `app/api/invoices/recurring/run/route.ts` (POST deferred — accounting integration).

### onboarding (partial)
- `lib/api/helpers.ts`, `lib/db.ts`, `lib/db/schema/index.ts`, `lib/abilities-server.ts` — app-wide infra. KEEP.
- `server/actions/onboarding-actions.ts` — parallel SERVER-ACTION data path
  (`updatePersonalDetails`/`updateBankDetails`/`uploadOnboardingDocument`/`submitOnboarding`) used by
  the employee wizard; stays in the frontend, outside API-migration scope. KEEP.
- `lib/inngest/functions/initiate-onboarding.ts` — uses the onboarding schema tables. KEEP.
- DEFERRED routes (KEEP — no NestJS equivalent):
  `app/api/onboarding/bank-details/route.ts` (encryption),
  `app/api/onboarding/documents/route.ts` (R2 storage),
  `app/api/onboarding/tasks/[taskId]/route.ts` (completion-email fan-out).

### webhooks (partial)
- `lib/api/helpers.ts` (`withAuth`/`withAbility`/`ok`/`err`/`parseBody`), `lib/db/index.ts`,
  `lib/db/schema/shared.ts` (defines `webhookEndpoints`), `lib/db/schema/index.ts` (barrel),
  `lib/logger.ts` — shared infra. KEEP.
- `lib/inngest/functions/webhook-dispatcher.ts` — the OTHER importer of `webhookEndpoints`
  (keeps the schema SHARED, not dead). KEEP.
- `lib/razorpay/client.ts` — used by the deferred razorpay inbound route. KEEP.
- `lib/rate-limit.ts` — contains `{ prefix: "/api/webhooks/", ... }` (~line 245); still needed by
  the deferred razorpay inbound route. KEEP (no edit).
- DEFERRED route (KEEP): `app/api/webhooks/razorpay/route.ts` (POST inbound Razorpay payment webhook).

---

## 5. Bare-URL / apiClient-bypass audit (point 3) & cutover caveats

### careers — CLEAN, plus one server-side config removal
- Repo-wide grep for `"/api/careers"` returns NO client-side `fetch()`/`window.open()`/`<a href>`.
  The two careers routes have zero frontend callers (no apiClient/hook usage).
- The ONLY reference is server-side config: `lib/rate-limit.ts:241`
  `{ prefix: "/api/careers/apply", tier: "public-intake" }` — REMOVE this entry at cutover (the
  route it protects is being deleted).

### careers — OUT-OF-SCOPE caveat (do NOT delete during careers cutover)
- `app/api/public/careers/[orgSlug]/jobs/route.ts`,
  `.../[orgSlug]/jobs/[jobId]/route.ts`, and `.../[orgSlug]/jobs/[jobId]/apply/route.ts` are a
  DIFFERENT `public` domain. They are NOT in the NestJS `careers` controller (which has no
  `orgSlug` routes) and have NO backend equivalent yet. KEEP.
- Related bare-fetch flag (belongs to the public domain, NOT careers): the public apply page
  `app/(public)/careers/[orgSlug]/jobs/[jobId]/apply/page.tsx:35` uses a BARE `fetch()` to
  `/api/public/careers/${orgSlug}/jobs/${jobId}/apply` that bypasses apiClient. Noted for that
  domain's future migration; irrelevant to the careers cutover.

### invoices — CLEAN (no bypasses), but GET-only files BLOCKED from physical deletion
- No component-level `fetch()`/`window.open()`/`<a href>` targets `/api/invoices/*`. Every client
  call goes through apiClient in `lib/api/hooks/invoice.ts` (relative paths:
  GET `/invoices`, GET `/invoices/stats`, GET `/invoices/recurring`, POST `/invoices/recurring/run`,
  GET/PATCH/DELETE `/invoices/:id`, GET/POST `/invoices/:id/payments`). The only literal
  `/api/invoices` strings are in `docs/` — not runtime code. (`apiClient` internally fetches
  `/api/auth/backend-token` for the bearer token — infra, not a bypass.)
- Physical-deletion block: because `/invoices` is NOT added to `MIGRATED_PREFIXES` (deferred writes),
  `stats/route.ts` and `recurring/route.ts` must remain on disk so `useInvoiceStats` and
  `useRecurringInvoices` keep resolving against same-origin `/api`. They are deletable in principle,
  not safely removable until full cutover (or per-path/per-method apiClient routing lands).
- Orphaned client method (out of scope, flagged): `useDeleteInvoice` issues `DELETE /invoices/:id`
  but NO DELETE handler exists in any invoices `route.ts` file.

### onboarding — CLEAN (no bypasses), plus a parallel server-action path
- Zero bare `fetch()`/`window.open()`/`<a href>` to `/api/onboarding` anywhere in app/components
  (only doc references). All client API access flows through apiClient hooks.
- The employee onboarding WIZARD (`features/onboarding/{personal-info,bank-details,documents,review}-tab.tsx`)
  does NOT call these API routes — it uses Next.js SERVER ACTIONS in
  `server/actions/onboarding-actions.ts`. Consequently `personal-details/route.ts` and
  `submit/route.ts` already have ZERO UI callers (deletable on both grounds: backend-ported AND
  unused by UI). The server-action file is a parallel data path that STAYS (outside scope).
- STALE-DOC WARNING: `docs/superpowers/REMAINING-DOMAINS-PLAN.md` line 140 is INVERTED — it claims
  `submit` is deferred and `bank-details` is ported. That is wrong. Source of truth =
  `backend/src/modules/onboarding/onboarding.controller.ts`, which PORTS `POST /onboarding/submit`
  (service implements leaveBalances seeding, lines 304–318) and `PATCH /onboarding/personal-details`,
  and does NOT have `bank-details`. Deleting `bank-details` or keeping `submit` per that stale doc
  would break the app. Trust the controller, not the doc.
- OUT-OF-SCOPE (different domains, KEEP): `app/api/hr/onboarding-docs/**` (HR document-review;
  `[docId]/route.ts` imports `recalcOnboardingStatus` from `../route` — intra-domain),
  `app/api/hr/onboarding/reminders/route.ts`, `app/api/hr/dashboard/onboarding-status/route.ts`
  (hr:analytics), and `app/api/clients/onboarding/**` (CRM client onboarding). None are part of the
  NestJS onboarding module.

### webhooks — CLEAN for the ported CRUD domain
- The settings page `app/(dashboard)/settings/webhooks/page.tsx` already routes through apiClient
  (`.get/.post/.patch/.delete` on `/webhooks` and `/webhooks/{id}`) — no bare fetch/window.open/`<a href>`.
- Other `/api/webhooks/...` string refs are UNRELATED inbound integrations, NOT bypasses of this
  domain (do not touch on webhooks cutover):
  - `app/(dashboard)/settings/integrations/recruitment/page.tsx:150` builds a display/copy string
    `/api/webhooks/{config.id}/applications` for an ATS inbound webhook (no such route file exists).
  - `app/(owner)/owner/settings/page.tsx:33` and `app/(owner)/owner/revenue/page.tsx:46` are display
    text for the deferred razorpay webhook.
  - `app/api/hr/recruitment/candidates/[candidateId]/rollout-documents/route.ts:156` is SERVER-side,
    constructing an `/api/webhooks/esign` callback URL for Documenso (inbound, no route file).
- DEPLOYMENT CAVEAT: per the same apiClient mechanism, the two CRUD route files must NOT be
  physically removed until `/webhooks` is in `MIGRATED_PREFIXES`; otherwise apiClient calls to
  `/webhooks` fall back to same-origin `/api/webhooks` and 404. Since this domain is PARTIAL
  (razorpay deferred), the prefix is intentionally NOT added (see §3) — so these CRUD files, like
  invoices' GET files, are deletable-in-principle but not safely removable now.

---

## 6. Onboarding-note check (per task instruction)

- invoices: route inventory under `app/api/invoices` is exactly 6 files (route, stats, recurring,
  recurring/run, [invoiceId], [invoiceId]/payments). No `pdf`/`send`/`export` sub-routes, and no
  invoices-onboarding routes exist — the onboarding note does not apply to this domain.
- onboarding: the onboarding domain itself is handled above; the HR-confirmed out-of-scope routes
  are listed in §5.
- webhooks: N/A — no overlap (event ids like `invoice.paid`/`employee.onboarded` are just string
  options in the settings UI).

---

## 7. Execution checklist (per domain, in order)

For the FULLY-migrated domain (careers):
1. Confirm the NestJS `careers` backend passed functional tests in staging.
2. Add `/careers` to `MIGRATED_PREFIXES` in `lib/api-client.ts` (parity; repoints nothing today).
3. Delete `app/api/careers/route.ts` and `app/api/careers/apply/route.ts`.
4. Edit `lib/api/cache-tags.ts` — remove the orphaned line 53 `careers: "careers"`.
5. Remove the `{ prefix: "/api/careers/apply", ... }` entry from `lib/rate-limit.ts:241`.
6. Leave `app/api/public/careers/**` untouched (different domain).
7. Run `pnpm build` + `pnpm lint`; fix any newly-orphaned import.

For each PARTIAL domain (invoices, onboarding, webhooks):
1. Do NOT add a blanket prefix to `MIGRATED_PREFIXES`.
2. Because the prefix is withheld, the ported GET/CRUD route files must STAY on disk to keep
   same-origin hooks resolving. They are recorded here as deletable-in-principle; physically remove
   them ONLY at full domain cutover (or once per-route/per-method apiClient routing exists).
3. Keep ALL deferred routes in place:
   - invoices: `POST /invoices`, `PATCH /invoices/:id`, `POST /invoices/:id/payments`,
     `POST /invoices/recurring/run` (co-located in kept files).
   - onboarding: `bank-details`, `documents`, `tasks/[taskId]`.
   - webhooks: `razorpay`.
4. Keep every Keep-shared support file (§4) until the deferred endpoints are also ported.
5. For onboarding: do NOT touch `server/actions/onboarding-actions.ts` (parallel path) or the
   HR/CRM out-of-scope routes; trust the backend controller over the stale REMAINING-DOMAINS-PLAN doc.
6. Repoint only individual ported-endpoint hooks if/when per-endpoint routing is supported;
   otherwise leave the partial-domain hooks same-origin until the domain is fully ported.
