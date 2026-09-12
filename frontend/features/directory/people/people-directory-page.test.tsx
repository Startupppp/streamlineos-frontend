import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { useCan, usePermissionGate } from "@/hooks/api/access";
import { PeopleDirectoryPage } from "./people-directory-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/directory",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  usePermissionGate: jest.fn((permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./person-form-dialog", () => ({
  PersonFormDialog: () => null,
}));

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    </TooltipProvider>
  );
}

describe("PeopleDirectoryPage access states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCan as jest.Mock).mockImplementation(() => true);
    (usePermissionGate as jest.Mock).mockImplementation(
      (permission: string) => ({
        permission,
        allowed: true,
        denied: false,
        pending: false,
      }),
    );
  });

  it("distinguishes a withdrawn read from an empty directory", () => {
    (usePermissionGate as jest.Mock).mockImplementation(
      (permission: string) => ({
        permission,
        allowed: false,
        denied: true,
        pending: false,
      }),
    );

    render(
      <Wrapper>
        <PeopleDirectoryPage />
      </Wrapper>,
    );

    expect(screen.getByText("Directory unavailable")).toBeInTheDocument();
    expect(screen.getByText("directory:people:view")).toBeInTheDocument();
    expect(screen.queryByText("No person records yet")).not.toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("never shows a denial while the access snapshot is still pending", () => {
    (usePermissionGate as jest.Mock).mockImplementation(
      (permission: string) => ({
        permission,
        allowed: false,
        denied: false,
        pending: true,
      }),
    );

    render(
      <Wrapper>
        <PeopleDirectoryPage />
      </Wrapper>,
    );

    expect(screen.queryByText("Directory unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText("No person records yet")).not.toBeInTheDocument();
  });

  it("keeps the directory read universal rather than entitlement gated", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(
      <Wrapper>
        <PeopleDirectoryPage />
      </Wrapper>,
    );

    expect(usePermissionGate).toHaveBeenCalledWith("directory:people:view");
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("/directory/people"),
      undefined,
      expect.any(AbortSignal),
      expect.anything(),
    );
  });

  it("hides the create action from a member who cannot create people", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    (useCan as jest.Mock).mockImplementation(
      (permission: string) => permission !== "directory:people:create",
    );

    render(
      <Wrapper>
        <PeopleDirectoryPage />
      </Wrapper>,
    );

    expect(
      screen.queryByRole("button", { name: /Add person record/i }),
    ).not.toBeInTheDocument();
  });
});
