import { render } from "@testing-library/react";
import { normalizeOrgModuleKey } from "@/lib/org-module-keys";
import { RequireModule } from "@/components/auth/require-module";
import { useAccess } from "@/hooks/api/access";
import { useEntitlements } from "@/hooks/api/entitlements";
import { pendingQueryResult, successQueryResult } from "@/test-utils";

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

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(),
}));

const mockUseAccess = useAccess as jest.MockedFunction<typeof useAccess>;
const mockUseEntitlements = useEntitlements as jest.MockedFunction<typeof useEntitlements>;

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
    mockUseEntitlements.mockReturnValue(successQueryResult({ lockedModules: [] }));
  });

  it("shows a skeleton, not an empty container, while access data has not loaded", () => {
    mockUseAccess.mockReturnValue(pendingQueryResult());

    const { container, queryByText } = render(
      <RequireModule module="build">
        <span>content</span>
      </RequireModule>,
    );

    expect(container).not.toBeEmptyDOMElement();
    expect(queryByText("content")).not.toBeInTheDocument();
  });

  it("renders children when the module is enabled and data is loaded", () => {
    mockUseAccess.mockReturnValue(successQueryResult({
      modules: { build: true },
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      scopes: {},
    }));

    const { getByText } = render(
      <RequireModule module="build">
        <span>content</span>
      </RequireModule>,
    );

    expect(getByText("content")).toBeInTheDocument();
  });

  it("renders the disabled state when the module is disabled and data is loaded", () => {
    mockUseAccess.mockReturnValue(successQueryResult({
      modules: {},
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      scopes: {},
    }));

    const { queryByText } = render(
      <RequireModule module="build">
        <span>content</span>
      </RequireModule>,
    );

    expect(queryByText("content")).not.toBeInTheDocument();
  });

  it("renders children via the 'projects' alias when build is enabled", () => {
    mockUseAccess.mockReturnValue(successQueryResult({
      modules: { build: true },
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      scopes: {},
    }));

    const { getByText } = render(
      <RequireModule module="projects">
        <span>project content</span>
      </RequireModule>,
    );

    expect(getByText("project content")).toBeInTheDocument();
  });

  it("renders children via the 'finance' alias when accounting is enabled", () => {
    mockUseAccess.mockReturnValue(successQueryResult({
      modules: { accounting: true },
      isOrgOwner: false,
      canManageOrganizationMembership: false,
      scopes: {},
    }));

    const { getByText } = render(
      <RequireModule module="finance">
        <span>finance content</span>
      </RequireModule>,
    );

    expect(getByText("finance content")).toBeInTheDocument();
  });
});
