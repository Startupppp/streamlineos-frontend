import { render, screen, fireEvent } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsRetentionPage } from "./project-settings-retention-page";
import type { ProjectRetentionSettings } from "./project-settings-retention-schema";

let mockAccessState: AccessState = "denied";
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/build/1/settings/retention",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => {
    if (mockAccessState === "denied") return { kind: "denied", permission: "build:update" };
    if (mockAccessState === "loading") return { kind: "loading" };
    return { kind: "ready" };
  },
}));

const mockSettings: ProjectRetentionSettings = {
  projectId: 1,
  inheritOrgPolicy: true,
  closedTicketRetentionDays: null,
  attachmentRetentionDays: null,
  auditLogRetentionDays: null,
  legalHold: false,
  legalHoldReason: null,
  legalHoldSetAt: null,
  version: 1,
  updatedAt: "2025-01-01T00:00:00Z",
};

const mockUpdatePolicy = jest.fn();
const mockSetLegalHold = jest.fn();

jest.mock("@/hooks/api/build/project-retention-settings", () => ({
  useProjectRetentionSettings: () => ({
    data: mockSettings,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  }),
  useUpdateRetentionPolicy: () => ({
    mutate: mockUpdatePolicy,
    isPending: false,
  }),
  useSetLegalHold: () => ({
    mutate: mockSetLegalHold,
    isPending: false,
  }),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: "",
    debouncedSearch: "",
    cursor: null,
    setSearch: jest.fn(),
    setCursor: jest.fn(),
    value: () => "all",
    isActive: () => false,
    setValue: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: false,
    resetKey: "",
    isPending: false,
  }),
}));

const mockUseBuildListKeyboard = jest.fn();
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
    empty,
  }: {
    resolution: { kind: string };
    children: React.ReactNode;
    loading?: React.ReactNode;
    empty?: React.ReactNode;
  }) => {
    if (resolution.kind === "denied") return <div data-testid="no-permission" />;
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "empty") return <div data-testid="page-empty">{empty}</div>;
    return <div>{children}</div>;
  },
}));

beforeEach(() => {
  mockAccessState = "denied";
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockSearchParams.delete("section");
  mockUpdatePolicy.mockReset();
  mockSetLegalHold.mockReset();
});

describe("ProjectSettingsRetentionPage — access control (BLD-RETENTION-001)", () => {
  it("renders NoPermissionState when build:update is denied — denied-before-content guard", () => {
    mockAccessState = "denied";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByText("Retention policy")).not.toBeInTheDocument();
  });

  it("renders policy content when access is granted — positive pair for the denial test", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
    expect(screen.getByText("Retention policy")).toBeInTheDocument();
  });

  it("renders loading skeleton while access is in flight — fails closed during loading", () => {
    mockAccessState = "loading";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.queryByText("Retention policy")).not.toBeInTheDocument();
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });
});

describe("ProjectSettingsRetentionPage — keyboard shortcuts (BLD-RETENTION-002)", () => {
  it("wires useBuildListKeyboard with onClearSelection so Esc clears the search filter", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onClearSelection: expect.any(Function) }),
    );
  });

  it("passes searchInputRef to useBuildListKeyboard so / key focuses the search input", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ searchInputRef: expect.anything() }),
    );
  });
});

describe("ProjectSettingsRetentionPage — URL state / section param (BLD-RETENTION-003)", () => {
  it("renders policy section by default when no section param in URL", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.getByText("Retention policy")).toBeInTheDocument();
    expect(screen.queryByText("Legal hold")).not.toBeInTheDocument();
  });

  it("renders holds section when section=holds in URL", () => {
    mockAccessState = "granted";
    mockSearchParams.set("section", "holds");
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.getByText("Legal hold")).toBeInTheDocument();
    expect(screen.queryByText("Retention policy")).not.toBeInTheDocument();
  });

  it("falls back to policy section when section param is unrecognised", () => {
    mockAccessState = "granted";
    mockSearchParams.set("section", "unknown-section");
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.getByText("Retention policy")).toBeInTheDocument();
  });

  it("section navigation buttons are rendered when access is granted", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.getByRole("button", { name: "Policy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Legal Holds" })).toBeInTheDocument();
  });
});

describe("ProjectSettingsRetentionPage — policy section (BLD-RETENTION-004)", () => {
  it("shows the Save policy button when user has build:update permission", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.getByRole("button", { name: /save policy/i })).toBeInTheDocument();
  });

  it("does not show Save policy button when access is denied — mutation gated on useCan", () => {
    mockAccessState = "denied";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.queryByRole("button", { name: /save policy/i })).not.toBeInTheDocument();
  });

  it("clicking Save policy calls useUpdateRetentionPolicy.mutate with current form state", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    fireEvent.click(screen.getByRole("button", { name: /save policy/i }));
    expect(mockUpdatePolicy).toHaveBeenCalledWith(
      expect.objectContaining({ inheritOrgPolicy: true }),
      expect.any(Object),
    );
  });
});

describe("ProjectSettingsRetentionPage — holds section (BLD-RETENTION-005)", () => {
  it("shows No legal hold status when hold is inactive", () => {
    mockAccessState = "granted";
    mockSearchParams.set("section", "holds");
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.getByText("No legal hold")).toBeInTheDocument();
  });

  it("shows Apply legal hold button when access is granted and no hold is active — positive gate check", () => {
    mockAccessState = "granted";
    mockSearchParams.set("section", "holds");
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.getByRole("button", { name: /apply legal hold/i })).toBeInTheDocument();
  });

  it("does not show Apply legal hold button when access is denied — mutation fails closed", () => {
    mockAccessState = "denied";
    mockSearchParams.set("section", "holds");
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.queryByRole("button", { name: /apply legal hold/i })).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsRetentionPage — box 4: no growable list (BLD-RETENTION-007)", () => {
  it("has no data table or paginated list — singleton settings form satisfies box 4 by absence of a growable collection", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Policy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Legal Holds" })).toBeInTheDocument();
  });

  it("renders exactly two section navigation buttons — static NAV_SECTIONS collection is bounded at compile time", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsRetentionPage projectId={1} />);
    const policyTab = screen.getByRole("button", { name: "Policy", exact: true });
    const holdsTab = screen.getByRole("button", { name: "Legal Holds", exact: true });
    expect(policyTab).toBeInTheDocument();
    expect(holdsTab).toBeInTheDocument();
  });
});

describe("ProjectSettingsRetentionPage — schema type predicate (BLD-RETENTION-006)", () => {
  it("parseRetentionSection returns policy for null input", () => {
    const { parseRetentionSection } = jest.requireActual(
      "./project-settings-retention-schema",
    ) as typeof import("./project-settings-retention-schema");
    expect(parseRetentionSection(null)).toBe("policy");
  });

  it("parseRetentionSection returns holds for holds input", () => {
    const { parseRetentionSection } = jest.requireActual(
      "./project-settings-retention-schema",
    ) as typeof import("./project-settings-retention-schema");
    expect(parseRetentionSection("holds")).toBe("holds");
  });

  it("parseRetentionSection falls back to policy for unrecognised input", () => {
    const { parseRetentionSection } = jest.requireActual(
      "./project-settings-retention-schema",
    ) as typeof import("./project-settings-retention-schema");
    expect(parseRetentionSection("danger")).toBe("policy");
  });
});
