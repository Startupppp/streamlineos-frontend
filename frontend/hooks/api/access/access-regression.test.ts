import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useAuditLogs } from "@/hooks/api/audit-log";
import {
  useAssignableDepartments,
  useRole,
  useRoleMembers,
  useRolePermissionGrants,
} from "@/hooks/api/roles";
import { useSimulateAccess, useSimulationCandidates } from "./simulate";
import {
  normalizeOrgModulesResponse,
  useOrgModules,
} from "./org-modules";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn((options: unknown) => options),
}));
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

describe("RBAC administration query gates", () => {
  const query = useQuery as jest.Mock;
  const can = useCan as jest.Mock;
  const session = useSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    session.mockReturnValue({ data: { orgId: "org-1" } });
  });

  it("does not fetch simulator candidates without RBAC manage access", () => {
    can.mockReturnValue(false);

    useSimulationCandidates("ada");

    expect(can).toHaveBeenCalledWith("settings:rbac:manage");
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it("requires both RBAC manage access and a selected member to simulate", () => {
    can.mockReturnValue(true);

    useSimulateAccess(undefined);
    useSimulateAccess("user-2");

    expect(query.mock.calls[0][0].enabled).toBe(false);
    expect(query.mock.calls[1][0].enabled).toBe(true);
  });

  it("keeps audit pagination server-side and permission-gated", async () => {
    can.mockReturnValue(true);
    (apiClient.get as jest.Mock).mockResolvedValue({
      logs: [],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });

    useAuditLogs({
      cursor: "eyJpZCI6MjB9",
      limit: 25,
      actions: ["role.created", "role.deleted"],
    });

    const options = query.mock.calls[0][0];
    expect(can).toHaveBeenCalledWith("audit-log:read");
    expect(options.enabled).toBe(true);
    expect(options.queryKey).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cursor: "eyJpZCI6MjB9", limit: 25 }),
      ]),
    );

    await options.queryFn({ signal: undefined });
    expect(apiClient.get).toHaveBeenCalledWith(
      "/audit-log",
      expect.objectContaining({ cursor: "eyJpZCI6MjB9", limit: "25" }),
      undefined,
    );
  });

  it("matches RBAC manage gates for protected role reads", () => {
    can.mockReturnValue(false);

    useRole(4);
    useRolePermissionGrants(4);
    useRoleMembers(4);
    useAssignableDepartments();

    expect(can).toHaveBeenCalledTimes(4);
    expect(can).toHaveBeenCalledWith("settings:rbac:manage");
    for (const [options] of query.mock.calls) {
      expect(options.enabled).toBe(false);
    }
  });

  it("does not let caller options bypass a role query permission gate", () => {
    can.mockReturnValue(false);

    useRole(4, { enabled: true });

    expect(query.mock.calls[0][0].enabled).toBe(false);
  });

  it("normalizes wrapped organization modules before caching them", async () => {
    can.mockReturnValue(true);
    const modules = [
      { moduleKey: "hr", enabled: true },
      { moduleKey: "kb", enabled: true, core: true },
    ];
    (apiClient.get as jest.Mock).mockResolvedValue({ data: modules });

    useOrgModules();

    const options = query.mock.calls[0][0];
    await expect(options.queryFn({ signal: undefined })).resolves.toEqual(modules);
    expect(normalizeOrgModulesResponse(modules)).toBe(modules);
    expect(options.select({ success: true, data: modules })).toEqual(modules);
  });

  it("rejects malformed organization module payloads instead of rendering them", () => {
    expect(() =>
      normalizeOrgModulesResponse({ data: { hr: true } }),
    ).toThrow("invalid module configuration");
  });
});
