# Drive-first Docs: Competitor Analysis and Product Direction

> **Historical evidence — superseded:** This analysis records the research and reasoning behind the Drive-first choice. [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md) is the implementation authority where wording or priorities differ.

**Decision date:** 2026-10-20  
**Selected direction:** A — Drive-first Docs  
**Decision owner:** Product  
**Status:** Historical supporting analysis; no implementation, source deletion, or route deletion is authorized by this document.

## 1. Executive decision

StreamlineOS should make its Docs module a **shared document workspace**: a file and folder system with native rich-text documents, spreadsheet support, sharing, version recovery, and contextual knowledge assistance.

It should not continue to expand as a navigation-heavy Wiki. The existing Wiki capabilities are useful foundations, but the user-facing model needs to change from `pages inside a knowledge base` to `files and folders inside personal and team workspaces`.

The practical target is closer to **Google Drive + Docs/Sheets**, **OneDrive + Microsoft 365**, and **Zoho WorkDrive** than to a standalone research or wiki product. Notion and Confluence remain useful benchmarks for structured knowledge, page-level permissions, comments, and governed content.

## 2. Current StreamlineOS audit

### What is already present

The current Knowledge/Wiki implementation already provides valuable building blocks:

- Rich editable Wiki pages with nested parent-child relationships.
- Spaces, page sharing grants, public links, Shared with me, My pages, recent pages, favorites, templates, comments, version history, search, imports, exports, and trash.
- Page-level access levels (`view`, `comment`, `edit`, `manage`) and grants to members or roles.
- Attachment storage, malware scanning, audits, and document ingestion for supported file types.

Source evidence:

- `frontend/features/wiki/components/wiki-sidebar-nav.tsx` exposes Wiki, Search, My pages, Shared with me, Spaces, Templates, Reviews, Import & Export, Analytics, Content Health, and Trash.
- `backend/src/db/schema/kb/pages.ts` stores a `parentPageId`, but does not distinguish a first-class file object from a folder object.
- `backend/src/db/schema/kb/page-grants.ts` holds page-level grants.
- `backend/src/db/schema/kb/attachments.ts` models files as attachments to a page rather than independent library items.

### Product gaps that prevent a credible Docs workspace

| Gap | Current evidence | Product consequence |
|---|---|---|
| No first-class folder or file model | `kbPages` is a page tree and attachments belong to pages | Users cannot understand ownership, location, type, move, shortcut, shared-drive membership, or file lifecycle in the way they expect from a document workspace. |
| No Docs library IA | Navigation is Wiki-first, not Files-first | Personal, team, recently used, and shared content are not framed as a coherent library. |
| Spreadsheet support is partial | `kb-sources.service.ts` now accepts XLSX and `extract-document-text.util.ts` extracts workbook text for search/Ask; XLS/XLSX can also be attached through `upload-kb-media.ts`. There is still no first-class workbook library object, safe grid preview, versioned spreadsheet lifecycle, or production editor integration. | An XLSX source can participate in retrieval, but users cannot yet manage and edit spreadsheets with Drive/Excel-class lifecycle guarantees. |
| No chosen Office-file editing model | No native spreadsheet model or external office-provider contract exists | Users cannot create or collaborate on a spreadsheet in Docs with predictable fidelity. |
| Sharing lacks file-workspace semantics | Current grants are page-based | Folder inheritance, personal/team ownership, shortcuts, link expiration, reason-for-access, download controls, access requests, and bulk share administration need an explicit model. |
| Separate research product increases information architecture cost | `/knowledge/research-briefs` has its own frontend routes, API, job lifecycle, and sidebar entry | It distracts from the Docs core unless research is a separately monetized and adopted product. |

## 3. Competitor evidence

### Google Drive, Docs, and Sheets

Google Drive makes **Shared with me** a first-class destination. It lists files and folders, owner, shared date, and document type, and lets a user organize the item through a shortcut instead of duplicating content. [Google Drive Help: Shared with me](https://support.google.com/drive/answer/2375057?co=GENIE.Platform%3DDesktop&hl=en-GB)

Folder access is inherited by files and subfolders. Drive exposes Viewer, Commenter, and Editor roles, supports expiration and download/copy restrictions, and uses limited-access folders where a child needs stricter access. [Google Drive Help: sharing and inheritance](https://support.google.com/drive/answer/7166529?hl=en)

Sheets provides sharing, comments and task assignment, protected ranges, named and restorable versions, filters, and cell-level edit history. [Google Docs Editors Help: collaborate in Sheets](https://support.google.com/docs/answer/9331169?hl=en) [Google Docs Editors Help: version history](https://support.google.com/docs/answer/190843?hl=en-en)

**Takeaway:** StreamlineOS needs `Shared with me`, shortcuts, inheritance, version recovery, and structured spreadsheet collaboration as coherent core behavior, not isolated page features.

### Microsoft OneDrive, SharePoint, and Excel for the web

OneDrive's Shared view combines files a user shared with others and files shared with the user, including the sharer's name. [Microsoft Support: Shared view](https://support.microsoft.com/en-gb/onedrive/see-files-you-shared-in-onedrive)

Excel for the web supports workbook creation, browser editing, sharing, automatic save, real-time presence/updates, sorting, filtering, PivotTable drill-down, and a desktop fallback for advanced editing. [Microsoft Support: Excel for the web](https://support.microsoft.com/en-US/Excel/basic-tasks-in-excel-for-the-web)

SharePoint explains the architectural default: document libraries form a permission scope; files and folders inherit access until a deliberate unique-permission break. [Microsoft Learn: SharePoint permission scopes](https://learn.microsoft.com/en-us/sharepoint/manage-permission-scope)

**Takeaway:** Native spreadsheet editing is a product in its own right. If StreamlineOS does not build it initially, it needs an explicit provider or desktop-open strategy instead of an ambiguous attachment experience.

### Zoho WorkDrive

Zoho WorkDrive offers **My Folders** for personal content and **Team Folders** for shared work. It creates documents, spreadsheets, and presentations through Writer, Sheet, and Show, and can import/edit office formats such as DOCX, XLSX, and PPTX through its office suite. [Zoho WorkDrive: files and folders](https://help.zoho.com/portal/en/kb/workdrive/upload-and-import/articles/add-files-folders-to-my-folders-and-team-folders)

Team Folders provide role-based shared workspaces, controlled external sharing and download permissions, activity visibility, trash, and recovery. [Zoho WorkDrive: Team Folder FAQs](https://help.zoho.com/portal/en/kb/workdrive/frequently-asked-questions-faqs/team-folders/articles/team-folders-faqs)

**Takeaway:** This is the most direct reference for StreamlineOS. The minimum mental model should be My Files + Team Folders + Shared with me, with document type-specific creation and editing.

### Notion and Confluence

Notion supports page sharing to people, groups, teamspaces, and the web; it has distinct view/comment/edit/full-access roles, inherited subpage permissions, link expiry, and access requests. [Notion Help: sharing and permissions](https://www.notion.com/help/sharing-and-permissions)

Confluence distinguishes structured pages from real-time live docs, retains version history, supports comments, and layers global, space, and content restrictions. [Atlassian Support: authoring and version history](https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/) [Atlassian Support: permissions](https://support.atlassian.com/confluence-cloud/docs/what-are-confluence-cloud-permissions-and-restrictions)

**Takeaway:** Keep the existing knowledge-authoring strengths, but place them inside a document workspace. Governance must be optional and role-gated, not a default daily navigation burden.

### Dropbox and Box

Dropbox makes file/folder viewer and editor permissions explicit, tracks file and folder version history, and supports file requests for uploads from non-members. [Dropbox Help: permissions](https://help.dropbox.com/share/set-file-folder-permissions) [Dropbox Help: file requests](https://help.dropbox.com/share/create-file-request) [Dropbox Help: version history](https://help.dropbox.com/delete-restore/version-history-overview)

Box provides Office co-authoring and version history for Office files stored in Box. [Box Support: Office co-authoring](https://support.box.com/hc/en-us/articles/18099738529555-Using-Microsoft-Office-Co-Authoring-Basics)

**Takeaway:** File requests and external upload drop-offs are useful phase-two capabilities. They should not substitute for correct internal file ownership, sharing, and audit behavior.

## 4. Recommended information architecture

### Everyday navigation

1. **Home** — recent, starred, activity needing attention, and recommended workspaces.
2. **My files** — content owned by the current user.
3. **Shared with me** — inbound files and folders with sharer, access level, date, location, and a shortcut action.
4. **Team folders** — organization-owned shared workspaces, each with members, role policy, and a folder tree.
5. **Templates** — document and spreadsheet templates.
6. **Search** — title, content, file type, owner, workspace, folder, update date, and shared state.
7. **Trash** — user-visible restore window and clear retention behavior.

### Contextual rather than primary destinations

- **Ask about this file/folder** — show inside a document, spreadsheet, or selected folder after content is indexed and access is verified.
- **Import/export** — action menus or an import centre reached from create/upload actions.
- **Governance** — reviews, content health, analytics, storage, and share reports belong behind an administrator/owner gate.
- **Linked records** — HR, CRM, Build, and other module documents should be reachable through a filtered collection rather than a primary Docs destination.

### Candidate retirement

`/knowledge/research-briefs` should leave normal navigation. Retain the data and routes until a retirement decision proves migration, data retention, authorization, and callers are safe. It can become a later add-on under AI/Research if product demand justifies it.

## 5. Feature prioritization

### Must: release-blocking document-workspace capabilities

1. **First-class objects:** file, folder, team folder, shortcut/reference, and native document.
2. **Ownership and location:** My Files, Team Folders, Shared with me, parent folder, move/copy/rename, star, recent items.
3. **File lifecycle:** upload, download, type/size validation, preview where safe, MIME metadata, version creation, restore, trash, retention, and activity audit.
4. **Sharing:** people, groups, team-folder roles, organization access, link access, revoke, expiry, explicit access level, and a clear explanation of why the viewer has access.
5. **Permission semantics:** inherited folder access by default, explicit break only with a visible reason, atomic move checks, no leakage in search, preview, download, AI, or activity.
6. **Search:** file name, content where extractable, type, owner, location, updated date, sharer, and visibility filters.
7. **Spreadsheet commitment:** users can create or upload an XLSX/CSV asset, see a safe preview, share it, find it in search, and open it in the chosen editor without data loss.

### Basic: common expectations after the foundation

1. Rich-text native documents with tables, attachments, comments, mentions, suggestions, document status, and reliable recovery from conflicts.
2. Spreadsheet tabs, typed cells, core formulas, cell formatting, sort/filter, freeze panes, CSV/XLSX import/export, and protected sheets/ranges.
3. Real-time presence and co-editing where the chosen editor supports it.
4. Access request/approval, external collaborator controls, download/copy/print restrictions, share notifications, and a user-visible activity feed.
5. File requests for external uploads into a controlled destination folder.
6. Template galleries for SOPs, briefs, policies, project plans, and operating spreadsheets.

### WOW: differentiated capabilities worth building only after the core

1. **Cited Ask Docs:** answer questions over a selected file, folder, or workspace with citations that recheck access at read time.
2. **Smart filing:** suggest team folder, tags, retention, owner, and related records when content arrives.
3. **Actionable extraction:** turn a table, form, contract, or spreadsheet into a reviewable Build/CRM/HR workflow draft.
4. **Document health:** owners, review dates, trust state, stale-content alerts, and safe remediation queues.
5. **Semantic collections:** saved views such as “contracts expiring soon,” “files shared externally,” or “unreviewed policies,” without duplicating files.
6. **Cross-module evidence links:** one file can be safely referenced from Build, CRM, HR, Support, or Sign without copying its bytes or access policy.

## 6. Spreadsheet strategy

The product must avoid claiming "Excel inside Docs" until the editing contract is real.

### Phase 1: spreadsheet-ready library

- Upload, create, preview, search, share, version, and download XLSX/CSV.
- Extract safe, bounded text/metadata for search and Ask where parser support exists.
- Render a non-editable preview with a download/open action while preserving the original binary.
- Ensure a spreadsheet receives the same ACL, audit, trash, retention, and version rules as every other file.

### Phase 2: chosen editor integration

Choose one explicit edit path:

- **Provider integration:** Microsoft 365 or Google Workspace opens the workbook in its native collaborative editor and synchronizes metadata/lifecycle events.
- **Internal sheet MVP:** build a bounded grid for tabs, values, formulas, sort/filter, and CSV/XLSX interchange. Do not promise Excel parity.

### Phase 3: native collaboration depth

Only after Phase 2 proves demand: concurrent cell editing, comments, protected ranges, charts, pivots, and advanced formulas.

## 7. Technical design principles

### Core entities

- `document_workspaces`: personal root and organization/team folders.
- `document_nodes`: folder, file, native document, native sheet, shortcut/reference.
- `document_versions`: immutable content/version metadata with checksum, storage key, MIME type, size, creator, and restore lineage.
- `document_permissions`: inherited policy plus explicit grants; grants are resolved consistently for list, search, preview, download, AI, notifications, and audit.
- `document_shares`: people/groups/link access, expiry, revoke state, download control, and audit metadata.
- `document_activity`: append-only events for upload, move, rename, share, open, comment, version, restore, delete, purge, and export.

### Security and reliability rules

- Keep bytes in object storage; keep metadata, permissions, location, state, and search projections in the database.
- Validate extension, MIME type, magic bytes, size, and malware status before preview or indexing.
- Use signed download/preview URLs whose issuance rechecks access.
- Never use search indexing, cached AI passages, thumbnail jobs, or an old share link as proof of current access.
- Treat move and permission changes as transactional policy changes. Moving an item into a folder must recalculate inherited access before it becomes visible.
- Define storage quotas, version retention, trash retention, and upload/download observability before broad rollout.

## 8. Delivery sequence

| Phase | Goal | Exit evidence |
|---|---|---|
| 0 | Contract and migration design | Entity model, ACL matrix, route map, data migration/rollback plan approved. |
| 1 | Drive foundation | My Files, Team Folders, Shared with me, upload, move, share/revoke, search, trash, version restore, focused authz tests. |
| 2 | Office-ready file support | DOCX/XLSX/CSV previews, extraction/indexing contract, provider or desktop-open strategy, file-type acceptance tests. |
| 3 | Native Docs and collaboration | Rich-text documents, comments, mentions, conflict recovery, activity, templates, presence where supported. |
| 4 | Spreadsheet integration | Microsoft-first production integration, round-trip fidelity tests, ACL and version parity. |
| 5 | Differentiation | Cited Ask Docs, smart filing, verified content health, cross-module references. |

## 9. Safe cleanup plan

No current source, route, database record, or planning document should be deleted merely because it is not part of the new primary navigation.

1. Hide/relabel a candidate page behind a feature flag or role gate.
2. Measure active routes, data rows, API callers, scheduled jobs, bookmarks, and integration links.
3. Preserve a redirect or read-only archive where users need historic access.
4. Migrate data and audit records only after verification.
5. Exercise rollback and authorization tests.
6. Delete code, routes, and data only after the evidence window closes.

## 10. Decisions resolved by the authority document

- Microsoft 365 is the first spreadsheet editor path.
- Team Folders are organization-owned shared workspaces.
- Research Briefs leave daily navigation while their route/data remains until a separate add-on or retirement decision.
- Named guests are the external-sharing default; public links require administrator opt-in and controls.
- Live data begins as viewer-authorized read-only blocks with labeled snapshot exports.

