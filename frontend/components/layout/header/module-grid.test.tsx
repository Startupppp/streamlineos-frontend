import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, PropsWithChildren, ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  OrgStorageScopeProvider,
  orgScopedStorageKey,
} from "@/lib/org-scoped-storage";
import { ModuleGrid } from "./module-grid";
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

describe("ModuleGrid", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("lists frequent modules before the rest when enabled", () => {
    renderWithProviders(
      <ModuleGrid
        activeModule="home"
        enabledModules={["hr", "payroll", "build", "crm"]}
        lockedModules={[]}
        canManageModules={false}
        scopes={{}}
        effectiveRole="OWNER"
        onClose={jest.fn()}
        shouldReduceMotion
      />,
    );

    const labels = screen.getAllByRole("link").map((link) => link.getAttribute("aria-label"));
    const frequent = [
      "Home OS",
      "Documents OS",
      "HRMS OS",
      "Payroll OS",
      "Recruitment OS",
      "Timesheets OS",
      "Build OS",
    ];
    const positions = frequent.map((label) => labels.indexOf(label));
    expect(positions.every((index) => index >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(labels.indexOf("CRM OS")).toBeGreaterThan(labels.indexOf("Build OS"));
  });

  it("links Home OS to the remembered calendar URL", () => {
    writeLastProductPath(
      orgScopedStorageKey(LAST_PRODUCT_PATHS_STORAGE, "org-test"),
      "home",
      "/calendar?view=week",
    );

    renderWithProviders(
      <ModuleGrid
        activeModule="hrms"
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
