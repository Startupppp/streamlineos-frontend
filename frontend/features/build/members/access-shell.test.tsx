import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";

const mockRouterReplace = jest.fn();
let mockSearchParamsValue = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  usePathname: () => "/build/settings/access",
  useSearchParams: () => mockSearchParamsValue,
}));

let capturedOnValueChange: ((v: string) => void) | undefined;

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value: _value,
    onValueChange,
    className: _className,
  }: {
    children: ReactNode;
    value: string;
    onValueChange?: (v: string) => void;
    className?: string;
  }) => {
    capturedOnValueChange = onValueChange;
    return <div data-testid="tabs">{children}</div>;
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({
    children,
    value,
  }: {
    children: ReactNode;
    value: string;
  }) => (
    <button
      data-testid={`tab-${value}`}
      onClick={() => capturedOnValueChange?.(value)}
    >
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    value: _value,
    className: _className,
  }: {
    children: ReactNode;
    value: string;
    className?: string;
  }) => <div data-testid={`content-${_value}`}>{children}</div>,
}));

import { BuildAccessShell } from "./access-shell";

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnValueChange = undefined;
  mockSearchParamsValue = new URLSearchParams();
});

describe("BuildAccessShell — section URL param (BLD-X-FE-ACCESS-SHELL-001)", () => {
  it("renders membersContent when no section param is present", () => {
    mockSearchParamsValue = new URLSearchParams();
    render(
      <BuildAccessShell
        membersContent={<div data-testid="members-content" />}
        accessContent={<div data-testid="access-content" />}
      />,
    );
    expect(screen.getByTestId("members-content")).toBeInTheDocument();
    expect(screen.queryByTestId("access-content")).not.toBeInTheDocument();
  });

  it("renders accessContent when section=access — paired positive for the default-members test", () => {
    mockSearchParamsValue = new URLSearchParams("section=access");
    render(
      <BuildAccessShell
        membersContent={<div data-testid="members-content" />}
        accessContent={<div data-testid="access-content" />}
      />,
    );
    expect(screen.getByTestId("access-content")).toBeInTheDocument();
    expect(screen.queryByTestId("members-content")).not.toBeInTheDocument();
  });

  it("falls back to members when section param is an unrecognised value", () => {
    mockSearchParamsValue = new URLSearchParams("section=unknown");
    render(
      <BuildAccessShell
        membersContent={<div data-testid="members-content" />}
        accessContent={<div data-testid="access-content" />}
      />,
    );
    expect(screen.getByTestId("members-content")).toBeInTheDocument();
    expect(screen.queryByTestId("access-content")).not.toBeInTheDocument();
  });
});

describe("BuildAccessShell — tab navigation (BLD-X-FE-ACCESS-SHELL-002)", () => {
  it("calls router.replace with section=access when the access tab is selected", async () => {
    const user = userEvent.setup();
    render(
      <BuildAccessShell
        membersContent={<div data-testid="members-content" />}
        accessContent={<div data-testid="access-content" />}
      />,
    );
    await user.click(screen.getByTestId("tab-access"));
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("section=access"),
      expect.objectContaining({ scroll: false }),
    );
  });

  it("calls router.replace without a section param when switching back to members", async () => {
    const user = userEvent.setup();
    mockSearchParamsValue = new URLSearchParams("section=access");
    render(
      <BuildAccessShell
        membersContent={<div data-testid="members-content" />}
        accessContent={<div data-testid="access-content" />}
      />,
    );
    await user.click(screen.getByTestId("tab-members"));
    const callArg = mockRouterReplace.mock.calls[0]?.[0] as string | undefined;
    expect(callArg).toBeDefined();
    expect(callArg).not.toContain("section=");
  });

  it("does not call router.replace when an unrecognised tab value fires onValueChange", () => {
    render(
      <BuildAccessShell
        membersContent={<div data-testid="members-content" />}
        accessContent={<div data-testid="access-content" />}
      />,
    );
    act(() => { capturedOnValueChange?.("unknown"); });
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
