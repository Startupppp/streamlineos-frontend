import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsFieldsPage } from "./project-settings-fields-page";

let mockAccessState: AccessState = "denied";

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => {
    if (mockAccessState === "denied") return "denied";
    if (mockAccessState === "loading") return "loading";
    return "ready";
  },
}));

jest.mock("@/hooks/api/build/custom-fields", () => ({
  useProjectCustomFields: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/features/build/settings/custom-fields-settings", () => ({
  CustomFieldsSettings: () => <div data-testid="custom-fields-settings" />,
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

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: () => ({ focusedIndex: null, setFocusedIndex: jest.fn() }),
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
  }: {
    resolution: string;
    children: React.ReactNode;
    loading?: React.ReactNode;
  }) => {
    if (resolution === "denied") return <div data-testid="no-permission" />;
    if (resolution === "loading") return <div data-testid="page-loading">{loading}</div>;
    return <div>{children}</div>;
  },
}));

beforeEach(() => {
  mockAccessState = "denied";
});

describe("ProjectSettingsFieldsPage — access control (BLD-X-FE-SETTINGS-FIELDS-001)", () => {
  it("renders NoPermissionState when access is denied — PageState gates on build:update", () => {
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("custom-fields-settings")).not.toBeInTheDocument();
  });

  it("renders custom fields when access is granted", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
    expect(screen.getByTestId("custom-fields-settings")).toBeInTheDocument();
  });

  it("fails closed on loading — custom fields hidden while access is in flight", () => {
    mockAccessState = "loading";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(screen.queryByTestId("custom-fields-settings")).not.toBeInTheDocument();
  });
});
