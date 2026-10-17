# Knowledge Base — Round 2 test data (merged runs A + B, QA1015R2)

All round-2 data uses the QA1015R2 prefix. Share links were created and revoked; no emails were sent (no member invites). Both runs shared one browser session and the same account — cleanup deferred until after both finished.

## Spaces
| Space | ID | State | Notes |
|---|---|---|---|
| QA1015R2 Space A edited | 4 | Active | Created by Run B as "QA1015R2 Space A" (desc "QA1015R2 description A", 📚, Internal); renamed to "… A edited". Holds Nested Parent (doc/6). |
| QA1015R2 Space D | 5 | Active | Run A: Edit sheet opened; a rename to "… D renamed" was typed but Save was not confirmed. Verify name; expected "QA1015R2 Space D" (desc "QA1015R2 desc D"). |
| QA1015R2 Space E | 6 | Active | Run A: space page crashes (KB-B-032). Holds doc/7. desc "QA1015R2 desc F". |
| QA1015 Space A / B / C (round 1) | 1 / 2 / 3 | A archived / B, C active | Round-1 data; not used in round 2. |

No space delete exists in the UI (archive only).

## Pages (doc IDs)
| Doc | Title | State | Notes |
|---|---|---|---|
| doc/6 | QA1015R2 Nested Parent | Published, Private, active | Shared-session hub. In space "QA1015R2 Space A edited". Has inserted image, bullet with stray "/", slash_input. Share revoked; currently Private. |
| doc/7 | Untitled | Draft, active, in Space E | Probe text: `<img … onerror>`, `<script>…`, stray "javascript:alert(3)" text. |
| doc/8 | Untitled | In Trash | ~11 KB body, inserted image, comment "QA1015R2 comment A" (edited, resolved); was moved under doc/6. Purge fails (KB-B-028). |
| doc/9 | Untitled | Purged | Empty; purge succeeded (Run A). |
| doc/10 | QA1015R2-import-xss | Active (root) | Import of QA1015R2-import-xss.md (title from filename). Body not rendered. |
| FAQ, QA1015-import-xss, QA1015 Article One | round-1 | In Trash | Purge fails (500). Round-1 leftovers. |

## Templates
- Nothing created this round (Use failed; Saved crashed). Round-1 "QA1015 Template R1" may exist in storage.

## Comments
- doc/8 "QA1015R2 comment A" (edited to "… edited", resolved) — lives on the trashed doc/8.

## Share
- doc/6 was made Public and revoked (both runs); currently Private. Token not recorded.

## Files (box)
- /workspace/streamline-qa/generated-qa1015/QA1015R2-import-xss.md (Run A import fixture path)
- /workspace/streamline-qa/generated-qa1015r2/QA1015R2-import-xss.md (Run B fixture path; may be the same content)
- Shell temp files were removed.

## Leftover cleanup (parent / owner action)

Do this after round-2 reporting is closed (do not archive hubs while a recheck is mid-flight):

1. **Trash then purge (if empty) / leave if purge blocked:**
   - doc/7 Untitled (Space E) → Trash
   - doc/10 QA1015R2-import-xss → Trash
   - doc/6 QA1015R2 Nested Parent → Trash when no longer needed for re-verify
2. **Already in Trash (purge blocked by KB-B-028 for content pages):**
   - doc/8 Untitled (round-2 content page)
   - FAQ, QA1015-import-xss, QA1015 Article One (round-1)
3. **Archive spaces (no hard delete in UI):**
   - QA1015R2 Space A edited (id 4)
   - QA1015R2 Space D (id 5) — first verify name was not accidentally renamed
   - QA1015R2 Space E (id 6) — may need KB-B-032 fixed before the space UI is usable; archive from the list card if detail crashes
4. **Done already:** doc/9 purged; doc/6 share revoked (Private).
5. **Blocked cleanup:** no space delete; purge of pages with content fails (KB-B-028).

### Cleanup status summary
- Done: doc/9 purged; share revoked on doc/6.
- Leftover active: doc/6, doc/7, doc/10; Spaces A edited / D / E.
- Leftover trash (purge blocked): doc/8 + three round-1 rows.
- Blocked: space hard-delete; content-page purge.
