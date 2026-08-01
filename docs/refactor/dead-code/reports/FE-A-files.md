# FE-A-files dead-code sweep report

Agent: **FE-A-files** | Zone: `frontend/` | Candidates: 25 whole-file deletions

## Results

| candidate | verdict | evidence |
|---|---|---|
| `feedbucket-widget/src/index.ts` | KEPT | esbuild entry point in `feedbucket-widget/build.mjs:46` — `entryPoints: [resolve(__dirname, "src/index.ts")]` |
| `feedbucket-widget/src/ui.ts` | KEPT | Imported by `index.ts:3` — `import { mountWidget } from "./ui"` |
| `feedbucket-widget/src/console-capture.ts` | KEPT | Imported by `index.ts:1` and `ui.ts:3` |
| `feedbucket-widget/src/network-capture.ts` | KEPT | Imported by `index.ts:2` and `ui.ts:4` |
| `feedbucket-widget/src/screenshot.ts` | KEPT | Imported by `ui.ts:1` — `import { captureScreenshot, warmScreenshotCache } from "./screenshot"` |
| `feedbucket-widget/src/metadata.ts` | KEPT | Imported by `ui.ts:2` — `import { collectMetadata, getPageUrl } from "./metadata"` |
| `feedbucket-widget/src/api.ts` | KEPT | Imported by `ui.ts:5` — `import { submitFeedback, aiAssistFeedback, unwrapEnvelope } from "./api"` |
| `feedbucket-widget/src/styles.ts` | KEPT | Imported by `ui.ts:6` — `import { getStyles } from "./styles"` |
| `feedbucket-widget/src/annotator.ts` | KEPT | Imported by `ui.ts:7` — `import { Annotator, type AnnotationResult } from "./annotator"` |
| `feedbucket-widget/src/recorder.ts` | KEPT | Imported by `ui.ts:8` — `import { ScreenRecorder } from "./recorder"` |
| `feedbucket-widget/src/logo.ts` | KEPT | Imported by `ui.ts:9` — `import { LOGO_SVG } from "./logo"` |
| `components/blog/blog-admin-nav.tsx` | DELETED | 0 refs across both repos: symbol `BlogAdminNav` not found outside the file; no path import; no side-effect import; no dynamic import; no barrel re-export; no `app/(authenticated)/blogs/admin` route directory exists |
| `components/blog/blog-admin-table.tsx` | DELETED | 0 refs outside itself; imports `./status-badge` but nothing imports it; no admin route |
| `components/blog/blog-content-editor.tsx` | DELETED | Only imported by `blog-post-form.tsx` (itself dead); 0 external refs |
| `components/blog/blog-post-form.tsx` | DELETED | Symbol `BlogPostForm` 0 external refs; `blog-ai.ts` is its only non-UI import and that is also dead; no app route imports it |
| `components/blog/categories-manager.tsx` | DELETED | Symbol `CategoriesManager` found only in its own file; 0 external refs |
| `components/blog/cover-image-upload.tsx` | DELETED | Only imported by dead `blog-post-form.tsx`; 0 external refs otherwise |
| `components/blog/status-badge.tsx` | DELETED | Only imported by dead `blog-admin-table.tsx`; 0 external refs otherwise |
| `components/owner/owner-page.tsx` | DELETED | Symbol `OwnerPage` found only in its own file; no `app/owner/` directory exists; 0 external refs |
| `components/owner/owner-sidebar.tsx` | DELETED | Symbol `OwnerSidebar` found only in its own file; no `app/owner/` directory exists; 0 external refs |
| `hooks/api/blog-ai.ts` | DELETED | Only imported by dead `blog-post-form.tsx:29`; 0 other refs |
| `hooks/api/platform-admins.ts` | DELETED | Only imported by dead `platform-admins-section.tsx:16-19`; 0 other refs |
| `features/platform/add-admin-schema.ts` | DELETED | Only imported by dead `platform-admins-section.tsx:21`; 0 other refs |
| `features/platform/platform-admins-section.tsx` | DELETED | Symbol `PlatformAdminsSection` found only in its own file; 0 external refs; no app route or layout imports it |
| `features/hr/leaves/components/request-history-row.tsx` | DELETED | Symbol `RequestHistoryRow` found only in its own file; no barrel `index.ts` in HR leaves; 0 external refs |

## Summary

- **KEPT: 11** (all `feedbucket-widget/src/*.ts` — esbuild bundles `src/index.ts` which transitively imports all 10 siblings; knip cannot follow esbuild entry points)
- **DELETED: 14** (7 blog admin components, 2 owner components, 2 hooks, 2 platform feature files, 1 HR leaves component)
- **REPORT: 0**

## Key findings

### feedbucket-widget — all 11 files are live
`build.mjs` uses esbuild with `entryPoints: ["src/index.ts"]` and `bundle: true`. knip cannot trace esbuild entry points, so it reported all 11 files as unused. The actual import chain is: `index.ts` → `ui.ts` → remaining 9 modules. Every file is reachable.

### Blog admin cluster — dead island
`blog-admin-nav.tsx`, `blog-admin-table.tsx`, `blog-post-form.tsx`, `categories-manager.tsx` form a self-contained dead cluster. `blog-content-editor.tsx`, `cover-image-upload.tsx`, and `status-badge.tsx` are only imported within this cluster. No `app/(authenticated)/blogs/admin` (or any admin) route directory exists. The public blog site under `app/(public)/blogs/` uses only `blog-header`, `post-feed`, `blog-search`, `category-filter`, `newsletter-cta`, `blog-site-header`, `blog-footer`, and `table-of-contents` — none of the admin components.

### owner/* — planned but unrouted
`owner-page.tsx` and `owner-sidebar.tsx` reference `/owner/**` routes, but no `app/owner/` directory exists at all. They are dead scaffolding.

### platform-admins cluster — dead island
`platform-admins-section.tsx` imports `platform-admins.ts` and `add-admin-schema.ts` but is itself never imported from any route or layout. All three files form a closed dead cluster.

### request-history-row.tsx — genuinely unused
Despite HR being an active module, `RequestHistoryRow` has 0 external refs, no barrel re-export, and no dynamic import. The leaves module uses `leave-approvals-list.tsx`, `leave-approval-item.tsx`, and `leaves-tab-content.tsx` instead. Safe to delete.
