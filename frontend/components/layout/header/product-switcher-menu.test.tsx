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
    ...props
  }: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => false,
}));

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => [],
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => ({ data: undefined, isLoading: false }),
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
  it("marks Home as selected without rendering a removal control", async () => {
    render(<ProductSwitcherMenu />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Switch module" }));

    await waitFor(() => expect(screen.getByLabelText("Selected module")).toBeInTheDocument());
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
