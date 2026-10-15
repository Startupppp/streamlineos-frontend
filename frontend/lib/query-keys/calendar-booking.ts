export const calendarBookingQueryKeys = {
  all: () => ["calendar", "booking-rules"] as const,
  rules: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean) =>
    ["calendar", "booking-rules", "rules", orgId, userId, membershipId, accessVersion, canRead] as const,
  preview: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number, from: string, to: string) =>
    ["calendar", "booking-rules", "preview", orgId, userId, membershipId, accessVersion, canRead, ruleId, from, to] as const,
  distribution: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number) =>
    ["calendar", "booking-rules", "distribution", orgId, userId, membershipId, accessVersion, canRead, ruleId] as const,
  links: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number) =>
    ["calendar", "booking-rules", "links", orgId, userId, membershipId, accessVersion, canRead, ruleId] as const,
  operations: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number) =>
    ["calendar", "booking-rules", "operations", orgId, userId, membershipId, accessVersion, canRead, ruleId] as const,
  resources: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, cursor: string | undefined) =>
    ["calendar", "booking-rules", "resources", orgId, userId, membershipId, accessVersion, canRead, cursor] as const,
  inventoryEquipment: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, cursor: number | null) =>
    ["calendar", "booking-rules", "inventory-equipment", orgId, userId, membershipId, accessVersion, cursor] as const,
  allocations: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, bookingId: string) =>
    ["calendar", "booking-rules", "allocations", orgId, userId, membershipId, accessVersion, canRead, bookingId] as const,
  pendingAllocations: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, cursor: string | null) =>
    ["calendar", "booking-rules", "pending-allocations", orgId, userId, membershipId, accessVersion, canRead, cursor] as const,
  requirements: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number) =>
    ["calendar", "booking-rules", "requirements", orgId, userId, membershipId, accessVersion, canRead, ruleId] as const,
  routing: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number) =>
    ["calendar", "booking-rules", "routing", orgId, userId, membershipId, accessVersion, canRead, ruleId] as const,
  routingHosts: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number, search: string) =>
    ["calendar", "booking-rules", "routing-hosts", orgId, userId, membershipId, accessVersion, canRead, ruleId, search] as const,
  paymentPolicy: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number) =>
    ["calendar", "booking-rules", "payment-policy", orgId, userId, membershipId, accessVersion, canRead, ruleId] as const,
  payments: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number, cursor: string | null) =>
    ["calendar", "booking-rules", "payments", orgId, userId, membershipId, accessVersion, canRead, ruleId, cursor] as const,
  bookings: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number, cursor: string | null) =>
    ["calendar", "booking-rules", "bookings", orgId, userId, membershipId, accessVersion, canRead, ruleId, cursor] as const,
  assignment: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number, bookingId: string) =>
    ["calendar", "booking-rules", "assignment", orgId, userId, membershipId, accessVersion, canRead, ruleId, bookingId] as const,
  invitations: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, bookingId: string, cursor: string | null) =>
    ["calendar", "booking-rules", "invitations", orgId, userId, membershipId, accessVersion, canRead, bookingId, cursor] as const,
  invitationsPrefix: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, bookingId: string) =>
    ["calendar", "booking-rules", "invitations", orgId, userId, membershipId, accessVersion, canRead, bookingId] as const,
  polls: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number, cursor: string | null) =>
    ["calendar", "booking-rules", "polls", orgId, userId, membershipId, accessVersion, canRead, ruleId, cursor] as const,
  poll: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, pollId: string) =>
    ["calendar", "booking-rules", "poll", orgId, userId, membershipId, accessVersion, canRead, pollId] as const,
  myPolls: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, cursor: string | null) =>
    ["calendar", "booking-rules", "my-polls", orgId, userId, membershipId, accessVersion, canRead, cursor] as const,
  mutation: (action: string) => ["calendar", "booking-rules", action] as const,
};
