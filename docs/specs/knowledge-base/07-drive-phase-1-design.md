# Docs Phase 1 design — KB-OPEN-090, 091, 092, 095

Decided 2026-10-21. `BE/` = backend repo, `FE/` = frontend.

## Product decisions

| # | Decision |
|---|---|
| Q1 | Uploaded binaries are `kb_pages.kind='file'` (beside `document`, `spreadsheet`), so every object goes through page access. |
| Q2 | "Folder" = team folder (`kb_spaces`) plus the page tree. No nesting, no container-only kind. Workspace is a location contract (`personal` / `team` / `project`) over `space_id` / `project_id`, not a table. |
| Q3 | `visibility='private'` is the limited-access break. Descendants inherit from the nearest break (including its grants) until the next break. Applies in My files too. Existing `org` children under a `private` parent become limited. |
| Q4 | Team-folder roles take effect (viewer→view, commenter→comment, editor/publisher→edit, admin→manage on every page in the folder). Backfill viewer→commenter so nobody loses access. Folder admins manage membership without `kb:spaces:manage`. |
| Q5 | Guests reuse Client Portal membership (email-bound one-time invite, `PortalJwtAuthGuard`, `sessionEpoch` revocation). |
| Q6 | Guests view only; download only when the grant allows it. Every guest grant expires. |
| Q7 | Tenant default `guests` (guests on, links off). Orgs with public pages today get `guests_and_links`; their migrated links expire 90 days after migration. |
| Q8 | Every upload, including Ask-only sources, becomes a library file; notes become documents. |
| Q9 | New My files items default to private; team-folder items inherit. |
| Q10 | Shortcuts live only in My files in Phase 1. |
| Q11 | Activity is visible to edit and above, plus admins. |
| — | Creator gets no manage right (KB-OPEN-013, `35bddc494`); space-creator manage and `withoutUnsharedToken`'s creator branch go too. |
| — | Cross-workspace moves need manage on the page and explicit confirmation when the audience changes. |
| — | Guest grants cover one page, never its subtree. Links are view-only, hashed, shown once, rotated to re-share. Internal downloads are unrestricted; download policy applies to guests and links. Activity reads `audit_logs`. Old public-token columns stay until a later contraction. |

## Facts from the current code

1. Every page predicate is built in `knowledge-page-scope.ts`; detail, collection, search, Ask (`chunkVisibleTo`) and citations run it live. Only the accessible-space list is cached (60 s, keyed by `kb_space_acl_versions`).
2. `kb_space_members.space_role` is never read by access rules today; `resolveSpaceAccess('manage')` gives manage to the space creator.
3. Defect: `KbPageTreeService.move` updates `space_id` on the moved page only; descendants keep the old folder, and the authorization and cycle checks run outside the transaction.
4. `kb_sources` has no owner, visibility or grants; a source with `space_id IS NULL` is readable by every org member. Retrieval, citations, analytics, reaper, erasure and space lifecycle read it directly — a second authorization path.
5. "Upload Excel or CSV" parses in the browser and discards the original bytes.
6. Public links are one plaintext+hash token per page, no expiry, no admin opt-in, no download policy.
7. Grants name a membership or a role only. Portal identity exists (`portal_memberships`, invitations, `project_client_grants` precedent).
8. Reuse: `AuditService.logCritical` via `KbPageWriterService`; `FileQuarantineService.getStatusForKey`; 60 s signed URLs in `kb-object-access.ts`; `kb:settings:manage` exists in both catalogs.
9. Size pressure: `knowledge-authorization.service.ts` 490, `kb-pages.service.ts` 494, `kb-page-tree.service.ts` 531, `kb-sources.service.ts` 541, `page-grants-sheet.tsx` 546 lines — split by moving ownership, never by wrappers.

## Authorization model (Lane A owns)

- Trigger-maintained `kb_pages.access_root_page_id` (nearest ancestor-or-self with `visibility='private'`, or NULL) and `acl_path int[]` (page ids from that break or the root down to the page). `BEFORE INSERT OR UPDATE OF parent_page_id, visibility, space_id` copies `space_id` / `project_id` from the parent and computes both; an AFTER trigger re-touches children so the change cascades in one statement and bumps `acl_revision`. Cycle check stays in the app inside the move transaction.
- Standing gains `spaceLevels: {spaceId, level}[]` (keep `accessibleSpaceIds`); cache key carries levels; every role change bumps `bumpKbSpaceAclRevision`.
- Non-admin predicate for action `a`: org-wide (`a='view'`, `access_root IS NULL`, no space, no project, visibility org/public) · owner · folder role (`space_id = ANY(spaces at level ≥ a)` and `access_root IS NULL`) · folder admin (`space_id = ANY(spaces at manage)`) · project (as today plus `access_root IS NULL`) · grant (`EXISTS kb_page_grants WHERE page_id = ANY(acl_path)`, live, unexpired, level ≥ a) · AND the existing restrictions branch. No `created_by` term. "Shared with me" matches direct grants only.
- `routeFor` adds `team_folder` (with role), `team_folder_admin`, `inherited_grant` (with `inheritedFromPageId`).
- New objects: file → page predicate; binary version → `authorisePage` on the parent; shortcut → owner row, target joined through `visiblePagePredicate`; activity → `authorisePage(edit)`; guest → `core/authorization/knowledge-guest-access.ts` (page only); public link → id-only `SECURITY DEFINER` resolver then tenant RLS.

## Items

### 091 Team folders with inherited access (Lane A)
- Migration A1: `access_root_page_id` (composite FK `NOT VALID` then validated), `acl_path`, `idx_kb_pages_org_access_root` partial, `idx_kb_pages_org_space_live` partial, the two triggers; recursive-CTE backfill with `SET statement_timeout=0` that also realigns descendants with a wrong `space_id`.
- Migration A2: viewer→commenter backfill with ledger table `kb_space_role_backfill` (RLS) used by the rollback.
- API: `PATCH /kb/spaces/:spaceId/members/:memberId {spaceRole}` (409 on last admin); members routes `kb:spaces:view` + in-service `assertSpaceAccess(manage)`; `GET /kb/spaces/:spaceId` adds `viewerAccess {level, via}`; `POST /kb/pages/:pageId/move {parentPageId|null, spaceId?|null, index, confirmAccessChange?}` → 409 `ACCESS_CHANGE_CONFIRMATION_REQUIRED {from, to, subtreeSize}` without the flag; checks inside the transaction with row locks; subtree `acl_revision` bump + `commitManyPageChanges`. Page detail `access.via` gains the new routes.
- FE: role select in `space-members-sheet`; "Your access" on team folder detail; `page-general-access.tsx` ("Everyone in <folder>" / "Limited access"; My files: "Only people with access" / "Everyone in organization"); move confirmation in `move-page-dialog`; "why" copy in `page-metadata-sheet`.
- Exit: member removal (deleted and suspended), inheritance, limited break and cross-folder move give the same decision through detail, collection, search and Ask, with cross-tenant 404.

### 090 Drive objects (Lane B files/versions/preview/download; Lane D shortcuts/activity)
- Widen `chk_kb_pages_kind` to `document | spreadsheet | file`.
- `kb_file_versions`: uuid id, org_id, page_id, version_number ≥ 1, file_key, file_name (1–255), mime_type, byte_size bigint, sha256 (nullable only for migrated sources), extraction_state (pending/processing/ready/unsupported/failed), extraction_error, extracted_at, created_by_membership_id (SET NULL on its column), created_at; unique `(org_id, page_id, version_number)`, unique `(org_id, id)`, indexes `(org_id, page_id, version_number DESC)`, `(org_id, file_key)`, `(org_id, created_by_membership_id)`; FK `(org_id, page_id)` cascade; guard trigger allows UPDATE of `extraction_*` only; RLS + grants.
- `kb_page_shortcuts`: identity id, org_id, target_page_id (cascade), owner_membership_id NOT NULL (cascade), created_at; unique `(org_id, owner_membership_id, target_page_id)`; index `(org_id, owner_membership_id, created_at DESC, id DESC)`; hard-deleted link row; RLS + grants.
- Lane B API: `POST /kb/files` (multipart `file`, `spaceId?`, `parentPageId?`, `as?: file|spreadsheet`, `workbook?`) → 201 `{page, version}`; `@Idempotent`, `kb:pages:create`, 25 MB, extension + MIME + magic bytes allowlist (pdf, docx, xlsx, csv, txt, md, png, jpg, gif, webp; no svg, no xlsm); quarantine; new `kb-files` storage root; page `published` + version 1; `as=spreadsheet` also writes the workbook (original bytes kept); after commit: bounded `extractDocumentText`, quota reserve, re-check page live, write `content_text` + `extraction_state`, `commitPageChange`. `GET /kb/files/:pageId` (head, current version, scan state, extraction state, `previewKind`); `GET .../versions?cursor`; `POST .../versions`; `POST .../versions/:versionId/restore` (appends); `POST .../download-url {versionId?}` (60 s, attachment, clean scan, audited `kb.file.downloaded`); `POST .../preview-url` (pdf and images only). Document and workbook writers reject `kind='file'`; purge removes version objects.
- Lane D API: `POST /kb/shortcuts {targetPageId}` (view on target, else 404); `GET /kb/shortcuts?cursor` → `{id, targetPageId, createdAt, state: available|unavailable, target|null}`; `DELETE /kb/shortcuts/:shortcutId`; `GET /kb/pages/:pageId/activity?cursor` (edit) → `{id, action, at, actorKind, actor|null, metadata (allowlisted)}` via new `AuditLogService.listForResource`.
- FE: Lane B `features/wiki/components/files/*`, kind router in `page-document.tsx`, "Upload file" and an "Upload Excel or CSV" that keeps the original; Lane D shortcuts in My files, "Add shortcut to My files", activity tab in `page-right-panel`, file icons and `file` in the Type filter.

### 092 Named guests and external-share inventory (Lane C)
- Policy: `kb_settings.external_sharing` (`disabled | guests | guests_and_links`, default `guests`), `guest_grant_max_days` (90, 1–365), `share_link_max_days` (30, 1–365), `guest_allow_download_default` / `share_link_allow_download_default` (false); `kb_spaces.external_sharing` NULL = inherit. Effective policy = narrower of tenant and folder, evaluated at read time.
- `kb_page_grants`: `portal_membership_id`, `allow_download` (default true), `last_accessed_at`; three-way grantee arc; guest grant requires `expires_at` and `access='view'`; FK to `portal_memberships` (`NOT VALID` then validated); partial unique on live guest rows; index `(org_id, portal_membership_id, page_id)`.
- `kb_page_share_links`: identity id, org_id, page_id, token_hash unique, access `view`, allow_download, expires_at NOT NULL, created_by_membership_id, created_at, revoked_at, last_accessed_at; indexes `(org_id, page_id)` live, `(org_id, expires_at)`; RLS + grants; `app.kb_resolve_share_link(p_token_hash)` SECURITY DEFINER, pinned search_path, EXECUTE to `streamline_app` only.
- Data migration: copy live page tokens to links with the same hash and expiry = migration + 90 days; set `guests_and_links` for orgs with public pages; `public` treated as `org` afterwards.
- API: `GET/PATCH /kb/settings/sharing` (`kb:settings:manage`); `GET/PATCH /kb/spaces/:spaceId/sharing-policy` (folder admin, narrow only); `POST /kb/pages/:pageId/guest-grants {email, expiresAt, allowDownload?}` (manage; party contact + portal membership + invitation; 403 `EXTERNAL_SHARING_DISABLED`; 409 duplicate); grant lists carry `grantee.type: member|role|guest`; `POST/GET/DELETE /kb/pages/:pageId/share-links`, `POST .../:linkId/rotate`; public token GET/media resolve through the function and check policy/expiry/status with no-store and `X-Robots-Tag: noindex`; `POST /public/kb/links/:shareToken/download-url` and `.../access` beacon; portal guest routes `GET /portal/v1/docs/pages`, `GET /portal/v1/docs/pages/:pageId`, `POST .../download-url`, `POST .../access`; `GET /kb/sharing/inventory` (keyset union, all §10 fields) and `POST /kb/sharing/revoke {items ≤ 100}`; everything audited.
- FE: guest section in `page-grants-sheet`, link manager in `page-share-popover` (public radio removed), `features/wiki/components/sharing/*` + inventory/policy page under Manage, folder policy in `space-sheet`, expired/download states on `/wiki/[shareToken]`, portal documents pages.

### 095 One library over `kb_pages` and `kb_sources` (Lane D)
- `kb_sources.page_id` (FK `NOT VALID` then validated); `kb_source_page_ledger (org_id, source_id, page_id, source_kind, chunk_count, migrated_at)` unique `(org_id, source_id)`, RLS + grants.
- Data migration after B and D backends deploy: file sources → `kind='file'` pages (same space, `visibility='org'`, published, owner = creator membership, timestamps, `deleted_at`, bounded `content_text` from chunks) + version 1 (same `file_key`, sha256 NULL); notes → `document` pages; chunks re-pointed to pages; ledger filled; rollback from the ledger.
- All `kb_sources` readers move to page predicates; Ask takes `pageIds` (`sourceIds` mapped through the ledger for one release); `/kb/sources` routes become deprecated adapters; `POST /kb/sources` and `/note` call Lane B's files service and page create (one write path); `DELETE /kb/sources/:id` trashes the mapped page; collection `kind` gains `file`.

## Order and lanes

1. Creator-manage removal (done locally).
2. S0 contract, sequential: all DDL migrations with rollbacks and journal entries, Drizzle schema, `kind='file'` in backend types and frontend enums with a fallback renderer, rate-limit tiers, membership-artifact catalog entries, module shells `kb/files`, `kb/sharing`, `kb/library`, move route moved to `kb-page-move.controller.ts` + `dto/kb-page-move.schemas.ts`, access sub-schema in `core/dto/kb-page-access.schemas.ts`, `core/dto/kb-location.schemas.ts`. Deploy migrations, then backend, then frontend.
3. Parallel: Lane A (091), Lane B (090 files), Lane C (092), Lane D part 1 (shortcuts, activity, kind facet, retrieval from pages, ledger code).
4. After B: Lane D part 2 (source migration, Ask upload through B) and C's guest/link downloads through B's `KbFileDeliveryService`.
5. Last: cross-lane exit suite (§10 authorization, revocation, recovery, migration).

File ownership per lane is exclusive; only S0, Lane C and Lane D add journal entries, in sequence. `openapi.json` and contract registry are regenerated, never hand-edited.
