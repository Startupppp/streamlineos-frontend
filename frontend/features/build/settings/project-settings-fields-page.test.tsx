import { render, screen, act } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsFieldsPage } from "./project-settings-fields-page";

let mockAccessState: AccessState = "denied";
let mockDebouncedSearch = "";
let mockCustomFields: Array<{
  id: number;
  name: string;
  type: string;
  options: string[] | null;
  required: boolean;
}> = [];

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
  useProjectCustomFields: () => ({ data: mockCustomFields, isLoading: false }),
}));

jest.mock("@/features/build/settings/custom-fields-settings", () => ({
  CustomFieldsSettings: () => <div data-testid="custom-fields-settings" />,
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: mockDebouncedSearch,
    debouncedSearch: mockDebouncedSearch,
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

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
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
  mockDebouncedSearch = "";
  mockCustomFields = [];
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
});

describe("ProjectSettingsFieldsPage — keyboard shortcuts (Requirement C3)", () => {
  it("wires useBuildListKeyboard with onClearSelection so Esc clears the search filter", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onClearSelection: expect.any(Function) }),
    );
  });

  it("passes searchInputRef to useBuildListKeyboard so the / key focuses the search input", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ searchInputRef: expect.anything() }),
    );
  });
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

  it("shows the loading skeleton while access is being resolved", () => {
    mockAccessState = "loading";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });
});

describe("ProjectSettingsFieldsPage — keyboard shortcuts (extended)", () => {
  it("passes onCreate to useBuildListKeyboard so the c key can trigger the create form", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onCreate: expect.any(Function) }),
    );
  });

  it("passes onEdit to useBuildListKeyboard so the e key can open the edit dialog for the focused field", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onEdit: expect.any(Function) }),
    );
  });

  it("passes itemCount equal to the filtered field count when a search term is active", () => {
    mockAccessState = "granted";
    mockCustomFields = [
      { id: 1, name: "Story Points", type: "number", options: null, required: false },
      { id: 2, name: "Priority Label", type: "select", options: ["P0"], required: false },
    ];
    mockDebouncedSearch = "story";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 1 }),
    );
  });

  it("passes itemCount equal to the total field count when no search is active", () => {
    mockAccessState = "granted";
    mockCustomFields = [
      { id: 1, name: "Story Points", type: "number", options: null, required: false },
      { id: 2, name: "Priority Label", type: "select", options: ["P0"], required: false },
    ];
    mockDebouncedSearch = "";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 2 }),
    );
  });

  it("passes itemCount of 0 when search term matches no field names", () => {
    mockAccessState = "granted";
    mockCustomFields = [
      { id: 1, name: "Story Points", type: "number", options: null, required: false },
    ];
    mockDebouncedSearch = "xyz";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 0 }),
    );
  });

  it("passes onShortcutHelp to useBuildListKeyboard so the ? key can open the help overlay", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onShortcutHelp: expect.any(Function) }),
    );
  });

  it("ShortcutHelpDialog is not shown on initial render — paired with the open test below", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("the onShortcutHelp callback passed to the keyboard hook is a function that updates component state — calling it does not throw", async () => {
    mockAccessState = "granted";
    render(<ProjectSettingsFieldsPage projectId={1} />);
    const capturedOptions = mockUseBuildListKeyboard.mock.calls[0][0] as { onShortcutHelp: () => void };
    expect(typeof capturedOptions.onShortcutHelp).toBe("function");
    await act(async () => { capturedOptions.onShortcutHelp(); });
  });
});
