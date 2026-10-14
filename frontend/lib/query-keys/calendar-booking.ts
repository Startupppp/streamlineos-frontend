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
  resources: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean) =>
    ["calendar", "booking-rules", "resources", orgId, userId, membershipId, accessVersion, canRead] as const,
  requirements: (orgId: string, userId: string, membershipId: number | null, accessVersion: number, canRead: boolean, ruleId: number) =>
    ["calendar", "booking-rules", "requirements", orgId, userId, membershipId, accessVersion, canRead, ruleId] as const,
  mutation: (action: string) => ["calendar", "booking-rules", action] as const,
};
