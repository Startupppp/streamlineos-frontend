# RBAC round 1 - UX notes (2026-10-15)

Not bugs by themselves; for the design review. Ordered by how much they confuse a user.

1. **Viewer is a module preset, not an org role.** The Role dropdown in Invite User offers only Member and Org Admin. "Viewer" is a Module access preset that clears every grant. The task asked for "the lowest/viewer role"; the closest is Member + Viewer preset. Consider naming it "No module access" or showing a line in the Role help text.
2. **Invite dialog grants are not what the user gets.** For a Member with the Viewer preset the dialog says Knowledge Base "No access", yet /knowledge opens (RBAC-B-001). Users cannot trust the grant preview.
3. **Silent redirect for a non-member on a project.** qa1015mem opening /build/21 before being added landed on /build/command-center with no message. A short "You are not a member of QA1015 Build R1" would help.
4. **Disabled ticket fields with no explanation.** For a read-only member, Status, Priority, Type, Epic, Workstream and Cycle look like controls (dropdown style) but are disabled, with no tooltip or "read-only" label.
5. **Approval row: Decide only in the "..." menu.** Clicking the row opens nothing, so the approver may not find the Decide action. The row click could open the decision dialog for an assigned approver.
6. **Approvals and members lists need a reload.** Approval create (BLD-B-047), decision by another user (BLD-B-048) and role change (RBAC-B-004) all show stale rows until reload.
7. **Member milestone and release rows look clickable but are not.** No actions, no edit sheet, nothing opens on click. A read-only label would make that clear.
8. **Access-denied copy.** The text "Contact your administrator to request access" has no link or request button. Consider a "Request access" action that records the request.
9. **Module switcher.** On the Knowledge page the top-left "Documents OS" switcher did not open a menu when clicked (test script), so the list of modules a Viewer can switch to was not captured. The sidebar list was captured instead.
10. **Sign-in OTP wording.** After a rejected code the page said "A newer code was sent. Any earlier code has stopped working", although the user had not clicked Resend for the latest code (a second email arrived about 40 s after the Resend). Clarify or avoid the auto re-send.
11. **Possible side effect on the Viewer dashboard.** One click near the top-right avatar on the Viewer's home page made a red circular control with the text "Your location is recorded when you clock in." appear at the top right. Not verified whether it recorded anything; the Viewer session was closed afterwards.
12. **Owner's "Done 0" versus "Completed tickets are hidden".** The Done header count changes between live and reloaded boards and when Hide done is on (BLD-B-049). The hidden count should be shown.
