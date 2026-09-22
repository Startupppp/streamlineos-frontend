# DOC-00 — Normative Product and Architecture Decisions

## Authority

These decisions remove ambiguity across DOC-01 through DOC-14. They are
**normative** unless the user explicitly changes one. Older design text must
be reconciled to these contracts before implementation can close.

Locked by program default on 2026-09-19 when the user asked for a complete
Documents product. Change a decision only by editing this file.

## D01 — One Content Truth: `kb_pages`

**Status: LOCKED 2026-09-19 (program).**

- The canonical knowledge record is `kb_pages` (Plate JSON, spaces, versions,
  comments, reviews, public shares).
- `kb_articles` remains the help-centre CMS until cutover. New org-wiki
  authoring never writes articles.
- Files, sources, and attachments support pages. Documents is not a drive.
- HR `/me/documents`, accounting attachments, and SignOS envelopes stay in
  their modules.

- [ ] **DOC-00-D01-A** no new wiki write path creates `kb_articles`; migration
      preview/run remains the only article → page bridge.

## D02 — Documents Product Is Ask KB + Wiki

**Status: LOCKED 2026-09-19 (program).**

- Product landing is `/knowledge/chat` (Ask KB).
- Wiki landing is `/knowledge/wiki`.
- `/knowledge` redirects to Ask KB.
- Help-centre CMS stays at `/support/kb/**` until D08 cutover, but it is
  discoverable from the Documents product sidebar for holders of
  `kb:articles:view`.

- [ ] **DOC-00-D02-A** product sidebar exposes Ask KB, Wiki, and (when
      permitted) Help centre; no third unlabeled “Documents” hub.

## D03 — My Pages vs Shared vs Private Visibility

**Status: LOCKED 2026-09-19 (program).**

- **My pages** (`/knowledge/wiki/private` path kept; label becomes “My pages”)
  lists pages the actor **owns** (`ownerMembershipId` = current membership;
  fallback `createdById` only when owner is null).
- **Shared with me** lists pages with an **explicit share grant** to the
  actor that they do not own. It is not “created by someone else.”
- **Private** is a visibility value (`private` | `org` | `public`), not a
  third library destination.
- Current client filters are defects:
  - `private-page.tsx` filters `visibility === "private"`.
  - `shared-page.tsx` filters `createdById !== myId`.

- [ ] **DOC-00-D03-A** both lists are server-filtered, ACL-correct, and
      labelled My pages / Shared with me.

## D04 — Recents, Favorites, and Settings Are Not Routes

**Status: LOCKED 2026-09-19 (program).**

- Recents and favorites are sections on Wiki Home plus sidebar shortcuts.
- Trash retention is the only wiki setting and lives on Trash.
- Do not create `/knowledge/wiki/recent`, `/favorites`, or `/settings`.
- Add `/knowledge-base` → `/knowledge/wiki` redirect so the documented alias
  does not 404.

- [ ] **DOC-00-D04-A** root `PAGES.md` matches `frontend/PAGES.md`;
      `/knowledge-base` redirects.

## D05 — Full Search Is a First-Class Page

**Status: LOCKED 2026-09-19 (program).**

- Quick find (⌘K) is a jump palette, cap 20.
- `/knowledge/wiki/search` is the P0 results page with server filters,
  snippets, pagination, and bulk selection.
- Quick find always offers “View all results” when `hasMore` or the query is
  non-empty.

- [ ] **DOC-00-D05-A** search route exists, is reachable from Quick find, and
      never client-filters a tree dump.

## D06 — Spaces Archive; They Do Not Hard-Delete

**Status: LOCKED 2026-09-19 (program).**

- Spaces follow organization hierarchy: archive / restore, never a customer
  permanent-delete control.
- A dependency conflict keeps the dialog open and lists pages, members, and
  sources that block archive.
- Child-assignment selectors offer only ACTIVE spaces.

- [ ] **DOC-00-D06-A** space card Delete is gone; archive/restore is the only
      lifecycle control.

## D07 — Help Centre Stays Until Cutover; Research Briefs Move

**Status: LOCKED 2026-09-19 (program).**

- `/support/kb` and `/help/[orgId]` remain the help-centre CMS and public
  help site during dual-run.
- Research briefs move to `/knowledge/wiki/research-briefs` (P1). Until then
  they must appear in Documents nav where they live today.
- After cutover, help articles become `kb_pages` with `contentType` /
  space `isPublicHelpCenter`; `/support/kb` is deleted with no redirect.

- [ ] **DOC-00-D07-A** research briefs have one canonical URL; help-centre
      dual-run is documented in DOC-08 / DOC-11.

## D08 — Project Wiki Is an Adapter

**Status: LOCKED 2026-09-19 (program).**

- `/build/[projectId]/wiki/**` reads and writes the same `kb_pages` rows
  scoped by `projectId`.
- It does not get a second editor, template system, or ACL model.
- Build sidebar remains the project chrome; WikiShell is optional later, not
  a second product.

- [x] **DOC-00-D08-A** project wiki mutations hit `/kb/pages` with project
      ACL; no parallel Build wiki table.
      **Closed — source proof 2026-09-21.** No `pgTable` under
      `backend/src/db/schema/build/` declares a wiki, page or doc table, so no
      parallel model exists. The Build route
      `app/(authenticated)/build/[projectId]/wiki/page.tsx` renders
      `@/features/wiki/components/wiki-home-page` — the Documents feature, not
      a second editor. Project scope is a real column and a real predicate:
      `kb-page-visibility.ts:10,32,43` admits a row only when
      `project_id = ANY(<caller's projects>)`, and the mutation path asserts it
      — `kb-pages.service.ts:179` calls `assertPageAccessible` before update.

## D09 — Filters, Search, and Views Are Server Contracts

**Status: LOCKED 2026-09-19 (program).**

- Every collection filter is a query parameter the API applies before the
  limit.
- Filter state lives in the URL and resets pagination.
- Table / list / card / tree are views over the same records. They do not
  fork data.
- Saved personal views are P2. Health presets on Content management are P1.

- [ ] **DOC-00-D09-A** no list page filters a paged or capped tree in the
      browser and presents it as the full set.

## D10 — Frontend Permission Catalog Matches Backend

**Status: LOCKED 2026-09-19 (program).**

- `frontend/lib/rbac/permissions/kb.ts` must contain every backend
  `KB_PERMISSIONS` key, including `kb:pages:*`, `kb:templates:manage`,
  `kb:reviews:*`, `kb:pages:import`, `kb:pages:export`, `kb:settings:manage`.
- `useCan` on a missing key is a product defect: the control is permanently
  hidden or permanently broken.
- Metered AI requires `kb:ai:generate` on both UI and API.

- [ ] **DOC-00-D10-A** CI drift test fails if the two catalogs diverge.

## D11 — Page ACL Includes Space Membership

**Status: LOCKED 2026-09-19 (program).**

- Article reads already require space accessibility.
- Page reads, lists, search, reviews, sources, and analytics must apply the
  same space membership (or explicit page grant) in addition to visibility /
  project / creator.
- Creating or moving a page into a space calls `assertSpaceAccessible`.

- [ ] **DOC-00-D11-A** a member outside a restricted space cannot list, open,
      search, or retrieve its pages.

## D12 — Overlay Surfaces Are Visually Distinct

**Status: LOCKED 2026-09-19 (program).**

Five levels, never the same token:

1. Page canvas — `--background`
2. Sidebar / rail — `--sidebar` or `bg-card` at full opacity
3. Card / panel — `--card` + border + `shadow-sm`
4. Sheet / dialog — `--popover` + border + `shadow-lg` + scrim
5. Nested popover / menu — `--popover` lifted again, or `bg-muted` well
   inside the overlay — never another canvas

Light mode today sets `--card` and `--popover` to the same `#ffffff`, and
Sheet/Dialog use `bg-background`. That is the defect to fix.

- [ ] **DOC-00-D12-A** light and dark themes distinguish canvas, card, and
      overlay at 375 / 768 / 1280.

## D13 — Bulk Actions Are Real Mutations

**Status: LOCKED 2026-09-19 (program).**

- Content management, Trash, Reviews, Search results, and (P1) Home/My/Shared
  support explicit selection and authorized bulk actions.
- Every bulk endpoint is tenant-scoped, per-record ACL’d, idempotent, and
  returns per-id success/failure. Partial success is visible.
- `manage` is not a substitute for create / update / delete / purge.

- [ ] **DOC-00-D13-A** no silent all-or-nothing bulk; UI shows a result
      summary.

## D14 — Content Management and Ask Insights Are P1

**Status: LOCKED 2026-09-19 (program).**

- P0 ships correctness: routes, ACL, search page, filters, forms, colors,
  My/Shared semantics, mobile wiki nav, card menus, trash table, permission
  catalog.
- P1 adds `/knowledge/wiki/manage` (health inventory) and Ask Insights
  (assign / dismiss / solve search-no-result and no-context gaps).
- P2 is saved views, board/calendar databases, password-protected public
  pages, and AI maintenance suggestions.

- [ ] **DOC-00-D14-A** P0 release does not claim Notion/Confluence parity
      beyond the P0 table in DOC-10.

## D15 — Universal Read, Gated Authoring

**Status: LOCKED 2026-09-19 (program).**

- Ask KB, Wiki Home, My pages, Shared, page read, history, space detail, and
  Quick find are universal frontend routes. Backend still requires
  `kb:pages:view` plus record ACL.
- Templates, Import, Export, Analytics, Reviews, Spaces list, Trash purge,
  and settings require the exact key. Unavailable items are absent from nav.

- [ ] **DOC-00-D15-A** sidebar and route-access tests assert the matrix in
      DOC-03.

## D16 — Deterministic Product Back

**Status: LOCKED 2026-09-19 (program).**

- Browser Back is the browser.
- Product “Back to …” uses an explicit safe parent (`backHref`), never
  `router.back()` alone.
- Sidebar destinations have no back control.
- Breadcrumbs start at Wiki, include only accessible ancestors, and never
  reveal a hidden parent title.

- [ ] **DOC-00-D16-A** every detail route in DOC-14 names its `backHref`.

## D17 — Universal Read Drops `RequireModule` on Read Surfaces

**Status: LOCKED 2026-09-20 (program).**

Constitution §8: KB reading is platform core. `RequireModule module="kb"` on
Ask KB, Wiki Home, My pages, Shared, page read, history, space detail, Quick
find, and `/knowledge/wiki/search` contradicts that. Org-disable of the KB
module must not hide reading.

- Keep `RequireModule` only on authoring/admin routes (templates manage,
  import, export, analytics, reviews, spaces list, content management).
- Backend still authorizes every read.

- [ ] **DOC-00-D17-A** read `page.tsx` files no longer wrap `RequireModule`;
      tests assert an active member with KB module off can still open Wiki
      Home and a permitted page.

## D18 — Record ACL Denial Is 404; Route Denial Is NoPermission

**Status: LOCKED 2026-09-20 (program).**

- Missing or inaccessible **record** (page, space, brief, share token) →
  **404** / `KbPageNotFound`. Do not disclose that the id exists.
- Missing **route-level** permission (Templates, Analytics, Import) →
  `NoPermissionState` with the exact key.
- `kb-page-not-found` recovery links only to Wiki Home. Never Trash or
  Spaces list (those can 403).

- [ ] **DOC-00-D18-A** get-by-id and not-found tests: other-tenant and
      same-tenant-hidden ids both 404; admin route without key is 403 UI.

## D19 — Reviews Use Derived Overdue, Not Persisted Expired

**Status: LOCKED 2026-09-20 (program).**

- Status enum stays `pending | approved | rejected`.
- **Overdue** = `status=pending` AND `dueAt < now`. Filter `overdue=1` or
  `status=overdue` as a derived sentinel, not a stored value.
- SLA / overdue workflow is P1. P0 only needs the filter + badge.

- [ ] **DOC-00-D19-A** Reviews Select includes Overdue; no `expired` status
      written to the database.

## D20 — Analytics Uses Canonical Visibility

**Status: LOCKED 2026-09-20 (program).**

- Existing analytics endpoints apply the same page/space resolver as lists.
- An all-records admin dashboard is a **new** path + permission, not a
  silent widening of `GET /kb/analytics/overview`.
- Reuse the existing overview `trustScore` or delete it; do not add a
  second score. Page-level health uses `trustState` presets (P1 Manage).
- Ask Insights filters `gapKind=ai_no_context` (event `ai_answer_no_context`),
  never `kind=ask`.

- [ ] **DOC-00-D20-A** overview/gaps leak no title outside ACL; Insights
      query uses `gapKind`.

## D21 — `/ask` Is Not a Product

**Status: LOCKED 2026-09-20 (program).**

- `frontend/app/(authenticated)/ask` duplicates Ask KB.
- Redirect `/ask` → `/knowledge/chat` and delete the orphan page after
  callers move. No second Ask chrome.

- [ ] **DOC-00-D21-A** `/ask` redirects; grep shows no Ask panel import
      outside `features/wiki`.

## D22 — Drafts, Tokens, Notifications, Owner Key

**Status: LOCKED 2026-09-20 (program).**

- Page content drafts are **not** `localStorage`. In-memory or a
  tenant-scoped server draft only. Clear on logout, org switch, membership
  revocation, successful save, discard.
- Public-link **expiry / password** is P2. P0 tokens are valid until
  revoked. Do not test “expired token” in P0.
- Comment / share / review **notifications** are P1. P0 has no inbox
  requirement.
- Reassign owner (single and bulk) is `kb:pages:manage`.
- Recents cap **20**, favorites cap **50**. No “View all” route. P1 may
  add `?favorite=1` on My pages.

- [ ] **DOC-00-D22-A** no page body in Web Storage; owner mutate gated on
      manage; P0 public tests are valid vs revoked only.

## Decision Index

| ID | Decision |
|---|---|
| D01 | `kb_pages` is the only wiki system of record |
| D02 | Product = Ask KB + Wiki; help centre is a linked CMS |
| D03 | My pages = owner; Shared = explicit grant |
| D04 | No recent/favorites/settings routes; alias redirect |
| D05 | Full search page is P0 |
| D06 | Spaces archive/restore |
| D07 | Research briefs move; help centre dual-run |
| D08 | Project wiki is an adapter |
| D09 | Server filters + URL state + views-not-data |
| D10 | Permission catalogs must match |
| D11 | Space membership on every page path |
| D12 | Five-level surface color stack |
| D13 | Authorized, partial-success bulk |
| D14 | P0 correctness; P1 governance; P2 advanced views |
| D15 | Universal read, gated admin nav |
| D16 | Deterministic backHref |
| D17 | Drop `RequireModule` on read surfaces |
| D18 | Record ACL → 404; route ACL → NoPermission |
| D19 | Overdue is derived; no persisted `expired` |
| D20 | Analytics = canonical visibility; `gapKind=ai_no_context` |
| D21 | `/ask` redirects to Ask KB |
| D22 | No Web Storage drafts; token expiry P2; notify P1; owner=`manage` |

## Evidence Log

_Empty until a decision’s acceptance item closes._
