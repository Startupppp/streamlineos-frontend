import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, PropsWithChildren, ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  OrgStorageScopeProvider,
  orgScopedStorageKey,
} from "@/lib/org-scoped-storage";
import { ProductGrid } from "./product-grid";
import {
  LAST_PRODUCT_PATHS_STORAGE,
  writeLastProductPath,
} from "../last-product-path";

function renderWithProviders(ui: ReactElement) {
  return render(
    <TooltipProvider>
      <OrgStorageScopeProvider scope="org-test">{ui}</OrgStorageScopeProvider>
    </TooltipProvider>,
  );
}

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: PropsWithChildren<
    AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }
  >) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

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
    useReducedMotion: () => true,
  };
});

jest.mock("../nav-intent-prefetch", () => ({
  useNavIntentPrefetch: () => jest.fn(),
}));

describe("ProductGrid last-path restore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("links Home OS to the remembered calendar URL", () => {
    writeLastProductPath(
      orgScopedStorageKey(LAST_PRODUCT_PATHS_STORAGE, "org-test"),
      "home",
      "/calendar?view=week",
    );

    renderWithProviders(
      <ProductGrid
        activeProduct="hrms"
        enabledModules={["hr"]}
        lockedModules={[]}
        canManageModules={false}
        scopes={{}}
        effectiveRole="OWNER"
        onClose={jest.fn()}
        shouldReduceMotion
      />,
    );

    expect(screen.getByRole("link", { name: "Home OS" })).toHaveAttribute(
      "href",
      "/calendar?view=week",
    );
  });
});
