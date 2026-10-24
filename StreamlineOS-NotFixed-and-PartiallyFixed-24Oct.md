# StreamlineOS: backend still pending (24 Oct 2026)

Frontend items from this list were fixed and checked locally on 24 Oct. What remains needs backend work.

| ID | Sev | Why it is still backend |
|---|---|---|
| ASKOS-001 | High | `getMyCalendarEvents` builds the day from the actor timezone and `eventsAggregate.getEvents`. It still skips synced and already-past items, and it can mix IST with the browser's day. The UI only renders that answer. |
| RBAC-007 | Low | A member with no module access still received the owner's Google- and Outlook-synced events. Dashboard widgets for leave, attendance clock-in, payroll, expenses, and upcoming events are now permission-gated. The leftover leak is the calendar read returning another member's synced events. |
| CHAT2-01 | Medium | Read receipts stay "Delivered". The message UI has no peer read state to turn that into "Seen". |

## Also backend, not a separate ticket

- Ask OS can label a correct answer "Degraded". That label follows the server evidence status.

## Checked and removed (frontend)

Verified in the app or by unit tests on 24 Oct, then removed from this list:

- DOC-004 — Load theirs closes the confirm dialog, refetches, and toasts on success or failure
- BILL-005 — credits headline uses the usage total
- CAL-007 — list times use one zone label (`Asia/Kolkata`, secondary `UTC`)
- DLG-01 — Granted tab shows the granted list on the first click
- RBAC-005 — Groups → Manage → Roles lists org roles (Accounting Module Admin and the rest), not "No roles found"
- ADM-011 — directory copy already says person records are not team members; the 3 vs 5 count is that split, not a backend defect
- CHAT2-02, CHAT2-03, CHAT2-04, CHAT2-05, CHAT2-06, CHAT2-07, CHAT2-08, CHAT2-09, CHAT2-10, CHAT2-11 — sidebar preview, deleted quotes, reaction names, DM toast, mark-unread, drafts, own-message divider, system leave line, and admin-only archive/invite
- Dashboard greeting date matches the org-timezone clock
