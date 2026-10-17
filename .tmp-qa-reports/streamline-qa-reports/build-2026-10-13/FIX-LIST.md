# StreamlineOS Build: bugs to fix (13 Oct 2026)
Full steps and evidence for each ID are in BUILD-BUGS.md. Left off this list because they did not reproduce in round 11: B-018, B-021, B-026, B-032 (crash part), B-058, B-067, B-078.

## Critical
- B-013 / B-016: attaching any image (PNG, JPEG, GIF, WebP) breaks the ticket page (storage/download returns 500).

## High
- B-024: PDF attachments can't be opened or downloaded (500).
- B-001, B-014, B-015, B-043, B-044, B-045: double-click on Create makes duplicate tickets, portfolios, programs, epics, milestones and releases.
- B-027: dragging a card into an empty column gives a 409.
- B-037: reordering a card within a column gives a 409.
- B-039: posting one project update breaks the Updates page.
- B-065: release Readiness and Risk Level are not saved.
- B-084: an assigned member approver has no Decide control.

## Medium
- B-003: double-click on Post comment posts it twice.
- B-004: ticket detail controls have no accessible names.
- B-005: a search over 255 characters breaks the board.
- B-007, B-074: a name made only of spaces is saved (project, portfolio, program).
- B-008, B-019: the timer's Stop, or double-clicking Save, loses the logged time.
- B-010: CSV import accepts story points above 100.
- B-011: project Calendar shows no Build tickets.
- B-022: the Join button on the invite banner does nothing.
- B-025, B-034, B-035: sort and ordering options are ignored, and the board Columns option is ignored.
- B-028: the board stays stale after a move.
- B-029: at 768 px the filter bar is off-screen.
- B-030: the Files page shows "Project error" for the owner.
- B-031: a member can upload to storage through a hidden input.
- B-033: the member's "Add ticket due date" option does nothing.
- B-042: the Agile reports link is a 404.
- B-046: a 23-digit budget gives a 500.
- B-047: Triage Decline always fails.
- B-048: release Delete opens Edit underneath it.
- B-049: duplicate release versions are allowed.
- B-056: the approval picker can't find new tickets.
- B-059, B-060: at 375 px, the release notes editor and the ticket action row overflow.
- B-061: the owner can decide another person's approval (confirm whether intended).
- B-062: the epic card doesn't refresh after save.
- B-066: 10,000 characters of release notes pass the counter but the server rejects them.
- B-070: Blocks and Duplicate-of links are not inverted on the other ticket.
- B-085: members see Edit, but Save fails with "Missing permission".

## Low
- B-002: bidi and zero-width characters are accepted in titles.
- B-006: `%` and `_` act as wildcards in search.
- B-009: the Log time link is a dead end.
- B-012: wizard step 7 repeats step 6's text.
- B-017: a 0-byte file gives no message.
- B-020: the ticket heading sticks on "Loading...".
- B-023: Back drops the Create dialog's title.
- NEW-06: title limit is 200 in Create vs 500 on detail.
- NEW-10: the scope switcher shows "Organization".
- NEW-11: the project key is silently rewritten.
- NEW-26: the name error stays after the name is fixed.
- NEW-27: .exe in the image input gives no message.
- B-036: the Priority filter is dropped after navigating away.
- B-038: at 375 px the ticket sheet stays half-loaded.
- B-040, B-041: long text overflows the sidebar and Triage.
- B-050 to B-053: budget messages, rounding and "₹1KCr" label; version rule.
- B-054: Delegate to the requester gives no message.
- B-055: Escalate keeps Level 1.
- B-057: double-click sends a second PATCH.
- B-063: an epic can be Done with open items.
- B-064: the epic Link picker lists only stories.
- B-068: the release preview shows escaped HTML.
- B-069: timeline bars can't be dragged.
- B-071: deleting a parent gives no warning about its children.
- B-072: the parent picker offers the ticket's own child.
- B-073: Add subtask can't attach an existing ticket.
- B-075, B-076: lists don't refresh after create, delete or decision.
- B-077: past approval due date accepted; inconsistent date format.
- B-079: links added in Create can't be removed.
- B-080: the Timeline month label is off by one.
- B-081: the Sub-issues toggle has no effect.
- B-082: parent and link removals leave no history entry.
- B-083: at 375 px, "Completed" is cut off in Statuses.
