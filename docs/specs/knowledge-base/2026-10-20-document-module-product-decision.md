# StreamlineOS Docs: Product Decision

**Decision date:** 2026-10-20
**Status:** Authoritative product scope and release contract
**Scope:** Document and knowledge-base module only
**Source policy:** First-party product, support, and documentation sources only. Sources were accessed on 2026-10-20.

## 1. Executive decision

StreamlineOS Docs should be a **drive-first document workspace with permission-safe links to operating records**. It should combine:

1. a familiar personal/team file library;
2. native rich documents and a production-grade spreadsheet open/edit path;
3. governed sharing, recovery, search, and external collaboration; and
4. StreamlineOS-native live data blocks that bring authorized CRM, HR, project, support, and operational data into documents and reports.

The product should **not** attempt early Excel parity, turn every page into a generic database, or create a second native-document store beside the existing Knowledge model.

Highest-confidence decisions:

- **Ship the drive foundation before advanced AI.** My Files, Team Folders, Shared with me, first-class files/folders, safe sharing, search, versions, and trash are the credibility floor demonstrated by Odoo, Google, Microsoft, Zoho, Dropbox, and Box. [O1][G1][G2][M1][Z1][D1][B1]
- **Integrate the spreadsheet editor; own the data semantics.** Validate Microsoft 365/Excel first for XLSX fidelity and enterprise adoption. Build StreamlineOS live data blocks, provenance, authorization, refresh, and frozen-export behavior independently of the chosen editor.
- **Treat Odoo's live-data model as the differentiating benchmark.** Odoo inserts linked lists, pivots, charts, and financial data from multiple models, applies source-level filters, rechecks each viewer's record access, and freezes dynamic values on XLSX export. [O2][O3][O4]
- **Make external collaboration and administration first-class.** Named guests, expiring links, download controls, external-share reports, audit, retention, and rapid revocation are required product behavior, not later security polish. Google, Microsoft, Zoho, Dropbox, and Box all expose parts of this control plane. [G1][G5][M1][M4][Z2][D4][B2][B5]
- **Link one canonical file to business records; do not copy it per module.** CRM, HR, and project references must not duplicate bytes or silently grant record/file access.

## 2. Scope and migration constraints

### In scope

- A drive-style library for personal, shared, and team-owned content.
- Native rich documents built on the existing Knowledge editor and store.
- First-class uploaded files, versions, sharing, search, recovery, and audit.
- XLSX/CSV preservation, preview, indexing, and one production editor path.
- Contextual cited Ask, canonical links to operating records, and read-only live data blocks.

### Out of scope

- CRM, HR, payroll, accounting, calendar, or project-management feature decisions.
- Excel parity, VBA/macros, add-ins, unrestricted formulas, and arbitrary external data connectors.
- A generic page database/app builder, whiteboard, presentation editor, or autonomous publishing.
- A second native-document store or permanent dual-write with `kb_pages`.

### Migration rules

- `kb_pages` remains canonical for existing native content until an approved migration wraps or replaces it.
- “My files” means ownership. “Shared with me” means an explicit inbound grant; neither is inferred in the browser.
- Search, preview, download, AI, exports, notifications, and live-data refresh use the same authoritative permission evaluation.
- Navigation cleanup does not authorize route or data deletion. Retire a route only after usage, migration, retention, authorization, rollback, and deep-link checks pass.

## 3. Users and release jobs

| User type | Primary Docs jobs | Non-negotiable launch behavior |
|---|---|---|
| Individual contributor | Create, upload, organize, edit, find, share, recover, and link working files | Fast personal workspace, recents/starred, reliable search, comments, version restore, clear ownership/location |
| Team lead / knowledge owner | Organize team content, assign review, publish trusted material, monitor stale or blocked work | Team-owned folders, role-based access, activity, content status, templates, review/approval path |
| Admin / compliance | Control external sharing, investigate access, retain records, export evidence, revoke quickly | Tenant/team policy, share inventory, audit export, retention/trash policy, immediate authoritative denial |
| External collaborator | View, comment, edit allowed content, or submit requested files without seeing unrelated content | Named/verified access, explicit expiry and download policy, narrow navigation, no metadata leakage |
| CRM / HR / project / support user | Attach one canonical file to a record and consume current operational data in context | Reference rather than copy, independent record/file authorization, provenance, open-source-record action |

The design should optimize daily navigation for contributors while keeping reviews, retention, legal/compliance, and share reports available to authorized leads and admins rather than crowding normal navigation.

## 4. Final information architecture and cleanup

### Daily navigation

1. **Docs home** — recent work, favorites, and the document collection.
2. **My files** — content owned by the current member.
3. **Shared with me** — explicit inbound grants with sharer and access level.
4. **Team folders** — organization-owned shared workspaces.
5. **Templates** — reusable document and spreadsheet starting points.
6. **Quick find** — one fast search entry point.
7. **Trash** — restore and retention-aware deletion.

### Contextual or administrator-only

- **Ask documents** is available from Docs and from a selected file or folder; it is not the default landing page.
- Reviews, analytics, content health, retention, storage, and share reports are permission-gated administration.
- Import/export is reached from create/upload actions or administration.
- CRM, HR, Build, Support, and Sign documents appear through linked-record collections, not separate top-level library destinations.

### Remove from normal navigation

- Research Briefs.
- The duplicate Search link when Home search and Quick find already exist.
- The duplicate Favorites list in the shell.
- Company Documents as a separate library destination.
- Governance pages for users without the relevant administrative permission.

The routes and stored data remain intact until their explicit retirement gates pass.

## 5. What the primary-source evidence establishes

### Odoo Documents and Spreadsheet

Odoo Documents provides Company, My Drive, and Shared with me workspaces; folders, links, spreadsheets, shortcuts, tags, file requests, versions, locks, email aliases, linked records, and folder actions. [O1] Its spreadsheet creates data sources when users insert Odoo lists, pivots, charts, or financial data, including sources from different apps/models. [O2] Global filters operate on underlying sources, not only visible cells. [O3] Dynamic sheets can be shared internally, but each viewer sees only records allowed by model permissions and record rules; XLSX export freezes dynamic values. [O4]

**Decision:** copy the connected-report concept and access discipline, not Odoo's full spreadsheet engine or unrestricted server actions.

### Google Drive, Docs, and Sheets

Drive has Viewer, Commenter, Editor, and Owner roles, folder inheritance, limited-access folders, restrictions on download/copy/print, and organization-owned shared drives with Manager, Content Manager, Contributor, Commenter, and Viewer roles. [G1][G2] Docs supports comments/action assignments, templates, smart chips, and project-oriented building blocks. [G3][G7][G10] Sheets supports formulas, pivots, protected ranges, filter views, comments, and named/restorable versions. [G4][G8][G9][G11] Workspace admins can audit external sharing and apply labels, DLP, Vault retention, and tenant external-sharing policy. [G5][G6][G12]

**Decision:** benchmark Google's simple sharing and co-editing UX, but keep structured operating data in canonical StreamlineOS modules rather than page chips or sheet cells.

### Microsoft OneDrive, SharePoint, and Excel for the web

OneDrive/SharePoint expose view/edit/review or no-download sharing options, direct access, links, and external collaboration controlled at organization and site levels. [M1][M4] SharePoint libraries inherit permissions by default and deliberately break inheritance through unique scopes. [M5] Excel for the web supports browser creation/editing, formulas, tables, charts, sorting/filtering, pivots, co-authoring, AutoSave, and desktop fallback for advanced work. [M2][M3] SharePoint supports versions and approvals; Purview covers retention/records and DLP for SharePoint and OneDrive. [M6][M7][M8]

**Decision:** validate Microsoft 365 as the first provider path, but expose unsupported browser features and desktop fallback honestly.

### Zoho WorkDrive, Writer, and Sheet

WorkDrive separates personal content and Team Folders, offers role-based workspaces, external sharing with expiry, Shared with me, activity reporting, and version retention. [Z0][Z1][Z2][Z3] Writer supports track changes and review/approval workflows. [Z4][Z5] Sheet supports pivots, charts, comments, locked ranges, versions, workflows, and data connections to Zoho and third-party apps. [Z6][Z7]

**Decision:** Zoho is the closest all-in-one usability comparator. StreamlineOS should match the personal/team mental model and exceed it through native cross-module provenance and authorization.

### Notion and Confluence

Notion provides granular page/database roles, guests/public links, expiry, page-level database access, offline pages, and Enterprise audit logs. [N1][N2][N3] Confluence combines structured published pages with real-time live docs, nested content, comments, versions, statuses, approvals, and site/space/content restrictions. [C1][C2][C3][C4]

**Decision:** preserve StreamlineOS's knowledge-authoring strengths, but place them inside the drive. Status, review, and trust should be properties/actions on content, not permanent top-level destinations for every user.

### Dropbox and Box

Dropbox supplies owner/editor/viewer sharing, team folders, recovery/version history, external-share reporting, and file requests that accept uploads from people without accounts. [D1][D2][D3][D4][D5] Box adds detailed collaborator roles, controlled shared links, Office co-authoring, metadata-backed file requests, workflows, classifications, and retention. [B1][B2][B3][B4][B5][B6][B7]

**Decision:** file requests, metadata, and enterprise governance are strong follow-ons. They cannot substitute for correct ownership, inheritance, versioning, and access revocation.

## 6. Capability priority

The tiers are intentionally different:

- **Must-have** blocks a Drive-first launch or a claim that Docs is safe.
- **Basic** is expected before broad general availability, although a controlled pilot may start without every convenience.
- **Good-to-have** follows measured demand after the foundation is reliable.
- **WOW** differentiates StreamlineOS and ships only with explicit adoption, safety, and outcome evidence.

### 6.1 Release-blocking must-haves

StreamlineOS must not market the Drive-first Docs module until all of the following work end to end:

1. **Canonical objects and locations**
   - First-class folder, file, native document, spreadsheet asset, shortcut/reference, version, share, and activity objects.
   - My Files, Team Folders, Shared with me, Templates, Quick find, and Trash, with recents and favorites surfaced on Docs home.
   - Team Folder content is organization-owned and survives individual member removal.

2. **Safe file lifecycle**
   - Upload, create, rename, move, copy, shortcut, preview, download, replace/new version, restore, trash, and retention-aware purge.
   - Extension, MIME, magic-byte, size, malware, and archive safety checks before preview/indexing.
   - Immutable original bytes for uploaded DOCX/XLSX/CSV and visible processing/error state.

3. **One permission contract**
   - People, groups, team-folder roles, named guests, organization access, and links.
   - View, comment, edit, and manage semantics; inherited folder access by default; explicit limited-access break.
   - Expiry, revoke, download control, and a “why you have access” explanation.
   - Atomic permission recalculation on move; no title, count, snippet, thumbnail, activity, notification, export, AI, or live-block leakage.

4. **Credible native documents**
   - Create/edit rich text, tables, links, attachments, comments, mentions, versions, and export using the existing Knowledge editor/store.
   - Autosave/conflict behavior that never silently discards edits.

5. **Permission-safe discovery**
   - Search by name/content, type, owner, location, updated date, sharer, linked record, and visibility.
   - Current access is checked when results are returned and again when content is opened.

6. **A real spreadsheet contract**
   - Create/upload XLSX and CSV, preserve originals, preview safely, extract bounded searchable content, share/version/audit identically to files, and open through one tested editor path.
   - Publish a supported-feature/fidelity statement and unsupported-feature warnings.
   - Never overwrite the original on conversion without an explicit recoverable version.

7. **Controlled external collaboration**
   - Tenant and Team Folder admins can disable or narrow external sharing.
   - Named guest access is verified; public links are visibly risky and separately controlled.
   - Revocation and expiry apply to preview, download, search, cached AI passages, and notifications.

8. **Minimum administration and evidence**
   - Auditable create/open/download/move/share/revoke/version/restore/delete/export events.
   - External-share inventory, storage/quota visibility, trash/version retention settings, and exportable audit records.

9. **Canonical record links**
   - CRM, HR, project, support, and other modules reference a stable document ID.
   - A record link grants neither file access nor business-record access; opening the combined view evaluates both.

10. **Safe migration**
    - Existing `kb_pages`, grants, comments, versions, links, and routes remain usable through an adapter/migration ledger.
    - Cutover and rollback tests precede removal of any old path; no permanent dual-write.

### 6.2 Baseline/basic capabilities

These are commodity expectations for the first mature Docs release, but they need not all block the earliest controlled pilot:

- List/grid views, breadcrumbs, bulk actions, keyboard-accessible move, sort/filter, favorites, recents, thumbnails where safe, and clear owner/location/type metadata.
- Document suggestions/track-changes equivalent, resolved comments, action assignments, page/document status, templates, and reliable PDF/DOCX export.
- Access requests, mentions and actionable notifications, user-visible activity, link management, and ownership transfer where policy allows.
- Common preview coverage for PDF, DOCX, XLSX, CSV, text, and images, with explicit unsupported, encrypted, quarantined, and processing states.
- Idempotent import/export with duplicate handling, progress, per-item errors, retry, cancellation before processing, and expiring download artifacts.
- Template gallery for SOPs, policies, proposals, meeting notes, project plans, onboarding, budgets, and operating reports.
- Mobile-responsive viewing/commenting, keyboard and screen-reader parity, localization-safe metadata, and honest degraded/offline states.

### 6.3 Good-to-have

- Formal review and approval workflows with due dates, required approvers, reset-on-edit, decision history, and published/approved versions.
- File requests with deadline, password/verification, destination, required metadata, submitter receipt, and malware/quota handling.
- Configurable metadata templates, classifications, saved collections, document statuses, review dates, and bulk tagging.
- Advanced retention schedules, legal holds, DLP hooks, sensitivity labels, SCIM/SAML, and SIEM/audit export.
- Offline authoring and sync conflict review.
- Microsoft Office co-authoring, then Google Workspace integration if measured demand justifies a second provider/ACL adapter.
- Team-folder analytics, content usage, stale/orphaned content reports, and external collaboration reports.
- Workflow actions such as request review, send to Sign, create project task, or archive—typed and audited, not arbitrary user code.
- Email-to-folder or file-request intake, desktop sync/open-in-app helpers, and a second office provider only when target-user demand justifies their lifecycle and support cost.

### 6.4 WOW / differentiating capabilities

1. **Permission-safe Live Data Blocks** — insert a saved list, pivot, chart, metric, or financial/operating summary from authorized StreamlineOS records into a document or Live Report.
2. **Cited Ask Docs** — answer over a selected file, folder, or linked record set with openable citations and read-time authorization.
3. **Actionable extraction** — turn a contract clause, form, table, or spreadsheet range into reviewable CRM/HR/project/support actions with a visible diff and human approval.
4. **Change-impact preview** — before move, restriction, archival, or deletion, show affected links, guests, live blocks, citations, automations, and record owners.
5. **Document trust and health** — named owner, approval state, effective/review dates, source links, stale-content alerts, and remediation queues.
6. **Smart filing with provenance** — suggest destination, classification, related records, and retention while leaving the final access-affecting action to an authorized user.
7. **Semantic collections** — permission-safe saved views such as externally shared contracts, expiring policies, missing onboarding evidence, or project files awaiting approval without duplicating content.
8. **Outcome packets** — assemble a permission-safe, live bundle of decisions, files, source records, owners, and next actions for a customer, project, incident, onboarding, or audit without copying the underlying content.

### 6.5 Release edge-case checklist

Every applicable case below requires an explicit success, denied, unsupported, quarantined, conflict, or retry state. A generic empty state is not acceptable.

1. **Identity and authorization**
   - Removed, suspended, deactivated, or role-changed members; expired guests; group removal; tenant disablement; public-token revoke/rotation; stale sessions; and concurrent ACL changes.
   - No metadata leakage through titles, counts, paths, thumbnails, notifications, activities, exports, citations, error text, timing, or cache keys.
2. **Folders, ownership, and references**
   - Same-name items, Unicode/case normalization, reserved names, long names/paths, move cycles, shortcuts to deleted or inaccessible targets, cross-Team-folder moves, orphan prevention after member removal, and root-folder deletion.
   - Moving or copying never widens access silently; organization-owned content survives creator departure.
3. **Upload, preview, and download**
   - Empty, corrupt, mislabeled, oversized, interrupted, duplicate, encrypted/password-protected, macro-enabled, nested-archive/zip-bomb, parser-timeout, quota-exceeded, malware-positive, and scanner-unavailable files.
   - Chunked/retried upload finalizes once; quarantined originals cannot be previewed, indexed, downloaded, or sent to AI.
4. **Editing, versions, and offline**
   - Simultaneous edits, stale revisions, reconnect after offline edits, provider callback replay/out-of-order delivery, autosave failure, binary replacement, conversion loss, restore-after-move, and edit permission revoked mid-session.
   - The user can always identify the saved version and recover both sides of a conflict.
5. **Sharing and public delivery**
   - Forwarded invitations, identity/email mismatch, domain allow/deny policy, guest reauthentication, expiry during an open session, download/print restrictions, link enumeration, access requests, and source-owner revocation.
   - CDN, browser, search, notification, and AI caches stop disclosure after revoke; public pages control indexing and never expose sibling paths.
6. **Search, extraction, and Ask**
   - Index lag, parser/OCR failure, unsupported language, stale or restored versions, deleted sources, access changes during streaming, duplicate passages, insufficient evidence, provider outage/quota, and document prompt injection.
   - Citations bind to an authorized source revision and degrade to deterministic search when AI is unavailable.
7. **Spreadsheet and office-provider fidelity**
   - Hidden sheets/rows, formulas and cached values, dates/time zones/locales, currencies, merged cells, pivots/charts, external links, macros, protected/encrypted workbooks, very large sheets, malformed CSV encodings, and CSV formula injection.
   - Unsupported features are reported before save; originals remain recoverable; callbacks are authenticated, idempotent, and revision-ordered.
8. **Live Data Blocks**
   - Row- and field-level authorization, aggregate inference, two viewers seeing different totals, source deletion/rename/schema drift, partial refresh, stale cache, rate limit, currency/time-zone semantics, and export during refresh.
   - Fail closed without source access; snapshots state creator, filters, row scope, and data time.
9. **Lifecycle, compliance, and tenant exit**
   - Non-empty folder trash/restore, retention expiry, legal hold, partial purge, object/index/cache backup exceptions, export before tenant deletion, data-residency policy, and restore after an interrupted migration.
   - Purge is idempotent and is not reported complete until every required store has acknowledged it or recorded a policy exception.
10. **Cross-module links and workflows**
    - Missing/deleted source records, independent record/file permissions, one file linked to many records, duplicate action delivery, downstream rejection, and rollback after a partial workflow.
    - Links never copy bytes or grant access; every mutation uses the owning module's validation and audit path.
11. **Accessibility, localization, and responsive use**
    - Keyboard alternatives for drag/drop, focus restoration, screen-reader names and announcements, 200% text/zoom, reduced motion, high contrast, RTL, long translated labels, mobile sheets, and locale-safe date/number display.
12. **Reliability and scale**
    - Database, cache, object store, scanner, converter, office provider, search, AI, notification, and worker degradation; request retry/replay; queue backlog; hot tenants; quota races; and large collections.
    - Reads and writes remain bounded, idempotent where retried, observable, and honest about freshness.

## 7. Odoo live-data spreadsheet decision

### 7.1 Product contract

Build a provider-neutral `live_data_block` contract before building a native spreadsheet engine. A block should store:

- source module/model and stable source IDs;
- query, selected fields, grouping/aggregation, sorting, and filter schema;
- display mode: list, pivot, chart, metric, or bounded table;
- creator, owning workspace, schema revision, and last successful refresh;
- source provenance, open-source-record actions, refresh status, and failure reason;
- authorization mode and an optional explicitly published snapshot;
- export behavior and unsupported-feature warnings.

### 7.2 Authorization and sharing rules

- Spreadsheet or document access never grants access to source records.
- Every refresh, preview, search extraction, AI read, and export evaluates current source authorization.
- Internal live views are viewer-scoped: two viewers may see different rows or totals, and the UI must say so.
- External/public viewers receive no live operating data unless they independently have source-record access. The safe default is an owner-approved frozen snapshot with creator and timestamp.
- Cached results are data, not authorization. Revocation must prevent detail access immediately and invalidate derived search/AI/live-block output within the published propagation bound.
- Early Live Data Blocks are read-only. Cell edits must not bypass CRM, HR, project, inventory, payroll, or accounting validation.

### 7.3 Refresh, filters, and export

- Support manual refresh first, then bounded scheduled refresh with visible freshness and failure state.
- Start with date, relation/person/team, text, boolean, selection/status, and numeric filters, matching Odoo's useful source-filter pattern. [O3]
- Export live blocks as explicit snapshots. XLSX/PDF exports must include “data as of,” applied filters, source identity, and any row-scope warning.
- Provider-specific formulas or block functions must freeze or produce a clear unsupported report; never silently change meaning.

### 7.4 Delivery sequence

1. **Library contract:** spreadsheet-ready files and Microsoft-first open/edit integration.
2. **Live Report MVP:** native read-only lists, pivots, charts, metrics, filters, provenance, and refresh outside the provider workbook.
3. **Document embedding:** insert the same blocks into native documents.
4. **Bounded Live Sheet only if proven:** add a native grid when provider friction and repeated demand justify it; reuse the same block contract.

This sequence delivers the Odoo advantage—live operational context—without first rebuilding Excel.

## 8. Build, integrate, and defer

### Build and own

- Object model, ownership/location, permissions, share policy, audit, retention orchestration, record links, search authorization, and migration.
- Native document experience by evolving the existing Knowledge implementation.
- Live Data Blocks, provenance, viewer-scoped authorization, filters, snapshots, and cross-module links.
- External collaboration policy and evidence.

### Integrate first

- Microsoft 365/Excel web and desktop open/edit for XLSX; validate commercial rights, OAuth/tenant consent, callbacks, round-trip fidelity, revocation, and conflict behavior before committing.
- Malware scanning, office/PDF conversion, OCR, and deep file extraction engines while StreamlineOS owns policy and error handling.
- Google Workspace later only after target-customer demand offsets the cost of a second identity, ACL, lifecycle, and sync adapter.

### Defer

- Excel parity, macros/VBA, add-ins, unrestricted formulas/functions, arbitrary external data connectors, and write-back sheets.
- Whiteboards, presentations, video review, and a general no-code database.
- Autonomous AI publishing, sharing, retention changes, record mutation, or approval.

## 9. Delivery plan and closed decisions

### Current implementation baseline

Source and focused-test evidence already shows an existing `kb_pages` rich-document foundation with page trees, grants/public links, My/Shared collections, favorites, templates, comments, versions, search, imports/exports, trash, attachment controls, retrieval, and audit behavior. XLSX files can be accepted as supported sources and their bounded cell text can be extracted for search/Ask. Current navigation work removes Research Briefs and duplicate library links from normal navigation, but the Docs-default redirect contract still requires source/test/deployment reconciliation.

This foundation is **not** evidence of a complete Drive product. The following remain pending until implemented and proven:

- first-class file, folder, shortcut, workspace, binary-version, inherited-access, and organization-owned Team-folder contracts;
- consistent `/knowledge` → Docs home behavior across source, route tests, telemetry, and deployment, with Ask kept contextual;
- complete upload/preview/download/version/move/copy/restore behavior across the edge-case checklist;
- named-guest administration, public-link policy, share inventory, retention/hold, and full purge evidence;
- Microsoft 365 editor integration, consent/callback/revocation handling, and workbook-corpus round-trip proof;
- read-only viewer-authorized Live Data Blocks, labeled snapshots, and aggregate non-leakage tests;
- compatibility migration/rollback evidence for existing pages, grants, versions, comments, links, routes, and deep links;
- production-like authorization, browser, accessibility, load, recovery, deployment, and operational evidence in [`OPEN-TASKS.md`](OPEN-TASKS.md).

### Phase 0 — Focus the existing product

- Make Docs home the default.
- Keep My files, Shared with me, Team folders, Templates, Quick find, and Trash prominent.
- Demote duplicate search, duplicate favorites, Research Briefs, linked company documents, and governance destinations.
- Preserve the current rich-document, sharing, version, search, and XLSX/CSV source-indexing capabilities.

**Exit:** focused navigation is verified; existing routes and data remain reachable by permitted deep links.

### Phase 1 — Drive foundation

- Add canonical file, folder, shortcut, version, share, activity, and workspace contracts.
- Ship upload, preview, move, rename, share/revoke, search, restore, and inherited access.
- Migrate through compatibility adapters and a rollback ledger; do not dual-write permanently.

**Exit:** a pilot user can create or upload, organize, share, find, and restore content without administrator help or unauthorized disclosure.

### Phase 2 — Office-ready files

- Preserve DOCX/XLSX/CSV originals and show bounded safe previews.
- Validate Microsoft 365 as the first XLSX open/edit provider, with desktop fallback.
- Publish supported-fidelity and unsupported-feature behavior.

**Exit:** the approved workbook corpus round-trips without silent loss, and file ACL/version/audit behavior matches native documents.

### Phase 3 — Differentiation

- Ship cited Ask over a selected file or folder.
- Add permission-safe read-only Live Data Blocks and frozen exports.
- Add smart filing, actionable extraction, trust/health, semantic collections, and change-impact preview in measured order.

**Exit:** each capability improves a named workflow metric without increasing authorization or data-loss incidents.

### Closed product decisions

- **Spreadsheet editor:** Microsoft-first integration; no native grid until measured provider friction justifies it.
- **Team folders:** organization-owned shared workspaces; project folders may reference them but do not define a second file model.
- **Research Briefs:** absent from normal navigation; retain route/data until a separate add-on or retirement decision.
- **External sharing:** named guests are the default; public links require administrator opt-in, expiry, audit, and download policy.
- **Live data:** read-only and viewer-authorized initially; exports are labeled snapshots.

## 10. Release evidence and measurable gates

- **Authorization:** zero unauthorized title, count, snippet, thumbnail, file, version, activity, citation, export, notification, or live-block disclosure in adversarial tests.
- **Revocation:** authoritative opens fail immediately; search, AI, and live-block derivatives meet the existing hard propagation bound of 60 seconds or less.
- **Signed media:** future URL issuance fails immediately after revoke; each preview/download/public-media surface publishes and tests its maximum pre-issued URL exposure window rather than hiding it behind the general cache SLO.
- **Async file jobs:** import, export, conversion, preview, extraction, and purge workers recheck current authorization/policy at execution and finalization; retries cannot duplicate records or leave untracked objects.
- **Recovery:** upload, overwrite, edit, move, trash, and restore scenarios preserve a recoverable version and audit lineage.
- **Spreadsheet fidelity:** 100% original-byte preservation; at least 99% supported-cell equivalence on the approved corpus; zero silent unsupported-feature loss.
- **External sharing:** every external grant appears in admin inventory with actor, recipient/link, access, expiry, download policy, item, and last activity.
- **Live data:** tests prove viewer-specific row security, aggregate non-leakage, stale-cache denial, frozen export labeling, and schema-change failure handling.
- **Migration:** every migrated page/file has stable identity, permissions, versions, comments, links, and rollback evidence before old paths can be retired.
- **Search quality:** exact identifiers, permission revocation, stale/deleted exclusion, citation correctness, and minority-tenant lexical/vector recall meet a versioned evaluation set.
- **Usability:** a new contributor can create/upload, place, share, find, edit/open, and restore a file without administrator help.

## 11. First-party source register

### Odoo
- **[O1]** Documents, Odoo 19: https://www.odoo.com/documentation/19.0/applications/productivity/documents.html; **[O2]** linked Odoo data: https://www.odoo.com/documentation/19.0/applications/productivity/spreadsheet/insert.html
- **[O3]** Global filters: https://www.odoo.com/documentation/19.0/applications/productivity/spreadsheet/work_with_data/global_filters.html; **[O4]** sharing/collaboration: https://www.odoo.com/documentation/19.0/applications/productivity/spreadsheet/share_collaborate.html

### Google
- **[G1]** Drive sharing: https://support.google.com/docs/answer/2494822; **[G2]** shared drives/roles: https://support.google.com/drive/answer/7286514
- **[G3]** Smart chips/building blocks: https://support.google.com/docs/answer/10710316; **[G4]** collaborate in Sheets: https://support.google.com/docs/answer/9331169
- **[G5]** Drive log events: https://support.google.com/a/answer/4579696; **[G6]** labels, DLP, and Vault: https://support.google.com/a/answer/13127870
- **[G7]** Comments/action items: https://support.google.com/docs/answer/65129; **[G8]** pivots: https://support.google.com/docs/answer/1272900; **[G9]** filter views: https://support.google.com/docs/answer/3540681
- **[G10]** Templates: https://support.google.com/docs/answer/148833; **[G11]** formulas/functions: https://support.google.com/docs/answer/46977; **[G12]** admin external-sharing policy: https://support.google.com/a/answer/60781

### Microsoft
- **[M1]** OneDrive/SharePoint sharing: https://support.microsoft.com/en-us/onedrive/sharepoint/manage-sharing-and-permissions-in-onedrive-and-sharepoint; **[M2]** Excel web basics: https://support.microsoft.com/en-us/excel/basic-tasks-in-excel-for-the-web
- **[M3]** Browser/desktop differences: https://support.microsoft.com/en-us/excel/differences-between-using-a-workbook-in-the-browser-and-in-excel; **[M4]** external sharing: https://learn.microsoft.com/en-us/sharepoint/external-sharing-overview
- **[M5]** Permission scopes: https://learn.microsoft.com/en-us/sharepoint/manage-permission-scope; **[M6]** library approvals: https://support.microsoft.com/en-us/sharepoint/data-and-lists/approvals-in-lists-document-libraries
- **[M7]** Retention: https://learn.microsoft.com/en-us/purview/retention-policies-sharepoint; **[M8]** Purview DLP: https://learn.microsoft.com/en-us/purview/dlp-learn-about-dlp

### Zoho
- **[Z0]** WorkDrive My/Team folders: https://help.zoho.com/portal/en/kb/workdrive/upload-and-import/articles/add-files-folders-to-my-folders-and-team-folders; **[Z1]** Team Folder FAQs: https://help.zoho.com/portal/en/kb/workdrive/frequently-asked-questions-faqs/team-folders/articles/team-folders-faqs
- **[Z2]** External sharing: https://help.zoho.com/portal/en/kb/workdrive/share/articles/external-sharing-in-team-folder; **[Z3]** file versions: https://help.zoho.com/portal/en/kb/workdrive/admin-console/settings/articles/file-version-settings
- **[Z4]** Writer track changes: https://help.zoho.com/portal/en/kb/writer/collaboration-guide/articles/track-changes; **[Z5]** Writer workflows: https://help.zoho.com/portal/en/kb/writer/collaboration-guide/articles/document-workflows-in-writer
- **[Z6]** Sheet data connections: https://help.zoho.com/portal/en/kb/sheet/getting-started-with-zoho-sheet/articles/how-to-connect-external-apps-to-zoho-sheet; **[Z7]** Sheet collaboration: https://help.zoho.com/portal/en/kb/sheet/working-together-on-a-spreadsheet

### Notion
- **[N1]** Sharing/permissions: https://www.notion.com/help/sharing-and-permissions; **[N2]** offline pages: https://www.notion.com/help/use-pages-offline; **[N3]** audit log: https://www.notion.com/help/audit-log

### Confluence
- **[C1]** Pages: https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/; **[C2]** live docs: https://support.atlassian.com/confluence-cloud/docs/create-and-collaborate-in-real-time-with-live-docs/
- **[C3]** Permissions: https://support.atlassian.com/confluence-cloud/docs/what-are-confluence-cloud-permissions-and-restrictions/; **[C4]** approvals: https://support.atlassian.com/confluence-cloud/docs/request-and-manage-approvals-in-confluence/

### Dropbox
- **[D1]** Permissions: https://help.dropbox.com/share/set-file-folder-permissions; **[D2]** team folders: https://help.dropbox.com/organize/team-folders
- **[D3]** Version history: https://help.dropbox.com/delete-restore/version-history-overview; **[D4]** file requests: https://help.dropbox.com/share/create-file-request; **[D5]** sharing activity: https://help.dropbox.com/share/monitor-sharing-activity

### Box
- **[B1]** Collaborator roles: https://support.box.com/hc/en-us/articles/360044196413-Understanding-Collaborator-Permission-Levels; **[B2]** shared links: https://support.box.com/hc/en-us/articles/360043697094-Creating-Shared-Links
- **[B3]** Office co-authoring: https://support.box.com/hc/en-us/articles/18099738529555-Using-Microsoft-Office-Co-Authoring-Basics; **[B4]** File Request: https://support.box.com/hc/en-us/articles/360045304653-Administering-Box-File-Request
- **[B5]** Retention: https://support.box.com/hc/en-us/articles/360043694374-About-Retention-and-Retention-Policies; **[B6]** Relay controls: https://support.box.com/hc/en-us/articles/4404822772755-Enterprise-Settings-Content-Sharing-Tab; **[B7]** classifications: https://support.box.com/hc/en-us/articles/360044195133-Using-Security-Classifications-with-Box-Governance
