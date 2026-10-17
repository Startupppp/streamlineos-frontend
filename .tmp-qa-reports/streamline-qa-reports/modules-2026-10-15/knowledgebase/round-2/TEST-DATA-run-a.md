# Knowledge Base — Round 2 test data (QA1015R2)

All round-2 data uses the QA1015R2 prefix. Share links were created and revoked; no emails were sent (no member invites).

## Spaces
| Space | ID | State | Notes |
|---|---|---|---|
| QA1015R2 Space D | 5 | Active | Edit sheet opened; a rename to "QA1015R2 Space D renamed" was typed but Save was not confirmed (cancel/reopen call timed out). Verify name; expected "QA1015R2 Space D". |
| QA1015R2 Space E | 6 | Active | Space page crashes (KB-B-031). Holds doc/7 (probe text). |
| QA1015R2 Space A edited | 4 | Active | Renamed (observed). Holds Nested Parent (doc/6) and, after move, doc/8 (now in trash). |
| QA1015 Space A / B / C (round 1) | 1 / 2 / 3 | A archived / B, C active | Round-1 data, not touched in round 2 except B and C not used. |

No space delete exists in the UI. Archive is the closest cleanup; not done (to keep spaces for re-test). Parent action for the owner: archive QA1015R2 Space D, E and A edited when done.

## Pages (doc IDs)
| Doc | Title | State | Notes |
|---|---|---|---|
| doc/6 | QA1015R2 Nested Parent | Published, Private, active | Shared-session hub (other driver edited). Has inserted image, bullet with stray "/". Parent of doc/8 before trash. |
| doc/7 | Untitled | Draft, active, in Space E | Probe text: `<img src=x onerror=alert(1)>`, `<script>alert(2)</script>`, stray "javascript:alert(3)" text. Trash it. |
| doc/8 | Untitled | In Trash ("9m ago") | ~11 KB body, inserted image, comment, moved under doc/6. Purge fails (KB-B-028). Leave in trash; report. |
| doc/9 | Untitled | Purged | Empty; purge succeeded. |
| doc/10 | QA1015R2-import-xss | Active (root) | Import of QA1015R2-import-xss.md (title from filename). Trash it. |
| FAQ, QA1015-import-xss, QA1015 Article One | round-1 | In Trash | Purge fails (500). Round-1 data. |

## Templates
- Nothing created by this round (Use failed; Saved crashed). Round-1 "QA1015 Template R1" may exist in storage.

## Comments
- doc/8 "QA1015R2 comment A" (edited to "... edited", resolved) — lives on the trashed doc/8.

## Share
- doc/6 was made Public and revoked twice; currently Private. Token not recorded.

## Files (box)
- /workspace/streamline-qa/generated-qa1015/QA1015R2-import-xss.md (import fixture, R2 prefix)
- Shell temp files were removed.

## Cleanup status
- Done: doc/9 purged. Share revoked on doc/6.
- Not done: doc/7 and doc/10 still active (should go to trash, then purge if empty); doc/6 hub still active; doc/8 stuck in trash; Space D/E/A edited still active; Space D rename unverified.
- Blocked: no space delete; purge of content pages fails (KB-B-028).
