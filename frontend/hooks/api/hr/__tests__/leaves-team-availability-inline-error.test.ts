import { useGatedQuery } from "@/hooks/api/gated-query";
import { useHrTeamAvailability } from "@/hooks/api/hr/leaves-team-availability";

jest.mock("@/hooks/api/gated-query", () => ({
  useGatedQuery: jest.fn((_permission: unknown, options: unknown) => options),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

// NEW-1: this read is mounted only on /hr/leaves?tab=approvals; a failure used to replace the whole page.
describe("useHrTeamAvailability inline error policy", () => {
  it("keeps its errors inline", () => {
    useHrTeamAvailability({ startDate: "2026-10-01", endDate: "2026-10-31" });
    const options = (useGatedQuery as jest.Mock).mock.calls[0][1] as { throwOnError?: unknown; enabled: boolean };
    expect(options.throwOnError).toBe(false);
    expect(options.enabled).toBe(true);
  });
});
