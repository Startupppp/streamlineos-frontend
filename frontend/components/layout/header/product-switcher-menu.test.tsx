import { fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, PropsWithChildren, ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProductSwitcherMenu } from "./product-switcher-menu";

function render(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

const mockPrefetch = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ prefetch: mockPrefetch }),
}));

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => false,
}));

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => [],
}));

const refetchAccess = jest.fn();
let accessResult: { data?: { isOrgOwner: boolean; scopes: Record<string, string>; modules: Record<string, boolean> }; error: Error | null } = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  error: null,
};

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => ({ ...accessResult, refetch: refetchAccess }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("framer-motion", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  function MotionElement({
    children,
    ...props
  }: PropsWithChildren<Record<string, unknown>>) {
    const {
      animate: _animate,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      whileTap: _whileTap,
      ...elementProps
    } = props;

    return React.createElement("div", elementProps, children);
  }

  return {
    motion: { div: MotionElement, span: MotionElement },
    AnimatePresence: ({ children }: PropsWithChildren) => children,
    useReducedMotion: () => true,
  };
});

describe("ProductSwitcherMenu", () => {
  beforeEach(() => {
    mockPrefetch.mockClear();
    accessResult = { data: { isOrgOwner: false, scopes: {}, modules: {} }, error: null };
  });

  it("says the modules could not load, with Retry, when the access read failed (BUG-001b)", async () => {
    accessResult = { error: new Error("Service Unavailable") };
    render(<ProductSwitcherMenu />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Switch module" }));

    await waitFor(() => expect(screen.getByText("Couldn't load your modules")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetchAccess).toHaveBeenCalled();
    expect(screen.queryByLabelText("Selected module")).not.toBeInTheDocument();
  });

  it("shows a skeleton, not an empty grid, while access is still loading", async () => {
    accessResult = { error: null };
    render(<ProductSwitcherMenu />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Switch module" }));

    await waitFor(() => expect(screen.queryByLabelText("Selected module")).not.toBeInTheDocument());
    expect(screen.queryByText("Couldn't load your modules")).not.toBeInTheDocument();
  });

  it("marks Home as selected without rendering a removal control", async () => {
    render(<ProductSwitcherMenu />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Switch module" }));

    await waitFor(() => expect(screen.getByLabelText("Selected module")).toBeInTheDocument());
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("prefetches only the module the user points at", async () => {
    render(<ProductSwitcherMenu />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Switch module" }));
    const home = await screen.findByRole("link", { name: "Home OS" });
    expect(mockPrefetch).not.toHaveBeenCalled();
    fireEvent.mouseEnter(home);
    expect(mockPrefetch).toHaveBeenCalledWith("/dashboard");
    fireEvent.mouseEnter(home);
    expect(mockPrefetch).toHaveBeenCalledTimes(1);
  });
});
