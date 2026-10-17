/**
 * BUG-HRMS-001. What takes a plan seat, said once so every surface says the same.
 *
 * Mirrors the backend `seatCount` (`src/modules/billing/core/seat-definition.ts`):
 * every organization member who is not LEFT — active, invited or suspended, and
 * every onboarded employee, because onboarding admits a member who can sign in —
 * plus every pending, unexpired invitation. An HR person record with no
 * membership does not take one.
 */
export const SEAT_RULE =
  "Each member who can sign in — including every onboarded employee — and each pending invitation takes one seat.";
