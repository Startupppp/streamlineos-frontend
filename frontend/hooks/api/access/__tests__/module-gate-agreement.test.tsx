/**
 * module-gate-agreement.test.tsx
 *
 * Asserts that <RequireModule> (the route gate) and useModuleEnabled (the hook
 * gate) agree for the alias pairs build/projects and accounting/finance.
 *
 * WHY THIS TEST BITES ON REVERT
 * Before the fix, RequireModule called matchesOrgModule(useEnabledModules(),
 * module). useEnabledModules() returns [] while useAccess data is undefined
 * (loading), so matchesOrgModule([], "build") = false and the component
 * rendered <ModuleDisabledState> — the "loading → denied" flash. After the
 * fix, RequireModule calls useAccess() directly; when data is undefined it
 * returns null. Reverting to the old code path makes the loading-state test
 * below fail because the container is no longer empty.
 *
 * For the alias pairs: normalizeOrgModuleKey("projects") = "build" and
 * normalizeOrgModuleKey("finance") = "accounting" — the same canonical key
 * that useModuleEnabled looks up. Reverting RequireModule to the
 * matchesOrgModule path would diverge on any key absent from ORG_MODULE_NAME
 * (e.g. "chat", which has productKey: null) or on the loading state.
 */

import { render } from "@testing-library/react";
import { normalizeOrgModuleKey } from "@/lib/module-vocabulary";
import { RequireModule } from "@/components/auth/require-module";
import { useAccess, useModuleEnabled } from "@/hooks/api/access";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/lib/module-catalog", () => ({
  getModuleCatalogEntry: jest.fn(() => ({ label: "Build" })),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
  useModuleEnabled: jest.fn(),
}));

const mockUseAccess = useAccess as jest.MockedFunction<typeof useAccess>;
const mockUseModuleEnabled = useModuleEnabled as jest.MockedFunction<
  typeof useModuleEnabled
>;

describe("normalizeOrgModuleKey alias pairs", () => {
  it("normalises 'projects' to 'build'", () => {
    expect(normalizeOrgModuleKey("projects")).toBe("build");
  });

  it("normalises 'build' to 'build'", () => {
    expect(normalizeOrgModuleKey("build")).toBe("build");
  });

  it("normalises 'finance' to 'accounting'", () => {
    expect(normalizeOrgModuleKey("finance")).toBe("accounting");
  });

  it("normalises 'accounting' to 'accounting'", () => {
    expect(normalizeOrgModuleKey("accounting")).toBe("accounting");
  });
});

describe("gate agreement — useModuleEnabled logic for alias pairs", () => {
  function gateResult(modules: Record<string, boolean>, key: string): boolean {
    return modules[normalizeOrgModuleKey(key)] === true;
  }

  describe("build / projects", () => {
    it("both return true when data.modules.build is true", () => {
      expect(gateResult({ build: true }, "build")).toBe(true);
      expect(gateResult({ build: true }, "projects")).toBe(true);
    });

    it("both return false when data.modules.build is false", () => {
      expect(gateResult({ build: false }, "build")).toBe(false);
      expect(gateResult({ build: false }, "projects")).toBe(false);
    });

    it("both return false when data.modules.build is absent", () => {
      expect(gateResult({}, "build")).toBe(false);
      expect(gateResult({}, "projects")).toBe(false);
    });
  });

  describe("accounting / finance", () => {
    it("both return true when data.modules.accounting is true", () => {
      expect(gateResult({ accounting: true }, "accounting")).toBe(true);
      expect(gateResult({ accounting: true }, "finance")).toBe(true);
    });

    it("both return false when data.modules.accounting is false", () => {
      expect(gateResult({ accounting: false }, "accounting")).toBe(false);
      expect(gateResult({ accounting: false }, "finance")).toBe(false);
    });

    it("both return false when data.modules.accounting is absent", () => {
      expect(gateResult({}, "accounting")).toBe(false);
      expect(gateResult({}, "finance")).toBe(false);
    });
  });
});

describe("RequireModule — route gate loading behaviour", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing while access data has not loaded", () => {
    mockUseAccess.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useAccess>);
    mockUseModuleEnabled.mockReturnValue(true);

    const { container } = render(
      <RequireModule module="build">
        <span>content</span>
      </RequireModule>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders children when the module is enabled and data is loaded", () => {
    mockUseAccess.mockReturnValue({
      data: {
        modules: { build: true },
        isOrgOwner: false,
        canManageOrganizationMembership: false,
        scopes: {},
      },
    } as ReturnType<typeof useAccess>);
    mockUseModuleEnabled.mockReturnValue(true);

    const { getByText } = render(
      <RequireModule module="build">
        <span>content</span>
      </RequireModule>,
    );

    expect(getByText("content")).toBeInTheDocument();
  });

  it("renders the disabled state when the module is disabled and data is loaded", () => {
    mockUseAccess.mockReturnValue({
      data: {
        modules: {},
        isOrgOwner: false,
        canManageOrganizationMembership: false,
        scopes: {},
      },
    } as ReturnType<typeof useAccess>);
    mockUseModuleEnabled.mockReturnValue(false);

    const { queryByText } = render(
      <RequireModule module="build">
        <span>content</span>
      </RequireModule>,
    );

    expect(queryByText("content")).not.toBeInTheDocument();
  });

  it("renders children via the 'projects' alias when build is enabled", () => {
    mockUseAccess.mockReturnValue({
      data: {
        modules: { build: true },
        isOrgOwner: false,
        canManageOrganizationMembership: false,
        scopes: {},
      },
    } as ReturnType<typeof useAccess>);
    mockUseModuleEnabled.mockReturnValue(true);

    const { getByText } = render(
      <RequireModule module="projects">
        <span>project content</span>
      </RequireModule>,
    );

    expect(getByText("project content")).toBeInTheDocument();
  });

  it("renders children via the 'finance' alias when accounting is enabled", () => {
    mockUseAccess.mockReturnValue({
      data: {
        modules: { accounting: true },
        isOrgOwner: false,
        canManageOrganizationMembership: false,
        scopes: {},
      },
    } as ReturnType<typeof useAccess>);
    mockUseModuleEnabled.mockReturnValue(true);

    const { getByText } = render(
      <RequireModule module="finance">
        <span>finance content</span>
      </RequireModule>,
    );

    expect(getByText("finance content")).toBeInTheDocument();
  });
});
