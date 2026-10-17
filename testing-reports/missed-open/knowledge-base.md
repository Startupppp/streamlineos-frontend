# knowledge-base — partial items

These items are only partly done, so they stay. Fully finished items from the same report were not put back.

## KB-B-001 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

Backend `createSpaceSchema` uses `icon: z.string().trim().max(100).nullish()` and `description: z.string().max(2000).nullish()` (`kb.schemas.ts`); frontend `space-sheet.tsx` sends `icon: values.icon?.trim() || undefined` on create (omits from JSON when empty). Spec `kb-space-write-response.spec.ts` covers null icon/description acceptance.

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-001 | Space create fails when Icon empty (`icon: ... received null`) | PARTIAL | Both runs: Name-only (Icon AND Description blank) → toast `description: … received null` + `icon: … received null`; sheet stays open. Run A: Icon blank + Description filled → created, sheet closed, no icon error; card shows no icon (no default). Still blocks the default/name-only flow (see KB-B-026). |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-001: Creating a space fails when the optional Icon field is left empty
- Severity: High (blocks a default create flow)
- Route: /knowledge/wiki/spaces → "New space" / "Create space" side sheet
- Actor: org owner (adityachalla01)
- Steps: 1) Click "New space". 2) Type Name "QA1015 Space A". 3) Leave "Icon (emoji)" empty. 4) Keep Audience = Internal. 5) Click "Create".
- Expected: Space is created (icon is optional per placeholder "e.g. 📚"), sheet closes, space card appears.
- Actual exact text (toast, red): `icon: Invalid input: expected string, received null`
- Impact: Users cannot create a space unless they know to type an emoji; raw validation text leaks to the user. Probably affects every empty-icon create.
- Likely code area: space create form submit payload (icon sent as `null` instead of omitted/`""`), and the create-space API/schema validator (icon schema is `z.string()` without `.nullish()`/`.optional()`).
- Suggested fix: Either omit `icon` from the payload when empty or make the schema accept null/empty (`z.string().nullish()`); map empty input to `undefined`. Show a friendly message for any validation error instead of the raw key.
- Acceptance check: With Name only filled (icon blank, audience Internal), Create closes the sheet, shows the new space in the list with a default icon, no toast. Also repeat with Public and Mixed audiences.

## KB-B-003 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

`space-detail-page.tsx:107`: `handleNewPage` calls `createPage.submit({ spaceId })` — the current space id is passed to the create mutation.

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-003 | "New page" inside a space creates the article outside that space | PARTIAL | Both runs: space header "New page" → new doc; breadcrumb stays "Wiki › …" (no space); sidebar lists at root. Page is attached (Page settings → Space; space card page count updates) — Run B notes attachment only after first save; Run A saw Space E Hierarchy list the Untitled. Space-level breadcrumb still missing. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-003: "New page" inside a space creates the article outside that space
- Severity: High (content lands in the wrong place; space shows empty)
- Route: /knowledge/wiki/spaces/1 → "New page" button (header) — also the "New page" in the Hierarchy panel
- Actor: org owner (adityachalla01)
- Steps: 1) Open space "📚 QA1015 Space A" (/knowledge/wiki/spaces/1). 2) Click "New page". 3) Editor opens at /knowledge/wiki/doc/1 with breadcrumb "Wiki › Untitled". 4) Go back to /knowledge/wiki/spaces/1.
- Expected: The new page opens inside "QA1015 Space A" (breadcrumb shows the space; Hierarchy lists it; page count becomes 1).
- Actual: Breadcrumb is only "Wiki › Untitled" (no space); the sidebar lists the page at top level; the space still shows "0 pages", "No pages in this space yet", Hierarchy "No pages yet". The page only appears in the space after manually opening Page info → Space → "📚 QA1015 Space A".
- Impact: Articles created from a space silently land in the workspace root; users will think the space is empty and create duplicates.
- Likely code area: space detail "New page" handler (create-doc mutation should pass `spaceId`); /knowledge/wiki/doc/new route loader ignores the space context.
- Suggested fix: Pass the current space id in the create-page payload (or route `/knowledge/wiki/doc/new?space=:id`) and show the space in the breadcrumb.
- Acceptance check: From space 1 click New page → breadcrumb shows "QA1015 Space A", after going back the space lists the new page and shows "1 page". No manual move needed.

## KB-B-007 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

`upload-kb-media.ts:62-65`: `getValidationError` returns `.exe files can't be uploaded. You can upload images (JPEG, PNG, GIF, WebP), video (MP4, WebM), audio (MP3, WAV, OGG, M4A) and documents (PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP).` for unknown MIME types. Covered by `upload-kb-media.test.ts`.

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-007 | Rejected .exe attachment fails silently | PARTIAL | Both: qa-test.exe → red toast `Upload failed: qa-test.exe` + `Unsupported file type: application/x-msdownload`. Silent failure fixed, but message leaks raw MIME and does not list allowed types (.pdf .doc(x) .xls(x) .ppt(x) .csv .txt .zip). |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-007: Rejected .exe attachment fails silently (no block, no message)
- Severity: Medium (user gets no feedback on a disallowed type)
- Route: /knowledge/wiki/doc/1 → Insert and format → File
- Actor: org owner
- Steps: 1) Insert and format → File → choose /workspace/streamline-qa/fixtures/qa-test.exe (14-byte MZ-header fixture). 2) Wait 10 s.
- Expected: Upload is refused with a visible message such as "Executable files (.exe) are not allowed" and no block is inserted. (Allowed list shown in the picker: .pdf .doc .docx .xls .xlsx .ppt .pptx .csv .txt .zip.)
- Actual: Nothing is inserted, no toast, no error text, no console message beyond the existing 409 from earlier. The user cannot tell whether the upload happened.
- Impact: Users think the upload is broken or retry endlessly; the rejection rule itself is not communicated.
- Likely code area: file attachment picker / media upload validation (client `accept` only, no user-facing error for disallowed MIME/extension).
- Suggested fix: Validate extension and MIME on the client before upload and show "Type not allowed: qa-test.exe. Allowed: pdf, doc(x), xls(x), ppt(x), csv, txt, zip." Mirror the server rule.
- Acceptance check: Choosing qa-test.exe shows the message above within 1 s; no block or request is created. valid-doc-0913.pdf still attaches (310 B).

## KB-B-015 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

`kb-spaces.controller.ts` `update` method returns `this.spaces.get(u, spaceId)` (full GET projection including `ownerName`). Spec `kb-space-write-response.spec.ts` covers update-returns-GET-projection. Frontend `space-sheet.tsx` sends `icon: values.icon?.trim() || null` on update.

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-015 | Space rename does not persist | PARTIAL | **Disagree.** Run A: FIXED *(observed in shared session)* — rename "QA1015R2 Space A" → "… A edited" persisted after navigation. Run B: PARTIAL — Edit sheet opens blank (KB-B-029); typing all three fields + Save → PATCH persisted after reload, but red "server sent data…" toast and sheet stayed open. Kept PARTIAL on Run B's own Edit→Save evidence. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-015: Editing a space name and clicking Save does not persist the change
- Severity: Medium
- Route: /knowledge/wiki/spaces → card "Edit" (also /knowledge/wiki/spaces/1 after reload)
- Actor: org owner (adityachalla01), space admin
- Steps: 1) Click "Edit" on "📚 QA1015 Space A". 2) Change Name to "QA1015 Space A edited". 3) Click "Save". 4) Reload /knowledge/wiki/spaces.
- Expected: Dialog closes, toast "Space updated", card shows "QA1015 Space A edited", "Updated just now".
- Actual: Dialog closes with no visible toast; after reload the name is still "QA1015 Space A" and the card still says "Updated 20m ago" (no change). Repeated twice with the same result. The space header (/spaces/1) also shows the old name.
- Impact: Users believe they renamed a space; names and descriptions cannot be corrected.
- Likely code area: space update mutation (PATCH) — payload probably sends `icon: ""`/null like KB-B-001, or the request is rejected and the error is swallowed.
- Suggested fix: Check the PATCH response in the network log; apply the same empty-icon normalisation as create; show an error toast on failure; invalidate the spaces query on success.
- Acceptance check: Rename → reload → new name shown and "Updated just now" changes; a forced failure shows an error toast and keeps the dialog open.

## KB-B-021 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

`useSetKbPageVisibility` in `pages.ts` uses `qc.setQueryData` to update the page cache on success, so the share dialog and header badge derive from the same cached page object.

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-021 | Share dialog stale after Public → Private | PARTIAL | **Disagree.** Run A: FIXED on doc/6 — checkmark, badge, and link row updated in same view (no reload); toast not caught. Run B: PARTIAL — toast "Visibility updated" and revoke work (anonymous 404); header badge changes ~1–2 s after toast; dialog active option unreliable (KB-B-010 / KB-B-034). Kept PARTIAL. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-021: Share dialog keeps showing "Public" checked and the header badge stale after switching to Private, even though "Visibility updated" toast appears
- Severity: Medium (access state shown to the owner is wrong right after a change)
- Route: /knowledge/wiki/doc/1 → "Share page" → "Private"
- Actor: org owner (adityachalla01)
- Steps: 1) With the page Public, open "Share page". 2) Click "Private — Only you". 3) Watch the dialog and the header badge for ~5 s.
- Expected: Checkmark moves to Private, header badge changes to "Private", and the toast matches.
- Actual: Toast "Visibility updated" appears, but the menu still checks "Public — Anyone with link" (share URL still listed) and the header badge still reads "Public". Only after a later page reload does the badge read "Private". The server did switch to Private (anonymous link returns 404 afterwards), so the client state is stale.
- Impact: Owner may think the page is still public (or re-click and toggle it back to Public).
- Likely code area: visibility mutation's onSuccess does not invalidate/update the page query used by the header badge and share menu (optimistic value not reverted/refreshed).
- Suggested fix: Update the cached page `visibility` on mutation success (or invalidate the page query) and derive both the header badge and the menu checkmark from that single value.
- Acceptance check: Public → Private: menu checkmark and header badge both show Private within 1 s of the toast, without reload; the share URL row disappears.

## KB-B-022 — VERIFIED IN CODE, PENDING_BROWSER_VERIFICATION

`page-comments.ts` uses `patchLoadedComments`/`appendCreatedComment`/`replaceComment` helpers to update the `InfiniteData` cache for all comment mutations (create/update/delete/resolve).

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-022 | Posted, edited and resolved comments do not appear until reload | PARTIAL | Run A: post listed within seconds + toast; Resolve → Resolved (1) at once; Edit→Save text confirmed only after next action/reload. Run B: NOT RECHECKED. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-022: Posted, edited and resolved comments do not appear in the Comments panel until the page is reloaded
- Severity: High (users re-post the same comment; edits look lost)
- Route: /knowledge/wiki/doc/1 → More options → Comments
- Actor: org owner (adityachalla01)
- Steps: 1) Open Comments. 2) Type "QA1015 R1 comment A" and click "Post comment". 3) Wait 5 s. 4) Click "Edit" on that comment, change the text to "... edited", click "Save", wait 5 s. 5) Click "Resolve". 6) Wait 5 s. 7) Reload and reopen Comments.
- Expected: After each action the list updates at once: the new comment appears, the edited text shows, the resolved comment moves to "Resolved (1)".
- Actual: After Post, the field clears but the new comment is not listed (it exists after a reload). After Save, the editor closes and the old text "QA1015 R1 comment A" stays on screen; after reload it reads "... edited" (saved). After Resolve, the card still shows as active with "Resolve" until reload. The server state is correct each time; only the panel is stale.
- Impact: Users re-post duplicates after Post, and re-edit or re-resolve believing the earlier action failed.
- Likely code area: comment mutations do not invalidate/refetch the comments query (or the list query key differs from the one the mutation writes to).
- Suggested fix: Invalidate the page-comments query on post/edit/resolve/delete success (or update the cache optimistically) and show the change in the panel immediately.
- Acceptance check: Post → the comment is listed at the bottom with no reload; Edit → the card shows the new text on Save; Resolve → it moves into "Resolved (n)" at once.
