# UX notes — Org Settings, Round 3 (2026-10-15)

Bugs are in BUGS.md. Items that overlap a bug cite the ID.

## Must change

1. **Audit trail is not trustworthy as an audit trail.** Group create and token create/revoke are missing (ORG-B-017); archives read "Updated" (ORG-B-018); settings rows do not say what changed (ORG-B-020); the footer total is wrong (ORG-B-019). Fix these before anything else on this page.
2. **Silent validation.** Team capacity -3 or 2.5 leaves Save doing nothing visible (ORG-B-025). Use the app's own inline message and noValidate on the form.
3. **Save feedback.** Business Hours closes at once and shows the old value for about 9 s (ORG-B-026). Keep the form open with "Saving…" until the server answers, then toast.
4. **Enter submits brand settings.** Pressing Enter in a colour hex field saves the whole branding form (ORG-B-021). Require the explicit Save button.
5. **Pickers before data.** Branch and Department show "No branch" or "Loading options…" and accept a click; a department can be saved unlinked (ORG-B-024). Disable the select until its options load.
6. **Colour fields disagree.** Secondary shows blank in view, and edit shows a #0b1220 picker with an empty hex (ORG-B-022, extends ORG-B-005).
7. **Raw keys on Billing.** "hrCandidates" and "hrJobPostings" appear in Plan Usage; the current plan card still says "Upgrade" (ORG-B-028).
8. **Duplicate code message.** The 409 for cost centres now shows a toast with a raw "code:" prefix and no inline error on the Code field (ORG-B-013).
9. **Permission groups.** Still no Delete, Archive or create-role control (ORG-B-009). Each test group is permanent until an admin removes it.
10. **Timezone everywhere.** Audit Log, PAT expiry default and other times use UTC while the org is Asia/Calcutta (ORG-B-016). Label the zone at least.

## Good to have

1. **Notification toggles** save silently. Show a small "Saved" confirmation per toggle, as Quiet hours does not show one either.
2. **Consistent labels.** Audit labels mix styles: "Team Created", "Member Role Changed", "Org — CostCenter — Created", "Settings — Updated". Use one pattern (object + verb, sentence case).
3. **Role names** are title-cased from identifiers: "Crm Module Admin", "Hr Module Member" (carried from round 1). Use "CRM Module Admin" and "HR Module Member".
4. **Mobile header at 400% zoom.** The trial banner and header take most of the first screen; the "Upgrade" button is the only action visible (ORG-B-023 covers the overlap).
5. **Keyboard.** Tab order through the header and sidebar is logical and the focus ring is visible. Account-menu items are not exposed as menu items to assistive tech (carried from round 1).
6. **Plan copy.** "Trial ends 26 Oct 2026" on Billing and "Your trial ends in 11 days" on the banner should show the same date.
7. **Cost centre duplicate** needs a fast response; a 20 s wait with no feedback looks like a hang (ORG-B-013/026).
8. **Branding preview** updates live as colours are typed (good); it still shows a grey placeholder for the logo area when a logo is set (not verified with a valid logo; not saved).
