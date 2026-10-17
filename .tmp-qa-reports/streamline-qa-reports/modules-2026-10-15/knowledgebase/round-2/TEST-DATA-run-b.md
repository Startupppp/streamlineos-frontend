# Knowledge Base — Round 2 test data, run B (QA1015R2)

Prefix for all test data created by run B: `QA1015R2`. Share links and codes are not recorded here.

## Created by run B
| Item | Type | State at end of run B | Cleanup status |
|------|------|-----------------------|----------------|
| QA1015R2 Space A → renamed "QA1015R2 Space A edited" (desc "QA1015R2 description A", icon 📚, Internal) | Space | Active, 1 page, 1 member | Not archived yet (see cleanup note) |
| QA1015R2 Nested Parent (doc/6) | Page | Published, Private (share revoked), in space "QA1015R2 Space A edited", has one stray slash node and one image (662 px) and one bullet | Not moved to trash yet (see cleanup note) |
| Image upload from valid-image-0913.png | Inline image in doc/6 | Present | Goes with doc/6 |
| QA1015R2-import-xss.md | Local fixture only | Not imported | Fixture at /workspace/streamline-qa/generated-qa1015r2/QA1015R2-import-xss.md |

## Created by run A (same account; NOT run B's data — listed so the parent can reconcile)
- Spaces "QA1015R2 Space D" (desc "QA1015R2 desc D"), "QA1015R2 Space E" (desc "QA1015R2 desc F"), with pages doc/7 (Untitled in Space E) and others.
- Untitled pages doc/7, doc/8, doc/9 and additional Untitled pages in the sidebar.

## Pre-existing round-1 data (not touched by run B)
- Trash: FAQ, QA1015-import-xss, QA1015 Article One (purge fails per KB-B-028).
- Spaces: "QA1015 Space B" (Internal), "QA1015 Space C" (Public), "QA1015 Space A" (archived, desc contains `<img onerror>` text).

## Cleanup
- Deferred by run B: doc/6 and "QA1015R2 Space A edited" are also being used by run A (its BUGS.md cites doc/6). Archiving the space or trashing doc/6 now would break run A's active checks. Parent should run cleanup after run A finishes: (1) Archive "QA1015R2 Space A edited" (2) Move doc/6 "QA1015R2 Nested Parent" to Trash (3) Archive run A's QA1015R2 Space D/E and trash their Untitled pages.
- No hard delete exists for spaces in the UI (archive only). Pages can go to trash; purge of pages with content is blocked by KB-B-028 (round 1).
