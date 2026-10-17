# HRMS QA Round 2 — UX (2026-10-15)

## Must change
1. Leave form copy contradicts the rest: form says "adityachalla01 approves their own leave as the organisation owner", and the pending card says "You are the approver — decide in Action Center" on the same owner's own request. Pick one rule (see HRM-B-010).
2. Over-balance guidance contradicts itself: note says "You can still submit ... may affect LOP", server blocks with "Insufficient leave balance", and 13 days says "cannot exceed 12 days" (HRM-B-011).
3. Silent failures on overlap and file uploads (HRM-B-009, HRM-B-015, HRM-B-016, HRM-B-018): a visible message is required for every rejected submit.
4. Asset row: "Retire asset" still sits directly next to "Edit asset" and "Assign Employee" (round-1 UX #2 still open).
5. Joining date default is yesterday (HRM-B-012).

## Good to have
1. Assign-asset picker and resignation pickers still omit pending-invite employees (round-1 GTH #1 still open).
2. Name fields reject digits; the hint should state it up front (round-1 GTH #2). Test names had to avoid digits.
3. Directory search takes ~2.5–3.8 s to update and shows no loading state; add a spinner or debounce feedback.
4. Directory status filter has only All / Active / Inactive; "Pending invite" cannot be filtered although the card exists.
5. Onboarding Personal: first-name field accepts 300 characters with no maxLength; cap input at 100 and show the counter.
6. Department save completes with no progress hint beyond "Saving…" for ~5 s.
7. Document list shows the file name, not the Document Name (HRM-B-017).
8. Expense and leave dialogs close after success, but failures leave the sheet with no context; keep the typed values and show the error next to the field.
9. Holiday add/duplicate message is good; keep the same pattern for other masters.
10. Approved leave on own request shows no "approved by you" warning; consider showing the approver name.
