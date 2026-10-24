# StreamlineOS: Not fixed and partially fixed issues (as of 24 Oct 2026)

Tested in the ADitay CAhala org (owner) on production at https://www.streamlineos.in. This list covers 7 of the 74 issues raised earlier and the 12 new issues from the two-sided chat test on 24 Oct.

| Group | Count | IDs |
|---|---|---|
| Not fixed (from the original 74) | 3 | DOC-004, BILL-005, RBAC-007 |
| Partially fixed (from the original 74) | 4 | ASKOS-001, CAL-007, ADM-011, RBAC-005 |
| New, not fixed (two-sided chat test) | 12 | CHAT2-01 to CHAT2-11, DLG-01 |

## 1. Not fixed (3)

| ID | Sev | Issue | Current behaviour (24 Oct) | Repro |
|---|---|---|---|---|
| DOC-004 | Medium | The "Load theirs" button in the document conflict banner does nothing | Two tabs edited the same doc, and tab 1 got a 409 and the conflict banner. Clicking "Load theirs" left the banner up and kept tab 1's local text, with no toast after more than 8 s. Only a page reload showed tab 2's version. It also failed on 23 Oct. | 1/1 |
| BILL-005 | Low | AI credits totals disagree by 0.01 | The last-30-days summary shows 22.69 credits. The by-model rows sum to 22.70 (22.22 + 0.29 + 0.19). The gap has moved from the by-feature table to the by-model table. | 1/1 |
| RBAC-007 | Low (needs triage) | A member with "No module access" sees org data on the dashboard | The test member had no module access but still saw the owner's Google- and Outlook-synced calendar events ("Calendar Ticket19 …" on 26, 27 and 30 Oct). They also saw HR widgets: Leave balance, Attendance with Web Clock-in, Payroll and Expenses. | 1/1 |

## 2. Partially fixed (4)

| ID | Sev | What's fixed | What's still wrong |
|---|---|---|---|
| ASKOS-001 | High | Ask OS finds a native event created for today. | Before that event existed, it said "You don't have any meetings scheduled for today" while the calendar showed 5 items that day. It skips synced and already-past events. It also mixes IST times with the browser's Los Angeles day. |
| CAL-007 | Low | UTC is no longer shown as the primary time. | In List View the second zone in brackets switches between Etc/UTC and Asia/Calcutta, so the user's own zone isn't shown consistently. |
| ADM-011 | Low | Directory now says "Person records for this org — not the same as team members." | Directory still shows 3 records while Users and Dashboard show 5. This may be by design and needs a product decision. |
| RBAC-005 | Low | Groups → Manage now has Members and Roles tabs. | In the Roles tab, the role combobox shows "No roles found", so roles can't be assigned to a group. |

## 3. New issues from the two-sided chat test (12, all not fixed)

| ID | Sev | Issue | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|
| CHAT2-03 | High | Deleted message text stays in the receiver's sidebar preview | A deletes their latest message | Preview clears or says "Message deleted" | B still sees the deleted text, which is a privacy leak | 1/1 |
| CHAT2-01 | Medium | Read receipt never becomes "Seen" | A sends a DM, B opens it, A waits 10 s and reloads | "Seen" or read ticks | Always "Delivered" | 2/2 |
| CHAT2-02 | Medium | An edit doesn't update the receiver's sidebar preview | A edits their latest message while B is on the chat list | Preview shows the new text | Old text stays for 8+ s | 1/1 |
| CHAT2-04 | Medium | Quote block keeps a deleted message's text | Reply quoting message X, then X is deleted | Quote shows "Original message deleted" | Original text, or "Unknown", is still shown | 2/2 |
| CHAT2-08 | Medium | Leaving a channel shows as a normal message, and the composer stays | B leaves `qa-test-channel` | A centred system line, and B loses the composer | A normal "left the channel" bubble, and B still has the composer | 1/1 |
| CHAT2-09 | Medium | A plain member sees "Archive chat" and "Invite People" | Member B opens channel details or the DM row menu | Admin-only actions are hidden | Both are visible | 1/1 |
| CHAT2-05 | Low | Reactions don't show who reacted | Hover over a reaction chip | Names of the people who reacted | Nothing | 3/3 |
| CHAT2-06 | Low | The new-message toast is generic | B receives a DM | Sender name and a snippet | "Direct message / Direct message" | 1/1 |
| CHAT2-07 | Low | "Mark as unread" has no visible effect | Conversation row menu → Mark as unread | Unread badge or bold row | No change after 6 s | 1/1 |
| CHAT2-10 | Low | Draft text carries across conversations | Type in a DM, switch to a channel, reload | Each conversation keeps its own draft | Text like "QA Test" appears in other composers | Seen twice, no clean repro |
| CHAT2-11 | Low | A stray "New Messages" divider appears above your own message | A sends a message | No divider for your own message | The divider appears | 1/1 |
| DLG-01 | Low | The Delegations "Granted" tab doesn't load on the first click | /settings/delegations → Granted | The Granted list shows | The Received content stays until a second click | 1/1 |

## Smaller observations (not yet logged as bugs)

- The dashboard greeting said Friday 23 Oct while its clock showed SAT 24 Oct.
- Moving mail to Trash showed an error toast even though the move worked.
- Ask OS showed a "Degraded" label on a correct answer.
