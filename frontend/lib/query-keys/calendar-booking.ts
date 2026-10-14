export const calendarBookingQueryKeys = {
  all: () => ["calendar", "booking-rules"] as const,
  rules: (orgId: string, userId: string, membershipId: string | null, accessVersion: number, canRead: boolean) =>
    ["calendar", "booking-rules", "rules", orgId, userId, membershipId, accessVersion, canRead] as const,
  preview: (orgId: string, userId: string, membershipId: string | null, accessVersion: number, canRead: boolean, ruleId: number, from: string, to: string) =>
    ["calendar", "booking-rules", "preview", orgId, userId, membershipId, accessVersion, canRead, ruleId, from, to] as const,
  mutation: (action: string) => ["calendar", "booking-rules", action] as const,
};
