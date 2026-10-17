# Knowledge Base — Round 1 UX notes (QA1015)

Derived from BUGS.md (KB-B-001..028) plus session notes. Routes are under `/knowledge/wiki` unless noted.

## Must change

- **Optional space fields break create with raw schema text** (KB-B-001, KB-B-026): Leaving Icon or Description empty sends `null` and shows toasts like `icon: Invalid input: expected string, received null` / `description: Invalid input: expected string, received null`. Optional fields must omit/empty-string and show friendly field errors.
- **Space create false failure leaves the sheet open** (KB-B-002): Server saves the space but the client toasts “The server sent data this screen does not understand…”, inviting duplicate Creates. Close the sheet and refetch on 2xx.
- **“New page” from a space drops the space** (KB-B-003): Pages land at Wiki root with breadcrumb “Wiki › Untitled”; space stays at 0 pages until a manual Page info → Space move.
- **Slash menu swallows typing** (KB-B-005): After `/`, filter keystrokes are lost; Escape is required to type again. Keyboard block insertion is unusable.
- **Exe rejection feedback is wrong or missing** (KB-B-007 + note): Choosing `.exe` either fails silently or surfaces a raw MIME toast (`application/x-msdownload`). Show a clear “executables not allowed” message with the allowed list; never show raw MIME.
- **Version history does not keep history; restore has no success toast** (KB-B-009 + note): Only “Version 1 · Current” appears after many autosaves/publish, so Restore cannot be exercised. After a real restore, show a success toast.
- **Long search query crashes the whole Wiki** (KB-B-012): Pasting ~300 characters yields a full-page “Something went wrong” (API max 200). Cap the input and keep the sidebar alive.
- **Space rename does not persist** (KB-B-015): Edit → Save closes with no toast; name unchanged after reload.
- **Archived space Restore does nothing** (KB-B-016): No toast, space stays Archived; Active list empty. Copy promises restore.
- **No space delete control** (note): Spaces only offer Archive and Restore. There is no permanent delete for a space (including archived QA1015 Space A).
- **Double-click “New page” creates duplicates** (KB-B-018): Wiki home lacks the in-flight disable used on space detail; two Untitled docs appear.
- **Imported Markdown and template “Use” show empty editors** (KB-B-019, KB-B-024): Title from filename / page name, Words count non-zero, body is “Start writing…”. Recent imports stays “No imports yet”.
- **Comments panel stays stale; delete has no confirmation; no loading state** (KB-B-022, KB-B-023 + notes): Post/Edit/Resolve need a full reload to appear; delete has no confirm dialog; opening Comments shows an empty list with no spinner for ~10–15 s.
- **“Save as template” false failure then crashes Templates** (KB-B-025): 201 on save but toast “Failed to save template”; Saved tab / Templates view becomes “Something went wrong”. Retry hits 409.
- **Trash Purge fails for pages with content** (KB-B-028): Bulk and single purge 500 for FAQ, QA1015-import-xss, QA1015 Article One; only empty Untitled pages purge. No success toast on the ones that do succeed.
- **Move does not move between spaces** (note / coverage intent): “Move” only reparents under a page, not between spaces. Space assignment still requires Page info → Space.
- **Skeleton / load times of 5–15 s** (KB-B-017 + note): Space detail, editor, history, trash, search, and comments show long skeletons or empty states; users re-click and create duplicates.

## Good to have

- **Page Owner blank in Page info** (KB-B-004): Combobox shows “Select owner…” while header/space show the creator.
- **Duplicate image upload shows failure then success** (KB-B-006): In-flight 409 mapped to “Upload failed… matching request already in progress”; image still inserts.
- **Inserted images render huge with no resize** (KB-B-008): 64×64 PNG becomes ~662×662; tall empty placeholder before load; no resize/align controls.
- **Share dialog vs header badge mismatch** (KB-B-010, KB-B-021): Dialog can show Private while badge says Team; after Public → Private, toast says updated but menu/badge stay Public until reload.
- **Public share images/PDF broken for anonymous viewers** (KB-B-020): Text OK; images show broken alt; PDF chip has no download. Media URLs are auth-only.
- **Search is whole-word only** (KB-B-013): “QA101” misses “QA1015…”; empty state does not explain prefix behaviour.
- **Search snippet strips angle brackets** (KB-B-014): Match on `<img …>` shows truncated snippet; XSS-safe but incomplete.
- **Ask KB answer quality and Sources** (KB-B-027): Vague answer; Sources include empty import/template pages and duplicate the target page.
