import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseTeamProjects = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => mockUseCan(),
  useCanState: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/teams", () => ({
  useTeamProjects: () => mockUseTeamProjects(),
  useAddTeamProject: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveTeamProject: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, isPending: _p, ...props }: { children?: ReactNode; isPending?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_ROW: "",
}));

jest.mock("@/components/ui/responsive-popover", () => ({
  ResponsivePopover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResponsivePopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResponsivePopoverTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: () => <input />,
  CommandItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ...p }: React.HTMLAttributes<HTMLElement>) => <span {...p} />,
  XIcon: ({ ...p }: React.HTMLAttributes<HTMLElement>) => <span {...p} />,
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { useCanState } from "@/hooks/api/access";
import { TeamProjectsSection } from "./team-projects-section";

const mockUseCanState = useCanState as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseCanState.mockReturnValue("granted");
  mockUseTeamProjects.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  });
});

describe("TeamProjectsSection — access is three-valued, not a boolean", () => {
  it("renders a loading skeleton instead of the empty-state while the access snapshot is in flight", () => {
    mockUseCanState.mockReturnValue("loading");
    mockUseTeamProjects.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<TeamProjectsSection teamId={1} />);

    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(container.firstChild).not.toBeNull();
  });

  it("renders nothing when build:teams:view is denied so denial is not mistaken for an empty team", () => {
    mockUseCanState.mockReturnValue("denied");
    mockUseTeamProjects.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<TeamProjectsSection teamId={1} />);

    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});
