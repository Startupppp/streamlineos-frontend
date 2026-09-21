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

function setUp(projectData: ProjectWithDetails | null | undefined): void {
  mockUseAccess.mockReturnValue({
    data: accessWithPortalPermission(),
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

  it("the client-portal destination renders once the project detail has loaded and the capability is not explicitly disabled", () => {
    setUp(projectFixture(undefined));
    const { result } = renderHook(() => useBuildNavModel());
    expect(findClientPortalDestination(result.current.model)).toBeDefined();
  });

  it("the client-portal destination stays hidden once the project detail has loaded and the capability is explicitly disabled", () => {
    setUp(projectFixture({ clientPortal: false }));
    const { result } = renderHook(() => useBuildNavModel());
    expect(findClientPortalDestination(result.current.model)).toBeUndefined();
  });
});
