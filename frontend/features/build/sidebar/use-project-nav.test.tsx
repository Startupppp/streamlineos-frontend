import { renderHook } from "@testing-library/react";
import { buildProjectNavGroups } from "./project-nav-config";
import { useProjectNavPermissions } from "./use-project-nav";

jest.mock("next/navigation", () => ({
  usePathname: () => "/build/42",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

const { useModuleEnabled } = jest.requireMock("@/hooks/api/access") as {
  useModuleEnabled: jest.Mock;
};

function feedbackHrefs(baseUrl: string, perms: ReturnType<typeof useProjectNavPermissions>) {
  return buildProjectNavGroups(baseUrl, perms)
    .flatMap((group) => group.items)
    .filter((item) => item.href.endsWith("/feedbucket"));
}

describe("the project nav offers Feedback only when the feedbucket module is available", () => {
  beforeEach(() => {
    useModuleEnabled.mockReset();
  });

  it("offers Feedback when the permission is held and the module is enabled", () => {
    useModuleEnabled.mockReturnValue(true);
    const { result } = renderHook(() => useProjectNavPermissions());
    expect(result.current.canFeedback).toBe(true);
    expect(feedbackHrefs("/build/42", result.current)).toHaveLength(1);
  });

  it("hides Feedback when feedbucket is disabled, even though an org owner holds every permission key regardless of module entitlement", () => {
    useModuleEnabled.mockReturnValue(false);
    const { result } = renderHook(() => useProjectNavPermissions());
    expect(result.current.canFeedback).toBe(false);
    expect(feedbackHrefs("/build/42", result.current)).toHaveLength(0);
  });
});
