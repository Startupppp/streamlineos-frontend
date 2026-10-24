import { render, screen } from "@testing-library/react";
import { datetimeLocalAfterDays } from "@/lib/date-utils";
import { TokenExpiresAtField, tokenExpiryToIso } from "./token-expires-at-field";

jest.mock("@/hooks/api/org-display", () => ({
  useOrgTimeZone: () => "Asia/Calcutta",
}));

describe("token expiry follows the organization time zone (ORG-B-016)", () => {
  afterEach(() => jest.useRealTimers());

  it("sends the picked wall time as the matching instant in the org zone, not a zone-less string the server reads as UTC", () => {
    expect(tokenExpiryToIso("2026-11-01T23:59", "Asia/Calcutta")).toBe("2026-11-01T18:29:00.000Z");
  });

  it("defaults the expiry from the org's own clock", () => {
    jest.useFakeTimers({ now: new Date("2026-10-14T23:20:00.000Z") });
    expect(datetimeLocalAfterDays(30, "Asia/Calcutta")).toBe("2026-11-14T04:50");
    expect(datetimeLocalAfterDays(30, "UTC")).toBe("2026-11-13T23:20");
  });

  it("labels the zone the expiry is entered in", () => {
    render(<TokenExpiresAtField value="2026-11-01T23:59" onChange={jest.fn()} maxDays={90} />);
    expect(screen.getByText("Time zone: Asia/Kolkata")).toBeInTheDocument();
  });
});
