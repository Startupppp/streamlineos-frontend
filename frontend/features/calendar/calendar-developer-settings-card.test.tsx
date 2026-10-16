import { render, screen } from "@testing-library/react";
import { CalendarDeveloperSettingsCard } from "./calendar-developer-settings-card";
import { calendarDeveloperCredentialPageContract } from "@/hooks/api/calendar-developer-schema";

const credential = {
  id: "142fdbd9-a153-43de-a641-61303db07717",
  name: "Legacy credential",
  description: null,
  keyPrefix: "cal_legacy",
  scopes: ["calendar:bookings:read"],
  isRevoked: false,
  lastUsedAt: null,
  expiresAt: null,
  createdAt: "2026-10-15T10:00:00.000Z",
};

jest.mock("@/hooks/api/calendar-developer", () => ({
  isCalendarCredentialReplay: () => false,
  useCalendarDeveloperCredentials: () => ({
    data: { data: [credential], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    isError: false,
    isLoading: false,
  }),
  useCreateCalendarDeveloperCredential: () => ({ isPending: false }),
  useRevokeCalendarDeveloperCredential: () => ({ isPending: false }),
}));

describe("Calendar developer credential settings", () => {
  it("accepts and accurately labels a legacy credential without an expiry", () => {
    expect(calendarDeveloperCredentialPageContract.safeParse({
      data: [credential],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    }).success).toBe(true);
    render(<CalendarDeveloperSettingsCard />);
    expect(screen.getByText("Legacy credential")).toBeInTheDocument();
    expect(screen.getByText(/No expiry set/)).toBeInTheDocument();
    expect(screen.getByText("Unusable")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });
});
