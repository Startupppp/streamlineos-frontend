import { useQuery } from "@tanstack/react-query";
import { useCan, useScope } from "./access";
import type { AccessResponse } from "@/types/access";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn().mockReturnValue({ invalidateQueries: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
  }),
}));

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

const mockQuery = useQuery as jest.Mock;

function seedAccess(snapshot: Partial<AccessResponse>): void {
  mockQuery.mockReturnValue({
    data: {
      scopes: {},
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      modules: {},
      ...snapshot,
    } satisfies AccessResponse,
    isLoading: false,
  });
}

beforeEach(() => jest.clearAllMocks());

describe("useCan — reads scopes, not a permissions array", () => {
  it("returns true for a team-scoped key", () => {
    seedAccess({ scopes: { "hr:employees:view": "team" } });
    expect(useCan("hr:employees:view")).toBe(true);
  });

  it("returns false for an absent key", () => {
    seedAccess({ scopes: {} });
    expect(useCan("hr:employees:view")).toBe(false);
  });

  it("returns true for any key when isOrgOwner regardless of scopes", () => {
    seedAccess({ scopes: {}, isOrgOwner: true });
    expect(useCan("hr:employees:view")).toBe(true);
  });

  it("wire shape: works from scopes alone — no permissions field needed", () => {
    const wireData: AccessResponse = {
      scopes: { "hr:employees:view": "all" },
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      modules: {},
    };
    mockQuery.mockReturnValue({ data: wireData, isLoading: false });
    expect(Object.keys(wireData)).not.toContain("permissions");
    expect(useCan("hr:employees:view")).toBe(true);
  });

  it("returns false while the snapshot has not loaded yet", () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true });
    expect(useCan("hr:employees:view")).toBe(false);
  });
});

describe("useScope — returns DataScope from the record", () => {
  it("returns team for a team-scoped key", () => {
    seedAccess({ scopes: { "hr:employees:view": "team" } });
    expect(useScope("hr:employees:view")).toBe("team");
  });

  it("returns none for an absent key", () => {
    seedAccess({ scopes: {} });
    expect(useScope("hr:employees:view")).toBe("none");
  });

  it("returns all for any key when isOrgOwner regardless of scopes", () => {
    seedAccess({ scopes: {}, isOrgOwner: true });
    expect(useScope("hr:employees:view")).toBe("all");
  });

  it("returns none while the snapshot has not loaded yet", () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: true });
    expect(useScope("hr:employees:view")).toBe("none");
  });
});
