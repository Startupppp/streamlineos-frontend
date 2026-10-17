# New bugs and regressions, build recheck 14 Oct 2026 (RC1014)

| ID | Severity | Where | Observed | Steps / evidence |
|---|---|---|---|---|
| NEW-R1 | Low | /build/7/milestones, Actions menu (member qamem1012c) | The Actions menu opens empty for a member: no Edit, no Delete, no message. This is the B-085 fix (Edit hidden), but it leaves an empty menu. | Open "Actions for RC1014 milestone edit" as the member: menu has no items. |
| NEW-R2 | Low | Sign-in, email step (qamem1012c) | First Continue after typing the email returned to the email step with ?email= in the URL and no code sent. Second Continue sent the code. | Fill email, click Continue (exact). Page shows email step again; repeat once and the "Verification code" step appears. |
| NEW-R3 | Medium | /build/7/approvals (member Decide) | Row status does not update after Decide (see B-076). Also the Approver column reads "Unknown" for the member's own approval row. | Member Decide (Approve): row still "Escalated" until reload; after reload "Approved", approver shown "Unknown". |
| NEW-R4 | Low | Board, keyboard drag (owner) | Counts stay stale after a keyboard move (B-028 still present). Listed here because the B-028 fix was reported as done. | Space, ArrowRight, Space on QAB-135: counts Todo 1 / In progress 1 until reload. |
