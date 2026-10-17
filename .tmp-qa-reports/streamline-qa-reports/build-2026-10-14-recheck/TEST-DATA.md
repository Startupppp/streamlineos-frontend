# Test data created in build-2026-10-14 recheck (prefix RC1014)
Format: item | where | created | cleanup status
- QAB-135 "RC1014 attach types" (project 7, Owner qaown1012b) | ticket | created via Create issue | TO DELETE at cleanup. Attachments on it: valid-image-0913.png, .jpg, .gif, .webp, valid-doc-0913.pdf, and multi-pdf-01..10-0913.pdf (several PDF uploads were interrupted by tab crashes; persisted count varies). Storage objects orphaned (no UI to delete).
- "RC1014 DBLCLICK issue" ticket (B-001 recheck, one ticket, project 7) | board | created by double-click test | TO DELETE at cleanup.
- Portfolio "RC1014 DBL portfolio" (B-014 recheck) | /build/portfolios | created by double-click test | TO DELETE at cleanup.
- Program "RC1014 DBL program" (B-015 recheck) | /build/programs | created | TO DELETE at cleanup.
- Epic ticket "RC1014 epic dbl" (B-043 recheck, one POST) | project 7 epics | created | TO DELETE at cleanup.
- Milestone "RC1014 milestone" (B-044 recheck, Oct 30 2026) | /build/7/milestones | created | TO DELETE at cleanup.
- Release "RC1014 release dbl" 2.0.0-rc1014 (B-045 recheck) | /build/7/releases | created | TO DELETE at cleanup.
- Release "RC1014 release ready" 6.0.1014 (B-065 recheck; Ready/Critical after edit) | /build/7/releases | created | TO DELETE at cleanup.
- Project update "RC1014 update status probe" (B-039 recheck) | /build/7/updates | created | TO DELETE at cleanup (Delete control on the row).
- Board move: "RC1014 DBLCLICK issue" moved to In review (status change via keyboard) | board | — | cleanup with ticket.
- Comment "RC1014 DBL comment" on QAB-135 (B-003 recheck) | QAB-135 | created | removed with ticket.
Cleanup done: RC1014 release dbl (2.0.0-rc1014) deleted during B-048 test.
RC1014 release ready (6.0.1014, /build/7/releases): release notes set to 10,000 "L" characters during B-066 test; delete with the release at cleanup.
Relation QAB-135 Blocks QAB-136 created during B-070 test (RC1014 records; removed with tickets at cleanup).
- Milestone "RC1014 milestone" renamed to "RC1014 milestone edit" (owner-session PATCH 200 during the B-085 recheck; the member Edit is now hidden). Delete with the milestone at cleanup.
- Release "RC1014 release ready" renamed to "RC1014 release ready edit" (6.0.1014) during the B-085 owner-session check (PATCH 200). Delete with the release at cleanup.
- Approval "R11 milestone approval 1013 run3" (member qamem1012c, B-084 recheck) decided Approve; status now Approved. Test record, not deleted.
- Project 7 budget set to 9999999999 then 12.35 during the B-050/B-051/B-052 recheck (owner). Currently 12.35; reset to Not set at cleanup if wanted.
- RC1014 ticket "RC1014 B-002 ..." (title with U+202E/U+200B test chars, owner) created by the B-002 recheck. Delete with ticket cleanup.
- Wizard "RC1014 wizard" was filled in but NOT created (B-012/NEW-26/NEW-11 recheck). Nothing to clean up.
- Epic "RC1014 epic dbl" now has "RC1014 DBLCLICK issue" linked (B-064/B-063 recheck). Unlink at cleanup.
- Release "RC1014 release ready edit" notes now `"><img src=x onerror=alert(1)> R6 XSS probe` (B-068 recheck), replacing the 10,000 characters.
