import { renderHook } from "@testing-library/react";
import { useBuildNavModel } from "./use-build-nav-model";
import { useAccess, useModuleEnabled } from "@/hooks/api/access";
import { useProject } from "@/hooks/api/build/projects";
import type { AccessResponse } from "@/hooks/api/access-schema";
import type { ProjectWithDetails } from "@/types/projects";

jest.mock("next/navigation", () => ({
  usePathname: () => "/build/42",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
  useModuleEnabled: jest.fn(),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: jest.fn(),
}));

const mockUseAccess = useAccess as jest.MockedFunction<typeof useAccess>;
const mockUseModuleEnabled = useModuleEnabled as jest.MockedFunction<
  typeof useModuleEnabled
>;
const mockUseProject = useProject as jest.MockedFunction<typeof useProject>;

function accessWithPortalPermission(): AccessResponse {
  return {
    scopes: { "build:clientvisibility:manage": "all" },
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
  };
}

function projectFixture(
  features: Record<string, boolean> | undefined,
): ProjectWithDetails {
  return {
    id: 42,
    orgId: "org-1",
    name: "Billing",
    description: null,
    key: "BIL",
    managedProductId: null,
    pmWorkspaceId: null,
    startDate: null,
    endDate: null,
    status: null,
    settings: {
      modules: { sprints: true, epics: true, timeTracking: true, wiki: true },
      features,
    },
  };
}

function setUp(
  projectData: ProjectWithDetails | null | undefined,
  accessOverrides: Partial<ReturnType<typeof useAccess>> = {},
): void {
  mockUseAccess.mockReturnValue({
    data: accessWithPortalPermission(),
    isError: false,
    refetch: jest.fn(),
    ...accessOverrides,
  } as ReturnType<typeof useAccess>);
  mockUseModuleEnabled.mockReturnValue(true);
  mockUseProject.mockReturnValue({
    data: projectData,
  } as ReturnType<typeof useProject>);
}

function findClientPortalDestination(
  model: ReturnType<typeof useBuildNavModel>["model"],
) {
  return model.primary.find((destination) =>
    destination.href.includes("client-portal"),
  );
}

describe("useBuildNavModel — client-portal capability gate", () => {
  beforeEach(() => {
    mockUseAccess.mockReset();
    mockUseModuleEnabled.mockReset();
    mockUseProject.mockReset();
  });

  it("the client-portal destination is hidden while the project detail is still loading so a disabled capability never renders a dead link", () => {
    setUp(undefined);
    const { result } = renderHook(() => useBuildNavModel());
    expect(findClientPortalDestination(result.current.model)).toBeUndefined();
  });

  it("the client-portal destination stays hidden once the project detail has loaded but its features map has no clientPortal key at all, because an absent key must not enable the portal", () => {
    setUp(projectFixture(undefined));
    const { result } = renderHook(() => useBuildNavModel());
    expect(findClientPortalDestination(result.current.model)).toBeUndefined();
  });

  it("the client-portal destination stays hidden once the project detail has loaded and the capability is explicitly disabled", () => {
    setUp(projectFixture({ clientPortal: false }));
    const { result } = renderHook(() => useBuildNavModel());
    expect(findClientPortalDestination(result.current.model)).toBeUndefined();
  });

  it("the client-portal destination renders once the project detail has loaded and the capability is explicitly enabled", () => {
    setUp(projectFixture({ clientPortal: true }));
    const { result } = renderHook(() => useBuildNavModel());
    expect(findClientPortalDestination(result.current.model)).toBeDefined();
  });
});

describe("useBuildNavModel — access query failure", () => {
  beforeEach(() => {
    mockUseAccess.mockReset();
    mockUseModuleEnabled.mockReset();
    mockUseProject.mockReset();
  });

  it("isAccessReady stays false and isAccessError becomes true when the access query fails with no cached data, so the sidebar can render a retry instead of spinning forever", () => {
    setUp(undefined, { data: undefined, isError: true });
    const { result } = renderHook(() => useBuildNavModel());
    expect(result.current.isAccessReady).toBe(false);
    expect(result.current.isAccessError).toBe(true);
  });

  it("isAccessError stays false once previously cached access data is present, even while a background refetch is failing", () => {
    setUp(undefined, { data: accessWithPortalPermission(), isError: true });
    const { result } = renderHook(() => useBuildNavModel());
    expect(result.current.isAccessReady).toBe(true);
    expect(result.current.isAccessError).toBe(false);
  });

  it("calling refetchAccess invokes the underlying access query's refetch", () => {
    const refetch = jest.fn();
    setUp(undefined, { data: undefined, isError: true, refetch });
    const { result } = renderHook(() => useBuildNavModel());
    result.current.refetchAccess();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
