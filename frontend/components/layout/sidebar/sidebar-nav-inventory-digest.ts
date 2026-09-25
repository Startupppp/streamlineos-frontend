// Moved 2026-09-25 [V-044 / V-042]: /hr/approvals now requires
// ["hr:workflows:approve", "hr:leaves:approve"] rather than the workflow key
// alone. The page is the single HR approvals queue and lists leave requests,
// which route to a holder of hr:leaves:approve — an approver who is nobody's
// manager was sent to /access-denied and never reached their own queue.
export const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "9ed908e4a507fd22105f7f6f0a3eef3c215f58364a2af7a6ba44dd671ea8dcb6";
