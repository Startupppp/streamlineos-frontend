# 33b — reconcile the `/storage/upload` + `/kb/media` wire contract

Follow-up to ticket 33. Ticket 33 stopped minting public URLs but kept returning the object
key in a field named `url`, and concluded "no frontend change was needed". That conclusion is
false in six places, one of which is a hard 400 on every generic file download.

## 1. Backend verified against source, not the report

Read before changing anything:

- `BE/src/modules/storage/storage.controller.ts::upload` returned
  `{ quarantineId, status: "pending_scan", key, url: key, mimeType, size, sha256 }`.
  **`url` was literally `key`** — ticket 33's claim is accurate.
- `BE/src/modules/kb/wiki/kb-media.service.ts::upload` returned `{ ...result, url: result.key, name }`,
  where `result` is `UploadResult { key, size, mimeType, sha256 }`. Same lie, same shape.
- `/storage/download` (non-attachment) returns `res.json({ url: signedUrl })` — that one is a
  **genuine signed URL** and was left alone.
- `openapi.json` declares **no response body schema** for either endpoint (no `@ResponseSchema`),
  so the rename needed no OpenAPI regeneration. `check:contract-vendor` confirms
  `FE/contracts/openapi.json` still matches `BE/openapi.json` byte-for-byte.

## 2. Every consumer of the changed contract, and what happened to the value

`/storage/upload` — 15 call sites. `/kb/media` — 1. Fate of the returned value:

| Call site | Typed as | Value went to | Was it wrong? |
|---|---|---|---|
| `features/settings/settings-profile.tsx:91` | `{url?, key?}` | `users.image` → `resolveImageUrl` | ok (persist) |
| `features/settings/organization/org-branding-section.tsx:161` | via `useUploadFile` | `organizations.logo/favicon` → **bare `<Image src>` ×5** | **broken render** |
| `features/chat/use-message-composer.ts:54` | `{url, key, …}` | `attachments.fileUrl` → **bare `<Image src>`** (`message-input.tsx:90`) | **broken render** |
| `features/chat/new-group-dialog.tsx:128` | `{url?}` | `channels.avatarUrl` → `resolveImageUrl` | ok |
| `features/chat/channel-info-panel-profile.tsx:91` | `{url?}` | `channels.avatarUrl` → `resolveImageUrl` | ok |
| `features/support/{portal/new-ticket-sheet,portal/portal-reply-composer,inbox/ticket-reply-composer,inbox/create-ticket-dialog}` ×4 | `{url}` | `support_*_attachments.fileUrl` → download route | ok (persist) |
| `features/hr/onboarding/{onboarding-upload-sheet,onboarding-detail-sheet}` ×2 | `{key}` | `onboarding_documents.fileUrl` → dedicated `/hr/onboarding-docs/:id/file` | already correct |
| `features/build/tickets/use-create-ticket-form.ts:222` | `{url}` | `ticket_attachments.fileUrl` → `getSignedFileUrl` | **400, see §4.2** |
| `components/storage/file-upload.tsx:91` | `{url, key}` | `onUploadComplete(url, key)` → leave attachments / resignation letters | ok (`url === key`) |
| `components/editor/tiptap-editor.tsx:59` | `{url, key}` | `<img src>` inside stored rich-text HTML | **broken render + stored** |
| `hooks/api/use-upload-file.ts:26` | `{url, key, …}` | 7 consumers (org branding, expenses, reimbursements, HR docs, doc review, handbook, payroll ESS) | mixed |
| `hooks/api/support/kb-attachments.ts:56` | `{url, key, …}` | posts **both** `fileKey` and `fileUrl` (optional in the backend Zod) | redundant |
| `features/wiki/lib/upload-kb-media.ts:76` (`/kb/media`) | `{url, key, …}` | Plate node `url` → **bare `<Image>/<video>/<audio> src`** | **broken render** |

Second-order consumers of `useUploadFile`, all traced: `create-expense-dialog` → `expenses.receiptUrl`
→ **`receipt-manager.tsx:105` bare `<Image src>`** (while `expense-item.tsx:66` resolves the *same*
value — the inconsistency that proves it); `reimbursements-page`, `payroll/ess` → `receiptUrl`;
`upload-document-dialog`, `upload-doc-sheet` → `documents.fileUrl` (dedicated protected route, ok);
`handbook-page-client` → `handbookVersions.documentUrl`.

Also reconciled because ticket 33 changed the columns behind them: `feedbucket_submissions.
screenshot_url` / `recording_url` now hold keys and were rendered bare in
`features/feedbucket/components/feedbucket-submission-detail.tsx:215,226` and
`features/build/feedbucket/project-submissions-inbox.tsx:74`.

Confirmed **safe** (checked, not assumed): `features/chat/chat-attachment.tsx:82` reads
`/chat/channels/:channelId/attachments/:attachmentId`, which `ChatAttachmentsService.getSignedUrl`
answers with a real signed URL — the orchestrator's hypothesis holds.

## 3. The contract itself — one coordinated change

`url` is **removed** from both responses; `key` is the only reference. Done in the same change on
both sides:

- `BE/src/modules/storage/storage.service.ts` — `UploadJobResult.url` deleted.
- `BE/src/modules/storage/storage.controller.ts` — `url: key,` deleted from the upload response.
- `BE/src/modules/kb/wiki/kb-media.service.ts` — `KbMediaUploadResult.url` deleted; returns `{ ...result, name }`.
- `BE/src/modules/kb/wiki/kb-media.service.spec.ts` — new `wire contract` test pinning `not.toHaveProperty("url")`.
- 16 frontend call sites re-typed `{ key: … }` and every `.url` read switched to `.key`.
- OpenAPI: no change required (no response schema); vendor copy still matches.

## 4. Defects found

### 4.1 P0 — `/storage/image` cannot be loaded by a browser at all

This invalidates the premise that `resolveImageUrl` "already handles" a key, and it is the single
biggest consequence of ticket 33.

`resolveImageUrl` emits `${NEXT_PUBLIC_API_URL}/storage/image?key=…`. That URL is:

1. **Bearer-only.** `StorageController` is `@UseGuards(JwtAuthGuard)`, `image()` carries no
   `@Public()`, and `JwtAuthGuard.canActivate` throws `Unauthorized` unless
   `req.headers.authorization` starts with `Bearer `. An `<img src>` / `<Image src>` /
   `<AvatarImage src>` cannot send that header — `lib/api-client.ts` is the only thing that does.
2. **CSP-blocked.** The API is a different origin from the app. `img-src` in **both**
   `next.config.ts` and `proxy.ts` is `'self' data: blob: api.dicebear.com *.r2.dev
   *.r2.cloudflarestorage.com images.unsplash.com lh3.googleusercontent.com streamlineos.app` —
   the API origin is in `connect-src`, never in `img-src`.

Before ticket 33 these values were public `*.r2.dev` URLs, which satisfied both. So **every
avatar, org logo, chat image, KB image and expense receipt in the app renders broken today**,
across ~110 render sites, not just the ones this ticket touched.

I could not fix this inside my territory. The two real fixes both live outside it:
- **(preferred)** an `@Public()` `/storage/image` variant taking a short-lived signed token minted
  by an authenticated call — `BE/src/modules/storage/**`, ticket 33's; or
- a same-origin Next route handler proxying with the session's `backendJwt` — `FE/app/**`, and
  root `CLAUDE.md` §5 forbids business `route.ts` in the frontend.

Everything I changed routes through the single `resolveImageUrl` seam precisely so this becomes a
one-function fix once that route exists. The already-working alternative is the signed-URL path
(`/storage/download?key=…` → `{ url }` on `*.r2.dev`, which **is** in `img-src` and needs no
header) — that is what `features/build/ticket-details/attachment-image.tsx` does.

### 4.2 P0 — every generic file download 400s

`downloadQuerySchema.url` is `z.string().url()`. `hooks/common/use-file-url.ts` sent the stored
value as `?url=`, and that value is now a bare key — so `getSignedFileUrl` and `downloadFile`
return a Zod 400 that surfaces as a generic failure toast. Hit build ticket attachments, expense
receipts and the tiptap image context menu. **Fixed**: the reference now travels in `?key=` unless
it really is `http(s)://`.

Compounding it, the same file's `isLocalUrl` returned `true` for anything containing `/uploads/`,
so the default-folder key `<orgId>/uploads/<file>` was treated as a local path and never resolved
at all. **Fixed** by asking `isStorageObjectKey` first.

### 4.3 P0/P1 — keys rendered as a bare `src` (fixed)

`receipt-manager.tsx:105`, `message-input.tsx:90`, `org-branding-section.tsx` ×5,
`plate-media-elements.tsx` ×4, `feedbucket-submission-detail.tsx` ×2,
`project-submissions-inbox.tsx:74`, `attachment-image.tsx:31` (fallback).

Sweeping the rest of `features/**` + `components/**` for the same shape turned up **18 more**
avatar renders that never went through `resolveImageUrl` while ~90 siblings did — uploaded avatars
are keys, so these are the same defect: `components/rbac/role-assignment-items.tsx` ×2,
`components/rbac/role-assignments-sheet.tsx`, `features/build/members/use-members-columns.tsx`,
`features/build/settings/project-member-roles-section.tsx`,
`features/directory/people/person-profile-tab.tsx`, `features/hr/document-review/review-table.tsx`,
`features/hr/employees/skills-matrix-page.tsx`, `features/hr/helpdesk/ticket-detail-sheet.tsx`,
`features/hr/hub/today/today-card.tsx`, `features/hr/recruitment/recruiters-page.tsx`,
`features/module-access/components/{member-assignment-sheet,module-members-tab}.tsx`,
`features/settings/roles/groups/group-detail-sheet.tsx` ×2,
`features/settings/roles/roles-audit-page.tsx`, `features/settings/simulate/simulate-page.tsx` ×2,
`features/users/{user-detail-sheet,user-table-columns}.tsx`. All fixed.

### 4.4 P1 — `resolveImageUrl` returned a leading-slash key unchanged

As the orchestrator flagged. Rewritten to mirror the backend `parseStorageKey` seam: strip leading
slashes, recognise `<orgId>/<folder>/<file>` (UUID first segment) and `kb-media|kb-sources/<orgId>/…`,
and only then fall through to the same-origin-path passthrough. Also added `data:`/`blob:`
passthrough, which was missing and would have double-wrapped an object URL.

### 4.5 P1 — the tiptap editor baked the key into stored rich text

`uploadImageFile` returned the key and it went straight into the document `src`. Storing a
*resolved* URL instead would bake `NEXT_PUBLIC_API_URL` into tenant content. Resolved with a
`StorageImage` extension: the document keeps the **key**, `renderHTML` emits the resolved src for
the DOM, `parseHTML` and `keyifyStoredHtml` normalise any resolved src back to a key on load and
on `onChangeHtml`. Round trip proven idempotent by `lib/storage-object-url.test.ts`.

### 4.6 Not fixed — reported, outside territory

- **`BE/src/modules/feedbucket/feedbucket-public.controller.ts:465`** interpolates the raw
  screenshot **key** into an `<img src="…">` in generated HTML. Same defect, backend side.
- **`BE/src/modules/chat/dto/chat.schemas.ts:53-54`** still requires both `fileUrl` and `fileKey`
  on a message attachment, and they now carry the same key. `fileUrl` should go. FE sends
  `fileUrl: result.key` so nothing breaks meanwhile.
- **`FE/features/wiki/components/public-page-content.tsx:249,255,261`** renders KB media on a
  **public** page. `/storage/image` is Bearer-only, so public KB media is unreachable regardless of
  §4.1's fix — it needs a public read path. Ticket 29's territory; allowlisted with that reason in
  the new guard test.
- **`BE/openapi.json` is stale in a way ticket 33 left behind**: `/storage/download` and
  `/storage/image` still advertise `x-authorized-in-service: resolveFileOwner`, but the controller
  now declares `assertKeyReadable`. Regenerating needs a Nest boot against the shared remote
  `DATABASE_URL`, so I did not run it. It does not affect the field rename.
- `candidates.resumeUrl` (`resume-tab.tsx`, `candidate-sheet.tsx`) is recruiter-supplied external
  input, not a `/storage/upload` result — checked, correctly left alone.

## 5. Proof — every command was run and its output read

| Gate | Command | Result |
|---|---|---|
| Backend types | `nice -n 10 node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | **exit 0, 0 errors** |
| Frontend types | `nice -n 10 node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` | **exit 0, 0 errors, whole tree** on the final run. Mid-session it was briefly red on `features/mail/mail-shell.tsx(117,11)` (`threadId: string \| null`, ticket 29's territory) and on `components/ai/*` + `components/assistant/*`; all three were other sessions' in-flight edits and are gone. The 22 stale `.next/types/validator.ts` baseline errors are also gone — `.next` was regenerated by another session. |
| Backend suites | `nice -n 10 npx jest src/modules/storage src/modules/kb/wiki src/modules/support/core --maxWorkers=2` | **81 suites / 640 tests pass, 0 failures** |
| FE — new proofs + a11y | `nice -n 10 npx jest lib/storage-object-url.test.ts lib/storage-key-render-contract.test.ts features/hr/expenses features/__tests__ --maxWorkers=2` | **13 suites / 135 tests pass** |
| FE — touched features | `nice -n 10 npx jest features/settings features/chat features/support features/build features/users features/module-access features/directory components/rbac components/editor components/storage lib/storage --maxWorkers=2` | **42 suites / 233 tests pass** |
| FE — touched features | `nice -n 10 npx jest features/hr features/payroll features/wiki features/feedbucket hooks lib --maxWorkers=2` | **117 suites / 1367 tests pass** |
| Lint (53 changed files) | `nice -n 10 npx eslint $(…)` | **0 errors**, 5 warnings, all pre-existing (`no-img-element` ×3 on `<img>` I did not introduce, one unused import, one `set-state-in-effect`) |
| OpenAPI vendor parity | `pnpm -s check:contract-vendor` | exit 0 — FE copy matches BE `openapi.json` |
| Contract drift | `pnpm -s check:contract-drift` | exit 0, 0 new drift |
| Import graph | `pnpm -s check:cycles` | exit 0, no circular dependency (5160 files) |
| File sizes | `pnpm -s check:file-sizes` | exit 1 on `components/ui/data-table.tsx` (501) and `hooks/api/notifications-inbox.ts` (507) — **neither touched by me** |

### The regression guard actually bites

`lib/storage-key-render-contract.test.ts` scans every `.tsx` under `features/` + `components/`
for a `src={…}` that can hold a stored reference and is not resolved (following single-level
`const x = resolveImageUrl(…)` aliases), against an allowlist where each entry states why the
value is not a key. Proven live: reverting one fix in `features/users/user-table-columns.tsx`
turns it red with
`+ "features/users/user-table-columns.tsx:46 src={user.image ?? undefined}"`; restoring it turns
it green (4/4). It also asserts no `apiClient.upload<T>("/storage/upload"|"/kb/media")` type
argument declares `url`, and that the four shared upload result types declare `key` and not `url`.

`lib/storage-object-url.test.ts` (14 tests) pins the resolver itself, including the real key shape
`<orgId>/<folder>/<file>`, the org-namespaced `kb-media/<orgId>/<file>` shape, **the leading-slash
key that used to bypass the resolver**, the legacy folder-first key, `data:`/`blob:`/absolute
passthrough, the same-origin-asset passthrough, and `storageKeyFromUrl` inverting
`storageObjectUrl` idempotently.

`features/hr/expenses/components/receipt-manager.storage-key.test.tsx` (2 tests) is the render
proof on the canonical site: a persisted receipt key reaches the DOM as
`…/storage/image?key=<encoded>` and never as the raw key, while a legacy absolute URL is untouched.

## 6. Files changed

**Backend** (`/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`) — response DTOs only,
no churn to ticket 33's logic:
- `src/modules/storage/storage.service.ts`, `src/modules/storage/storage.controller.ts`
- `src/modules/kb/wiki/kb-media.service.ts`, `src/modules/kb/wiki/kb-media.service.spec.ts`

**Frontend** (`/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/frontend`) — 53 files:
- new: `lib/storage-object-url.test.ts`, `lib/storage-key-render-contract.test.ts`,
  `features/hr/expenses/components/receipt-manager.storage-key.test.tsx`
- seam: `lib/utils.ts`
- `components/`: `storage/file-upload.tsx`, `editor/tiptap-editor.tsx`, `editor/plate/upload-media.ts`,
  `editor/plate/plate-media-elements.tsx`, `rbac/role-assignment-items.tsx`, `rbac/role-assignments-sheet.tsx`
- `features/settings/`: `settings-profile.tsx`, `organization/org-branding-section.tsx`,
  `roles/groups/group-detail-sheet.tsx`, `roles/roles-audit-page.tsx`, `simulate/simulate-page.tsx`
- `features/chat/`: `new-group-dialog.tsx`, `channel-info-panel-profile.tsx`, `use-message-composer.ts`,
  `message-input.tsx`, `chat-helpers.ts`
- `features/support/`: `portal/new-ticket-sheet.tsx`, `portal/portal-reply-composer.tsx`,
  `inbox/ticket-reply-composer.tsx`, `inbox/create-ticket-dialog.tsx`
- `features/build/`: `tickets/use-create-ticket-form.ts`, `ticket-details/attachment-image.tsx`,
  `members/use-members-columns.tsx`, `settings/project-member-roles-section.tsx`,
  `feedbucket/project-submissions-inbox.tsx`
- `features/hr/`: `expenses/components/{receipt-manager,create-expense-dialog}.tsx`,
  `reimbursements/reimbursements-page.tsx`, `handbook/handbook-page-client.tsx`,
  `documents/components/upload-document-dialog.tsx`, `document-review/review-table.tsx`,
  `employees/skills-matrix-page.tsx`, `helpdesk/ticket-detail-sheet.tsx`, `hub/today/today-card.tsx`,
  `recruitment/recruiters-page.tsx`, `leaves/leave-request-form-fields.tsx`, `exit/resignation-form-sheet.tsx`
- `features/`: `payroll/ess/components/ess-reimbursements-section.tsx`,
  `feedbucket/components/feedbucket-submission-detail.tsx`, `directory/people/person-profile-tab.tsx`,
  `module-access/components/{member-assignment-sheet,module-members-tab}.tsx`,
  `users/{user-detail-sheet,user-table-columns}.tsx`,
  `wiki/lib/upload-kb-media.ts`, `wiki/components/page-cover.tsx`

## 7. Territory crossings — declared, not hidden

The rename cannot be half-applied without breaking the build, so four files outside my stated
territory were edited. Each is minimal and mechanical:

- `FE/hooks/api/use-upload-file.ts` — dropped `url` from `UploadResult` and from the returned object
  (7 downstream consumers, all in my territory, updated in the same change).
- `FE/hooks/api/support/kb-attachments.ts` — dropped `url` from `StorageUploadResult` and stopped
  posting the redundant `fileUrl` (`fileKey` carries it; `fileUrl` is `.optional()` in
  `BE/src/modules/support/core/dto/support-kb.schemas.ts:67`).
- `FE/hooks/common/use-file-url.ts` — §4.2. Without this every generic download stays a 400.
- `FE/features/wiki/lib/upload-kb-media.ts` + `FE/features/wiki/components/page-cover.tsx` (2 lines) —
  the `/kb/media` half of the rename. `features/knowledge/**` in the do-not-edit list does not exist
  on disk; ticket 29's "Knowledge" work lives in `features/wiki/**`, so flagging this for the
  orchestrator rather than assuming.

Nothing under `FE/app/**`, `FE/lib/query*`, `BE/migrations/**`, `BE/src/db/schema/**`, or
`BE/src/modules/storage/**` beyond the two response-DTO lines was touched. No git command was run.
