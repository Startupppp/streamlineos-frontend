# StreamlineOS: Not fixed and partially fixed issues (as of 24 Oct 2026)

Tested in the ADitay CAhala org (owner) on production at https://www.streamlineos.in, with FE patches re-verified locally on 24 Oct where noted. This list covers remaining open items from the earlier 74 plus the two-sided chat test.

| Group | Count | IDs |
|---|---|---|
| Not fixed (from the original 74) | 2 | DOC-004, RBAC-007 |
| Partially fixed (from the original 74) | 3 | ASKOS-001, ADM-011, RBAC-005 |
| New, not fixed (two-sided chat test) | 1 | CHAT2-01 |
| FE patched — pending two-sided retest | 10 | CHAT2-02–CHAT2-11 |
| Smaller observations | 2 | Mail trash toast; Ask OS "Degraded" |

**Removed after 100% local verify (24 Oct):** BILL-005, CAL-007, DLG-01, dashboard greeting/clock day mismatch.

## 1. Not fixed (2)

| ID | Sev | Issue | Current behaviour (24 Oct) | Repro |
|---|---|---|---|---|
| DOC-004 | Medium | The "Load theirs" button in the document conflict banner does nothing | Two tabs edited the same doc, and tab 1 got a 409 and the conflict banner. Clicking "Load theirs" left the banner up and kept tab 1's local text, with no toast after more than 8 s. Only a page reload showed tab 2's version. It also failed on 23 Oct. | 1/1 |
| RBAC-007 | Low (needs triage) | A member with "No module access" sees org data on the dashboard | The test member had no module access but still saw the owner's Google- and Outlook-synced calendar events ("Calendar Ticket19 …" on 26, 27 and 30 Oct). They also saw HR widgets: Leave balance, Attendance with Web Clock-in, Payroll and Expenses. FE now gates Leave / Upcoming / Clock-in on permissions; remaining event leakage may be API/backend. | 1/1 |

## 2. Partially fixed (3)

| ID | Sev | What's fixed | What's still wrong |
|---|---|---|---|
| ASKOS-001 | High | Ask OS finds a native event created for today. | Before that event existed, it said "You don't have any meetings scheduled for today" while the calendar showed 5 items that day. It skips synced and already-past events. It also mixes IST times with the browser's Los Angeles day. Backend/tooling. |
| ADM-011 | Low | Directory now says "Person records for this org — not the same as team members." | Directory still shows 3 records while Users and Dashboard show 5. This may be by design and needs a product decision. |
| RBAC-005 | Low | Groups → Manage now has Members and Roles tabs. Role search shows loading/error instead of an immediate empty state. | Still needs a live check that roles appear for an admin; if the API returns none, assignment stays blocked. |

## 3. New issues from the two-sided chat test

### Still open (needs backend or two-sided proof)

| ID | Sev | Issue | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|
| CHAT2-01 | Medium | Read receipt never becomes "Seen" | A sends a DM, B opens it, A waits 10 s and reloads | "Seen" or read ticks | Always "Delivered" | 2/2 |

### FE patched — pending two-sided retest (do not treat as closed until re-run)

| ID | Sev | Issue | FE change (local) |
|---|---|---|---|
| CHAT2-03 | High | Deleted message text stays in the receiver's sidebar preview | Inactive-tab delete now calls `patchLastMessageAfterDelete` |
| CHAT2-02 | Medium | An edit doesn't update the receiver's sidebar preview | `patchLastMessageIfLatest` on edit (realtime + notifications + optimistic) |
| CHAT2-04 | Medium | Quote block keeps a deleted message's text | Quote UI shows "Original message deleted" |
| CHAT2-08 | Medium | Leaving a channel shows as a normal message, and the composer stays | System line + hide composer when not a member |
| CHAT2-09 | Medium | A plain member sees "Archive chat" and "Invite People" | Admin-gated; unit tests pass |
| CHAT2-05 | Low | Reactions don't show who reacted | Reaction chip tooltips with member names |
| CHAT2-06 | Low | The new-message toast is generic | DM toast uses partner name + snippet |
| CHAT2-07 | Low | "Mark as unread" has no visible effect | Suppress auto mark-read after mark-unread; unit tests pass |
| CHAT2-10 | Low | Draft text carries across conversations | Composer resets on channel/`draftKey` change |
| CHAT2-11 | Low | A stray "New Messages" divider appears above your own message | Skip divider when first unread is from self |

## Smaller observations (not yet logged as bugs)

- Moving mail to Trash showed an error toast even though the move worked.
- Ask OS showed a "Degraded" label on a correct answer.
