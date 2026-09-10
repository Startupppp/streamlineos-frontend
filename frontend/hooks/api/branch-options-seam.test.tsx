import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useBranchOptions } from "@/hooks/api/org-hierarchy-branch-options";
import { orgBranchListContract } from "@/hooks/api/org-hierarchy-schema";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  usePermissionGate: jest.fn(() => ({ allowed: true, denied: false, pending: false })),
  useModuleEnabled: jest.fn(() => true),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedCan = useCan as jest.Mock;

const FRONTEND_ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(join(FRONTEND_ROOT, relativePath), "utf8");
}

const HOOK_SOURCE = readSource("hooks/api/org-hierarchy-branch-options.ts");

const CONSUMERS = [
  {
    name: "HR announcement form",
    path: "features/hr/announcements/use-announcement-form.ts",
  },
  {
    name: "recruitment job form",
    path: "features/hr/recruitment/jobs/create-job-form/job-basics-sections.tsx",
  },
];

const BRANCH_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  orgId: "org_1",
  businessUnitId: null,
  managerUserId: null,
  name: "Bengaluru HQ",
  code: "BLR",
  address: "1 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  postalCode: "560001",
  phone: null,
  email: null,
  status: "ACTIVE",
  businessUnitName: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
};

const BRANCH_PAGE = {
  data: [BRANCH_ROW],
  pageInfo: { limit: 100, hasMore: false, nextCursor: null },
};

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("branch options read seam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCan.mockReturnValue(true);
    mockedGet.mockResolvedValue(BRANCH_PAGE);
  });

  describe("least privilege", () => {
    it("gates on branch:view, the key the options route enforces", () => {
      renderHook(() => useBranchOptions(), { wrapper: wrapper() });
      expect(mockedCan).toHaveBeenCalledWith("branch:view");
    });

    it("never asks for organization-settings authority to load choices", () => {
      renderHook(() => useBranchOptions(), { wrapper: wrapper() });
      const requested = mockedCan.mock.calls.map(([key]) => key);
      expect(requested).not.toContain("settings:view");
      expect(requested).not.toContain("settings:organization:manage");
    });

    it("sends nothing when branch-view authority is absent", async () => {
      mockedCan.mockReturnValue(false);
      renderHook(() => useBranchOptions(), { wrapper: wrapper() });
      await waitFor(() => expect(mockedCan).toHaveBeenCalled());
      expect(mockedGet).not.toHaveBeenCalled();
    });

    it("still honours a caller's own gate on top of the permission", async () => {
      renderHook(() => useBranchOptions({ enabled: false }), { wrapper: wrapper() });
      await waitFor(() => expect(mockedCan).toHaveBeenCalled());
      expect(mockedGet).not.toHaveBeenCalled();
    });
  });

  describe("the request", () => {
    it("reads the canonical hierarchy route, never the retired /branches seam", async () => {
      renderHook(() => useBranchOptions(), { wrapper: wrapper() });
      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      const [url] = mockedGet.mock.calls[0] as [string];
      expect(url).toBe("/org-hierarchy/branches/options");
    });

    it("passes a cancellation signal and a runtime contract", async () => {
      renderHook(() => useBranchOptions(), { wrapper: wrapper() });
      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      const [, params, signal, contract] = mockedGet.mock.calls[0] as [
        string,
        Record<string, string>,
        AbortSignal,
        unknown,
      ];
      expect(params).toEqual({ limit: "100" });
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(contract).toBeDefined();
    });

    it("asks for no status, so it cannot widen into archived branches", async () => {
      renderHook(() => useBranchOptions(), { wrapper: wrapper() });
      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      const [, params] = mockedGet.mock.calls[0] as [string, Record<string, string>];
      expect(params).not.toHaveProperty("status");
    });

    it("keys the read through the hierarchy factory the branch mutations invalidate", () => {
      const key = platformHierarchyQueryKeys.hierarchy.branchOptions();
      expect(key).toEqual(["streamlineos", "hierarchy", "branchOptions"]);
      expect(key.slice(0, 2)).toEqual(
        platformHierarchyQueryKeys.hierarchy.all.slice(0, 2),
      );
    });
  });

  describe("the runtime contract", () => {
    it("accepts the shape the hierarchy branch route returns", () => {
      expect(orgBranchListContract.safeParse(BRANCH_PAGE).success).toBe(true);
    });

    it("rejects the retired /branches shape, which was a bare array", () => {
      expect(orgBranchListContract.safeParse([BRANCH_ROW]).success).toBe(false);
    });

    it("rejects the legacy status vocabulary the retired seam emitted", () => {
      const drifted = { ...BRANCH_PAGE, data: [{ ...BRANCH_ROW, status: "INACTIVE" }] };
      expect(orgBranchListContract.safeParse(drifted).success).toBe(false);
    });

    it("rejects a page that lost pageInfo", () => {
      expect(orgBranchListContract.safeParse({ data: [BRANCH_ROW] }).success).toBe(false);
    });

    it("rejects a row that lost the fields the job form autofills from", () => {
      for (const field of ["city", "state", "country", "name"]) {
        const { [field]: _dropped, ...rest } = BRANCH_ROW as Record<string, unknown>;
        expect(
          orgBranchListContract.safeParse({ ...BRANCH_PAGE, data: [rest] }).success,
        ).toBe(false);
      }
    });

    it("the hook loads that contract and no parallel branch contract", () => {
      expect(HOOK_SOURCE).toContain("m.orgBranchListContract");
      expect(HOOK_SOURCE).not.toContain("branches-schema");
      expect(HOOK_SOURCE).not.toContain("branchListContract,");
    });
  });

  describe("the retired seam stays retired", () => {
    it.each(CONSUMERS)("$name reads the hierarchy seam", ({ path }) => {
      const source = readSource(path);
      expect(source).toContain("useBranchOptions");
      expect(source).not.toContain("useBranches");
    });

    it("no frontend module imports the deleted hook or its schema", () => {
      expect(existsSync(join(FRONTEND_ROOT, "hooks/api/branches.ts"))).toBe(false);
      expect(existsSync(join(FRONTEND_ROOT, "hooks/api/branches-schema.ts"))).toBe(false);
      expect(readSource("hooks/api/index.ts")).not.toContain('"./branches"');
    });

    it("the legacy branches query-key factory is gone", () => {
      const keySource = readSource("lib/query-keys/access-and-crm.ts");
      expect(keySource).not.toContain('"branches"');
    });
  });
});
