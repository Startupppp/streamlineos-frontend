# Knowledge Base — Round 1 test data / cleanup state (QA1015)

As left after round-1 testing. Screenshots: `../screenshots/`.

## Trash

| Item | State |
|------|--------|
| doc/1 … doc/5 | In Trash |
| FAQ | In Trash; **cannot purge** (KB-B-028 → 500) |
| QA1015-import-xss | In Trash; **cannot purge** (KB-B-028 → 500) |
| QA1015 Article One | In Trash; **cannot purge** (KB-B-028 → 500) |
| Empty Untitled pages (from double-create) | Purged successfully earlier in the run |

Comment from the session sits on **doc/1** (still in Trash).

## Spaces

| Space | Audience | State | Notes |
|-------|----------|--------|--------|
| QA1015 Space A | Internal | **Archived** | No delete control; Archive/Restore only. Restore UI no-op (KB-B-016). |
| QA1015 Space B | Internal | **Active** | Still present |
| QA1015 Space C | Public | **Active** | Still present |

## Templates

- **QA1015 Template R1**: Probably stored (POST returned 201 despite client “Failed to save template”). Opening Templates / Saved tab crashes the Wiki view (KB-B-025). Do not open Templates until the content schema is fixed, or clear the bad template via API/DB.

## Cleanup blockers

1. Purge of contentful trash rows fails with 500 (KB-B-028) — FAQ, QA1015-import-xss, QA1015 Article One stuck in Trash.
2. No space delete — archived Space A can only stay archived or (once fixed) be restored.
3. Templates page crash blocks UI cleanup of QA1015 Template R1.

## Screenshots

See `../screenshots/` (includes e.g. KB-B-020 public share broken images, KB-B-025 Templates Saved tab crash, and other round-1 captures).
