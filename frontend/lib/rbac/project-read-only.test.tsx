import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { blockedForProjectViewer, ProjectReadOnlyContext } from "./project-read-only";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn().mockReturnValue({ invalidateQueries: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

const WRITER_SCOPES = {
  "build:tickets:view": "all",
  "build:tickets:update": "all",
  "build:tickets:create": "all",
  "build:approvals:decide": "all",
} as const;

beforeEach(() => {
  jest.mocked(useQuery).mockReturnValue({
    data: { scopes: WRITER_SCOPES, isOrgOwner: false, canManageOrganizationMembership: false, modules: {} },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useQuery>);
});

function inProject(readOnly: boolean) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ProjectReadOnlyContext.Provider value={readOnly}>{children}</ProjectReadOnlyContext.Provider>;
  };
}

describe("useCan inside a Build project the caller views read-only", () => {
  it("hides write controls: create and update answer false", () => {
    const { result } = renderHook(() => [useCan("build:tickets:create"), useCan("build:tickets:update")], {
      wrapper: inProject(true),
    });
    expect(result.current).toEqual([false, false]);
  });

  it("keeps reads, and hides approval decisions the backend now refuses too", () => {
    const { result } = renderHook(() => [useCan("build:tickets:view"), useCan("build:approvals:decide")], {
      wrapper: inProject(true),
    });
    expect(result.current).toEqual([true, false]);
  });

  it("positive control: the same holder writes in a project they are not a viewer of", () => {
    const { result } = renderHook(() => [useCan("build:tickets:create"), useCan("build:tickets:update")], {
      wrapper: inProject(false),
    });
    expect(result.current).toEqual([true, true]);
  });
});

describe("blockedForProjectViewer", () => {
  it.each([
    ["build:tickets:update", true],
    ["build:files:manage", true],
    ["build:tickets:view", false],
    ["build:ai:use", false],
    ["build:approvals:decide", true],
    ["crm:deals:update", false],
  ])("%s → %s", (key, blocked) => {
    expect(blockedForProjectViewer(key)).toBe(blocked);
  });
});
